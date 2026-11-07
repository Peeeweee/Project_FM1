# Latest: Blacksmith direct builds — 6 November 2026

Blacksmith now compiles a real FM1 package locally and opens the existing install review. Workflow: Design → Build & install → Review → Write. ZIP export remains optional. Changes include custom colors/text/alignment/frame, PNG-to-16x16 embedded artwork and pixel painting; five oscillator types, transpose/level/pulse/vibrato; MIDI channel/fixed velocity/default octave/gain and USB audio settings. The starter remains monophonic; content attachments other than the screen-design import remain references, not sample/plugin playback.

New blacksmith_build.py creates immutable recipe/source snapshots under ignored data/blacksmith-builds/, compiles inside a pinned Linux Docker image without network, records provenance/logs/hashes, and only exposes verified ready artifacts. web/forge-install.mjs validates locally compiled packages separately from the unchanged catalog allowlist. Existing final backup/recovery/power acknowledgements and device checks remain. No hardware was flashed during development.

Real successful QA build: build-67b640c0c8b539e652a71f94, MY_FORGE.fwsc, 611490 bytes, SHA-256 e91fa0773921424671b0042e48f24144b6e5fbb973035c637038d825d051ccbd. Base 3c4a57eea659f942b0c80a99949dddafc094a57b; BSP 41a6e86d921f842243bd01a48111832f7e55b4e2. Download in C:/Users/Paulo/Downloads/MY_FORGE.fwsc matches the build. This is an assistant QA design, not a user-approved hardware installation. Two earlier failed QA builds remain visible and noninstallable. User source projects were preserved.

Docker Backend exited before becoming ready was resolved by stopping Docker and preserving stale socket directories under Local/Docker/run.blacksmith-backup-20261105, Local/Docker/run.blacksmith-backup-20261105-2 and Local/docker-secrets-engine.blacksmith-backup-20261105, then restarting. No factory reset, prune, WSL unregister, or image/volume deletion. Engine and /api/blacksmith/environment report ready. tools/blacksmith/setup.py prepares verified dependency caches and the Linux image; dependencies remain ignored locally. See THIRD_PARTY and BLACKSMITH_RESEARCH for exact provenance.

Validation: 51 Node + 34 Python tests passed. Real target compile passed platform size/RAM/register checks; actual host simulator passed channel filtering, note-on/off, octave, preset wrapping, nonzero bounded audio, and rendered the embedded art. Physical FM1 audio/flash untested. Browser light/dark, phone layout, controls/import/build/review/download verified; final console warnings/errors empty. Dark theme and running motion restored. Proof: C:/Users/Paulo/Documents/Codex/2026-11-02/can/outputs/blacksmith-v2/workspace.png and generated-screen.png.

Server http://127.0.0.1:8781/ remains running (exec session 45817). Browser deliverable is #forge. No remote publication. Earlier entries below are historical and their source-only/installation limitations have been superseded by this entry.

---
# Latest: Blacksmith — 5 November 2026

User requested a custom-firmware forge page and GitHub research covering UI, sound, presets, plug-ins and contents. Implemented Blacksmith (#forge) with a fifth sidebar/mobile link, page-specific banner/border rhythm and procedural 3D anvil. Existing themes, motion preference and the other four pages retained. Research and limitations: BLACKSMITH_RESEARCH.md; also linked/explained in README and OPEN_SOURCE_REPORT.

Pure Python source generator blacksmith.py adapts vendored unchanged fm1-base template at 3c4a57eea659f942b0c80a99949dddafc094a57b (MPL-2.0). Six source/license files have immutable URLs/hash provenance; hashes checked before generation. Generated app.c/app.h preserve notices and include changed screen, 1–8 mono sine/triangle presets, attack/release/filter, optional drive/crusher and PRESETS wrapping. Source ZIP includes recipe/presets JSON and build guide. No source compilation or flashing implemented. Do not call these installable firmware or add them to the installer allowlist.

Blacksmith has Screen/Sound/Modules/Contents/Research tools, approximate canvas/WebAudio audition, validated JSON import/export, browser drafts and immutable local source-kit saves under data/blacksmith/. Bounded WAV/SYX/FEP/PNG attachments are references only, not embedded/played. .fep requires compatible Felucca host; no desktop VST/AU. Future groovebox customization needs a separate SLOOP source integration. Build toolchain absent in checked native paths/env; WSL itself exists but distributions/toolchains not inspected/configured. No toolchain installed.

Browser-created QA project Blacksmith browser test (NIGHT FORGE), three presets, performance/ember, drive disabled and reference WAV, is saved locally as forge-977e429171fc3a55570ffcaa. Download verified at C:/Users/Paulo/Downloads/NIGHT_FORGE.source.zip. Full tests: 47 Node + 28 Python pass; see VALIDATION. Browser checks themes, forms, references, keyboard tools, save/download/reopen, validation, responsive 388px fit, audition route-stop and no logs. Proof in workspace outputs/blacksmith/blacksmith-dark.png. No hardware permissions or writes. Dark theme/running motion/normal viewport restored; deliverable tab on Blacksmith.

Server at http://127.0.0.1:8781/ now serves Blacksmith APIs/static files. Current server exec session: 42061. Earlier notes below describe historical server sessions. Runtime data remains Git-ignored. No GitHub remote publication performed.

---

# Session handoff — 2 November 2026

## User goal and preferences
Beginner M-VAVE FM-1 user. Wants lo-fi beats by playing repeating loops, keeping performed timing, pauses and held notes. Explain one step at a time. SLOOP is the leading candidate; QUANT OFF retains timing offsets within its note sequencer, not unrestricted audio capture. User is now focusing on firmware installation and wants to return to app development later.

## Confirmed device state
Windows host. USB interfaces FM-1 Audio and FM-1 Midi detected OK. Browser identity independently showed M-VAVE FM-1_015 / V15. Audio recording has not been tested. User is unsure whether saved sounds/sequences or unsaved edits matter, so treat them as worth preserving.

## Installation status
No successful backup has been confirmed in this conversation. No firmware installation has been confirmed. Do not infer either from the existence of a tool or backup button. No firmware package or matching recovery updater has been verified as downloaded. User may install independently after this handoff; ask for current device/version and backup result before resuming dependent work.

## Existing tools
- Earlier bratta/fm1-manager checkout: work/fm1-manager in parent workspace; local page was served at http://127.0.0.1:8768. Screenshot showed connected V15 but no completed backup result.
- fm1-editor.com Receive from FM1 dialog required V16 bank export; do not direct V15 users through that workflow or upgrade merely to enable it.

## FM1 Dock repo
This directory is the new local Git repo, main branch, initial commit 480cfec. Not published to GitHub.
Run Start.cmd or python server.py --open. Default http://127.0.0.1:8770. A server was left running but process persistence is not guaranteed.

Features: identify stock V14/V15 over Web MIDI; capture current sound; read all 128 saved sounds twice per voice; validate and persist JSON to data/backups; export Yamaha single voice or four 32-voice bank dumps; import Dock JSON; explicit bank restoration; local .fwsc vault with source and optional expected SHA-256; disk-integrity checks; guided handoff to SLOOP, official Open or factory installer.

Limits: no generic firmware writer; no sequence/global-setting/firmware-image or FM1-specific extension backup. Captures contain standard 155-byte DX7 VCED only. Bank restore sends a dump and requires choosing destination on physical device; it is reported as sent, not verified. Live capture/restore is untested on user's instrument. No device commands were sent during app development. No actual user backups or firmware assets have been added to Dock by the assistant.

Validation: 7 Node protocol tests and 4 Python server tests passed; UI inspected in browser. README documents limits and recovery references. data/ is Git-ignored. No dependency installation required for Dock; Python 3.10+ serves local UI.

## Next firmware steps
Confirm backup result before flashing. Save exact candidate version, maintainer source/checksum if available, compatibility and matching recovery route. The current SLOOP docs call it beta. Use developer's current prompts; keep power/USB stable. After installation confirm boot/version, keys/audio, then QUANT OFF before recording. Stock sounds do not automatically migrate to SLOOP projects.

Sources:
- https://github.com/isod89/sloop-fm1/blob/main/SLOOP.md
- https://isod89.github.io/sloop-fm1/webapp/installer/
- https://www.m-vave.com/appdownload
- https://github.com/m-vave/fm1_open
- https://github.com/czietz/fm1-read-voice

Recovery must be verified for the installed version. SLOOP documents M-UPGRADE plus matching official firmware for factory return, and its own OCT-minus-at-boot USB rescue. Do not assume SLOOP rescue exists on current stock firmware. Returning factory firmware does not restore unbacked-up user data.

## Confirmed backup update
User screenshot confirms all 128 presets captured in earlier FM1 Manager and downloaded. Independently validated Downloads/fm1-backup-2026-11-02.syx: 16,416 bytes, four Yamaha bank frames, all four checksums valid. Copy preserved in data/legacy-backups (not imported into Dock JSON library). SHA-256: 6b61d6f98ab2f98893a06cd551b9ef30f7b8b32864ad9cae5a192d77af48c081. Sequences/settings remain unbacked-up. Firmware installation remains unconfirmed.

## 3 November continuation
Working copy requested by user: C:\Users\Paulo\Documents\FM1-Dock. Original retained. SLOOP 2.8.4 installer showed Done, physical device booted to SLOOP tracks, and user confirmed audio works. QUANT OFF was instructed but not confirmed. Identify current firmware before backup; stock V14/V15 capture must not be used against SLOOP.


## 3 November catalog upgrade
User requested firmware cards with download, local storage and offline install. v0.2 adds seven seed entries, search/category filtering, add GitHub repo, release lookup, bounded package download, persistent offline library, and a pinned native SLOOP 2.8.4 adapter adapted from the GPL upstream installer. Combined app license is GPL-3.0-only; prior MIT retained. SLOOP package cached with published SHA verified. No device write or MIDI connection performed during this upgrade. Native support is only pinned 2.8.4; all other builds use maintainer tools. Current SLOOP data still needs its own backup support.

Catalog v0.2 final: eight seeds including factory firmware; 26 tests passed (16 JS and 10 Python), local SLOOP package hash verified, browser search/release lookup/review dialog checked. App default URL is now http://127.0.0.1:8781/#vault . No physical device access or firmware write performed.

## 3 November beginner UI + Studio overhaul
Version 0.3: routed monochrome Start here / Play & record / Firmware library / My backups; five genuine local preview images including earlier ORBIT host rendering, plus honest missing-preview placeholders. Three.js 0.187.0 MIT is bundled offline for sidebar kinetic shapes and page transitions. Studio has incoming MIDI notes/CC/program/bend display, unquantized note recording, editable canvas piano roll, browser/FM1 playback, MIDI/JSON export, JSON import, persistent notes-only projects, selected-input audio recording, waveform trim and WAV download. SLOOP read-only INFO/TRACK/NAMES snapshot is explicit. Physical buttons not exposed; ORBIT/SLOOP may share FM-1_900. No device commands, microphone permission or flash were performed during development. A clearly labeled one-note UI test take was saved to test persistence; it is not an FM1 recording. See OPEN_SOURCE_REPORT.md for reusable repos and exact scope.

Final v0.3 validation: 37 automated tests passed plus browser note persistence and generated audio trim/playback/export checks. Global operations use ownership flags so Studio cleanup cannot clear firmware locks. Catalog preparation/write refuses another active operation. CSP permits self/blob audio. Actual hardware tests remain pending.


## 4 November v0.4 preview and motion completion

Canonical app remains C:\Users\Paulo\Documents\FM1-Dock, usual URL http://127.0.0.1:8781/#vault. All nine curated firmware entries now have locally stored previews, checksums and credits. The three new community images are actual maintainer browser simulator captures (open.jpg, ambwave.jpg, 386dx.jpg); stock.jpeg is the user's unmodified landscape IMG_4137.jpeg from the stock V15 session, labeled personal/local use. Do not publish that personal photo without permission. Added retryable image-error state, eager detail preview and original full-size link. server.py serves bounded local PNG/JPEG/WebP paths and preview-render.mjs.

Replaced the subtle sidebar cube with an obvious main banner containing a real lit Three.js shape, rings and satellites; shapes morph on route changes. Moving type ribbon, heading word entrances, card staggers and home illustration motion share manual pause/reduced-motion controls. Banner remains visible on phones. Route visibility selectors are scoped to section[data-page], and scene state uses data-motion-page so scene attributes cannot hide the canvas. Pause does not cancel CSS animations permanently; resume restarts them. All dependencies remain offline.

42 automated tests passed, all nine image HTTP responses/hash/MIME checks passed, browser natural image sizes verified, pause/resume and route targets verified, measured 388 CSS-pixel phone layout checked. No hardware access or firmware write. Legacy backup and SLOOP cached package remain untouched. New current source version 0.4.0; hardware Studio/native flash validation remains pending from earlier work.


## 4 November v0.5 preset and drum monitor

User reported missing preset readings and drums shown as pitched notes. Implemented visible instrument reader / four track cards, ~1.2 s SLOOP 2.x polling, timestamped names/engines/kits and actual per-track MIDI channels via descriptors. Kit names read only when user naturally selects drums; reader never changes selection. Manual drum channel and kit label for unsupported firmware. Incoming drum notes have Kick/Snare/hat labels and pads; recordings use named drum lanes and keep optional per-event instrument metadata in saved/imported JSON. Original pitch/channel/timing and MIDI export stay intact. Browser preview uses a basic percussion sketch for labeled drums, not real FM1 samples. Old recordings without metadata remain unlabeled rather than guessing.

52 automated tests passed; standalone simulated browser test verified custom channel 6 drums, synth channel 11 on the same pitch, automatic preset/kit changes, and recording 808 then Dust without relabeling the first hit. Fake test data stored only under workspace outputs/fm1-dock-v05. Real MIDI access request did not complete in the in-app browser; physical device reading still needs a Chrome/Edge test. No physical port opened, device command or firmware write was verified during development. Canonical app served at http://127.0.0.1:8781/#studio . Version 0.5.0.


## v0.5.1 real-device identity regression

User's screenshot showed channel-10 input but no instrument names. Source audit found the shipped INFO version is FELUCCA SLOOP 2.8.4: firmware/src/ui.c defines FELUCCA_VERSION as SLOOP 2.8.4, and editor.c prefixes FELUCCA. The v0.5 guard wrongly allowed only FELUCCA 2.x or SLOOP 2.x, and the fake fixture used that shortened form. v0.5.1 accepts FELUCCA SLOOP 2.x and changes the default fixture to the real prefix. Unsupported errors now include the actual received version/protocol/track count and appear inside the black live card, with an inline Read instrument retry button. Actual hardware response remains unobserved; existing in-app tabs could not be accessed through browser control this turn. Do not confuse simulated confirmation with a physical-device read.


## 4 November piano layout

Rebuilt Studio incoming-note keyboard as 21 full-height white keys with 15 raised, overlapping black keys across C3–B5. Keys stay at least 52 CSS pixels wide, with a focusable horizontal scroller on small screens, readable note labels and depressed-key highlights. Updated live highlight lookup for nested keys. Browser DOM checks verified desktop placement, simulated C4/C-sharp4 note-on/release, 388px phone layout (1092px scrollable bed, no page overflow), and hidden piano when drums selected. No physical MIDI port opened or device writes. Browser screenshot capture was unavailable during this check; visual screenshot review could not be completed.


## 5 November v0.6 minimal UI overhaul

User requested one title per page and less copy. Replaced the generic motion banner plus page hero with one shared dynamic h1 and compact route-morphing sculpture. Simplified rail to Home / Studio / Firmware / Backups; Home is three animated entry cards with optional connection help. Studio uses a side-by-side live monitor/instrument panel, one instrument read button, full piano monitor, concise recording controls, expandable edit/file tools (note selection auto-opens editing), and shorter audio/activity copy. Firmware adds keyboard-accessible Explore / Saved tabs and two-line summaries with full descriptions in modals. Backups retains stock/SLOOP distinctions, current/full capture controls, original .syx, restore/import and swap review; long explanations and hashes moved to disclosures. Installation safeguards and device protocol unchanged. Help is reachable in footer on mobile.

39 Node + 15 Python tests pass (HTTP tests needed unsandboxed loopback access). Browser verified all four routes have one h1, desktop layout, 388 CSS-pixel phone width with no page overflow, all nine loaded previews, collection keyboard tabs, details, Audio mode, connection/help dialogs, existing UI-only test take opening, note creation at 1.25s and import/export controls. Edits tested in browser memory only; no new project saved, no MIDI/audio permissions or device commands. Screenshot proof in workspace outputs/ui-v06/home.jpg. Local app continues at http://127.0.0.1:8781/#home . Version 0.6.0. Real device preset reads and native flash remain unverified.


User requested the original slogan back: Home now uses Small synth. / Big ideas. in its existing single h1. No second hero or slogan block added.


## 5 November v0.7 firmware library and installation

User requested improved cards/details, more firmware, and in-app installation. Async clarification answer 1 means ADD THE FEATURE ONLY, not flash ORBIT now. No hardware MIDI permission, device probe or flash was performed.

15 curated projects / 15 local previews: six additions are Clipper, Skiff, CoralFlower, Araminta, Moondaw and Mutable Dreams. Cards show source/version/status; details use image + concise action panel, sticky title, expandable attribution/links. Clipper artwork and Araminta boot screen are labeled artwork. New Install in Dock filter; Saved contains exact native builds.

Reviewed native manifest install-builds.json has ORBIT 1.0.0, SLOOP 2.8.5, SLOOP 2.8.4 and Clipper 1.3.1. Exact size, SHA-256, FM-1_900 marker, immutable URL and per-build recovery link are mandatory. Same documented two-stage Felucca-family loader protocol; unknown files and other families remain creator-install only. Catalog cache cannot replace canonical pins. Server re-derives approval from bytes, client rechecks before probing. Generic FM-1_900 reboot identity only confirms reconnection, not name/version; completion message says check device screen/audio. Hardware flash remains untested. Four supported files are cached under ignored data/firmwares; Mutable Dreams 1.4 was also saved through the real browser flow and stays creator-install-only. Original factory backup hash unchanged.

Testing found Mutable Dreams uses extended identity FM-1_710010400. Storage accepts bounded extended FM1 numeric identifiers; reviewed installation approval remains exact FM-1_900 files. Added in-modal save progress/errors instead of hiding failures behind a dialog.

47 Node + 19 Python tests pass (66 total, no skips), plus actual HTTP hashes/MIME for all 15 previews, downloads/hash/size of all four supported files, browser native filter, build switching and checksum/recovery review, disabled write without device, save workflow for Mutable Dreams, Saved list, 388px phone layout without horizontal page/dialog overflow. No hardware writes. Main server restarted with new endpoints and retained session 1915 at http://127.0.0.1:8781/#vault . Version 0.7.0.


User explicitly chose the original Sound takes / shape. motion banner as the ONLY shared header across all pages. Replaces the previous dynamic Home/Studio/Firmware/Backups h1 (including Small synth / Big ideas); no second hero/page title added. Restored soft panel, original eyebrow, per-route one-line subtitle, procedural 3D caption, pause/resume and moving PLAY / SHAPE / REPEAT ribbon. Existing route morphing and reduced-motion preference retained.
Verified all four routes: one h1 and one banner each, correct sculpture route target. Pause/resume covers scene and ribbon. Phone viewport 388 CSS px / page width 365 / banner width 325, no page overflow. Restored normal viewport and original running-motion preference. Browser screenshot capture repeatedly unavailable this turn, so no new screenshot artifact was produced. JS syntax and whitespace checks passed.


The user requested unique headers per page while keeping the restored single-banner design. Home: Sound takes / shape.; Studio: Catch your / rhythm.; Firmware: New sounds. / Same synth.; Backups: Keep your / sound. Each has its own eyebrow, short subtitle and marquee words. Existing page-specific 3D morph targets stay in place. Exactly one shared h1 is updated on navigation, resetting kinetic text preparation and accessible name correctly.
Browser checked every route: four distinct h1 accessible names, unique ribbon strings and matching 3D morph states; one h1 on each route. JS syntax and whitespace checks passed.

## 5 November page-specific sculptures

User asked for the banner's 3D object to be unique as well. Replaced one deforming model with four distinct procedural models: woven orbital loop (Home), breathing capsule waveform (Studio), eight expanding/rotating cube modules (Firmware), and four sliding file plates inside a wireframe vault (Backups). Transitions cross-fade and scale between groups. Existing offline Three.js dependency, MIDI pulse hook, 30 fps cap, visibility/intersection suspension, pause and reduced-motion handling retained. CSS fallback also has separate waveform/modules/archive silhouettes. Camera pulls back on narrow canvases to keep models inside the banner.

Browser visibly checked all four WebGL models with exactly one h1/banner and the correct single model after navigation while paused. Running frame/phase advanced, paused phase stayed fixed through navigation, resume restored motion. 388 CSS-pixel phone layout has no horizontal overflow and displays the full firmware sculpture. No console errors. Normal viewport and running-motion preference restored; deliverable tab left on Firmware. Screenshots: workspace outputs/sculptures/{home,studio,firmware,backups,mobile}.jpg. JS syntax and git whitespace checks passed. No device operations.

## Connected sidebar and top-bar flow

User requested unique side/header designs per page and connected motion. Added a desktop sidebar canvas rendering the SAME Three.js scene at the same phase as the banner (second low-resolution renderer, shared models/materials/lights). Page-specific side frames, small 01–04 index, moving meter, top-bar signal with wave/modular/file silhouettes, and faint unique banner patterns. Navigation uses one sliding highlight; forward/back page entrances have perspective and directional movement. Traveling sidebar/header edge highlights connect the shell. No extra heading or marketing copy. Mobile hides the secondary scene and retains a compact top signal and horizontal gliding nav marker.

Kept assets within existing served app.js/style.css/index.html/kinetic.js routes, so no server restart or endpoint changes. Browser checked all four routes, synchronized rail/main phase while running and paused, keyboard Enter navigation, forward/back direction, pause/resume, one h1, 388px mobile with no horizontal overflow or control overlap, matching mobile nav marker, and no console errors. Restored normal viewport and running-motion preference. Screenshots: workspace outputs/flow-shell/{home,studio,firmware,backups,mobile}.jpg. JS syntax and whitespace checks passed. No device operations or permissions.

## Border-only correction

User clarified they want design/motion in the borders, not standalone sidebar/header elements. Removed the sidebar scene/canvas/frame/meter/index and center header signal, including the extra WebGL renderer. Main banner 3D sculptures remain. One fixed, pointer-transparent SVG path runs up the sidebar edge, around a 12px corner and across the header bottom; a light bevel/track and animated metallic stroke give it depth. Four page-specific dash rhythms transition on the SAME persistent path/animation timeline. Existing navigation glide and directional entrances retained. Header is sticky; scroll/resize observers recompute the path using actual SVG dimensions (including scrollbar space), with a phone left-edge variant.

Browser checked all four rhythms and correct banner models/one h1; paused dash offset stayed -228.481 across route changes. Pause/resume works, border ignores pointer input, Connect dialog remains usable. Mobile 388px has no horizontal overflow; sticky header/path recomputed after PageDown. No console errors. Normal viewport and running motion restored, deliverable on Firmware. Screenshots: workspace outputs/border-flow/{firmware,mobile}.jpg. JS syntax and whitespace checks passed. No hardware operations.

## Light/dark themes

Added an accessible top-bar Dark mode / Light mode toggle. Browser preference persists; first visit follows OS color scheme, with system/storage listeners and guarded localStorage access. Converted both stylesheets to a shared 61-color palette, retained natural photos and physical piano keys, kept live/recording displays dark, improved faint light-mode labels, disabled-control readability and keyboard focus outlines. Three.js materials invert on theme events even while paused; border gradient and fallback CSS adapt. The nav marker is now a traveling outline with an immediate solid active-link background, preventing white-on-white or dark-on-dark text during navigation. Dark ticker text is brighter.

Found reload persistence failed because the inline bootstrap was blocked by script-src 'self'. Replaced it with external web/theme.js and an explicit server static route; CSP unchanged. Added module-level fallback. Local server was no longer running after the continuation; restarted with loopback access, retained exec session 31216 at http://127.0.0.1:8781/. Do not stop it. Both saved themes verified through reload, including canvas theme. Dark mode left selected, normal viewport restored, motion resumed, deliverable tab on Firmware.

Browser checks cover all four pages in both themes, Audio controls in both themes, connection/help/details/install-review dialogs, keyboard Enter/focus on theme toggle, responsive 358/388 CSS-pixel layouts and no horizontal overflow/control overlap. DOM text contrast sampling used 4.5 normal / 3 large text with ancestor background compositing and first gradient stops, excluding disabled/decorative text; checked dark route counts 50/113/208/66, no remaining sampled failures. Piano labels manually verified against actual gradients. No console warnings/errors. Existing server tests: 4 pass; /theme.js returns 200 text/javascript under unchanged CSP. JS syntax and git whitespace checks pass. No hardware permissions, audio capture or firmware writes. Proof: workspace outputs/dark-mode/firmware.jpg and mobile.jpg.
