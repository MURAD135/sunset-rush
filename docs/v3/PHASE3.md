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
found by integration was fixed and covered before commit. Final regression results are recorded below.

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
implemented contracts and actual remaining work. Browser regression completed successfully as recorded below.

## Final verification — 2026-11-13

All runs below passed on Node 24.22.1 / Linux / Chromium 156 with SwiftShader:

| Check | Result |
|---|---|
| Unit suite | 47 passed (original 27 preserved) |
| Original browser controls/races/resources/mobile | 18 passed |
| Interpolation/camera + timing | 9 + 6 passed |
| Additional comparison with committed Phase 2 race evidence | 1 passed; exact four-cadence parity |
| Quality/DRS/resource checks | 6 passed |
| Audio integration | 4 passed; six sources, 18 nodes |
| Sport full races and persistent rewards | Four identical three-lap/four-rival races at 30/60/120/144Hz; rewards and Sport record survive reload |
| Local save integration | 9 passed; no page errors |
| Endurance | Four consecutive full races; 119 geometries, 10 textures, 24 programs unchanged |
| Mobile touch emulation | 390×844 and 844×390 passed |
| Production | Offline race playable, no external requests, no development hooks or page errors |
| Production build/native staging | Passed; existing Three.js >500kB chunk advisory remains |

Classic finish: 60.783333333331164 s; Sport finish: 60.44999999999785 s with
the same test driver. These are race times, **not frame performance**. Retained
JS heap after diagnostic GC across four races: 7.741, 7.751, 7.858, 7.897 MiB.
This bounded run did not reveal growing GPU resources; it does not prove absence
of all long-session leaks. Save serialization can still hitch for large profiles;
no claim of physical-device FPS or memory profiling is made.

Production cache: `sunset-rush-fd1e832029e5`. Native web-assets staging ID:
`2ce0a34276ff`. Runtime code is saved in 7f5b578; additional regression tests in
6fef515. Test evidence and an actual save-settings screenshot are in `phase3/`.
Earlier matched visual comparisons remain in `phase2/`; this phase did not
change coastal geometry/lighting and does not claim a new visual before/after.

### Try it

On the local phase-three branch: `npm ci`, then `npm run dev` and open the printed
local URL. Settings → Driving mode → Sport enables new handling/opponents; Classic
is retained. Play enables audio. Settings → Save progress offers export, confirmed
import and restore of the previous generation. `npm run prepare:native` regenerates
the unsigned staging directory. Cloud save is not enabled.

### Remaining work

- Physical iOS/Safari, Android/Chrome and native WebView tests, controller/audio
  interruption testing, subjective engine/driving/AI tuning and GPU profiling.
- Broader Sport combinations of cars/upgrades/weather/forks. Existing race features
  remain; four-cadence validation currently focuses on the coastal circuit.
- Real authenticated cloud backend, server revision enforcement and account/conflict
  UI. The tested adapter contract alone is not working cross-device sync.
- Native SDK/wrapper projects, native file export/import, app ID confirmation,
  signing, store artwork/privacy/submission and signed device builds.
- Browser storage is origin-bound; export before moving between localhost/HTTPS/
  native origins. No active-race resume checkpoint or guaranteed OS-kill flush.

No push, PR #1/#2 edit, merge or deployment was performed. The unavailable five
uncommitted files were not represented as recovered; new work is independently
saved in small commits, and original histories/backups are preserved.

## Resume follow-up — 2026-11-14

A clean checkout at b9d4cf6 was verified; no five-file pending diff or stash
was present. Baseline 47 units/build passed again. The new audio batch fixes
resume/restart/recover buttons failing to resume an interrupted AudioContext.
Foreground alone still leaves gameplay/audio paused. Rejected or synchronous
resume failures are handled. 48 units, production build and seven Chromium
audio checks passed, including real context suspension and an injected native
background event. Resources remain six sources/18 nodes. This is not a real
iOS interruption test; evidence: `phase3/audio-resume.json`.
