// Simulated SLOOP replies for tests only. No navigator/Web MIDI or hardware access.
const text=s=>Array.from(s,c=>c.charCodeAt(0)).concat(0),v=n=>[(n+8192)&127,(n+8192)>>7];
export function fakeSloop(version='FELUCCA SLOOP 2.8.4'){
 const state={selected:3,channels:[2,11,8,6],kit:1,preset:0,fail:false},calls=[];
 const info=[...text(version),2,2,4,64,0,...text('TRIO'),...text('DIGITAL'),4,12];
 const tracks=()=>[state.selected,4,0,0,...v(90),0,0,1,state.preset,...v(81),0,0,1,1,...v(75),0,0,2,0,...v(100),0,0,0];
 function reply(cmd,args=[]){calls.push([cmd,[...args]]);if(state.fail)throw Error('Simulated disconnect');
  if(cmd===1&&args.length===0)return info;
  if(cmd===27&&args.length===0)return tracks();
  if(cmd===4&&args.length===0){const engine=state.selected===3?2:state.selected===0?0:1,preset=state.selected===1?state.preset:state.selected===2?1:0;return [engine,preset,...v(state.selected===3?state.kit:0),...v(100),...state.channels.flatMap(v)];}
  if(cmd===29&&args.length===1&&args[0]===3)return [3,2,0,...v(state.kit),...v(100)];
  if(cmd===10&&args.length===1&&[0,1].includes(args[0]))return [args[0],args[0]===0?1:2,...(args[0]===0?['Fat Bass']:['Rhodes','Flute']).flatMap(text)];
  if(cmd===5&&args.length===2){const [scope,id]=args;if(scope===1&&id<4)return [1,id,8,...v(0),...v(16),...v(id===3?10:id+1),...text('CH'+(id+1)),...text(''),...Array.from({length:17},(_,i)=>text(String(i))).flat()];if(scope===0&&id===0&&state.selected===3)return [0,0,8,...v(0),...v(2),...v(1),...text('KIT'),...text(''),...['Acoustic','808','Dust'].flatMap(text)];}
  throw Error('Unexpected or writing command in test: '+cmd+' '+args.join(','));
 }
 return {state,calls,reply,request:async(c,a)=>reply(c,a)};
}
