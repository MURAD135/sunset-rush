# Cloud save and future mobile packages

## Implemented boundary, not an active service

`src/cloud-save.js` is backend-independent and disabled without an injected
transport. No remote login, endpoint, account registration, analytics or network
requests were added. The optional GuestProfile is a random local identifier,
not a credential, authenticated guest or cloud account. It is not exported with
progress. Creating it does not change wallets or enroll any external service. Tests use an explicitly mocked backend.

Transport contract (authenticated account is determined **server-side**):

```js
read() // null, or { revision: opaqueServerRevision, save: validatedVersion2JSONString }
write({ save, expectedRevision }) // { revision }, or { conflict: true }
// expectedRevision: null means create only if no cloud save exists.
```

Server must authenticate and authorize every operation, enforce a transactional
compare-and-swap, schema/size limits, rate limits and protected backups. A client
revision, checksum, timestamp or wallet is not trusted proof of entitlement.
Use HTTPS and a common authenticated account across iOS/Android. Recreate the
coordinator/transport on account change; never reuse another account's pending
revision. Native credentials belong in a platform secure credential store,
not localStorage or exported JSON.

`inspect()` distinguishes disabled, empty, equal, conflict and unavailable.
No automatic upload or overwrite follows a conflict. Show both profiles and
ask which complete progress snapshot to keep; back up the local one before
adopting a cloud restore candidate. Do not sum/max coins, rewards or inventories.
Graphics, language and controller/audio preferences remain local. A pull produces
only a candidate; `SaveStore.restore()` performs validated backup and adoption.
An interrupted response must be followed by read/compare before retry, not blind
repeated rewards. Account deletion, export, retention and recovery policy belong
to the future backend and store release.

## Explicit conflict review coordinator

`CloudReview` wraps the transport with a session/review generation. The caller
must explicitly inject an already authenticated, account-bound transport; the
client boolean is only an integration guard, never server authorization. The
game does not instantiate a cloud provider. Local guest IDs cannot authenticate.

Each conflict requires a new explicit local/cloud choice. Local choice performs
server compare-and-swap; remote choice re-reads the reviewed revision, then
checks the local snapshot and session again inside the SaveStore lock before
backing up and restoring. Logout/account changes discard pending reviews. No
wallet addition/max merge occurs; graphics/control/session choices stay local.
An upload already accepted by the old account's server cannot be recalled on
logout: the future transport must remain bound to that account and re-check
authorization server-side. Credentials must never be put in these JSON exports.

Mocks cover disabled/unauthenticated operation, local and remote edits, CAS
conflicts, logout during read, and account change while waiting for a save lock.
This is tested local architecture, not functioning cross-device synchronization.
A production identity provider, transport, account-linking/deletion policy and
conflict-review UI remain required before activation.

## Concrete packaging groundwork

`npm run prepare:native` builds and stages a self-contained web bundle, licenses,
SHA-256 asset manifest, readiness metadata and `capacitor.config.json` under
`artifacts/native/<content-id>/`. It does not create an APK/AAB/IPA. Existing web
build/preview/offline support remain available. Bundled assets use relative URLs;
no remote `server.url`, mixed content or cleartext access is enabled.

`com.murad135.sunsetrush` is a proposed application identifier; the owner must
confirm it before registering/signing. No store identity was registered.
`src/platform.js` unifies web background events and an injected native App
lifecycle interface. A native bootstrap can pass `@capacitor/app`'s `App` as
`window.SunsetRushNative.app` **before** loading the game. Background pauses,
silences and requests save; foreground requires a gesture to resume. Native
runtime detection skips web service-worker registration inside Capacitor.

Next native steps, deliberately not represented as completed:

1. Select/pin a mutually compatible Capacitor core/CLI/iOS/Android/App SDK set
   and install in a dedicated wrapper project using the staged `www`/config.
   Generate native projects, then `cap sync`; no signing/publishing in this task.
2. Verify package ID/ownership, provisioning, signing keys outside Git, Android
   target API and current App Store/Xcode requirements at submission time.
3. Implement native file export/import for WKWebView and Android WebView; the
   browser download/file picker paths are currently tested only in Chromium.
   If replacing localStorage with native storage, migrate the web-origin data
   explicitly; different browser/WebView origins do not share local saves.
4. Test real Safari/WKWebView and Chrome/Android WebView: audio interruptions,
   Bluetooth/headphone routes, suspension/OS kills, safe areas, portrait/landscape,
   memory pressure, controllers, and frame-time percentiles/thermal throttling.
5. Produce required 1024px store artwork/screenshots, age rating, privacy policy,
   App Privacy/Data Safety declarations consistent with the final SDK/backend,
   support and account-deletion flows if accounts are introduced.
6. Only after device validation prepare signed internal test builds; owner
   authorization is still required for upload, TestFlight/Play distribution or
   deployment. No physical-device result or store approval is claimed here.
