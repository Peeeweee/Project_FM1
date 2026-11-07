import {DRUMS,drumName,eventName,readSloopSnapshot,instrumentFor} from './telemetry.mjs';
import {NoteRecorder,cleanNotes,noteName,midiFile,wavFile,editorFrame,editorReply,Reader,infoReply,trackReply} from './studio-core.mjs';
export function initStudio(ctx){
  const root=document.getElementById('studio-root');if(!root)return;
  root.innerHTML=`<div class="studio-intro studio-live-row"><div class="studio-live-card"><span class="eyebrow">LIVE MIDI</span><strong id="studio-live-note">Play a note</strong><span id="studio-live-detail">Connect your FM1 to begin.</span><span id="studio-live-program">Instrument not read yet</span></div><div class="studio-instrument-panel"><div class="studio-toolbar"><h2>Instruments</h2><button id="studio-read-status">Read instruments</button><label class="check"><input id="studio-auto-status" type="checkbox" checked> Auto update</label></div><p id="studio-monitor-status" class="studio-hint" role="status">Names appear when your firmware supports reading.</p><div id="studio-track-cards" class="studio-track-cards"></div><details><summary>Drum settings</summary><p class="studio-hint">Set manually if your firmware cannot report drums.</p><div class="studio-manual"><label>Drum MIDI channel<select id="studio-drum-channel"><option value="">Automatic · from the FM1</option></select></label><label>Your kit name<input id="studio-drum-name" maxlength="100" placeholder="For example, 808 drums"></label></div></details></div></div>
  <div id="studio-drum-pads" class="studio-drum-pads" aria-label="Incoming drum hits" hidden></div>
  <div class="studio-keyboard" id="studio-keyboard" aria-label="Incoming MIDI note display"></div>
  <div class="studio-tabs" role="tablist" aria-label="Recording type"><button id="studio-midi-tab" role="tab" aria-selected="true">Notes · MIDI</button><button id="studio-audio-tab" role="tab" aria-selected="false">Audio</button></div>
  <section id="studio-midi-pane" class="studio-pane"><div class="studio-section-head"><div><h2>Your take</h2><p>Original timing · Quantize off</p></div><span id="studio-time" class="studio-clock">0:00</span></div>
  <div class="studio-toolbar"><button id="studio-record" class="primary">● Record</button><button id="studio-stop" disabled>Stop</button><button id="studio-play">▶ Play</button><label>Play through<select id="studio-playback"><option value="browser">Browser instrument</option><option value="fm1">Connected FM1</option></select></label><button id="studio-new">New take</button></div><p id="studio-midi-status" class="studio-hint">Connect your FM1, then press Record.</p>
  <div class="studio-roll-wrap"><canvas id="studio-roll" width="1100" height="340" tabindex="0" aria-label="Piano roll. Click a note to edit it; double-click an empty row to add a note. Press Delete to remove the selected note."></canvas></div>
  <details class="studio-editor" id="studio-edit"><summary><h3>Edit notes</h3><span id="studio-selected">Select a note on the timeline</span></summary><form id="studio-note-form" class="studio-note-form"><label>Pitch<select id="studio-pitch"></select></label><label>Starts at (seconds)<input id="studio-start" type="number" min="0" max="3600" step="0.01" value="0"></label><label>Length (seconds)<input id="studio-duration" type="number" min="0.01" max="3600" step="0.01" value="0.5"></label><label>Strength<input id="studio-velocity" type="number" min="1" max="127" value="96"></label><label>MIDI channel<input id="studio-channel" type="number" min="1" max="16" value="1"></label><button id="studio-apply">Apply changes</button><button id="studio-add" type="button">Add note</button><button id="studio-delete" type="button">Delete note</button></form></details>
  <div class="studio-project"><div class="take-save-row"><label>Take name<input id="studio-name" maxlength="100" value="My first FM1 take"></label><button id="studio-save" class="primary">Save take</button></div><details class="quiet-help"><summary>Import & export</summary><div class="studio-toolbar"><button id="studio-json">Export JSON</button><button id="studio-midi-export">Export MIDI</button><label class="file-button">Import JSON<input id="studio-import" type="file" accept=".json"></label></div><p>Projects save notes, drums and captured instrument labels. Pedal, controller and pitch-bend automation are not recorded. Save audio separately as WAV.</p></details></div></section>
  <section id="studio-audio-pane" class="studio-pane" hidden><div class="studio-section-head"><div><h2>Audio take</h2><p>Choose the FM1 / Felucca audio input.</p></div></div><div class="studio-toolbar"><button id="studio-audio-find">Find inputs</button><label>Audio source<select id="studio-audio-input"><option value="">Choose a source first</option></select></label><button id="studio-audio-record" class="primary">● Record audio</button><button id="studio-audio-stop" disabled>Stop</button><label class="file-button">Open audio file<input id="studio-audio-import" type="file" accept="audio/*,.wav,.mp3,.ogg,.webm"></label></div><p id="studio-audio-status" class="studio-hint">Choose an audio input to begin. Monitoring is off.</p><canvas id="studio-wave" width="1100" height="170" aria-label="Recorded audio waveform"></canvas><audio id="studio-audio-player" controls></audio><div class="studio-note-form"><label>Trim start (seconds)<input id="studio-audio-start" type="number" min="0" step="0.01" value="0"></label><label>Trim end (seconds)<input id="studio-audio-end" type="number" min="0" step="0.01" value="0"></label><button id="studio-audio-preview">Preview trim</button><button id="studio-audio-export">Download WAV</button></div><p class="studio-hint">One audio take · Trim and export as WAV.</p></section>
  <details class="studio-telemetry"><summary>Device activity</summary><p>Live MIDI events and the latest instrument reading.</p><div id="studio-device-screen" class="studio-device-screen">No SLOOP snapshot read yet.</div><p>Only data sent by the firmware is shown. Physical button states are unavailable.</p><ol id="studio-events" class="studio-events"></ol></details>`;
  const $=id=>document.getElementById('studio-'+id),recorder=new NoteRecorder();let notes=[],selected=null,input=null,mode='idle',timers=[],playVoices=new Map(),previewContext=null,playStarted=0,recordStart=0,drag=null;
  let audioRecorder=null,audioStream=null,audioContext=null,audioBuffer=null,audioUrl=null,audioStarted=0,audioTimer=null,audioPending=false,audioSession=0;
  let snapshot=null,monitorCache={},reading=false,lastRead=0,attempted=false,snapshotStale=false,lastHit=null;
  const manual=()=>$('drum-channel').value?{channel:Number($('drum-channel').value),name:$('drum-name').value.trim()||'Manual drum kit'}:null;
  const soundFor=(channel)=>instrumentFor(channel,snapshotStale?null:snapshot,manual())||(!snapshotStale&&snapshot?.stock?{kind:'melodic',engine:'Factory FM',preset:snapshot.stock,source:'device',readAt:snapshot.readAt}:undefined);
  const active=new Map(),events=[];let scale={duration:8,min:48,max:84},lastRender=0;
  const setMode=m=>{mode=m;ctx.setBusy?.(m!=='idle',false);refreshButtons();};
  const locked=()=>mode!=='idle'||audioRecorder?.state==='recording'||audioPending;
  const fail=error=>{const message=error?.message||String(error);ctx.notice(message,true);$('midi-status').textContent=message;};
  const run=fn=>Promise.resolve().then(fn).catch(fail);
  const fmt=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  const download=(name,data,type)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
  const name=()=>($('name').value.trim()||'FM1 take').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,90)||'FM1 take';
  function refreshButtons(){
    $('record').disabled=locked()||!ctx.getInput()||ctx.isBusy();$('stop').disabled=mode==='idle';$('play').disabled=locked()||!notes.length||ctx.isBusy();
    for(const id of ['new','save','json','midi-export','import','apply','add','delete'])$(id).disabled=locked();
    $('audio-record').disabled=locked()||ctx.isBusy()||!$('audio-input').value;$('audio-stop').disabled=audioRecorder?.state!=='recording';
    $('audio-find').disabled=locked()||ctx.isBusy();$('audio-import').disabled=locked()||ctx.isBusy();$('audio-preview').disabled=locked()||!audioBuffer;$('audio-export').disabled=locked()||!audioBuffer;
    $('read-status').disabled=reading||locked()||ctx.isBusy()||!ctx.getInput()||!ctx.getOutput();
  }
  function keyboard(){
    const keys=$('keyboard'),head=document.createElement('div'),bed=document.createElement('div');
    head.className='studio-piano-caption';head.setAttribute('aria-hidden','true');
    const range=document.createElement('span');range.textContent='LIVE KEYS · C3–B5';
    const hint=document.createElement('span');hint.textContent='Keys light up as you play';head.append(range,hint);
    const scroll=document.createElement('div');scroll.className='studio-piano-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Piano keys, C3 to B5. Scroll horizontally to see more keys.');
    bed.className='studio-piano-bed';bed.style.setProperty('--white-count','21');let white=0;
    for(let n=48;n<=83;n++){
      const black=[1,3,6,8,10].includes(n%12),key=document.createElement('span');key.dataset.note=String(n);key.className='studio-key '+(black?'black':'white');
      key.style.setProperty('--key-index',String(white));if(!black)white++;
      const label=document.createElement('span');label.className='studio-key-label';label.textContent=noteName(n);key.append(label);bed.append(key);
    }
    scroll.append(bed);keys.replaceChildren(head,scroll);
  }
  keyboard();
  function eventLine(text){events.unshift(text);events.length=Math.min(events.length,12);$('events').replaceChildren(...events.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));}
  function live(){
    const held=[...active.values()],melodic=held.filter(n=>n.instrument?.kind!=='drum'),drums=held.filter(n=>n.instrument?.kind==='drum');
    const hit=lastHit&&performance.now()<lastHit.until?lastHit:null;
    const labels=[...new Set(held.map(eventName))];if(!labels.length&&hit)labels.push(drumName(hit.pitch));
    $('live-note').textContent=labels.length?labels.join(' · '):'Ready to play';
    for(const key of $('keyboard').querySelectorAll('[data-note]'))key.classList.toggle('on',melodic.some(n=>n.pitch===Number(key.dataset.note)));
    const selectedDrum=snapshot?.tracks[snapshot.selected]?.kind==='drum';
    $('drum-pads').hidden=!(selectedDrum||drums.length||hit||manual());
    $('keyboard').hidden=!!(selectedDrum||manual())&&!melodic.length;
    for(const pad of $('drum-pads').children)pad.classList.toggle('on',drums.some(n=>n.pitch===Number(pad.dataset.note))||hit?.pitch===Number(pad.dataset.note));
  }
  for(const [pitch,label] of DRUMS){const pad=document.createElement('div');pad.className='studio-drum-pad';pad.dataset.note=pitch;pad.textContent=label;$('drum-pads').append(pad);}
  for(let ch=1;ch<=16;ch++)$('drum-channel').add(new Option('Channel '+ch+' · manual drums',ch));
  $('drum-channel').onchange=()=>{active.clear();lastHit=null;showInstruments();live();};
  $('drum-name').oninput=()=>showInstruments();
  function incoming(e){const d=e.data;if(!d?.length||d[0]<128||d[0]>=240)return;const type=d[0]&240,ch=(d[0]&15);const required=[128,144,176,224].includes(type)?3:type===192?2:0;if(!required||d.length<required||Array.from(d).slice(1,required).some(v=>!Number.isInteger(v)||v<0||v>127))return;const key=ch+':'+d[1],now=performance.now();
    if(type===144&&d[2]){const instrument=soundFor(ch),n={pitch:d[1],channel:ch,velocity:d[2],instrument};
      window.dispatchEvent(new CustomEvent('fm1-note',{detail:{note:d[1],channel:ch+1,velocity:d[2]/127,on:true}}));active.set(key,n);
      if(instrument?.kind==='drum')lastHit={pitch:d[1],until:now+700};
      $('live-detail').textContent=[instrument?.track?'Track '+instrument.track:null,instrument?.preset,`Channel ${ch+1}`,`strength ${d[2]}`,instrument?.source==='manual'?'your manual label':null].filter(Boolean).join(' · ');
      eventLine(`${instrument?.kind==='drum'?'Drum hit':'Note on'} · ${eventName(n)} · channel ${ch+1}${instrument?.preset?' · '+instrument.preset:''}`);live();
    }
    else if(type===128||(type===144&&!d[2])){window.dispatchEvent(new CustomEvent('fm1-note',{detail:{note:d[1],channel:ch+1,velocity:0,on:false}}));active.delete(key);live();}
    else if(type===176){eventLine(`Control change · CC ${d[1]} = ${d[2]} · channel ${ch+1}`);}
    else if(type===192){snapshotStale=true;lastRead=0;$('live-program').textContent=`Reported MIDI program ${d[1]+1} · channel ${ch+1} (name not supplied)`;eventLine(`Program change · ${d[1]+1} · channel ${ch+1}`);}
    else if(type===224)eventLine(`Pitch bend · channel ${ch+1} · ${((d[2]<<7)|d[1])-8192}`);
    if(mode==='recording'){recorder.message(d,now,soundFor(ch));notes=[...recorder.notes,...[...recorder.held.values()].map(n=>({...n,duration:Math.max(.01,(now-recordStart)/1000-n.start)}))];if(now-lastRender>40){drawRoll();lastRender=now;}}
  }
  function attach(){const next=ctx.getInput();if(next===input){refreshButtons();return;}if(input)input.removeEventListener('midimessage',incoming);input=next;snapshot=null;monitorCache={};snapshotStale=false;attempted=false;lastRead=0;lastHit=null;showInstruments();if(input)$('live-program').textContent='Instrument not read yet';$('monitor-status').textContent=input?'Reading instruments…':'Connect your FM1 to read instruments.';$('device-screen').textContent='No current instrument reading.';if(input)input.addEventListener('midimessage',incoming);active.clear();live();$('live-detail').textContent=input?'Listening to '+(input.name||'the connected MIDI input'):'Connect your FM1 to begin.';if(mode!=='idle'&&!input)stop();refreshButtons();}
  window.addEventListener('fm1-connection',attach);attach();
  function drawRoll(){const c=$('roll'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#111';g.fillRect(0,0,w,h);
    scale.duration=Math.ceil(Math.max(8,...notes.map(n=>n.start+n.duration+.5))/4)*4;
    const hasDrums=notes.some(n=>n.instrument?.kind==='drum');
    if(hasDrums){const melody=[...new Set(notes.filter(n=>n.instrument?.kind!=='drum').map(n=>n.pitch))].sort((a,b)=>b-a);const extra=[...new Set(notes.filter(n=>n.instrument?.kind==='drum'&&!DRUMS.some(d=>d[0]===n.pitch)).map(n=>n.pitch))];scale.rows=[...melody.map(p=>({pitch:p,kind:'melodic',label:noteName(p)})),...[...DRUMS,...extra.map(p=>[p,drumName(p)])].map(([pitch,label])=>({pitch,kind:'drum',label}))];}
    else{scale.min=Math.min(48,...notes.map(n=>n.pitch));scale.max=Math.max(83,...notes.map(n=>n.pitch));scale.rows=Array.from({length:scale.max-scale.min+1},(_,i)=>({pitch:scale.max-i,kind:'melodic',label:noteName(scale.max-i)}));}
    scale.left=hasDrums?112:48;const row=(h-28)/scale.rows.length;
    g.font='11px monospace';scale.rows.forEach((r,i)=>{const y=28+i*row;g.fillStyle=i%2?'#222':'#171717';g.fillRect(0,y,w,row);if(hasDrums||r.pitch%12===0){g.fillStyle='#aaa';g.fillText(r.label,5,y+Math.min(row-2,13));}});
    for(let t=0;t<=scale.duration;t+=Math.max(1,Math.ceil(scale.duration/24))){const x=scale.left+t/scale.duration*(w-scale.left-6);g.strokeStyle='#363636';g.beginPath();g.moveTo(x,24);g.lineTo(x,h);g.stroke();g.fillStyle='#aaa';g.fillText(t+'s',x+3,15);}
    for(const n of notes){const i=rowOf(n),x=scale.left+n.start/scale.duration*(w-scale.left-6),y=28+i*row;g.fillStyle=n.id===selected?'#fff':'#b6b6b6';g.fillRect(x,y+1,Math.max(n.instrument?.kind==='drum'?7:3,n.duration/scale.duration*(w-scale.left-6)),Math.max(2,row-2));}
    c.setAttribute('aria-label',hasDrums?'MIDI timeline with named drum lanes and melodic notes. Select an event to edit.':'Piano roll. Select a note to edit; double-click an empty row to add a note.');
    if(mode==='playing'){const x=scale.left+Math.max(0,(performance.now()-playStarted)/1000)/scale.duration*(w-scale.left-6);g.strokeStyle='#fff';g.beginPath();g.moveTo(x,24);g.lineTo(x,h);g.stroke();}
  }
  function rowOf(n){return scale.rows.findIndex(r=>r.pitch===n.pitch&&r.kind===(n.instrument?.kind||'melodic'));}
  function point(e){const box=$('roll').getBoundingClientRect();return {x:(e.clientX-box.left)/box.width*1100,y:(e.clientY-box.top)/box.height*340};}
  function hit(p){const row=(340-28)/scale.rows.length;return [...notes].reverse().find(n=>{const x=scale.left+n.start/scale.duration*(1100-scale.left-6),y=28+rowOf(n)*row;return p.x>=x&&p.x<=x+Math.max(n.instrument?.kind==='drum'?7:3,n.duration/scale.duration*(1100-scale.left-6))&&p.y>=y&&p.y<=y+row;});}
  function select(n){selected=n?.id||null;$('selected').textContent=n?`${eventName(n)} · ${n.start.toFixed(2)}s${n.instrument?.preset?' · '+n.instrument.preset:''}`:'Select a note on the timeline';$('note-form').closest('.studio-editor').querySelector('h3').textContent=n?.instrument?.kind==='drum'?'Edit a drum hit':'Edit a note';for(const o of $('pitch').options)o.textContent=(n?.instrument?.kind==='drum'?drumName(Number(o.value)):noteName(Number(o.value)))+' ('+o.value+')';if(n){$('edit').open=true;$('pitch').value=n.pitch;$('start').value=n.start.toFixed(3);$('duration').value=n.duration.toFixed(3);$('velocity').value=n.velocity;$('channel').value=n.channel+1;}drawRoll();}
  for(let n=0;n<128;n++)$('pitch').add(new Option(`${noteName(n)} (${n})`,n));$('pitch').value=60;
  function formNote(){return cleanNotes([{id:selected||'note-'+crypto.randomUUID(),pitch:Number($('pitch').value),start:Number($('start').value),duration:Number($('duration').value),velocity:Number($('velocity').value),channel:Number($('channel').value)-1,instrument:notes.find(n=>n.id===selected&&n.channel===Number($('channel').value)-1)?.instrument||soundFor(Number($('channel').value)-1)}])[0];}
  $('note-form').onsubmit=e=>{e.preventDefault();run(()=>{if(locked())return;const n=formNote();if(!notes.some(x=>x.id===selected))throw Error('Choose a note first, or use Add note.');notes=cleanNotes(notes.map(x=>x.id===selected?n:x));select(n);});};
  $('add').onclick=()=>run(()=>{if(locked())return;const n={...formNote(),id:'note-'+crypto.randomUUID()};notes=cleanNotes([...notes,n]);select(n);refreshButtons();});
  $('delete').onclick=()=>{if(locked())return;notes=notes.filter(n=>n.id!==selected);select(null);refreshButtons();};
  $('roll').onpointerdown=e=>{if(locked())return;const p=point(e),n=hit(p);select(n);if(n){drag={id:n.id,x:p.x,y:p.y,start:n.start,pitch:n.pitch,row:rowOf(n)};$('roll').setPointerCapture(e.pointerId);}};
  $('roll').onpointermove=e=>{if(!drag||locked())return;const p=point(e),row=(340-28)/scale.rows.length,n=notes.find(n=>n.id===drag.id);if(!n){drag=null;return;}n.start=Math.max(0,Math.min(3600,drag.start+(p.x-drag.x)/(1100-scale.left-6)*scale.duration));const target=scale.rows[Math.max(0,Math.min(scale.rows.length-1,drag.row+Math.round((p.y-drag.y)/row)))];if(target.kind===(n.instrument?.kind||'melodic'))n.pitch=target.pitch;drawRoll();};
  $('roll').onpointerup=()=>{if(drag){select(notes.find(n=>n.id===drag.id));drag=null;}};
  $('roll').onpointercancel=$('roll').onlostpointercapture=()=>{drag=null;};
  $('roll').ondblclick=e=>{if(locked())return;const p=point(e);if(p.x<scale.left||hit(p))return;const row=scale.rows[Math.max(0,Math.min(scale.rows.length-1,Math.floor((p.y-28)/((340-28)/scale.rows.length))))];const prior=notes.find(n=>(n.instrument?.kind||'melodic')===row.kind);const channel=prior?.channel??0;const n={id:'note-'+crypto.randomUUID(),start:Math.max(0,(p.x-scale.left)/(1100-scale.left-6)*scale.duration),duration:.15,pitch:row.pitch,velocity:96,channel,instrument:prior?.instrument||soundFor(channel)};notes=cleanNotes([...notes,n]);select(n);refreshButtons();};
  $('roll').onkeydown=e=>{if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('delete').click();}};
  function stop(){
    const previous=mode;let error=null;
    try{
      for(const timer of timers)clearTimeout(timer);timers=[];
      if(previous==='recording')notes=recorder.stop(performance.now());
    }catch(e){error=e;recorder.active=false;recorder.held.clear();}
    finally{
      for(const v of playVoices.values()){try{if(v.out)v.out.send([128|v.channel,v.pitch,0]);else{v.gain.gain.setTargetAtTime(0,previewContext.currentTime,.01);v.osc.stop(previewContext.currentTime+.05);}}catch{}}
      playVoices.clear();setMode('idle');drawRoll();
    }
    $('midi-status').textContent=previous==='recording'?`Recorded ${notes.length} notes and drum hits. Select an event to edit, or play your take.`:'Playback stopped.';
    if(error)fail(error);
  }
  function schedule(fn,delay){timers.push(setTimeout(()=>{if(mode!=='playing')return;try{fn();}catch(error){stop();fail(error);}},Math.max(0,delay)));}
  $('record').onclick=()=>run(()=>{attach();if(locked()||ctx.isBusy())throw Error('Finish the current operation first.');if(!input)throw Error('Connect your FM1 first.');if(notes.length&&!confirm('Start a new recording? Your current take will be replaced. Save it first if you want to keep it.'))return;recordStart=performance.now();recorder.start(recordStart);notes=[];selected=null;setMode('recording');$('midi-status').textContent='Recording notes. Play freely; press Stop when finished. Nothing is snapped to a grid.';drawRoll();});
  $('stop').onclick=stop;
  $('new').onclick=()=>{if(locked())return;if(notes.length&&!confirm('Clear this take? Save it first if you want to keep it.'))return;notes=[];select(null);refreshButtons();};
  $('play').onclick=()=>run(async()=>{
    if(locked()||ctx.isBusy()||!notes.length)return;const through=$('playback').value,out=ctx.getOutput();if(through==='fm1'&&!out)throw Error('Connect an FM1 MIDI output, or choose Browser instrument.');
    if(through==='browser'){previewContext??=new AudioContext();await previewContext.resume();}
    if(locked()||ctx.isBusy())return;
    setMode('playing');playStarted=performance.now();$('midi-status').textContent=through==='fm1'?'Playing notes through the connected FM1.':'Playing a simple browser synth/drum sketch; use Connected FM1 or record Audio for the actual sound.';
    for(const n of cleanNotes(notes)){
      const key=n.id;
      schedule(()=>{
        if(through==='fm1'){
          out.send([144|n.channel,n.pitch,n.velocity]);playVoices.set(key,{out,channel:n.channel,pitch:n.pitch});
        }else{
          const drum=n.instrument?.kind==='drum',osc=drum?previewContext.createBufferSource():previewContext.createOscillator(),gain=previewContext.createGain();
          if(drum){const rate=previewContext.sampleRate,buffer=previewContext.createBuffer(1,Math.floor(rate*.4),rate),a=buffer.getChannelData(0),kick=[35,36].includes(n.pitch),hat=[42,44,46,70].includes(n.pitch);let phase=0;for(let i=0;i<a.length;i++){const t=i/rate;phase+=2*Math.PI*(kick?40+100*Math.exp(-t*35):180)/rate;a[i]=(kick?Math.sin(phase):Math.random()*2-1)*Math.exp(-t*(hat?55:kick?14:24));}osc.buffer=buffer;}else{osc.type='triangle';osc.frequency.value=440*Math.pow(2,(n.pitch-69)/12);}gain.gain.value=(drum ? .2 : .07)*n.velocity/127;
          osc.connect(gain).connect(previewContext.destination);osc.start();playVoices.set(key,{osc,gain});
        }
      },n.start*1000);
      schedule(()=>{
        const v=playVoices.get(key);if(!v)return;
        if(v.out)v.out.send([128|v.channel,v.pitch,0]);
        else{v.gain.gain.setTargetAtTime(0,previewContext.currentTime,.015);v.osc.stop(previewContext.currentTime+.08);}
        playVoices.delete(key);
      },(n.start+n.duration)*1000);
    }
    schedule(stop,(Math.max(...notes.map(n=>n.start+n.duration))+.15)*1000);
  });
  const project=()=>({schema:'fm1-dock/studio/1',name:$('name').value.trim()||'FM1 take',created:new Date().toISOString(),notes:cleanNotes(notes).map(n=>({...n,channel:n.channel+1})),audioIncluded:false});
  $('save').onclick=()=>run(async()=>{if(!notes.length)throw Error('Record or add some notes first.');await ctx.saveProject(project());ctx.notice('Notes saved to your laptop library. Audio takes must be downloaded separately as WAV.');});
  $('json').onclick=()=>run(()=>download(name()+'.json',JSON.stringify(project(),null,2),'application/json'));
  $('midi-export').onclick=()=>run(()=>download(name()+'.mid',midiFile(notes),'audio/midi'));
  $('import').onchange=()=>run(async()=>{const f=$('import').files[0];if(!f)return;if(f.size>3*1024*1024)throw Error('Project file is too large.');const p=JSON.parse(await f.text());if(p.schema!=='fm1-dock/studio/1')throw Error('Choose an FM1 Studio project JSON file.');notes=cleanNotes(p.notes.map(n=>({...n,channel:n.channel-1})));$('name').value=String(p.name||'Imported take').slice(0,100);select(null);refreshButtons();$('midi-status').textContent=`Opened ${notes.length} notes. Audio is not part of this project file.`;});
  $('midi-tab').onclick=()=>tab(false);$('audio-tab').onclick=()=>tab(true);
  function tab(audio){$('midi-pane').hidden=audio;$('audio-pane').hidden=!audio;$('midi-tab').setAttribute('aria-selected',String(!audio));$('audio-tab').setAttribute('aria-selected',String(audio));if(audio)wave();else drawRoll();}
  function friendlyAudioError(e){
    const messages={NotAllowedError:'Audio access was not allowed. Allow audio input for this local page in your browser, then try again.',NotFoundError:'No audio input was found. Check the USB cable and choose the FM1/Felucca input.',NotReadableError:'This audio input is busy or unavailable. Close other audio apps, then choose it again.',OverconstrainedError:'The selected input is no longer available. Find audio inputs again and choose the FM1.'};
    return Error(messages[e?.name]||e?.message||'Audio could not be opened. Try desktop Chrome or Edge.');
  }
  $('audio-find').onclick=()=>run(async()=>{
    if(locked()||ctx.isBusy())return;
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Audio access requires desktop Chrome/Edge and localhost.');
    let temporary;audioPending=true;ctx.setBusy?.(true,false);refreshButtons();
    try{
      $('audio-status').textContent='Allow audio access, then choose your FM1 input from the list.';
      temporary=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      const devices=await navigator.mediaDevices.enumerateDevices();$('audio-input').replaceChildren(new Option('Choose FM1 / Felucca input',''));
      for(const d of devices)if(d.kind==='audioinput')$('audio-input').add(new Option(d.label||'Audio input '+$('audio-input').options.length,d.deviceId));
      $('audio-status').textContent='Choose the FM1/Felucca input. Choosing your laptop microphone will record the room instead.';
    }catch(e){const error=friendlyAudioError(e);$('audio-status').textContent=error.message;throw error;}
    finally{temporary?.getTracks().forEach(t=>t.stop());audioPending=false;ctx.setBusy?.(false,false);refreshButtons();}
  });
  $('audio-input').onchange=refreshButtons;
  async function decodeAudio(blob){audioContext??=new AudioContext();audioBuffer=await audioContext.decodeAudioData(await blob.arrayBuffer());$('audio-start').value=0;$('audio-end').value=audioBuffer.duration.toFixed(3);if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(blob);$('audio-player').src=audioUrl;wave();refreshButtons();}
  $('audio-record').onclick=()=>run(async()=>{
    if(locked()||ctx.isBusy())throw Error('Finish the current operation first.');
    if(!$('audio-input').value)throw Error('Find audio inputs and choose the FM1 first.');
    if(!window.MediaRecorder)throw Error('This browser does not support audio recording. Use Chrome or Edge.');
    $('audio-player').pause();
    audioPending=true;ctx.setBusy?.(true,false);refreshButtons();
    const session=++audioSession;let stream,recorder,sessionTimer,error=null,finished=false;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:$('audio-input').value},echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:{ideal:2}},video:false});
      const mime=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
      recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});const chunks=[];
      audioStream=stream;audioRecorder=recorder;
      const finish=async()=>{
        if(finished)return;finished=true;clearTimeout(sessionTimer);stream.getTracks().forEach(t=>t.stop());
        if(session!==audioSession)return;
        audioPending=true;refreshButtons();
        try{
          if(error)throw error;
          await decodeAudio(new Blob(chunks,{type:recorder.mimeType}));
          $('audio-status').textContent=`Recorded ${audioBuffer.duration.toFixed(2)} seconds. Trim or download the WAV to keep it.`;
        }catch(e){const problem=friendlyAudioError(e);$('audio-status').textContent=problem.message;ctx.notice(problem.message,true);}
        finally{if(audioRecorder===recorder)audioRecorder=null;if(audioStream===stream)audioStream=null;audioPending=false;ctx.setBusy?.(false,false);refreshButtons();}
      };
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>run(finish);
      recorder.onerror=e=>{
        error=friendlyAudioError(e.error||Error('Audio recording failed.'));
        $('audio-status').textContent='Finishing the interrupted recording…';audioPending=true;refreshButtons();
        // MediaRecorder fires stop after error. Do not unlock until that stop event is finalized.
        if(recorder.state!=='inactive'){try{recorder.stop();}catch{run(finish);}}
      };
      recorder.start(1000);audioStarted=performance.now();
      $('audio-status').textContent='Recording sound from the selected input. Speaker monitoring is off. Maximum take: 10 minutes.';
      sessionTimer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},600000);audioTimer=sessionTimer;
    }catch(e){
      stream?.getTracks().forEach(t=>t.stop());if(audioRecorder===recorder)audioRecorder=null;if(audioStream===stream)audioStream=null;
      ctx.setBusy?.(false,false);const problem=friendlyAudioError(e);$('audio-status').textContent=problem.message;throw problem;
    }finally{audioPending=false;refreshButtons();}
  });
  $('audio-stop').onclick=()=>{if(audioRecorder?.state==='recording'){audioPending=true;audioRecorder.stop();refreshButtons();}};
  $('audio-import').onchange=()=>run(async()=>{if(locked()||ctx.isBusy())throw Error('Finish the current operation before opening audio.');const f=$('audio-import').files[0];if(!f)return;if(f.size>64*1024*1024)throw Error('Choose an audio file smaller than 64 MB.');audioPending=true;ctx.setBusy?.(true,false);refreshButtons();try{await decodeAudio(f);$('audio-status').textContent=`Opened ${f.name} · ${audioBuffer.duration.toFixed(2)} seconds.`;}finally{audioPending=false;ctx.setBusy?.(false,false);refreshButtons();}});
  function trimmed(){if(!audioBuffer)throw Error('Record or open an audio file first.');const start=Number($('audio-start').value),end=Number($('audio-end').value);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>audioBuffer.duration+.002)throw Error('Choose a valid trim range within the recording.');return wavFile(Array.from({length:Math.min(2,audioBuffer.numberOfChannels)},(_,i)=>audioBuffer.getChannelData(i)),audioBuffer.sampleRate,start,end);}
  $('audio-export').onclick=()=>run(()=>download(name()+'.wav',trimmed(),'audio/wav'));
  $('audio-preview').onclick=()=>run(()=>{const bytes=trimmed();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));$('audio-player').src=audioUrl;return $('audio-player').play();});
  $('audio-start').oninput=wave;$('audio-end').oninput=wave;
  function wave(){const c=$('wave'),g=c.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#777';g.beginPath();g.moveTo(0,c.height/2);g.lineTo(c.width,c.height/2);g.stroke();if(!audioBuffer){g.fillStyle='#999';g.font='14px monospace';g.fillText('Your waveform will appear here.',24,88);return;}const data=audioBuffer.getChannelData(0),chunk=Math.max(1,Math.floor(data.length/c.width));g.strokeStyle='#eee';g.beginPath();for(let x=0;x<c.width;x++){let min=1,max=-1;for(let i=x*chunk;i<Math.min(data.length,(x+1)*chunk);i++){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}g.moveTo(x,(1-max)*c.height/2);g.lineTo(x,(1-min)*c.height/2);}g.stroke();const start=Number($('audio-start').value)/audioBuffer.duration*c.width,end=Number($('audio-end').value)/audioBuffer.duration*c.width;g.fillStyle='#ffffff20';g.fillRect(start,0,end-start,c.height);}
  function showInstruments(){
    const box=$('track-cards');box.replaceChildren();
    if(snapshot){
      const current=snapshot.tracks[snapshot.selected];
      $('live-program').textContent=current?`Selected on FM1: track ${current.track} · ${current.engine} · ${current.preset}`:`Factory sound: ${snapshot.stock}`;
      $('device-screen').textContent=`${snapshot.version} · read at ${new Date(snapshot.readAt).toLocaleTimeString()}`;
      for(const t of snapshot.tracks){const card=document.createElement('div');card.className='studio-track'+(t.track===snapshot.selected+1?' selected':'');
        for(const text of [`TRACK ${t.track}${t.track===snapshot.selected+1?' · SELECTED':''}`,t.preset,`${t.engine} · ${t.channel?'MIDI ch '+t.channel:'channel not available / off'}${t.mute?' · muted':''}${t.armed?' · recording':''}`]){const line=document.createElement('span');line.textContent=text;card.append(line);}box.append(card);}
    }else $('live-program').textContent=manual()?`Your manual label: ${manual().name} · drums on channel ${manual().channel}`:'Instrument not read yet';
  }
  async function readInstrument(quiet=false){
    if(reading||(mode==='idle'&&ctx.isBusy())||audioPending||audioRecorder?.state==='recording'||mode==='playing')return;
    const inp=ctx.getInput(),out=ctx.getOutput(),device=ctx.getDevice();if(!inp||!out)return;
    $('monitor-status').setAttribute('aria-live',quiet?'off':'polite');
    reading=true;attempted=true;lastRead=performance.now();ctx.setReadingBusy?.(true);refreshButtons();
    $('monitor-status').textContent=snapshot?'Updating instrument details…':'Reading instruments and MIDI channels from your FM1…';if(!snapshot)$('live-program').textContent='Reading your FM1’s instrument details…';
    const request=(cmd,args=[])=>new Promise((resolve,reject)=>{
      if(ctx.getInput()!==inp||ctx.getOutput()!==out||ctx.getDevice()!==device)return reject(Error('The device connection changed. Read again.'));
      const done=(error,value)=>{clearTimeout(timer);inp.removeEventListener('midimessage',listener);error?reject(error):resolve(value);};
      const listener=e=>{const a=editorReply(e.data,cmd);if(a!==null)done(null,a);};
      const timer=setTimeout(()=>done(Error('The firmware did not answer. Choose a manual drum channel, or reconnect and try Read instrument.')),1500);
      inp.addEventListener('midimessage',listener);try{out.send(editorFrame(cmd,args));}catch(e){done(e);}
    });
    try{
      let next;
      if([14,15].includes(device?.version)&&ctx.readStockSound)next={stock:await ctx.readStockSound(),version:'Factory V'+device.version,tracks:[],selected:0,readAt:new Date().toISOString()};
      else next=await readSloopSnapshot(request,monitorCache);
      if(ctx.getInput()!==inp||ctx.getDevice()!==device)throw Error('Device disconnected; old readings cleared.');
      snapshot=next;snapshotStale=false;$('live-program').classList.remove('studio-read-error');showInstruments();live();
      $('monitor-status').textContent=`${snapshot.version} · ${new Date(snapshot.readAt).toLocaleTimeString()} · ${$('auto-status').checked?'Auto':'Paused'}${snapshot.tracks.some(t=>t.kind==='drum'&&t.preset.includes('select drums'))?' Select the drum track once to read its kit names.':''}`;
    }catch(e){snapshotStale=true;$('live-program').textContent='Instrument read failed: '+e.message;$('live-program').classList.add('studio-read-error');$('auto-status').checked=false;$('monitor-status').textContent=e.message+(snapshot?' The displayed reading is now out of date.':'');if(!quiet)ctx.notice(e.message,true);}
    finally{reading=false;ctx.setReadingBusy?.(false);refreshButtons();}
  }
  $('read-status').onclick=()=>readInstrument();
  $('auto-status').onchange=()=>{lastRead=0;if(!$('auto-status').checked)$('monitor-status').textContent='Automatic readings paused. Use Read instrument for a fresh reading.';};
  const tick=setInterval(()=>{attach();live();if(input&&!document.hidden&&!document.getElementById('studio')?.hidden&&$('auto-status').checked&&(!attempted||performance.now()-lastRead>1200)&&(!ctx.isBusy()||mode==='recording'))readInstrument(true);if(mode==='recording'){const elapsed=(performance.now()-recordStart)/1000;$('time').textContent=fmt(elapsed);if(elapsed>=600){stop();$('midi-status').textContent='The 10-minute MIDI take limit was reached. Your notes are ready to save.';}}else if(mode==='playing'){$('time').textContent=fmt((performance.now()-playStarted)/1000);drawRoll();}if(audioRecorder?.state==='recording')$('audio-status').textContent=`Recording sound · ${fmt((performance.now()-audioStarted)/1000)} · monitoring off`;},200);
  window.addEventListener('pagehide',()=>{stop();if(audioRecorder?.state==='recording')audioRecorder.stop();audioStream?.getTracks().forEach(t=>t.stop());});
  window.addEventListener('beforeunload',e=>{if(locked()){e.preventDefault();e.returnValue='';}});
  drawRoll();wave();refreshButtons();
  return {stop,refresh:attach,loadProject(p){if(locked())throw Error('Stop or playback first.');if(p.schema!=='fm1-dock/studio/1')throw Error('Unsupported project');notes=cleanNotes(p.notes.map(n=>({...n,channel:n.channel-1})));$('name').value=p.name||'Opened take';select(null);refreshButtons();}};
}
