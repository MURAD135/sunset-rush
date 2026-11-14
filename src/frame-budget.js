// Active racing keeps native display cadence. Menus/results/pause render at most
// 30 Hz; background callbacks do no rendering. This is a budget, not an FPS claim.
export class FrameBudget {
  constructor(){this.next=0;this.rendered=0;this.skipped=0;this.hidden=0;}
  reset(){this.next=0;}
  accept(now,{active=false,hidden=false}={}){
    if(hidden){this.hidden++;this.next=0;return false;}
    if(active){this.next=now;this.rendered++;return true;}
    if(now+.01<this.next){this.skipped++;return false;}
    const interval=1000/30;this.next=now>this.next+interval?now+interval:this.next+interval;this.rendered++;return true;
  }
  snapshot(){return{rendered:this.rendered,skipped:this.skipped,hidden:this.hidden};}
}
