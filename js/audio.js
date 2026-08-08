// ============================================================
// audio.js — AudioContext management + worklet hookup + fallback
// ============================================================

export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.node = null;
    this.params = null;
    this.enabled = true;
    this.ready = false;
    // fallback nodes
    this.fb = null;
  }

  // Must be called from a user gesture.
  async init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(comp); comp.connect(this.ctx.destination);
    this.masterGain = masterGain;

    try {
      await this.ctx.audioWorklet.addModule('js/worklet.js');
      this.node = new AudioWorkletNode(this.ctx, 'ice-audio', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
      });
      this.node.connect(masterGain);
      // build the param map from the node itself — ALWAYS in sync with the
      // worklet's parameterDescriptors (a hand-written list here once caused
      // a missing param to throw every frame -> total silence)
      this.params = {};
      for (const [name, p] of this.node.parameters) this.params[name] = p;
      this.ready = true;
      this._announceUnlock();
    } catch (err) {
      console.warn('AudioWorklet unavailable, using fallback synth', err);
      this.initFallback();
      this._announceUnlock();
    }
  }

  _announceUnlock() {
    if (this._unlocked || !this.ctx) return;
    this._unlocked = true;
    if (this.onUnlock) this.onUnlock();
  }

  // guarded param write — a missing param degrades silently, never kills audio
  setP(name, v, tc = 0.03) {
    const p = this.params && this.params[name];
    if (p) p.setTargetAtTime(v, this.ctx.currentTime, tc);
  }

  // Crude-but-audible fallback: two detuned saws + AM noise feel.
  initFallback() {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.value = 0;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.masterGain);
    o1.start(); o2.start();
    this.fb = { g, o1, o2, lp };
  }

  setFireAngles(anglesDeg) {
    if (this.node) this.node.port.postMessage({ fireAngles: anglesDeg });
  }

  // one-shot sound events
  bov()     { if (this.node) this.node.port.postMessage({ bov: true }); }
  shift()   { if (this.node) this.node.port.postMessage({ shift: true }); }
  flutter() { if (this.node) this.node.port.postMessage({ flutter: true }); }

  setMaster(v) {
    this.setP('master', v, 0.05);
    // fallback path: gain is recomputed in update() from this.enabled
  }

  // state: { rpm, load, combustion, cranking, cut, overrun, cyls, throaty, boost, nos, cold, spin }
  update(s) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const tc = 0.03;
    if (this.ready && this.params) {
      this.setP('rpm', s.rpm, tc);
      this.setP('load', s.load, tc);
      this.setP('combustion', s.combustion ? 1 : 0, 0.01);
      this.setP('cranking', s.cranking ? 1 : 0, 0.01);
      this.setP('cut', s.cut, tc);
      this.setP('overrun', s.overrun ? 1 : 0, 0.1);
      this.setP('cyls', s.cyls, 0.5);
      this.setP('throaty', s.throaty, 0.5);
      this.setP('boost', s.boost || 0, 0.08);
      this.setP('nos', s.nos ? 1 : 0, 0.01);
      this.setP('cold', s.cold ? 1 : 0, 0.5);
      this.setP('spin', s.spin || 0, 0.05);
    } else if (this.fb) {
      const f = ((s.rpm / 60) * s.cyls) / 2;
      this.fb.o1.frequency.setTargetAtTime(Math.max(20, f), t, tc);
      this.fb.o2.frequency.setTargetAtTime(Math.max(12, f / 2), t, tc);
      this.fb.lp.frequency.setTargetAtTime(400 + 2000 * s.load, t, tc);
      const vol = (s.combustion ? 0.12 + 0.25 * s.load : s.cranking ? 0.06 : 0) * (this.enabled ? 1 : 0);
      this.fb.g.gain.setTargetAtTime(vol, t, tc);
    }
  }
}
