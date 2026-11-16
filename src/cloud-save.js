import {decodeSave,encodeSave} from './save-system.js';
const deviceKeys=new Set(['sunset-q','sunset-graphics','sunset-camera-shake','sunset-lang','sunset-preferences','sunset-session']);
export const portableData=data=>Object.fromEntries(Object.entries(data).filter(([key])=>!deviceKeys.has(key)).sort(([a],[b])=>a.localeCompare(b)));
// No default backend, credentials, identity, network requests, or automatic conflict merge.
// A real adapter must bind BOTH operations to the authenticated server-side account.
export class CloudSave {
  constructor(transport=null){this.transport=transport;}
  get enabled(){return !!this.transport;}
  async inspect(localText){
    if(!this.enabled)return {status:'disabled'};
    const local=decodeSave(localText);
    try{
      const remote=await this.transport.read();
      if(!remote)return {status:'cloud-empty',expectedRevision:null};
      if(typeof remote.revision!=='string'||!remote.revision)throw Error('Invalid server revision');
      const decoded=decodeSave(remote.save);
      return {status:JSON.stringify(portableData(decoded.data))===JSON.stringify(portableData(local.data))?'equal':'conflict',expectedRevision:remote.revision,remoteSave:remote.save};
    }catch(error){return{status:'unavailable',reason:error.name||'Error'};}
  }
  // Call only after a user-selected local/cloud conflict choice. The server must
  // atomically enforce expectedRevision, including null = create only if absent.
  async push(localText,expectedRevision){
    if(!this.enabled)return {status:'disabled'};
    if(expectedRevision!==null&&typeof expectedRevision!=='string')throw Error('Expected server revision required');
    const local=decodeSave(localText),save=encodeSave(portableData(local.data),local.revision,local.updatedAt);
    try{
      const result=await this.transport.write({save,expectedRevision});
      if(result?.conflict)return {status:'conflict'};
      if(typeof result?.revision!=='string'||!result.revision)throw Error('Invalid server revision');
      return {status:'uploaded',revision:result.revision};
    }catch(error){return {status:'unavailable',reason:error.name||'Error'};}
  }
  // Produces a candidate only; SaveStore.restore validates/backs up before adoption.
  // Device graphics/control preferences remain local. Wallets are NEVER summed/maxed.
  restoreCandidate(localText,remoteText){
    const local=decodeSave(localText),remote=decodeSave(remoteText);
    const preferences=Object.fromEntries(Object.entries(local.data).filter(([key])=>deviceKeys.has(key)));
    return encodeSave({...portableData(remote.data),...preferences},local.revision,Date.now());
  }
}
