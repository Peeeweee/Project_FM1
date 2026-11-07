"""Validated source-kit generator. Never compiles, executes or installs firmware."""
import base64
import binascii
import hashlib
import io
import json
import math
import re
import secrets
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEMPLATE = ROOT / 'third_party/fm1-base-template'
PALETTES = {
    'night': ['#111114', '#f2f2ee', '#d3d3ce', '#b0b0b8', '#777780', '#303038'],
    'paper': ['#f4f3ed', '#171719', '#304d69', '#595960', '#85858a', '#c8c8c3'],
    'ember': ['#17110e', '#fff0dd', '#ffb873', '#c8b8a8', '#8e7968', '#443226'],
}
DESIGN_DEFAULTS = dict(subtitle='YOUR SOUND YOUR WAY', footer='SAVE / SETTINGS', align='left', border=False,
                      artEnabled=False, art='0'*256, artX=148, artY=84, artSize=5, artLayers=[])
SETTINGS_DEFAULTS = dict(midiChannel=0, velocity=0, octave=0, gain=0.8, showKeys=True, showNote=True,
                        usbAudioIn=True, usbAudioOut=True)


def _label(value, length, field):
    if not isinstance(value,str) or not re.fullmatch(r'[A-Z0-9 /_.-]{0,'+str(length)+'}',value):
        raise ValueError(field+' needs uppercase letters, numbers, spaces or / _ . -')
    return value


def design_settings(obj):
    design=obj.get('design',{});settings=obj.get('settings',{})
    if not isinstance(design,dict) or not isinstance(settings,dict): raise ValueError('Invalid design or settings')
    d={**DESIGN_DEFAULTS,**{k:v for k,v in design.items() if k in DESIGN_DEFAULTS}}
    d['subtitle']=_label(d['subtitle'],24,'Subtitle');d['footer']=_label(d['footer'],22,'Footer')
    if d['align'] not in ('left','center'): raise ValueError('Choose left or center title alignment')
    if type(d['border']) is not bool or type(d['artEnabled']) is not bool: raise ValueError('Invalid artwork switches')
    def check_art(art, x, y, size):
        if not isinstance(art,str) or not re.fullmatch('[012]{256}',art): raise ValueError('Artwork needs a 16 × 16 pixel grid')
        if type(size) is not int or not 1 <= size <= 8: raise ValueError('Artwork size must be 1–8 pixels per square')
        if type(x) is not int or type(y) is not int or not 0 <= x <= 240-16*size or not 36 <= y <= 180-16*size:
            raise ValueError('Keep artwork inside the FM1 screen area')
        return dict(art=art,x=x,y=y,size=size)
    check_art(d['art'],d['artX'],d['artY'],d['artSize'])
    if not isinstance(d['artLayers'],list) or len(d['artLayers'])>3: raise ValueError('Use at most four artwork layers')
    layers=[]
    for layer in d['artLayers']:
        if not isinstance(layer,dict): raise ValueError('Invalid artwork layer')
        layers.append(check_art(layer.get('art'),layer.get('x'),layer.get('y'),layer.get('size')))
    d['artLayers']=layers
    colors=design.get('colors')
    if colors is not None:
        if not isinstance(colors,list) or len(colors)!=6 or any(not isinstance(c,str) or not re.fullmatch('#[0-9A-Fa-f]{6}',c) for c in colors):
            raise ValueError('Choose six RGB colors')
        d['colors']=[c.lower() for c in colors]
    s={**SETTINGS_DEFAULTS,**{k:v for k,v in settings.items() if k in SETTINGS_DEFAULTS}}
    for key,lo,hi in [('midiChannel',0,16),('velocity',0,127),('octave',-2,2)]: s[key]=_number(s[key],lo,hi,key,True)
    s['gain']=_number(s['gain'],0.05,1,'Output gain')
    for key in ['showKeys','showNote','usbAudioIn','usbAudioOut']:
        if type(s[key]) is not bool: raise ValueError(key+' must be on or off')
    if s['usbAudioOut'] and not s['usbAudioIn']: raise ValueError('USB playback needs USB recording enabled in this platform')
    return d,s
SOURCES = [
    dict(name='fm1-base', repo='charlesvestal/fm1-base', license='MPL-2.0', role='Starter used here',
         description='Screen, controls, sound, MIDI and simulator template. The generated kit uses a pinned revision.',
         url='https://github.com/charlesvestal/fm1-base'),
    dict(name='SLOOP', repo='isod89/sloop-fm1', license='GPL-3.0-only', role='Groovebox fork',
         description='A fuller starting point for beats, samples and FM6. Custom screens and engines require a source fork.',
         url='https://github.com/isod89/sloop-fm1/blob/main/BUILDING.md'),
    dict(name='Felucca-Engines', repo='hugelton/Felucca-Engines', license='MIT', role='Engine / plug-in SDK',
         description='Reusable C synthesis engines and the .fep engine plug-in interface for compatible Felucca hosts.',
         url='https://github.com/hugelton/Felucca-Engines#plugins'),
    dict(name='FM1 Open', repo='m-vave/fm1_open', license='GPLv3 + SDK exception', role='Official SDK route',
         description='Application sources with a separate binary engine SDK. Its own toolchain and SDK terms apply.',
         url='https://github.com/m-vave/fm1_open'),
    dict(name='felucca-bsp', repo='hugelton/felucca-bsp', license='MPL-2.0', role='Hardware layer',
         description='Board, USB, flash and audio drivers. It does not include a synth or screen interface by itself.',
         url='https://github.com/hugelton/felucca-bsp'),
]


def _number(value, low, high, field, integer=False):
    if type(value) not in (int, float) or not low <= value <= high or not math.isfinite(value):
        raise ValueError(f'{field} must be between {low} and {high}')
    if integer and type(value) is not int:
        raise ValueError(f'{field} must be a whole number')
    return value


def validate_recipe(obj):
    if not isinstance(obj, dict) or obj.get('schema') != 'fm1-dock/blacksmith/1':
        raise ValueError('Choose a Blacksmith project JSON file')
    if obj.get('base') != 'fm1-base-template':
        raise ValueError('This generator supports the fm1-base starter only')
    name = obj.get('name', '')
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 48 or any(ord(c) < 32 for c in name):
        raise ValueError('Project name needs 1–48 printable characters')
    device = obj.get('deviceName', '')
    if not isinstance(device, str) or not re.fullmatch(r'[A-Z][A-Z0-9 _-]{0,11}', device):
        raise ValueError('Screen name needs 1–12 uppercase letters, numbers, spaces, _ or -')
    if obj.get('layout') not in ('minimal', 'performance','poster') or obj.get('palette') not in PALETTES:
        raise ValueError('Choose a supported screen layout and palette')
    modules = obj.get('modules')
    if not isinstance(modules, dict) or set(modules) != {'drive', 'crusher'} or any(type(v) is not bool for v in modules.values()):
        raise ValueError('Only the built-in drive and crusher modules are supported')
    presets = obj.get('presets')
    if not isinstance(presets, list) or not 1 <= len(presets) <= 8:
        raise ValueError('A starter needs 1–8 presets')
    clean_presets = []
    for p in presets:
        if not isinstance(p, dict) or not isinstance(p.get('name'), str) or not re.fullmatch(r'[A-Z0-9 _-]{1,10}', p['name']):
            raise ValueError('Preset names need 1–10 uppercase letters, numbers, spaces, _ or -')
        if p.get('wave') not in ('sine', 'triangle','sawtooth','square','noise'):
            raise ValueError('Choose a supported oscillator')
        clean_presets.append(dict(name=p['name'], wave=p['wave'],
            attack=_number(p.get('attack'), 5, 2000, 'Attack'),
            release=_number(p.get('release'), 20, 3000, 'Release'),
            cutoff=_number(p.get('cutoff'), 100, 16000, 'Cutoff'),
            bits=_number(p.get('bits'), 4, 16, 'Bit depth', True),
            drive=_number(p.get('drive'), 1, 4, 'Drive'),
            tune=_number(p.get('tune',0),-24,24,'Transpose',True),
            level=_number(p.get('level',0.8),0.05,1,'Preset level'),
            pulse=_number(p.get('pulse',0.5),0.1,0.9,'Pulse width'),
            lfoRate=_number(p.get('lfoRate',0),0,12,'Vibrato speed'),
            lfoDepth=_number(p.get('lfoDepth',0),0,50,'Vibrato depth')))
    assets = obj.get('assets', [])
    if not isinstance(assets, list) or len(assets) > 8:
        raise ValueError('A kit can hold up to 8 reference files')
    names, size, clean_assets = set(), 0, []
    for a in assets:
        if not isinstance(a, dict): raise ValueError('Invalid reference file')
        filename, encoded = a.get('name', ''), a.get('base64', '')
        if not isinstance(filename, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_. -]{0,79}', filename) or '..' in filename:
            raise ValueError('Reference filenames cannot contain paths or ..')
        suffix = Path(filename).suffix.lower()
        if suffix not in ('.wav', '.syx', '.fep', '.png') or filename.lower() in names:
            raise ValueError('Use unique WAV, SYX, FEP or PNG reference files')
        if not isinstance(encoded, str) or len(encoded) > 700000: raise ValueError('Each reference file must be at most 512 KiB')
        try: raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error): raise ValueError('Invalid reference file encoding')
        if not 1 <= len(raw) <= 512*1024: raise ValueError('Each reference file must be 1 byte–512 KiB')
        if suffix == '.wav' and (raw[:4] != b'RIFF' or raw[8:12] != b'WAVE'): raise ValueError('Invalid WAV header')
        if suffix == '.png' and raw[:8] != b'\x89PNG\r\n\x1a\n': raise ValueError('Invalid PNG header')
        if suffix == '.syx' and (raw[0] != 0xf0 or raw[-1] != 0xf7): raise ValueError('Invalid SysEx framing')
        size += len(raw); names.add(filename.lower())
        if size > 2*1024*1024: raise ValueError('Reference files together must fit within 2 MiB')
        clean_assets.append(dict(name=filename, base64=base64.b64encode(raw).decode()))
    design,settings=design_settings(obj)
    return dict(schema='fm1-dock/blacksmith/1', base='fm1-base-template', name=name.strip(), deviceName=device,
                layout=obj['layout'], palette=obj['palette'], modules=dict(modules), presets=clean_presets, assets=clean_assets,
                design=design,settings=settings)


def source_manifest():
    manifest = json.loads((TEMPLATE/'SOURCE.json').read_text(encoding='utf-8'))
    for f in manifest['files']:
        if hashlib.sha256((TEMPLATE/f['path']).read_bytes()).hexdigest() != f['sha256']:
            raise ValueError('Pinned template integrity failed; source generation stopped')
    return manifest


def catalog():
    m = source_manifest()
    return dict(sources=SOURCES, palettes=PALETTES, baseCommit=m['commit'], checked='2026-11-05',
                output='source-kit', compiled=False, installable=False,
                limitation='One-voice starter, not a SLOOP fork. Assets are bundled references, not embedded sounds.')


def _once(text, old, new):
    if text.count(old) != 1: raise ValueError('Template adapter mismatch; no source kit was generated')
    return text.replace(old, new, 1)


def generate_sources(recipe):
    r = validate_recipe(recipe); manifest = source_manifest()
    app = (TEMPLATE/'template/app.c').read_text(encoding='utf-8')
    header = (TEMPLATE/'template/app.h').read_text(encoding='utf-8')
    rgb = lambda color: 'RGB('+', '.join(str(int(color[i:i+2],16)) for i in (1,3,5))+')'
    palette = dict(zip(('BG','FG','ACCENT','MUTED','DIM','LINE'), r['design'].get('colors',PALETTES[r['palette']])))
    defines = '\n'.join(f'#define BS_{k} {rgb(v)}' for k,v in palette.items())
    rows = []
    for p in r['presets']:
        ac = 1-math.exp(-1/(44100*p['attack']/1000)); rc = 1-math.exp(-1/(44100*p['release']/1000))
        fc = 1-math.exp(-2*math.pi*p['cutoff']/44100)
        wave=['sine','triangle','sawtooth','square','noise'].index(p['wave'])
        rows.append('    {'+f'{wave}, {p["bits"] if r["modules"]["crusher"] else 16}, {ac:.10f}f, {rc:.10f}f, {fc:.10f}f, {p["drive"] if r["modules"]["drive"] else 1:.6f}f, {p["tune"]}, {p["level"]:.6f}f, {p["pulse"]:.6f}f, {p["lfoRate"]/44100:.10f}f, {p["lfoDepth"]/1200:.8f}f'+'},')
    bank = f'''/* Modified by fm1 Blacksmith: UI, preset bank and DSP below. */
{defines}
#define BS_COUNT {len(rows)}u
typedef struct {{ uint8_t wave, bits; float attack, release, filter, drive; int8_t tune; float level, pulse, lfo_rate, lfo_depth; }} bs_preset_t;
static const bs_preset_t BS_PRESETS[BS_COUNT] = {{
{chr(10).join(rows)}
}};
static float bs_filter;
static float bs_lfo;
static uint32_t bs_noise = 0x12345678u;
'''
    app = _once(app, '#include "fastmath.h"', '#include "fastmath.h"\n'+bank)
    app = _once(app, 'static const char *const WAVE_NAME[] = {"SINE", "TRIANGLE"};',
                'static const char *const WAVE_NAME[] = {'+', '.join(json.dumps(p['name']) for p in r['presets'])+'};')
    magic = int(hashlib.sha256(json.dumps(r,sort_keys=True).encode()).hexdigest()[:8],16)
    app = _once(app, '0x54504C31u', f'0x{magic:08X}u')
    app = _once(app, 'set.wave > 1u', 'set.wave >= BS_COUNT')
    app = _once(app,'set.octave = 0;',f'set.octave = {r["settings"]["octave"]};')
    app = _once(app,'voice_vel = (float)vel / 127.0f;',f'voice_vel = (float){r["settings"]["velocity"] or "vel"} / 127.0f;')
    if r['settings']['midiChannel']:
        app = _once(app,'if ((st & 0xF0u) == 0x90u && d2)',f'if (st < 0xF0u && (st & 15u) != {r["settings"]["midiChannel"]-1}u) continue;\n        if ((st & 0xF0u) == 0x90u && d2)')
    app = _once(app,'(float)(note - 69) / 12.0f','(float)(note - 69 + BS_PRESETS[set.wave].tune) / 12.0f')
    app = _once(app,'if (voice_phase >= 1.0f)','while (voice_phase >= 1.0f)')
    app = _once(app,'voice_phase += inc;','bs_lfo += BS_PRESETS[set.wave].lfo_rate;\n        if (bs_lfo >= 1.0f) bs_lfo -= 1.0f;\n        voice_phase += inc * fm_exp2f(fm_sinf(bs_lfo * 6.2831853f) * BS_PRESETS[set.wave].lfo_depth);')
    app = _once(app, 'voice_level += (target - voice_level) * 0.002f;',
                'voice_level += (target - voice_level) * (target > voice_level ? BS_PRESETS[set.wave].attack : BS_PRESETS[set.wave].release);')
    app = _once(app, 's = set.wave ? 4.0f * fm_fabsf(voice_phase - 0.5f) - 1.0f : fm_sinf(voice_phase * 6.2831853f);',
                '''switch (BS_PRESETS[set.wave].wave) {
        case 1: s = 4.0f * fm_fabsf(voice_phase - 0.5f) - 1.0f; break;
        case 2: s = voice_phase * 2.0f - 1.0f; break;
        case 3: s = voice_phase < BS_PRESETS[set.wave].pulse ? 1.0f : -1.0f; break;
        case 4: bs_noise ^= bs_noise << 13; bs_noise ^= bs_noise >> 17; bs_noise ^= bs_noise << 5;
                s = (float)(bs_noise & 65535u) / 32768.0f - 1.0f; break;
        default: s = fm_sinf(voice_phase * 6.2831853f); break;
        }
        if (BS_PRESETS[set.wave].drive > 1.0f) {
            float d = BS_PRESETS[set.wave].drive;
            s = (s * d) / (1.0f + fm_fabsf(s * d)) * ((1.0f + d) / d);
        }
        if (BS_PRESETS[set.wave].bits < 16u) {
            float q = (float)(1u << (BS_PRESETS[set.wave].bits - 1u));
            s = (float)(int32_t)(s * q) / q;
        }
        bs_filter += BS_PRESETS[set.wave].filter * (s - bs_filter);
        s = bs_filter;''')
    app=_once(app,'s *= voice_level * gain_now;',f's *= voice_level * gain_now * BS_PRESETS[set.wave].level * {r["settings"]["gain"]:.6f}f;')
    app = _once(app, 'set.wave ^= 1u;', '''int32_t next = (int32_t)set.wave + e;
            while (next < 0) next += (int32_t)BS_COUNT;
            set.wave = (uint8_t)(next % (int32_t)BS_COUNT);''')
    start = app.index('static void draw(void)'); end = app.index('\nvoid app_ui_init(void)', start)
    performance = '''
    cv_text(12, 60, &FONT_XS, "SOUND / FILTER / ENVELOPE", BS_MUTED);
    cv_text(12, 82, &FONT_XS, "ONE VOICE  -  USB MIDI", BS_MUTED);
    cv_text(12, 105, &FONT_XS, "PRESET TO CHANGE SOUND", BS_ACCENT);
''' if r['layout']=='performance' else '''
    for (i = 0; i < 20u; i++) {
        int32_t h = 10 + (int32_t)(fm_fabsf(fm_sinf((float)i * 0.45f)) * 42.0f);
        cv_rect(12 + (int32_t)i * 11, 99 - h / 2, 6, h, BS_ACCENT);
    }
'''
    if r['layout']=='poster':
        performance=''.join(f'    cv_text(12, {60+i*16}, &FONT_XS, '+json.dumps(line)+', BS_MUTED);\n'
                            for i,line in enumerate([r['design']['subtitle'][:18],r['design']['subtitle'][18:]]) if line)
    if r['design']['artEnabled']:
        performance+='    /* User artwork: up to four movable 16 x 16 pixel layers. */\n'
        art_layers=[dict(art=r['design']['art'],x=r['design']['artX'],y=r['design']['artY'],size=r['design']['artSize']),*r['design']['artLayers']]
        for layer in art_layers:
            for i,c in enumerate(layer['art']):
                if c!='0': performance+=f'    cv_rect({layer["x"]+(i%16)*layer["size"]}, {layer["y"]-36+(i//16)*layer["size"]}, {layer["size"]}, {layer["size"]}, BS_{"ACCENT" if c=="1" else "FG"});\n'
    if r['design']['border']:
        performance+='    cv_rect(0,0,240,1,BS_LINE); cv_rect(0,143,240,1,BS_LINE);\n    cv_rect(0,0,1,144,BS_LINE); cv_rect(239,0,1,144,BS_LINE);\n'
    draw = '''static void draw(void)
{
    char t[24]; uint32_t i;
    static const uint8_t WK[16] = PLAT_WHITE_KEYS, BK[11] = PLAT_BLACK_KEYS;
    cv_begin(240, 32, BS_BG);
    cv_text(10, 7, &FONT_B, APP_NAME, BS_FG);
    if (voice_note >= 0) { note_name(voice_note, t); cv_text(193, 7, &FONT_B, t, BS_ACCENT); }
    cv_blit(0, 0);
    cv_begin(240, 144, BS_BG);
    cv_text(12, 8, &FONT_XS, "PRESET", BS_MUTED);
    cv_text(12, 28, &FONT_B, WAVE_NAME[set.wave], BS_FG);
'''+performance+'''
    if (plat_ms() < ui.msg_until) cv_text(12, 125, &FONT_XS, ui.msg[0], BS_MUTED);
    cv_blit(0, 36);
    cv_begin(240, 60, BS_BG);
    for (i = 0; i < 16u; i++) key_cell(4 + (int32_t)i * 14, 14, 13, 14, WK[i], BS_DIM);
    for (i = 0; i < 11u; i++) {
        static const uint8_t AT[11] = {0,1,2,4,5,7,8,9,11,12,14};
        key_cell(4 + (int32_t)AT[i] * 14 + 8, 0, 11, 12, BK[i], BS_LINE);
    }
    cv_text(4, 38, &FONT_XS, "OCT", BS_MUTED); octave_text(t); cv_text(30, 38, &FONT_XS, t, BS_ACCENT);
    cv_text(116, 38, &FONT_XS, "SAVE / SETTINGS", BS_MUTED);
    cv_blit(0, 180);
}
'''
    app = app[:start]+draw+app[end:]
    if r['design']['align']=='center': app=_once(app,'cv_text(10, 7, &FONT_B, APP_NAME, BS_FG);','cv_text((240-text_w(&FONT_B,APP_NAME))/2, 7, &FONT_B, APP_NAME, BS_FG);')
    app=_once(app,'"SAVE / SETTINGS", BS_MUTED',json.dumps(r['design']['footer'])+', BS_MUTED')
    app=_once(app,'cv_text(116, 38, &FONT_XS,','cv_text(236-text_w(&FONT_XS,'+json.dumps(r['design']['footer'])+'), 38, &FONT_XS,')
    if not r['settings']['showNote']: app=_once(app,'if (voice_note >= 0) { note_name(voice_note, t); cv_text(193, 7, &FONT_B, t, BS_ACCENT); }','/* Note label hidden by design. */')
    if not r['settings']['showKeys']:
        begin=app.index('    for (i = 0; i < 16u; i++) key_cell',app.index('static void draw(void)'))
        finish=app.index('    cv_text(4, 38',begin);app=app[:begin]+app[finish:]
    for old,new in [('C_BLACK','BS_BG'),('C_WHITE','BS_FG'),('C_HI','BS_ACCENT'),('C_GRAY','BS_MUTED'),('C_DIM','BS_DIM'),('C_LINE','BS_LINE')]:
        app = re.sub(r'\b'+old+r'\b', new, app)
    header = _once(header, '#define APP_NAME "TEMPLATE"', '#define APP_NAME '+json.dumps(r['deviceName']))
    header = _once(header, 'RGB(242, 120, 72)', rgb(palette['ACCENT']))
    build_name = r['deviceName'].replace(' ','_')
    toml = f'''# Local development starter; set your own repo and unique public identity before distribution.
name = "{build_name}"
id_prefix = "FM-1_11"
usb_manufacturer = "Blacksmith"
usb_product = "{r['deviceName']} FM-1"
o2 = []
words = "words.tsv"
ble = false
ble_central = false
usb_audio_in = {str(r['settings']['usbAudioIn']).lower()}
usb_audio_out = {str(r['settings']['usbAudioOut']).lower()}
licence = "MPL-2.0"
repo = ""
tagline = "A custom Blacksmith starter synth"
credits = "Based on Charles Vestal's fm1-base template; see SOURCE.json and CREDITS.md."
'''
    readme = f'''# {r['name']}

This is C source, NOT an installable firmware. Nothing has been compiled or hardware-tested by Blacksmith.
One monophonic sine/triangle/saw/pulse/noise voice; {len(r['presets'])} presets, PRESETS cycles them; OCT-/OCT+ transpose; SAVE stores settings.
Other template controls are retained but do not add a sequencer, looper, sampler or plug-in host.
Layout: {r['layout']}. Palette: {r['palette']}. Sound, colors, artwork and device defaults are generated into app.c/fm1.toml.
Artwork in the design grid is embedded; assets/ still contains reference files only.
The browser sound/layout preview is approximate, not an emulator of these compiled sources.

## Build against the pinned platform

1. Get https://github.com/charlesvestal/fm1-base and its submodules.
   `git clone --recursive https://github.com/charlesvestal/fm1-base`
   `git -C fm1-base checkout {manifest['commit']}`
   `git -C fm1-base submodule update --init --recursive`
2. Read that revision's tools/build.py and licensing/build instructions. Its device build needs the Linux
   JieLi PI32v2 toolchain and AC79 packaging files; on Windows use a configured Linux/WSL build environment.
3. Copy this source kit into an application directory in that environment. From the platform directory:
   `python3 tools/build.py /absolute/path/to/this/kit --no-ble --host` (host C compiler required)
   `python3 tools/build.py /absolute/path/to/this/kit --no-ble --web` (Emscripten required)
   `python3 tools/build.py /absolute/path/to/this/kit --no-ble` (device toolchain/SDK required)
4. Test the host/browser version and review audio levels, CPU and flash/RAM use before hardware testing.
   The device output should be `build/{build_name.lower()}.fwsc`. Blacksmith did NOT generate that file.

## Contents and plug-ins

assets/ contains reference files only: they are NOT embedded, loaded or played by this starter.
SYX needs a DX7 engine; WAV needs a sampler; .fep needs a matching Felucca plug-in host; PNG needs a loader.
The only DSP modules implemented here are soft drive and bit-depth reduction. Desktop VST/AU plug-ins cannot
run directly on this microcontroller. SLOOP, Felucca and FM1 Open formats are not interchangeable.

## Licensing and installation

Modified template files remain MPL-2.0; original notices and full license are included. If distributing,
publish matching modified source files, preserve notices, provide your own source URL and package identity,
and check the rights for bundled assets. This kit uses the upstream TEMPLATE development identity.
Custom binaries are NOT added to fm1's reviewed installer allowlist. Keep matching backups/recovery files;
follow the chosen platform's documented install/test workflow only after a successful build and review.
'''
    files = {'app.c':app,'app.h':header,'fm1.toml':toml,'README.md':readme,
             'words.tsv':(TEMPLATE/'template/words.tsv').read_text(encoding='utf-8').replace('TEMPLATE\ttemplate',r['deviceName']+'\t'+r['deviceName'].lower()),
             'LICENSE':(TEMPLATE/'LICENSE').read_text(encoding='utf-8'),'CREDITS.md':(TEMPLATE/'CREDITS.md').read_text(encoding='utf-8'),
             'SOURCE.json':json.dumps(manifest,indent=2),'blacksmith.json':json.dumps(r,indent=2),
             'presets.json':json.dumps(r['presets'],indent=2)}
    for a in r['assets']: files['assets/'+a['name']] = base64.b64decode(a['base64'])
    return files


def save_project(data, recipe):
    r = validate_recipe(recipe); files = generate_sources(r)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
        for name,raw in files.items(): z.writestr(name,raw)
    raw = buf.getvalue(); folder = Path(data)/'blacksmith'; folder.mkdir(parents=True,exist_ok=True)
    ident = 'forge-'+secrets.token_hex(12)
    meta = dict(id=ident,name=r['name'],deviceName=r['deviceName'],created=datetime.now(timezone.utc).isoformat(),
                size=len(raw),sha256=hashlib.sha256(raw).hexdigest(),presets=len(r['presets']),assets=len(r['assets']),
                output='source-kit',compiled=False,installable=False)
    with (folder/(ident+'.zip')).open('xb') as f: f.write(raw)
    with (folder/(ident+'.json')).open('x',encoding='utf-8') as f: json.dump(meta,f)
    return meta


def projects(data):
    out=[]
    for p in (Path(data)/'blacksmith').glob('forge-*.json'):
        try:
            m=json.loads(p.read_text(encoding='utf-8')); raw=project_bytes(data,m['id']);out.append(m)
        except (ValueError,KeyError,OSError,json.JSONDecodeError): continue
    return sorted(out,key=lambda m:m['created'],reverse=True)


def project_bytes(data, ident):
    if not re.fullmatch(r'forge-[0-9a-f]{24}',ident): raise ValueError('Invalid Blacksmith project ID')
    folder=Path(data)/'blacksmith';meta=json.loads((folder/(ident+'.json')).read_text(encoding='utf-8'));raw=(folder/(ident+'.zip')).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=meta['sha256']: raise ValueError('Source kit integrity failed')
    return raw


def load_project(data, ident):
    with zipfile.ZipFile(io.BytesIO(project_bytes(data,ident))) as z: return validate_recipe(json.loads(z.read('blacksmith.json')))
