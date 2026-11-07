"""Local, pinned fm1-base builds. JSON recipes never provide commands or build flags."""
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
import blacksmith

BASE = '3c4a57eea659f942b0c80a99949dddafc094a57b'
BSP = '41a6e86d921f842243bd01a48111832f7e55b4e2'
TOOLCHAIN_SHA = 'a1545cddbc451a06bac43eb5cd96d831470c42a97c5c0b1f98879a20fc7647bd'
SDK_FILES = {'uboot.boot':'4e3b4c220dc96641cb5a723f41e68ce41d5261ae9434bb33fbd7f2c59976ded4',
 'cfg_tool.bin':'276579954f076886a6a7694f65dc71c034a63a2c204b76749065c0ac7b010d1b',
 'cfg/eq_cfg_hw.bin':'41167491bffed4651750719c973d2758adeb9021a5670d02d6a53c85ed80ea7d'}
ROOT=Path(__file__).resolve().parent
TOOLS=ROOT/'work/blacksmith-research'
_lock=threading.Lock()
_active=None


def _run(args, cwd=None, timeout=20):
    return subprocess.run(args,cwd=cwd,capture_output=True,text=True,timeout=timeout,check=True,
                          creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0).stdout.strip()


def environment(check_engine=True):
    platform=TOOLS/'platform';tc=TOOLS/'toolchains/jieli-linux-toolchains-20260730.1';sdk=TOOLS/'sdk'
    result=dict(ready=False,baseCommit=BASE,bspCommit=BSP,issues=[],platform=str(platform),toolchain=str(tc),sdk=str(sdk))
    try:
        for folder,pin in [(platform,BASE),(platform/'bsp',BSP)]:
            if _run(['git','rev-parse','HEAD'],folder)!=pin: raise ValueError('Platform revision differs from the reviewed pin')
            _run(['git','diff','--exit-code','HEAD'],folder)
        archive=TOOLS/'toolchain.tar.xz'
        if not archive.is_file() or hashlib.sha256(archive.read_bytes()).hexdigest()!=TOOLCHAIN_SHA:
            raise ValueError('Pinned toolchain archive is missing or changed')
        for rel,sha in SDK_FILES.items():
            p=sdk/'cpu/wl82/tools'/rel
            if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=sha: raise ValueError('Pinned SDK packaging file missing or changed: '+rel)
        if check_engine and _run(['docker','info','--format','{{.OSType}}'],timeout=8)!='linux':
            raise ValueError('Docker must use the Linux engine')
        image=json.loads((ROOT/'data/blacksmith-builder-image.json').read_text(encoding='utf-8'))['image']
        if not re.fullmatch(r'sha256:[0-9a-f]{64}',image):raise ValueError('Compiler image is not pinned')
        if check_engine and _run(['docker','image','inspect',image,'--format','{{.Id}}'],timeout=8)!=image:
            raise ValueError('Compiler container image is missing')
        result['image']=image
        result['ready']=True
    except (OSError,subprocess.SubprocessError,ValueError) as exc:
        result['issues'].append('Start Docker Desktop (Linux engine), or complete the local build setup. '+str(exc)[:180])
    return result


def folder(data,ident):
    if not isinstance(ident,str) or not re.fullmatch(r'build-[0-9a-f]{24}',ident): raise ValueError('Invalid build ID')
    return Path(data)/'blacksmith-builds'/ident


def status(data,ident):
    p=folder(data,ident);m=json.loads((p/'build.json').read_text(encoding='utf-8'))
    if m.get('state') in ('queued','building') and ident!=_active:
        m['state']='interrupted';m['error']='The server restarted before this build finished. Build again.'
    log=p/'build.log'
    m['log']=log.read_text(encoding='utf-8',errors='replace')[-16000:] if log.is_file() else ''
    return m


def builds(data):
    out=[]
    for p in (Path(data)/'blacksmith-builds').glob('build-*/build.json'):
        try:out.append(status(data,p.parent.name))
        except (OSError,ValueError,KeyError):continue
    return sorted(out,key=lambda m:m['created'],reverse=True)[:30]


def verify_package(raw):
    if not 20000<=len(raw)<=2*1024*1024: raise ValueError('Compiled package has an invalid size')
    product=''.join(chr((raw[i*48+47]-i-1)&255) for i in range(20) if raw[i*48+47]!=125)
    if product!='FM-1_1100': raise ValueError('Build package identity mismatch')
    if b'FELUCCA-LOADER-1' not in raw: raise ValueError('Expected pinned-platform update loader is absent')
    return dict(sha256=hashlib.sha256(raw).hexdigest(),size=len(raw),product=product)


def artifact(data,ident):
    p=folder(data,ident);m=status(data,ident)
    if m.get('state')!='ready' or not m.get('compiled') or m.get('baseCommit')!=BASE or m.get('bspCommit')!=BSP:
        raise ValueError('This build is not ready for installation')
    raw=(p/'firmware.fwsc').read_bytes();actual=verify_package(raw)
    if any(actual[k]!=m.get(k) for k in actual): raise ValueError('Local build integrity failed; rebuild before installing')
    return m,raw


def _write(p,m):
    temp=p/'build.next.json';temp.write_text(json.dumps(m,indent=2),encoding='utf-8');temp.replace(p/'build.json')


def start(data,recipe):
    global _active
    r=blacksmith.validate_recipe(recipe)
    with _lock:
        if _active: raise ValueError('Another firmware is building. Wait for it to finish.')
        env=environment()
        if not env['ready']:raise ValueError(env['issues'][0])
        import secrets
        ident='build-'+secrets.token_hex(12);p=folder(data,ident);app=p/'app';app.mkdir(parents=True)
        for name,raw in blacksmith.generate_sources(r).items():
            path=app/name;path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(raw if isinstance(raw,bytes) else raw.encode('utf-8'))
        m=dict(id=ident,name=r['name'],deviceName=r['deviceName'],state='queued',compiled=False,installable=False,
               created=datetime.now(timezone.utc).isoformat(),baseCommit=BASE,bspCommit=BSP,
               recipeSha256=hashlib.sha256(json.dumps(r,sort_keys=True).encode()).hexdigest(),hardwareTested=False)
        _write(p,m);_active=ident
        threading.Thread(target=_build,args=(p,app,m,env),daemon=True).start()
    return m


def _build(p,app,m,config):
    global _active
    try:
        m['state']='building';_write(p,m)
        env=os.environ.copy();env.update(JIELI_TOOLCHAIN=config['toolchain'],AC79_SDK=config['sdk'],JIELI_DOCKER='1',PYTHONUNBUFFERED='1')
        # Build features come only from validated generated sources; inherited feature overrides are excluded.
        for key in list(env):
            if key.startswith(('FM1B_','X0X_')) or key in ('PYTHONPATH','PYTHONHOME','JIELI_DOCKER_IMAGE'):env.pop(key,None)
        # Run the whole build on Linux: upstream's relative paths and font renderer are not Windows-native.
        command=['docker','run','--rm','--name','fm1-dock-'+m['id'],'--network','none','--memory','1g','--cpus','2',
                 '--cap-drop','ALL','--security-opt','no-new-privileges',
                 '-v',config['platform']+':/work/platform:ro','-v',str(app.resolve())+':/work/app',
                 '-v',config['sdk']+':/sdk:ro',
                 config['image'],'python','/work/platform/tools/build.py','/work/app','--no-ble','--sdk','/sdk']
        m['builderImage']=config['image'];_write(p,m)
        with (p/'build.log').open('w',encoding='utf-8') as log:
            result=subprocess.run(command,cwd=config['platform'],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=600,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
        if result.returncode:raise ValueError('Compilation failed. Open the build log for the compiler message.')
        outputs=list((app/'build').glob('*.fwsc'))
        if len(outputs)!=1:raise ValueError('Compiler did not produce exactly one firmware package')
        raw=outputs[0].read_bytes();m.update(verify_package(raw));(p/'firmware.fwsc').write_bytes(raw)
        loader=app/'build/loader/ota.bin';m['loaderSha256']=hashlib.sha256(loader.read_bytes()).hexdigest()
        m.update(state='ready',compiled=True,installable=True,finished=datetime.now(timezone.utc).isoformat())
    except subprocess.TimeoutExpired:
        try:_run(['docker','stop','--time','1','fm1-dock-'+m['id']],timeout=10)
        except (OSError,subprocess.SubprocessError):pass
        m.update(state='failed',error='Build exceeded ten minutes and was stopped. Your source is preserved.',compiled=False,installable=False)
    except (OSError,ValueError,subprocess.SubprocessError) as exc:m.update(state='failed',error=str(exc)[:400],compiled=False,installable=False)
    finally:
        try:_write(p,m)
        finally:
            with _lock:_active=None
