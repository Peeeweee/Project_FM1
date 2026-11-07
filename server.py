"""fm1: loopback-only UI and an append-only local asset vault."""
import argparse
import math
import re
import blacksmith
import blacksmith_build
from catalog import load_catalog, save_catalog, refresh_entry, cache_package, fwsc_info, SLOOP_SHA, SLOOP_PRODUCT, install_builds, reviewed_build
import base64
import hashlib
import json
import secrets
import threading
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
TOKEN = secrets.token_urlsafe(32)
MAX_BODY = 12 * 1024 * 1024
LOCK = threading.Lock()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def validate_backup(obj):
    if obj.get('schema') != 'fm1-dock/1':
        raise ValueError('Unsupported backup format')
    voices = obj.get('voices')
    if not isinstance(voices, list) or len(voices) not in (1, 128):
        raise ValueError('Expected one current sound or all 128 saved sounds')
    for voice in voices:
        if not isinstance(voice, list) or len(voice) != 155 or any(type(b) is not int or not 0 <= b < 128 for b in voice):
            raise ValueError('Invalid 155-byte DX7 voice')
    if obj.get('scope') != ('current-sound' if len(voices) == 1 else 'saved-sounds'):
        raise ValueError('Backup scope does not match its contents')
    device = obj.get('device', {})
    if not isinstance(device, dict) or device.get('model') != 'FM-1' or type(device.get('version')) is not int or device.get('version') not in (14, 15):
        raise ValueError('Only stock FM-1 V14/V15 sound captures are supported')
    # Preserve validated fields only. Client labels cannot claim a complete-device backup.
    clean_device = {'model': 'FM-1', 'version': device['version'], 'reported': str(device.get('reported', ''))[:80]}
    return dict(schema='fm1-dock/1', scope=obj['scope'], device=clean_device,
                voices=voices, excluded=['sequences', 'global settings', 'firmware', 'FM1-specific extensions'])


def store_asset(kind, obj):
    if kind == 'backups':
        clean = validate_backup(obj)
        raw = json.dumps(clean, separators=(',', ':')).encode()
        ext = '.json'
        meta = dict(kind=kind, label=f"V{clean['device']['version']} · {len(clean['voices'])} sounds",
                    scope=clean['scope'], count=len(clean['voices']))
    elif kind == 'projects':
        if obj.get('schema') != 'fm1-dock/studio/1':
            raise ValueError('Unsupported studio project')
        notes=obj.get('notes')
        if not isinstance(notes,list) or len(notes)>10000:
            raise ValueError('A project can contain at most 10,000 notes')
        clean_notes=[]
        ids=set()
        for note in notes:
            if not isinstance(note,dict):
                raise ValueError('Invalid note')
            for key,minimum,maximum in [('pitch',0,127),('velocity',1,127),('channel',1,16)]:
                if type(note.get(key)) is not int or not minimum<=note[key]<=maximum:
                    raise ValueError('Invalid note '+key)
            for key,minimum,maximum in [('start',0,3600),('duration',0.01,3600)]:
                if type(note.get(key)) not in (int,float) or not math.isfinite(note[key]) or not minimum<=note[key]<=maximum:
                    raise ValueError('Invalid note '+key)
            note_id=str(note.get('id') or 'note-'+str(len(clean_notes)))[:100]
            if note_id in ids: raise ValueError('Duplicate note ID')
            ids.add(note_id)
            clean_note={**{k:note[k] for k in ['pitch','velocity','channel','start','duration']},'id':note_id}
            if 'instrument' in note:
                ins=note['instrument']
                if not isinstance(ins,dict) or ins.get('kind') not in ('drum','melodic') or ins.get('source') not in ('device','manual'):
                    raise ValueError('Invalid instrument details')
                clean_ins={k:ins[k] for k in ('kind','source')}
                for key,limit in [('engine',120),('preset',120),('readAt',40)]:
                    if key in ins:
                        if not isinstance(ins[key],str) or len(ins[key])>limit: raise ValueError('Invalid instrument '+key)
                        clean_ins[key]=ins[key]
                if 'track' in ins:
                    if type(ins['track']) is not int or not 1<=ins['track']<=8: raise ValueError('Invalid instrument track')
                    clean_ins['track']=ins['track']
                clean_note['instrument']=clean_ins
            clean_notes.append(clean_note)
        label=str(obj.get('name') or 'My FM1 take')[:100]
        raw=json.dumps(dict(schema='fm1-dock/studio/1',name=label,notes=clean_notes,audioIncluded=False),separators=(',',':')).encode()
        ext='.json'
        meta=dict(kind=kind,label=label,count=len(notes),scope='notes-only')
    elif kind == 'firmwares':
        name = str(obj.get('filename', ''))
        if not name.lower().endswith('.fwsc'):
            raise ValueError('Select a .fwsc firmware package')
        raw = base64.b64decode(obj.get('base64', ''), validate=True)
        if not 16 <= len(raw) <= 8 * 1024 * 1024:
            raise ValueError('Firmware package must be 16 bytes to 8 MiB')
        ext = '.fwsc'
        source = str(obj.get('source', ''))[:1000]
        if source and urlsplit(source).scheme != 'https':
            raise ValueError('Source must be an HTTPS maintainer URL')
        meta = dict(kind=kind, label=str(obj.get('label') or Path(name).name)[:160],
                    originalName=Path(name).name[:160], source=source,
                    compatibility='Unverified; stored only, not approved for flashing')
    else:
        raise ValueError('Unknown asset type')
    sha = digest(raw)
    expected = str(obj.get('expectedSha256', '')).strip().lower()
    if expected and expected != sha:
        raise ValueError('SHA-256 does not match the supplied maintainer checksum')
    if kind == 'firmwares':
        try:
            product = fwsc_info(raw)
        except ValueError:
            product = None
        meta['product'] = product
        build=reviewed_build(raw)
        meta['adapter'] = build['adapter'] if build else None
        meta['buildId'] = build['id'] if build else None
        meta['compatibility'] = 'Reviewed package; FM1 installation available (hardware testing pending)' if build else 'Stored; use maintainer installer. No reviewed offline adapter.'
    for existing in list_assets(kind):
        if existing['sha256'] == sha and existing['integrity'] == 'OK':
            return existing
    asset_id = secrets.token_hex(12)
    meta.update(id=asset_id, sha256=sha, size=len(raw), extension=ext,
                created=datetime.now(timezone.utc).isoformat())
    folder = DATA / kind
    with LOCK:
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / (asset_id + ext)
        target.write_bytes(raw)
        if digest(target.read_bytes()) != sha:
            raise IOError('Disk verification failed')
        (folder / (asset_id + '.meta.json')).write_text(json.dumps(meta, indent=2), encoding='utf-8')
    return meta


def list_assets(kind):
    folder = DATA / kind
    result = []
    for path in folder.glob('*.meta.json'):
        try:
            meta = json.loads(path.read_text(encoding='utf-8'))
            raw = (folder / (meta['id'] + meta['extension'])).read_bytes()
            if kind == 'firmwares':
                build=reviewed_build(raw)
                meta['adapter']=build['adapter'] if build else None
                meta['buildId']=build['id'] if build else None
            meta['integrity'] = 'OK' if digest(raw) == meta['sha256'] else 'FAILED'
            result.append(meta)
        except (ValueError, OSError, KeyError):
            continue
    return sorted(result, key=lambda m: m['created'], reverse=True)


class Handler(BaseHTTPRequestHandler):
    def respond(self, code, body, content_type='application/json'):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        self.end_headers()
        self.wfile.write(body)

    def trusted(self):
        host = self.headers.get('Host', '')
        allowed = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        origin = self.headers.get('Origin')
        return host in allowed and (not origin or origin in {'http://' + h for h in allowed})

    def do_GET(self):
        if not self.trusted():
            return self.respond(403, {'error': 'Local requests only'})
        route = urlsplit(self.path).path
        if route == '/api/session':
            return self.respond(200, {'token': TOKEN, 'dataPath': str(DATA), 'version': '0.3.0'})
        if route.startswith('/api/blacksmith/'):
            try:
                if route == '/api/blacksmith/catalog': return self.respond(200, blacksmith.catalog())
                if route == '/api/blacksmith/projects': return self.respond(200, blacksmith.projects(DATA))
                if route == '/api/blacksmith/environment': return self.respond(200, blacksmith_build.environment())
                if route == '/api/blacksmith/builds': return self.respond(200, blacksmith_build.builds(DATA))
                build = re.fullmatch(r'/api/blacksmith/builds/(build-[0-9a-f]{24})(/firmware.fwsc)?',route)
                if build:
                    if build[2]: return self.respond(200,blacksmith_build.artifact(DATA,build[1])[1],'application/octet-stream')
                    return self.respond(200,blacksmith_build.status(DATA,build[1]))
                match = re.fullmatch(r'/api/blacksmith/projects/(forge-[0-9a-f]{24})/(recipe|source.zip)', route)
                if match:
                    if match[2] == 'recipe': return self.respond(200, blacksmith.load_project(DATA, match[1]))
                    return self.respond(200, blacksmith.project_bytes(DATA, match[1]), 'application/zip')
                return self.respond(404, {'error':'Blacksmith resource not found'})
            except (OSError, ValueError, KeyError) as exc:
                return self.respond(409, {'error': str(exc)[:180]})
        if route == '/api/catalog':
            return self.respond(200, load_catalog(DATA))
        if route == '/api/assets':
            return self.respond(200, {k: list_assets(k) for k in ('backups', 'firmwares', 'projects')})
        if route.startswith('/api/download/'):
            asset_id = route.rsplit('/', 1)[-1]
            for kind in ('backups', 'firmwares', 'projects'):
                for item in list_assets(kind):
                    if item['id'] == asset_id:
                        if item['integrity'] != 'OK':
                            return self.respond(409, {'error': 'File integrity failed'})
                        raw = (DATA / kind / (asset_id + item['extension'])).read_bytes()
                        return self.respond(200, raw, 'application/octet-stream')
            return self.respond(404, {'error': 'Asset not found'})
        if route == '/research':
            return self.respond(200,(ROOT/'OPEN_SOURCE_REPORT.md').read_bytes(),'text/plain; charset=utf-8')
        if route == '/api/legacy':
            files=[]
            for path in (DATA/'legacy-backups').glob('*.syx'):
                raw=path.read_bytes()
                files.append(dict(name=path.name,size=len(raw),sha256=digest(raw)))
            return self.respond(200,files)
        if route.startswith('/api/legacy/'):
            name=route.rsplit('/',1)[-1]
            if re.fullmatch(r'[A-Za-z0-9_.-]+\.syx',name):
                path=DATA/'legacy-backups'/name
                if path.is_file(): return self.respond(200,path.read_bytes(),'application/octet-stream')
            return self.respond(404,{'error':'Backup not found'})
        if route == '/api/install-builds':
            return self.respond(200, install_builds())
        if route.startswith('/previews/'):
            name=route.rsplit('/',1)[-1]
            if re.fullmatch(r'[a-z0-9-]+\.(?:png|jpe?g|webp)',name):
                path=ROOT/'web/previews'/name
                if path.is_file(): return self.respond(200,path.read_bytes(),{'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[path.suffix])
            return self.respond(404,{'error':'Preview not found'})
        if route.startswith('/vendor/'):
            name=route.rsplit('/',1)[-1]
            if name in ('three.module.js','three.core.js'):
                return self.respond(200,(ROOT/'web/vendor'/name).read_bytes(),'text/javascript')
            return self.respond(404,{'error':'Not found'})
        static = {'/theme.js': ('theme.js','text/javascript'), '/telemetry.mjs': ('telemetry.mjs','text/javascript'), '/preview-render.mjs': ('preview-render.mjs','text/javascript'), '/': ('index.html', 'text/html; charset=utf-8'), '/app.js': ('app.js', 'text/javascript'),
                  '/studio.js': ('studio.js', 'text/javascript'), '/studio-core.mjs': ('studio-core.mjs', 'text/javascript'), '/studio.css': ('studio.css', 'text/css'), '/kinetic.js': ('kinetic.js','text/javascript'), '/updater.mjs': ('updater.mjs', 'text/javascript'), '/install.mjs': ('install.mjs', 'text/javascript'), '/catalog-ui.js': ('catalog-ui.js', 'text/javascript'), '/protocol.mjs': ('protocol.mjs', 'text/javascript'), '/style.css': ('style.css', 'text/css')}
        static.update({'/blacksmith.js': ('blacksmith.js','text/javascript'), '/blacksmith.css': ('blacksmith.css','text/css'), '/forge-sounds.mjs': ('forge-sounds.mjs','text/javascript'), '/forge-install.mjs': ('forge-install.mjs','text/javascript'), '/favicon.svg': ('favicon.svg','image/svg+xml'), '/favicon.ico': ('favicon.ico','image/x-icon'), '/app-icon.png': ('app-icon.png','image/png')})
        if route in static:
            name, mime = static[route]
            return self.respond(200, (ROOT / 'web' / name).read_bytes(), mime)
        self.respond(404, {'error': 'Not found'})

    def do_POST(self):
        if not self.trusted() or self.headers.get('X-FM1-Token') != TOKEN:
            return self.respond(403, {'error': 'Local session required'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= MAX_BODY:
                return self.respond(413, {'error': 'Request too large or empty'})
            obj = json.loads(self.rfile.read(size))
            if not isinstance(obj, dict):
                raise ValueError('Expected an object')
            if self.path == '/api/blacksmith/validate': return self.respond(200, blacksmith.validate_recipe(obj))
            if self.path == '/api/blacksmith/builds': return self.respond(202,blacksmith_build.start(DATA,obj))
            if self.path == '/api/blacksmith/projects':
                with LOCK: meta = blacksmith.save_project(DATA, obj)
                return self.respond(201, meta)
            if self.path == '/api/catalog/cache':
                return self.respond(201, cache_package(DATA, obj.get('id'), obj.get('url'), store_asset))
            if self.path == '/api/catalog/refresh':
                items = load_catalog(DATA)
                entry = next((e for e in items if e['id'] == obj.get('id')), None)
                if not entry:
                    raise ValueError('Unknown catalog entry')
                updated = refresh_entry(entry)
                items = [updated if e['id'] == updated['id'] else e for e in items]
                with LOCK:
                    save_catalog(DATA, items)
                return self.respond(200, updated)
            if self.path == '/api/catalog/add':
                repo = str(obj.get('repo', '')).strip()
                if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repo) or '..' in repo:
                    raise ValueError('Enter GitHub owner/repository')
                items = load_catalog(DATA)
                if any(e['repo'].lower() == repo.lower() for e in items):
                    raise ValueError('Repository is already in your catalog')
                entry = dict(id='custom-'+secrets.token_hex(6),name=repo.split('/')[-1],repo=repo,category='Community',
                    description='User-added repository. Check FM-1 compatibility in its documentation.',
                    installer='https://github.com/'+repo,version='Not checked',assets=[])
                items.append(entry)
                with LOCK:
                    save_catalog(DATA, items)
                return self.respond(201,entry)
            kind = {'/api/backups' : 'backups', '/api/firmwares': 'firmwares', '/api/projects': 'projects'}.get(self.path)
            if not kind:
                return self.respond(404, {'error': 'Unknown action'})
            meta = store_asset(kind, obj)
            self.respond(201, meta)
        except (ValueError, TypeError, KeyError) as exc:
            self.respond(400, {'error': str(exc)})
        except OSError as exc:
            self.respond(502, {'error': 'Download or file operation failed: ' + str(exc)[:240]})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8781)
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'fm1: http://127.0.0.1:{args.port}', flush=True)
    if args.open:
        webbrowser.open(f'http://127.0.0.1:{args.port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
