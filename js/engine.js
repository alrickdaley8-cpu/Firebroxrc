// ============================================================
// engine.js — 4-stroke internal combustion engine physics model
// Pure logic, no DOM. Units: radians, seconds, N·m, watts, bar.
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
    peakTQ: 196, tqPeakRpm: 3000,    // boosted figures at full boost
    redline: 6800,
    idleRpm: 950, idleP: 0.132,
    inertia: 0.085,                  // kg·m²
    fricBase: 10, fricLin: 0.0032, fricQuad: 18,
    starterTQ: 14,
    throaty: 0.35,                   // audio character
    maxBoost: 1.15,                  // bar gauge (0 = naturally aspirated)
    turboLag: 1.15,                  // spool time constant factor
    mass: 980,                       // vehicle kg for DRIVE mode
    cdA: 0.56,                       // drag area m²
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
    maxBoost: 0,
    turboLag: 0,
    mass: 1150,
    cdA: 0.62,
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
    maxBoost: 0,
    turboLag: 0,
    mass: 1520,
    cdA: 0.68,
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
function smoothstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

export class Engine {
  constructor(preset) {
    this.cfg = preset;
    this.rpm = 0;
    this.theta = 0;              // crank angle 0..4π
    this.ignition = false;
    this.cranking = false;
    this.seized = false;
    this.stalled = false;
    this.seizeTimer = 0;
    this.flareTimer = 0;         // startup rev flare
    this.running = false;
    this.limitCut = 0;           // 0..1 rev-limiter cut probability
    this.fuelCut = 0;            // 0..1 starvation ramp
    this.overRedlineTime = 0;

    // systems
    this.boost = 0;              // bar gauge
    this.bovPulse = false;       // one-shot flag (main clears)
    this.fuel = 8.0;             // liters (tank)
    this.tankSize = 8.0;
    this.coolant = 18;           // °C
    this.limp = false;           // overheating power cut
    this.steam = false;          // visual flag
    this.nitro = 100;            // nitrous bottle charge %
    this.nosActive = false;
    this._prevThr = 0;
    this.idleI = 0;              // idle-speed integrator (load droop compensation)

    // Derived per-preset state
    const n = preset.cylinders;
    this.pinPhase = new Array(n).fill(0);
    preset.firingOrder.forEach((cylNum, seq) => {
      this.pinPhase[cylNum - 1] = (seq * FOUR_PI) / n;
    });
    this.vePeak = veShape(preset.tqPeakRpm, preset.tqPeakRpm);

    // Precompute mean of summed power pulses for ripple normalization
    let sum = 0, count = 0;
    for (let a = 0; a < FOUR_PI; a += 0.01) { sum += this.pulseSum(a); count++; }
    this.avgPulse = sum / count;

    // Live readouts
    this.torque = 0;             // net instantaneous (incl. ripple) — shake
    this.torqueMean = 0;         // indicated mean
    this.torqueWheel = 0;        // indicated − friction (>=0) for dyno
    this.netTorque = 0;          // signed crank torque for drivetrain
    this.power = 0;              // watts
    this.loadFactor = 0;         // effective throttle p 0..1
    this.fires = [];             // fire events since last drain
    this.shake = 0;              // filtered ripple accel (mount shake)
    this._thr = 0;
  }

  pulseSum(th) {
    let s = 0;
    for (let i = 0; i < this.cfg.cylinders; i++) {
      let tc = (th - this.pinPhase[i]) % FOUR_PI;
      if (tc < 0) tc += FOUR_PI;
      if (tc >= TWO_PI && tc <= 3 * Math.PI) {
        const u = (tc - TWO_PI) / Math.PI;
        s += Math.pow(Math.sin(u * Math.PI), 1.6);
      }
    }
    return s;
  }

  // steady-state target boost at WOT for a given rpm (bar gauge)
  targetBoost(rpm, throttle = 1) {
    const c = this.cfg;
    if (!c.maxBoost || throttle < 0.2) return 0;
    return c.maxBoost * smoothstep((rpm - 1300) / 2300) * smoothstep((throttle - 0.2) / 0.3);
  }

  // Peak indicated torque at WOT (optionally at a given boost fraction 0..1)
  maxIndicatedTorque(rpm, boostFrac = 1) {
    const c = this.cfg;
    let ve = veShape(rpm, c.tqPeakRpm) / this.vePeak;
    if (rpm > c.redline) {
      const over = (rpm - c.redline) / c.redline;
      ve *= clamp(1 - over * 1.4, 0.45, 1);
    }
    let scale = 1;
    if (c.maxBoost) scale = 1 + 0.85 * boostFrac;   // NA baseline; boost is additive, up to +85%
    return c.peakTQ * ve * scale;
  }

  frictionTorque(rpm) {
    const c = this.cfg;
    const rq = Math.min(rpm, c.redline * 1.12);
    return c.fricBase + c.fricLin * rpm + c.fricQuad * Math.pow(rq / c.redline, 2);
  }

  sparkAdvanceRad() {
    const deg = 10 + 22 * clamp(this.rpm / 6000, 0, 1) + 4 * this._thr;
    return (deg * Math.PI) / 180;
  }

  // controls: { throttle, load, limiterOn, nos, externalRpm, driveLoad }
  step(dt, controls) {
    const c = this.cfg;
    const SUB = 8;
    const h = dt / SUB;
    const thr = controls.throttle;
    this._thr = thr;

    // ---------- turbo spool ----------
    if (c.maxBoost) {
      const tgt = this.combustionTarget() ? this.targetBoost(this.rpm, thr) : 0;
      const rate = (tgt > this.boost)
        ? 1.35 / c.turboLag * clamp(this.rpm / 3000, 0.25, 2.2)
        : 2.8;
      this.boost += (tgt - this.boost) * Math.min(1, rate * dt);
      this.boost = Math.max(0, this.boost);
      // BOV: throttle snaps shut under boost
      if (this._prevThr > 0.45 && thr < 0.1 && this.boost > 0.4) {
        this.bovPulse = true;
        this.boost *= 0.35;
      }
    }
    this._prevThr = thr;

    // ---------- fuel ----------
    if (this.running) {
      const flow = (0.25 + 0.75 * this.loadFactor) * this.rpm * 3.3e-6; // L/s
      this.fuel = Math.max(0, this.fuel - flow * dt);
    }
    if (this.fuel <= 0) this.fuelCut = Math.min(1, this.fuelCut + dt * 0.5);
    // limp mode with hysteresis: in above 128°C, out below 118°C
    this.limp = this.limp ? this.coolant > 118 : this.coolant > 128;
    this.steam = this.coolant > 122;

    for (let s = 0; s < SUB; s++) {
      let rpm = this.rpm;
      let T = 0;
      const slaved = controls.externalRpm != null && !this.seized && !this.stalled;

      // --- starter motor ---
      if (this.cranking && this.ignition && !this.seized && rpm < 480) {
        T += c.starterTQ * (1 - rpm / 480) + 6;
        if (this.stalled && rpm > 40) this.stalled = false;
      }

      // --- combustion torque ---
      const combustionOn = this.ignition && !this.seized && !this.stalled && rpm > 30;
      let p = 0;
      if (combustionOn) {
        const crankEff = clamp(rpm / 520, 0.2, 1);
        if (thr < 0.03) {
          p = clamp(c.idleP + 0.00038 * (c.idleRpm - rpm) + this.idleI, 0.05, 0.30);
          if (this.flareTimer > 0) p = Math.max(p, 0.24);
        } else {
          p = clamp(0.10 + 0.92 * thr, 0, 1);
        }
        // idle integrator: drives steady-state idle error to zero
        if (thr < 0.03 && this.flareTimer <= 0) {
          this.idleI = clamp(this.idleI + (c.idleRpm - rpm) * 0.000012 * h, -0.05, 0.09);
        } else {
          this.idleI *= 0.9;
        }
        // rev limiter
        const soft = c.redline - 200;
        if (controls.limiterOn && rpm > soft) {
          const depth = clamp((rpm - soft) / 300, 0, 1);
          this.limitCut = depth;
          if (Math.random() < depth) p *= 0.12;
        } else {
          this.limitCut = Math.max(0, this.limitCut - dt * 6);
        }
        // fuel starvation: sputtering ramp to a full cut
        if (this.fuelCut > 0) {
          if (Math.random() < this.fuelCut) p = 0;
          else p *= (1 - this.fuelCut * 0.5);
        }
        // limp mode
        if (this.limp) p = Math.min(p, 0.35);

        const boostFrac = c.maxBoost ? this.boost / c.maxBoost : 1;
        let meanT = p * crankEff * this.maxIndicatedTorque(rpm, boostFrac);
        // cold engine: slightly down on power
        if (this.coolant < 45) meanT *= 0.97;
        // nitrous
        this.nosActive = !!(controls.nos && this.nitro > 0 && this.running && thr > 0.3 && !this.limp);
        if (this.nosActive) meanT *= 1.45;

        const mix = clamp(0.15 + rpm / 2200, 0.15, 0.9);
        // ripple is mean-preserving: fluctuates ±85%·(1−mix) about the mean
        const rn = this.pulseSum(this.theta) / this.avgPulse;
        this.torque = meanT * (1 + 0.85 * (rn - 1) * (1 - mix));
        this.torqueMean = meanT;
        T += this.torque;
      } else {
        this.torque = 0;
        this.torqueMean = 0;
        this.nosActive = false;
        this.limitCut = Math.max(0, this.limitCut - dt * 6);
      }

      // --- friction & pumping ---
      const fric = this.frictionTorque(rpm);
      T -= fric;
      this.netTorque = this.torqueMean - fric;

      // --- dyno brake or drivetrain load ---
      if (controls.driveLoad != null) {
        T -= controls.driveLoad;
      } else {
        const L = controls.load;
        T -= L * (5 + 0.014 * rpm + 65 * Math.pow(rpm / c.redline, 2));
      }
      T -= 1.5 + 0.0015 * rpm;

      if (this.seized) T -= 600;

      // --- integrate (or follow drivetrain) ---
      const alpha = T / c.inertia;
      let w;
      if (slaved && !this.cranking) {
        w = (controls.externalRpm * TWO_PI) / 60;
      } else {
        w = (rpm * TWO_PI) / 60 + alpha * h;
        if (w < 0) w = 0;
      }
      this.rpm = (w * 60) / TWO_PI;
      const prevTheta = this.theta;
      this.theta = (this.theta + w * h) % FOUR_PI;
      this.shake = this.shake * 0.9 + Math.abs(alpha) * 0.1;
      this.loadFactor = p;

      // --- fire events ---
      if (combustionOn) {
        const adv = this.sparkAdvanceRad();
        for (let i = 0; i < c.cylinders; i++) {
          let a0 = (prevTheta - this.pinPhase[i]) % FOUR_PI; if (a0 < 0) a0 += FOUR_PI;
          let a1 = (this.theta - this.pinPhase[i]) % FOUR_PI; if (a1 < 0) a1 += FOUR_PI;
          const sparkAt = TWO_PI - adv;
          const crossed = a0 <= a1
            ? (a0 < sparkAt && a1 >= sparkAt)
            : (a0 < sparkAt || a1 >= sparkAt);
          if (crossed && Math.random() >= Math.max(this.limitCut, this.fuelCut)) {
            this.fires.push({ cyl: i, time: performanceNowSafe() });
          }
        }
      }
    }

    // --- bookkeeping ---
    this.running = this.ignition && !this.seized && !this.stalled && this.rpm > 60;
    if (this.running && this._wasRunning === false && this._wasCrank) this.flareTimer = 0.7;
    this._wasRunning = this.running;
    this._wasCrank = this.cranking;
    if (this.flareTimer > 0) this.flareTimer -= dt;
    if (this.nosActive) this.nitro = Math.max(0, this.nitro - dt * 9);
    this.torqueWheel = Math.max(0, this.torqueMean - this.frictionTorque(this.rpm));
    this.power = this.torqueWheel * ((this.rpm * TWO_PI) / 60);

    // over-rev damage
    if (!controls.limiterOn && this.running && this.rpm > c.redline * 1.22) {
      this.overRedlineTime += dt;
      if (this.overRedlineTime > 1.1 && !this.seized) {
        this.seized = true;
        this.rpm = 0;
      }
    } else {
      this.overRedlineTime = Math.max(0, this.overRedlineTime - dt * 0.5);
    }

    // --- cooling system (thermostat fan kicks in at 88°C) ---
    // heat in ~ fuel throughput (rpm x cylinder charge); radiator sheds to ambient
    const heatIn = 58 + (this.rpm / c.redline) * this.loadFactor * 62 + (this.nosActive ? 12 : 0);
    const rad = this.coolant > 88 ? (this.coolant - 88) * 1.6 : 0;
    const kTherm = this.coolant < 70 ? 0.02 : 0.011;
    this.coolant += (heatIn - 24 - rad) * kTherm * dt;
    if (this.coolant < 18) this.coolant = 18;
  }

  combustionTarget() {
    return this.ignition && !this.seized && !this.stalled;
  }

  drainFires() {
    const f = this.fires;
    this.fires = [];
    return f;
  }

  dynoCurve() {
    const pts = [];
    const c = this.cfg;
    for (let r = 800; r <= c.redline + 400; r += 100) {
      const bf = c.maxBoost ? this.targetBoost(r) / c.maxBoost : 1;
      const T = Math.max(0, this.maxIndicatedTorque(r, bf) - this.frictionTorque(r));
      pts.push({ rpm: r, tq: T, kw: (T * r * TWO_PI) / 60 / 1000 });
    }
    return pts;
  }
}

function performanceNowSafe() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
