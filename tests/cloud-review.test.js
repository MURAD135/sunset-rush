import test from 'node:test';import assert from 'node:assert/strict';
import {CloudReview} from '../src/cloud-review.js';import {GuestProfile,GUEST_KEY} from '../src/guest-profile.js';import {SaveStore,encodeSave,decodeSave} from '../src/save-system.js';
const wallet=c=>JSON.stringify({u:[0,0,0,0,0],c});const saved=c=>encodeSave({'sunset-up':wallet(c)},1,1);
function setup(){const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),get length(){return map.size;},key:i=>[...map.keys()][i]};const store=new SaveStore(storage,{schedule:()=>0,cancel:()=>{}});store.setItem('sunset-up',wallet(100));store.flush();return{store,storage,map};}
function server(c=50){let remote={revision:'1',save:saved(c)};return{get remote(){return remote;},change(coins){remote={revision:String(+remote.revision+1),save:saved(coins)};},transport:{read:async()=>remote,write:async({save,expectedRevision})=>{if(expectedRevision!==remote.revision)return{conflict:true};remote={revision:String(+remote.revision+1),save};return{revision:remote.revision};}}};}
const session=transport=>({authenticated:true,subject:'mock-account-a',kind:'guest',transport});
test('local guest is opt-in, persistent and never changes or exports wallet/authentication data',()=>{
 const {store,storage,map}=setup(),before=store.export();let draws=0;const guest=new GuestProfile(storage,{random:()=>{draws++;return new Uint8Array(16).fill(5);},now:()=>1});assert.equal(guest.load(),null);assert.equal(draws,0);const p=guest.create();assert.deepEqual(guest.create(),p);assert.equal(draws,1);assert.equal(p.id,'guest-'+'05'.repeat(16));assert.equal(decodeSave(store.export()).data['sunset-up'],decodeSave(before).data['sunset-up']);assert.equal(decodeSave(store.export()).data[GUEST_KEY],undefined);assert.ok(map.has(GUEST_KEY));
});
test('guest storage failure preserves gameplay progress',()=>{const{store,storage}=setup();const guest=new GuestProfile({...storage,setItem(){throw Error('Quota');}});assert.throws(()=>guest.create());assert.equal(JSON.parse(store.getItem('sunset-up')).c,100);});
test('cloud review needs explicit authenticated transport and never auto-merges wallets',async()=>{
 const{store}=setup(),cloud=new CloudReview(store),remote=server(50);assert.equal((await cloud.review()).status,'disabled');assert.throws(()=>cloud.setSession({...session(remote.transport),authenticated:false}));cloud.setSession(session(remote.transport));assert.equal((await cloud.review()).status,'conflict');assert.equal(JSON.parse(store.getItem('sunset-up')).c,100);assert.equal((await cloud.resolve('cloud')).status,'restored');assert.equal(JSON.parse(store.getItem('sunset-up')).c,50);assert.equal(JSON.parse(decodeSave(store.backup()).data['sunset-up']).c,100);
});
test('explicit local choice uses CAS and protects against concurrent remote edits',async()=>{
 const{store}=setup(),remote=server(),cloud=new CloudReview(store);cloud.setSession(session(remote.transport));await cloud.review();remote.change(60);assert.equal((await cloud.resolve('local')).status,'conflict');assert.equal(JSON.parse(decodeSave(remote.remote.save).data['sunset-up']).c,60);await cloud.review();assert.equal((await cloud.resolve('local')).status,'uploaded');assert.equal(JSON.parse(decodeSave(remote.remote.save).data['sunset-up']).c,100);
});
test('local changes and remote changes invalidate a pending restore choice',async()=>{
 const{store}=setup(),remote=server(),cloud=new CloudReview(store);cloud.setSession(session(remote.transport));await cloud.review();store.setItem('sunset-up',wallet(200));assert.equal((await cloud.resolve('cloud')).status,'local-changed');await cloud.review();remote.change(80);assert.equal((await cloud.resolve('cloud')).status,'remote-changed');assert.equal(JSON.parse(store.getItem('sunset-up')).c,200);
});
test('logout during review discards the stale account response',async()=>{
 const{store}=setup();let finish;const cloud=new CloudReview(store);cloud.setSession(session({read:()=>new Promise(r=>finish=r),write:async()=>{throw Error('must not write');}}));const result=cloud.review();cloud.setSession(null);finish({revision:'1',save:saved(50)});assert.equal((await result).status,'stale-session');assert.equal((await cloud.resolve('cloud')).status,'review-required');assert.equal(JSON.parse(store.getItem('sunset-up')).c,100);
});
test('account changes while a restore waits for its lock cannot overwrite local progress',async()=>{
 const{store}=setup(),remote=server(),cloud=new CloudReview(store);cloud.setSession(session(remote.transport));await cloud.review();let release;store.withLock=fn=>new Promise((resolve,reject)=>{release=()=>{try{resolve(fn());}catch(e){reject(e);}};});const restoring=cloud.resolve('cloud');while(!release)await Promise.resolve();cloud.setSession(null);release();assert.equal((await restoring).status,'stale-session');assert.equal(JSON.parse(store.getItem('sunset-up')).c,100);
});
