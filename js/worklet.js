// ============================================================
// worklet.js — AudioWorkletProcessor: synthesizes engine audio
// Pulse-train of combustion events -> filtered noise + sub rumble
// + starter whine + overrun crackle. Driven by k-rate params
// updated each animation frame from the physics engine.
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
    ];
  }

  constructor() {
    super();
    this.phase = 0;          // 0..720 four-stroke cycle degrees
    this.env = 0;            // combustion pulse envelope
    this.lp1 = 0; this.lp2 = 0;   // one-pole lowpass states
    this.subPh = 0;          // sub oscillator phase
    this.shufPh = 0;         // intake shuffle oscillator phase
    this.crankPh = 0;        // starter whine phase
    this.t = 0;              // running time seconds
    this.fireAngles = [0, 180, 360, 540]; // updated from main thread
    this.port.onmessage = (e) => {
      if (e.data && e.data.fireAngles) this.fireAngles = e.data.fireAngles;
    };
  }

  process(inputs, outputs, params) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const n = L.length;
    const sr = sampleRate;

    const rpmP = params.rpm, loadP = params.load, combP = params.combustion,
      crankP = params.cranking, cutP = params.cut, overP = params.overrun,
      cylP = params.cyls, thrP = params.throaty, mastP = params.master;

    for (let i = 0; i < n; i++) {
      const rpm = rpmP.length > 1 ? rpmP[i] : rpmP[0];
      const load = loadP.length > 1 ? loadP[i] : loadP[0];
      const comb = combP.length > 1 ? combP[i] : combP[0];
      const crank = crankP.length > 1 ? crankP[i] : crankP[0];
      const cut = cutP.length > 1 ? cutP[i] : cutP[0];
      const over = overP.length > 1 ? overP[i] : overP[0];
      const cyls = cylP.length > 1 ? cylP[i] : cylP[0];
      const thr = thrP.length > 1 ? thrP[i] : thrP[0];
      const mast = mastP.length > 1 ? mastP[i] : mastP[0];

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
            const jitter = 0.82 + Math.random() * 0.18;
            const depth = (0.30 + 0.70 * load) * jitter;
            if (Math.random() >= cut) {
              this.env = Math.min(1.2, this.env + depth);
            } else {
              this.env = Math.min(1.2, this.env + depth * 0.10); // cut = weak pop
            }
          }
        }
      }
      // overrun exhaust crackle (throttle snapped shut at rpm)
      if (over > 0.5 && Math.random() < (rpm / 4000) * 0.00028) {
        this.env = Math.min(1.2, this.env + 0.25 + Math.random() * 0.4);
      }

      // envelope decay: short pops at low rpm, blending at high rpm
      const decay = 150 + rpm * 0.06;
      this.env *= Math.exp(-decay / sr);

      // --- excitation: filtered noise burst ---
      const noise = Math.random() * 2 - 1;
      const cutoff = 320 + 2300 * Math.min(1, load * 0.75 + rpm / 9000);
      const a1 = 1 - Math.exp(-2 * Math.PI * cutoff / sr);
      const a2 = 1 - Math.exp(-2 * Math.PI * (cutoff * 0.55) / sr);
      this.lp1 += a1 * (noise * this.env - this.lp1);
      this.lp2 += a2 * (this.lp1 - this.lp2);
      let sig = this.lp2 * 2.4;

      // --- sub rumble at half firing frequency ---
      const fireHz = (rpm / 60) * cyls / 2;
      this.subPh += 2 * Math.PI * Math.max(4, fireHz / 2) / sr;
      if (comb > 0.5) {
        const subGain = 0.22 * Math.min(1, rpm / 900) * (0.35 + 0.65 * load) * (0.4 + 0.6 * thr);
        sig += Math.sin(this.subPh) * subGain;
        // intake/turbo shuffle at 1.5x crank frequency
        this.shufPh += 2 * Math.PI * (rpm / 60) * 1.5 / sr;
        sig += Math.sin(this.shufPh) * 0.05 * load;
      }

      // --- starter motor whine ---
      if (crank > 0.5) {
        this.crankPh += 2 * Math.PI * (120 + rpm * 0.85) / sr;
        const saw = (this.crankPh / (2 * Math.PI)) % 1 * 2 - 1;
        const trem = 0.6 + 0.4 * Math.sin(2 * Math.PI * 24 * this.t);
        sig += saw * 0.075 * trem;
      }

      // soft clip + master
      sig = Math.tanh(sig * (1.0 + 1.6 * load)) * 0.62 * mast;

      L[i] = sig;
      R[i] = sig;
    }
    return true;
  }
}

registerProcessor('ice-audio', ICEAudioProcessor);
