// ============================================================
// render.js — all canvas rendering:
//   Cutaway       — animated longitudinal section of the engine
//   drawTach      — tachometer gauge
//   drawDyno      — torque/power chart
// ============================================================

import { TWO_PI, FOUR_PI } from './engine.js';

export const CW = 980;   // cutaway logical width
export const CH = 620;   // cutaway logical height

// ---------- geometry (rebuilt per preset) ----------
export function makeLayout(nCyl, borePx = 88, gapPx = 26) {
  const pitch = borePx + gapPx;
  const rowW = (nCyl - 1) * pitch + borePx;
  const x0 = (CW - rowW) / 2;
  const cylX = [];
  for (let i = 0; i < nCyl; i++) cylX.push(x0 + borePx / 2 + i * pitch);
  return {
    nCyl, borePx, gapPx, pitch, rowW, x0, cylX,
    X0: x0 - 34, X1: x0 + rowW + 34,          // block outer left/right
    deckY: 218,                                // head/block split
    headTop: 132, camY: 156,
    tdcCrown: 242, strokePx: 118,
    rho: 59, rodLen: 148, crankY: 468, pistonH: 56, wristOff: 26,
    plenumY: 66,
    cavity0: 414, cavity1: 502,
    sump0: 502, sump1: 556,
  };
}

// ---------- helpers ----------
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function bolt(c, x, y, r, fill) {
  c.beginPath(); c.arc(x, y, r, 0, TWO_PI); c.fillStyle = fill; c.fill();
}

function mod4pi(a) { a %= FOUR_PI; return a < 0 ? a + FOUR_PI : a; }

// valve lift (px, max `mx`) given cycle angle range
function liftProfile(tc, startDeg, durDeg, mx) {
  const s = (startDeg * Math.PI) / 180, d = (durDeg * Math.PI) / 180;
  let t = tc - s;
  if (t < 0 || t > d) return 0;
  return mx * Math.pow(Math.sin((Math.PI * t) / d), 1.35);
}

// ---------- state for particles & flashes ----------
export function makeCutawayState() {
  return { particles: [], flashes: [], smokes: [], lastT: 0 };
}

const MAXP = 160;

// ============================================================
// MAIN CUTAWAY RENDER
// ============================================================
export function renderCutaway(c, lay, eng, st, controls, now, dt) {
  const cfg = eng.cfg;
  const n = lay.nCyl;
  const th = eng.theta;
  const adv = eng.sparkAdvanceRad ? eng.sparkAdvanceRad() : 0.3;

  c.clearRect(0, 0, CW, CH);

  // ---- backdrop ----
  const bg = c.createRadialGradient(CW / 2, 260, 80, CW / 2, 300, 720);
  bg.addColorStop(0, '#171d2b');
  bg.addColorStop(1, '#0a0d14');
  c.fillStyle = bg; c.fillRect(0, 0, CW, CH);
  c.strokeStyle = 'rgba(120,160,255,0.05)'; c.lineWidth = 1;
  for (let gx = 0; gx < CW; gx += 49) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, CH); c.stroke(); }
  for (let gy = 0; gy < CH; gy += 49) { c.beginPath(); c.moveTo(0, gy); c.lineTo(CW, gy); c.stroke(); }

  // ---- engine shake (torque reaction at low rpm / cranking) ----
  const shakeAmp = clamp(2.2 - eng.rpm / 1400, 0, 1) * clamp(eng.shake * 0.004, 0, 2.2)
    + (eng.cranking ? 0.7 : 0) + (eng.limitCut > 0.5 ? 0.6 : 0);
  const shX = (Math.random() - 0.5) * shakeAmp;
  const shY = (Math.random() - 0.5) * shakeAmp;

  c.save();
  c.translate(shX, shY);

  // ---- ground shadow + stand ----
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.ellipse(CW / 2, 592, 300, 16, 0, 0, TWO_PI); c.fill();
  c.fillStyle = '#232a3a';
  c.fillRect(lay.X0 + 40, lay.sump1, 22, 34);
  c.fillRect(lay.X1 - 62, lay.sump1, 22, 34);
  c.fillStyle = '#1b2230';
  c.fillRect(lay.X0 + 20, lay.sump1 + 30, lay.X1 - lay.X0, 8);

  // =================================================
  // INTAKE PLENUM + THROTTLE BODY (drawn behind head)
  // =================================================
  const plY = lay.plenumY;
  // runners
  c.strokeStyle = '#2c3a55'; c.lineWidth = 15; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const cx = lay.cylX[i];
    c.beginPath();
    c.moveTo(cx - 22, plY + 10);
    c.quadraticCurveTo(cx - 30, 100, cx - 24, 140);
    c.stroke();
  }
  c.strokeStyle = '#3a4c6e'; c.lineWidth = 3;
  for (let i = 0; i < n; i++) {
    const cx = lay.cylX[i];
    c.beginPath(); c.moveTo(cx - 22, plY + 4); c.quadraticCurveTo(cx - 30, 100, cx - 24, 138); c.stroke();
  }
  // plenum tube
  const plGrad = c.createLinearGradient(0, plY - 18, 0, plY + 18);
  plGrad.addColorStop(0, '#39466a'); plGrad.addColorStop(0.5, '#232e4a'); plGrad.addColorStop(1, '#161e33');
  rr(c, lay.X0 - 6, plY - 18, lay.X1 - lay.X0 + 12, 36, 16);
  c.fillStyle = plGrad; c.fill();
  c.strokeStyle = '#10141f'; c.lineWidth = 2; c.stroke();
  // throttle body at right end
  const tbX = lay.X1 + 18;
  rr(c, tbX, plY - 14, 46, 28, 8); c.fillStyle = '#2c3850'; c.fill(); c.strokeStyle = '#10141f'; c.stroke();
  c.beginPath(); c.arc(tbX + 23, plY, 11, 0, TWO_PI); c.fillStyle = '#0d1220'; c.fill();
  // butterfly plate
  const bAng = (12 + 74 * controls.throttle) * Math.PI / 180;
  c.save(); c.translate(tbX + 23, plY); c.rotate(bAng);
  c.fillStyle = '#c9d6f2'; c.fillRect(-10, -1.8, 20, 3.6); c.restore();
  bolt(c, tbX + 23, plY, 3, '#5a6b8f');
  // airbox after TB
  rr(c, tbX + 52, plY - 20, 74, 40, 10); c.fillStyle = '#1e2740'; c.fill(); c.strokeStyle = '#10141f'; c.stroke();
  c.fillStyle = '#5f7398'; c.font = '10px sans-serif'; c.textAlign = 'center';
  c.fillText('AIRBOX', tbX + 89, plY + 3);

  // =================================================
  // HEAD + VALVETRAIN per cylinder
  // =================================================
  // head block body
  const hg = c.createLinearGradient(0, lay.headTop, 0, lay.deckY);
  hg.addColorStop(0, '#4a5568'); hg.addColorStop(1, '#333c4c');
  rr(c, lay.X0, lay.headTop, lay.X1 - lay.X0, lay.deckY - lay.headTop, 10);
  c.fillStyle = hg; c.fill();
  c.strokeStyle = '#12161e'; c.lineWidth = 2; c.stroke();

  for (let i = 0; i < n; i++) {
    const cx = lay.cylX[i];
    const tc = mod4pi(th - eng.pinPhase[i]);

    // chamber cutout (dome)
    c.beginPath();
    c.arc(cx, lay.deckY, lay.borePx / 2 + 6, Math.PI, 0);
    c.lineTo(cx + lay.borePx / 2 + 6, lay.deckY);
    c.closePath();
    c.fillStyle = '#10141c'; c.fill();

    const inL = liftProfile(tc, -30, 245, 9);   // intake valve lift
    const exL = liftProfile(tc, 490, 250, 9);   // exhaust valve lift

    // ---- valves ----
    drawValve(c, cx - 22, lay.deckY - 58, cx - 13, lay.deckY - 6, inL, '#57a7ff');
    drawValve(c, cx + 22, lay.deckY - 58, cx + 13, lay.deckY - 6, exL, '#ff7a59');

    // ---- cam lobes (spin at half crank speed) ----
    const camAng = th / 2 + eng.pinPhase[i] / 2;
    drawCam(c, cx - 22, lay.camY, camAng, '#e8b64c');
    drawCam(c, cx + 22, lay.camY, camAng + 0.7, '#e8b64c');

    // ---- spark plug (center) ----
    c.strokeStyle = '#d8dee9'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, lay.deckY - 64); c.lineTo(cx, lay.deckY - 26); c.stroke();
    c.fillStyle = '#8f2b2b'; c.fillRect(cx - 6, lay.deckY - 72, 12, 10); // coil boot
    c.fillStyle = '#9aa4b2'; c.fillRect(cx - 4, lay.deckY - 28, 8, 14);

    // ignition wire up off-screen
    c.strokeStyle = '#3d2b2b'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx, lay.deckY - 72); c.quadraticCurveTo(cx + 8, 96, cx + 4, 40); c.stroke();
  }

  // head gasket seam
  c.fillStyle = '#12161e'; c.fillRect(lay.X0, lay.deckY - 2, lay.X1 - lay.X0, 3);

  // =================================================
  // BLOCK: webs between bores, cavity, sump, oil
  // =================================================
  // webs (material between cylinder bores)
  c.fillStyle = '#3c4553';
  const webTop = lay.deckY, webBot = lay.cavity0 + 6;
  // left of first bore
  c.fillRect(lay.X0, webTop, lay.cylX[0] - lay.borePx / 2 - lay.X0, webBot - webTop);
  for (let i = 0; i < n - 1; i++) {
    const a = lay.cylX[i] + lay.borePx / 2, b = lay.cylX[i + 1] - lay.borePx / 2;
    c.fillRect(a, webTop, b - a, webBot - webTop);
  }
  c.fillRect(lay.cylX[n - 1] + lay.borePx / 2, webTop, lay.X1 - (lay.cylX[n - 1] + lay.borePx / 2), webBot - webTop);
  // web bolts
  c.fillStyle = '#232a36';
  for (let i = 0; i < n - 1; i++) {
    const mx = (lay.cylX[i] + lay.cylX[i + 1]) / 2;
    bolt(c, mx, 240, 4, '#232a36'); bolt(c, mx, 396, 4, '#232a36');
  }

  // bore walls (crosshatched)
  for (let i = 0; i < n; i++) {
    const cx = lay.cylX[i];
    c.fillStyle = '#5a6577';
    c.fillRect(cx - lay.borePx / 2 - 13, lay.deckY, 13, webBot - webTop);
    c.fillRect(cx + lay.borePx / 2, lay.deckY, 13, webBot - webTop);
    c.strokeStyle = 'rgba(20,25,35,0.5)'; c.lineWidth = 1;
    for (let y = lay.deckY + 8; y < webBot - 6; y += 12) {
      c.beginPath();
      c.moveTo(cx - lay.borePx / 2 - 11, y); c.lineTo(cx - lay.borePx / 2 - 2, y + 5);
      c.moveTo(cx + lay.borePx / 2 + 2, y); c.lineTo(cx + lay.borePx / 2 + 11, y + 5);
      c.stroke();
    }
  }

  // crank cavity
  rr(c, lay.X0, lay.cavity0, lay.X1 - lay.X0, lay.cavity1 - lay.cavity0, 18);
  c.fillStyle = '#141a26'; c.fill();

  // sump
  rr(c, lay.X0 + 10, lay.sump0, lay.X1 - lay.X0 - 20, lay.sump1 - lay.sump0, 14);
  c.fillStyle = '#2c333f'; c.fill(); c.strokeStyle = '#12161e'; c.stroke();
  // oil (sloshing slightly with shake)
  const oilT = 518 + shY * 2;
  c.save();
  rr(c, lay.X0 + 14, lay.sump0 + 4, lay.X1 - lay.X0 - 28, lay.sump1 - lay.sump0 - 8, 12); c.clip();
  const og = c.createLinearGradient(0, oilT, 0, lay.sump1);
  og.addColorStop(0, 'rgba(255,170,60,0.55)'); og.addColorStop(1, 'rgba(150,80,20,0.75)');
  c.fillStyle = og; c.fillRect(lay.X0 + 14, oilT + Math.sin(now / 300) * 2, lay.X1 - lay.X0 - 28, lay.sump1 - oilT);
  c.restore();
  // dipstick
  c.strokeStyle = '#d9c14a'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(lay.X1 - 22, 470); c.lineTo(lay.X1 - 30, 540); c.stroke();

  // =================================================
  // ROTATING ASSEMBLY per cylinder: webs, pins, rods, pistons
  // =================================================
  const cyC = lay.crankY;
  for (let i = 0; i < n; i++) {
    const cx = lay.cylX[i];
    const tc = mod4pi(th - eng.pinPhase[i]);
    const pinA = tc % TWO_PI;                       // crank pin angle
    const sA = Math.sin(pinA), cA = Math.cos(pinA);
    const pinX = cx + lay.rho * sA, pinY = cyC - lay.rho * cA;
    const wristY = cyC - (lay.rho * cA + Math.sqrt(lay.rodLen * lay.rodLen - (lay.rho * sA) ** 2));
    const crownY = wristY - lay.wristOff;

    // ---- crank webs / counterweights ----
    c.save();
    c.translate(cx, cyC); c.rotate(pinA);
    const wg = c.createLinearGradient(-30, 0, 30, 0);
    wg.addColorStop(0, '#6b7688'); wg.addColorStop(1, '#49525f');
    c.fillStyle = wg;
    // counterweight: sector opposite the pin
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, 44, Math.PI - 0.9, Math.PI + 0.9, false);
    c.closePath(); c.fill();
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, 30, -0.9, 0.9, false);   // small web toward pin
    c.closePath(); c.fill();
    c.restore();

    // main journal
    bolt(c, cx, cyC, 15, '#7c889c'); bolt(c, cx, cyC, 6, '#39424f');

    // ---- gas fill above piston (before piston overdraw) ----
    drawGas(c, lay, i, tc, cx, crownY, eng, now);

    // ---- connecting rod ----
    c.strokeStyle = '#9aa5b8'; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, wristY); c.lineTo(pinX, pinY); c.stroke();
    c.strokeStyle = '#c3cddd'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, wristY); c.lineTo(pinX, pinY); c.stroke();
    bolt(c, pinX, pinY, 13, '#8b96a8'); bolt(c, pinX, pinY, 5, '#39424f');

    // ---- piston ----
    const px = cx - (lay.borePx - 8) / 2, pw = lay.borePx - 8;
    const pg = c.createLinearGradient(px, 0, px + pw, 0);
    pg.addColorStop(0, '#d5dbe6'); pg.addColorStop(0.55, '#aab3c2'); pg.addColorStop(1, '#7e8898');
    rr(c, px, crownY, pw, lay.pistonH, 5);
    c.fillStyle = pg; c.fill();
    c.strokeStyle = '#39424f'; c.lineWidth = 1.5; c.stroke();
    // ring grooves
    c.fillStyle = '#3a434f';
    c.fillRect(px + 3, crownY + 8, pw - 6, 3);
    c.fillRect(px + 3, crownY + 15, pw - 6, 3);
    // wrist pin
    bolt(c, cx, wristY, 9, '#e8edf5'); bolt(c, cx, wristY, 3.5, '#39424f');
  }

  // spark flashes (drawn over combustion chambers)
  for (const f of st.flashes) {
    const age = now - f.t;
    if (age > 130) continue;
    const k = 1 - age / 130;
    const cx = lay.cylX[f.cyl];
    c.save(); c.globalAlpha = k;
    const fg = c.createRadialGradient(cx, lay.deckY - 14, 1, cx, lay.deckY - 14, 42);
    fg.addColorStop(0, 'rgba(255,255,255,0.95)');
    fg.addColorStop(0.4, 'rgba(255,200,80,0.55)');
    fg.addColorStop(1, 'rgba(255,120,30,0)');
    c.fillStyle = fg;
    c.beginPath(); c.arc(cx, lay.deckY - 14, 42, 0, TWO_PI); c.fill();
    // spark arc
    c.strokeStyle = '#b9e6ff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, lay.deckY - 22);
    c.lineTo(cx + (Math.random() * 6 - 3), lay.deckY - 12);
    c.lineTo(cx + (Math.random() * 6 - 3), lay.deckY - 4); c.stroke();
    c.restore();
  }

  // =================================================
  // FLYWHEEL (edge-on, left end) + DYNO ABSORBER
  // =================================================
  const fwX = lay.X0 - 12;
  c.fillStyle = '#5d6878';
  rr(c, fwX - 16, cyC - 64, 30, 128, 6); c.fill();
  c.strokeStyle = '#12161e'; c.stroke();
  // ring-gear teeth shimmer with rotation
  c.fillStyle = '#39424f';
  const toothOff = (th * 6) % 12;
  for (let y = -58 - toothOff; y < 60; y += 12) {
    c.fillRect(fwX - 21, cyC + y, 6, 7);
    c.fillRect(fwX + 12, cyC + y + 6, 6, 7);
  }
  bolt(c, fwX - 1, cyC, 9, '#8b96a8');
  // dyno absorber drum
  const dynX = fwX - 98;
  const dynHeat = clamp(controls.load * eng.rpm / cfg.redline * 1.6, 0, 1);
  rr(c, dynX, cyC - 76, 62, 152, 12);
  c.fillStyle = '#26303f'; c.fill(); c.strokeStyle = '#12161e'; c.lineWidth = 2; c.stroke();
  const dg = c.createRadialGradient(dynX + 31, cyC, 4, dynX + 31, cyC, 44);
  dg.addColorStop(0, `rgba(255,${120 - 70 * dynHeat | 0},40,${0.25 + 0.65 * dynHeat})`);
  dg.addColorStop(1, 'rgba(60,30,20,0.1)');
  c.fillStyle = dg;
  c.beginPath(); c.arc(dynX + 31, cyC, 42, 0, TWO_PI); c.fill();
  // shaft
  c.fillStyle = '#5d6878'; c.fillRect(fwX - 36, cyC - 7, 24, 14);
  c.fillStyle = '#8fa4c8'; c.font = '11px sans-serif'; c.textAlign = 'center';
  c.fillText('DYNO', dynX + 31, cyC - 86);

  // crank nose pulley (right end)
  c.fillStyle = '#5d6878';
  rr(c, lay.X1 - 4, cyC - 34, 22, 68, 5); c.fill(); c.strokeStyle = '#12161e'; c.stroke();
  c.fillStyle = '#39424f';
  for (let y = -28; y <= 28; y += 8) c.fillRect(lay.X1 + 16, cyC + y, 4, 4);

  // =================================================
  // EXHAUST HEADERS + particles
  // =================================================
  const colX = lay.X1 + 34;
  c.strokeStyle = '#6e5b4a'; c.lineWidth = 12; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const cx = lay.cylX[i];
    c.beginPath();
    c.moveTo(cx + 13, lay.deckY - 8);
    c.quadraticCurveTo(cx + 52, 200, colX, 246 + i * 10);
    c.stroke();
  }
  c.strokeStyle = '#8a6f57'; c.lineWidth = 3;
  for (let i = 0; i < n; i++) {
    const cx = lay.cylX[i];
    c.beginPath(); c.moveTo(cx + 13, lay.deckY - 12); c.quadraticCurveTo(cx + 52, 196, colX, 242 + i * 10); c.stroke();
  }
  // collector + tailpipe
  c.strokeStyle = '#7a6a58'; c.lineWidth = 18;
  c.beginPath(); c.moveTo(colX, 240);
  c.quadraticCurveTo(colX + 8, 330, colX + 8, 430);
  c.quadraticCurveTo(colX + 8, 470, colX + 60, 470);
  c.lineTo(CW + 20, 470);
  c.stroke();
  c.strokeStyle = '#4c4036'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(colX - 8, 240); c.quadraticCurveTo(colX, 330, colX, 430); c.stroke();
  // muffler tip
  c.fillStyle = '#9db3c9'; c.fillRect(CW - 34, 458, 34, 24);
  c.fillStyle = '#0c0f16'; c.fillRect(CW - 8, 462, 8, 16);

  // =================================================
  // PARTICLES (intake charge + exhaust smoke)
  // =================================================
  updateParticles(c, lay, eng, st, controls, now, dt, tbX, colX);

  // =================================================
  // LABELS: stroke chips + specs
  // =================================================
  if (controls.showLabels) {
    const chips = [
      ['INT', '#3f7fd6'], ['CMP', '#7d8aa3'], ['PWR', '#e0661f'], ['EXH', '#8a7a5f'],
    ];
    for (let i = 0; i < n; i++) {
      const cx = lay.cylX[i];
      const tc = mod4pi(th - eng.pinPhase[i]);
      const strokeIdx = Math.floor(tc / Math.PI) % 4;
      const [txt, col] = chips[strokeIdx];
      rr(c, cx - 26, 566, 52, 20, 6);
      c.fillStyle = 'rgba(10,13,20,0.7)'; c.fill();
      c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = col; c.font = 'bold 11px sans-serif'; c.textAlign = 'center';
      c.fillText(`${i + 1}·${txt}`, cx, 580);
    }
  }
  // spec strip
  c.fillStyle = '#5c6b85'; c.font = '11px monospace'; c.textAlign = 'left';
  c.fillText(
    `BORE ${cfg.bore}mm  ·  STROKE ${cfg.stroke}mm  ·  ${cfg.disp}  ·  FIRING ${cfg.firingOrder.join('-')}  ·  ${(720 / n) | 0}° SPACING`,
    16, CH - 10
  );

  // seized overlay
  if (eng.seized) {
    c.fillStyle = 'rgba(120,20,10,0.25)'; c.fillRect(0, 0, CW, CH);
    c.fillStyle = '#ff5040'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center';
    c.fillText('⚠ ENGINE SEIZED', CW / 2, 120);
    // smoke plume
    if (st.smokes.length < 60 && Math.random() < 0.5) {
      st.smokes.push({ x: lay.cylX[(Math.random() * n) | 0], y: 300, vy: -0.6 - Math.random(), r: 8, a: 0.5 });
    }
  }
  // persistent smoke (seizure)
  for (let i = st.smokes.length - 1; i >= 0; i--) {
    const s = st.smokes[i];
    s.y += s.vy; s.r += 0.35; s.a -= 0.004;
    if (s.a <= 0) { st.smokes.splice(i, 1); continue; }
    c.fillStyle = `rgba(140,140,150,${s.a})`;
    c.beginPath(); c.arc(s.x, s.y, s.r, 0, TWO_PI); c.fill();
  }

  c.restore(); // end shake
}

// ---------- sub-renderers ----------

function drawValve(c, x0, y0, x1, y1, lift, tint) {
  // translate along axis by lift
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const sx = x0 + ux * lift, sy = y0 + uy * lift;
  const hx = x1 + ux * lift, hy = y1 + uy * lift;
  // spring (zigzag)
  c.strokeStyle = '#8d99ad'; c.lineWidth = 2;
  c.beginPath();
  const coils = 5, kw = 6;
  for (let k2 = 0; k2 <= coils * 2; k2++) {
    const t = k2 / (coils * 2);
    const px = sx + (hx - sx) * t * 0.55 + (-uy) * (k2 % 2 ? kw : -kw);
    const py = sy + (hy - sy) * t * 0.55 + (ux) * (k2 % 2 ? kw : -kw);
    k2 === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
  }
  c.stroke();
  // stem
  c.strokeStyle = '#d5dbe6'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); c.stroke();
  // valve head
  const ang = Math.atan2(uy, ux);
  c.save(); c.translate(hx, hy); c.rotate(ang);
  c.fillStyle = tint;
  c.beginPath(); c.ellipse(4, 0, 8, 5, 0, 0, TWO_PI); c.fill();
  c.restore();
  // retainer
  bolt(c, sx, sy, 4, '#6b7688');
}

function drawCam(c, x, y, ang, col) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = col;
  c.beginPath(); c.arc(0, 0, 12, 0, TWO_PI); c.fill();
  // lobe
  c.beginPath(); c.ellipse(0, -13, 5.5, 7, 0, 0, TWO_PI); c.fill();
  c.fillStyle = '#a87f2c';
  c.beginPath(); c.arc(0, 0, 4, 0, TWO_PI); c.fill();
  c.restore();
}

function drawGas(c, lay, i, tc, cx, crownY, eng, now) {
  // chamber + cylinder gas coloring by stroke
  let col = null;
  const strokeIdx = Math.floor(tc / Math.PI) % 4;
  const within = (tc % Math.PI) / Math.PI;
  const run = eng.running || eng.cranking;
  if (run) {
    if (strokeIdx === 0) col = `rgba(90,150,255,${0.10 + 0.20 * within})`;
    else if (strokeIdx === 1) col = `rgba(100,120,190,${0.30 + 0.22 * within})`;
    else if (strokeIdx === 2) {
      const heat = Math.max(0, 1 - within * 1.4);
      col = `rgba(255,${120 + 80 * heat | 0},40,${0.16 + 0.62 * heat})`;
    } else col = `rgba(150,130,110,${0.20 * (1 - within)})`;
  }
  if (!col) return;
  c.fillStyle = col;
  // cylinder space above piston
  const h = Math.max(0, lay.deckY - crownY);
  c.fillRect(cx - lay.borePx / 2, crownY, lay.borePx, h + 4);
  // chamber dome
  c.beginPath();
  c.arc(cx, lay.deckY, lay.borePx / 2 + 4, Math.PI, 0);
  c.closePath(); c.fill();
}

// ---------- particles ----------
function updateParticles(c, lay, eng, st, controls, now, dt, tbX, colX) {
  const th = eng.theta;
  const running = eng.running || eng.cranking;
  const parts = st.particles;

  if (running) {
    for (let i = 0; i < lay.nCyl; i++) {
      const cx = lay.cylX[i];
      const tc = mod4pi(th - eng.pinPhase[i]);
      // intake charge in
      const inLift = liftProfile(tc, -30, 245, 9);
      if (inLift > 2 && tc < Math.PI && parts.length < MAXP && Math.random() < 0.5 * (0.3 + controls.throttle)) {
        parts.push({ type: 'air', x: tbX + 20, y: lay.plenumY, s: 0, life: 1, cyl: i });
      }
      // exhaust puff out
      const exLift = liftProfile(tc, 490, 250, 9);
      if (exLift > 2 && tc > 3 * Math.PI && parts.length < MAXP && Math.random() < 0.6) {
        parts.push({ type: 'exh', x: cx + 13, y: lay.deckY - 8, s: 0, life: 1, cyl: i, r: 3.5 + Math.random() * 3 });
      }
    }
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.s += dt * (0.9 + eng.rpm / 1500);
    const cx = lay.cylX[p.cyl];
    if (p.type === 'air') {
      // path: throttle -> plenum -> runner -> valve
      let x, y;
      if (p.s < 0.55) { const t = p.s / 0.55; x = tbX + 20 + (cx - 22 - (tbX + 20)) * t; y = lay.plenumY + Math.sin(p.s * 30) * 2; }
      else if (p.s < 0.8) { const t = (p.s - 0.55) / 0.25; x = cx - 22 - 2 * t; y = lay.plenumY + (150 - lay.plenumY) * t; }
      else { const t = (p.s - 0.8) / 0.2; x = cx - 22 + 9 * t; y = 150 + 56 * t; }
      const alpha = 0.75 * (1 - p.s * 0.6);
      c.fillStyle = `rgba(120,190,255,${alpha})`;
      c.beginPath(); c.arc(x, y, 2.4, 0, TWO_PI); c.fill();
      if (p.s >= 1) parts.splice(i, 1);
    } else {
      // path: port -> header bend -> collector -> tailpipe -> out
      p.r += dt * 4; p.life -= dt * 0.55;
      let x, y;
      if (p.s < 0.4) { const t = p.s / 0.4; x = cx + 13 + (colX - cx - 13) * t; y = (lay.deckY - 8) + (258 - (lay.deckY - 8)) * t * t; }
      else if (p.s < 0.7) { const t = (p.s - 0.4) / 0.3; x = colX + 6 * t; y = 258 + 204 * t; }
      else { const t = (p.s - 0.7) / 0.3; x = colX + 6 + (CW + 24 - colX - 6) * t; y = 462 + 8 * t; }
      const heat = p.life > 0.75 ? (p.life - 0.75) * 4 : 0;
      const rr2 = clamp(p.life, 0, 1);
      c.fillStyle = heat > 0.15
        ? `rgba(255,${150 + 60 * heat | 0},60,${0.5 * rr2})`
        : `rgba(160,158,168,${0.34 * rr2})`;
      c.beginPath(); c.arc(x, y, p.r, 0, TWO_PI); c.fill();
      if (p.life <= 0 || p.s >= 1) parts.splice(i, 1);
    }
  }
}

// ============================================================
// TACHOMETER
// ============================================================
export function drawTach(c, W, H, eng, rpmSm) {
  c.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.62, R = Math.min(W, H * 1.25) / 2 - 14;
  const a0 = Math.PI * 0.75;  // min at bottom-left, sweep 270° clockwise
  const maxR = 8000;
  const angOf = r => a0 + (r / maxR) * Math.PI * 1.5;

  // dial
  const dg = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
  dg.addColorStop(0, '#161c2a'); dg.addColorStop(1, '#0c1018');
  c.fillStyle = dg;
  c.beginPath(); c.arc(cx, cy, R, 0, TWO_PI); c.fill();
  c.strokeStyle = '#2a3346'; c.lineWidth = 2; c.stroke();

  // redline arc
  c.strokeStyle = 'rgba(255,60,50,0.8)'; c.lineWidth = 7;
  c.beginPath(); c.arc(cx, cy, R - 8, angOf(eng.cfg.redline), angOf(maxR)); c.stroke();

  // ticks
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let r = 0; r <= maxR; r += 500) {
    const a = angOf(r);
    const major = r % 1000 === 0;
    const r1 = R - (major ? 20 : 14), r2 = R - 8;
    c.strokeStyle = r >= eng.cfg.redline ? '#ff5040' : '#7d8aa3';
    c.lineWidth = major ? 2.5 : 1;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    c.stroke();
    if (major) {
      c.fillStyle = '#9fb0c9'; c.font = '11px sans-serif';
      c.fillText(String(r / 1000), cx + Math.cos(a) * (R - 32), cy + Math.sin(a) * (R - 32));
    }
  }

  // shift light
  const near = rpmSm > eng.cfg.redline - 400;
  if (near && eng.running) {
    const blink = Math.sin(performance.now() / 40) > 0;
    if (blink) {
      c.fillStyle = 'rgba(255,60,40,0.9)';
      c.beginPath(); c.arc(cx, cy - R * 0.45, 9, 0, TWO_PI); c.fill();
    }
  }

  // needle (with slight dither from shake)
  const na = angOf(clamp(rpmSm, 0, maxR));
  c.save();
  c.shadowColor = 'rgba(255,110,40,0.8)'; c.shadowBlur = 12;
  c.strokeStyle = '#ff7b24'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - Math.cos(na) * 12, cy - Math.sin(na) * 12);
  c.lineTo(cx + Math.cos(na) * (R - 26), cy + Math.sin(na) * (R - 26));
  c.stroke();
  c.restore();
  bolt(c, cx, cy, 7, '#39424f'); bolt(c, cx, cy, 3, '#0c1018');

  // digital readout
  c.fillStyle = '#e6edf6'; c.font = 'bold 22px monospace';
  c.fillText(String(Math.round(rpmSm)), cx, cy + R * 0.42);
  c.fillStyle = '#5c6b85'; c.font = '10px sans-serif';
  c.fillText('RPM', cx, cy + R * 0.42 + 16);
}

// ============================================================
// DYNO CHART
// ============================================================
export function drawDyno(c, W, H, eng, trail) {
  c.clearRect(0, 0, W, H);
  const padL = 36, padR = 10, padT = 26, padB = 24;
  const pw = W - padL - padR, ph = H - padT - padB;
  const curve = eng.dynoCurve();
  const tqMax = eng.cfg.peakTQ * 1.15;
  let kwMax = 1;
  curve.forEach(p => { kwMax = Math.max(kwMax, p.kw); });
  kwMax *= 1.15;
  const xOf = r => padL + (r / (eng.cfg.redline + 500)) * pw;
  const yTq = t => padT + ph - (t / tqMax) * ph;
  const yKw = k => padT + ph - (k / kwMax) * ph;

  // frame + grid
  c.strokeStyle = '#232c3e'; c.lineWidth = 1;
  c.strokeRect(padL, padT, pw, ph);
  c.fillStyle = '#5c6b85'; c.font = '9px sans-serif'; c.textAlign = 'center';
  for (let r = 1000; r <= eng.cfg.redline; r += 1000) {
    c.beginPath(); c.moveTo(xOf(r), padT); c.lineTo(xOf(r), padT + ph); c.stroke();
    c.fillText(String(r / 1000) + 'k', xOf(r), H - 10);
  }
  // redline marker
  c.strokeStyle = 'rgba(255,60,50,0.5)';
  c.beginPath(); c.moveTo(xOf(eng.cfg.redline), padT); c.lineTo(xOf(eng.cfg.redline), padT + ph); c.stroke();

  // model curves
  c.lineWidth = 2;
  c.strokeStyle = '#ff8a2a'; c.beginPath();
  curve.forEach((p, i2) => { const x = xOf(p.rpm), y = yTq(p.tq); i2 ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();
  c.strokeStyle = '#39c0ff'; c.beginPath();
  curve.forEach((p, i2) => { const x = xOf(p.rpm), y = yKw(p.kw); i2 ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();

  // live trail
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const a = (i / trail.length) * 0.5;
    c.fillStyle = `rgba(255,140,60,${a})`;
    c.fillRect(xOf(p.rpm) - 1.5, yTq(p.tq) - 1.5, 3, 3);
  }
  // current point
  if (eng.running) {
    const tq = Math.max(0, eng.torqueWheel), kw = Math.max(0, eng.power / 1000);
    c.fillStyle = '#ffb066';
    c.beginPath(); c.arc(xOf(eng.rpm), yTq(tq), 4, 0, TWO_PI); c.fill();
    c.fillStyle = '#7fd6ff';
    c.beginPath(); c.arc(xOf(eng.rpm), yKw(kw), 4, 0, TWO_PI); c.fill();
  }

  // legend
  c.textAlign = 'left'; c.font = '10px sans-serif';
  c.fillStyle = '#ff8a2a'; c.fillText('— TORQUE N·m', padL + 6, padT - 12);
  c.fillStyle = '#39c0ff'; c.fillText(`— POWER kW (pk ${kwMaxOf(curve)}  kW)`, padL + 108, padT - 12);
}

function kwMaxOf(curve) {
  let m = 0; curve.forEach(p => { m = Math.max(m, p.kw); });
  return m.toFixed(0);
}
