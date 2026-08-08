// ============================================================
// main.js — app wiring + animation loop
// ============================================================

import { PRESETS, Engine, TWO_PI, FOUR_PI } from './engine.js';
import { EngineAudio } from './audio.js';
import { makeLayout, makeCutawayState, renderCutaway, drawTach, drawDyno, CW, CH } from './render.js';
import { initUI } from './ui.js';

const $ = id => document.getElementById(id);

// ---------- canvas helpers ----------
function resizeOnce(cv, w, h) {
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
}
function fitFixed(cv, lw, lh) {
  // fit fixed logical size into element, return ctx transform info
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
  audio: new EngineAudio(),
  controls: { throttle: 0, load: 0.12, limiterOn: true, showLabels: true },
  cutaway: makeCutawayState(),
  layout: makeLayout(PRESETS.i4.cylinders),
  trail: [],
  peak: { tq: 0, kw: 0 },
  thrSm: 0,
  rpmSm: 0,

  setPreset(id) {
    const p = PRESETS[id];
    if (!p || p === this.engine.cfg) return;
    this.engine = new Engine(p);
    this.layout = makeLayout(p.cylinders);
    this.cutaway = makeCutawayState();
    this.trail.length = 0;
    this.peak = { tq: 0, kw: 0 };
    this.setIgn(false);
    document.querySelectorAll('#presetBtns button').forEach(b =>
      b.classList.toggle('active', b.dataset.preset === id));
    $('engineName').textContent = p.name;
  },
};

initUI(app);

// initial UI state
document.querySelector('#presetBtns button[data-preset="i4"]').classList.add('active');
$('engineName').textContent = PRESETS.i4.name;

// ---------- stat DOM refs ----------
const st = {
  rpm: $('stRpm'), tq: $('stTq'), kw: $('stKw'), fires: $('stFires'),
  coolant: $('stCoolant'), peak: $('stPeak'), status: $('stStatus'),
  rebuild: $('btnRebuild'), hint: $('overlayHint'),
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
  if (dt > 0.05) dt = 0.05;      // clamp tab-switch jumps
  if (dt <= 0) return;

  const en = app.engine;

  // throttle butterfly slew (mechanical)
  const rate = 6 * dt;
  app.thrSm += Math.max(-rate, Math.min(rate, app.controls.throttle - app.thrSm));
  const ctl = { ...app.controls, throttle: app.thrSm };

  // physics
  en.step(dt, ctl);

  // fire events -> visual flashes
  for (const f of en.drainFires()) app.cutaway.flashes.push(f);
  app.cutaway.flashes = app.cutaway.flashes.filter(f => now - f.t < 200);

  // rpm smoothing for needle
  app.rpmSm += (en.rpm - app.rpmSm) * (1 - Math.exp(-dt / 0.055));

  // dyno trail sampling
  if (en.running && (frames++ % 2) === 0) {
    const tq = Math.max(0, en.torqueWheel);
    const kw = Math.max(0, en.power / 1000);
    app.trail.push({ rpm: en.rpm, tq, kw });
    if (app.trail.length > 600) app.trail.shift();
    app.peak.tq = Math.max(app.peak.tq, tq);
    app.peak.kw = Math.max(app.peak.kw, kw);
  }

  // ---------- render ----------
  const c1 = fitFixed(cvMain, CW, CH);
  renderCutaway(c1, app.layout, en, app.cutaway, ctl, now, dt);

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
  st.peak.textContent = app.peak.kw > 1 ? `${app.peak.kw.toFixed(0)} kW · ${app.peak.tq.toFixed(0)} N·m` : '—';

  let status, cls;
  if (en.seized) { status = '⚠ SEIZED'; cls = 'bad'; }
  else if (!en.ignition) { status = en.rpm > 10 ? 'SPINNING DOWN' : 'OFF'; cls = ''; }
  else if (en.limitCut > 0.4) { status = 'REV LIMITER'; cls = 'warn'; }
  else if (en.cranking && !en.running) { status = 'CRANKING'; cls = 'warn'; }
  else if (en.running) { status = en.flareTimer > 0 ? 'STARTING' : 'RUNNING'; cls = 'good'; }
  else { status = 'READY'; cls = ''; }
  if (st.status.textContent !== status) {
    st.status.textContent = status;
    st.status.className = 'pill ' + cls;
  }
  st.rebuild.hidden = !en.seized;
  st.hint.style.display = (en.ignition || en.rpm > 10) ? 'none' : 'flex';

  // ---------- audio ----------
  const overrun = ctl.throttle < 0.06 && en.rpm > 3000 && en.running;
  if ((frames % 3) === 0) pushFireAngles();
  app.audio.update({
    rpm: en.rpm,
    load: en.loadFactor,
    combustion: en.ignition && !en.seized && en.rpm > 30,
    cranking: en.cranking && en.ignition && !en.running && en.rpm < 480,
    cut: en.limitCut,
    overrun,
    cyls: en.cfg.cylinders,
    throaty: en.cfg.throaty,
  });
}

requestAnimationFrame(loop);
