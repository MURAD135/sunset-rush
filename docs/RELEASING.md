# Releasing Sunset Rush · دليل الإصدارات

The original baseline menu showed **1.0**. The coastal / Sunset Rush 2.0 development work remains unreleased; no release tag has been created.

## Semantic versioning · الترقيم

| Tag | Meaning · المعنى |
| --- | --- |
| `v1.0.0` | First tested public release · الإصدار الأول |
| `v1.0.1` | Compatible bug fixes · إصلاح أخطاء |
| `v1.1.0` | New compatible features · ميزات جديدة |
| `v2.0.0` | Major changes or compatibility breaks · تحديث جذري |
| `v1.1.0-beta.1` | Experimental pre-release · إصدار تجريبي |

## Pre-release checklist · قبل أي إصدار

1. Obtain the owner’s approval before merging to `main` or publishing. Run `npm ci`, `npm test`, `npm run build` and browser QA; any eventual Pages deployment must upload `dist/`, not the source root.
2. Run the [manual QA checklist](TESTING.md) on desktop and mobile.
3. Verify the existing MURAD135 MIT license and bundled third-party notices.
4. Move verified entries from `Unreleased` into a dated version section of `CHANGELOG.md`.
5. Retest the live GitHub Pages link, Start button, inputs and menus.

## Publish through GitHub · نشر النسخة

1. Open [GitHub Releases](https://github.com/MURAD135/sunset-rush/releases).
2. Click **Draft a new release**.
3. Create a new tag (e.g. `v1.0.0`) targeting `main`.
4. Set a title such as `Sunset Rush v1.0.0`.
5. Paste notes based on **tested** features and `CHANGELOG.md`.
6. Use **Set as a pre-release** for experimental versions; otherwise publish normally.
7. Verify the tag, attached source archives and published game.

**Never rewrite published version tags.** For a corrected public release, create a new patch version.

## Release notes template

```markdown
## What's new · الجديد
-

## Fixed · الإصلاحات
-

## Play · اللعب
https://murad135.github.io/sunset-rush/

## Compatibility · التوافق
- Tested browsers/devices:
- Known limitations:
```
