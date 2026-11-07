import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirmwarePreview} from '../web/preview-render.mjs';

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.events={};this.complete=false;this.naturalWidth=0;this.hidden=false;}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  setAttribute(name,value){this[name]=value;}
  addEventListener(name,callback){this.events[name]=callback;}
  remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
  querySelector(selector){return this.children.find(c=>c.className===selector.slice(1))||null;}
}
const doc={createElement:tag=>new Element(tag)};
const entry={name:'SLOOP',preview:{image:'/previews/sloop.png'}};

test('missing/unsafe preview paths have an honest placeholder',()=>{
  for(const e of [{name:'Missing'},{name:'Unsafe',preview:{image:'https://example.com/p.png'}}]){
    const box=createFirmwarePreview(e,false,doc);
    assert.equal(box.dataset.previewState,'missing');assert.equal(box.children.some(c=>c.tagName==='img'),false);
  }
});
test('preview load sets a verifiable ready state and keeps natural image',()=>{
  const box=createFirmwarePreview(entry,false,doc),image=box.children[0];
  assert.equal(image.loading,'lazy');assert.equal(box.dataset.previewState,'loading');
  image.naturalWidth=480;image.events.load();assert.equal(box.dataset.previewState,'ready');assert.equal(image.hidden,false);
});
test('broken image becomes a retryable placeholder, not a broken icon',()=>{
  const box=createFirmwarePreview(entry,false,doc),image=box.children[0];image.events.error();
  assert.equal(box.dataset.previewState,'error');assert.equal(image.hidden,true);
  const fallback=box.querySelector('.missing-preview');assert.ok(fallback);
  const retry=fallback.children.find(c=>c.tagName==='button');retry.events.click({preventDefault(){},stopPropagation(){}});
  assert.equal(box.dataset.previewState,'loading');assert.equal(image.src,'/previews/sloop.png?retry=2');
});
test('detail modal loads eagerly and offers the full-size original',()=>{
  const box=createFirmwarePreview(entry,true,doc),image=box.children[0];assert.equal(image.loading,'eager');
  const link=box.children.find(c=>c.tagName==='a');assert.equal(link.href,'/previews/sloop.png');assert.equal(link.rel,'noopener noreferrer');
});
