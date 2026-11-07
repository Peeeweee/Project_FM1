# FM1

A beginner-focused local workspace for the M-VAVE FM-1, with a black-and-white interface, real firmware previews, a MIDI/audio studio, backups and supported offline firmware installation. Version 0.7.0, development preview.

The interface uses three bundled fonts offline: Space Grotesk for the brand and headings, DM Sans for readable controls and text, and IBM Plex Mono for device-style labels.

## Start

Double-click **Start.cmd** in this folder. Python 3.10+ is required; no npm install or build is needed to use the app. Open **http://127.0.0.1:8781/#home** in desktop Chrome or Edge. Keep the server console open. All frontend scripts, 3D dependencies and preview images are bundled locally.

## Choose a task

- **Home:** three direct paths and optional connection help.
- **Studio:** live USB MIDI notes and activity, editable note takes, saved note projects, MIDI export, audio recording, waveform trim and WAV export.
- **Firmware:** 20 seed entries and 20 credited local previews; beginner detail views; saved packages; optional GitHub release lookup. Browsing/downloading never flashes the FM1.
- **Backups:** original stock .syx copy plus supported V14/V15 sound capture, a handoff to SLOOP's project/sample backup tool, and a verified local recovery package for a matching reviewed firmware version.

## Minimal layout

One kinetic banner is the sole page header, with unique headlines and ribbon text for Home, Studio, Firmware and Backups. Home links to Studio, Firmware and Backups. Studio keeps editing and file formats in expandable controls; selecting a note opens its editor. Firmware has Explore and Saved tabs with keyboard navigation. Card summaries are limited to two lines; full descriptions and credits remain in details. Backup scope, installer review and data-loss acknowledgements remain available at their relevant steps.

## Record and edit

Connect the FM1's MIDI input/output using the top-right connection dialog. Hardware notes are shown only when its firmware sends MIDI output. The Notes tab captures note start/length/velocity/channel without grid quantization. Move notes in the piano roll, double-click to add, select a note and edit its fields, or delete the selection. Play through a simple browser instrument or explicitly choose the connected FM1. Export .mid or JSON; save/reopen note projects on disk in data/projects.

The Audio tab requests audio permission only when the user clicks Find inputs. Choose the FM1/Felucca USB audio input; a laptop microphone records the room instead. Record, stop, adjust trim start/end, preview and export a PCM16 WAV. Monitoring is off during recording. Audio is kept in browser memory and must be downloaded separately; it is not included in note-project JSON. This is a single-take audio workspace, not a full multitrack DAW or plugin host.

The SLOOP snapshot button sends documented read-only INFO/TRACK/NAMES requests, not settings writes. It can show selected track and preset names for compatible firmware. Physical button-down states are not exposed. Product identities can be shared by SLOOP/ORBIT and other derivatives, so they cannot establish the exact family/version. Instrument readings can update automatically; these are snapshots, not continuous screen mirroring. MIDI projects currently do not record sustain/controller/pitch-bend automation; choose audio to capture the resulting sound.

## Motion and accessibility

Use **Dark mode / Light mode** in the top bar to switch themes. Your choice is saved in this browser; the first visit follows your system preference. The UI palette, controls, dialogs, focus outlines, border animation and 3D materials adapt together. Firmware photos, the physical piano keys and dark recording displays retain their natural colors. Theme startup is a local script allowed by the existing content security policy.

Three.js 0.187.0 draws a different procedural sculpture per page: Home's woven loop and orbits, Studio's dimensional waveform, Firmware's floating modules, and Backups' layered archive. Each has its own movement; route changes cross-fade between them, and incoming notes add a pulse. Rendering is capped at 30 fps, pauses when hidden/offscreen, respects reduced motion, has a manual pause and uses page-specific 2D fallbacks without WebGL. Page transitions and word entrances use native Web Animations. Preview errors show a retry button; detail views offer the original full-size image. One banner carries each page's title and moving word ribbon, including on narrow layouts. Scene, moving type and card entrances share the pause control.

One continuous beveled border travels up the sidebar, rounds the corner and continues across the header. Its dash rhythm changes per page without restarting the animation. The sticky header keeps that edge aligned while scrolling, including on phones. A persistent navigation highlight slides between destinations; directional page entrances and page-specific banner textures complete the transitions. Pause/reduced-motion controls apply throughout. The main banner is the only decorative 3D scene; sidebar and top-bar interiors stay clear.

## Firmware and backup implementation details

## Back up

1. Find MIDI ports; choose the FM1 input and output; Connect & identify.
2. Capture current sound first if unsaved edits matter. This reads without changing the preset.
3. Acknowledge preset switching, choose the correct MIDI channel and Back up all 128.
4. Each sound must return two identical validated responses. A failed/cancelled capture is not saved as a complete backup. Four identical initial presets trigger a stop because preset switching may not be working; genuinely identical first four sounds also require a different/manual workflow.
5. The local server saves validated JSON to `data/backups` and reads it back to verify SHA-256. Download a copy and export DX7 SysEx. Full exports contain four 32-voice Yamaha banks; single captures contain one Yamaha single-voice dump.

Supported capture protocol: stock FM-1 V14/V15. An identity string is self-reported, not proof of original firmware authenticity. Alternative firmware can report the same identity. No probing of other memory addresses is performed. Unknown firmware is refused for capture/restore.

### What is NOT captured

Sequences, global settings, firmware image, FM1-specific parameters beyond standard 155-byte DX7 VCED, projects and samples. This is **not a complete-device image**. An existing `.syx` backup from another editor is not a backup made by fm1; keep it separately. Firmware switching may lose anything outside this capture. Stock sounds do not automatically become SLOOP projects.

## Restore sound banks

With stock V14/V15 identified, an intact full capture offers Restore A/B/C/D. After the explicit overwrite confirmation, the bank is sent; choose the corresponding destination on the FM1's screen. Repeat for each bank. The app reports only **sent**, not verified. Re-capture and compare exported sound parameters after saving. This physical-device workflow has not yet been tested on the user's FM1. Single-current-sound captures can be exported, but the app does not directly restore them because single-voice SysEx may overwrite the selected preset.

## Firmware catalog, downloads and offline installs

The catalog starts with 20 instruments, a search field and category filter. Cards show credited preview images, creator, version and install/save status. Newly added projects include X0X, Melodee, Optimist, Fmini-1 and Saadet. Details show a compact image/action split. The Install here filter selects the three supported firmware families; all four builds are in Saved after caching. **Links & releases → Check releases** fetches the latest numbered GitHub release and offers its `.fwsc` assets. Add another public GitHub `owner/repository` to extend your personal catalog. Entries without numbered releases retain their maintainer link. Rate limits and connection failures leave already cached data usable.

- **Save to laptop** fetches the selected package through the local server, checks any published SHA-256, and stores it in `data/firmwares` with metadata and a recomputed hash. It never sends MIDI.
- **Save & review install** saves a supported build first, then opens final review. It does not start a write automatically.
- **Review install** reads the package entirely from the local vault. No internet is needed for package validation or writing once the app and package are present.
- **Download** downloads the saved package to another folder through the browser.
- Imported `.fwsc` files are hashed and may be retained even when no native installer is available.

### Native installation support

Four exact packages have reviewed native installation support: **ORBIT 1.0.0**, **SLOOP 2.8.5**, **SLOOP 2.8.4**, and **Clipper 1.3.1**. Their bytes, sizes, FM-1 product markers, immutable release URLs and recovery links are pinned in `install-builds.json`. They share the documented Felucca-family two-stage M-UPGRADE flow. Unknown builds, factory firmware, SMK-37 variants and other catalog entries use creator tools; matching a filename or product marker never enables installation. Both Python and the browser verify the exact package. Native transfers pass simulations and package validation, **not a physical FM1 flash test**. All reviewed builds currently report FM-1_900, so a matching reboot identity confirms reconnection, not the firmware name/version: the user must check the screen and audio.

Connect and identify the instrument first. The review dialog names the package/device and checksum, describes data loss and recovery, requires the relevant acknowledgements and typing INSTALL, and starts writing only on **Write firmware to FM1**. Cancel/reconnect/capture controls are locked during writing. The adapter uses the upstream two-stage verification/loader/write flow, limits read requests to package bounds, rejects foreign update loaders for resume and before normal stage-two writes, and checks the post-reboot identity. After an interruption it does not automatically retry or claim success. Keep the device connected and follow its recovery documentation.

Before installation, **Back up before installing** opens Backups. **Keep a way back** lets you choose the exact current version from the reviewed package list, save its verified `.fwsc` to the local vault, and download another copy. The app cannot identify the installed version from USB identity alone, so check the FM1 screen. This saves an installable creator package, **not** a dump of the firmware currently in the chip. Factory and other firmware versions require their matching creator package and instructions. Full flash readback requires a separate chip download-mode tool; normal USB MIDI cannot perform it. Save projects, samples and sounds independently with the tool for the installed firmware.

The existing Plan a swap section is a separate handoff to maintainer tools. Your original stock `.syx` backup is kept in `data/legacy-backups`; it is not automatically imported as an fm1 JSON capture. Current SLOOP projects/samples still require SLOOP's own backup facilities. Firmware save formats are not interchangeable.

Package downloads and catalog cache are not committed to Git. Runtime network fetching is restricted to approved GitHub HTTPS hosts, bounded in size and timeout, with redirect checks. There is no arbitrary URL download proxy and downloaded firmware is never executed by the server.

Sources and recovery references:
- SLOOP: https://github.com/isod89/sloop-fm1/blob/main/SLOOP.md
- Upstream adapter source: https://github.com/isod89/sloop-fm1/blob/main/docs/webapp/installer/index.html
- Official Open: https://github.com/m-vave/fm1_open
- Factory downloads: https://www.m-vave.com/appdownload

For SLOOP-to-stock recovery, follow SLOOP's current M-UPGRADE instructions and matching factory package. Its OCT-minus USB rescue is a SLOOP feature, not an assumed stock bootloader function. No updater can guarantee recovery from interrupted flash/power.

## Blacksmith: design a starter instrument

Open **Blacksmith**. Choose a screen layout, custom colors, labels and a 16 × 16 pixel design (paint it or import a PNG). In **Sound**, search 288 original synth recipes by name or type, preview a C4 note in the browser, and add favorites to your project. Each firmware build holds up to eight selected sounds; you can rename and edit them. These are synthesized parameter settings, not recorded samples or factory FM1 patches. Settings include MIDI receive channel, fixed/touch velocity, default octave, note/keyboard visibility and USB audio. Browser audition/layout remain approximations.

Choose **Build & install**. The app snapshots your design, generates real C, compiles it locally in the isolated Linux builder and checks the resulting `.fwsc`. A successful build opens the existing final install review directly. Connect/identify the FM1 there and use **Write firmware to FM1** after reviewing the matching build, backup/recovery and power acknowledgements. **No ZIP download is required.** A failed/interrupted build cannot be installed; its source/log is preserved. Builds and compiled bytes are kept under `data/blacksmith-builds/`; each package is hashed and rechecked before download and before device access. The platform's extended identity query is used for these builds. Hardware flashing has not been validated on this user's device.

The compiler was prepared on this laptop. Keep Docker Desktop's Linux engine running. For a fresh checkout run `python tools/blacksmith/setup.py` once, then choose Check tools. Setup fetches pinned fm1-base/BSP, a hash-checked vendor toolchain and three exact SDK packaging files, and prepares the compiler image. Image/dependency caches stay local and Git-ignored; builds run without network access. Setup does not reset Docker or flash a device.

**Save project** keeps an editable source kit under `data/blacksmith/`; its ZIP and project JSON are optional exports. Old projects receive defaults for the new controls. This remains a one-voice instrument, not a SLOOP groovebox, sampler or plug-in host. The design's pixel art is embedded in the actual screen; files in Contents remain references only. See [BLACKSMITH_RESEARCH.md](BLACKSMITH_RESEARCH.md) for researched platforms and format/license boundaries. Local compiled builds have their own provenance checks, separate from the catalog's reviewed-release allowlist.

## Storage and privacy

`data/` is ignored by Git. It contains immutable, uniquely named backup/firmware files and metadata. No delete API is exposed. Copy that directory to another drive for a second backup. No cloud uploads, analytics or external frontend library is used. Catalog refresh and package download contact GitHub only when requested; maintainer links open externally. File integrity is recomputed on listing/download. The server restricts Host/Origin and requires a per-process session token for writes; it is not an authenticated multiuser service. Run on a trusted personal computer.

## Validation

```powershell
node --test tests/*.test.mjs
python -m unittest discover -s tests -p "test_*.py"
```

Tests exercise protocol framing/checksums, read-response filtering, backup scope, bank export format, on-disk persistence, tamper detection, hash mismatches, path isolation, API session/origin checks and traversal rejection. Live device capture, physical bank save, cross-firmware migration and firmware writes have not been validated by these tests.

## Repository

This is a local Git repository. No GitHub repository is created or published automatically. Data and firmware packages are excluded from source control. See THIRD_PARTY.md for protocol references and attribution.

## License

The combined v0.2 application is GPL-3.0-only because it includes the attributed SLOOP/Felucca updater. Original MIT portions and notices are retained in LICENSE-MIT and THIRD_PARTY.md.

## Research and credits

See OPEN_SOURCE_REPORT.md for reusable GitHub projects, licenses, firmware preview sources, USB telemetry limits and next-phase options. Preview files retain their repository licenses in docs/licenses and source metadata in previews.json. Three.js MIT license is in web/vendor/THREE-LICENSE.txt. No remote frontend dependency is loaded. Native firmware writes and live FM1 recording still require hardware validation; development checks do not prove physical-device compatibility.


## Instrument and drum readings (v0.5)

Open Play & record and connect your FM1. The visible Read instrument & presets button reads SLOOP 2.x track/engine/preset state and the actual configured MIDI channels. Keep readings updated refreshes about once every 1.2 seconds while the Studio is visible (including MIDI recording); it pauses during other device operations. The timestamp is the last snapshot, not sample-accurate screen mirroring. Factory V14/V15 can read the current voice name instead. Other firmware can use the manual drum-channel/name fields; manual labels are marked as such.

SLOOP's drum engine marker, channel settings and 16 canonical outgoing GM note numbers determine the drum labels. No automatic channel-10 guess is made. Drums appear as Kick, Snare, Closed hat, etc., with a named-pad display and drum timeline lanes; the original MIDI pitch/channel/timing remain unchanged. Kit names come from the device's KIT descriptor when the user selects the drum track. The reader never selects a different track just to fetch names. Until then, an unnamed kit is explicitly numbered. Browser playback is a basic synth/percussion sketch; Connected FM1 or recorded Audio is needed for the actual sound.

Each newly recorded MIDI event can retain its last-read instrument kind, engine, loaded preset/kit, track and reading timestamp. Labels persist in project JSON and the laptop library. They describe the last snapshot at note-on; preset parameter edits and full patches are not embedded or restored automatically. Older projects remain readable and are not given invented instrument labels.

Version 0.7.0 fixes recognition of the shipped FELUCCA SLOOP 2.x identity and places retry/error status directly in the live card.
