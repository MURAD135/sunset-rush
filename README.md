# Sunset Rush · سباق الغروب

A single-file 3D arcade racing game for mobile and desktop browsers, built with plain JavaScript and [Three.js](https://threejs.org/) (r128, loaded from a CDN).
لعبة سباق سيارات ثلاثية الأبعاد في ملف واحد، تعمل على الموبايل والكمبيوتر.

## Features · المميزات
- Garage with orbit/zoom, 8 cars (2 unlockable with coins), paint, finish, wing, stripes, rims, underglow
- 10 tracks including a long forked road with a lit tunnel, plus a daily challenge
- Rain, storm, mud, night, desert and snow; sliding physics and drift-charged nitro
- Smarter AI rivals, ghost car of your best run, score combos, 12 achievements, daily missions, XP levels
- Coins and workshop upgrades, crowds, road props (coins, cones, oil, ramps)
- Touch controls (with optional tilt steering), sound effects, graphics quality settings
- Languages: العربية, English, Français, Español

## Run · التشغيل
Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

An internet connection is needed for Three.js and the Tajawal font (both from public CDNs).

## Publish with GitHub Pages
Repository → Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

## Controls · التحكم
Touch: left/right, gas, brake, nitro. Keyboard: arrows or WASD, Space = brake, Shift or E = nitro.

## License
MIT, see `LICENSE`. Replace the copyright name before publishing.
