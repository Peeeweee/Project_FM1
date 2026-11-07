// Read-only SLOOP 2.x telemetry. Source protocol: isod89/sloop-fm1, commit
// 91f30182d9095e0ecdb43396554f2ce5a67df179, firmware/src/{editor,drums,seq}.c.
import {Reader,infoReply,trackReply,noteName} from './studio-core.mjs';
export const DRUMS=[[36,'Kick'],[35,'Kick 2'],[38,'Snare'],[39,'Clap'],[42,'Closed hat'],[46,'Open hat'],[44,'Pedal hat'],[37,'Rim'],[40,'Snare 2'],[43,'Low tom'],[48,'High tom'],[49,'Crash'],[51,'Ride'],[70,'Shaker'],[63,'Conga'],[56,'Cowbell']];
export const drumName=p=>DRUMS.find(d=>d[0]===p)?.[1]||`Drum ${p}`;
export const eventName=n=>n.instrument?.kind==='drum'?drumName(n.pitch):noteName(n.pitch);
export function descriptorReply(bytes){
 const r=new Reader(bytes),d={scope:r.b(),id:r.b(),fmt:r.b(),min:r.v(),max:r.v(),default:r.v(),label:r.s(),unit:r.s(),names:[]};
 if(d.fmt===8)for(let i=0;i<=d.max-d.min&&i<64&&r.i<bytes.length;i++)d.names.push(r.s());return d;
}
export function dumpReply(bytes,info,withGlobals=true){
 const r=new Reader(bytes),o={};if(!withGlobals)o.track=r.b();o.engine=r.b();o.preset=r.b();o.p=[];o.g=[];
 for(let i=0;i<info.pcount;i++)o.p.push(r.v());if(withGlobals)for(let i=0;i<info.gcount;i++)o.g.push(r.v());return o;
}
export async function readSloopSnapshot(request,cache={}){
 const info=cache.info||infoReply(await request(1,[]));
 if(!/^(?:SLOOP|FELUCCA(?:\s+SLOOP)?)\s+2\./i.test(info.version)||info.ntrk!==4||info.nengines<1||info.proto<5||info.pcount>127||info.gcount>127||info.pe0>=info.pcount)throw Error(`Device reports “${info.version}” (protocol ${info.proto}, ${info.ntrk} tracks). This reader needs SLOOP 2.x; other firmware can use manual drum labels.`);
 cache.info=info;cache.names??=new Map();
 // Discover MIDI channel parameters by the labels supplied by this build. No guessed channel 10.
 if(!cache.channelIds){const ids=[];for(let i=0;i<info.gcount;i++){const d=descriptorReply(await request(5,[1,i]));if(d.scope!==1||d.id!==i)throw Error('Mismatched parameter description');const match=/^CH([1-4])$/.exec(d.label);if(match)ids[Number(match[1])-1]=i;}cache.channelIds=ids;}
 const before=trackReply(await request(27,[]));if(before.count!==4||before.selected>=4)throw Error('Unexpected track layout');
 const dump=dumpReply(await request(4,[]),info);
 for(const t of before.tracks)if(t.engine<info.nengines&&!cache.names.has(t.engine)){
  const r=new Reader(await request(10,[t.engine])),engine=r.b(),count=r.b(),names=[];if(engine!==t.engine||count>127)throw Error('Mismatched preset list');for(let i=0;i<count;i++)names.push(r.s());cache.names.set(engine,names);
 }
 if(dump.engine===info.nengines&&!cache.kits){const d=descriptorReply(await request(5,[0,info.pe0]));if(d.label==='KIT'&&d.scope===0&&d.id===info.pe0)cache.kits=d;}
 const drumIndex=before.tracks.findIndex(t=>t.engine===info.nengines);
 const drumDump=drumIndex<0?null:before.selected===drumIndex?dump:dumpReply(await request(29,[drumIndex]),info,false);
 if(drumDump&&(drumDump.engine!==info.nengines||(drumDump.track!==undefined&&drumDump.track!==drumIndex)))throw Error('Drum track changed while reading; try again.');
 const after=trackReply(await request(27,[])),t=after.tracks[after.selected];
 if(before.selected!==after.selected||!t||t.engine!==dump.engine||t.preset!==dump.preset||before.tracks.some((a,i)=>a.engine!==after.tracks[i]?.engine||a.preset!==after.tracks[i]?.preset))throw Error('The sound changed while reading. Refresh to read the new sound.');
 const readAt=new Date().toISOString();
 return {version:info.version,selected:after.selected,readAt,tracks:after.tracks.map((t,i)=>{
  const drum=t.engine===info.nengines,kit=drum?drumDump?.p[info.pe0]:undefined,channelId=cache.channelIds[i];
  const channel=Number.isInteger(channelId)?dump.g[channelId]:null;
  return {track:i+1,kind:drum?'drum':'melodic',engine:drum?'Drums':info.engines[t.engine]||'Unknown engine',preset:drum?(cache.kits?.names[kit-cache.kits.min]||`Kit ${(kit??0)+1} · select drums once to read its name`):(cache.names.get(t.engine)?.[t.preset]||`Preset ${t.preset+1}`),channel:channel>=1&&channel<=16?channel:null,mute:!!t.mute,armed:!!t.armed,source:'device',readAt};})};
}
export function instrumentFor(channel,snapshot,manual){
 if(manual?.channel===channel+1)return {kind:'drum',engine:'Drums',preset:manual.name||'Manual drum kit',source:'manual'};
 const t=snapshot?.tracks.find(t=>t.channel===channel+1);if(!t)return undefined;
 const {kind,track,engine,preset,source,readAt}=t;return {kind,track,engine,preset,source,readAt};
}
