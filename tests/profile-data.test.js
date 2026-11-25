import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeSession,normalizeResults} from '../src/profile-data.js';
import {SaveStore,encodeSave,decodeSave,checksum,SAVE_KEYS} from '../src/save-system.js';
test('garage and circuit preferences normalize bounded values and safe colors',()=>{
 const p=normalizeSession({car:7,track:10,color:'#AB12ef',laps:5,ghost:false,opt:{wing:2,rim:'#ffb547'}});assert.equal(p.color,'#ab12ef');assert.equal(p.car,7);assert.equal(p.opt.wing,2);assert.equal(p.ghost,false);
 const bad=normalizeSession({car:99,track:-1,color:'url(secret)',laps:400,opt:{wing:99}});assert.equal(bad.car,0);assert.equal(bad.track,10);assert.equal(bad.laps,3);assert.equal(bad.color,'#18b8c1');
});
test('race history bounds size and validates complete personal results',()=>{
 const r={id:'race-1',at:1,track:10,car:6,mode:'sport',laps:[21,20,20],time:61,place:1,score:5000};assert.deepEqual(normalizeResults([r]),[r]);assert.throws(()=>normalizeResults([r,r]));assert.throws(()=>normalizeResults([{...r,laps:[0]}]));assert.throws(()=>normalizeResults(Array(21).fill(r)));
});
test('version-one profiles migrate to version two while preserving the previous envelope',()=>{
 const e=JSON.parse(encodeSave({'sunset-up':'{"u":[1,2,0,0,0],"c":500}'},7,123));delete e.checksum;e.version=1;const raw=JSON.stringify({...e,checksum:checksum(JSON.stringify(e))});
 const data=new Map([[SAVE_KEYS[0],raw]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const save=new SaveStore(storage,{schedule:()=>0,cancel:()=>{}});assert.equal(save.dirty,true);assert.equal(save.revision,7);assert.ok(save.flush());assert.equal(decodeSave(data.get(SAVE_KEYS[1])).version,2);assert.equal(data.get(SAVE_KEYS[0]),raw);assert.equal(JSON.parse(save.getItem('sunset-up')).c,500);
});
