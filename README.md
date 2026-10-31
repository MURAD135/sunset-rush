# Sunset Rush · سباق الغروب

**A browser-based 3D arcade racing game** powered by vanilla JavaScript and [Three.js](https://threejs.org/).  
**لعبة سباق سيارات ثلاثية الأبعاد** تعمل من المتصفح على الهاتف والكمبيوتر.

[Play online · العب الآن](https://murad135.github.io/sunset-rush/) · [Report a bug · بلّغ عن مشكلة](https://github.com/MURAD135/sunset-rush/issues/new/choose) · [Changelog · سجل التغييرات](CHANGELOG.md)

> The Play link is available only after GitHub Pages deployment succeeds. / يعمل رابط اللعب بعد تفعيل GitHub Pages واكتمال النشر.

## Features · الميزات

- 8 cars with orbit/zoom garage and paint, finish, wing, stripes, rims and underglow.
- 10 tracks, including a forked road with a lit tunnel; daily challenges.
- Weather and environments: rain, storms, mud, night, desert and snow.
- Drifting, nitro, AI rivals, best-run ghost car and scoring combos.
- Coins, car upgrades, XP, 12 achievements and daily missions.
- Keyboard, touch controls and optional tilt steering.
- Languages: العربية، English, Français, Español.
- Graphics settings including shadows, crowds and FPS display.

## Run locally · التشغيل المحلي

Open `index.html` in a modern WebGL-capable browser, or start a local server from the project folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/>.

**Network required:** Three.js r128 and the Tajawal font load from public CDNs. The game is **not yet fully offline**.

## Controls · التحكم

| Action | Desktop | Mobile |
| --- | --- | --- |
| Steering · التوجيه | Arrow keys or A / D | Left / right buttons; optional tilt |
| Acceleration · التسريع | Up arrow or W | Gas |
| Braking · الفرامل | Down arrow, S or Space | Brake |
| Nitro | Shift or E | Nitro |

## Publish on GitHub Pages · النشر

1. Open **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Choose **`main` → `/(root)`**, then **Save**.
4. After deployment, use the **Play online** link at the top.

The game's entry point is **`index.html` at the repository root**. No build step or backend is required.

## Project structure · هيكل المستودع

```text
index.html                  Game source (unchanged by documentation upgrades)
README.md                   Project guide
LICENSE                     MIT license
CHANGELOG.md                Version history
CONTRIBUTING.md             Contribution rules
docs/TESTING.md             Pre-release test checklist
docs/RELEASING.md           Release procedures
.github/ISSUE_TEMPLATE/     Bug and feature request forms
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/checks.yml  Automated smoke checks
.gitignore                  Local files excluded from commits
```

## Development and releases · التطوير والإصدارات

- The current game interface displays **version 1.0**, which is **not** the same thing as a tagged GitHub Release.
- Use [Issues](https://github.com/MURAD135/sunset-rush/issues) for bugs and new features.
- Read [CONTRIBUTING.md](CONTRIBUTING.md), then run the [testing checklist](docs/TESTING.md) before merging changes.
- See [CHANGELOG.md](CHANGELOG.md) and [RELEASING.md](docs/RELEASING.md) for the versioning workflow.

## License · الرخصة

This project is licensed under the [MIT License](LICENSE).

© 2026 MURAD135.

هذا المشروع مرخّص بموجب رخصة MIT. راجع ملف [LICENSE](LICENSE) للتفاصيل.
