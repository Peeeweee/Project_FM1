import {sha256hex,productOf,logicalImage} from './updater.mjs';
import {installImage} from './install.mjs';
export const BASE_COMMIT='3c4a57eea659f942b0c80a99949dddafc094a57b';
export const BSP_COMMIT='41a6e86d921f842243bd01a48111832f7e55b4e2';
export async function inspectLocalBuild(bytes,meta){
  if(!meta||!/^build-[a-f0-9]{24}$/.test(meta.id)||meta.state!=='ready'||meta.compiled!==true||meta.installable!==true||meta.baseCommit!==BASE_COMMIT||meta.bspCommit!==BSP_COMMIT||meta.product!=='FM-1_1100'||!Number.isInteger(meta.size)||meta.size<20000||meta.size>2097152||!/^[a-f0-9]{64}$/.test(meta.sha256)||!/^[a-f0-9]{64}$/.test(meta.loaderSha256))throw Error('This is not a completed local Blacksmith build.');
  const raw=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(raw.length!==meta.size||await sha256hex(raw)!==meta.sha256||productOf(raw)!==meta.product)throw Error('Local firmware changed after compilation. Rebuild before installing.');
  const marker=new TextEncoder().encode('FELUCCA-LOADER-1');
  if(!raw.some((_,i)=>marker.every((b,j)=>raw[i+j]===b)))throw Error('Pinned-platform update loader marker is absent.');
  return {sha256:meta.sha256,product:meta.product,image:logicalImage(raw),build:meta};
}
export async function installLocalBuild(bytes,meta,updater,step){
  return installImage(await inspectLocalBuild(bytes,meta),updater,step);
}
