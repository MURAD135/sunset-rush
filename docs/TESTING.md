# Testing Sunset Rush

## Automated checks

Use Node.js 24+ and `npm ci`.

```bash
npm test
npm run build
npm run dev -- --port 5173
# In another terminal:
npm run test:browser
```

Install Chromium or set `CHROMIUM_PATH` to a local Chromium/Chrome executable. Browser tests use Playwright and a software WebGL fallback when needed. They produce raw JSON measurements and screenshots in `artifacts/`.

`?test=1` exposes a development-only deterministic interface. The automated test driver supplies steering and pedals to the real controller and Cannon world; it never sets vehicle position, lap count, progress or opponent positions. Test hooks are removed from the production bundle.

Production subpath/offline check:

```bash
npm run preview -- --port 4173 --base /sunset-rush/
# In another terminal:
npm run test:production
```

The production test checks absence of test hooks, install/control by the service worker, offline reload and actual keyboard acceleration/pause without any external network request.

## Before approving a release

Automated checks do not replace these physical-device tests:

- [ ] Current Chrome/Edge with hardware GPU: full three-lap race on all quality levels.
- [ ] Safari on iPhone/iPad and Chrome on Android: portrait, landscape, multi-touch, safe areas and a sustained thermal/performance session.
- [ ] Physical Xbox/PlayStation-style controller: analog sticks/triggers, mapping and disconnect.
- [ ] All eight garage cars, paid unlocks, customization, legacy tracks, weather, tilt, daily challenges and achievements.
- [ ] Arabic/English/French/Spanish layouts and browser font fallbacks.
- [ ] Sound after a user gesture, tab blur, pause, restart and WebGL context loss.
- [ ] Upgrade an installed previous PWA; close old tabs and reopen to activate the new cache.
- [ ] Best times/ghosts with different track/lap/weather combinations; existing legacy ghost keys still share settings per track.
- [ ] Check [QA report](QA_REPORT.md) limitations before deciding on visual/performance acceptance.

There is no deployment step in the automated checks. Obtain owner approval before merging, publishing Pages or tagging a release.
