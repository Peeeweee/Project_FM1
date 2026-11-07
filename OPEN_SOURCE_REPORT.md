# fm1: open-source research and implementation

Prepared 3 November 2026. This report uses maintainer repositories and documentation. The local application is a development preview; its new live-device recording and native flashing paths still need testing on the user's FM1.

## What was reused

| Project | License | How it is used |
| --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | MIT | Version 0.187.0 bundled locally. A real WebGL sculpture morphs between shapes as pages change and reacts to incoming notes. No remote models or textures. |
| [SLOOP / Felucca updater](https://github.com/isod89/sloop-fm1/blob/main/docs/webapp/installer/index.html) | GPL-3.0-only | The shared two-stage updater. Exact reviewed SLOOP, ORBIT and Clipper packages are listed in install-builds.json; unknown builds remain disabled. |
| [fm1-read-voice](https://github.com/czietz/fm1-read-voice) | MIT | Documented stock V14/V15 current-voice read protocol. Reading all saved voices still excludes sequences and settings. |
| [SLOOP editor](https://github.com/isod89/sloop-fm1/blob/main/docs/webapp/editor/index.html) | GPL-3.0-only | Protocol reference for explicit, read-only track/preset snapshots: INFO, TRACK with no argument, and NAMES. No polling or settings writes are sent automatically. |

Page movement uses the browser's Web Animations API rather than an extra animation dependency. MIDI capture uses Web MIDI; selected-input sound recording uses MediaRecorder and Web Audio. All application scripts and 3D dependencies are local, so cached firmware and core studio UI do not require an internet connection.

## Other useful GitHub projects

| Repository | License | Good fit / limitation |
| --- | --- | --- |
| [Motion](https://github.com/motiondivision/motion) | MIT | Spring and layout transitions if the interface needs more advanced motion later. Native transitions suffice for this version. |
| [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js) | BSD-3-Clause | Waveforms, recording interface, region selection. It is not an audio processing engine: regions alone do not trim/export PCM. |
| [Tone.js](https://github.com/Tonejs/Tone.js) | MIT | Browser instruments, effects and audio-clock scheduling. Consider when adding a richer software instrument or mixer. |
| [Tonejs/Midi](https://github.com/Tonejs/Midi) | MIT | A fuller MIDI-file import/export library for future editing workflows. |
| [webaudio-pianoroll](https://github.com/g200kg/webaudio-pianoroll) | Apache-2.0 | Reusable drag/resize piano-roll component. No audio generation of its own. Current fm1 includes a small purpose-built canvas editor. |
| [waveform-playlist](https://github.com/naomiaro/waveform-playlist) | MIT | Multitrack audio, recording, fades, cues and WAV export; worth evaluating for a full DAW phase. Its integration is larger than a waveform widget. |
| [GridSound DAW](https://github.com/gridsound/daw) | AGPL-3.0 | Full DAW architecture reference, with many submodules. A whole-app fork is substantially more involved than adding a component. |

These are research candidates, not claims that all are installed. The combined fm1 application remains GPL-3.0-only because it includes the upstream updater; original MIT notices and each preview's licensing remain preserved.

## Genuine firmware visuals

The initial 3 November library included five real maintainer previews; 4 November adds the four remaining images as described below. Screens can differ from current releases, so captions avoid claiming current hardware equivalence. Full immutable source URLs, hashes and licenses are in previews.json and corresponding licenses/readmes in docs/licenses.

| Firmware | Source | License / caption |
| --- | --- | --- |
| SLOOP | [Live tracks](https://github.com/isod89/sloop-fm1/blob/91f30182d9095e0ecdb43396554f2ce5a67df179/assets/screens/live-tracks.png) | GPL-3.0-only; maintainer screen preview |
| Felucca | [Screen montage](https://github.com/hugelton/Felucca/blob/40762f24282a7a2a6cfa86fe51deb78d3b4cc656/docs/screens.png) | GPL-3.0-only; several UI screens |
| AMB-1 | [Garden](https://github.com/charlesvestal/fm1-amb/blob/62a588ab102b5f1cf5e4aa72553694eaa7ddaaa5/docs/img/screen-garden.png) | MPL-2.0; credit Charles Vestal; current repo relicensing is documented |
| AISLING | [Main screen](https://github.com/stephencummins/fm1-aisling/blob/6ce129ddf7c56ef081989ceba18b2770ef0b43d4/docs/img/screen-main.png) | GPL-3.0-only; credit Stephen Cummins and inherited platform attribution |
| ORBIT | [Host-rendered UI](https://github.com/dspaudio/orbit/blob/055a44d8e771940aedbabf0c64a061fc7caf173c/docs/orbit-demo-0.3.png) | GPL-3.0-only; earlier native host rendering, not a hardware photograph or a v0.10 capture |

No genuine raster UI asset was found for the other catalog entries in their inspected repositories. Their actual maintainer browser simulators were subsequently captured, and the stock entry uses the user's original hardware photo. AmbWave's inherited Felucca images are not passed off as AmbWave screenshots. No firmware binary is committed to the source repository.

## What USB can tell us

SLOOP's [MIDI/audio guide](https://github.com/isod89/sloop-fm1/blob/main/GUIDE.md#21-midi) documents USB MIDI output and stereo USB audio. The audio input may be named Felucca. Its configuration determines whether keys or sequencer events are sent.

- Live MIDI note-on/off, velocity, channels, program changes, controllers and pitch bends can be displayed **when the FM1 actually sends them**.
- MIDI recording retains note timing and duration without quantization. This version saves notes only, not sustain/controller/pitch-bend automation; audio captures the resulting sound.
- SLOOP INFO/TRACK/NAMES requests can read a snapshot of selected track and preset names. It is not a continuous mirror of the physical display.
- Physical button-down states are not supplied by this snapshot. Remote button CC commands describe commands sent *to* the FM1; they do not prove button presses are emitted *from* it.
- ORBIT and SLOOP can share FM-1_900. A USB product identity alone cannot identify the actual firmware family or exact version. Read the physical screen and firmware-specific information before taking firmware-specific actions.

## Current editing scope

The Studio is a small local recording workspace, not a complete multitrack DAW. It records, moves, adds, deletes and edits MIDI notes; plays through an explicit browser instrument or FM1 MIDI output; saves/reopens note projects; exports standard MIDI; records a selected audio input; opens an audio file; trims a single take; and exports PCM16 WAV. Audio takes must be downloaded separately. There is no multitrack audio mixing, plugin hosting, full hardware remote control or automatic SLOOP project/sample backup in this version.

Motion respects reduced-motion preferences, can be paused, and falls back if WebGL is unavailable. UI operations during device writes/recording are locked to prevent overlapping device operations. No microphone permission or firmware write was accepted automatically during development.


## 4 November preview and motion completion

All nine curated instruments now have local images. Five are the existing maintainer assets; FM1 Open, AmbWave and 386DX use actual maintainer browser-display captures; factory firmware uses Paulo's original stock-device photograph. The detail view identifies provenance and opens the full-size original. Local PNG/JPEG routes, image load state and a retryable failure placeholder avoid broken icons. Missing previews on newly added custom repositories remain honest placeholders.

Motion now lives in the main workspace on desktop and phone layouts: a lit procedural 3D mesh, orbit rings and satellites, pointer response, route-specific shape morphing, animated typography, a scrolling type ribbon and staggered card entrances. Pause motion freezes it; reduced-motion preferences produce a still composition. Offscreen/hidden scenes stop rendering. Three.js is bundled locally; no new runtime dependency was added.


## Instrument telemetry and drum naming (v0.5)

The read-only adapter follows SLOOP commit 91f30182d9095e0ecdb43396554f2ce5a67df179: firmware/src/editor.c (INFO/DUMP/DESC/NAMES/TRACK/TRACK_DUMP), drums.c (drum engine and lane names), seq.c (outgoing MIDI channels and drum notes), and params.c (CH1..CH4 descriptors). Source: https://github.com/isod89/sloop-fm1/tree/91f30182d9095e0ecdb43396554f2ce5a67df179/firmware/src . Preset/kit names are read from the connected device; the adapter does not substitute a fixed list of factory sounds. Channel settings are discovered by descriptor label instead of hard-coding channel 10. Other firmware has an explicit manual fallback. Snapshots poll about once per second and are timestamped; they cannot establish sample-accurate preset changes between polls. Recorded metadata identifies the last read at note-on. Raw hardware-button telemetry is still not claimed.


## 5 November 2026: catalog and in-app installation

Added six FM1 projects from primary repositories, with six locally bundled, credited GPL-3.0 previews: [Clipper](https://github.com/isod89/clipper-fm1), [Skiff](https://github.com/illuminus5/skiff), [CoralFlower](https://github.com/FicusFicusov/CoralFlower), [Araminta](https://github.com/Wulgaren/Araminta), [Moondaw](https://github.com/jaeggerr/moondaw-fm1), and [Mutable Dreams](https://github.com/kidbee85-beep/mutable-dreams). Clipper artwork and Araminta's boot screen are labeled as artwork, not live control screenshots. Exact image source commits, captions and hashes are in previews.json.

The ORBIT 1.0.0, Clipper 1.3.1 and SLOOP 2.8.5 GitHub release assets were downloaded, matched to GitHub's SHA-256 digest and size, and parsed as FM-1_900. Their source updater flows were reviewed at ORBIT commit 1dbb77d61236d77ef363af1f4c8620e0c2996480 (web/fm1ota.js, web/fm1pkg.js, web/installer.js), Clipper 7bc15a950a8b3fd51aec280514905448e4faaf1b (web/fm1ota.js and tools/fm1_install.py), and SLOOP bac9c05ea7627449405aa10e48da21d75b6c8c56 (docs/webapp/installer/index.html). Same upgrade command, bounded read/response format, 512-byte maximum, two finish addresses (0xE0000000 and 0xF0000000), and FM1 9xx loader family. fm1 retains its stricter FM1-only / 9xx loader checks and pins exact package bytes. Other builds are not implicitly approved. No new third-party updater code was executed or incorporated.

Native support is defined by install-builds.json, separate from catalog cache and user-supplied checksums. The old SLOOP 2.8.4 source URL is now immutable and was re-downloaded to verify its original digest. A shared FM-1_900 identity is not proof of the installed firmware version; the completed-transfer message asks the user to confirm the device screen and audio. Physical flashing remains untested in fm1.

# Blacksmith addition — 5 November 2026

Custom screens, synthesis and preset banks are possible through an FM1 source build. Blacksmith now exports real modified C source kits using Charles Vestal's MPL-2.0 fm1-base template, pinned to 3c4a57eea659f942b0c80a99949dddafc094a57b: https://github.com/charlesvestal/fm1-base

Other researched routes: SLOOP's groovebox source/build (https://github.com/isod89/sloop-fm1/blob/main/BUILDING.md), Felucca's MIT engine and compatible-host .fep SDK (https://github.com/hugelton/Felucca-Engines#plugins), the manufacturer's Open SDK (https://github.com/m-vave/fm1_open), and the MPL hardware layer (https://github.com/hugelton/felucca-bsp). Full capability/license boundaries are in BLACKSMITH_RESEARCH.md in this local repo. These formats are not interchangeable; desktop VST/AU binaries do not run directly on the FM1.

The current generator is a one-voice starter, not a SLOOP fork. Attachments are references only. Output is source, not a compiled/installable firmware. No toolchain was installed, no generated C compiled, and no FM1 written in this task.

## 6 November 2026: compiled Blacksmith firmware

The previous source-only milestone is superseded: fm1 now builds the pinned fm1-base/BSP starter locally with the vendor Jieli toolchain in a Linux Docker image. It supports custom screen colors/text and embedded 16x16 artwork, five oscillator types, more preset controls and MIDI/USB settings. Exact versions, hashes and licensing are in THIRD_PARTY.md and BLACKSMITH_RESEARCH.md. Dependency binaries stay in the ignored local cache.

A real 611490-byte FM-1_1100 package and a host simulator were successfully compiled and tested. Build & install opens fm1's final review directly; source ZIP export is optional. This remains a monophonic starter, not a general plug-in/sample/groovebox host. Physical FM1 installation has not been tested. Existing catalog package approvals stay separate from validated local builds.
