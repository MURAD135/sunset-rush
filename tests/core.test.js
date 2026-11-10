import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadePhysics,FixedClock} from '../src/physics.js';
import {RaceProgress,rankRacers,TAU} from '../src/progress.js';
import {readGamepad} from '../src/input.js';

test('fixed-step simulation is identical at 30, 60, 120 and 144 Hz',()=>{
  const run=hz=>{let x=0,v=0;const clock=new FixedClock();for(let i=0;i<hz*10;i++)clock.advance(1/hz,dt=>{v+=26*dt;x+=v*dt;});return {x,v};};
  for(const hz of [30,120,144])assert.deepEqual(run(hz),run(60));
});
test('clock bounds long stalls instead of a runaway catch-up',()=>{const c=new FixedClock();let n=0;c.advance(10,()=>n++);assert.equal(n,12);});
test('three complete laps require ordered sectors and preserve lap times',()=>{
  const p=new RaceProgress();for(let a=-.075;a<TAU*3+.02;a+=.01)p.update(Math.atan2(Math.sin(a),Math.cos(a)),(a+.075)*3);
  assert.equal(p.completed,3);assert.equal(p.finished,true);assert.equal(p.lapTimes.length,3);assert.ok(p.lapTimes.every(t=>t>18));
  const finish=p.finishTime;p.update(.2,999);assert.equal(p.finishTime,finish);
});
test('line rocking, reverse driving, teleports and off-road cannot grant a lap',()=>{
  const p=new RaceProgress();for(let i=0;i<80;i++){p.update(.02,i);p.update(-.02,i+.5);}assert.equal(p.completed,0);
  const q=new RaceProgress();for(let a=-.075;a>-TAU*4;a-=.02)q.update(Math.atan2(Math.sin(a),Math.cos(a)),1);assert.equal(q.completed,0);
  const r=new RaceProgress();r.update(3,1);assert.equal(r.nextSector,0);r.update(3.05,2,false);assert.equal(r.distance,-.075);
  r.recover(0);r.update(.01,3);assert.equal(r.completed,0);
});
test('finish order is frozen even after an opponent drives farther',()=>{
  assert.deepEqual(rankRacers([{id:0,distance:20,finishTime:80},{id:1,distance:50,finishTime:82},{id:2,distance:90,finishTime:null}]).map(x=>x.id),[0,1,2]);
});
test('Cannon integrates free motion and resolves a stationary rival contact',()=>{
  const physics=new ArcadePhysics(1),p={x:0,z:0,th:0,mv:0,v:40};let contacts=0;
  for(let i=0;i<60;i++){p.v=40;contacts+=physics.move(p,[{x:0,z:12,heading:0,speed:0}]);}
  assert.ok(contacts>0);assert.ok(p.z<9,`car crossed obstacle: ${p.z}`);assert.ok(Number.isFinite(p.x));
  const free=new ArcadePhysics(0),q={x:0,z:0,th:0,mv:0,v:30};for(let i=0;i<60;i++)free.move(q,[]);assert.ok(Math.abs(q.z-30)<1e-6);
});
test('gamepad deadzone, proportional triggers and disconnected release',()=>{
  const buttons=Array.from({length:16},()=>({value:0,pressed:false}));buttons[7].value=.65;buttons[2].value=1;
  const p={connected:true,axes:[.1],buttons};assert.equal(readGamepad(p).r,0);assert.equal(readGamepad(p).g,.65);assert.equal(readGamepad(p).n,1);
  p.axes[0]=-1;assert.equal(readGamepad(p).l,1);p.connected=false;assert.equal(readGamepad(p).g,0);
});
