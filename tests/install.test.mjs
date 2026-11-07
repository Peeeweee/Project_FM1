import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {inspectPinned,installPinned,PIN} from '../web/install.mjs';
import {Updater,productOf,logicalImage,parseRequest,response} from '../web/updater.mjs';
import {frame,decode} from '../web/protocol.mjs';
const folder=new URL('../data/firmwares/',import.meta.url);
let cached;
if(existsSync(folder))for(const file of readdirSync(folder).filter(n=>n.endsWith('.meta.json'))){const meta=JSON.parse(readFileSync(new URL(file,folder)));if(meta.sha256===PIN.sha256)cached=new Uint8Array(readFileSync(new URL(meta.id+'.fwsc',folder)));}
test('reject unknown or corrupted firmware before any updater call',async()=>{
  let calls=0;const updater={find:()=>{calls++;}};
  await assert.rejects(installPinned(new Uint8Array(1024),updater,()=>{}),/no reviewed offline adapter/);
  assert.equal(calls,0);
});
test('bounded package logical image strips only marker bytes',()=>{
  const raw=new Uint8Array(1000).fill(125),name='FM-1_900';
  for(let i=0;i<name.length;i++)raw[i*48+47]=name.charCodeAt(i)+i+1;
  assert.equal(productOf(raw),name);assert.equal(logicalImage(raw).length,980);
  assert.throws(()=>productOf(new Uint8Array(5)),/too short/);
});
test('simulated update read preserves request flash type and exact byte range',async()=>{
  const packets=[frame(48,[3,2,0,0,0,2,0,0]),frame(48,[0,0,0,0,240,0,0,0])], sent=[];
  const link={read:async()=>packets.shift(),send:bytes=>{sent.push(bytes);return true;}};
  const up=new Updater({});const result=await up.serve(link,new Uint8Array([10,20,30,40,50]),0xf0000000,100,()=>{});
  assert.equal(result.finished,true);const reply=decode(sent[0]);assert.equal(reply.type,48);assert.equal(reply.body[0],3);assert.deepEqual(reply.body.slice(8),[30,40]);
});
test('rejects out-of-range firmware requests instead of serving memory',async()=>{
  const link={read:async()=>frame(48,[0,250,255,255,255,255,255,0]),send:()=>assert.fail('must not send')};
  await assert.rejects(new Updater({}).serve(link,new Uint8Array(100),0xf0000000,100),/bad request/);
});
test('foreign update loader cannot be resumed',async()=>{
  const up=new Updater({});let closed=false;
  up.find=async()=>({id:{model:'ota-FM-1',text:'ota-FM-1_015'},link:{close:()=>closed=true}});
  up.write=()=>assert.fail('foreign loader must not be written');
  await assert.rejects(up.resume(new Uint8Array(1024),()=>{}),/another firmware/);assert.equal(closed,true);
});
test('native parser rejects damaged request checksums',()=>{
  const f=response(0,[1,2,3]);f[f.length-2]^=1;assert.equal(parseRequest(f),null);
});
test('real pinned local package validates without network', {skip:!cached},async()=>{
  const info=await inspectPinned(cached);assert.equal(info.product,PIN.product);assert.equal(info.image.length,cached.length-20);
});
test('normal installation wrapper passes only the validated image', {skip:!cached},async()=>{
  let called=false;
  const fake={find:async()=>null,install:async(image,product)=>{called=true;assert.equal(product,PIN.product);assert.equal(image.length,cached.length-20);return product;}};
  assert.equal(await installPinned(cached,fake,()=>{}),PIN.product);assert.equal(called,true);
});
test('resumed installation is not successful without matching reboot identity', {skip:!cached},async()=>{
  const fake={find:async()=>({id:{model:'ota-FM-1',text:'ota-FM-1_900'},link:{close(){}}}),resume:async()=>true,waitFor:async()=>({id:{text:'FM-1_015'},link:{close(){}}})};
  await assert.rejects(installPinned(cached,fake,()=>{}),/Unexpected identity/);
});
