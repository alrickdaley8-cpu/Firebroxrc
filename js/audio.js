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
      this.params = {
        rpm: this.node.parameters.get('rpm'),
        load: this.node.parameters.get('load'),
        combustion: this.node.parameters.get('combustion'),
        cranking: this.node.parameters.get('cranking'),
        cut: this.node.parameters.get('cut'),
        overrun: this.node.parameters.get('overrun'),
        cyls: this.node.parameters.get('cyls'),
        throaty: this.node.parameters.get('throaty'),
        master: this.node.parameters.get('master'),
        boost: this.node.parameters.get('boost'),
        nos: this.node.parameters.get('nos'),
        cold: this.node.parameters.get('cold'),
      };
      this.ready = true;
    } catch (err) {
      console.warn('AudioWorklet unavailable, using fallback synth', err);
      this.initFallback();
    }
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
  bov()    { if (this.node) this.node.port.postMessage({ bov: true }); }
  shift()  { if (this.node) this.node.port.postMessage({ shift: true }); }

  setMaster(v) {
    if (this.params) this.params.master.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    if (this.fb) this.fb.g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  // state: { rpm, load, combustion, cranking, cut, overrun, cyls, throaty, boost, nos, cold }
  update(s) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const tc = 0.03;
    if (this.ready && this.params) {
      this.params.rpm.setTargetAtTime(s.rpm, t, tc);
      this.params.load.setTargetAtTime(s.load, t, tc);
      this.params.combustion.setTargetAtTime(s.combustion ? 1 : 0, t, 0.01);
      this.params.cranking.setTargetAtTime(s.cranking ? 1 : 0, t, 0.01);
      this.params.cut.setTargetAtTime(s.cut, t, tc);
      this.params.overrun.setTargetAtTime(s.overrun ? 1 : 0, t, 0.1);
      this.params.cyls.setTargetAtTime(s.cyls, t, 0.5);
      this.params.throaty.setTargetAtTime(s.throaty, t, 0.5);
      this.params.boost.setTargetAtTime(s.boost || 0, t, 0.08);
      this.params.nos.setTargetAtTime(s.nos ? 1 : 0, t, 0.01);
      this.params.cold.setTargetAtTime(s.cold ? 1 : 0, t, 0.5);
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
