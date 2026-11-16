# Phase 3 — implementation and validation

Starting point: `382f66a`, branch `feat/sunset-rush-phase3-save-system`.
Authorized review branch is pushed to Draft PR #3 targeting visual-performance.
No deployment, merge, or changes to PR #1/#2.

Latest checkpoint: 2026-11-15, runtime `5be6d74`: 68 units/build passed.
Version 2 coverage, optional local guest, guarded mock-cloud review, background
work reduction and explicit corrupt-save recovery are implemented. New browser
CI and offline crash coverage are being saved before the requested effects batch.
See the latest chronological sections and `phase3/` evidence; historical counts
below describe their original batches rather than current totals.

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

The save follow-up handles synchronous/asynchronous Web Lock denial and live
snapshot exceptions inside requestFlush. Failure retains both the durable
previous generation and the unsaved in-memory draft, reports unavailable, and
retries through the lock. It never falls back to an unlocked write. 50 unit
tests, build and all ten browser save checks passed without page errors;
`phase3/save-browser.json` includes injected lock rejection/recovery.

Sport now wraps only the traffic gap used for lane/speed decisions around the
circuit, so a nearby slower/lapped car is not ignored across the lap seam.
Authoritative race progress, finish order, player physics and Classic behavior
are unchanged. Unit coverage includes seam-ahead traffic, boxed passing lanes,
fast rear traffic and immutable input progress. 51 units/build and four complete
Sport races passed; 60.45 s at all four display cadences, with durable rewards
verified after reload. Native web-assets staging is now `9e1a1e02ded4`; Classic/production regressions subsequently passed as recorded below.

### Follow-up closed — 2026-11-14

All 51 units/build/native staging passed. Browser checks: original 18 controls/
races/resources, nine interpolation/camera, six timing, plus exact committed
Phase 2 outcome comparison (34 total regression checks); seven audio checks;
ten save checks. Four complete Sport races at 30/60/120/144 Hz remained identical
and preserved rewards after reload. Production passed offline play, absence of
development hooks and external requests. Four consecutive Classic races retained
119 geometries, 10 textures, 24 programs; diagnostic GC heap 7.732 → 7.892 MiB.
No physical GPU FPS, Safari/iOS/Android or real OS audio-interruption result is
claimed. Previous mobile-emulation evidence dates from November 13.

Current production cache: `sunset-rush-40f4601e229b`; staged native web assets:
`artifacts/native/9e1a1e02ded4` (unsigned assets, not APK/AAB/IPA). Incremental
commits: f2c346e checkpoint, a50cf72 audio recovery, 666bf76 save failure handling,
0675e64 lapped traffic. Source history and the unavailable-five-files finding
remain preserved; no PR edits, pushes, merges or deployments occurred.

Next work remains real-device validation/tuning, broader Sport track/weather
coverage, an authenticated backend and account/conflict UI, and actual native
SDK projects/signing/store preparation. No cloud synchronization was activated.

## Save coverage expansion and authorized review branch

Owner authorized pushing this branch and a draft targeting visual-performance.
Draft PR #3: https://github.com/MURAD135/sunset-rush/pull/3. Initial 93b94df push
and PR checks succeeded; PR #1/#2 are untouched.

Version 2 saves migrate version 1 envelopes while retaining the previous slot.
New session coverage: selected/unlocked car, color, finish/wing/stripe/rims/glow,
circuit, difficulty, weather/surface/theme, lap count, camera, ghost and lamps.
Existing wallet, upgrades, purchased cars/paints, achievements, bests, ghosts,
daily claims and quality/language/control preferences remain preserved. All 11
tracks are already available; no invented paid-track unlock system was added.
Device tilt permission still requires a player gesture where the platform demands it.

The last 20 personal race results are bounded and saved; Achievements shows the
latest five. Old profiles retain their old bests, not fabricated historical races.
54 units/build passed. A real CDP renderer crash, without pagehide, preserved a
paid car/paint/upgrade and every tested preference. Corrupt latest-slot recovery
passed. Four full Sport races retained their journal and rewards after reload.
`phase3/profile-crash.json` records fixtures/results. Renderer crash is not a
physical power cut; updates not yet acknowledged as saved can still be lost.

## Background work and idle rendering

Active racing is uncapped by the new FrameBudget. Menus, pause and results have
a 30 Hz presentation ceiling; hidden/native-background callbacks submit no render.
DRS uses the effective idle target to avoid lowering resolution merely because
of intentional pacing. AudioContext is suspended on mute/pause/background and
resumes on a player gesture. Background skips periodic save requests/play-time
accounting; the lifecycle transition itself still requests a save.

58 units/build, four power-browser checks and seven audio checks passed. During
5.5 seconds of simulated native background there were zero new rendered frames,
periodic save requests or play-time increments. Synthetic 60/120/144 Hz callback
streams each yielded 30 idle presentations while active streams stayed uncapped.
These are measured scheduling/behavior counts, not battery watts, temperature or
physical-device FPS. Evidence: `phase3/power.json`. CI at 2bb58b6 passed before
this independent batch; final active-race regressions follow after all batches.


## Optional guest and guarded cloud conflict architecture

65 units/build and 11 real browser save checks passed. A guest is opt-in and
local only, persists across reload/import, and is excluded from progress exports.
The settings explicitly state cloud sync is disabled. CloudReview requires an
injected authenticated/account-bound transport and an explicit snapshot choice.
Mock tests cover CAS, changing data, logout and account changes while a restore
waits for the save lock. No credentials, backend or external accounts exist here.
See CLOUD_AND_STORES.md for the security boundary and remaining integration.
The separate background-work commit 2889066 passed both remote CI runs.


## Recovery when both local generations are damaged

Explicit import can now recover an all-damaged profile. It validates the chosen
backup, verifies an exact archive of both raw slots, then replaces a slot and
seals the old live state until reload. The archive is downloadable in Settings.
Quota/readback failures, concurrent edits, future-version profiles and an already
occupied different damage archive refuse replacement. The last case requires
manual archive export/storage maintenance; it is intentionally not silent loss.
68 units/build plus two browser recovery checks passed (`phase3/recovery-browser.json`).
An acknowledged autosave and an exported backup remain the durability boundary;
this does not protect against OS-wide site-data deletion or physical disk failure.


## Production offline/crash and review automation — November 15

At 5be6d74, 68 units/build, 34 baseline browser regressions, 7 audio, 11 save,
2 profile/crash, 4 power and 2 damaged-recovery checks passed. Four Sport races
match across 30/60/120/144 Hz; all Classic outcomes match Phase 2 exactly. Four
endurance races retained bounded resources. Production has no test hooks and no
external requests, starts offline after precaching, and retains car/upgrade
purchases, circuit/preferences and guest after a renderer crash without pagehide.
Three new offline-save assertions cover mobile portrait/landscape access too.
The additional quality suite was interrupted before a fresh report, so its old
six-check result is not counted as newly executed here.

GitHub Actions now has a separate Chromium software-WebGL job for the 34
regressions, Phase 3 checks and production/offline-save tests, alongside the
existing units/build/downloadable ZIP job. It has read-only repository access
and no deployment. Remote results for the new browser job are pending its push.
Native staging: artifacts/native/dbc45a1b0986; unsigned web assets only. Latest
renderer crash/offline evidence is phase3/offline-save.json. c60381d is a verified
ancestor, not a missing pending commit. Five working files were actually present
at the latest resume, not the reported seven; no effects changes were invented.


## Particle interpolation and controlled shadow comparison — November 16

See [EFFECTS_REVIEW.md](EFFECTS_REVIEW.md) for actual matched screenshots,
resources and the CPU-only cost (including its increase). The original pool is
retained: no new per-frame material/geometry/texture allocations or post-process.
Particle positions/opacity/diameter now interpolate without mutating gameplay;
Low/reduced bypasses smoke waves and caps projected sprite diameter at 48px.

70 units/build, seven effects checks, 34 baseline checks and six quality checks
passed locally on the modified code. Both shadow-refresh and cached-shadow
captures compare equal before/after, including exact vehicle/camera state and
resource counts. The earlier 137/105 calls mismatch was different shadow phases,
not permission to weaken an assertion or remove the shadow cadence.

CI's camera-persistence test now holds a real Web Lock, asserts pending and
unwritten state, then waits for the acknowledged durable value before reload.
Its original zero-shake assertion remains. That passed remotely; the next CI
failure is tiny coordinate rounding from the older bundled browser compared
with the Chromium 156 historical fixture. A pinned 156 test runtime is under
validation; no epsilon tolerance or historical-fixture rewrite was introduced.


## Keep failed-import feedback visible

A periodic successful autosave could overwrite the invalid-file message before
a slow frame exposed it. The backup operation message now persists until the
next backup operation; the separate saving warning still reflects actual storage
status. 70 units/build and all 11 save-browser checks passed with pinned CFT156,
including an explicit subsequent autosave that must not clear the import error.
The cross-tab test also now stops its own polling before reload; the previous
Promise.any left a losing injected predicate alive in the next document. No
application error is filtered, and both pages' pageerror events are checked.


## Pin the browser without weakening numeric regression checks

The Playwright-bundled old Chromium produced tiny last-bit coordinate differences
against the historical Chromium156 fixture despite identical finish times and
rankings. The original exact comparison and fixture were retained. Official CFT
156.0.8078.80, SHA-256 pinned in config/review-browser.json, passed all 16 Phase 1
checks and that unchanged historical comparison locally. The installer is tested.

The effects fixture for CI was separately recorded from untouched 30b20b4 in
that same CFT executable, not copied from the new implementation. It passed exact
vehicle/camera/resource comparisons in both shadow phases. The original Debian
captures are preserved. Six quality, two damaged-recovery and two profile/crash
checks also passed with CFT. CI now includes the effects and quality suites.
See EFFECTS_REVIEW.md for reproduction commands. Remote checks follow the push;
no result from a pending workflow is represented as a success.
