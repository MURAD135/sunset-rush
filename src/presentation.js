// Presentation owns copies only. Nothing in this module feeds the race or Cannon.
const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const angleDelta = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const damping = (rate, dt) => -Math.expm1(-rate * Math.max(0, dt));
const fields = ['x', 'y', 'z', 'speed', 'steer', 'roll', 'pitch', 'wheel', 'boost', 'shake'];
const pose = () => ({x:0, y:0, z:0, heading:0, direction:0, speed:0, steer:0, roll:0, pitch:0, wheel:0, boost:0, shake:0});

export class PoseHistory {
  constructor(count) {
    this.previous = Array.from({length:count}, pose);
    this.current = Array.from({length:count}, pose);
    this.rendered = Array.from({length:count}, pose);
  }
  beginStep() {
    for (let i=0; i<this.current.length; i++) Object.assign(this.previous[i], this.current[i]);
  }
  // Teleports, restarts and clock resets must never interpolate from an old pose.
  reset() {
    this.beginStep();
    this.sample(1);
  }
  sample(fraction) {
    const alpha = clamp01(fraction);
    for (let i=0; i<this.current.length; i++) {
      const a=this.previous[i], b=this.current[i], out=this.rendered[i];
      for (const key of fields) out[key]=a[key]+(b[key]-a[key])*alpha;
      out.heading=a.heading+angleDelta(b.heading-a.heading)*alpha;
      out.direction=a.direction+angleDelta(b.direction-a.direction)*alpha;
    }
    return this.rendered;
  }
}

export class ChaseCamera {
  constructor() {
    this.ready=false;
    this.time=0;
    this.view={x:0, y:0, z:0, lookX:0, lookY:0, lookZ:0, fov:54, shakeX:0, shakeY:0};
  }
  reset() { this.ready=false; this.time=0; }
  update(car, mode, elapsed, shakeStrength=.35) {
    // Bound recovery after a suspended tab. Normal display cadences use real dt.
    const dt=Math.max(0, Math.min(.2, Number.isFinite(elapsed) ? elapsed : 0));
    this.time+=dt;
    const heading=car.heading+angleDelta(car.direction-car.heading)*(mode===2 ? 0 : .22);
    const distance=mode===2 ? -1.2 : mode===1 ? 6.5 : 10.5+car.speed*.025;
    const height=mode===2 ? 1.25 : mode===1 ? 2.6 : 3.8+car.speed*.012;
    const fov=54+car.speed*.16+car.boost*7;
    if (!this.ready) {
      this.heading=heading; this.distance=distance; this.height=height; this.fov=fov;
      this.ready=true;
    } else {
      this.heading+=angleDelta(heading-this.heading)*damping(mode===2 ? 30 : 9,dt);
      this.distance+=(distance-this.distance)*damping(8,dt);
      this.height+=(height-this.height)*damping(8,dt);
      this.fov+=(fov-this.fov)*damping(5,dt);
    }
    const out=this.view, fx=Math.sin(this.heading), fz=Math.cos(this.heading);
    // A smooth bounded signal, applied after following; never accumulates drift.
    const amplitude=Math.min(.16, Math.max(0,car.boost*.045+car.shake*.3))*clamp01(shakeStrength);
    out.shakeX=amplitude*(.65*Math.sin(this.time*17)+.35*Math.sin(this.time*29));
    out.shakeY=amplitude*.6*Math.sin(this.time*23);
    // Follow the interpolated anchor directly so high speed cannot leave the car
    // behind the camera. Damped orbit, distance, height and FOV soften turns.
    out.x=car.x-fx*this.distance+out.shakeX;
    out.y=car.y+this.height+out.shakeY;
    out.z=car.z-fz*this.distance;
    out.lookX=car.x+fx*7; out.lookY=car.y+1.2; out.lookZ=car.z+fz*7;
    out.fov=this.fov;
    return out;
  }
}
