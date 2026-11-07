// Firmware preview renderer with explicit loading, failure and missing states.
// Own application code. Image licenses and immutable source credits remain in previews.json.
export function createFirmwarePreview(entry, large=false, doc=document) {
  const box=doc.createElement('div');
  box.className=large?'preview-large':'firmware-preview';
  const metadata=entry?.preview;
  const imagePath=metadata?.image;
  const validPath=typeof imagePath==='string' && /^\/previews\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/i.test(imagePath);
  const fallback=(message,canRetry=false)=>{
    const block=doc.createElement('div');block.className='missing-preview';
    const icon=doc.createElement('span');icon.textContent='▦';icon.setAttribute('aria-hidden','true');
    const text=doc.createElement('small');text.textContent=message;block.append(icon,text);
    if(canRetry){
      const retry=doc.createElement('button');retry.type='button';retry.className='preview-retry';retry.textContent='Try again';
      retry.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();block.remove();load(true);});
      block.append(retry);
    }
    return block;
  };
  if(!validPath){box.dataset.previewState='missing';box.append(fallback('No screen preview supplied'));return box;}
  box.dataset.previewState='loading';
  const image=doc.createElement('img');
  image.alt=(entry.name||'Firmware')+(entry.id==='stock'?' original device photo':metadata.kind==='artwork'?' maintainer artwork':' screen preview');image.loading=large?'eager':'lazy';image.decoding='async';
  const status=doc.createElement('span');status.className='preview-load-status';status.textContent='Loading preview…';
  box.append(image,status);
  let generation=0;
  function ready(){
    if(!image.naturalWidth)return failed();
    box.dataset.previewState='ready';status.hidden=true;image.hidden=false;
  }
  function failed(){
    box.dataset.previewState='error';status.hidden=true;image.hidden=true;
    if(!box.querySelector('.missing-preview'))box.append(fallback('Preview could not load.',true));
  }
  function load(retry=false){
    generation++;box.dataset.previewState='loading';status.hidden=false;image.hidden=false;
    image.src=retry?imagePath+'?retry='+generation:imagePath;
  }
  image.addEventListener('load',ready);
  image.addEventListener('error',failed);
  if(large){
    const full=doc.createElement('a');full.className='preview-full-size';full.href=imagePath;full.target='_blank';full.rel='noopener noreferrer';
    full.textContent='Open full-size image ↗';full.setAttribute('aria-label','Open '+(entry.name||'firmware')+' preview at full size');box.append(full);
  }else{
    const caption=doc.createElement('span');caption.className='preview-label';caption.textContent=entry.id==='stock'?'YOUR DEVICE PHOTO':metadata.kind==='artwork'?'MAINTAINER ARTWORK':'SCREEN PREVIEW';box.append(caption);
  }
  load();
  // Handles a cached image that finishes before the browser delivers its load callback.
  if(image.complete && image.naturalWidth>0)ready();
  return box;
}
