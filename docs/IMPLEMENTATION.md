# Coastal arcade upgrade — working plan

Baseline: `6ac33c9`, inspected all 13 tracked files, including icon assets, before edits. No AGENTS.md, package manager, tests or workflow files are present in the actual tree (some README claims were stale).

## Findings
- A 92 KB, 517-line HTML monolith contains Three.js r128, hand-integrated arcade movement, 8 original procedural cars, 10 polar tracks, four path-following rivals, three-lap races, particles, garage, four UI languages and saved progression.
- Cannon-es is **not** in this baseline. Preserve the existing arcade steering; add Cannon-es for planar vehicle contact resolution, not an untested realistic suspension rewrite.
- CDN script/font dependencies; incomplete offline cache; no reproducible build or automated checks.
- Scene is a generic flat grass circuit. No coast, suspension bridge or palms.
- Frame-dependent physics, no gamepad, no explicit handbrake, no checkpoint validation; disposal leaks on repeated track/car rebuilds.

## Ordered stages and acceptance
1. Extract existing JS/CSS without removing content; pin dependencies; local build and offline bundle. Verify build and baseline browser launch.
2. Add a coastal circuit alongside all ten original tracks; original bay/bridge/palm/skyline assets, improved car materials, chase camera, immediate 3D menu preview. Verify rendering and drivable geometry.
3. Fixed 60 Hz simulation, Cannon-es car contacts, handbrake, keyboard/gamepad/touch, checkpoint-gated laps, finish order, retry and recovery. Verify deterministic simulation, input release, full race.
4. Responsive HUD, quality levels, bounded effects/disposal; browser screenshots, desktop/mobile emulation, performance samples and honest report.

All work stays on `feat/coastal-arcade-racing`. No merge, live deployment or release tag. The existing garage, tracks, achievements, currencies and language system are retained. New procedural scenery uses the repository MIT license; vendor notices are documented separately. No reference image was present in the task attachments.

## Completion evidence — 2026-11-08

Stages 1–3 are implemented and tested. Stage 4's local browser/mobile-emulation QA, quality controls, draw-call reduction and report are complete; physical GPU/mobile performance acceptance remains open. See `QA_REPORT.md` for the low software-renderer FPS measurements, exact test scope and limitations, and `../PROGRESS.md` for the preserved history and next actions. There is no approved release or live deployment.
