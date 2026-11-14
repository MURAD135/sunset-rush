import test from 'node:test';import assert from 'node:assert/strict';
import {steeringResponse,RivalPlanner} from '../src/driving.js';
test('classic steering stays exact; Sport countersteers and centers faster without overshoot',()=>{
 assert.equal(steeringResponse(.3,-.7,40,true,1/60),.3+(-.7-.3)*8/60);
 assert.ok(steeringResponse(.8,-1,40,true,1/60,true)<steeringResponse(.8,-1,40,true,1/60));
 for(const hz of [30,60,120,144]){let x=1;for(let i=0;i<hz;i++)x=steeringResponse(x,0,40,false,1/hz,true);assert.ok(Math.abs(x-Math.exp(-13))<1e-12);}
});
test('rival planner chooses free passing lane, yields when boxed, respects 10 Hz budget',()=>{
 const p=new RivalPlanner(1),self={id:1,distance:0,lane:0,preferred:0,speed:45};
 p.update(0,self,[self,{id:0,distance:15,lane:0,speed:20}],18,60);assert.ok(Math.abs(p.lane)>3);assert.equal(p.speedLimit,60);
 p.reset();const traffic=[-6.4,0,6.4].map((lane,i)=>({id:i+2,lane,distance:10,speed:20}));
 p.update(0,self,traffic,18,60);assert.ok(p.speedLimit<=20);assert.ok(Math.abs(p.lane)<=6.4);
 for(let t=1;t<60;t++)p.update(t,self,traffic,18,60);assert.equal(p.decisions,10);
});
test('planner lookahead braking and choices are deterministic without shared RNG',()=>{
 const a=new RivalPlanner(1),b=new RivalPlanner(1),self={id:1,distance:0,lane:3,preferred:3,speed:50};
 for(let t=0;t<600;t++){a.update(t,self,[],18,25);Math.random();b.update(t,self,[],18,25);}
 assert.deepEqual(a,b);assert.equal(a.speedLimit,25);
});

test('rivals see lapped traffic ahead and behind across the circuit seam without changing progress',()=>{
 const planner=new RivalPlanner(1),self={id:1,distance:990,lane:0,preferred:0,speed:45},traffic=[{id:0,distance:10,lane:0,speed:20}];
 const original=structuredClone({self,traffic});planner.update(0,self,traffic,18,60,1000);
 assert.ok(Math.abs(planner.lane)>3);assert.deepEqual({self,traffic},original);
 planner.reset();planner.update(0,self,[-6.4,0,6.4].map((lane,i)=>({id:i+2,lane,distance:0,speed:20})),18,60,1000);assert.ok(planner.speedLimit<=20);
 planner.reset();planner.update(0,{...self,distance:10},[{id:2,distance:995,lane:0,speed:70}],18,60,1000);assert.ok(Math.abs(planner.lane)>3);
});
