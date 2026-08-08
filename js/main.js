// ============================================================
// main.js — app wiring + animation loop
// ============================================================

import { PRESETS, Engine, TWO_PI, FOUR_PI } from './engine.js';
import { Vehicle } from './vehicle.js';
import { EngineAudio } from './audio.js';
import { makeLayout, makeCutawayState, renderCutaway, drawTach, drawDyno, CW, CH } from './render.js';
import { initUI } from './ui.js';

const $ = id => document.getElementById(id);

// ---------- canvas helpers ----------
function resizeOnce(cv, w, h) {
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
}
function fitFixed(cv, lw, lh) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = cv.getBoundingClientRect();
  resizeOnce(cv, Math.max(2, Math.round(rect.width * dpr)), Math.max(2, Math.round(rect.height * dpr)));
  const s = Math.min(cv.width / lw, cv.height / lh);
  const ctx = cv.getContext('2d');
  ctx.setTransform(s, 0, 0, s, (cv.width - lw * s) / 2, (cv.height - lh * s) / 2);
  return ctx;
}
function fitFluid(cv, lw, lh) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  resizeOnce(cv, Math.round(lw * dpr), Math.round(lh * dpr));
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// ---------- app state ----------
const app = {
  engine: new Engine(PRESETS.i4),
  vehicle: new Vehicle(PRESETS.i4),
  audio: new EngineAudio(),
  mode: 'dyno',                                   // 'dyno' | 'drive'
  controls: { throttle: 0, load: 0.12, limiterOn: true, showLabels: true, nos: false },
  cutaway: makeCutawayState(),
  layout: makeLayout(PRESETS.i4.cylinders),
  trail: [],
  peak: { tq: 0, kw: 0 },
  thrSm: 0,
  rpmSm: 0,
  spinSm: 0,
  eventShake: 0,
  flash: { msg: '', until: 0 },

  setFlash(msg, ttl = 3.2) {
    this.flash = { msg, until: performance.now() + ttl * 1000 };
  },

  setPreset(id) {
    const p = PRESETS[id];
    if (!p || p === this.engine.cfg) return;
    this.engine = new Engine(p);
    this.vehicle = new Vehicle(p);
    this.layout = makeLayout(p.cylinders);
    this.cutaway = makeCutawayState();
    this.trail.length = 0;
    this.peak = { tq: 0, kw: 0 };
    this.setIgn(false);
    document.querySelectorAll('#presetBtns button').forEach(b =>
      b.classList.toggle('active', b.dataset.preset === id));
    $('engineName').textContent = p.name;
    this.setFlash(`ENGINE SWAPPED: ${p.name}`);
  },

  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    document.getElementById('modeDyno').classList.toggle('active', m === 'dyno');
    document.getElementById('modeDrive').classList.toggle('active', m === 'drive');
    document.getElementById('rowLoad').classList.toggle('disabled', m === 'drive');
    document.getElementById('gearBox').classList.toggle('disabled', m !== 'drive');
    this.setFlash(m === 'drive'
      ? 'DRIVE MODE — shift with E/Q, launch from a stop'
      : 'DYNO MODE — free-rev against the brake');
  },
};

initUI(app);

document.querySelector('#presetBtns button[data-preset="i4"]').classList.add('active');
$('engineName').textContent = PRESETS.i4.name;

// ---------- stat DOM refs ----------
const st = {
  rpm: $('stRpm'), tq: $('stTq'), kw: $('stKw'), fires: $('stFires'),
  coolant: $('stCoolant'), peak: $('stPeak'), status: $('stStatus'),
  gear: $('stGear'), speed: $('stSpeed'), boost: $('stBoost'), boostBar: $('boostBarFill'),
  fuelBar: $('fuelBarFill'), fuelL: $('stFuelL'), nosBar: $('nosBarFill'),
  t0100: $('stT0100'), quarter: $('stQuarter'), dist: $('stDist'),
  rebuild: $('btnRebuild'), hint: $('overlayHint'), flashEl: $('flashMsg'),
};

// ---------- audio fire-angle sync ----------
function pushFireAngles() {
  const en = app.engine;
  const adv = en.sparkAdvanceRad();
  const angs = en.pinPhase.map(p => {
    let a = (p + TWO_PI - adv) % FOUR_PI;
    if (a < 0) a += FOUR_PI;
    return (a * 360) / TWO_PI;
  });
  app.audio.setFireAngles(angs);
}

// ---------- main loop ----------
const cvMain = $('cv'), cvTach = $('tachCv'), cvDyno = $('dynoCv');
let last = performance.now();
let frames = 0;

function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) return;

  const en = app.engine;
  const veh = app.vehicle;

  // throttle butterfly slew
  const rate = 6 * dt;
  app.thrSm += Math.max(-rate, Math.min(rate, app.controls.throttle - app.thrSm));

  // drivetrain coupling (DRIVE mode)
  const coupling = app.mode === 'drive'
    ? veh.couple(en)
    : { externalRpm: null, driveLoad: null };

  const ctl = {
    ...app.controls,
    throttle: app.thrSm,
    externalRpm: coupling.externalRpm,
    driveLoad: coupling.driveLoad,
  };

  en.step(dt, ctl);
  if (app.mode === 'drive') veh.step(dt, en);

  // ---- one-shot events ----
  if (en.bovPulse) { en.bovPulse = false; app.audio.bov(); app.eventShake = Math.max(app.eventShake, 1.0); }
  if (en.flutterPulse) { en.flutterPulse = false; app.audio.flutter(); app.eventShake = Math.max(app.eventShake, 0.4); }
  if (veh.shiftPing) { veh.shiftPing = false; app.audio.shift(); app.eventShake = Math.max(app.eventShake, 0.7); }
  if (veh.justFinished) {
    if (veh.justFinished === '0100') app.setFlash(`0–100 km/h in ${veh.last0100.toFixed(1)}s 🏁`, 4.5);
    if (veh.justFinished === 'quarter') app.setFlash(`¼ MILE: ${veh.lastQuarter.t.toFixed(2)}s @ ${veh.lastQuarter.trap.toFixed(0)} km/h 🏆`, 5.5);
    veh.justFinished = null;
  }
  app.eventShake *= Math.exp(-dt * 5);

  // wheelspin level (drive mode only), smoothed for audio + visuals
  const spinNow = app.mode === 'drive' ? veh.wheelspin : 0;
  app.spinSm += (spinNow - app.spinSm) * (1 - Math.exp(-dt / 0.08));

  // fire events -> flashes
  for (const f of en.drainFires()) app.cutaway.flashes.push(f);
  app.cutaway.flashes = app.cutaway.flashes.filter(f => now - f.t < 200);

  app.rpmSm += (en.rpm - app.rpmSm) * (1 - Math.exp(-dt / 0.055));

  // dyno trail
  if (en.running && (frames++ % 2) === 0) {
    const tq = Math.max(0, en.torqueWheel);
    const kw = Math.max(0, en.power / 1000);
    app.trail.push({ rpm: en.rpm, tq, kw });
    if (app.trail.length > 600) app.trail.shift();
    app.peak.tq = Math.max(app.peak.tq, tq);
    app.peak.kw = Math.max(app.peak.kw, kw);
  }

  // ---------- render ----------
  const overrun = app.thrSm < 0.06 && en.rpm > 3000 && en.running;
  const view = {
    throttle: app.thrSm,
    load: app.controls.load,
    showLabels: app.controls.showLabels,
    mode: app.mode,
    gear: veh.gear,
    speedKmh: veh.kmh(),
    shiftPing: veh.shiftT > 0,
    overrun,
    eventShake: app.eventShake,
    wheelspin: app.spinSm,
  };
  const c1 = fitFixed(cvMain, CW, CH);
  renderCutaway(c1, app.layout, en, app.cutaway, view, now, dt);

  const tw = cvTach.clientWidth, thh = cvTach.clientHeight;
  drawTach(fitFluid(cvTach, tw, thh), tw, thh, en, app.rpmSm);

  const dw = cvDyno.clientWidth, dh = cvDyno.clientHeight;
  drawDyno(fitFluid(cvDyno, dw, dh), dw, dh, en, app.trail);

  // ---------- stats ----------
  const kw = Math.max(0, en.power / 1000);
  st.rpm.textContent = Math.round(en.rpm);
  st.tq.textContent = en.running ? Math.round(Math.max(0, en.torqueWheel)) + ' N·m' : '—';
  st.kw.textContent = en.running ? kw.toFixed(0) + ' kW / ' + (kw * 1.341).toFixed(0) + ' hp' : '—';
  st.fires.textContent = en.running ? ((en.rpm / 60) * en.cfg.cylinders / 2).toFixed(1) + ' Hz' : '—';
  st.coolant.textContent = en.coolant.toFixed(0) + ' °C';
  st.coolant.style.color = en.coolant > 115 ? '#ff5040' : en.coolant > 100 ? '#ffd27d' : '';
  st.peak.textContent = app.peak.kw > 1 ? `${app.peak.kw.toFixed(0)} kW · ${app.peak.tq.toFixed(0)} N·m` : '—';

  st.gear.textContent = veh.gear === 0 ? 'N' : String(veh.gear);
  st.speed.textContent = Math.round(veh.kmh());
  st.dist.textContent = (veh.dist / 1000).toFixed(2) + ' km';
  st.boost.textContent = en.cfg.maxBoost ? en.boost.toFixed(2) + ' bar' : 'N/A';
  st.boostBar.style.width = en.cfg.maxBoost ? (en.boost / en.cfg.maxBoost * 100).toFixed(0) + '%' : '0%';
  st.fuelBar.style.width = (en.fuel / en.tankSize * 100).toFixed(1) + '%';
  st.fuelBar.style.background = en.fuel < 1.2 ? '#ff5040' : '';
  st.fuelL.textContent = en.fuel.toFixed(2) + ' L';
  st.nosBar.style.width = en.nitro.toFixed(0) + '%';

  st.t0100.textContent = veh.best0100 != null ? veh.best0100.toFixed(2) + ' s' : '—';
  st.quarter.textContent = veh.bestQuarter != null
    ? `${veh.bestQuarter.t.toFixed(2)} s @ ${veh.bestQuarter.trap.toFixed(0)}`
    : '—';

  // flash toast
  const flashOn = now < app.flash.until;
  if (flashOn && st.flashEl.textContent !== app.flash.msg) st.flashEl.textContent = app.flash.msg;
  st.flashEl.classList.toggle('show', flashOn);

  // ---------- status ----------
  let status, cls;
  if (en.seized) { status = '⚠ SEIZED'; cls = 'bad'; }
  else if (en.stalled) { status = 'STALLED'; cls = 'bad'; }
  else if (en.fuel <= 0) { status = 'OUT OF FUEL'; cls = en.ignition ? 'bad' : ''; }
  else if (en.limp) { status = 'LIMP MODE · HOT'; cls = 'warn'; }
  else if (!en.ignition) { status = en.rpm > 10 ? 'SPINNING DOWN' : 'OFF'; cls = ''; }
  else if (en.limitCut > 0.4) { status = 'REV LIMITER'; cls = 'warn'; }
  else if (en.cranking && !en.running) { status = 'CRANKING'; cls = 'warn'; }
  else if (en.running) { status = en.flareTimer > 0 ? 'STARTING' : (app.mode === 'drive' ? 'DRIVING' : 'RUNNING'); cls = 'good'; }
  else { status = 'READY'; cls = ''; }
  if (st.status.textContent !== status) {
    st.status.textContent = status;
    st.status.className = 'pill ' + cls;
  }
  st.rebuild.hidden = !en.seized;
  st.hint.style.display = (en.ignition || en.rpm > 10) ? 'none' : 'flex';

  // ---------- audio ----------
  if ((frames % 3) === 0) pushFireAngles();
  app.audio.update({
    rpm: en.rpm,
    load: en.loadFactor,
    combustion: en.combustionTarget() && en.rpm > 30,
    cranking: en.cranking && en.ignition && !en.running && en.rpm < 480,
    cut: Math.max(en.limitCut, en.fuelCut * 0.85),
    overrun,
    cyls: en.cfg.cylinders,
    throaty: en.cfg.throaty,
    boost: en.boost,
    nos: en.nosActive,
    cold: en.coolant < 45,
    spin: app.spinSm,
  });
}

requestAnimationFrame(loop);
