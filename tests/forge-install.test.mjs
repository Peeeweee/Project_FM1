import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLocalBuild,installLocalBuild,BASE_COMMIT,BSP_COMMIT} from '../web/forge-install.mjs';
import {sha256hex,Updater} from '../web/updater.mjs';
import {frame} from '../web/protocol.mjs';

// Format-only synthetic fixture. Not compiled firmware and never sent to a port.
async function fixture(){
  const bytes=new Uint8Array(24000);for(let i=0;i<20;i++)bytes[i*48+47]=125;
  [...'FM-1_1100'].forEach((c,i)=>bytes[i*48+47]=(c.charCodeAt(0)+i+1)&255);
  bytes.set(new TextEncoder().encode('FELUCCA-LOADER-1'),2000);
  return {bytes,meta:{id:'build-'+'a'.repeat(24),state:'ready',compiled:true,installable:true,baseCommit:BASE_COMMIT,bspCommit:BSP_COMMIT,
    product:'FM-1_1100',size:bytes.length,sha256:await sha256hex(bytes),loaderSha256:'b'.repeat(64)}};
}
test('local build uses separate provenance and rejects changed or unfinished output',async()=>{
  const {bytes,meta}=await fixture();assert.equal((await inspectLocalBuild(bytes,meta)).product,'FM-1_1100');
  for(const changes of [{state:'failed'},{compiled:false},{baseCommit:'unknown'},{product:'FM-1_900'},{size:1},{id:'../../file'}])
    await assert.rejects(inspectLocalBuild(bytes,{...meta,...changes}));
  bytes[1500]^=1;await assert.rejects(inspectLocalBuild(bytes,meta),/changed/);
});
test('bad local firmware is rejected before device probing',async()=>{
  const {bytes,meta}=await fixture();await assert.rejects(installLocalBuild(bytes,{...meta,compiled:false},{find:()=>assert.fail('no hardware access')}));
});
test('completed synthetic build passes its exact identity to simulated transfer',async()=>{
  const {bytes,meta}=await fixture();let called=0;
  const up={find:async()=>null,install:async(image,product)=>{called++;assert.equal(product,'FM-1_1100');assert.equal(image.length,bytes.length-20);return product;}};
  assert.equal(await installLocalBuild(bytes,meta,up),'FM-1_1100');assert.equal(called,1);
});
test('local updater asks the pinned full-identity handshake after a short FM1 identity',async()=>{
  const input={name:'FM-1 Midi',state:'connected',open:async()=>{}},sent=[];
  const reply=name=>frame(17,[...new TextEncoder().encode(name),...Array(27-name.length).fill(0)]);
  const output={name:'FM-1 Midi',state:'connected',open:async()=>{},send(bytes){sent.push(bytes);queueMicrotask(()=>input.onmidimessage({data:reply(sent.length===1?'FM-1_110':'FM-1_1100')}));}};
  const found=await new Updater({},()=>{},{fullIdentity:true}).probe(input,[output]);
  assert.equal(found.id.text,'FM-1_1100');assert.deepEqual(sent[1],[240,0,50,69,8,0,0,64,0,126,1,247]);found.link.close();
});
