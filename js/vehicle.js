// ============================================================
// vehicle.js — 5-speed drivetrain + road load for DRIVE mode.
// Pure logic, no DOM. Couples the engine to a virtual vehicle:
// launch clutch slip, locked driveline, engine braking, stalling,
// aero + rolling drag, performance timers (0–100 km/h, 1/4 mile).
// ============================================================

const KMH = 3.6;
const QTR = 402.336;             // meters

export const RATIOS = [3.55, 2.12, 1.45, 1.12, 0.88];
export const FINAL = 3.9;
const WHEEL_R = 0.305;           // m
const EFF = 0.86;                // driveline efficiency
const SLIP_V = 3.4;              // m/s below which clutch slips in 1st
const CRR = 0.0115;              // rolling resistance coefficient
const RHO = 1.225;
const SHIFT_TIME = 0.38;         // s
const MU = 0.85;                 // tire grip coefficient
const DRIVEFRAC = 0.55;          // weight on driven axle under acceleration
const G = 9.81;

export class Vehicle {
  constructor(cfg) {
    this.mass = cfg.mass;
    this.cdA = cfg.cdA;
    this.mu = cfg.mu ?? MU;        // tire grip (mods: drag slicks)
    this.finalR = cfg.finalR ?? FINAL;  // final drive ratio (mods: 4.7 gear)
    this.ratios = cfg.ratios ?? RATIOS; // gear stack (mod shop gearbox builder)
    this.v = 0;                  // m/s
    this.gear = 0;               // 0 = N, 1..5
    this.shiftT = 0;             // >0 while clutch is open mid-shift
    this.shiftPing = false;      // one-shot flag (main clears)
    this.blipPing = false;       // one-shot rev-match flag (main clears)
    this.wheelspin = 0;          // 0..1 tire-slip fraction this frame
    this.topKmh = 0;             // fastest speed seen this vehicle
    this.dist = 0;

    // performance timers
    this.last0100 = null; this.best0100 = null;
    this.lastQuarter = null; this.bestQuarter = null; this.trap = 0;
    this._armed = true;             // re-arms when stopped
    this._runT = null;              // active run elapsed time
    this._qStart = null;            // active 1/4 distance origin
    this._done100 = false;          // 0-100 already logged this run
    this.justFinished = null;       // '0100' | 'quarter' (main clears)
  }

  kmh() { return this.v * KMH; }

  // crank rpm corresponding to current wheel speed in current gear
  lockRpm() {
    if (this.gear === 0) return 0;
    const r = this.ratios[this.gear - 1] * this.finalR;
    return (this.v / WHEEL_R) * r * 60 / (2 * Math.PI);
  }

  shift(dir) {                   // dir +1 / -1
    if (this.shiftT > 0) return;
    const g = Math.min(this.ratios.length, Math.max(0, this.gear + dir));
    if (g === this.gear) return;
    // rev-match blip on downshift while rolling with clutch engaged
    if (dir < 0 && g > 0 && this.v >= SLIP_V) this.blipPing = true;
    this.gear = g;
    this.shiftT = SHIFT_TIME;
    this.shiftPing = true;
  }

  resistForce() {
    return this.mass * 9.81 * CRR + 0.5 * RHO * this.cdA * this.v * this.v;
  }

  // Returns coupling for engine.step: { externalRpm, driveLoad }
  couple(engine) {
    if (this.gear === 0 || this.shiftT > 0 || engine.seized || !engine.ignition) {
      return { externalRpm: null, driveLoad: null };
    }
    if (engine.stalled) {
      // dead engine, wheels turning, clutch engaged -> driveline cranks it
      // (engine.js push-start catch fires it up above ~550 rpm)
      if (this.v > 0.8) return { externalRpm: this.lockRpm(), driveLoad: 8 };
      return { externalRpm: null, driveLoad: null };
    }
    if (this.v < SLIP_V) {
      // launch/crawl clutch slip (any gear): engine free, loaded so revs hold mid-range
      const k = this.v / SLIP_V;
      const slipK = 0.55 + 0.45 * k;
      const ratioN = this.ratios[this.gear - 1] * this.finalR;
      const loadNm = slipK * ((this.resistForce() * WHEEL_R) / ratioN + 20 + 55 * engine.loadFactor);
      return { externalRpm: null, driveLoad: loadNm };
    }
    return { externalRpm: this.lockRpm(), driveLoad: null };
  }

  // Call AFTER engine.step — advances vehicle from the engine's actual torque
  step(dt, engine) {
    if (this.shiftT > 0) this.shiftT -= dt;

    const ratio = this.gear > 0 ? this.ratios[this.gear - 1] * this.finalR : 0;
    let fEng = 0;

    this.wheelspin = 0;
    if (this.gear > 0 && this.shiftT <= 0 && engine.combustionTarget()) {
      if (this.v < SLIP_V) {
        const k = this.v / SLIP_V;
        const slipK = 0.55 + 0.45 * k;
        // slipping clutch transmits indicated (pre-friction) torque, so a
        // limiter-bouncing engine still drives the car forward
        const srcTQ = Math.max(engine.netTorque, engine.torqueMean ?? 0);
        fEng = (Math.max(0, srcTQ) * ratio * EFF * slipK) / WHEEL_R;
      } else {
        // locked driveline: full torque (negative = engine braking)
        fEng = (engine.netTorque * ratio * EFF) / WHEEL_R;
      }
      // traction limit: excess torque spins the tires (still puts 25% down)
      if (fEng > 0) {
        const cap = this.mass * G * this.mu * DRIVEFRAC;
        if (fEng > cap) {
          this.wheelspin = Math.min(1, (fEng - cap) / cap);
          fEng = cap + (fEng - cap) * 0.25;
        }
      }
    } else if (this.gear > 0 && this.shiftT <= 0 && this.v >= SLIP_V) {
      // dead or cut engine turned by the wheels: pumping drag (engine braking)
      if (engine.seized) {
        fEng = -this.mass * G * this.mu;      // locked internals = locked wheels
      } else if (engine.stalled || !engine.combustionTarget()) {
        const fr = engine.frictionTorque ? engine.frictionTorque(engine.rpm) : 12;
        fEng = -(fr * ratio * EFF) / WHEEL_R * 0.7;
      }
    }

    const a = (fEng - this.resistForce()) / this.mass;
    this.v = Math.max(0, this.v + a * dt);
    this.dist += this.v * dt;
    if (this.kmh() > this.topKmh) this.topKmh = this.kmh();

    // stall: lugged below idle while nearly stopped (clutch fully out).
    // Above walking pace the turning wheels just push-start it instead.
    if (this.gear > 0 && this.shiftT <= 0 && engine.ignition && !engine.seized && !engine.stalled) {
      if (this.v >= SLIP_V && this.v < 4.5 && engine.rpm < 430) {
        engine.stalled = true;
      }
    }

    this.updateTimers(dt, engine);
  }

  updateTimers(dt, engine) {
    const thr = engine._thr ?? 0;   // raw driver throttle (loadFactor collapses at the limiter)
    const moving = this.v >= 0.5;

    // re-arm both timers when stopped
    if (!moving) { this._armed = true; this._runT = null; this._qStart = null; this._done100 = false; }

    // run starts on a hard launch
    if (this._armed && moving && thr > 0.5 && this._runT == null) {
      this._runT = 0;
      this._qStart = this.dist;
    }
    if (this._runT != null) {
      this._runT += dt;
      // abort if the driver lifts early — must come to a stop to re-arm
      if (thr < 0.25 && this.kmh() < 95) { this._runT = null; this._qStart = null; this._armed = false; return; }
      // 0–100 km/h
      if (!this._done100 && this.kmh() >= 100) {
        this._done100 = true;
        this.last0100 = this._runT;
        if (this.best0100 == null || this.last0100 < this.best0100) this.best0100 = this.last0100;
        this.justFinished = '0100';
      }
      // 1/4 mile
      if (this._qStart != null && this.dist - this._qStart >= QTR) {
        this.trap = this.kmh();
        this.lastQuarter = { t: this._runT, trap: this.trap };
        if (this.bestQuarter == null || this.lastQuarter.t < this.bestQuarter.t) {
          this.bestQuarter = this.lastQuarter;
        }
        this.justFinished = 'quarter';
        this._armed = false;
        this._runT = null;
        this._qStart = null;
      }
    }
  }
}
