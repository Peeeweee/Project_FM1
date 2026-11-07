import test from 'node:test';
import assert from 'node:assert/strict';
import {soundLibrary,soundFamilies,findSounds} from '../web/forge-sounds.mjs';

test('sound browser offers distinct, searchable recipes that fit the firmware preset limits',()=>{
  assert.equal(soundLibrary.length,288);
  assert.equal(new Set(soundLibrary.map(item=>item.id)).size,288);
  assert.equal(soundFamilies.length,13);
  assert.equal(findSounds('bass','All').length,48);
  assert.equal(findSounds('dark','Air pad').length,3);
  for(const {preset} of soundLibrary){
    assert.match(preset.name,/^[A-Z0-9 _-]{1,10}$/);
    assert.ok(['sine','triangle','sawtooth','square','noise'].includes(preset.wave));
    for(const [key,min,max] of [['attack',5,2000],['release',20,3000],['cutoff',100,16000],['bits',4,16],['drive',1,4],['tune',-24,24],['level',.05,1],['pulse',.1,.9],['lfoRate',0,12],['lfoDepth',0,50]])assert.ok(preset[key]>=min&&preset[key]<=max,`${preset.name} ${key}`);
    assert.ok(Number.isInteger(preset.bits));
    assert.ok(Number.isInteger(preset.tune));
  }
});
