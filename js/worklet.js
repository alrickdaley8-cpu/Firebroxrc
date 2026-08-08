// ============================================================
// worklet.js — AudioWorkletProcessor: synthesizes engine audio
// Pulse-train of combustion events -> filtered noise + sub rumble
// + starter whine + overrun crackle + turbo whistle + intake
// whoosh + BOV pssh + shift clunk + nitrous hiss + cold lope.
// ============================================================

class ICEAudioProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rpm',        defaultValue: 0,     minValue: 0,    maxValue: 12000 },
      { name: 'load',       defaultValue: 0,     minValue: 0,    maxValue: 1 },
      { name: 'combustion', defaultValue: 0,     minValue: 0,    maxValue: 1 },
      { name: 'cranking',   defaultValue: 0,     minValue: 0,    maxValue: 1 },
      { name: 'cut',        defaultValue: 0,     minValue: 0,    maxValue: 1 },
      { name: 'overrun',    defaultValue: 0,     minValue: 0,    maxValue: 1 },
      { name: 'cyls',       defaultValue: 4,     minValue: 1,    maxValue: 12 },
      { name: 'throaty',    defaultValue: 0.5,   minValue: 0,    maxValue: 1 },
      { name: 'master',     defaultValue: 1,     minValue: 0,    maxValue: 1 },
      { name: 'boost',      defaultValue: 0,     minValue: 0,    maxValue: 2 },
      { name: 'nos',        defaultValue: 0,     minValue: 0,    maxValue: 1 },
      { name: 'cold',       defaultValue: 0,     minValue: 0,    maxValue: 1 },
    ];
  }

  constructor() {
    super();
    this.phase = 0;          // 0..720 four-stroke cycle degrees
    this.env = 0;            // combustion pulse envelope
    this.lp1 = 0; this.lp2 = 0;   // one-pole lowpass states
    this.intLp = 0;          // intake whoosh lowpass state
    this.subPh = 0;
    this.shufPh = 0;
    this.crankPh = 0;
    this.whisPh = 0;         // turbo whistle phase
    this.bovEnv = 0;         // blow-off valve envelope
    this.clunkEnv = 0;       // gear shift thud envelope
    this.clunkPh = 0;
    this.t = 0;
    this.fireAngles = [0, 180, 360, 540];
    this.port.onmessage = (e) => {
      if (!e.data) return;
      if (e.data.fireAngles) this.fireAngles = e.data.fireAngles;
      if (e.data.bov) this.bovEnv = 1;
      if (e.data.shift) { this.clunkEnv = 0.9; this.clunkPh = 0; }
    };
  }

  process(inputs, outputs, params) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const n = L.length;
    const sr = sampleRate;

    const rpmP = params.rpm, loadP = params.load, combP = params.combustion,
      crankP = params.cranking, cutP = params.cut, overP = params.overrun,
      cylP = params.cyls, thrP = params.throaty, mastP = params.master,
      boostP = params.boost, nosP = params.nos, coldP = params.cold;

    for (let i = 0; i < n; i++) {
      const g = (p, dflt) => (p.length > 1 ? p[i] : p[0]);
      const rpm = g(rpmP), load = g(loadP), comb = g(combP), crank = g(crankP),
        cut = g(cutP), over = g(overP), cyls = g(cylP), thr = g(thrP),
        mast = g(mastP), boost = g(boostP), nos = g(nosP), cold = g(coldP);

      this.t += 1 / sr;

      // --- advance cycle phase, trigger combustion pulses ---
      if (comb > 0.5 && rpm > 1) {
        const prev = this.phase;
        this.phase = (this.phase + (rpm * 360 / 60) / sr) % 720;
        for (let f = 0; f < this.fireAngles.length; f++) {
          const a = this.fireAngles[f];
          const crossed = prev <= this.phase
            ? (prev < a && this.phase >= a)
            : (prev < a || this.phase >= a);
          if (crossed) {
            const jSpan = cold > 0.5 ? 0.42 : 0.24;      // cold = rougher
            const jitter = (1 - jSpan / 2) + Math.random() * jSpan;
            const depth = (0.30 + 0.70 * load) * jitter * (1 + 0.35 * nos);
            if (Math.random() >= cut) {
              this.env = Math.min(1.3, this.env + depth);
            } else {
              this.env = Math.min(1.3, this.env + depth * 0.10);
            }
          }
        }
      }
      // overrun exhaust crackle
      if (over > 0.5 && Math.random() < (rpm / 4000) * 0.00028) {
        this.env = Math.min(1.3, this.env + 0.25 + Math.random() * 0.4);
      }

      const decay = 150 + rpm * 0.06;
      this.env *= Math.exp(-decay / sr);

      // --- excitation: filtered noise burst ---
      const noise = Math.random() * 2 - 1;
      const cutoff = 320 + 2300 * Math.min(1, load * 0.75 + rpm / 9000);
      const a1 = 1 - Math.exp(-2 * Math.PI * cutoff / sr);
      const a2 = 1 - Math.exp(-2 * Math.PI * (cutoff * 0.55) / sr);
      this.lp1 += a1 * (noise * this.env - this.lp1);
      this.lp2 += a2 * (this.lp1 - this.lp2);
      let sig = this.lp2 * (2.4 + 0.8 * nos);

      // --- sub rumble at half firing frequency ---
      const fireHz = (rpm / 60) * cyls / 2;
      this.subPh += 2 * Math.PI * Math.max(4, fireHz / 2) / sr;
      if (comb > 0.5) {
        const subGain = 0.22 * Math.min(1, rpm / 900) * (0.35 + 0.65 * load) * (0.4 + 0.6 * thr);
        sig += Math.sin(this.subPh) * subGain;
        this.shufPh += 2 * Math.PI * (rpm / 60) * 1.5 / sr;
        sig += Math.sin(this.shufPh) * 0.05 * load;
      }

      // --- intake whoosh (throttle-open broadband) ---
      const intA = 1 - Math.exp(-2 * Math.PI * (1400 + 1600 * load) / sr);
      this.intLp += intA * (noise - this.intLp);
      sig += (noise - this.intLp) * 0.10 * load * (comb > 0.5 ? 1 : 0);

      // --- turbo whistle ---
      if (boost > 0.02) {
        this.whisPh += 2 * Math.PI * (1000 + boost * 3200 + rpm * 0.06) / sr;
        sig += Math.sin(this.whisPh) * 0.030 * boost * (0.4 + 0.6 * load);
        sig += Math.sin(this.whisPh * 0.5) * 0.012 * boost;
      }

      // --- BOV pssh ---
      if (this.bovEnv > 0.004) {
        sig += noise * this.bovEnv * 0.20;
        this.bovEnv *= Math.exp(-14 / sr);
      }

      // --- shift clunk ---
      if (this.clunkEnv > 0.004) {
        this.clunkPh += 2 * Math.PI * 85 / sr;
        sig += Math.sin(this.clunkPh) * this.clunkEnv * 0.5;
        this.clunkEnv *= Math.exp(-30 / sr);
      }

      // --- nitrous hiss ---
      if (nos > 0.5) {
        sig += noise * 0.045;
        sig += Math.sin(this.subPh * 3) * 0.05;
      }

      // --- starter motor whine ---
      if (crank > 0.5) {
        this.crankPh += 2 * Math.PI * (120 + rpm * 0.85) / sr;
        const saw = (this.crankPh / (2 * Math.PI)) % 1 * 2 - 1;
        const trem = 0.6 + 0.4 * Math.sin(2 * Math.PI * 24 * this.t);
        sig += saw * 0.075 * trem;
      }

      sig = Math.tanh(sig * (1.0 + 1.6 * load)) * 0.62 * mast;

      L[i] = sig;
      R[i] = sig;
    }
    return true;
  }
}

registerProcessor('ice-audio', ICEAudioProcessor);
