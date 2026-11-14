import { normalizeSession, normalizeResults } from './profile-data.js';
// One coherent profile per atomic localStorage write, plus its previous generation.
// Checksums detect accidental damage; they are NOT anti-cheat or authentication.
export const SAVE_VERSION=2;
export const SAVE_KEYS=['sunset-profile-a','sunset-profile-b'];
export const MAX_SAVE_CHARS=2_000_000;
export const defaultStats=()=>({t:0,r:0,w:0,hs:0,ds:0,ns:0,tc:0,mx:0,f:{},a:[],o:[],bt:{},ts:0,xp:0,lv:1,dm:null,cu:[]});
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const num=(v,lo=0,hi=1e12)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;
const ids=(v,lo,hi)=>Array.isArray(v)?[...new Set(v.filter(n=>Number.isInteger(n)&&n>=lo&&n<=hi))]:[];
export const knownKey=k=>/^sunset-(up|st|day|streak|q|graphics|camera-shake|lang|preferences|session|results)$/.test(k)||/^sunset-g(?:[0-9]|10)(?:-sport)?$/.test(k)||/^sunset-best-(?:[0-9]|10)-(?:2|3|5)(?:-sport)?$/.test(k);
export function normalizeValue(key,raw){
  if(!knownKey(key))throw Error('Unknown save field');
  if(key==='sunset-day'){if(typeof raw!=='string'||raw.length>64||!Number.isFinite(Date.parse(raw)))throw Error('Invalid daily date');return raw;}
  const v=JSON.parse(raw);let out;
  if(key==='sunset-session'){out=normalizeSession(v);
  }else if(key==='sunset-results'){out=normalizeResults(v);
  }else if(key==='sunset-up'){
    if(!object(v)||!Array.isArray(v.u)||typeof v.c!=='number')throw Error('Invalid wallet');
    out={u:Array.from({length:5},(_,i)=>Math.floor(num(v.u[i],0,3))),c:Math.floor(num(v.c))};
  }else if(key==='sunset-st'){
    if(!object(v))throw Error('Invalid statistics');out=defaultStats();
    for(const k of ['t','r','w','hs','ds','ns','tc','mx','ts','xp'])out[k]=num(v[k]);out.lv=Math.max(1,Math.floor(num(v.lv,1,1e6)));
    out.a=ids(v.a,0,11);out.o=ids(v.o,0,2);out.cu=ids(v.cu,6,7);
    for(const k of ['cl','tn','rn','md','dy'])if(v.f?.[k])out.f[k]=1;
    if(object(v.bt))for(const [k,t] of Object.entries(v.bt))if(/^(?:[0-9]|10)(?::sport)?$/.test(k)&&Number.isFinite(t)&&t>0)out.bt[k]=num(t,0,86400);
    const d=v.dm;if(object(d)&&typeof d.d==='string'&&d.d.length<65&&Number.isFinite(Date.parse(d.d))&&Array.isArray(d.ids)&&d.ids.length===3&&ids(d.ids,0,5).length===3&&Array.isArray(d.b)&&d.b.length===6&&Array.isArray(d.cl)&&d.cl.length===3)out.dm={d:d.d,b:d.b.map(n=>num(n)),ids:d.ids,cl:d.cl.map(n=>n===1?1:0)};
  }else if(key==='sunset-q'){
    if(!Array.isArray(v)||!Number.isInteger(v[0])||v[0]<0||v[0]>4)throw Error('Invalid quality');out=[v[0],...v.slice(1,4).map(n=>n?1:0)];while(out.length<4)out.push(0);
  }else if(key==='sunset-graphics'){
    if(!object(v))throw Error('Invalid graphics');out={reduced:!!v.reduced,dynamic:v.dynamic!==false,target:[30,60,120].includes(v.target)?v.target:60};
  }else if(key==='sunset-preferences'){
    if(!object(v))throw Error('Invalid preferences');out={sport:!!v.sport,muted:!!v.muted,auto:!!v.auto,vibrate:v.vibrate!==false,sensitivity:[.8,1,1.25].includes(v.sensitivity)?v.sensitivity:1};
  }else if(key==='sunset-camera-shake'){if(![0,.35,1].includes(v))throw Error('Invalid shake');out=v;
  }else if(key==='sunset-lang'){if(![0,1,2,3].includes(v))throw Error('Invalid language');out=v;
  }else if(key==='sunset-streak'){out=Math.floor(num(v,0,1e6));
  }else if(key.startsWith('sunset-best-')){if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>86400)throw Error('Invalid best');out=v;
  }else{
    if(!Array.isArray(v)||v.length>4000||v.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>!Number.isFinite(n)||Math.abs(n)>1e9)))throw Error('Invalid ghost');out=v;
  }
  return JSON.stringify(out);
}
export function checksum(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16);}
export function encodeSave(data,revision=0,now=Date.now()){
  const body={format:'sunset-rush',version:SAVE_VERSION,revision,updatedAt:now,data};
  const text=JSON.stringify({...body,checksum:checksum(JSON.stringify(body))});if(text.length>MAX_SAVE_CHARS)throw Error('Save too large');return text;
}
export function decodeSave(text){
  if(typeof text!=='string'||text.length>MAX_SAVE_CHARS)throw Error('Invalid save size');
  const e=JSON.parse(text);if(e.format!=='sunset-rush'||![1,SAVE_VERSION].includes(e.version))throw Error('Unsupported save version');
  if(!Number.isSafeInteger(e.revision)||e.revision<0||!Number.isFinite(e.updatedAt)||!object(e.data))throw Error('Invalid save header');
  const body={format:e.format,version:e.version,revision:e.revision,updatedAt:e.updatedAt,data:e.data};
  if(checksum(JSON.stringify(body))!==e.checksum)throw Error('Save checksum mismatch');
  for(const [key,value] of Object.entries(e.data))if(typeof value!=='string'||normalizeValue(key,value)!==value)throw Error('Invalid save data');
  return e;
}
export class SaveStore {
  constructor(storage,{schedule=setTimeout,cancel=clearTimeout,now=Date.now,onStatus=()=>{},withLock=null}={}){
    Object.assign(this,{storage,schedule,cancel,now,onStatus,withLock});this.data={};this.tokens=[null,null];this.slot=-1;this.revision=0;this.dirty=false;this.timer=null;this.blocked=false;this.issues=[];this.status='pending';
    try{
      this.tokens=SAVE_KEYS.map(k=>storage.getItem(k));const valid=[];
      this.tokens.forEach((raw,index)=>{if(raw===null)return;try{const version=JSON.parse(raw)?.version;if(version>SAVE_VERSION){this.blocked=true;this.issues.push('future-version');return;}valid.push({index,save:decodeSave(raw)});}catch{this.issues.push('damaged-slot');}});
      if(valid.length){valid.sort((a,b)=>b.save.revision-a.save.revision);const best=valid[0];this.slot=best.index;this.revision=best.save.revision;this.data=best.save.data;this.dirty=best.save.version<SAVE_VERSION;this.status=this.issues.length?'recovered':this.dirty?'pending':'saved';}
      else if(this.tokens.some(v=>v!==null)){this.blocked=true;this.status='blocked';}
      else{this.migrate();this.dirty=true;this.status='pending';}
      if(this.blocked)this.status='blocked';
    }catch{this.status='unavailable';this.issues.push('storage-unavailable');}
  }
  migrate(){
    for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(!knownKey(key))continue;try{this.data[key]=normalizeValue(key,this.storage.getItem(key));}catch{this.issues.push('invalid-legacy:'+key);}}
    // Original keys stay intact as a migration backup; never delete or re-read after migration.
  }
  emit(status){this.status=status;this.onStatus({status,revision:this.revision,dirty:this.dirty,issues:[...this.issues]});}
  getItem(key){return this.data[key]??null;}
  setItem(key,value){
    if(this.restored)return;
    const normalized=normalizeValue(key,String(value));if(this.data[key]===normalized)return;
    this.data[key]=normalized;this.dirty=true;if(!this.blocked){this.emit('pending');if(this.timer===null)this.timer=this.schedule.call(globalThis,()=>{this.timer=null;this.requestFlush();},500);}
  }
  async requestFlush(){
    try{return await (this.withLock?this.withLock(()=>this.flush()):this.flush());}
    catch{
      // A denied/failed lock is not permission to write without serialization.
      // Keep the in-memory draft and retry on the next autosave/player action.
      if(!this.blocked)this.emit('unavailable');
      return false;
    }
  }
  restore(text){return this.withLock?this.withLock(()=>this.import(text)):Promise.resolve().then(()=>this.import(text));}
  flush(){
    if(this.restored)return true;
    this.beforeFlush?.();if(this.timer!==null){this.cancel.call(globalThis,this.timer);this.timer=null;}
    if(this.blocked)return false;if(!this.dirty)return true;
    try{
      const current=SAVE_KEYS.map(k=>this.storage.getItem(k));
      if(current.some((raw,i)=>raw!==this.tokens[i])){this.blocked=true;this.emit('conflict');return false;}
      const target=this.slot===0?1:0,text=encodeSave(this.data,this.revision+1,this.now());
      this.storage.setItem(SAVE_KEYS[target],text);
      if(this.storage.getItem(SAVE_KEYS[target])!==text)throw Error('Readback failed');
      this.tokens[target]=text;this.slot=target;this.revision++;this.dirty=false;this.emit('saved');return true;
    }catch{this.emit('unavailable');return false;}
  }
  observe(key){
    if(SAVE_KEYS.includes(key)||key===null){try{if(SAVE_KEYS.some((k,i)=>this.storage.getItem(k)!==this.tokens[i])){this.blocked=true;this.emit('conflict');}}catch{this.emit('unavailable');}}
  }
  export(){this.beforeFlush?.();return encodeSave(this.data,this.revision,this.now());}
  import(text){
    const incoming=decodeSave(text);if(this.blocked)throw Error('Reload or recover storage before restoring');
    // Preserve current in-memory progress as the rollback generation before replacement.
    if(!this.flush())throw Error('Cannot back up current progress');
    const previous=this.data;this.data=incoming.data;this.dirty=true;
    const prepare=this.beforeFlush;this.beforeFlush=null;
    const saved=this.flush();this.beforeFlush=prepare;
    if(!saved){this.data=previous;this.dirty=true;throw Error('Restore failed; original progress retained');}
    // Reload/pagehide must not write the old live game state over the imported save.
    this.restored=true;this.beforeFlush=null;
    return true;
  }
  backup(){const raw=this.tokens[this.slot===0?1:0];return raw&&decodeSave(raw)?raw:null;}
  dispose(){if(this.timer!==null)this.cancel.call(globalThis,this.timer);this.timer=null;}
}
