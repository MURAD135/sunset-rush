export const GUEST_KEY='sunset-local-guest';
// Optional local label/identifier only. Never an authentication token or cloud account.
export class GuestProfile {
  constructor(storage,{random=()=>globalThis.crypto.getRandomValues(new Uint8Array(16)),now=Date.now}={}){this.storage=storage;this.random=random;this.now=now;}
  load(){
    try{const p=JSON.parse(this.storage.getItem(GUEST_KEY));return p?.version===1&&/^guest-[a-f0-9]{32}$/.test(p.id)&&Number.isSafeInteger(p.createdAt)&&p.createdAt>=0?p:null;}catch{return null;}
  }
  create(){
    const existing=this.load();if(existing)return existing;
    const bytes=this.random();if(!(bytes instanceof Uint8Array)||bytes.length!==16)throw Error('Secure random source unavailable');
    const profile={version:1,id:'guest-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),createdAt:this.now()},raw=JSON.stringify(profile);
    this.storage.setItem(GUEST_KEY,raw);if(this.storage.getItem(GUEST_KEY)!==raw)throw Error('Guest profile could not be saved');return profile;
  }
}
