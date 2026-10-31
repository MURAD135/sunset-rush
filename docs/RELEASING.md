# Releasing Sunset Rush · دليل الإصدارات

The game currently shows version **1.0** in its menu. An official GitHub Release **has not been created by these repository documents**.

## Semantic versioning · الترقيم

| Tag | Meaning · المعنى |
| --- | --- |
| `v1.0.0` | First tested public release · الإصدار الأول |
| `v1.0.1` | Compatible bug fixes · إصلاح أخطاء |
| `v1.1.0` | New compatible features · ميزات جديدة |
| `v2.0.0` | Major changes or compatibility breaks · تحديث جذري |
| `v1.1.0-beta.1` | Experimental pre-release · إصدار تجريبي |

## Pre-release checklist · قبل أي إصدار

1. Merge the intended changes to `main` and wait for the deployment/checks.
2. Run the [manual QA checklist](TESTING.md) on desktop and mobile.
3. Confirm the `LICENSE` holder; replace `YOUR NAME` after checking ownership.
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
