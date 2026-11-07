"""Curated firmware metadata and bounded HTTPS downloads; never executes packages."""
import base64
import json
import re
from datetime import datetime, timezone
from pathlib import Path
import hashlib
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

SLOOP_SHA = '5a6a0843c868650dba6718cf85e43e719aec18c3dc5cc803c57c38b382158d4e'
SLOOP_PRODUCT = 'FM-1_900'
PINNED_URL = 'https://raw.githubusercontent.com/isod89/sloop-fm1/91f30182d9095e0ecdb43396554f2ce5a67df179/docs/firmware/sloop-2.8.4.fwsc'
SEEDS = [
 dict(id='orbit',name='ORBIT',repo='dspaudio/orbit',category='Groovebox',description='A tape-inspired performance instrument for synths, drums and editable note events. Its tape edits notes rather than recorded audio.',installer='https://dspaudio.github.io/orbit/',version='v0.10.0',assets=[]),
 dict(id='stock',name='M-VAVE stock',repo='',creator='M-VAVE',source='https://www.m-vave.com/appdownload',category='Synth',description='The factory FM synthesizer workflow. Keep a matching factory package and M-UPGRADE available for recovery.',installer='https://www.m-vave.com/appdownload',version='See official downloads',assets=[]),
 dict(id='sloop',name='SLOOP',repo='isod89/sloop-fm1',category='Groovebox',description='Play drums, bass and chords into live loops. Turn QUANT off to retain timing offsets.',installer='https://isod89.github.io/sloop-fm1/webapp/installer/',version='2.8.4',assets=[dict(name='sloop-2.8.4.fwsc',url=PINNED_URL,sha256=SLOOP_SHA,product=SLOOP_PRODUCT,adapter='sloop-v1')]),
 dict(id='open',name='FM1 Open',repo='m-vave/fm1_open',category='Groovebox',description='M-VAVE’s open firmware with multiple tracks, synth engines and samples.',installer='https://open.m-vave.com/fm1-workbench',version='See maintainer',assets=[]),
 dict(id='felucca',name='Felucca',repo='hugelton/Felucca',category='Groovebox',description='A community instrument platform for synthesis, sequencing and performance.',installer='https://github.com/hugelton/Felucca',version='Check releases',assets=[]),
 dict(id='amb1',name='AMB-1',repo='charlesvestal/fm1-amb',category='Generative',description='An ambient instrument built around evolving layers and generative music.',installer='https://github.com/charlesvestal/fm1-amb',version='Check releases',assets=[]),
 dict(id='aisling',name='AISLING',repo='stephencummins/fm1-aisling',category='Generative',description='An Irish-inspired ambient instrument derived from NACHTFAHRT.',installer='https://github.com/stephencummins/fm1-aisling',version='Check releases',assets=[]),
 dict(id='386dx',name='386DX',repo='seajaysec/386-DX-FM1-KaraokeBot',category='Experimental',description='A singing karaoke robot and accompanying band for the FM-1.',installer='https://386dx.linecross.ing',version='Check releases',assets=[]),
 dict(id='ambwave',name='AmbWave',repo='mentalcells/ambwave',category='Generative',description='An ambient performance instrument derived from Felucca.',installer='https://github.com/mentalcells/ambwave',version='Check releases',assets=[]),
]

SEEDS.extend([
 dict(id='clipper',name='Clipper',repo='isod89/clipper-fm1',category='Synth',description='A deep synthesizer with 23 engines, wavetables and editable sound design.',installer='https://isod89.github.io/clipper-fm1/webapp/installer/',version='1.3.1',assets=[]),
 dict(id='skiff',name='Skiff',repo='illuminus5/skiff',category='Groovebox',description='Six tracks, a step sequencer, parameter locks and live performance tools.',installer='https://illuminus5.github.io/skiff/webapp/installer/',version='2.2',assets=[]),
 dict(id='coralflower',name='CoralFlower',repo='FicusFicusov/CoralFlower',category='Chords',description='Play full chords and bass lines while a pixel flower follows your music.',installer='https://ficusficusov.github.io/CoralFlower/',version='0.6.1',assets=[]),
 dict(id='araminta',name='Araminta',repo='Wulgaren/Araminta',category='Groovebox',description='A Felucca-based groovebox with free takes, wavetable sounds and punch-in effects.',installer='https://wulgaren.github.io/Araminta/',version='3.7',assets=[]),
 dict(id='moondaw',name='Moondaw',repo='jaeggerr/moondaw-fm1',category='Groovebox',description='An eight-track tracker with editable instruments and text-based songs.',installer='https://moondaw.com/install/',version='See maintainer',assets=[]),
 dict(id='mutable-dreams',name='Mutable Dreams',repo='kidbee85-beep/mutable-dreams',category='Generative',description='Six assignable tracks, evolving Biomes, granular effects and open synthesis engines.',installer='https://mutable-dreams.sugarypixie10.chatgpt.site',version='1.4',assets=[]),
 dict(id='x0x',name='X0X',repo='charlesvestal/fm1-x0x',category='Groovebox',description='A drum and bass groovebox inspired by the 909, 808 and two 303s.',installer='https://github.com/charlesvestal/fm1-x0x',version='Check releases',assets=[]),
 dict(id='melodee',name='Melodee',repo='keremimo/melodee',category='Groovebox',description='A multi-engine instrument with tracks, presets, a web editor and full project backup.',installer='https://github.com/keremimo/melodee',version='Check releases',assets=[]),
 dict(id='optimist',name='Optimist',repo='w0ts/optimist',category='Groovebox',description='A modular FM1 firmware with browser building, simulation and installation.',installer='https://w0ts.github.io/optimist/',version='Check releases',assets=[]),
 dict(id='fmini',name='Fmini-1',repo='ruppert/fmini-1',category='Synth',description='A Minimoog-inspired synthesizer for the FM1.',installer='https://ruppert.github.io/fmini-1/',version='Check releases',assets=[]),
 dict(id='saadet',name='Saadet',repo='keremimo/saadet',category='Synth',description='An experimental single-part synthesizer with Bluetooth MIDI and native 24-bit audio.',installer='https://github.com/keremimo/saadet',version='Check releases',assets=[]),
 dict(id='fomni',name='FoMni-1',repo='charlesvestal/fm1-fomni',category='Chords',description='A chord harp: strum melodies, hold chords and add rhythm and bass.',installer='https://charlesvestal.github.io/fm1-fomni/install/',version='Check releases',assets=[]),
 dict(id='bb1',name='BB1 Big Beat',repo='TexasRADIO/bb1-firmware',category='Groovebox',description='Two drum machines and an acid bass synth with tape echo and spring reverb.',installer='https://thebigbeat.app/fm1/install/',version='Check releases',assets=[]),
 dict(id='dxsloop',name='sloopDX',repo='zvenson/dxsloop',category='Groovebox',description='A SLOOP-based groovebox with DX7-style six-operator FM sounds.',installer='https://dx7.designburgapps.com/',version='Check releases',assets=[]),
 dict(id='ghoulbox',name='GHOULBOX',repo='jasonpersinger/ghoulbox-fm1-dungeon-synth',category='Synth',description='A dungeon synth with dark sounds, effects and performance controls.',installer='https://ghoulbox.messy.quest/webapp/installer/',version='Check releases',assets=[]),
 dict(id='choralroot',name='ChoralRoot',repo='Quixotic7/ChoralRootFM1',category='Chords',description='Explore chord voicings, key modes, bass and looping from the FM1 keys.',installer='https://quixotic7.github.io/ChoralRootFM1/webapp/installer/',version='Check releases',assets=[]),
 dict(id='hortator',name='Hortator',repo='DeadActive/hortator',category='Groovebox',description='An eight-track drum machine with classic drum sounds, samples and sequencing.',installer='https://deadactive.github.io/hortator/webapp/installer/',version='Check releases',assets=[]),
 dict(id='fimba',name='FiMba-1',repo='jadamsowers/fm1-fimba',category='Synth',description='A playable kalimba-inspired instrument with resonant tines and patterns.',installer='https://jadamsowers.github.io/fm1-fimba/',version='Check releases',assets=[]),
 dict(id='zp12',name='zp12',repo='zvenson/zp12',category='Sampler',description='An SP-12-inspired sampling drum machine with pads and a browser sample editor.',installer='https://zp12.designburgapps.com/install/',version='Check releases',assets=[]),
 dict(id='obervave',name='OberVave',repo='zvenson/obervave',category='Synth',description='An eight-voice polyphonic synth inspired by classic Oberheim instruments.',installer='https://github.com/zvenson/obervave',version='Check releases',assets=[]),
 dict(id='jangada',name='Jangada',repo='zednaked/jangada',category='Groovebox',description='Four tracks and varied engines for drones, rhythms and experimental performance.',installer='https://zednaked.github.io/jangada/',version='Check releases',assets=[]),
])

_downloads=json.loads((Path(__file__).parent/'catalog-downloads.json').read_text(encoding='utf-8'))
for _seed in SEEDS:
    if _seed['id'] in _downloads: _seed['assets']=_downloads[_seed['id']]

# This file is code-reviewed source, not catalog cache or a user-supplied checksum.
def install_builds():
    builds=json.loads((Path(__file__).parent/'install-builds.json').read_text(encoding='utf-8'))
    seen=set()
    for b in builds:
        if (b['id'] in seen or not re.fullmatch('[a-f0-9]{64}',b['sha256']) or b['product']!='FM-1_900'
            or b['adapter']!='felucca-v1' or type(b['size']) is not int or not 960<=b['size']<=8*1024*1024):
            raise ValueError('Invalid reviewed installation manifest')
        check_url(b['url']);seen.add(b['id'])
    return builds

def reviewed_build(raw):
    sha=hashlib.sha256(raw).hexdigest()
    for b in install_builds():
        if b['sha256']==sha and b['size']==len(raw) and fwsc_info(raw)==b['product']:
            return b
    return None

def approved_assets(firmware_id):
    return [dict(name=b['name'],url=b['url'],sha256=b['sha256'],size=b['size'],product=b['product'],adapter=b['adapter'],buildId=b['id']) for b in install_builds() if b['firmwareId']==firmware_id]

ALLOWED_HOSTS = {'api.github.com','github.com','raw.githubusercontent.com','release-assets.githubusercontent.com','objects.githubusercontent.com'}

def check_url(url):
    u = urlsplit(url)
    if u.scheme != 'https' or u.hostname not in ALLOWED_HOSTS or u.username or u.password or u.port not in (None,443):
        raise ValueError('Only approved GitHub HTTPS download hosts are supported')
    return url

class CheckedRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def remote(url, maximum=8*1024*1024):
    check_url(url)
    req = Request(url, headers={'User-Agent':'FM1-Dock/0.7','Accept':'application/vnd.github+json' if '/api.github.com/' in url else 'application/octet-stream'})
    with build_opener(CheckedRedirect).open(req, timeout=25) as response:
        data = response.read(maximum+1)
        if len(data)>maximum:
            raise ValueError('Remote file exceeds the download limit')
        return data

def fwsc_info(raw):
    if len(raw)<960:
        raise ValueError('Not a recognized .fwsc package')
    markers = [raw[i*48+47] for i in range(20)]
    product = ''.join(chr((byte-i-1)&255) for i,byte in enumerate(markers) if byte!=125)
    if not re.fullmatch(r'FM-1_\d{3,12}',product):
        raise ValueError('Package product is not an FM-1 firmware')
    return product

def load_catalog(data):
    result = {x['id']:json.loads(json.dumps(x)) for x in SEEDS}
    path=data/'catalog.json'
    if path.exists():
        cached=json.loads(path.read_text(encoding='utf-8'))
        for entry in cached:
            if isinstance(entry,dict) and isinstance(entry.get('id'),str):
                result[entry['id']]=entry
    # Curated source controls identity, links and reviewed builds; caches only add release choices.
    for seed in SEEDS:
        entry=result[seed['id']]
        for key in ('repo','name','category','description','installer','source','creator'):
            if key in seed: entry[key]=seed[key]
        pins=approved_assets(seed['id'])
        if pins:
            urls={a['url'] for a in pins}
            entry['assets']=pins+[a for a in entry.get('assets',[]) if a.get('url') not in urls and a.get('sha256') not in {p['sha256'] for p in pins}]
            entry['version']=next(b['version'] for b in install_builds() if b['firmwareId']==seed['id'])
        elif not entry.get('checked'):
            entry['version']=seed['version']
    previews_path = data.parent / 'previews.json'
    previews = json.loads(previews_path.read_text(encoding='utf-8')) if previews_path.exists() else {}
    for key, entry in result.items():
        entry['preview'] = previews.get(key)
    return list(result.values())

def save_catalog(data, items):
    data.mkdir(exist_ok=True,parents=True)
    temp=data/'catalog.pending'
    temp.write_text(json.dumps(items,indent=2),encoding='utf-8')
    temp.replace(data/'catalog.json')

def refresh_entry(entry):
    repo=entry['repo']
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repo):
        raise ValueError('Use a GitHub owner/repository name')
    try:
        release=json.loads(remote(f'https://api.github.com/repos/{repo}/releases/latest',2*1024*1024))
    except HTTPError as error:
        if error.code==404:
            return {**entry,'checked':datetime.now(timezone.utc).isoformat(),'releaseNote':'No numbered GitHub release. Use the maintainer page.'}
        raise
    assets=[]
    for a in release.get('assets',[]):
        url=a.get('browser_download_url','')
        if a.get('name','').lower().endswith('.fwsc') and url.startswith(f'https://github.com/{repo}/releases/download/'):
            digest=a.get('digest') or ''
            sha=digest[7:] if re.fullmatch('sha256:[0-9a-f]{64}',digest) else ''
            assets.append(dict(name=a['name'],url=url,sha256=sha,adapter=None))
    # Keep the known installable package alongside newer release choices.
    pinned=approved_assets(entry['id'])
    return {**entry,'version':str(release.get('tag_name',''))[:100], 'release':release.get('html_url',''),
            'checked':datetime.now(timezone.utc).isoformat(),'assets':pinned+assets,
            'releaseNote': 'Select a package. Direct installation is limited to exact reviewed builds.'}

def cache_package(data, entry_id, asset_url, store):
    entry=next((e for e in load_catalog(data) if e['id']==entry_id),None)
    if not entry:
        raise ValueError('Catalog entry not found')
    asset=next((a for a in entry.get('assets',[]) if a['url']==asset_url),None)
    if not asset:
        raise ValueError('Choose a package from the cached catalog first')
    raw=remote(asset['url'])
    product=fwsc_info(raw)
    obj=dict(filename=asset['name'],label=entry['name']+' · '+asset['name'],source='https://github.com/'+entry['repo'],
             expectedSha256=asset.get('sha256',''),base64=base64.b64encode(raw).decode())
    meta=store('firmwares',obj)
    return meta
