import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {inspectReviewed,installReviewed,buildForDigest} from '../web/install.mjs';
const builds=JSON.parse(readFileSync(new URL('../install-builds.json',import.meta.url)));
const folder=new URL('../data/firmwares/',import.meta.url),packages=new Map();
for(const f of readdirSync(folder).filter(f=>f.endsWith('.meta.json'))){const m=JSON.parse(readFileSync(new URL(f,folder)));packages.set(m.sha256,new Uint8Array(readFileSync(new URL(m.id+'.fwsc',folder))));}
for(const build of builds){
 test('reviewed package validation and transfer boundary: '+build.label,{skip:!packages.has(build.sha256)},async()=>{
  const bytes=packages.get(build.sha256),info=await inspectReviewed(bytes,builds);
  assert.equal(info.build.id,build.id);assert.equal(info.image.length,bytes.length-20);
  let calls=0;
  const updater={find:async()=>null,install:async(image,product)=>{calls++;assert.deepEqual(image,info.image);assert.equal(product,build.product);return product;}};
  assert.equal(await installReviewed(bytes,updater,()=>{},builds),build.product);assert.equal(calls,1);
  const damaged=bytes.slice();damaged[damaged.length-1]^=1;calls=0;
  await assert.rejects(installReviewed(damaged,updater,()=>{},builds),/no reviewed/);assert.equal(calls,0);
 });
}
test('matching digest without the exact reviewed size never enables installation',()=>{
 const b=builds[0];assert.equal(buildForDigest(builds,b.sha256,b.size-1),null);assert.equal(buildForDigest(builds,b.sha256,b.size).id,b.id);
});
test('shared FM-1_900 product marker cannot approve an unknown image',async()=>{
 const bytes=new Uint8Array(1100).fill(125),name='FM-1_900';for(let i=0;i<name.length;i++)bytes[i*48+47]=name.charCodeAt(i)+i+1;
 let probed=false;await assert.rejects(installReviewed(bytes,{find(){probed=true;}},()=>{},builds),/no reviewed/);assert.equal(probed,false);
});
test('reviewed wrapper rejects a foreign loader before invoking resume', {skip:!packages.has(builds[0].sha256)},async()=>{
 let resumed=false,closed=false;const updater={find:async()=>({id:{model:'ota-FM-1',text:'ota-FM-1_015'},link:{close(){closed=true;}}}),resume(){resumed=true;}};
 await assert.rejects(installReviewed(packages.get(builds[0].sha256),updater,()=>{},builds),/another firmware/);assert.equal(resumed,false);assert.equal(closed,true);
});
test('a resumed reviewed build still requires matching post-reboot identity', {skip:!packages.has(builds[0].sha256)},async()=>{
 const updater={find:async()=>({id:{model:'ota-FM-1',text:'ota-FM-1_900'},link:{close(){}}}),resume:async()=>true,waitFor:async()=>({id:{text:'FM-1_015'},link:{close(){}}})};
 await assert.rejects(installReviewed(packages.get(builds[0].sha256),updater,()=>{},builds),/Unexpected identity/);
});
