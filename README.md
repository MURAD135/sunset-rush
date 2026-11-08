# Sunset Rush · سباق الغروب

A playable Three.js arcade racer with an original sunset coastal circuit, four AI rivals and three-lap races. The coastal upgrade is **review work, not a deployed release**. It retains the original eight-car garage, ten legacy tracks, progression and four interface languages.

## Run locally · التشغيل

Requires Node.js 24+ and npm. The renderer needs a WebGL-capable browser.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173. Choose **Play now / العب الآن** for the coastal race, or **Garage / المرآب** to select a car, customize it, or choose a legacy track. The first six cars are available without unlocking. A real 3D circuit appears immediately in the main menu.

```bash
npm test                 # seven simulation/input tests
npm run build           # production bundle + versioned offline cache
npm run preview         # serve dist locally
npm run test:browser     # run while the dev server is running
```

Browser tests use `CHROMIUM_PATH` (default `/usr/bin/chromium`). Tests and screenshots are written to `artifacts/`, which is not committed. See [testing](docs/TESTING.md), the [QA report](docs/QA_REPORT.md), [progress checkpoint](PROGRESS.md) and the [implementation plan](docs/IMPLEMENTATION.md). Opening source `index.html` directly or serving the repository with Python no longer works: Vite resolves the locally installed ES modules. To serve a built copy, serve **dist/**.

## Controls · التحكم

| Action | Keyboard | Standard gamepad | Touch |
| --- | --- | --- | --- |
| Steer | A/D or ←/→ | Left stick / D-pad | Left/right |
| Accelerate | W / ↑ | RT or A | Gas |
| Brake | S / ↓ | LT | Brake |
| Drift / handbrake | Space | B | Handbrake |
| Nitro | Shift / E | X | Nitro |
| Recover onto road | R | Back / View | Pause → recover |
| Pause | Esc | Start | Pause icon |
| Camera | C | Y | Camera icon |

Hold steering and handbrake together at speed to drift and recharge nitro. Nitro also recovers slowly while unused. Recovering stops the car, costs 15 nitro and never advances lap progress. Losing focus automatically pauses and clears inputs. Touch supports simultaneous fingers; tilt and auto acceleration remain in Settings.

## What's implemented

- An original procedural island circuit, bay, suspension bridge, palms, skyline, sailboats and warm sky. No copied commercial assets or remotely loaded models.
- Glossy sports-car paint, dark reflective glazing, animated wheels, dynamic chase/close/hood cameras, nitro trails, drift smoke and tire marks.
- Fixed 60 Hz arcade simulation with Cannon-es planar vehicle contacts and analytical track boundaries. This is **not** a realistic suspension or tire simulator.
- Four path-following rivals with lane changes, overtaking, bounded catch-up and frozen finish order; twelve ordered checkpoints per lap prevent reverse/line-crossing exploits.
- Countdown, laps, timing, position, mini-map, nitro, results, restart and car selection.
- High / medium / low / automatic graphics levels, bounded particle pools, merged scenery and explicit GPU resource disposal on rebuild.
- Existing achievements, coins, upgrades, daily challenges, ghost runs and Arabic/English/French/Spanish interface support retained.
- Production bundles need no CDN. After one complete online installation, the service worker caches the game for offline play. Development does not register a service worker.

## Project structure

```text
index.html              Existing UI markup with new menu/HUD
src/game.js             Extracted original game, integration and presentation
src/coast.js            Original batched coastal environment
src/physics.js          Cannon contacts and fixed-step clock
src/progress.js         Checkpoint/lap and finish-order logic
src/input.js            Keyboard, gamepad and multi-touch
src/resources.js        Mesh batching, color management and disposal
src/style.css           Original garage/UI styles
src/coast.css           Coastal presentation and responsive overrides
public/                 Original PWA icons, manifest and cache worker source
scripts/build-sw.mjs     Hashed production asset pre-cache generator
tests/                  Unit, browser, mobile and production checks
docs/                   Inspection, plan, QA results and asset licenses
```

## Review and deployment

Work lives on `feat/coastal-arcade-racing`. **Do not merge or deploy without the owner's approval.** No release tag or live deployment was created. An eventual deployment must upload the contents of `dist/`, rather than publish the repository source root. Relative asset URLs support a `/sunset-rush/` subpath.

[MIT License](LICENSE) · © 2026 MURAD135. Third-party runtime licenses and asset provenance: [notices](docs/THIRD_PARTY_NOTICES.md).
