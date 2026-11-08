export const TAU = Math.PI * 2;
export const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));

// Signed, ordered sector crossings. Reverse travel cannot earn laps, nor can
// bouncing over the line, cutting across the infield or recovering the car.
export class RaceProgress {
  constructor(start = -.075, laps=3, sectors=12){
    this.previous=wrapAngle(start);this.distance=start;this.nextSector=0;
    this.sectors=sectors;this.laps=laps;this.completed=0;this.finished=false;this.finishTime=null;
    this.lapStart=0;this.lapTimes=[];
  }
  update(angle,time,onTrack=true){
    const delta=wrapAngle(angle-this.previous);this.previous=angle;
    if(this.finished||!onTrack||Math.abs(delta)>.18)return false;
    this.distance+=delta;
    const sector=Math.floor((this.distance+1e-8)/(TAU/this.sectors));
    if(delta<=0||sector<this.nextSector)return false;
    if(sector!==this.nextSector)return false;
    this.nextSector++;
    if(sector>0&&sector%this.sectors===0){
      this.completed=sector/this.sectors;this.lapTimes.push(time-this.lapStart);this.lapStart=time;
      if(this.completed>=this.laps){this.finished=true;this.finishTime=time;}
      return true;
    }
    return false;
  }
  recover(angle){this.previous=wrapAngle(angle);}
}

export function rankRacers(racers){
  return [...racers].sort((a,b)=>{
    if(a.finishTime!=null&&b.finishTime!=null)return a.finishTime-b.finishTime||a.id-b.id;
    if(a.finishTime!=null)return -1;if(b.finishTime!=null)return 1;
    return b.distance-a.distance||a.id-b.id;
  });
}
