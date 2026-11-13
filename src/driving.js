const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
// Sport adds faster centering/countersteer. Classic remains the exact legacy response.
export function steeringResponse(current,target,speed,drift,dt,sport=false){
  if(!sport)return current+(target-current)*Math.min(1,dt*8);
  const rate=target*current<0?16:Math.abs(target)<.05?13:drift?11:10;
  return current+(target-current)*(1-Math.exp(-rate*dt));
}
// Decisions run at 10 Hz, independent of rendering/random cosmetic effects.
export class RivalPlanner {
  constructor(id){this.id=id;this.reset();}
  reset(){this.nextTick=0;this.lane=0;this.speedLimit=Infinity;this.decisions=0;}
  update(tick,self,traffic,width,curvatureSpeed){
    if(tick<this.nextTick)return;
    this.nextTick=tick+6;this.decisions++;
    const edge=width/2-2.6,preferred=clamp(self.preferred,-edge,edge);
    const lanes=[clamp(self.lane,-edge,edge),preferred,-edge,0,edge];
    let best=-Infinity,chosen=lanes[0],limit=curvatureSpeed;
    for(const lane of lanes){
      let score=-Math.abs(lane-preferred)*.08-Math.abs(lane-self.lane)*.16,cap=curvatureSpeed;
      for(const other of traffic){
        if(other.id===self.id)continue;
        const gap=other.distance-self.distance;
        if(Math.abs(other.lane-lane)>3.1)continue;
        // Leave room for a car approaching from behind; avoid cutting across side-by-side cars.
        if(gap>-9&&gap<7)score-=100;
        if(gap>0&&gap<38){const closing=Math.max(0,self.speed-other.speed),ttc=gap/Math.max(1,closing);score-=Math.max(0,38-gap)*(ttc<2?3:1);cap=Math.min(cap,Math.max(10,other.speed+(gap-10)*.8));}
        if(gap<0&&gap>-28&&other.speed>self.speed+2)score-=30;
      }
      if(score>best){best=score;chosen=lane;limit=cap;}
    }
    this.lane=chosen;this.speedLimit=limit;
  }
}
