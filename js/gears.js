// ============================================================
// gears.js — gearbox builder: ratio sets, gear count, final drive.
// Pure logic (node-testable, no DOM).
// Ratios follow a geometric progression first -> top; the spread
// style scales both ends (economy = tall top, close = close ratio).
// ============================================================

const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

export const GEAR_COUNTS = [4, 5, 6];

export const SPREADS = {
  economy: { label: 'Economy', first: 3.30, top: 0.72, blurb: 'tall overdrive top, lazy cruising' },
  street:  { label: 'Street',  first: 3.55, top: 0.88, blurb: 'the stock box' },
  sport:   { label: 'Sport',   first: 3.90, top: 0.92, blurb: 'shorter legs, pulls harder' },
  close:   { label: 'Close',   first: 3.20, top: 0.97, blurb: 'racing dogbox feel — tiny rpm drops' },
};

// spec: { count: 4|5|6, spread: 'economy'|'street'|'sport'|'close', finalR: 3.2..4.9 }
export function gearboxRatios(spec) {
  const count = GEAR_COUNTS.includes(spec.count) ? spec.count : 5;
  const spread = SPREADS[spec.spread] || SPREADS.street;
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    out.push(+(spread.first * Math.pow(spread.top / spread.first, t)).toFixed(2));
  }
  return out;
}

export function gearboxFinalR(spec) {
  return clamp(spec.finalR ?? 3.9, 3.0, 5.2);
}

export function gearboxLabel(spec) {
  const spread = SPREADS[spec.spread] || SPREADS.street;
  return `${spec.count}-speed ${spread.label.toLowerCase()} · ${gearboxFinalR(spec).toFixed(2)} final`;
}

export const DEFAULT_GEARBOX = { count: 5, spread: 'street', finalR: 3.9 };
