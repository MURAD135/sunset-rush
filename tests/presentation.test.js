import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadePhysics, FixedClock } from '../src/physics.js';
import { PoseHistory, ChaseCamera, angleDelta } from '../src/presentation.js';

const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('player and rival interpolate without changing authoritative endpoints',()=>{
  const poses=new PoseHistory(5);
  poses.current.forEach((p,i)=>Object.assign(p,{x:i*10,heading:Math.PI-.1,direction:Math.PI-.2}));
  poses.reset();poses.beginStep();
  poses.current.forEach(p=>{p.x+=2;p.heading=-Math.PI+.1;p.direction=-Math.PI+.2;p.wheel=4;});
  const saved=structuredClone([poses.previous,poses.current]);
  const shown=poses.sample(.25);
  shown.forEach((p,i)=>{close(p.x,i*10+.5);close(p.heading,Math.PI-.05);close(p.direction,Math.PI-.1);close(p.wheel,1);});
  for(const alpha of [0,.5,1,NaN,-2,2])poses.sample(alpha);
  assert.deepEqual([poses.previous,poses.current],saved);
  assert.equal(poses.sample(.7),shown);assert.equal(poses.sample(.8)[0],shown[0]);
});

test('fixed 60 Hz motion renders uniformly at 30/60/120/144 Hz with one-step latency',()=>{
  for(const hz of [30,60,120,144]){
    const poses=new PoseHistory(5),clock=new FixedClock();
    const simulate=dt=>{poses.beginStep();poses.current.forEach((p,i)=>p.x+=(30+i)*dt);};
    clock.advance(1/60,simulate); // Warm both endpoints; shown time starts at zero.
    for(let frame=1;frame<=hz*2;frame++){
      clock.advance(1/hz,simulate);
      poses.sample(clock.alpha).forEach((p,i)=>close(p.x,(30+i)*frame/hz));
      close(poses.current[0].x-poses.rendered[0].x,30*(1-clock.alpha)/60);
    }
    close(poses.current[0].x,60.5);
  }
});

test('reset discards old positions, orientations and wheel phases after recovery',()=>{
  const poses=new PoseHistory(1);poses.current[0].x=500;poses.current[0].wheel=900;poses.beginStep();
  Object.assign(poses.current[0],{x:0,heading:-1,wheel:0});poses.reset();
  for(const alpha of [0,.25,.99,1])assert.deepEqual(poses.sample(alpha)[0],poses.current[0]);
});

test('interpolating meshes cannot change Cannon contact response at any display cadence',()=>{
  const run=hz=>{
    const physics=new ArcadePhysics(1),clock=new FixedClock(),poses=new PoseHistory(2);
    const player={x:0,z:0,th:0,mv:0,v:40},rival={x:0,z:12,heading:0,speed:0};let contacts=0;
    poses.current[1].z=12;poses.reset();
    for(let i=0;i<hz*2;i++){
      clock.advance(1/hz,dt=>{
        poses.beginStep();player.v=40;contacts+=physics.move(player,[rival],dt);
        poses.current[0].x=player.x;poses.current[0].z=player.z;
      });
      poses.sample(clock.alpha);
    }
    return{...player,contacts};
  };
  const reference=run(60);assert.ok(reference.contacts>0);assert.ok(reference.z<9);
  for(const hz of [30,120,144])assert.deepEqual(run(hz),reference);
});

test('clock alpha stays valid on stalls, invalid times and pause/reset',()=>{
  const clock=new FixedClock();let steps=0;
  clock.advance(1/144,()=>steps++);close(clock.alpha,60/144);
  clock.advance(10,()=>steps++);assert.equal(steps,12);close(clock.droppedTime,9.8);
  assert.ok(clock.alpha>=0&&clock.alpha<1);
  for(const dt of [NaN,Infinity,-10])clock.advance(dt,()=>steps++);
  assert.equal(steps,12);clock.reset();assert.equal(clock.alpha,0);assert.equal(clock.droppedTime,0);
});

test('camera damping and FOV converge equally at 30/60/120/144 Hz',()=>{
  const run=hz=>{
    const camera=new ChaseCamera(),car=new PoseHistory(1).current[0];
    camera.update(car,0,0,0);
    Object.assign(car,{x:10,z:20,heading:1,direction:.7,speed:65,boost:1});
    for(let i=0;i<hz;i++)camera.update(car,1,1/hz,0);
    return camera.view;
  };
  const reference=run(60);
  for(const hz of [30,120,144])for(const key of Object.keys(reference))close(run(hz)[key],reference[key]);
});

test('camera mode switches ease without teleporting and heading wraps the short way',()=>{
  const camera=new ChaseCamera(),car=new PoseHistory(1).current[0];
  car.heading=car.direction=Math.PI-.01;camera.update(car,0,0,0);
  const before={...camera.view};car.heading=car.direction=-Math.PI+.01;
  camera.update(car,2,1/144,0);
  assert.ok(Math.abs(angleDelta(camera.heading-(Math.PI-.01)))<.01);
  assert.ok(Math.hypot(camera.view.x-before.x,camera.view.z-before.z)<1);
  const unchanged={...camera.view};camera.update(car,2,0,0);assert.deepEqual(camera.view,unchanged);
  camera.reset();car.x=100;camera.update(car,0,0,0);assert.ok(Math.abs(camera.view.x-100)<1);
});

test('shake is continuous, bounded, deterministic and fully disabled at zero',()=>{
  const car=new PoseHistory(1).current[0];car.boost=1;car.shake=100;
  const a=new ChaseCamera(),b=new ChaseCamera();let previousX=0;
  for(let i=0;i<3600;i++){
    const full={...a.update(car,0,1/120,1)};
    assert.deepEqual(b.update(car,0,1/120,1),full);
    assert.ok(Math.abs(full.shakeX)<=.16&&Math.abs(full.shakeY)<=.096);
    assert.ok(Math.abs(full.shakeX-previousX)<.04);previousX=full.shakeX;
    const none=new ChaseCamera().update(car,0,1/120,0);
    assert.equal(Math.abs(none.shakeX)+Math.abs(none.shakeY),0);
  }
  const reduced=new ChaseCamera().update(car,0,1/120,.35);
  const full=new ChaseCamera().update(car,0,1/120,1);
  close(reduced.shakeX,full.shakeX*.35);
});
