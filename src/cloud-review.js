import {CloudSave} from './cloud-save.js';
import {decodeSave,profileFingerprint} from './save-system.js';
// Future authenticated integration boundary. No provider is created, logged in,
// or contacted by the game. Transport must be bound to server-verified identity.
export class CloudReview {
  constructor(store){this.store=store;this.generation=0;this.sequence=0;this.session=null;this.ticket=null;}
  setSession(session){
    if(session&&(session.authenticated!==true||typeof session.subject!=='string'||!session.subject||!['guest','account'].includes(session.kind)||typeof session.transport?.read!=='function'||typeof session.transport?.write!=='function'))throw Error('Authenticated, account-bound transport required');
    this.session=session;this.generation++;this.sequence++;this.ticket=null;
  }
  valid(ticket){return !!this.session&&ticket.generation===this.generation&&ticket.sequence===this.sequence;}
  async review(){
    if(!this.session)return{status:'disabled'};
    const generation=this.generation,sequence=++this.sequence;this.ticket=null;
    const local=this.store.export(),data=decodeSave(local).data,cloud=new CloudSave(this.session.transport),result=await cloud.inspect(local);
    const ticket={generation,sequence,data,cloud,expectedRevision:result.expectedRevision,remoteSave:result.remoteSave};
    if(!this.valid(ticket))return{status:'stale-session'};
    if(!['conflict','cloud-empty'].includes(result.status))return{status:result.status};
    this.ticket=ticket;return{status:result.status,choiceRequired:true,localRevision:this.store.revision,remoteRevision:result.expectedRevision};
  }
  async resolve(choice){
    if(!['local','cloud'].includes(choice))throw Error('Explicit local/cloud choice required');
    const ticket=this.ticket;if(!ticket||!this.valid(ticket))return{status:'review-required'};
    this.ticket=null;const local=this.store.export();
    if(profileFingerprint(decodeSave(local).data)!==profileFingerprint(ticket.data))return{status:'local-changed'};
    if(choice==='local'){
      const result=await ticket.cloud.push(local,ticket.expectedRevision);
      return this.valid(ticket)?result:{status:'stale-session'};
    }
    if(!ticket.remoteSave)return{status:'cloud-empty'};
    const latest=await ticket.cloud.inspect(local);
    if(!this.valid(ticket))return{status:'stale-session'};
    if(latest.status==='unavailable')return latest;
    if(latest.expectedRevision!==ticket.expectedRevision||latest.remoteSave!==ticket.remoteSave)return{status:'remote-changed'};
    try{
      await this.store.restore(ticket.cloud.restoreCandidate(local,latest.remoteSave),{expectedData:ticket.data,guard:()=>this.valid(ticket)});
      return{status:'restored',reloadRequired:true};
    }catch(error){return{status:!this.valid(ticket)?'stale-session':error.code==='STALE_PROFILE'?'local-changed':'unavailable'};}
  }
}
