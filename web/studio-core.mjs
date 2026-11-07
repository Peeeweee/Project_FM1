export const noteName = n => ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((n%12)+12)%12]+(Math.floor(n/12)-1);
export function cleanInstrument(x){
 if(x===undefined)return undefined;
 if(!x||!['drum','melodic'].includes(x.kind)||!['device','manual'].includes(x.source))throw Error('Invalid instrument details.');
 const o={kind:x.kind,source:x.source};
 for(const k of ['engine','preset','readAt'])if(x[k]!==undefined){if(typeof x[k]!=='string'||x[k].length>(k==='readAt'?40:120))throw Error('Invalid instrument '+k);o[k]=x[k];}
 if(x.track!==undefined){if(!Number.isInteger(x.track)||x.track<1||x.track>8)throw Error('Invalid instrument track.');o.track=x.track;}return o;
}
export function cleanNotes(notes) {
  if(!Array.isArray(notes)||notes.length>10000)throw Error('A project must contain at most 10,000 notes.');
  const ids=new Set();
  return notes.map((n,i)=>{
    if(!Number.isFinite(n.start)||!Number.isFinite(n.duration)||n.start<0||n.start>3600||n.duration<0.01||n.duration>3600)throw Error('Invalid note timing.');
    if(!Number.isInteger(n.pitch)||n.pitch<0||n.pitch>127||!Number.isInteger(n.velocity)||n.velocity<1||n.velocity>127||!Number.isInteger(n.channel)||n.channel<0||n.channel>15)throw Error('Invalid note values.');
    const id=String(n.id||'note-'+i);if(ids.has(id))throw Error('Every note needs a unique ID.');ids.add(id);
    return {id,start:n.start,duration:n.duration,pitch:n.pitch,velocity:n.velocity,channel:n.channel,...(n.instrument===undefined?{}:{instrument:cleanInstrument(n.instrument)})};
  }).sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
}
export function vlq(n){if(!Number.isSafeInteger(n)||n<0||n>0xfffffff)throw Error('MIDI time is out of range');const a=[n&127];while((n=Math.floor(n/128)))a.unshift((n&127)|128);return a;}
export function midiFile(notes,bpm=120){
  const safe=cleanNotes(notes);bpm=Math.max(20,Math.min(300,Number(bpm)||120));
  const ppq=480,ticks=s=>Math.round(s*bpm/60*ppq),events=[];
  for(const n of safe){events.push({at:ticks(n.start),priority:1,data:[0x90|n.channel,n.pitch,n.velocity]});events.push({at:ticks(n.start+n.duration),priority:0,data:[0x80|n.channel,n.pitch,0]});}
  events.sort((a,b)=>a.at-b.at||a.priority-b.priority);const us=Math.round(60000000/bpm),track=[0,255,81,3,(us>>>16)&255,(us>>>8)&255,us&255];let at=0;
  for(const e of events){track.push(...vlq(e.at-at),...e.data);at=e.at;}track.push(0,255,47,0);
  const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
  return new Uint8Array([77,84,104,100,...u32(6),0,0,0,1,1,224,77,84,114,107,...u32(track.length),...track]);
}
export class NoteRecorder {
  constructor(){this.notes=[];this.held=new Map();this.started=0;this.active=false;this.serial=0;}
  start(now){this.notes=[];this.held.clear();this.started=now;this.active=true;}
  message(bytes,now,instrument){
    if(!this.active||bytes.length<3)return;const type=bytes[0]&240,channel=bytes[0]&15,pitch=bytes[1];if(pitch>127)return;
    const key=channel+':'+pitch,time=Math.max(0,(now-this.started)/1000);
    if(type===144&&bytes[2]>0){if(this.notes.length+this.held.size>=10000)return;const existing=this.held.get(key);if(existing)this.finish(key,time);this.held.set(key,{id:'note-'+(++this.serial),start:time,pitch,velocity:Math.min(127,bytes[2]),channel,...(instrument?{instrument:cleanInstrument(instrument)}:{})});}
    else if(type===128||(type===144&&bytes[2]===0))this.finish(key,time);
  }
  finish(key,time){const n=this.held.get(key);if(n){this.notes.push({...n,duration:Math.max(0.01,time-n.start)});this.held.delete(key);}}
  stop(now){const time=Math.max(0,(now-this.started)/1000);for(const key of this.held.keys())this.finish(key,time);this.active=false;return cleanNotes(this.notes);}
}
export function wavFile(channels,rate,start=0,end){
  if(!Array.isArray(channels)||!channels.length||!channels.every(c=>c instanceof Float32Array))throw Error('Invalid audio samples');
  const sampleRate=Math.round(rate);if(sampleRate<8000||sampleRate>192000)throw Error('Invalid sample rate');
  const nChannels=Math.min(channels.length,2),frames=Math.min(...channels.slice(0,nChannels).map(c=>c.length));
  const from=Math.max(0,Math.min(frames,Math.floor(start*sampleRate))),to=Math.max(from,Math.min(frames,end===undefined?frames:Math.floor(end*sampleRate))),length=to-from;
  if(length<=0)throw Error('Choose a trim end after the start');
  const buffer=new ArrayBuffer(44+length*nChannels*2),v=new DataView(buffer),word=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  word(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nChannels,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*nChannels*2,true);v.setUint16(32,nChannels*2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,length*nChannels*2,true);
  let at=44;for(let i=from;i<to;i++)for(let c=0;c<nChannels;c++){const x=Math.max(-1,Math.min(1,channels[c][i]||0));v.setInt16(at,Math.round(x*(x<0?32768:32767)),true);at+=2;}
  return new Uint8Array(buffer);
}
export function editorFrame(command,args=[]){return [240,125,70,76,command,...args,247];}
export function editorReply(bytes,command){if(bytes.length<6||bytes[0]!==240||bytes.at(-1)!==247||bytes[1]!==125||bytes[2]!==70||bytes[3]!==76||bytes[4]!==command)return null;return Array.from(bytes).slice(5,-1);}
export class Reader{constructor(a){this.a=a;this.i=0;}b(){if(this.i>=this.a.length)throw Error('Incomplete device reply');return this.a[this.i++];}v(){return (this.b()|(this.b()<<7))-8192;}s(){let out='';for(;;){const c=this.b();if(!c)return out;out+=String.fromCharCode(c);}}}
export function infoReply(a){const r=new Reader(a),o={version:r.s(),nengines:r.b(),pcount:r.b(),gcount:r.b(),nstep:r.b(),pe0:r.b(),engines:[]};if(o.nengines>32)throw Error('Unexpected engine count');for(let i=0;i<o.nengines;i++)o.engines.push(r.s());o.ntrk=r.i<a.length?r.b():0;o.proto=r.i<a.length?r.b():0;return o;}
export function trackReply(a){const r=new Reader(a),o={selected:r.b(),count:r.b(),tracks:[]};if(o.count>8)throw Error('Unexpected track count');for(let i=0;i<o.count;i++)o.tracks.push({engine:r.b(),preset:r.b(),level:r.v(),mute:r.b(),armed:r.b()});return o;}
