// ============================================================
// builder.js — Engine Builder: generate a full engine cfg from
// cylinder count, bore, stroke, tune and aspiration.
// Pure logic (node-testable, no DOM). Formulas calibrated so an
// 86/86 I4 reproduces the stock 2.0L preset closely.
// ============================================================

const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

// classic even-fire firing orders (order permutation is flavor;
// the model keeps perfect 720/n spacing either way)
export const FIRING_ORDERS = {
  3:  [1, 2, 3],
  4:  [1, 3, 4, 2],
  5:  [1, 2, 4, 5, 3],
  6:  [1, 5, 3, 6, 2, 4],
  8:  [1, 5, 4, 8, 6, 3, 7, 2],
  10: [1, 6, 5, 10, 2, 7, 3, 8, 4, 9],
  12: [1, 7, 5, 11, 3, 9, 6, 12, 2, 8, 4, 10],
};

export const CYL_OPTIONS = Object.keys(FIRING_ORDERS).map(Number);  // [3,4,5,6,8,10,12]

export const TUNES = {
  street: { tqPerL: 95,  label: 'Street' },
  sport:  { tqPerL: 107, label: 'Sport'  },   // matches stock presets
  race:   { tqPerL: 118, label: 'Race'   },
};

export function dispLiters(cyls, bore, stroke) {
  // cm units: bore/10, stroke/10
  return (Math.PI / 4) * (bore / 10) ** 2 * (stroke / 10) * cyls / 1000;
}

// spec: { cyls, bore, stroke, tune: 'street'|'sport'|'race', turbo: bool }
export function buildCustom(spec) {
  const cyls = clamp(Math.round(spec.cyls) || 4, 1, 16);
  const bore = clamp(spec.bore ?? 86, 55, 120);
  const stroke = clamp(spec.stroke ?? 86, 55, 130);
  const tune = TUNES[spec.tune] || TUNES.sport;
  const turbo = !!spec.turbo;

  const dispL = dispLiters(cyls, bore, stroke);
  const sqRatio = bore / Math.max(1, stroke);              // >1 oversquare (revvier)

  // torque of an NA engine; turbo derates baseline (boost stacks on top)
  let peakTQ = tune.tqPerL * dispL * (turbo ? 0.92 : 1);
  peakTQ = clamp(peakTQ, 40, 1600);

  // peak-torque rpm: oversquare peaks higher, huge engines peak lower
  let tqPeakRpm = 4400 * Math.pow(sqRatio, 0.45) - Math.max(0, cyls - 6) * 60;
  tqPeakRpm = clamp(tqPeakRpm, 2600, 5600);

  // redline: oversquare + few cylinders rev higher
  let redline = 7600 + (bore - stroke) * 30 - Math.max(0, cyls - 6) * 260;
  if (cyls <= 4) redline += 200;
  redline = clamp(redline, 5400, 8600);

  const idleRpm = Math.round(clamp(1005 - cyls * 21, 700, 970) / 10) * 10;

  const inertia = clamp(0.05 + 0.012 * cyls + stroke * 0.00024, 0.05, 0.35);

  const maxBoost = turbo ? clamp(1.15 + Math.max(0, 3.0 - dispL) * 0.12, 0.8, 1.6) : 0;
  const turboLag = turbo ? clamp(1.7 * Math.sqrt(1.6 / Math.max(0.6, dispL)), 0.9, 2.4) : 0;

  const name = `${dispL.toFixed(1)}L ${cyls}·CYL ${turbo ? 'TURBO ' : ''}(${bore}×${stroke})`;
  const short = `${cyls}C ${dispL.toFixed(1)}${turbo ? 'T' : ''}`;

  return {
    id: 'custom',
    name, short,
    cylinders: cyls,
    firingOrder: FIRING_ORDERS[cyls] || Array.from({ length: cyls }, (_, i) => i + 1),
    bore, stroke,
    disp: dispL.toFixed(2) + 'L',
    peakTQ: Math.round(peakTQ),
    tqPeakRpm: Math.round(tqPeakRpm / 100) * 100,
    redline: Math.round(redline / 100) * 100,
    idleRpm, idleP: 0.120,
    inertia: +inertia.toFixed(3),
    fricBase: Math.round(6 + 1.9 * cyls),
    fricLin: 0.0031,
    fricQuad: Math.round(12 + 2 * cyls),
    starterTQ: Math.round(8 + 2.2 * cyls),
    throaty: clamp(0.2 + cyls * 0.09, 0, 1),
    maxBoost: +maxBoost.toFixed(2),
    turboLag: +turboLag.toFixed(2),
    mass: Math.round(750 + 95 * cyls + 80 * dispL),
    cdA: +(0.5 + 0.022 * cyls).toFixed(2),
  };
}
