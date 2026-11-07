import {createFirmwarePreview} from './preview-render.mjs';
import {inspectReviewed,installReviewed,buildForDigest,Updater} from './install.mjs';
import {inspectLocalBuild,installLocalBuild} from './forge-install.mjs';
const $=id=>document.getElementById(id);
export function initCatalog(ctx){
  let entries=[],saved=[],builds=[],working=false,selected=null,updateDetail=null;
  const el=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
  const action=(label,fn,className)=>{const b=el('button',label,className);b.onclick=()=>ctx.run(async()=>{
    try{if(working)throw Error('Wait for the current download or installation.');return await fn();}
    catch(error){detailFeedback(error.message||String(error),true);throw error;}
  });b.disabled=working;return b;};
  function detailFeedback(message,error=false){
    if(!$('firmware-detail').open)return;
    const panel=$('detail-content').querySelector('.detail-panel');if(!panel)return;
    let note=panel.querySelector('.detail-feedback');if(!note){note=el('p',null,'detail-feedback');panel.append(note);}
    note.textContent=message;note.setAttribute('role',error?'alert':'status');note.classList.toggle('error',error);
  }
  const link=(label,url)=>{const a=el('a',label,'file-button');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  const approved=asset=>asset&&buildForDigest(builds,asset.sha256,asset.size);
  const stored=asset=>saved.find(s=>s.integrity==='OK'&&s.sha256===asset.sha256&&s.size===asset.size);
  const choices=entry=>(entry.assets||[]).filter(a=>a.name.toLowerCase().endsWith('.fwsc'));
  const native=entry=>choices(entry).some(approved);
  async function reload(){
    [entries,builds]=await Promise.all([ctx.api('/api/catalog'),ctx.api('/api/install-builds')]);
    saved=(await ctx.api('/api/assets')).firmwares;render();
  }
  async function refresh(entry){
    working=true;render();
    try{await ctx.api('/api/catalog/refresh',{id:entry.id});await reload();ctx.notice('Release list updated.');}
    finally{working=false;render();}
  }
  async function cache(entry,asset,install=false){
    const existing=stored(asset);if(existing){if(install)await prepare(existing);return existing;}
    working=true;render();detailFeedback(`Saving ${asset.name}…`);ctx.notice(`Saving ${asset.name}…`);
    try{
      const record=await ctx.api('/api/catalog/cache',{id:entry.id,url:asset.url});
      await ctx.refresh();await reload();ctx.notice(`Saved ${asset.name} on your laptop.`);
      if(install)await prepare(record);return record;
    }finally{working=false;render();}
  }
  async function getBytes(item){
    const r=await fetch(`/api/download/${item.id}`);if(!r.ok)throw Error('Local package failed integrity checks');
    return new Uint8Array(await r.arrayBuffer());
  }
  async function prepare(item){
    if(ctx.isBusy())throw Error('Finish recording, playback or backup before reviewing an installation.');
    const bytes=await getBytes(item),info=await inspectReviewed(bytes,builds);
    if(ctx.isBusy())throw Error('Finish the current operation before reviewing an installation.');
    selected={item,bytes,build:info.build};
    $('install-custom-warning').hidden=true;
    $('firmware-detail').close();$('install-name').textContent=info.build.label;
    $('install-hash').textContent=info.sha256;
    $('install-recovery-link').href=info.build.recovery;
    $('install-words').value='';resetChecks();
    $('flash-status').textContent='Ready for review. No firmware has been written.';
    $('flash-progress').removeAttribute('value');$('flash-progress').hidden=true;
    $('install-dialog').showModal();$('install-dialog').scrollTop=0;updateFinal();
  }
  async function reviewLocalBuild(id){
    if(ctx.isBusy()||working)throw Error('Finish the current operation before reviewing an installation.');
    const meta=await ctx.api('/api/blacksmith/builds/'+id);
    const response=await fetch('/api/blacksmith/builds/'+id+'/firmware.fwsc');
    if(!response.ok)throw Error('Local build failed its integrity check. Rebuild it.');
    const bytes=new Uint8Array(await response.arrayBuffer()),info=await inspectLocalBuild(bytes,meta);
    selected={item:{id,sha256:meta.sha256},bytes,build:{...meta,label:'Blacksmith · '+meta.deviceName},local:true};
    $('install-custom-warning').hidden=false;$('install-name').textContent=selected.build.label;
    $('install-hash').textContent=info.sha256;$('install-recovery-link').href='https://github.com/charlesvestal/fm1-base/tree/'+meta.baseCommit;
    $('install-words').value='';resetChecks();$('flash-status').textContent='Local custom build. Not hardware-tested. Review before writing.';
    $('flash-progress').hidden=true;$('install-dialog').showModal();$('install-dialog').scrollTop=0;updateFinal();
  }
  function resetChecks(){for(const id of ['install-backup','install-recovery','install-power'])$(id).checked=false;}
  function updateFinal(){
    const device=ctx.getDevice(),connected=device?.model==='FM-1';
    $('install-device').textContent=device?.reported||'Not connected';
    $('install-connect').hidden=connected;$('install-connect').disabled=working||ctx.isBusy();
    $('flash-start').disabled=working||ctx.isBusy()||!selected||!connected||$('install-words').value!=='INSTALL'||!['install-backup','install-recovery','install-power'].every(id=>$(id).checked);
  }
  async function flash(){
    if($('flash-start').disabled||!selected)return;
    if(ctx.isBusy())throw Error('Finish recording, playback or backup before installing firmware.');
    const {item,bytes,build,local}=selected;
    const pre=ctx.getDevice();if(pre?.model!=='FM-1')throw Error('Connect and identify your FM1 first.');
    if(local&&/(?:OFFICIAL_OPEN|COMMUNITY_|FM-1_80000)/.test(pre.reported))throw Error('Use the FM1 Open recovery workflow to return to stock before installing this build.');
    // Writing starts only from this final explicit click, after review.
    working=true;ctx.setBusy(true,true);$('flash-start').disabled=true;$('install-close').disabled=true;
    $('flash-progress').hidden=false;
    const status=$('flash-status');
    try{
      const midi=ctx.getMidi();if(!midi)throw Error('No MIDI session. Connect the FM1 first.');
      await ctx.release();ctx.log(`Install requested: ${build.label}; ${item.sha256}; from ${pre.reported}`);
      const updater=new Updater(midi,ctx.log,{fullIdentity:!!local});
      const perform=local?(bytes,updater,step)=>installLocalBuild(bytes,build,updater,step):(bytes,updater,step)=>installReviewed(bytes,updater,step,builds);
      await perform(bytes,updater,(stage,value)=>{
        const messages={start:'Checking the package on the FM1…',verify:'The FM1 is staging its update loader…',loader:'Waiting for the update loader…',write:'Writing firmware — keep power and USB connected.',reboot:'Waiting for the FM1 to restart…',done:'Transfer complete. FM1 USB identity matched; check its screen for the firmware name.'};
        status.textContent=messages[stage]||stage;ctx.log(`${stage} ${value??''}`);
        if(stage==='done'){$('flash-progress').max=1;$('flash-progress').value=1;}
      });
      ctx.notice(`${build.label}: transfer complete and FM1 reconnected. Confirm its name on the device screen and test audio.`);
    }catch(e){
      status.textContent=`Installation stopped: ${e.message}. Keep the FM1 connected and follow the matching recovery instructions.`;
      ctx.notice(status.textContent,true);throw e;
    }finally{
      working=false;ctx.setBusy(false,false);$('install-close').disabled=false;selected=null;render();
    }
  }
  const preview=(entry,large=false)=>createFirmwarePreview(entry,large);
  function showDetail(entry){
    const dialog=$('firmware-detail');$('detail-name').textContent=entry.name;
    const box=$('detail-content');box.replaceChildren();updateDetail=null;
    const layout=el('div',null,'firmware-detail-layout'),visual=el('div',null,'detail-visual'),panel=el('div',null,'detail-panel');
    visual.append(preview(entry,true));
    const credits=el('details',null,'preview-credits');credits.append(el('summary','About this preview'));
    if(entry.preview){credits.append(el('p',entry.preview.caption+' · '+entry.preview.license,'detail-credit'),link('Preview source ↗',entry.preview.source));}
    else credits.append(el('p','The creator has not supplied a screen preview.'));
    visual.append(credits);
    const badge=el('span',native(entry)?'Install here':'Creator installer','install-badge');
    panel.append(el('p',entry.category+' / '+(entry.creator||entry.repo.split('/')[0]),'eyebrow'),badge,el('p',entry.description,'detail-description'));
    const list=choices(entry);
    if(list.length){
      const label=el('label','Build'),choose=el('select');choose.setAttribute('aria-label',entry.name+' build');
      list.forEach((a,i)=>{const b=approved(a);choose.add(new Option((b?b.label:a.name)+(stored(a)?' · Saved':''),String(i)));});label.append(choose);panel.append(label);
      const info=el('p',null,'build-state'),acts=el('div',null,'detail-primary-actions');
      const install=action('Review install',()=>cache(entry,list[Number(choose.value)],true),'primary');
      const save=action('Save to laptop',async()=>{await cache(entry,list[Number(choose.value)]);showDetail(entries.find(e=>e.id===entry.id));});
      const creator=link('Creator installer ↗',entry.installer);
      const update=()=>{
        const a=list[Number(choose.value)],b=approved(a),local=stored(a);choose.disabled=working;
        install.hidden=!b;install.textContent=local?'Review install':'Save & review install';install.disabled=working;
        creator.hidden=!!b;save.disabled=working||!!local;save.textContent=local?'Saved ✓':'Save to laptop';
        badge.textContent=b?'Install here':'Creator installer';
        info.textContent=b?`${local?'Saved offline':'Download required'} · Exact build checked · Hardware test pending`:`${local?'Saved offline':'Download available'} · Installation uses the creator’s tool`;
      };
      choose.onchange=update;updateDetail=update;acts.append(install,save,creator);panel.append(info,acts);update();
    }else{
      panel.append(el('p','This firmware uses its creator’s installer.','build-state'),link('Creator installer ↗',entry.installer));
    }
    const more=el('details',null,'detail-more');more.append(el('summary','Links & releases'));
    const links=el('div',null,'detail-actions');links.append(link('Source ↗',entry.source||'https://github.com/'+entry.repo));
    if(entry.repo)links.append(action('Check releases',async()=>{await refresh(entry);showDetail(entries.find(e=>e.id===entry.id));}));
    more.append(el('p','Catalog version: '+entry.version+(entry.checked?' · Checked '+new Date(entry.checked).toLocaleDateString():''),'subtle'),links);
    panel.append(more);layout.append(visual,panel);box.append(layout);
    if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  }
  function render(){
    const query=$('catalog-search').value.toLowerCase(),category=$('catalog-category').value,onlyNative=$('catalog-installable').checked;
    const items=entries.filter(e=>(category==='All'||e.category===category)&&(!onlyNative||native(e))&&`${e.name} ${e.repo} ${e.description}`.toLowerCase().includes(query));
    $('catalog-count').textContent=`${items.length} ${items.length===1?'instrument':'instruments'}`;
    $('catalog-grid').replaceChildren();
    if(!items.length)$('catalog-grid').append(el('p','No matches. Try another filter.','empty'));
    for(const entry of items){
      const list=choices(entry),hasNative=native(entry),local=list.find(stored);
      const card=el('article',null,'firmware-card');card.append(preview(entry));
      const info=el('div',null,'firmware-info'),meta=el('div',null,'firmware-card-meta');
      meta.append(el('span',entry.category,'eyebrow'),el('span',local?'Saved ✓':hasNative?'In-app install':'Creator install','install-badge'+(hasNative?' native':'')));
      const name=el('h3',entry.name),creator=el('span',entry.creator||entry.repo.split('/')[0],'card-creator');
      info.append(meta,name,creator,el('p',entry.description));
      const bottom=el('div',null,'card-bottom');bottom.append(el('span',entry.version,'subtle'),action(hasNative?'Install / details →':'Explore →',()=>showDetail(entry),hasNative?'primary':''));
      info.append(bottom);card.append(info);$('catalog-grid').append(card);
    }
    window.dispatchEvent(new CustomEvent('fm1-catalog-render'));
    const offline=$('offline-packages');offline.replaceChildren();
    if(!saved.length)offline.append(el('p','Nothing saved yet. Choose a firmware in Explore.','empty'));
    for(const item of saved){
      const build=buildForDigest(builds,item.sha256,item.size),row=el('div',null,'asset');
      row.append(el('strong',build?.label||item.label),el('small',`${item.integrity==='OK'?'Checked':'File check failed'} · ${Math.round(item.size/1024)} KB · ${build?'Install here':'Creator install'}`));
      const acts=el('div',null,'actions');
      const install=action('Review install',()=>prepare(item),'primary');install.disabled=working||item.integrity!=='OK'||!build;
      if(build)acts.append(install);
      acts.append(action('Download',async()=>{const bytes=await getBytes(item),url=URL.createObjectURL(new Blob([bytes]));const a=el('a');a.href=url;a.download=item.originalName;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}));
      row.append(acts);offline.append(row);
    }
    if($('firmware-detail').open){
      $('detail-content').querySelectorAll('button,select').forEach(control=>control.disabled=working);
      updateDetail?.();
    }
    updateFinal();
  }
  function collection(view){
    const savedView=view==='saved';$('catalog-browse').hidden=savedView;$('catalog-saved').hidden=!savedView;
    for(const [id,active] of [['browse-tab',!savedView],['saved-tab',savedView]]){$(id).setAttribute('aria-selected',String(active));$(id).tabIndex=active?0:-1;}
  }
  for(const [id,view] of [['browse-tab','browse'],['saved-tab','saved']]){
    $(id).onclick=()=>collection(view);
    $(id).onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'browse':e.key==='End'?'saved':view==='saved'?'browse':'saved';collection(next);$(next==='saved'?'saved-tab':'browse-tab').focus();}};
  }
  collection('browse');$('catalog-search').oninput=render;$('catalog-category').onchange=render;$('catalog-installable').onchange=render;
  $('catalog-add').onsubmit=e=>{e.preventDefault();ctx.run(async()=>{await ctx.api('/api/catalog/add',{repo:$('catalog-repo').value});$('catalog-repo').value='';await reload();});};
  $('install-close').onclick=()=>$('install-dialog').close();$('install-dialog').addEventListener('cancel',e=>{if(working)e.preventDefault();});
  $('install-words').oninput=updateFinal;for(const id of ['install-backup','install-recovery','install-power'])$(id).onchange=updateFinal;
  $('flash-start').onclick=()=>ctx.run(flash);
  window.addEventListener('fm1-connection',()=>{if(!working&&selected){resetChecks();$('install-words').value='';}updateFinal();});
  window.addEventListener('fm1-assets-changed',()=>ctx.run(reload));
  return reload().then(()=>({reviewLocalBuild}));
}
