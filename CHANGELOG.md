# Changelog · سجل التغييرات

Following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/). This file documents the project: entries here **do not create GitHub Releases**.

## [Unreleased] · قيد التطوير

### Added
- An original coastal circuit alongside the ten existing tracks: bay, suspension bridge, palms, skyline, sailboats and warm sunset.
- Immediate 3D menu preview, refreshed race HUD and live results table.
- Cannon-es planar vehicle contacts, fixed 60 Hz simulation and ordered checkpoint validation.
- Explicit handbrake/drift, standard gamepad support, multi-touch capture/cancel, recovery and automatic pause on focus loss.
- Pinned local dependencies, Vite build, production offline cache and third-party notices.
- Simulation, browser, mobile-emulation and production/offline tests; build-only CI with no deployment.

### Changed
- Extracted the existing HTML monolith into JS/CSS and focused modules, retaining the garage, cars, legacy tracks and progression.
- Improved car paint/glazing, camera response, color management and quality settings.
- Merged static scenery and car parts; dispose GPU resources when replacing tracks/cars.
- Freeze finish order, separate best-time keys by track/lap count, and clear stale inputs/effects across modes.
- Source development now requires Vite; production hosting serves `dist/`.

### Status
- Review branch only. No merge, release tag or live deployment.
- Physical phones, hardware GPUs and physical gamepads still require validation. See `docs/QA_REPORT.md` for measured results and limitations.

## Existing baseline · النسخة الأساسية

The original game UI says **1.0** and includes 8 cars, 10 tracks, drifting/nitro, weather, AI rivals, customization, achievements and daily challenges. This is a description of the existing game, not a separately published GitHub release.
