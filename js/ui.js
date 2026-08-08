// ============================================================
// ui.js — DOM control bindings (sliders, buttons, keyboard)
// ============================================================

import { PRESETS } from './engine.js';
import { modsFor } from './mods.js';
import { buildCustom, CYL_OPTIONS, TUNES } from './builder.js';
import { GEAR_COUNTS, SPREADS, gearboxRatios, gearboxFinalR } from './gears.js';

export function initUI(app) {
  const $ = id => document.getElementById(id);
  const syncFill = el => el.style.setProperty('--fill', el.value + '%');

  // ---------- hold-friendly buttons: no iOS callout/copy menu, no stuck-on holds ----------
  window.addEventListener('contextmenu', e => e.preventDefault());
  // capture the pointer on hold-buttons so sliding the finger off still releases cleanly
  const holdify = (btn, on, off) => {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* mouse */ }
      on();
    });
    const end = () => off();
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('lostpointercapture', end);
  };

  // ---------- engine preset buttons ----------
  document.querySelectorAll('#presetBtns button').forEach(btn => {
    btn.addEventListener('click', () => {
      app.audio.init();
      app.setPreset(btn.dataset.preset);
    });
  });

  // ---------- mode switch ----------
  $('modeDyno').addEventListener('click', () => { app.audio.init(); app.setMode('dyno'); });
  $('modeDrive').addEventListener('click', () => { app.audio.init(); app.setMode('drive'); });

  // ---------- ignition toggle ----------
  const btnIgn = $('btnIgn');
  const setIgn = on => {
    app.audio.init();
    app.engine.ignition = on;
    if (on) {
      app.engine.stalled = false;
      // never show the instructions again once you've used the sim —
      // hide immediately, don't wait for the next animation frame
      app.hintDismissed = true;
      try { localStorage.setItem('firebrox.hintSeen', '1'); } catch (_) { /* private mode */ }
      $('overlayHint').style.display = 'none';
    }
    btnIgn.classList.toggle('on', on);
    btnIgn.textContent = on ? 'IGNITION ON' : 'IGNITION OFF';
  };
  btnIgn.addEventListener('click', () => setIgn(!app.engine.ignition));
  app.setIgn = setIgn;

  // ---------- starter (hold to crank) ----------
  const btnStarter = $('btnStarter');
  const crankOn = () => {
    app.audio.init();
    if (app.engine.ignition && !app.engine.seized) {
      app.engine.stalled = false;
      app.engine.cranking = true;
    }
  };
  const crankOff = () => { app.engine.cranking = false; };
  holdify(btnStarter, crankOn, crankOff);

  // ---------- sliders ----------
  const rngT = $('rngThrottle'), valT = $('valThrottle');
  const rngL = $('rngLoad'), valL = $('valLoad');
  rngT.addEventListener('input', () => {
    app.controls.throttle = rngT.value / 100;
    valT.textContent = rngT.value + '%';
    syncFill(rngT);
  });
  rngL.addEventListener('input', () => {
    app.controls.load = rngL.value / 100;
    valL.textContent = rngL.value + '%';
    syncFill(rngL);
  });
  syncFill(rngT); syncFill(rngL);
  app.setThrottleUI = v => {
    rngT.value = Math.round(v * 100);
    valT.textContent = Math.round(v * 100) + '%';
    syncFill(rngT);
  };

  // ---------- gearbox buttons ----------
  $('gearUp').addEventListener('click', () => { app.audio.init(); app.vehicle.shift(+1); });
  $('gearDown').addEventListener('click', () => { app.audio.init(); app.vehicle.shift(-1); });

  // ---------- nitrous (hold) ----------
  const btnNos = $('btnNos');
  const nosOn = () => { app.audio.init(); app.controls.nos = true; btnNos.classList.add('on'); };
  const nosOff = () => { app.controls.nos = false; btnNos.classList.remove('on'); };
  holdify(btnNos, nosOn, nosOff);
  app.nosOff = nosOff;

  // ---------- refuel ----------
  const doRefuel = () => {
    const en = app.engine;
    if (en.fuel > en.tankSize * 0.95) { app.setFlash('TANK ALREADY FULL'); return; }
    en.fuel = en.tankSize;
    en.fuelCut = 0;
    app.setFlash('⛽ REFUELED 8.0 L');
  };
  $('btnRefuel').addEventListener('click', doRefuel);

  // ---------- checkboxes ----------
  $('chkLimiter').addEventListener('change', e => { app.controls.limiterOn = e.target.checked; });
  $('chkLabels').addEventListener('change', e => { app.controls.showLabels = e.target.checked; });
  $('chkSound').addEventListener('change', e => {
    app.audio.enabled = e.target.checked;
    app.audio.setMaster(e.target.checked ? 1 : 0);
  });

  // ---------- rebuild ----------
  const btnRebuild = $('btnRebuild');
  const doRebuild = () => {
    const en = app.engine;
    en.seized = false; en.rpm = 0; en.theta = 0; en.overRedlineTime = 0;
    en.stalled = false; en.coolant = 60;
    en.ignition = false; app.setIgn(false);
    app.cutaway.smokes.length = 0;
    btnRebuild.hidden = true;
    app.setFlash('🔧 ENGINE REBUILT — fresh internals');
  };
  btnRebuild.addEventListener('click', doRebuild);
  app.doRebuild = doRebuild;

  // ---------- keyboard ----------
  window.addEventListener('keydown', e => {
    // hold-to-ramp throttle keys (key-repeat is exactly what we want here)
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      app.controls.throttle = Math.min(1, app.controls.throttle + 0.05);
      app.setThrottleUI(app.controls.throttle);
      e.preventDefault();
      return;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      app.controls.throttle = Math.max(0, app.controls.throttle - 0.05);
      app.setThrottleUI(app.controls.throttle);
      e.preventDefault();
      return;
    }
    if (e.repeat) return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        setIgn(!app.engine.ignition);
        break;
      case 'Enter': crankOn(); break;
      case 'KeyE': if (app.mode === 'drive') app.vehicle.shift(+1); break;
      case 'KeyQ': if (app.mode === 'drive') app.vehicle.shift(-1); break;
      case 'KeyN': nosOn(); break;
      case 'KeyF': doRefuel(); break;
      case 'KeyD': app.setMode(app.mode === 'dyno' ? 'drive' : 'dyno'); break;
      case 'Digit1': app.setPreset('i3'); break;
      case 'Digit2': app.setPreset('i4'); break;
      case 'Digit3': app.setPreset('i6'); break;
      case 'KeyT':
        if ($('modShop').classList.contains('hidden')) openModShop();
        else $('modShop').classList.add('hidden');
        break;
      case 'KeyH':
        app.hintDismissed = !app.hintDismissed;
        try { localStorage.setItem('firebrox.hintSeen', app.hintDismissed ? '1' : '0'); } catch (_) { /* private mode */ }
        break;
      case 'KeyM': {
        const chk = $('chkSound'); chk.checked = !chk.checked;
        chk.dispatchEvent(new Event('change')); break;
      }
      case 'KeyL': {
        const chk = $('chkLimiter'); chk.checked = !chk.checked;
        chk.dispatchEvent(new Event('change')); break;
      }
      case 'KeyR':
        if (app.engine.seized) doRebuild();
        break;
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Enter') crankOff();
    if (e.code === 'KeyN') nosOff();
  });

  // one-time audio unlock
  // audio unlock: EVERY gesture retries resume() (iOS gesture expiry fix) —
  // init() is idempotent and only resumes when suspended
  window.addEventListener('pointerdown', () => app.audio.init());
  window.addEventListener('touchend', () => app.audio.init());

  // ---------- audio unlock pill (persistent until sound is confirmed live) ----------
  const audioPill = $('audioPill');
  app.refreshAudioPill = () => {
    const c = app.audio.ctx;
    const running = c && c.state === 'running';
    audioPill.classList.toggle('hidden', !!running);
    audioPill.textContent = c && c.state === 'suspended' ? '🔇 TAP TO UNLOCK SOUND' : '🔈 TAP FOR SOUND';
  };
  const unlockAudio = async () => {
    await app.audio.init();
    app.refreshAudioPill();
    const c = app.audio.ctx;
    if (c && c.state === 'running') app.setFlash('🔊 SOUND UNLOCKED', 2.2);
  };
  audioPill.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); });
  audioPill.addEventListener('click', unlockAudio);
  app.refreshAudioPill();

  // ---------- MOD SHOP ----------
  const modShop = $('modShop'), modGrid = $('modGrid'), modFor = $('modFor');
  const selected = new Set();

  const openModShop = () => {
    const base = app.baseCfg();
    if (!base) return;
    selected.clear();
    for (const id of app.getModIds()) selected.add(id);
    modFor.textContent = `— ${base.name}`;
    prefillBuilder();
    prefillGearbox();

    modGrid.innerHTML = '';
    for (const m of modsFor(base)) {
      const b = document.createElement('button');
      b.className = 'mod-item' + (selected.has(m.id) ? ' sel' : '');
      b.innerHTML = `<span class="mi">${m.icon}</span><span><span class="mn">${m.name}</span><span class="md">${m.desc}</span></span>`;
      b.addEventListener('click', () => {
        app.audio.init();
        if (selected.has(m.id)) { selected.delete(m.id); b.classList.remove('sel'); }
        else { selected.add(m.id); b.classList.add('sel'); }
      });
      modGrid.appendChild(b);
    }
    modShop.classList.remove('hidden');
  };
  const closeModShop = () => modShop.classList.add('hidden');

  $('btnMods').addEventListener('click', () => { app.audio.init(); openModShop(); });
  $('btnCloseMods').addEventListener('click', closeModShop);
  $('btnApplyMods').addEventListener('click', () => {
    app.applyMods([...selected]);
    closeModShop();
  });
  modShop.addEventListener('click', e => { if (e.target === modShop) closeModShop(); });

  // ---------- ENGINE BUILDER ----------
  const builderSpec = { cyls: 6, bore: 86, stroke: 86, tune: 'sport', turbo: false };
  const cylSeg = $('cylSeg'), tuneSeg = $('tuneSeg');
  const rngBore = $('rngBore'), rngStroke = $('rngStroke');
  const valBore = $('valBore'), valStroke = $('valStroke');
  const chkTurboB = $('chkTurbo'), buildSpecEl = $('buildSpec');

  CYL_OPTIONS.forEach(n => {
    const b = document.createElement('button');
    b.textContent = n; b.dataset.v = n;
    b.addEventListener('click', () => { app.audio.init(); builderSpec.cyls = n; syncBuilder(); });
    cylSeg.appendChild(b);
  });
  for (const k of Object.keys(TUNES)) {
    const b = document.createElement('button');
    b.textContent = TUNES[k].label; b.dataset.v = k;
    b.addEventListener('click', () => { app.audio.init(); builderSpec.tune = k; syncBuilder(); });
    tuneSeg.appendChild(b);
  }

  function syncBuilder() {
    builderSpec.bore = +rngBore.value;
    builderSpec.stroke = +rngStroke.value;
    builderSpec.turbo = chkTurboB.checked;
    valBore.textContent = builderSpec.bore;
    valStroke.textContent = builderSpec.stroke;
    cylSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', +b.dataset.v === builderSpec.cyls));
    tuneSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === builderSpec.tune));
    const cfg = buildCustom(builderSpec);
    const estKw = Math.round(cfg.peakTQ * cfg.redline * 0.64 / 9549);
    buildSpecEl.innerHTML =
      `<b>${cfg.cylinders} CYLINDER${cfg.cylinders > 1 ? 'S' : ''} · ${cfg.disp}</b> — ${cfg.name}<br>` +
      `${cfg.peakTQ} N·m @ ${cfg.tqPeakRpm} rpm · ≈${estKw} kW · redline ${cfg.redline} · idle ${cfg.idleRpm}` +
      (cfg.maxBoost ? ` · TURBO ${cfg.maxBoost.toFixed(1)} bar, lag ${cfg.turboLag.toFixed(1)}s` : ' · naturally aspirated');
  }
  rngBore.addEventListener('input', syncBuilder);
  rngStroke.addEventListener('input', syncBuilder);
  chkTurboB.addEventListener('change', () => { app.audio.init(); syncBuilder(); });

  $('btnBuild').addEventListener('click', () => {
    app.audio.init();
    const spec = { ...builderSpec };
    app.applyCustom(spec);
    closeModShop();
    app.setFlash(`🔥 CUSTOM ENGINE BUILT & FIRED UP — ${buildCustom(spec).name}`, 4.5);
  });

  // prefill builder from the saved custom engine, if any
  const prefillBuilder = () => {
    const cs = app.getCustomSpec();
    if (cs) {
      Object.assign(builderSpec, cs);
      rngBore.value = cs.bore;
      rngStroke.value = cs.stroke;
      chkTurboB.checked = !!cs.turbo;
    }
    syncBuilder();
  };
  prefillBuilder();

  // ---------- GEARBOX ----------
  const gearSpec = { count: 5, spread: 'street', finalR: 390 };
  const gearCountSeg = $('gearCountSeg'), gearSpreadSeg = $('gearSpreadSeg');
  const rngFinalR = $('rngFinalR'), valFinalR = $('valFinalR'), gearInfo = $('gearInfo');

  GEAR_COUNTS.forEach(n => {
    const b = document.createElement('button');
    b.textContent = n; b.dataset.v = n;
    b.addEventListener('click', () => { app.audio.init(); gearSpec.count = n; syncGearbox(); });
    gearCountSeg.appendChild(b);
  });
  for (const k of Object.keys(SPREADS)) {
    const b = document.createElement('button');
    b.textContent = SPREADS[k].label; b.dataset.v = k;
    b.title = SPREADS[k].blurb;
    b.addEventListener('click', () => { app.audio.init(); gearSpec.spread = k; syncGearbox(); });
    gearSpreadSeg.appendChild(b);
  }

  function syncGearbox() {
    gearSpec.finalR = +rngFinalR.value;
    valFinalR.textContent = (gearSpec.finalR / 100).toFixed(2);
    gearCountSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', +b.dataset.v === gearSpec.count));
    gearSpreadSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === gearSpec.spread));
    const ratios = gearboxRatios(gearSpec);
    const finR = gearboxFinalR(gearSpec);
    // top speed at redline in top gear (uses current engine redline)
    const rl = app.engine.cfg.redline || 7000;
    const topKmh = rl * 0.305 * 3.6 / (9.549 * ratios[ratios.length - 1] * finR);
    const firstKmh = rl * 0.305 * 3.6 / (9.549 * ratios[0] * finR);
    gearInfo.innerHTML =
      `<b>${gearSpec.count}-speed ${SPREADS[gearSpec.spread].label.toLowerCase()}</b> — ${ratios.join(' / ')} : ${finR.toFixed(2)} final<br>` +
      `1st tops out ≈${firstKmh.toFixed(0)} km/h · top gear does ≈${topKmh.toFixed(0)} km/h at redline`;
  }
  rngFinalR.addEventListener('input', syncGearbox);

  $('btnApplyGears').addEventListener('click', () => {
    app.audio.init();
    app.applyGears({ ...gearSpec, finalR: gearSpec.finalR / 100 });
    closeModShop();
  });
  $('btnStockGears').addEventListener('click', () => {
    app.audio.init();
    app.applyGears(null);
    closeModShop();
  });

  const prefillGearbox = () => {
    const gs = app.getGearsSpec();
    gearSpec.count = gs.count;
    gearSpec.spread = gs.spread;
    gearSpec.finalR = Math.round(gs.finalR * 100);
    rngFinalR.value = gearSpec.finalR;
    syncGearbox();
  };
  prefillGearbox();

  // instructions card: tap anywhere on it to dismiss (H brings it back)
  $('overlayHint').addEventListener('pointerdown', () => {
    app.hintDismissed = true;
    try { localStorage.setItem('firebrox.hintSeen', '1'); } catch (_) { /* private mode */ }
  });
}
