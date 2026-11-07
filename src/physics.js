import { World, Body, Box, Vec3, Material, ContactMaterial, SAPBroadphase } from 'cannon-es';

export const FIXED_STEP = 1 / 60;
// Arcade steering remains intentionally assisted. Cannon resolves actual planar
// vehicle contacts; track edges are the existing analytical polar boundaries.
export class ArcadePhysics {
  constructor(rivalCount = 4) {
    this.world = new World({ gravity: new Vec3(0,0,0) });
    this.world.broadphase = new SAPBroadphase(this.world);
    this.world.solver.iterations = 8;
    const rubber = new Material('vehicle');
    this.world.addContactMaterial(new ContactMaterial(rubber,rubber,{friction:.03,restitution:.08}));
    const make = (kinematic) => {
      const body = new Body({mass:kinematic?0:1200,type:kinematic?Body.KINEMATIC:Body.DYNAMIC,material:rubber,linearDamping:0,angularDamping:1});
      body.addShape(new Box(new Vec3(1.08,.55,2.2)));
      body.linearFactor.set(1,0,1);body.angularFactor.set(0,0,0);body.fixedRotation=true;body.updateMassProperties();
      this.world.addBody(body);return body;
    };
    this.player=make(false);this.rivals=Array.from({length:rivalCount},()=>make(true));
    this.contacts=0;
  }
  move(player, rivals, dt = FIXED_STEP) {
    this.player.position.set(player.x,.65,player.z);
    this.player.quaternion.setFromAxisAngle(Vec3.UNIT_Y,player.th);
    this.player.velocity.set(Math.sin(player.mv)*player.v,0,Math.cos(player.mv)*player.v);
    this.player.aabbNeedsUpdate=true;
    this.rivals.forEach((body,i)=>{
      const a=rivals[i];body.position.set(a.x,.65,a.z);body.quaternion.setFromAxisAngle(Vec3.UNIT_Y,a.heading);
      body.velocity.set(Math.sin(a.heading)*a.speed,0,Math.cos(a.heading)*a.speed);body.aabbNeedsUpdate=true;
    });
    this.world.step(dt);
    this.contacts=this.world.contacts.filter(c=>c.bi===this.player||c.bj===this.player).length;
    player.x=this.player.position.x;player.z=this.player.position.z;
    if(this.contacts)player.v=Math.min(player.v,Math.hypot(this.player.velocity.x,this.player.velocity.z));
    return this.contacts;
  }
}

export class FixedClock {
  constructor(step=FIXED_STEP,maxSteps=12){this.step=step;this.maxSteps=maxSteps;this.accumulator=0;}
  advance(elapsed,update){
    this.accumulator+=Math.min(Math.max(0,elapsed),this.step*this.maxSteps);
    let steps=0;
    while(this.accumulator+1e-10>=this.step&&steps<this.maxSteps){update(this.step);this.accumulator-=this.step;steps++;}
    return steps;
  }
  reset(){this.accumulator=0;}
}
