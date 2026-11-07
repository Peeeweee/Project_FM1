import {initStudio} from './studio.js';
import {initKinetic,animatePage} from './kinetic.js';
import {initCatalog} from './catalog-ui.js';
import {initBlacksmith} from './blacksmith.js';
// Apply the palette before loading device data; remember it across reloads.
const themeToggle=document.getElementById('theme-toggle');
const systemTheme=matchMedia('(prefers-color-scheme:dark)');
function applyTheme(theme,persist=false){
  const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';
  themeToggle.setAttribute('aria-pressed',String(dark));
  themeToggle.setAttribute('aria-label',`Switch to ${dark?'light':'dark'} mode`);
  themeToggle.querySelector('.theme-label').textContent=dark?'Light mode':'Dark mode';
  if(persist)try{localStorage.setItem('fm1-dock.theme',dark?'dark':'light');}catch{}
  window.dispatchEvent(new CustomEvent('fm1-theme',{detail:{dark}}));
}
themeToggle.onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',true);
const followSystemTheme=()=>{try{if(localStorage.getItem('fm1-dock.theme'))return;}catch{}applyTheme(systemTheme.matches?'dark':'light');};
systemTheme.addEventListener('change',followSystemTheme);
const syncTheme=e=>{if(e.key==='fm1-dock.theme')applyTheme(e.newValue==='dark'?'dark':e.newValue==='light'?'light':systemTheme.matches?'dark':'light');};
window.addEventListener('storage',syncTheme);
let initialTheme=document.documentElement.dataset.theme;
if(initialTheme!=='light'&&initialTheme!=='dark'){
  try{initialTheme=localStorage.getItem('fm1-dock.theme');}catch{}
  if(initialTheme!=='light'&&initialTheme!=='dark')initialTheme=systemTheme.matches?'dark':'light';
}
applyTheme(initialTheme);
// One persistent navigation rail connects all five page identities.
const pages=['home','studio','vault','forge','backup'];
let previous=0;
const nav=document.querySelector('.sidebar nav');
const marker=nav.querySelector('.nav-current');
const shellBorder=document.querySelector('.shell-border');
function positionMarker(){
  const active=nav.querySelector('[aria-current="page"]');
  if(!active)return;
  marker.style.width=active.offsetWidth+'px';
  marker.style.height=active.offsetHeight+'px';
  marker.style.transform=`translate3d(${active.offsetLeft}px,${active.offsetTop}px,0)`;
  const mobile=matchMedia('(max-width:650px)').matches;
  const x=mobile?1:document.querySelector('.sidebar').getBoundingClientRect().right-1;
  const y=document.querySelector('.topbar').getBoundingClientRect().bottom-1;
  const {width,height}=shellBorder.getBoundingClientRect();
  const d=`M ${x} ${height} V ${y+12} Q ${x} ${y} ${x+12} ${y} H ${width}`;
  shellBorder.setAttribute('viewBox',`0 0 ${width} ${height}`);
  shellBorder.querySelectorAll('path').forEach(path=>path.setAttribute('d',d));
}
const resize=new ResizeObserver(positionMarker);[nav,document.querySelector('.sidebar'),document.querySelector('.topbar')].forEach(el=>resize.observe(el));
let borderFrame=0;
const queueBorder=()=>{if(!borderFrame)borderFrame=requestAnimationFrame(()=>{borderFrame=0;positionMarker();});};
window.addEventListener('resize',queueBorder);window.addEventListener('scroll',queueBorder,{passive:true});
function flowToPage(page){
  const index=Math.max(0,pages.indexOf(page));
  document.body.dataset.page=page;
  document.body.dataset.flowDirection=index>=previous?'forward':'back';
  positionMarker();previous=index;
}
window.addEventListener('pagehide',()=>{resize.disconnect();cancelAnimationFrame(borderFrame);window.removeEventListener('resize',queueBorder);window.removeEventListener('scroll',queueBorder);},{once:true});

import {frame,identity,readCommand,readReply,voiceName,validateCapture,singleSysex,bankSysex} from './protocol.mjs';
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r,ms));
let midi, input, output, device, token, busy = false, flashing = false, cancel = false, assets = {backups:[],firmwares:[]};
const profiles = {
  sloop: {name:'SLOOP', url:'https://isod89.github.io/sloop-fm1/webapp/installer/', docs:'https://github.com/isod89/sloop-fm1/blob/main/SLOOP.md',
    text:'Four tracks for live beats. Set QUANT OFF to retain timing offsets. A looping note sequencer, not an unrestricted audio recorder. Community beta.', recovery:'Use the current SLOOP recovery instructions and M-VAVE’s matching factory package. SLOOP documents its own USB rescue mode; that mode is not assumed to exist on stock firmware.'},
  open: {name:'FM1 Open',url:'https://open.m-vave.com/fm1-workbench',docs:'https://github.com/m-vave/fm1_open',
    text:'M-VAVE’s official open firmware. Multiple tracks, synthesis engines and samples. Export its projects, samples and independent voice banks separately using its workbench.', recovery:'The workbench documents stock restoration. Cross-firmware project and sample formats are not interchangeable.'},
  stock: {name:'M-VAVE stock',url:'https://www.m-vave.com/appdownload',docs:'https://www.m-vave.com/product?id=fm-1',
    text:'Return to the factory workflow. Download M-UPGRADE and the exact FM-1 factory firmware from M-VAVE. Confirm the instructions for your currently installed firmware.', recovery:'Restoring factory firmware may reset voices and settings. Restore sound banks only after stock firmware boots and its version is confirmed.'}
};
function log(text){$('log').textContent += `${new Date().toLocaleTimeString()}  ${text}\n`;}
let noticeTimer;
function notice(text,error=false){clearTimeout(noticeTimer);if(!error)noticeTimer=setTimeout(()=>$('notice').hidden=true,8000);$('notice').hidden=false;$('notice').textContent=text;$('notice').classList.toggle('error',error);log(text);}
const operations=new Set();
function setOperation(owner,on){if(on)operations.add(owner);else operations.delete(owner);busy=operations.size>0;controls();}
function supported(){return device?.model==='FM-1' && [14,15].includes(device.version);}
function controls(){
  for(const id of ['ports','connect','input','output','channel','import-backup']) $(id).disabled=busy;
  $('current').disabled=busy||!supported();
  $('all').disabled=busy||!supported()||!$('switch-ok').checked;
  $('cancel').hidden=!busy||flashing;
  document.querySelectorAll('[data-restore]').forEach(b=>b.disabled=busy||!supported());
  preflight();
}
async function api(path, obj){
  const res=await fetch(path,obj?{method:'POST',headers:{'Content-Type':'application/json','X-FM1-Token':token},body:JSON.stringify(obj)}:{});
  const body=await res.json(); if(!res.ok) throw Error(body.error||`Request failed: ${res.status}`); return body;
}
async function release(){
  device=null;
  if(input){input.onmidimessage=null;await input.close();}
  if(output)await output.close();
  input=output=null;$('connection').textContent='Not connected';window.dispatchEvent(new CustomEvent('fm1-connection',{detail:{device:null}}));controls();
}
async function findPorts(){
  if(!navigator.requestMIDIAccess)throw Error('Use desktop Chrome or Edge; Web MIDI is unavailable here.');
  await release();
  midi??=await navigator.requestMIDIAccess({sysex:true});
  for(const [id,ports] of [['input',midi.inputs],['output',midi.outputs]]){
    $(id).replaceChildren(new Option('Choose FM1 port',''));
    for(const port of ports.values())if(port.state==='connected')$(id).add(new Option(port.name,port.id));
    const matches=[...$(id).options].filter(o=>/fm-?1|felucca|sloop|orbit/i.test(o.text));
    if(matches.length===1)$(id).value=matches[0].value;
  }
  midi.onstatechange=()=>{
    if((input&&input.state!=='connected')||(output&&output.state!=='connected')){
      device=null;cancel=true;window.dispatchEvent(new CustomEvent('fm1-connection',{detail:{device:null}}));$('connection').textContent='USB disconnected';controls();notice('USB disconnected. Any incomplete capture has not been saved.',true);
    }
  };
  notice('Choose the FM1 input and output, then connect.');
}
function request(bytes, parser, timeout=2000){
  return new Promise((resolve,reject)=>{
    if(!input||!output||output.state!=='connected')return reject(Error('FM1 is disconnected'));
    const port=input;
    const finish=(err,value)=>{clearTimeout(timer);port.removeEventListener('midimessage',listener);err?reject(err):resolve(value);};
    const listener=e=>{const parsed=parser(e.data);if(parsed)finish(null,parsed);};
    const timer=setTimeout(()=>finish(Error('FM1 did not return a valid response. Close other MIDI tools and check USB.')),timeout);
    port.addEventListener('midimessage',listener);
    try{output.send(bytes);}catch(e){finish(e);}
  });
}
async function connect(){
  if(!midi)throw Error('Click Find MIDI ports first.');
  await release();
  input=midi.inputs.get($('input').value);output=midi.outputs.get($('output').value);
  if(!input||!output)throw Error('Choose both FM1 MIDI ports.');
  await input.open();await output.open();
  device=await request(frame(17),identity);
  $('connection').textContent=`${device.model} · V${device.version} · USB`;
  $('device-detail').textContent=`Device reports ${device.reported}. ${supported()?'Stock sound capture is available.':'Sound capture is disabled for this firmware. Use its maintainer’s backup tool.'}`;
  window.dispatchEvent(new CustomEvent('fm1-connection',{detail:{device}}));$('connect-dialog').close();notice('Connected. Open Studio to play.');controls();
}
async function readStable(){
  for(let attempt=0;attempt<3;attempt++){
    try{
      const a=await request(readCommand(),readReply);
      const b=await request(readCommand(),readReply);
      if(a.every((v,i)=>v===b[i]))return a;
    }catch(e){if(attempt===2)throw e;}
  }
  throw Error('Two reads did not match. Capture stopped without saving a partial backup.');
}
async function capture(all){
  if(busy||!supported())throw Error('Connect a stock V14/V15 FM1 first.');
  if(all&&!$('switch-ok').checked)throw Error('Acknowledge the preset switching first.');
  setOperation('backup',true);cancel=false;
  const originalDevice={...device}, voices=[], channel=Number($('channel').value)-1;
  try{
    const count=all?128:1;
    $('progress').max=count;$('progress').value=0;
    for(let i=0;i<count;i++){
      if(cancel||!device)throw Error('Capture cancelled. No partial backup was saved.');
      if(all){output.send([192|channel,i]);await sleep(220);}
      const voice=await readStable();voices.push(voice);
      if(all&&i===3&&voices.every(v=>v.every((b,n)=>b===voices[0][n])))throw Error('First four sounds are identical; preset switching could not be established. Check MIDI channel.');
      $('progress').value=i+1;$('progress-text').textContent=`Read & matched ${i+1}/${count} · ${voiceName(voice)}`;
    }
    if(cancel||!device)throw Error('Capture interrupted.');
    const record=await api('/api/backups',{schema:'fm1-dock/1',scope:all?'saved-sounds':'current-sound',device:originalDevice,voices});
    notice(`Saved ${count} sound${count===1?'':'s'} to disk; SHA-256 verified. Sequences and settings are not included.`);
    log(`Capture ${record.id} · ${record.sha256}`);await refresh();
  }finally{setOperation('backup',false);}
}
function download(name,bytes,type='application/octet-stream'){
  const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function fetchCapture(item){
  const res=await fetch(`/api/download/${item.id}`);if(!res.ok)throw Error('Could not read verified capture');
  return validateCapture(await res.json());
}
function button(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=()=>run(action);return b;}
async function restoreBank(item,index){
  if(busy||!supported())throw Error('Restore is available only on identified stock V14/V15.');
  const letter='ABCD'[index];
  const capture=await fetchCapture(item);
  if(capture.voices.length!==128)throw Error('A bank restore requires a full 128-sound capture.');
  if(!confirm(`Restore bank ${letter}? This sends 32 sounds to your FM1. On the FM1 choose bank ${letter} to store them. That replaces the sounds in that bank. Capture your existing sounds first. Continue?`))return;
  if(busy)throw Error('Finish the current operation first.');
  setOperation('backup',true);
  try{
    output.send(bankSysex(capture.voices.slice(index*32,index*32+32)));
    notice(`Bank ${letter} sent. Finish the bank selection/save prompt on the FM1. The write has NOT been verified. Re-capture all 128 sounds afterward to check restoration.`);
  }finally{setOperation('backup',false);}
}
async function refresh(){
  assets=await api('/api/assets');
  for(const kind of ['backups','firmwares']){
    const container=$(kind);container.replaceChildren();
    if(!assets[kind].length){const p=document.createElement('p');p.className='empty';p.textContent=kind==='backups'?'No captures saved yet.':'Your firmware collection starts here.';container.append(p);}
    for(const item of assets[kind]){
      const el=document.createElement('div');el.className='asset';
      const title=document.createElement('strong');title.textContent=item.label;
      const sub=document.createElement('small');sub.textContent=`${new Date(item.created).toLocaleString()} · ${item.size.toLocaleString()} bytes · Integrity ${item.integrity}`;
      const sha=document.createElement('small');sha.textContent=`SHA-256 ${item.sha256}`;
      const actions=document.createElement('div');actions.className='actions';const meta=document.createElement('details'),summary=document.createElement('summary');summary.textContent='File details';meta.append(summary,sub,sha);el.append(title,actions,meta);
      if(item.integrity==='OK'){
        actions.append(button('Download copy',async()=>{const r=await fetch(`/api/download/${item.id}`);if(!r.ok)throw Error('Download failed');download(`fm1-${item.id}${item.extension}`,await r.arrayBuffer());}));
        if(kind==='backups'){
          actions.append(button('Export DX7 .syx',async()=>{const c=await fetchCapture(item);const data=c.voices.length===128?[0,1,2,3].flatMap(i=>bankSysex(c.voices.slice(i*32,i*32+32))):singleSysex(c.voices[0]);download(`fm1-sounds-${item.id}.syx`,new Uint8Array(data));}));
          if(item.count===128)for(let i=0;i<4;i++){const b=button(`Restore ${'ABCD'[i]}`,()=>restoreBank(item,i));b.dataset.restore='true';actions.append(b);}
        }
      }
      if(kind==='firmwares'){const p=document.createElement('small');p.textContent=item.compatibility;el.append(p);if(item.source){const a=document.createElement('a');a.href=item.source;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Maintainer source';el.append(a);}}
      container.append(el);
    }
  }
  controls();
  window.dispatchEvent(new Event('fm1-assets-changed'));
  await showLegacy();
}
function preflight(){
  const hasCapture=assets.backups.some(x=>x.count===128&&x.integrity==='OK');
  const checks=[`${device?`Device identified: ${device.reported}`:'Device not identified — connect first'}`,`${hasCapture?'128-sound capture is present and intact':'No verified 128-sound capture on disk'}`,`${assets.firmwares.length} firmware package(s) in the vault; compatibility must be checked with the maintainer`];
  $('preflight').replaceChildren(...checks.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
  $('handoff').disabled=busy||!device||!hasCapture||!['loss-ok','recovery-ok','power-ok'].every(id=>$(id).checked);
}
function target(){
  const p=profiles[$('target').value], el=$('target-description');el.replaceChildren();
  for(const text of [p.text,p.recovery]){const n=document.createElement('p');n.textContent=text;el.append(n);}
  const a=document.createElement('a');a.textContent='Read maintainer instructions ↗';a.href=p.docs;a.target='_blank';a.rel='noopener noreferrer';el.append(a);
}
async function run(fn){try{await fn();}catch(e){notice(e.message||String(e),true);controls();}}
for(let n=1;n<=16;n++)$('channel').add(new Option(String(n),String(n)));
$('ports').onclick=()=>run(findPorts);$('connect').onclick=()=>run(connect);
$('current').onclick=()=>run(()=>capture(false));$('all').onclick=()=>run(()=>capture(true));
$('cancel').onclick=()=>{cancel=true;$('progress-text').textContent='Cancelling after the current read…';};
$('switch-ok').onchange=controls;
for(const id of ['loss-ok','recovery-ok','power-ok'])$(id).onchange=preflight;
$('target').onchange=target;
$('handoff').onclick=()=>run(async()=>{
  const p=profiles[$('target').value];await release();
  const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.click();
  notice(`MIDI released. Opening ${p.name}’s maintainer page. No firmware was written.`);
});
$('import-backup').onchange=()=>run(async()=>{
  const file=$('import-backup').files[0];if(!file)return;if(file.size>1024*1024)throw Error('Backup is too large');
  await api('/api/backups',validateCapture(JSON.parse(await file.text())));await refresh();notice('Imported capture validated and saved on disk.');$('import-backup').value='';
});
$('firmware-form').onsubmit=e=>{e.preventDefault();run(async()=>{
  const file=$('firmware-file').files[0];if(!file)throw Error('Choose a firmware file');if(file.size>8*1024*1024)throw Error('Maximum firmware size is 8 MiB');
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  await api('/api/firmwares',{filename:file.name,label:$('firmware-label').value,source:$('firmware-source').value,expectedSha256:$('firmware-sha').value,base64:btoa(binary)});
  $('firmware-form').reset();await refresh();notice('Firmware file saved and hashed. It has not been flashed or certified compatible.');
});};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
let studioInstance;
let activePage='home';
function route(){
  const requested=location.hash.slice(1)||'home';
  const page=pages.includes(requested)?requested:'home';
  if(busy&&page!==activePage){history.replaceState(null,'','#'+activePage);notice('Finish the current recording, playback or device operation first.');return;}
  activePage=page;
  document.querySelectorAll('section[data-page]').forEach(el=>el.hidden=el.dataset.page!==page);
  document.querySelectorAll('[data-route]').forEach(el=>{const yes=el.dataset.route===page;el.classList.toggle('active',yes);if(yes)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  flowToPage(page);
  const headers={
    home:{name:'Home',title:'Sound takes',accent:'shape.',eyebrow:'A LITTLE INSTRUMENT. ENDLESS POSSIBILITIES.',description:'A little space for big ideas.',ribbon:'PLAY · SHAPE · REPEAT · '},
    studio:{name:'Studio',title:'Catch your',accent:'rhythm.',eyebrow:'YOUR TIMING. YOUR TAKE.',description:'Your hands. Your timing. Your take.',ribbon:'PLAY · RECORD · REPEAT · '},
    vault:{name:'Firmware',title:'New sounds.',accent:'Same synth.',eyebrow:'ONE SYNTH. MANY INSTRUMENTS.',description:'A different instrument, the same little synth.',ribbon:'EXPLORE · TRY · PLAY · '},
    backup:{name:'Backups',title:'Keep your',accent:'sound.',eyebrow:'SAVED HERE. READY WHEN YOU ARE.',description:'Keep your sounds. Keep creating.',ribbon:'SAVE · KEEP · CREATE · '},
    forge:{name:'Blacksmith',title:'Forge your',accent:'instrument.',eyebrow:'YOUR SCREEN. YOUR SOUND.',description:'Shape a starter. Keep the source.',ribbon:'DESIGN · SHAPE · FORGE · '}
  };
  const header=headers[page],heading=$('page-title'),accent=document.createElement('span');
  accent.className='motion-emphasis';accent.textContent=header.accent;
  heading.replaceChildren(document.createTextNode(header.title),document.createElement('br'),accent);
  delete heading.dataset.kineticReady;heading.removeAttribute('aria-label');
  $('header-eyebrow').textContent=header.eyebrow;
  $('page-description').textContent=header.description;
  document.querySelectorAll('.kinetic-ticker span').forEach(span=>span.textContent=header.ribbon);
  document.title=page==='home'?'FM1':header.name+' · FM1';
  window.dispatchEvent(new CustomEvent('fm1-page',{detail:{page}}));
  animatePage(document.querySelector('.workspace-heading'));
  animatePage($(page));window.scrollTo({top:0,behavior:'instant'});
}
async function showLegacy(){
  const files=await api('/api/legacy'),box=$('legacy-backups');box.replaceChildren();
  for(const f of files){const row=document.createElement('div');row.className='asset';const title=document.createElement('strong');title.textContent='Your original factory sounds';const p=document.createElement('p');p.className='subtle';p.textContent=f.name+' · '+f.size.toLocaleString()+' bytes · original saved copy';const a=document.createElement('a');a.className='button';a.href='/api/legacy/'+encodeURIComponent(f.name);a.download=f.name;a.textContent='Download a copy';row.append(title,p,a);box.append(row);}
}
document.querySelectorAll('[data-open-connect]').forEach(b=>b.onclick=()=>$('connect-dialog').showModal());
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('#help-open,[data-open-help]').forEach(b=>b.onclick=()=>$('help-dialog').showModal());
window.addEventListener('hashchange',route);
window.addEventListener('fm1-catalog-render',()=>{if(activePage==='vault')animatePage($('catalog-grid'));});
run(async()=>{
  const session=await api('/api/session');token=session.token;$('data-path').textContent='Files are saved in '+session.dataPath;
  target();await refresh();
  studioInstance=initStudio({getInput:()=>device&&input?.state==='connected'?input:null,getOutput:()=>device&&output?.state==='connected'?output:null,getDevice:()=>device,isBusy:()=>busy,notice,
    saveProject:async obj=>{const meta=await api('/api/projects',obj);await showProjects();return meta;},setBusy:(value)=>setOperation('studio',value),setReadingBusy:(value)=>setOperation('telemetry',value),readStockSound:async()=>{if(!supported())throw Error('Stock sound reader needs V14/V15.');return voiceName(await request(readCommand(),readReply));}});
  const catalogUi=await initCatalog({api,refresh,run,release,controls,log,notice,getDevice:()=>device,getMidi:()=>midi,isBusy:()=>busy,setBusy:(value,writing)=>{flashing=writing;setOperation('firmware',value);}});
  try{await initBlacksmith({api,isBusy:()=>busy,reviewBuild:catalogUi.reviewLocalBuild});}
  catch(error){const message=document.createElement('p');message.className='forge-status error';message.setAttribute('role','alert');message.textContent='Blacksmith could not open: '+error.message+'. Reload to try again.';$('blacksmith-root').replaceChildren(message);}
  await showProjects();
  const kinetic=initKinetic();let paused=localStorage.getItem('fm1-dock.motion')==='paused';
  function motion(){kinetic?.setPaused?.(paused);$('motion-toggle').textContent=paused?'Resume motion':'Pause motion';$('motion-toggle').setAttribute('aria-label',paused?'Resume animation':'Pause animation');$('motion-toggle').setAttribute('aria-pressed',String(paused));if(paused)document.getAnimations().filter(a=>!(a instanceof CSSAnimation)).forEach(a=>a.cancel());}
  $('motion-toggle').onclick=()=>{paused=!paused;localStorage.setItem('fm1-dock.motion',paused?'paused':'on');motion();};motion();route();
});

async function showProjects(){
  let box=document.getElementById('studio-saved-projects');
  if(!box){box=document.createElement('div');box.id='studio-saved-projects';box.className='studio-project';const title=document.createElement('h3');title.textContent='Saved takes';box.append(title);document.getElementById('studio-midi-pane').append(box);}
  box.querySelectorAll('.project-row,.empty').forEach(el=>el.remove());
  const projects=(await api('/api/assets')).projects||[];
  if(!projects.length){const p=document.createElement('p');p.className='empty';p.textContent='No saved takes yet.';box.append(p);}
  for(const item of projects){const row=document.createElement('div');row.className='asset project-row';const title=document.createElement('strong');title.textContent=item.label+' · '+item.count+' MIDI events';const load=document.createElement('button');load.textContent='Open';load.disabled=item.integrity!=='OK';load.onclick=()=>run(async()=>{if(busy)throw Error('Stop the current operation first.');const r=await fetch('/api/download/'+item.id);if(!r.ok)throw Error('Could not read project');studioInstance.loadProject(await r.json());notice('Opened '+item.label);});row.append(title,load);box.append(row);}
}
