import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NoteRecorder,cleanNotes,midiFile,wavFile,editorFrame,editorReply,infoReply,trackReply} from '../web/studio-core.mjs';
test('live recorder preserves free timing, note lengths and leading silence',()=>{
 const r=new NoteRecorder();r.start(1000);r.message([144,60,100],1234);r.message([128,60,0],1678);r.message([145,64,70],1900);const out=r.stop(2200);
 assert.equal(out.length,2);assert.equal(out[0].start,.234);assert.ok(Math.abs(out[0].duration-.444)<1e-10);assert.equal(out[1].channel,1);assert.ok(Math.abs(out[1].duration-.3)<1e-10);
});
test('zero-velocity note on releases a note and stopping ends held notes',()=>{
 const r=new NoteRecorder();r.start(0);r.message([144,60,80],10);r.message([144,60,0],20);r.message([144,61,90],25);const notes=r.stop(100);assert.equal(notes.length,2);assert.ok(Math.abs(notes[1].duration-.075)<1e-10);assert.equal(r.held.size,0);
});
test('project validation rejects oversized, malformed and out-of-range notes',()=>{
 assert.throws(()=>cleanNotes(Array(10001).fill({})));assert.throws(()=>cleanNotes([{start:-1,duration:1,pitch:60,velocity:90,channel:0}]));assert.throws(()=>cleanNotes([{start:0,duration:1,pitch:128,velocity:90,channel:0}]));
});
test('MIDI export has correct chunk sizes, tempo and paired note messages',()=>{
 const midi=midiFile([{id:'a',start:.125,duration:.375,pitch:60,velocity:96,channel:2}]);const v=new DataView(midi.buffer);assert.equal(new TextDecoder().decode(midi.slice(0,4)),'MThd');assert.equal(new TextDecoder().decode(midi.slice(14,18)),'MTrk');assert.equal(v.getUint32(18),midi.length-22);assert.deepEqual(Array.from(midi.slice(-4)),[0,255,47,0]);assert.ok(midi.includes(146));assert.ok(midi.includes(130));
});
test('WAV export trims and interleaves stereo PCM16 with correct headers',()=>{
 const a=new Float32Array(8000),b=new Float32Array(8000);a.fill(1);b.fill(-1);const bytes=wavFile([a,b],8000,.25,.5),v=new DataView(bytes.buffer);assert.equal(bytes.length,44+2000*4);assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),8000);assert.equal(v.getInt16(44,true),32767);assert.equal(v.getInt16(46,true),-32768);assert.throws(()=>wavFile([a],8000,.9,.2));
});
test('SLOOP snapshot uses only documented read command framing',()=>{
 assert.deepEqual(editorFrame(27),[240,125,70,76,27,247]);assert.deepEqual(editorReply(editorFrame(1,[1,2]),1),[1,2]);assert.equal(editorReply(editorFrame(2,[1,2]),1),null);
});
test('SLOOP info and selected track parsing are bounded',()=>{
 const text=s=>Array.from(s,c=>c.charCodeAt(0)).concat(0),info=infoReply([...text('SLOOP 2.8.4'),1,71,50,64,63,...text('FM6'),4,12]);assert.equal(info.version,'SLOOP 2.8.4');assert.equal(info.proto,12);const tr=trackReply([0,1,0,2,81,64,0,1]);assert.equal(tr.tracks[0].level,81);assert.equal(tr.tracks[0].armed,1);assert.throws(()=>trackReply([0,99]));
});

test('duplicate imported note IDs are rejected',()=>{const n={id:'same',start:0,duration:1,pitch:60,velocity:90,channel:0};assert.throws(()=>cleanNotes([n,{...n,start:2}]),/unique ID/);});
