// ============================================================
// ui.js — DOM control bindings (sliders, buttons, keyboard)
// ============================================================

export function initUI(app) {
  const $ = id => document.getElementById(id);
  const syncFill = el => el.style.setProperty('--fill', el.value + '%');

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
    if (on) app.engine.stalled = false;
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
  btnStarter.addEventListener('pointerdown', crankOn);
  btnStarter.addEventListener('pointerup', crankOff);
  btnStarter.addEventListener('pointerleave', crankOff);

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
  btnNos.addEventListener('pointerdown', nosOn);
  btnNos.addEventListener('pointerup', nosOff);
  btnNos.addEventListener('pointerleave', nosOff);
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
    if (e.repeat) return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        setIgn(!app.engine.ignition);
        break;
      case 'Enter': crankOn(); break;
      case 'ArrowUp': case 'KeyW':
        app.controls.throttle = Math.min(1, app.controls.throttle + 0.05);
        app.setThrottleUI(app.controls.throttle); break;
      case 'ArrowDown': case 'KeyS':
        app.controls.throttle = Math.max(0, app.controls.throttle - 0.05);
        app.setThrottleUI(app.controls.throttle); break;
      case 'KeyE': if (app.mode === 'drive') app.vehicle.shift(+1); break;
      case 'KeyQ': if (app.mode === 'drive') app.vehicle.shift(-1); break;
      case 'KeyN': nosOn(); break;
      case 'KeyF': doRefuel(); break;
      case 'KeyD': app.setMode(app.mode === 'dyno' ? 'drive' : 'dyno'); break;
      case 'Digit1': app.setPreset('i3'); break;
      case 'Digit2': app.setPreset('i4'); break;
      case 'Digit3': app.setPreset('i6'); break;
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
  window.addEventListener('pointerdown', () => app.audio.init(), { once: true });
}
