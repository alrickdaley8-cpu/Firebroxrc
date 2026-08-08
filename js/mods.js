// ============================================================
// mods.js — Mod Shop: stackable upgrades applied to engine cfg.
// Pure logic (node-testable, no DOM). buildPreset(base, ids)
// returns a MODIFIED clone of the preset — originals untouched.
// ============================================================

// turbo: 'any' = all engines, 'na' = naturally-aspirated only,
//        'turbo' = engines that already have boost
export const MODS = [
  {
    id: 'intake', name: 'Cold-Air Intake', icon: '🌬️', turbo: 'any',
    desc: '+7% torque',
    apply(c) { c.peakTQ *= 1.07; },
  },
  {
    id: 'exhaust', name: 'Free-Flow Exhaust', icon: '💨', turbo: 'any',
    desc: '+5% torque, +200 rpm redline',
    apply(c) { c.peakTQ *= 1.05; c.redline += 200; },
  },
  {
    id: 'ecu', name: 'Stage-1 ECU Tune', icon: '🧠', turbo: 'any',
    desc: '+4% torque, +600 rpm redline',
    apply(c) { c.peakTQ *= 1.04; c.redline += 600; },
  },
  {
    id: 'bigbore', name: 'Big-Bore Kit', icon: '📏', turbo: 'any',
    desc: '+15% torque everywhere',
    apply(c) { c.peakTQ *= 1.15; },
  },
  {
    id: 'turbo', name: 'Turbo Kit', icon: '🌀', turbo: 'na',
    desc: 'forced induction 0.9 bar — whistle, BOV & surge. Mild detune + lower redline',
    apply(c) {
      c.maxBoost = 0.9;
      c.turboLag = 1.6;
      c.peakTQ *= 0.95;
      c.redline = Math.max(6000, c.redline - 400);
    },
  },
  {
    id: 'bigturbo', name: 'Bigger Turbo', icon: '🌀', turbo: 'turbo',
    desc: '+10% flow, +0.6 bar wastegate, +lag (big-boost BOV)',
    apply(c) {
      c.maxBoost += 0.6;
      c.turboLag += 0.4;
      c.peakTQ *= 1.10;
      c.redline = Math.max(6000, c.redline - 200);
    },
  },
  {
    id: 'nos', name: 'Big-Shot NOS', icon: '🚀', turbo: 'any',
    desc: '+75% power spray (was +45%), 2.4x bottle',
    apply(c) { c.nosBoostFrac = 0.75; c.nosMax = 2.4; },
  },
  {
    id: 'radiator', name: 'Upgraded Radiator', icon: '❄️', turbo: 'any',
    desc: '2x cooling — limp mode arrives much later',
    apply(c) { c.radK = 3.2; },
  },
  {
    id: 'flywheel', name: 'Lightened Flywheel', icon: '⚙️', turbo: 'any',
    desc: '-30% rotating inertia — revs build & fall faster',
    apply(c) { c.inertia *= 0.7; },
  },
  {
    id: 'slicks', name: 'Drag Slicks', icon: '🛞', turbo: 'any',
    desc: 'sticky rubber — far less wheelspin off the line',
    apply(c) { c.mu = 1.05; },
  },
  {
    id: 'gears', name: 'Short Final Drive 4.7', icon: '🔀', turbo: 'any',
    desc: '+18% wheel torque, lower top speed',
    apply(c) { c.finalR = 4.7; },
  },
  {
    id: 'weight', name: 'Stripped Interior', icon: '🪶', turbo: 'any',
    desc: '-300 kg lighter car',
    apply(c) { c.mass -= 300; },
  },
];

export const MOD_BY_ID = Object.fromEntries(MODS.map(m => [m.id, m]));

// Which mods are offered for a given preset cfg
export function modsFor(cfg) {
  return MODS.filter(m =>
    m.turbo === 'any' ||
    (m.turbo === 'na' && !cfg.maxBoost) ||
    (m.turbo === 'turbo' && !!cfg.maxBoost));
}

// Build a modded CLONE of base preset. ids applied in MODS list order.
export function buildPreset(base, ids) {
  const c = JSON.parse(JSON.stringify(base));       // cfg is plain data
  const set = new Set(ids);
  for (const m of MODS) {
    if (set.has(m.id)) {
      if (m.turbo === 'na' && c.maxBoost) continue;
      if (m.turbo === 'turbo' && !c.maxBoost) continue;
      m.apply(c);
    }
  }
  return c;
}
