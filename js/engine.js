// ============================================================
// engine.js — 4-stroke internal combustion engine physics model
// Pure logic, no DOM. Units: radians, seconds, N·m, watts.
// Cycle phase convention: theta (crank) 0..4π.
//   Per cylinder cycle θc = (theta − pinPhase) mod 4π:
//     0   .. π   intake      (piston TDC→BDC)
//     π   .. 2π  compression (piston BDC→TDC)
//     2π  .. 3π  power       (spark just before 2π)
//     3π  .. 4π  exhaust
// ============================================================

export const TWO_PI = Math.PI * 2;
export const FOUR_PI = Math.PI * 4;

export const PRESETS = {
  i3: {
    id: 'i3',
    name: '1.0L Inline-3 Turbo',
    short: 'I3 1.0T',
    cylinders: 3,
    firingOrder: [1, 2, 3],          // 240° spacing
    bore: 74, stroke: 76,            // mm (flavor text)
    disp: '0.98L',
    peakTQ: 196, tqPeakRpm: 3000,    // turbo-ish low-end shove
    redline: 6800,
    idleRpm: 950, idleP: 0.112,
    inertia: 0.085,                  // kg·m²
    fricBase: 10, fricLin: 0.0032, fricQuad: 18,
    starterTQ: 14,
    throaty: 0.35,                   // audio character
  },
  i4: {
    id: 'i4',
    name: '2.0L Inline-4',
    short: 'I4 2.0',
    cylinders: 4,
    firingOrder: [1, 3, 4, 2],       // 180° spacing
    bore: 86, stroke: 86,
    disp: '2.0L',
    peakTQ: 215, tqPeakRpm: 4400,
    redline: 7600,
    idleRpm: 900, idleP: 0.118,
    inertia: 0.11,
    fricBase: 13, fricLin: 0.0033, fricQuad: 20,
    starterTQ: 17,
    throaty: 0.55,
  },
  i6: {
    id: 'i6',
    name: '3.0L Inline-6',
    short: 'I6 3.0',
    cylinders: 6,
    firingOrder: [1, 5, 3, 6, 2, 4], // 120° spacing
    bore: 84, stroke: 90,
    disp: '3.0L',
    peakTQ: 335, tqPeakRpm: 3600,
    redline: 7000,
    idleRpm: 850, idleP: 0.110,
    inertia: 0.15,
    fricBase: 18, fricLin: 0.0036, fricQuad: 24,
    starterTQ: 20,
    throaty: 0.8,
  },
};

// Volumetric-efficiency-like torque shape vs rpm (unitless, ~0.6..1.08)
// Asymmetric plateau: sharper dropoff below peak, gentle above.
function veShape(rpm, peak) {
  const w = rpm <= peak ? peak * 0.85 + 600 : peak * 1.15 + 900;
  const d = (rpm - peak) / w;
  return 0.62 + 0.46 * Math.exp(-d * d);
}

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function gaussNorm(x) { return Math.exp(-x * x); }

export class Engine {
  constructor(preset) {
    this.cfg = preset;
    this.rpm = 0;
    this.theta = 0;              // crank angle 0..4π
    this.ignition = false;
    this.cranking = false;
    this.seized = false;
    this.seizeTimer = 0;
    this.flareTimer = 0;         // startup rev flare
    this.running = false;
    this.limitCut = 0;           // 0..1 rev-limiter cut probability
    this.overRedlineTime = 0;

    // Derived per-preset state
    const n = preset.cylinders;
    // pinPhase per *cylinder index* (1..n arranged left→right)
    this.pinPhase = new Array(n).fill(0);
    preset.firingOrder.forEach((cylNum, seq) => {
      this.pinPhase[cylNum - 1] = (seq * FOUR_PI) / n;
    });
    // Vega peak normalization for torque curve
    this.vePeak = veShape(preset.tqPeakRpm, preset.tqPeakRpm);

    // Precompute mean of summed power pulses for ripple normalization
    let sum = 0, count = 0;
    for (let a = 0; a < FOUR_PI; a += 0.01) { sum += this.pulseSum(a); count++; }
    this.avgPulse = sum / count;

    // Live readouts
    this.torque = 0;             // net indicated-mean torque (for dyno)
    this.power = 0;              // watts
    this.loadFactor = 0;         // effective throttle p 0..1
    this.fires = [];             // fire events since last drain
    this.shake = 0;              // filtered ripple accel (for mount shake)
    this.coolant = 20;           // °C flavor
    this._prevThetaC = new Array(n).fill(0);
  }

  // Sum of per-cylinder power pulse shapes at crank angle th
  pulseSum(th) {
    let s = 0;
    for (let i = 0; i < this.cfg.cylinders; i++) {
      let tc = (th - this.pinPhase[i]) % FOUR_PI;
      if (tc < 0) tc += FOUR_PI;
      if (tc >= TWO_PI && tc <= 3 * Math.PI) {
        const u = (tc - TWO_PI) / Math.PI;         // 0..1 through power stroke
        s += Math.pow(Math.sin(u * Math.PI), 1.6);
      }
    }
    return s;
  }

  // Peak indicated torque the engine could make at wide-open throttle
  maxIndicatedTorque(rpm) {
    const c = this.cfg;
    let ve = veShape(rpm, c.tqPeakRpm) / this.vePeak;
    // gentle valve-float style falloff past redline (engine can still over-rev)
    if (rpm > c.redline) {
      const over = (rpm - c.redline) / c.redline;
      ve *= clamp(1 - over * 1.4, 0.45, 1);
    }
    return c.peakTQ * ve;
  }

  frictionTorque(rpm) {
    const c = this.cfg;
    // mechanical friction growth saturates above ~1.12x redline
    const rq = Math.min(rpm, c.redline * 1.12);
    return c.fricBase + c.fricLin * rpm + c.fricQuad * Math.pow(rq / c.redline, 2);
  }

  sparkAdvanceRad() {
    const deg = 10 + 22 * clamp(this.rpm / 6000, 0, 1) + 4 * this._thr;
    return (deg * Math.PI) / 180;
  }

  // controls: { throttle 0..1, load 0..1, limiterOn bool }
  step(dt, controls) {
    const c = this.cfg;
    const SUB = 8;                          // physics substeps for stability
    const h = dt / SUB;
    this._thr = controls.throttle;

    for (let s = 0; s < SUB; s++) {
      let rpm = this.rpm;
      let T = 0;

      // --- starter motor ---
      if (this.cranking && this.ignition && !this.seized && rpm < 480) {
        T += c.starterTQ * (1 - rpm / 480) + 6;
      }

      // --- combustion torque ---
      const combustionOn = this.ignition && !this.seized && rpm > 30;
      let p = 0;
      if (combustionOn) {
        // weak cylinder filling at cranking speeds (slow catch, then flare)
        const crankEff = clamp(rpm / 520, 0.2, 1);
        // idle-speed closed loop when foot is off
        if (controls.throttle < 0.03) {
          p = clamp(c.idleP + 0.00038 * (c.idleRpm - rpm), 0.05, 0.30);
          if (this.flareTimer > 0) p = Math.max(p, 0.24);  // startup flare
        } else {
          p = clamp(0.10 + 0.92 * controls.throttle, 0, 1);
        }
        // rev limiter: random spark cut
        const soft = c.redline - 200;
        if (controls.limiterOn && rpm > soft) {
          const depth = clamp((rpm - soft) / 300, 0, 1);
          this.limitCut = depth;
          if (Math.random() < depth) p *= 0.12;
        } else {
          this.limitCut = Math.max(0, this.limitCut - dt * 6);
        }
        const meanT = p * crankEff * this.maxIndicatedTorque(rpm);
        // torque ripple from discrete cylinder events (lumpy at low rpm)
        const mix = clamp(0.15 + rpm / 2200, 0.15, 0.9);
        const ripple = meanT * 1.35 * this.pulseSum(this.theta) / this.avgPulse;
        this.torque = meanT * mix + ripple * (1 - mix);
        this.torqueMean = meanT;
        T += this.torque;
      } else {
        this.torque = 0;
        this.torqueMean = 0;
        this.limitCut = 0;
      }

      // --- friction & pumping ---
      T -= this.frictionTorque(rpm);

      // --- dyno brake ---
      const L = controls.load;
      T -= L * (5 + 0.014 * rpm + 65 * Math.pow(rpm / c.redline, 2));
      T -= 1.5 + 0.0015 * rpm; // driveline drag

      // --- seizure ---
      if (this.seized) T -= 600;

      // --- integrate ---
      const alpha = T / c.inertia;              // rad/s²
      let w = (rpm * TWO_PI) / 60 + alpha * h;  // rad/s
      if (w < 0) w = 0;
      this.rpm = (w * 60) / TWO_PI;
      const prevTheta = this.theta;
      this.theta = (this.theta + w * h) % FOUR_PI;
      this.shake = this.shake * 0.9 + Math.abs(alpha) * 0.1;
      this.loadFactor = p;

      // --- fire event detection (for visuals) ---
      if (combustionOn) {
        const adv = this.sparkAdvanceRad();
        for (let i = 0; i < c.cylinders; i++) {
          let a0 = (prevTheta - this.pinPhase[i]) % FOUR_PI; if (a0 < 0) a0 += FOUR_PI;
          let a1 = (this.theta - this.pinPhase[i]) % FOUR_PI; if (a1 < 0) a1 += FOUR_PI;
          const sparkAt = TWO_PI - adv;
          const crossed = a0 <= a1
            ? (a0 < sparkAt && a1 >= sparkAt)
            : (a0 < sparkAt || a1 >= sparkAt);   // wrapped
          if (crossed && Math.random() >= this.limitCut) {
            this.fires.push({ cyl: i, time: performanceNowSafe() });
          }
        }
      }
    }

    // --- bookkeeping ---
    this.running = this.ignition && !this.seized && this.rpm > 60;
    if (this.running && this._wasRunning === false && this._wasCrank) {
      this.flareTimer = 0.7; // just caught
    }
    this._wasRunning = this.running;
    this._wasCrank = this.cranking;
    if (this.flareTimer > 0) this.flareTimer -= dt;
    // wheel (net, mean) torque is what the dyno & stats display
    this.torqueWheel = Math.max(0, (this.torqueMean || 0) - this.frictionTorque(this.rpm));
    this.power = this.torqueWheel * ((this.rpm * TWO_PI) / 60);

    // over-rev damage when limiter disabled
    if (!controls.limiterOn && this.running && this.rpm > c.redline * 1.22) {
      this.overRedlineTime += dt;
      if (this.overRedlineTime > 1.1 && !this.seized) {
        this.seized = true;
        this.rpm = 0;
      }
    } else {
      this.overRedlineTime = Math.max(0, this.overRedlineTime - dt * 0.5);
    }

    // coolant flavor
    const heat = 24 + (this.rpm / c.redline) * 70 * (0.35 + 0.65 * this.loadFactor);
    this.coolant += (heat - this.coolant) * 0.01 * dt * 10;
  }

  drainFires() {
    const f = this.fires;
    this.fires = [];
    return f;
  }

  // Theoretical dyno curves for the dyno chart
  dynoCurve() {
    const pts = [];
    const c = this.cfg;
    for (let r = 800; r <= c.redline + 400; r += 100) {
      const T = Math.max(0, this.maxIndicatedTorque(r) - this.frictionTorque(r));
      pts.push({ rpm: r, tq: T, kw: (T * r * TWO_PI) / 60 / 1000 });
    }
    return pts;
  }
}

function performanceNowSafe() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
