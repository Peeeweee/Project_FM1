# Blacksmith: custom FM1 firmware research

Reviewed 5 November 2026. Primary project sources below establish what can be customized; they do not establish that different hosts or plug-in formats work together.

## What is possible?

The FM1 can run custom application code: screens, controls, synthesis and preset banks can be changed and compiled into firmware. A browser can help author those choices, but the FM1 needs compiled device code. A JSON design or source ZIP is not an installable `.fwsc` package.

| Project | Useful for | Integration boundary |
| --- | --- | --- |
| [fm1-base](https://github.com/charlesvestal/fm1-base) | Complete app template: screen, keys, audio, MIDI, storage, host/browser simulator | MPL-2.0. Used by Blacksmith. Device builds require the Linux JieLi PI32v2 toolchain and AC79 packaging resources. |
| [SLOOP](https://github.com/isod89/sloop-fm1/blob/main/BUILDING.md) | Groovebox with FM6, samples and live loops | GPL-3.0-only. Customization requires a source fork/build, not loading a Blacksmith starter recipe. Windows build instructions use WSL. |
| [Felucca-Engines](https://github.com/hugelton/Felucca-Engines#plugins) | Reusable C synthesis engines and Felucca engine plug-in interface | MIT engine project. `.fep` files require a compatible Felucca host and matching ABI/toolchain. Not a universal FM1 plug-in format. |
| [FM1 Open](https://github.com/m-vave/fm1_open) | Manufacturer's application sources and workbench/SDK route | GPLv3 application with an SDK linking exception; binary engine SDK has separate terms. Different build/package interface. |
| [felucca-bsp](https://github.com/hugelton/felucca-bsp) | Board, flash, USB and audio platform | MPL-2.0 hardware layer. Does not supply a complete screen or synth app. |

Desktop VST/AU binaries cannot run directly on this microcontroller. An effect must be ported to its C/DSP environment or supplied in the chosen firmware host's supported format. The existence of a `.fep` SDK does not establish support in SLOOP or Blacksmith's starter.

## Implemented in fm1

Blacksmith uses fm1-base at `3c4a57eea659f942b0c80a99949dddafc094a57b` and felucca-bsp at `41a6e86d921f842243bd01a48111832f7e55b4e2`. The original vendored template hashes/notices remain intact.

- Screen: three layouts, six editable colors, title/subtitle/footer/alignment, frame, note/key visibility and embedded 16 × 16 artwork. PNG design import is converted locally into this three-color grid; it becomes C drawing commands.
- Sound: one voice, eight presets, sine/triangle/saw/pulse/noise, attack/release/filter, drive/crush, per-preset level/transpose/pulse width and pitch vibrato.
- Settings: MIDI receive channel, touch/fixed velocity, initial octave, global level and USB audio input/output.
- Build & install: a snapshot of the validated design becomes real C and an isolated Linux container builds the app/loader/package. Passing builds open the final install review directly. No source-ZIP download is required. Failed/interrupted jobs stay non-installable. Source/JSON exports remain optional.
- Contents: attached WAV/SYX/FEP/PNG files remain reference files. A PNG imported specifically as a screen design is converted and embedded; this does not add a PNG loader or sample player.

The browser audition/canvas are approximations. The generated application was also compiled and exercised with the pinned platform's host simulator; see VALIDATION.md. Physical FM1 flashing/audio behavior remains untested. This starter has no sequencer, looper, sampler, FM6 or external plug-in host.

## Local build environment

The checked vendor toolchain archive has SHA-256 `a1545cddbc451a06bac43eb5cd96d831470c42a97c5c0b1f98879a20fc7647bd`. It is extracted inside Linux to preserve its symbolic links. Only the three exact SDK packaging files are used (hashes in blacksmith_build.py); the SDK LICENSE is retained locally. A pinned Python base image plus font/shaping dependencies forms the local compiler image. Every build records its actual image ID and source/BSP pins, and compilation runs without network access. Recipes cannot supply shell commands, build flags or executable source uploads.

Setup on another laptop: run `python tools/blacksmith/setup.py` with Docker Desktop's Linux engine available. This may download dependencies and prepare the image, but never resets Docker or installs firmware. Once cached, compilation can run offline.

The first real browser-created build passed the platform's image/RAM/register/FPU checks. Its `.fwsc` was 611,490 bytes, identity FM-1_1100, SHA-256 `e91fa0773921424671b0042e48f24144b6e5fbb973035c637038d825d051ccbd`. A host-simulator run verified channel filtering, note on/off, default octave, preset wrapping and bounded nonzero audio, and rendered the generated screen. These are software checks, not physical-device verification.

## Installation boundary

Custom local builds are separate from the catalog's exact-release allowlist. They require completed server-side compilation, pinned-platform provenance, expected package identity/loader marker, matching size/hash, and the existing final review. No ZIP or arbitrary imported firmware can promote itself into this local-build path. The updater requests the full fm1-base identity and still rejects foreign update loaders; M-VAVE Open recovery restrictions apply.

A user chooses the final device write. Keep the current firmware's matching backup and recovery instructions. For distribution, provide a unique public package identity, matching modified MPL sources and applicable SDK notices. The generated starter retains the upstream development identity FM-1_1100 for local work.

SLOOP-based groovebox customization and Felucca plug-in integration remain separate future work; these repositories cannot be combined automatically.
