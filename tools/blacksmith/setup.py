"""Prepare the pinned local compiler cache. Run explicitly; never resets Docker or flashes an FM1."""
import hashlib
import json
import shutil
import subprocess
import urllib.request
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
import blacksmith_build as build


def run(*args,cwd=ROOT):
    return subprocess.check_output(args,cwd=cwd,text=True).strip()


def fetch(url,path,sha=None,limit=32*1024*1024):
    if path.is_file() and (not sha or hashlib.sha256(path.read_bytes()).hexdigest()==sha):return
    with urllib.request.urlopen(url,timeout=45) as response:raw=response.read(limit+1)
    if len(raw)>limit:raise ValueError('Download exceeded its size limit')
    if sha and hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('Upstream file does not match its reviewed hash: '+path.name)
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)


def main():
    if run('docker','info','--format','{{.OSType}}')!='linux':raise ValueError('Start Docker Desktop with its Linux engine first')
    cache=build.TOOLS;cache.mkdir(parents=True,exist_ok=True);platform=cache/'platform'
    if not platform.exists():run('git','clone','--no-checkout','https://github.com/charlesvestal/fm1-base.git',str(platform))
    run('git','diff','--exit-code','HEAD',cwd=platform) if (platform/'tools/build.py').exists() else None
    run('git','checkout','--detach',build.BASE,cwd=platform);run('git','submodule','update','--init','--recursive',cwd=platform)
    if run('git','rev-parse','HEAD',cwd=platform/'bsp')!=build.BSP:raise ValueError('BSP pin mismatch')
    fetch('https://jl-update.oss-cn-shenzhen.aliyuncs.com/jieli-linux-toolchains-20260730.1.tar.xz',cache/'toolchain.tar.xz',build.TOOLCHAIN_SHA)
    sdk=cache/'sdk'
    base='https://gitee.com/Jieli-Tech/fw-AC79_AIoT_SDK/raw/AC79NN_SDK_V1.2.1_2023-12-13/'
    for rel,sha in build.SDK_FILES.items():fetch(base+'cpu/wl82/tools/'+rel,sdk/'cpu/wl82/tools'/rel,sha,1024*1024)
    fetch(base+'LICENSE',sdk/'LICENSE','c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4',limit=1024*1024)
    context=cache/'compiler-image';context.mkdir(exist_ok=True)
    shutil.copy2(ROOT/'tools/blacksmith/Dockerfile',context/'Dockerfile');shutil.copy2(cache/'toolchain.tar.xz',context/'toolchain.tar.xz')
    subprocess.run(['docker','build','--tag','fm1-dock-builder:2',str(context)],check=True)
    image=run('docker','image','inspect','fm1-dock-builder:2','--format','{{.Id}}')
    (ROOT/'data').mkdir(exist_ok=True)
    (ROOT/'data/blacksmith-builder-image.json').write_text(json.dumps(dict(image=image,toolchainSha256=build.TOOLCHAIN_SHA),indent=2),encoding='utf-8')
    state=build.environment()
    if not state['ready']:raise ValueError('; '.join(state['issues']))
    print('Blacksmith compiler ready. Reopen the app and choose Check tools.')


if __name__=='__main__':
    try:main()
    except (OSError,ValueError,subprocess.SubprocessError) as exc:raise SystemExit(str(exc))
