# Contributing · دليل المساهمة

Thanks for helping improve Sunset Rush. شكراً لمساهمتك في تطوير سباق الغروب.

## Workflow · سير العمل

1. Check [Issues](https://github.com/MURAD135/sunset-rush/issues) before opening a duplicate report.
2. For bugs, use the **Bug report** form with repeatable steps and browser/device information.
3. For new ideas, use the **Feature request** form.
4. Create a feature branch from `main` such as `fix/mobile-controls` or `feat/garage-ui`.
5. Keep commits focused and use prefixes: `feat:`, `fix:`, `docs:`, `refactor:` or `test:`.
6. Run `npm ci`, `npm test`, `npm run build`, then `npm run dev` to test locally.
7. Follow [docs/TESTING.md](docs/TESTING.md) and open a draft pull request with screenshots for UI changes. Do not merge or deploy without owner approval.

## Project standards · معايير المشروع

- Preserve existing cars, tracks, controls, achievements and languages unless an approved change requires otherwise.
- Avoid including credentials, personal data or paid assets without an appropriate license.
- Keep accessibility, touch devices, performance and low-power hardware in mind.
- Describe the expected player-facing impact and known risks.
- Update `CHANGELOG.md` when functionality changes.

## Releases · الإصدارات

Maintainers use [docs/RELEASING.md](docs/RELEASING.md). Do not create version tags for normal pull requests.
