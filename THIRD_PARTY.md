# References and attribution

## Bundled typefaces

The offline UI bundles **Space Grotesk** for the FM1 wordmark and headings, **DM Sans** for body text and controls, and **IBM Plex Mono** for technical labels. All three are licensed under SIL Open Font License 1.1. Font data is embedded in `web/style.css` so the existing local server can serve the typefaces without additional routes. The original WOFF2 files, copyright notices and full license texts are in `web/fonts/`. Font files were obtained from the corresponding Fontsource packages at version 5.3.0; upstream projects: [Space Grotesk](https://github.com/floriankarsten/space-grotesk), [DM Sans](https://github.com/googlefonts/dm-fonts), and [IBM Plex](https://github.com/IBM/plex).

## Blacksmith source template

Local compilation uses the upstream platform/BSP at the pins below and the vendor toolchain archive `jieli-linux-toolchains-20260730.1.tar.xz` (SHA-256 `a1545cddbc451a06bac43eb5cd96d831470c42a97c5c0b1f98879a20fc7647bd`). Toolchain/SDK binaries are downloaded to ignored local caches, not committed or distributed here. The three AC79 V1.2.1 packaging files match the platform's hashes; the SDK Apache-2.0 LICENSE is cached beside them. The local builder uses the official Python image pinned by digest in tools/blacksmith/Dockerfile, Pillow 11.3.0 (with system RAQM support), fontTools 4.60.1 and Debian compiler/runtime dependencies. The resulting local image ID is recorded with each build. The build container has no network, only a writable app mount, read-only platform/SDK mounts, a CPU/memory limit and dropped capabilities.

`third_party/fm1-base-template` retains six unchanged files from Charles Vestal's [fm1-base](https://github.com/charlesvestal/fm1-base), commit `3c4a57eea659f942b0c80a99949dddafc094a57b`. Copyright (C) 2026 Charles Vestal. MPL-2.0; full license, credits, immutable source URLs and SHA-256 hashes are included in that directory. Blacksmith checks those hashes, adapts the template into generated C sources, marks its modifications and includes the original notices/license/credits in every source kit. Its template-derived source files remain MPL-2.0. No compiler, SDK binary, Felucca engine code or SLOOP application sources were added to the generator. See BLACKSMITH_RESEARCH.md for researched projects and their separate terms.

fm1's server, UI and application logic are authored for this project. The earlier bratta/fm1-manager checkout was consulted for interoperability facts; its implementation and assets are not bundled here.

The current-voice read command and 8-to-7-bit packing follow Christian Zietz's MIT-licensed fm1-read-voice, tested by its author on V14/V15:
https://github.com/czietz/fm1-read-voice

Copyright (c) 2026 Christian Zietz

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Additional protocol references: https://github.com/AL-255/FM-1-RE and Yamaha DX7 MIDI SysEx formats. No firmware binaries, samples or third-party sound banks are included. M-VAVE, FM-1 and firmware project names belong to their respective owners.

## Offline updater in version 0.2

web/updater.mjs is adapted from the GPL-3.0-only source in SLOOP 2.8.4 docs/webapp/installer/index.html. Copyright (C) 2026 Leo Kuroshita (@kurogedelic), Hügelton Instruments. Source: https://github.com/isod89/sloop-fm1/blob/main/docs/webapp/installer/index.html . Modifications: module exports and rejection of foreign loaders before stage-two writing on normal installation. web/install.mjs adds mandatory package pinning and post-resume identity verification. The combined application is distributed under GPL-3.0-only; original MIT notices remain in LICENSE-MIT and above. GPL text is in LICENSE. No warranty.

The cached SLOOP package is in ignored data/, not source control. Its source and licensing are available from https://github.com/isod89/sloop-fm1 . Native support is pinned to SLOOP 2.8.4, FM-1_900, SHA-256 5a6a0843c868650dba6718cf85e43e719aec18c3dc5cc803c57c38b382158d4e . This is software validation, not a claim of hardware testing.

## Version 0.3: kinetic scene and real firmware previews

Three.js 0.187.0 (MIT), https://github.com/mrdoob/three.js, is bundled in web/vendor. Its MIT license is retained there. The scene and beginner UI are authored for fm1. Firmware screenshots are bundled unchanged, with immutable source URLs, SHA-256 hashes, captions and licenses in previews.json; corresponding maintainer licenses/readmes are retained in docs/licenses. SLOOP, Felucca, AISLING and ORBIT previews are GPL-3.0-only; AMB-1's preview is MPL-2.0 under its current repo licensing. See OPEN_SOURCE_REPORT.md. No absent or inherited screenshot is mislabeled as another firmware's UI.

The Studio protocol research uses SLOOP's GPL-3.0 editor documentation/source for read-only INFO/TRACK/NAMES framing. It does not implement undocumented physical-button telemetry. Notes/audio editor code is authored for fm1.


## Preview additions in version 0.4

FM1 Open, AmbWave and 386DX JPEGs are captures of the maintainers' actual browser simulators, made on 4 November 2026. Source pages, hashes and captions are in previews.json. FM1 Open's app/workbench is GPL-3.0-only with its section 7 binary SDK linking permission; its LICENSE.md and THIRD_PARTY.md are retained in docs/licenses. AmbWave and 386DX own code/assets are GPL-3.0-only; their licensing notices are retained there as well. Screens may differ from later releases or the connected device. No screenshot has been invented or substituted from a parent firmware.

stock.jpeg is Paulo's original IMG_4137.jpeg, copied unchanged for this local app. It shows the stock global-settings screen before SLOOP installation. It is a user-provided photo for local use, not an open-source asset or a current live device image. Do not assume permission to redistribute this personal photograph when sharing the repository.

The enlarged motion scene and kinetic typography are original procedural application code, using the already bundled Three.js MIT renderer. No models, textures or remote animation libraries are required.


Version 0.5's read-only telemetry adapter (web/telemetry.mjs) follows SLOOP's GPL-3.0-only editor, drum and MIDI protocol in commit 91f30182d9095e0ecdb43396554f2ce5a67df179. Upstream copyright: Leo Kuroshita (@kurogedelic), Hügelton Instruments and SLOOP contributors. Source links are in OPEN_SOURCE_REPORT.md. The application remains GPL-3.0-only. The test fixture is simulated protocol data and does not access hardware.


## Additional firmware previews, 5 November 2026

Six maintainer-provided GPL-3.0-only images bundled locally; immutable source and SHA-256 recorded in previews.json.

- clipper: https://raw.githubusercontent.com/isod89/clipper-fm1/7bc15a950a8b3fd51aec280514905448e4faaf1b/assets/logo/clipper-splash.png — Maintainer artwork; not a live screen capture.
- skiff: https://raw.githubusercontent.com/illuminus5/skiff/db2ce89c8cb4260661f86720f607455a0133aa6a/docs/skiff.png — Maintainer-provided firmware screen montage.
- coralflower: https://raw.githubusercontent.com/FicusFicusov/CoralFlower/272cad9e85a444d879d72598807b7ca01a098d6d/docs/images/home.png — Maintainer-provided home screen preview.
- araminta: https://raw.githubusercontent.com/Wulgaren/Araminta/c9a7830ac6ab7f4e49910e65d4012ca9069970dd/docs/araminta.png — Maintainer-provided Araminta boot screen; not a live controls display.
- moondaw: https://raw.githubusercontent.com/jaeggerr/moondaw-fm1/1752b5d02e7551f2b44de34187af00f65d21e31e/docs/readme/home.png — Maintainer-provided home screen preview.
- mutable-dreams: https://raw.githubusercontent.com/kidbee85-beep/mutable-dreams/470bf7e9423fd641e12c5bd371faea59415272f0/Screen-1.4-Live-Biome.png — Maintainer-provided Mutable Dreams 1.4 screen.
