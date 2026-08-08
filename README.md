# FIREBROX·RC — 4-Stroke Engine & Drivetrain Simulator 🔥

An interactive **internal combustion engine simulation** that runs entirely in your
browser — no build step, no dependencies. Watch a live cutaway of a running engine,
rev it against a dyno brake, then flip into **DRIVE MODE** and launch it down the
road through a 5-speed manual gearbox. Turbo boost, nitrous, an 8-liter fuel tank,
a real cooling system — and consequences for abusing all of them.

## Run it

Serve the folder with any static file server and open it in a browser:

```bash
python3 serve.py
# then visit http://localhost:8000
```

(Any static server works — the app is plain ES modules + Canvas + Web Audio.)

## The engines

| | 1.0L Inline-3 **TURBO** | 2.0L Inline-4 | 3.0L Inline-6 |
|---|---|---|---|
| firing spacing | 240° | 180° (1-3-4-2) | 120° (1-5-3-6-2-4) |
| redline | 6,800 rpm | 7,200 rpm | 7,200 rpm |
| peak (dyno, simulated) | ~165 kW / 233 N·m | ~107 kW / 176 N·m | ~159 kW / 289 N·m |
| boost | 1.5 bar + BOV | — | — |
| character | lumpy idle, whistle | the everyday baseline | silky, throaty |

0–100 km/h / ¼-mile (simulated, good shifts): **6.7 s / 14.7 s @ 169** (I-3),
**10.0 s / 17.1 s** (I-4), **8.8 s / 16.5 s** (I-6).

## Two modes

**DYNO** — free-rev the engine against a water brake. Sweep the throttle, watch the
dyno chart plot *your* run, chase peak numbers, and find out what happens when you
disable the rev limiter (hint: sustained over-rev = seized engine, smoke, rebuild).

**DRIVE** — the engine is coupled to a 5-speed manual car: launch-clutch slip,
locked driveline, engine braking, rolling and aero drag, a **traction limit** with
genuine wheel-spin, performance timers for 0–100 km/h and the ¼-mile, and stalls if
you lug it below idle in a high gear. Shift early and it bogs; shift at the right
time and it flies.

## 🔧 Mod Shop (press T or the button)

Install **any combination of upgrades** — they stack, and persist per engine:

| Mod | Effect |
|---|---|
| 🌬️ Cold-air intake | +7% torque |
| 💨 Free-flow exhaust | +5% torque, +200 redline |
| 🧠 Stage-1 ECU tune | +4% torque, +600 redline |
| 📏 Big-bore kit | +15% torque |
| 🌀 Turbo kit *(NA engines)* | adds 0.9 bar forced induction — whistle, BOV, surge |
| 🌀 Bigger turbo *(turbo engines)* | +10% flow, +0.6 bar, more lag |
| 🚀 Big-shot NOS | +75% spray (was 45%), 2.4× bottle |
| ❄️ Upgraded radiator | 2× cooling — limp arrives much later |
| ⚙️ Lightened flywheel | −30% inertia — revs faster both ways |
| 🛞 Drag slicks | sticky launch, far less wheelspin |
| 🔀 Short final drive 4.7 | +18% wheel torque, lower top speed |
| 🪶 Stripped interior | −300 kg |

All-in I-4 build: ~357 kW, **4.7 s 0–100, 12.4 s ¼-mile @ 217 km/h**.

## Simulation features

- **Crank dynamics** — flywheel inertia, per-cylinder torque ripple at true firing
  angles (visible idle lope, pronounced on the 3-cylinder), sub-stepped integrator.
- **Turbocharger** — rpm- and throttle-dependent spool with lag, boost-gated torque
  scaling, blow-off valve on lift-off, mismatched-compression feel off-boost.
- **Cooling system** — ~1 min warm-up, thermostat radiator, sustained hard abuse →
  **LIMP MODE** (power cut, steam) with hysteresis; back off and it recovers.
- **Fuel system** — 8.0 L tank, load-dependent consumption, sputtering starvation,
  dead stop, refuel & re-crank.
- **Nitrous** — hold-to-spray +45% power (and blue flames), bottle drains in ~11 s.
- **Failures** — redline abuse seizes the motor (rebuild button); lugging to a
  stop stalls it (the wheels push-crank the dead engine — it re-fires with a
  judder if you're rolling fast enough); overheating limps it (cool it down).
- **Driver aids that feel real** — rev-match downshift blips, engine-braking with
  a dead or closed engine, locked-wheel skid physics if you seize the motor at speed.
- **Records & milestones** — personal bests per engine persist between sessions
  (0–100, ¼-mile, top speed), plus toast callouts for full boost, burnouts,
  overheating, low fuel, 100/200 km/h.
- **Bulletproof audio unlock (incl. iOS)** — `resume()` is requested synchronously
  inside every touch/pointer gesture, a silent blip wakes the hardware, the worklet
  param map is generated from the node itself (a missing param can never kill the
  mix again), every write is guarded, and a pulsing **"TAP FOR SOUND" pill** stays
  on screen until the AudioContext is confirmed running.
- **Synthesized audio** — AudioWorklet pulse train timed from real firing angles,
  filtered noise, sub-rumble, exhaust drone at the firing frequency, starter whine,
  limiter sputter, overrun crackle with occasional **full backfire BANGs**, turbo
  whistle + intake whoosh, BOV pssh on high-boost lift-off, **compressor-surge
  "stu-stu-stu" flutter** on moderate-boost lift-off, gear-shift clunk, nitrous
  hiss, **tire screech** on wheelspin, cold-start lope. Two-oscillator fallback
  where AudioWorklet is unavailable.
- **Visual FX** — EGT-glowing headers, tailpipe flames (blue on nitrous), rolling
  backfire fireballs with bouncing embers and a screen flash, boiling **tire
  smoke** + SLIP! warning + tire screech on wheelspin, speed lines at highway
  pace, wind-blown smoke, steam puffs, boost-lit charge pipe, cold-start
  condensate, pulsing tach redline, vignette.
- **Hold-to-use controls** — no long-press callouts/copy menus: starter and NOS
  buttons are pointer-captured hold buttons, throttle keys ramp while held.

## Controls

| Input | Action |
| --- | --- |
| `SPACE` / IGNITION | ignition on/off |
| `ENTER` (hold) / STARTER | crank the starter |
| `↑` `↓` `W` `S` / slider | throttle |
| DYNO LOAD slider | brake load (dyno mode) |
| `D` | toggle DYNO / DRIVE mode |
| `E` / `Q` | gear up / down (drive mode) |
| `N` (hold) | nitrous |
| `F` | refuel |
| `T` | mod shop |
| `L` | toggle rev limiter |
| `M` | mute |
| `R` | rebuild (when seized) |
| `1` `2` `3` | swap engine (I-3 / I-4 / I-6) |

## Code layout

```
index.html        page & panels
css/style.css     theme
js/engine.js      pure physics model (node-testable, no DOM)
js/vehicle.js     drivetrain: gears, clutch, drag, timers, stalls
js/render.js      canvas: cutaway, tachometer, dyno chart
js/audio.js       AudioContext + worklet hookup + fallback synth
js/worklet.js     AudioWorkletProcessor — the engine sound
js/ui.js          DOM/keyboard bindings
js/main.js        app wiring + animation loop
```
