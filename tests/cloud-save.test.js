import test from 'node:test';import assert from 'node:assert/strict';
import {CloudSave} from '../src/cloud-save.js';import {encodeSave,decodeSave} from '../src/save-system.js';
const save=coins=>encodeSave({'sunset-up':JSON.stringify({u:[0,0,0,0,0],c:coins}),'sunset-graphics':'{"reduced":true,"dynamic":false,"target":30}'},2,123);
test('cloud sync is disabled without an explicitly injected backend',async()=>{
 const cloud=new CloudSave();assert.equal(cloud.enabled,false);assert.deepEqual(await cloud.inspect(save(50)),{status:'disabled'});assert.deepEqual(await cloud.push(save(50),null),{status:'disabled'});
});
test('mock transport requires revision compare-and-swap, strips preferences and reports conflicts',async()=>{
 let remote=null,rev=0;const cloud=new CloudSave({read:async()=>remote,write:async({save,expectedRevision})=>{if(expectedRevision!==(remote?.revision??null))return{conflict:true};remote={save,revision:String(++rev)};return{revision:remote.revision};}});
 assert.equal((await cloud.inspect(save(100))).status,'cloud-empty');assert.equal((await cloud.push(save(100),null)).status,'uploaded');assert.equal(decodeSave(remote.save).data['sunset-graphics'],undefined);
 assert.equal((await cloud.inspect(save(100))).status,'equal');const conflict=await cloud.inspect(save(200));assert.equal(conflict.status,'conflict');assert.equal((await cloud.push(save(200),null)).status,'conflict');assert.equal((await cloud.push(save(200),conflict.expectedRevision)).status,'uploaded');
 const adopted=decodeSave(cloud.restoreCandidate(save(500),remote.save));assert.equal(JSON.parse(adopted.data['sunset-up']).c,200);assert.equal(JSON.parse(adopted.data['sunset-graphics']).target,30);
});
test('offline and malformed cloud data cannot replace local data',async()=>{
 const offline=new CloudSave({read:async()=>{throw Error('offline');},write:async()=>{throw Error('offline');}});assert.equal((await offline.inspect(save(100))).status,'unavailable');assert.equal((await offline.push(save(100),null)).status,'unavailable');assert.throws(()=>offline.restoreCandidate(save(100),'bad'));
});
