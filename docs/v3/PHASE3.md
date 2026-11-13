# Phase 3 — implementation and validation

Starting point: `382f66a`, branch `feat/sunset-rush-phase3-save-system`.
No push, deployment, merge, or changes to PR #1/#2.

## Recovery checkpoint

On 2026-11-13 this workspace was clean at 382f66a. No stash or new dangling
Phase 3 objects contained the reported five files (+160/−1). Those changes
cannot be claimed recovered. Historical commits and a verified complete Git
bundle were preserved. Baseline: 27 unit tests and production build passed.

## Driving, opponents and audio

- Classic stays the default and retains the old controller/AI. Sport is selectable
  in Settings: faster steering centering and countersteer, independent of display
  cadence. Cannon, collision dimensions, interpolation and chase camera unchanged.
- Sport rivals decide at 10 Hz: look ahead at three curvature samples, score
  passing lanes, avoid side-by-side/rear traffic, limit speed behind slower cars.
  No teleporting. Legacy modest rubber-banding remains. This is an incremental
  opponent improvement, not a full racing-line optimizer. Forks and every
  weather/track combination still need playtesting.
- Sport records/ghosts use separate keys; Classic records remain intact.
- Original synthesized engine/load/gear/electric tones, nitro, skid and rain.
  Six persistent audio sources, 18 nodes including two reusable cue voices.
  No per-frame source creation or external audio assets. Exponential audio
  ramps, gesture resume, mute/pause/background silence.
- Chromium audio: four checks passed; OfflineAudioContext RMS 0.01913,
  peak 0.05976, finite non-silent output. This is not a subjective listening test.
- Four complete Sport three-lap races/four rivals at 30/60/120/144 Hz: identical
  outcomes, 60.44999999999785 s. Classic retained 60.783333333331164 s and the
  same result ordering/times. Evidence: `phase3/driving.json`,
  `phase3/classic-regression.json`, `phase3/timing.json`.

## Local saves (format 1)

Implementation: `src/save-system.js`, `src/save-ui.js`.

- `sunset-profile-a` / `sunset-profile-b` alternate complete JSON envelopes.
  Each has format, schema version, increasing local revision, timestamp, typed
  data and a checksum. The previous valid generation remains in the other slot.
  A single setItem writes a coherent wallet/statistics/daily-claim snapshot.
  Checksum detects accidental damage; it is not authentication or anti-cheat.
- Data uses explicitly validated legacy field names as a migration bridge.
  Existing wallet, five upgrades, unlocks, statistics, daily missions, streak,
  bests, ghosts, graphics, language and camera preferences migrate once.
  Invalid legacy entries are reported in diagnostics and excluded; raw legacy
  keys remain untouched. Old three-upgrade arrays expand to five.
- New sound, vibration, auto-throttle, sensitivity and driving mode preferences
  persist. Car/paint/track selection remains session-only as in Phase 2.
- Debounce 500 ms for mutations; capture live statistics every five seconds,
  after race rewards, and on pagehide/hidden. No localStorage writes in physics
  ticks. Web Locks serializes writers where available; stale revisions/storage
  events block another window from silently replacing a newer save. Fallback
  browsers have optimistic conflict detection, not a cross-process transaction.
- Quota/security failure keeps unsaved state in memory, shows a warning and
  retries. Never reports durable save on failure. Entirely corrupt/newer-schema
  slots are preserved and automatic overwrites blocked. One damaged slot falls
  back to the valid previous generation. Export JSON remains user-controlled.
- Settings has backup download, confirmed import, and previous-generation
  restore. Validation precedes replacement. Current state is backed up first;
  a restored store is sealed until reload so pagehide cannot save stale live
  state over the imported data.
- Active races are not resumable checkpoints; earned progress is saved. A browser
  or OS can terminate without lifecycle events; up to the debounce/statistics
  interval may be lost. Clearing site data/uninstalling destroys local saves.
  Export to a file before changing origin/device or clearing browser storage.
  This is local backup, not working cloud sync.

## Validation status

Unit coverage now includes migration, malformed fields, interrupted/quota writes,
checksum corruption, future schema protection, previous-generation recovery,
export/import, stale tabs and pagehide after restore. Eleven save unit tests and nine browser save integration checks passed, including
real file download/import and a two-tab conflict. A browser timer receiver bug
found by integration was fixed and covered before commit. Final regression
results will be appended after completion.

A worst-size serialization exercise (11 × 4,000-point ghosts, 730,914 characters,
30 writes) measured mean 6.88 ms, P95 19.44 ms, P99 21.75 ms in Node with an
in-memory storage adapter. This excludes browser/disk latency and is not a
mobile performance result; large profiles may still cause a short save hitch.
See `phase3/save-cost.json`.

No hardware GPU/iOS Safari/Android Chrome listening/performance tests available.
No new FPS claim. GPU rendering work in this phase is unchanged; JavaScript,
local save latency and audio still require physical-device profiling.

## Cloud/native groundwork

Four transport/lifecycle unit tests passed (mock backend only), bringing the
suite to 47. Production build and `prepare:native` passed, staging 12 runtime
files under `artifacts/native/2ce0a34276ff`. No signed application, SDK install,
cloud service, deployment or store upload. See `CLOUD_AND_STORES.md` for the
implemented contracts and actual remaining work. Browser regression pending.
