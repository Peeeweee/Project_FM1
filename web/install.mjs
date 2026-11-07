import {Updater, productOf, logicalImage, sha256hex, OUR_LOADER} from './updater.mjs';
export const PIN = Object.freeze({"id": "sloop-2.8.4", "firmwareId": "sloop", "label": "SLOOP 2.8.4", "version": "2.8.4", "adapter": "felucca-v1", "name": "sloop-2.8.4.fwsc", "sha256": "5a6a0843c868650dba6718cf85e43e719aec18c3dc5cc803c57c38b382158d4e", "size": 610052, "product": "FM-1_900", "url": "https://raw.githubusercontent.com/isod89/sloop-fm1/91f30182d9095e0ecdb43396554f2ce5a67df179/docs/firmware/sloop-2.8.4.fwsc", "source": "https://github.com/isod89/sloop-fm1", "recovery": "https://github.com/isod89/sloop-fm1/blob/main/SLOOP.md#rescue-going-back-credits", "reviewedAt": "2026-11-05", "hardwareTested": false});

export function buildForDigest(builds,sha256,size){
  return builds.find(b=>b.adapter==='felucca-v1'&&b.product==='FM-1_900'&&/^[a-f0-9]{64}$/.test(b.sha256)&&b.sha256===sha256&&b.size===size)||null;
}
export async function inspectReviewed(bytes,builds){
  const raw=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  const sha256=await sha256hex(raw),build=buildForDigest(builds,sha256,raw.length);
  if(!build)throw Error('This package has no reviewed offline adapter. Use the creator installer.');
  const product=productOf(raw);
  if(product!==build.product)throw Error('Package identity mismatch');
  return {sha256,product,build,image:logicalImage(raw)};
}
async function transfer(info,updater,step=()=>{}){
  const ota=await updater.find(id=>/^ota-/i.test(id.model),true);
  if(ota){
    if(!OUR_LOADER(ota.id)){ota.link.close();throw Error('The FM1 is in another firmware update loader. Use its matching installer.');}
    ota.link.close();
    if(!await updater.resume(info.image,step))throw Error('Resume did not finish. Keep power connected and use matching recovery instructions.');
    step('reboot');
    const back=await updater.waitFor(id=>!/^ota-/i.test(id.model),60000);
    if(!back)throw Error('Write completed but the instrument has not reappeared. Do not assume installation is confirmed.');
    back.link.close();
    if(back.id.text!==info.product)throw Error(`Unexpected identity after reboot: ${back.id.text}`);
    step('done',back.id.text);return back.id.text;
  }
  return updater.install(info.image,info.product,step);
}
// Internal transfer contract; callers must validate their distinct provenance before device access.
export const installImage=(info,updater,step)=>transfer(info,updater,step);
export async function installReviewed(bytes,updater,step,builds){
  // Mandatory byte, size and identity check immediately before any device probing.
  return transfer(await inspectReviewed(bytes,builds),updater,step);
}
export const inspectPinned=bytes=>inspectReviewed(bytes,[PIN]);
export const installPinned=(bytes,updater,step)=>installReviewed(bytes,updater,step,[PIN]);
export {Updater};
