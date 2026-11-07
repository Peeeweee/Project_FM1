import test from 'node:test';
import assert from 'node:assert/strict';
import {readSloopSnapshot,instrumentFor,eventName,drumName} from '../web/telemetry.mjs';
import {NoteRecorder,cleanNotes,midiFile} from '../web/studio-core.mjs';
import {fakeSloop} from './fixtures/sloop-device.mjs';

test('read-only snapshot gets selected engine, kit and custom channels without selecting a track',async()=>{
 const f=fakeSloop(),s=await readSloopSnapshot(f.request,{});assert.equal(s.selected,3);assert.equal(s.tracks[3].preset,'808');assert.equal(s.tracks[3].channel,6);assert.equal(s.tracks[1].preset,'Rhodes');assert.equal(s.tracks[1].engine,'DIGITAL');assert.equal(f.state.selected,3);
 for(const [cmd,args] of f.calls){assert.ok([1,4,5,10,27,29].includes(cmd));if(cmd===27)assert.deepEqual(args,[]);}
});
test('drum classification follows the device channel, never a guessed channel 10',async()=>{
 const f=fakeSloop(),s=await readSloopSnapshot(f.request,{});assert.equal(instrumentFor(5,s).kind,'drum');assert.equal(instrumentFor(9,s),undefined);assert.equal(instrumentFor(10,s).kind,'melodic');assert.equal(eventName({pitch:36,instrument:instrumentFor(5,s)}),'Kick');assert.equal(eventName({pitch:36,instrument:instrumentFor(10,s)}),'C2');
});
test('cached names still follow a changed preset and drum kit',async()=>{
 const f=fakeSloop(),cache={};await readSloopSnapshot(f.request,cache);f.state.kit=2;f.state.preset=1;f.state.selected=1;f.calls.length=0;const s=await readSloopSnapshot(f.request,cache);assert.equal(s.tracks[1].preset,'Flute');assert.equal(s.tracks[3].preset,'Dust');assert.equal(s.selected,1);assert.equal(f.state.selected,1);assert.equal(f.calls.some(([c])=>c===10),false);assert.equal(f.calls.some(([c])=>c===5),false);
});
test('unknown drum kit is explicit until the user naturally selects drums; reader never switches',async()=>{
 const f=fakeSloop();f.state.selected=0;const s=await readSloopSnapshot(f.request,{});assert.match(s.tracks[3].preset,/select drums/);assert.equal(f.state.selected,0);assert.equal(s.tracks[0].preset,'Fat Bass');
});
test('a track change during a reply is rejected instead of attaching the wrong name',async()=>{
 const f=fakeSloop();let n=0;const request=async(c,a)=>{const out=f.reply(c,a);if(c===27&&++n===1)f.state.selected=1;return out;};await assert.rejects(readSloopSnapshot(request,{}),/changed/);
});
test('unsupported firmware and malformed replies do not trigger further commands',async()=>{
 let calls=0;await assert.rejects(readSloopSnapshot(async()=>{calls++;return [88,0,0,0,0,0,0,0,0];},{}));assert.equal(calls,1);await assert.rejects(readSloopSnapshot(async()=>[],{}));
});
test('manual fallback is explicit and does not relabel other channels',()=>{
 const manual={channel:4,name:'My kit'};assert.equal(instrumentFor(3,null,manual).source,'manual');assert.equal(instrumentFor(3,null,manual).preset,'My kit');assert.equal(instrumentFor(9,null,manual),undefined);assert.equal(drumName(127),'Drum 127');
});
test('recorded hits keep their kit at note-on, timing, original channel and MIDI pitch',()=>{
 const r=new NoteRecorder(),instrument={kind:'drum',source:'device',engine:'Drums',preset:'808',track:4,readAt:'2026-11-04T13:00:00.000Z'};
 r.start(1000);r.message([149,36,110],1137,instrument);instrument.preset='Dust';r.message([133,36,0],1260);const notes=r.stop(1300);assert.equal(notes[0].instrument.preset,'808');assert.equal(notes[0].start,.137);assert.equal(notes[0].channel,5);assert.equal(notes[0].pitch,36);assert.equal(eventName(notes[0]),'Kick');assert.equal(cleanNotes(JSON.parse(JSON.stringify(notes)))[0].instrument.track,4);assert.ok(midiFile(notes).includes(149));
});
test('invalid or oversized instrument metadata is rejected; old projects stay valid',()=>{
 const n={id:'a',start:0,duration:.5,pitch:60,channel:0,velocity:90};assert.equal(cleanNotes([n])[0].instrument,undefined);assert.throws(()=>cleanNotes([{...n,instrument:{kind:'drum',source:'guessed'}}]));assert.throws(()=>cleanNotes([{...n,instrument:{kind:'drum',source:'manual',preset:'x'.repeat(121)}}]));
});


test('accepts the actual shipped FELUCCA SLOOP 2.8.4 INFO string and compatible spellings',async()=>{
 for(const version of ['FELUCCA SLOOP 2.8.4','SLOOP 2.8.4','FELUCCA 2.8.4']){
  const f=fakeSloop(version),s=await readSloopSnapshot(f.request,{});assert.equal(s.version,version);assert.equal(s.tracks[3].preset,'808');assert.ok(f.calls.some(([cmd])=>cmd===27));
 }
});
test('reports the received identity on unsupported firmware and stops after INFO',async()=>{
 const f=fakeSloop('ORBIT 0.10.0');await assert.rejects(readSloopSnapshot(f.request,{}),/ORBIT 0\.10\.0/);assert.deepEqual(f.calls,[[1,[]]]);
});
