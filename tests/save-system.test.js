import test from 'node:test';import assert from 'node:assert/strict';
import {SaveStore,SAVE_KEYS,encodeSave,decodeSave,defaultStats} from '../src/save-system.js';
const memory=()=>{const map=new Map();return{map,get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem(k,v){map.set(k,String(v));}};};
const open=s=>new SaveStore(s,{schedule:()=>0,cancel:()=>{},now:()=>123});
const wallet=(store,coins)=>store.setItem('sunset-up',JSON.stringify({u:[1,0,0,0,0],c:coins}));
const coins=store=>JSON.parse(store.getItem('sunset-up')).c;
test('legacy wallet, stats, ghosts, quality and daily claim migrate together without deleting originals',()=>{
 const s=memory();s.setItem('sunset-up',JSON.stringify({u:[1,2,0],c:400}));s.setItem('sunset-st',JSON.stringify({...defaultStats(),cu:[6],xp:100}));s.setItem('sunset-g10','[[20,30,40]]');s.setItem('sunset-q','[3,1,0,1]');s.setItem('sunset-day','Fri Nov 13 2026');s.setItem('sunset-streak','3');
 const a=open(s);assert.equal(coins(a),400);assert.equal(JSON.parse(a.getItem('sunset-up')).u.length,5);assert.ok(a.flush());
 assert.equal(s.getItem('sunset-streak'),'3');s.setItem('sunset-up','{"c":999,"u":[]}');const b=open(s);assert.equal(coins(b),400);assert.equal(b.getItem('sunset-day'),'Fri Nov 13 2026');assert.equal(b.getItem('sunset-g10'),'[[20,30,40]]');
});
test('one atomic generation includes wallet and rewards; corruption recovers previous valid generation',()=>{
 const s=memory(),a=open(s);wallet(a,100);a.flush();wallet(a,200);a.setItem('sunset-st',JSON.stringify({...defaultStats(),r:1}));a.flush();assert.equal(coins(open(s)),200);
 s.setItem(SAVE_KEYS[1],'broken');const b=open(s);assert.equal(coins(b),100);assert.equal(b.status,'recovered');wallet(b,120);assert.ok(b.flush());assert.equal(coins(open(s)),120);
});
test('quota failure preserves prior generation and retries unsaved in-memory progress',()=>{
 const s=memory(),a=open(s);wallet(a,100);a.flush();const set=s.setItem;s.setItem=()=>{throw Error('QuotaExceededError');};wallet(a,150);assert.equal(a.flush(),false);assert.equal(a.status,'unavailable');assert.equal(coins(a),150);assert.equal(coins(open(s)),100);s.setItem=set;assert.ok(a.flush());assert.equal(coins(open(s)),150);
});
test('future or entirely damaged saves are never silently overwritten',()=>{
 for(const raw of ['{"version":5}','broken']){const s=memory();s.setItem(SAVE_KEYS[0],raw);const a=open(s);wallet(a,1);assert.equal(a.flush(),false);assert.equal(s.getItem(SAVE_KEYS[0]),raw);assert.equal(a.status,'blocked');}
});
test('invalid fields normalize during legacy migration; bad imports leave progress untouched',()=>{
 const s=memory();s.setItem('sunset-st','{"cu":null,"a":{},"bt":null,"dm":{},"xp":-99}');s.setItem('sunset-up','broken');const a=open(s);assert.deepEqual(JSON.parse(a.getItem('sunset-st')),defaultStats());assert.ok(a.issues.includes('invalid-legacy:sunset-up'));wallet(a,150);a.flush();
 for(const text of ['bad',encodeSave({'sunset-up':'{"c":-1,"u":[]}'}),a.export().replace('150','151')])assert.throws(()=>a.import(text));assert.equal(coins(a),150);
});
test('export, import and previous-generation restore preserve coherent complete profiles',()=>{
 const s=memory(),a=open(s);wallet(a,100);a.flush();const exported=a.export();wallet(a,200);a.flush();a.import(exported);assert.equal(coins(open(s)),100);assert.equal(JSON.parse(decodeSave(a.backup()).data['sunset-up']).c,200);
});
test('second tab detects stale revision and cannot overwrite newer progress',()=>{
 const s=memory(),a=open(s);wallet(a,100);a.flush();const b=open(s);wallet(a,200);a.flush();wallet(b,300);assert.equal(b.flush(),false);assert.equal(b.status,'conflict');assert.equal(coins(open(s)),200);
});
test('unavailable storage stays playable in memory without claiming a durable save',()=>{
 const s={getItem(){throw Error('SecurityError');}},a=open(s);wallet(a,50);assert.equal(a.flush(),false);assert.equal(coins(a),50);assert.equal(a.status,'unavailable');
});

test('restore is sealed against pagehide and stale live-game autosave until reload',()=>{
 const s=memory(),a=open(s);wallet(a,100);a.flush();const backup=a.export();wallet(a,200);a.flush();a.beforeFlush=()=>wallet(a,200);a.import(backup);wallet(a,999);a.flush();assert.equal(coins(open(s)),100);
});
test('Web Lock adapter serializes simultaneous flushes and rejects the stale writer',async()=>{
 const s=memory();let queue=Promise.resolve();const withLock=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
 const a=new SaveStore(s,{withLock,schedule:()=>0,cancel:()=>{}}),b=new SaveStore(s,{withLock,schedule:()=>0,cancel:()=>{}});
 wallet(a,100);wallet(b,200);assert.deepEqual(await Promise.all([a.requestFlush(),b.requestFlush()]),[true,false]);assert.equal(coins(open(s)),100);assert.equal(b.status,'conflict');
});
test('browser timer functions are invoked with the global receiver',()=>{
 const a=new SaveStore(memory(),{schedule:function(){assert.equal(this,globalThis);return 1;},cancel:function(){assert.equal(this,globalThis);}});wallet(a,50);assert.ok(a.flush());
});
