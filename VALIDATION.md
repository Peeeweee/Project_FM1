# Version 0.5.1 identity regression — 4 November 2026

- Corrected firmware guard for shipped INFO version FELUCCA SLOOP 2.8.4, verified from pinned source firmware/src/ui.c and editor.c. The earlier shortened fixture identity missed the bug.
- 54 automated tests passed (39 Node, 15 Python). Fixture now defaults to the actual full prefix. Added regression checks for full/short supported prefixes and received-identity reporting on unsupported firmware, before further requests.
- Browser regression verified names populated for the full FELUCCA SLOOP 2.8.4 reply; an unsupported ORBIT identity produced a visible live-card error and retry button. These are simulated protocol tests, not a physical read.
- Live-card Read instrument button and inline read errors prevent a failed read from silently leaving the misleading connect-and-read prompt.

# Version 0.5 validation — 4 November 2026

- 52 automated tests passed (37 Node, 15 Python). New tests cover read-only protocol use, actual custom MIDI channels, engine/preset/kit refresh, missing kit-name fallback, selection-race rejection, unsupported/malformed replies, explicit manual labels, per-event metadata at note-on, unchanged MIDI values/timing, metadata bounds and persisted instrument fields.
- Isolated browser fixture used simulated FELUCCA 2.8.4 replies; no real MIDI ports. Drum track configured on channel 6: MIDI pitch 36 displayed Kick / track 4 / 808. The same pitch on synth channel 11 displayed C2 / track 2 / Rhodes. Changing the preset updated the selected instrument to Flute.
- Browser recording captured two simulated kick events across an 808-to-Dust kit change. Saved JSON retained 808 for the first hit, Dust for the second, channel 6 and pitch 36 for both. Timeline displayed named drum lanes. This test JSON was kept separately in workspace outputs, not the user's real project library.
- Instrument reader sends only INFO(1), DUMP(4), DESC(5), NAMES(10), argument-free TRACK(27), and TRACK_DUMP(29). It does not enable WATCH, select tracks, write parameters, send notes, or flash firmware. The stock path reuses the existing read-only V14/V15 voice reader.
- Final app page served at 8781 with new controls and no script load error. A MIDI-access request in the in-app browser did not complete, so no physical-device identity or status read was verified. The physical FM1 check remains pending in the user's Chrome/Edge connection.

## Previous validation

# Version 0.4 validation — 4 November 2026

- 42 automated tests passed (28 Node, 14 Python). New preview tests cover successful loading, missing/unsafe paths, failure/retry, eager full-size modal loading, and complete local file/hash coverage for all nine curated instruments.
- All nine preview URLs returned HTTP 200 with correct PNG/JPEG MIME types and SHA-256 matching previews.json. The browser reported ready/naturalWidth > 0 for all nine cards.
- Browser tested desktop and phone breakpoints. The native viewport adapter reports CSS sizes about 1.49 times requested dimensions: measured 2149 x 1492 desktop and 388 x 840 phone. No page horizontal overflow at the phone breakpoint; the main 3D stage remained visible at 134 x 180 CSS pixels.
- Actual WebGL rendering verified: frame/phase advanced while running; manual pause held frame 5 and phase 0.000 across observations; resume advanced frames and the ticker ran again. Page change updated the motion target from vault to studio. The rendering loop stops when hidden/offscreen and respects reduced-motion preferences. The fallback remains explicitly labeled as 2D when WebGL is unavailable.
- 386DX search and detail dialog checked: local captured preview ready, natural width 208, full-size image link correct. All new images have source/caption/license metadata.
- Existing v0.3 note/audio validation remains recorded below. No FM1 command, device connection, microphone permission, or firmware write was performed in this v0.4 task.

## Previous v0.3 checks

3 November 2026

- 24 Node tests passed: protocol framing, package pinning, simulated updater, note timing/duration, MIDI-file structure, WAV trim/interleaving, read-only SLOOP snapshots, duplicate ID rejection.
- 13 Python tests passed: backup/project validation, persisted file integrity, catalog downloads and source restrictions, API origin/session controls and blob-audio CSP regression.
- Browser checked at narrow/default and 1440px desktop widths: routed monochrome pages; actual Three.js geometry rendered and morphed; all five genuine previews loaded.
- Browser-created one-note QA project saved to disk. Verified exact 0.137-second start and 0.421-second duration in saved JSON. It is labeled UI test take — no FM1 recording.
- Browser opened generated one-second mono WAV, trimmed 0.2–0.7 seconds, played it without media error, and exported PCM16 WAV. Export verified at half a second within one sample. Generated file is a test tone, not FM1 audio.
- No microphone permission was granted, MIDI port opened, SLOOP snapshot sent or firmware written during these development tests.

Pending hardware validation: actual FM1 note output/configuration, identity/read-only snapshot responses, audio-source enumeration/recording, disconnect/reconnect with real ports, native firmware installation/recovery. This is a single-note-lane/single-audio-take workspace, not a complete multitrack DAW. Physical button-down telemetry is not exposed by the verified snapshot protocol.


## v0.6 minimal UI

- JS syntax checks for app.js, studio.js and catalog-ui.js; git diff whitespace check passed.
- All 39 Node and 15 Python tests pass; local HTTP test rerun with loopback access after sandbox socket denial.
- Browser: one shared h1 across Home/Studio/Firmware/Backups, responsive desktop/388px layout, nine preview images loaded, Explore/Saved click and keyboard tabs, search/detail dialog, Audio tab, collapsed editor auto-opening on note creation, file tools, connection/help dialogs, and WebGL route state / pause / resume. No browser console errors observed.
- Test note edits stayed in browser memory. No firmware installation, backup mutation, hardware MIDI access or audio permission request.


## v0.7 expanded firmware installation

- 47 Node tests and 19 Python tests pass; actual reviewed binaries included, no skips in this workspace. Tests cover unknown/corrupted packages, matching digest with wrong size, shared product marker, all four exact transfer boundaries, foreign OTA loader refusal, wrong post-reboot identity and cached approval tampering. Extended FM1 identifiers are storage-only.
- HTTP: 15 previews returned matching image MIME and metadata SHA-256; all four approved offline files matched manifest size/hash; original 128-sound .syx unchanged.
- Browser: three-family native filter, compact ORBIT details, default/latest and legacy SLOOP selection with matching review/hash, write disabled without FM1, four native packages listed in Saved, genuine Mutable Dreams save/download (kept creator-install-only), all 15 natural images loaded, desktop and 388px mobile page/dialog geometry, no console errors.
- No MIDI/audio permission or physical-device operations. Native hardware installation is not verified.

## Page-specific banner sculptures

- Browser visually verified four distinct WebGL models and route labels: woven loop, waveform, floating modules, archive vault. One h1 and banner per route; paused navigation selects only the correct model.
- Frame/phase advanced while running, stayed fixed when paused through navigation, and resumed. No console warnings/errors observed. Narrow 388px page fits the canvas without horizontal overflow; viewport and running preference restored.
- Node syntax and git whitespace checks passed. CSS fallback silhouettes implemented; WebGL-unavailable fallback was not forced in this browser run. No hardware operations.

## Connected shell flow

- Visually checked four sidebar scene/frame identities, top-bar signals and banner patterns. Sidebar and banner expose matching animation phase while running and paused; one shared capped render loop drives both.
- Navigation highlight follows mouse/keyboard route changes, including reverse direction and the mobile row. Pause stops scene/signal/edge motion and route transition effects. Reduced-motion CSS and renderer handling retained; OS preference was not changed for this check.
- Desktop and 388px phone layout verified without horizontal overflow or signal/button overlap. No console warnings/errors. JS syntax and whitespace checks passed. No hardware operations.

## Border-only correction

- Removed both interior shell decorations and secondary WebGL renderer. Verified one continuous corner path, four route-specific dash patterns, and unchanged animation offset through paused navigation.
- Border is pointer-transparent; Connect dialog opens/closes normally. Sticky header/path follow phone scrolling; mobile layout fits. Main banner still has the correct model and one h1 on each page.
- Normal viewport/running motion restored, no console errors. JS syntax and git whitespace checks passed; no hardware operations. Actual reduced-motion preference was not changed.

## Light/dark themes

- Theme toggle, keyboard focus/Enter, both saved themes after reload, matching Three.js theme while paused, and normal responsive layout verified. Fixed blocked inline bootstrap using same-origin /theme.js; CSP remains unchanged.
- Visually checked Home, Studio (including piano), Firmware and Backups; Audio controls in both modes; connection/help/details/install-review dialogs. Shared palette preserves photos/physical keys and recording displays. Light-mode faint labels and transient navigation contrast fixed.
- DOM text sampling after fixes: no remaining failures on the checked surfaces (4.5 normal / 3 large; disabled/decorative content excluded; gradients approximated by first stop). Dark route samples: 50 Home, 113 Studio, 208 Firmware, 66 Backups. This supplements visual checks, not a complete accessibility audit.
- 358/388px phone layout fits theme/connection controls without overlap or page overflow. Normal viewport restored; dark theme selected and animation running. No console errors.
- Existing server tests: 4 pass. Actual /theme.js response 200 text/javascript with original CSP. JS syntax and git whitespace checks pass. No hardware operations.

# Blacksmith source-kit builder — 5 November 2026

- Full suite: 47 Node tests and 28 Python tests pass (75 total). New checks cover generated C/palettes/preset wrapping, disabled DSP modules, source/license provenance, invalid/code-injection parameters, huge numeric inputs, reference-file limits/headers/paths, immutable ZIP integrity, HTTP session enforcement and API recipe/ZIP round trips. Final numeric guard rerun: all 8 Blacksmith unit tests pass. JS syntax and whitespace checks pass.
- Browser: all five tools, preset add/remove/rename/oscillator/cutoff, auto-uppercase device/preset titles, screen layout/palette, DSP toggle, keyboard tab navigation, invalid-name feedback, local reference WAV upload, JSON export, source-kit save/download, saved-project reopening and draft persistence after reload. Browser audition enters/stops playback state and stops on route leave; audio quality was not measured.
- Downloaded NIGHT_FORGE.source.zip verified: 17,824 bytes, SHA-256 4800668f44ad1261acf04be9105d9b042d0c6b39ba241c7f49e112cdf4979623. It contains edited C/header/config, JSON design/presets, source/license/credits, instructions and reference-test.wav. No .fwsc or .bin. Saved QA project is clearly named Blacksmith browser test.
- Visually checked light/dark layout and 388 CSS-pixel phone navigation/tool tabs; no page overflow. DOM contrast sampling: 67 text samples in each theme, no sampled failures. Five-item sidebar/mobile navigation, one shared h1, unique anvil, pause/resume and route switching work. No browser warnings/errors. Normal viewport restored, dark theme selected, motion running.
- Proof: C:/Users/Paulo/Documents/Codex/2026-11-02/can/outputs/blacksmith/blacksmith-dark.png. CSS anvil fallback implemented but WebGL-unavailable mode was not forced in this browser check.
- No compiler/toolchain installed, generated C compilation, device audio validation, MIDI permission, microphone/audio capture or firmware writing. The browser preview is approximate; output remains a source kit, explicitly not installable firmware.

## Blacksmith direct compiler and customization — 6 November 2026

- Full suite: 51 Node + 34 Python = 85 passing, no skips. New coverage includes local-package provenance/byte validation and simulated transfer, extended identity handshake, interrupted/invalid build handling, recipe limits and generated design/settings. Synthetic package fixtures test format logic only. JS/Python syntax and Git whitespace checks pass.
- Real QA target build build-67b640c0c8b539e652a71f94 produced MY_FORGE.fwsc (611490 bytes), SHA-256 e91fa0773921424671b0042e48f24144b6e5fbb973035c637038d825d051ccbd. Browser download matches actual artifact. App image 86100 bytes; data+bss 27876/98304; pool 69384/344064. Platform RAM-text/call, double-routine and register-access checks passed. Package metadata records exact base/BSP, recipe, image and loader hashes.
- Actual generated C also compiled as a host simulator. Script passed default octave -1, rejection of channel 1 input when configured for channel 3, channel 3 note-on 60/note-off, preset wrapping in both directions and measured peak -31.0 dBFS (checked between -60 and -1). Rendered screen contains imported artwork and labels. Host simulation is not physical hardware validation. Logs and render are under the ignored build directory app/host-qa/ and work/blacksmith-research/.
- Browser: actual Build & install submitted compilation, finished with Review install, and opened the final custom-firmware review; Write disabled without an identified device. Tested PNG artwork import/pixel controls, labels, colors, new sounds/settings, USB output/input dependency, and existing draft migration. No device or microphone permission accepted, no firmware written.
- Light/dark text sampling: 109 dark Screen, 110 light Screen, 99 light Settings samples, no sampled failures. At 388 CSS-pixel viewport all six tools fit as 3 columns by 2 rows, document width 365 and no horizontal overflow. Final normal viewport, dark theme, running motion; no console warnings/errors. Proof: outputs/blacksmith-v2/workspace.png in the thread workspace; generated-screen.png is the real host render.
- Docker setup script completed successfully against verified caches, and compiler environment reports ready. Build containers have no network; cached dependencies and build history are excluded from Git. Physical flashing, actual FM1 audio and recovery remain untested.

## Blacksmith quick guide — 6 November 2026

- Added a collapsed six-step create/install walkthrough, exact existing button labels, backup link, saved-build guidance and build troubleshooting.
- JS syntax and whitespace checks pass. Browser verified expansion, six ordered steps, narrow single-column layout without horizontal overflow, light/dark theme switching and clean console. Default viewport/dark theme restored. No build or hardware operation triggered.

