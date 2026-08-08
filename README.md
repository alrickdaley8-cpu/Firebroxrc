# FIREBROX·RC — 4-Stroke Engine Simulator 🔥

An interactive **internal combustion engine simulation** that runs entirely in your
browser — no build step, no dependencies. Watch a live cutaway of a running engine:
pistons, connecting rods, crankshaft, valves, cams, sparks, exhaust pulses — all
synchronized with a real crank-dynamics model and synthesized engine audio.

## Run it

Serve the folder with any static file server and open it in a browser:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(Any static server works — the app is plain ES modules + Canvas + Web Audio.)

## Features

- **Animated engine cutaway** — pistons, rods, crank webs & counterweights, flywheel,
  valve springs, rotating cam lobes, spark plugs, intake charge particles, exhaust
  headers with pulsing smoke, sloshing sump oil, and engine-mount shake at low rpm.
- **Physics model** (`js/engine.js`)
  - crank-rotation dynamics with flywheel inertia and per-cylinder torque ripple
    (visible idle lope, stronger on the 3-cylinder)
  - asymmetric volumetric-efficiency torque curve, rpm-dependent friction & pumping
  - closed-loop idle speed control with startup flare
  - starter motor with weak low-rpm cylinder filling ("catch" then rev)
  - dyno brake load (drag the engine against the water brake)
  - soft rev limiter (random spark cut) — disable it and *sustained over-rev =
    seized engine*, complete with smoke and a rebuild button
- **Synthesized sound** (`js/worklet.js`, AudioWorklet) — combustion pulse train
  timed from actual firing angles, filtered noise excitation, sub-rumble at half
  firing frequency, starter whine, rev-limiter sputter, and overrun crackle.
  A simple two-oscillator fallback covers browsers without AudioWorklet.
- **Three engines** — 1.0L Inline-3 turbo (240° firing), 2.0L Inline-4 (180°,
  1-3-4-2), 3.0L Inline-6 (120°, 1-5-3-6-2-4). Different inertia, torque curves,
  redlines, sound character.
- **Gauges** — sweeping tachometer with shift light and digital readout, plus a
  live dyno chart (torque & power vs rpm) with your actual run plotted as a trail.

## Controls

| Input | Action |
| --- | --- |
| `SPACE` / IGNITION button | ignition on/off |
| `ENTER` (hold) / STARTER button | crank the starter |
| `↑` `↓` or throttle slider | throttle |
| DYNO LOAD slider | brake load |
| `L` | toggle rev limiter |
| `M` | mute |
| `R` | rebuild (when seized) |

## Code layout

```
index.html        page & panels
css/style.css     theme
js/engine.js      pure physics model (node-testable, no DOM)
js/render.js      canvas: cutaway, tachometer, dyno chart
js/audio.js       AudioContext + worklet hookup + fallback synth
js/worklet.js     AudioWorkletProcessor — the engine sound
js/ui.js          DOM/keyboard bindings
js/main.js        app wiring + animation loop
```
