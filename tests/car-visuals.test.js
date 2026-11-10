import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSportBody,createCabinGeometry,animateChassis} from '../src/car-visuals.js';

test('sport body and glass remain finite and within existing vehicle dimensions',()=>{
  for(const width of [1.9,2,2.2])for(const height of [.4,.55,.7]){
    const body=createSportBody(width,height),glass=createCabinGeometry(width-.32,.35+height,.47,1.9,-.3);
    for(const geometry of [body,glass]){
      geometry.computeBoundingBox();const b=geometry.boundingBox;
      assert.ok(b.min.y>=.29&&b.max.y<1.6);assert.ok(b.min.z>=-2.31&&b.max.z<=2.31);
      assert.ok(b.max.x<=width*.511&&b.min.x>=-width*.511);
      for(const v of geometry.attributes.normal.array)assert.ok(Number.isFinite(v));
      geometry.dispose();
    }
    assert.ok(body.index.count/3<150,'body curvature must retain a small triangle budget');
  }
});

test('visual suspension is bounded, cadence independent and cannot mutate the driving pose',()=>{
  const car=new THREE.Group();car.userData.body=new THREE.Group();car.userData.wh=Array.from({length:4},()=>new THREE.Group());
  const pose=Object.freeze({speed:65,wheel:48,pitch:-.08,roll:.15});
  animateChassis(car,pose);const first=car.userData.body.position.y,roll=car.userData.body.rotation.z;
  for(let i=0;i<144;i++)animateChassis(car,pose);
  assert.equal(car.userData.body.position.y,first);assert.equal(car.userData.body.rotation.z,roll);
  assert.ok(Math.abs(first)<=.012);
  for(const wheel of car.userData.wh)assert.ok(Math.abs(wheel.position.y-.44)<=.065);
  animateChassis(car,pose,true);assert.ok(Math.abs(car.userData.body.rotation.z)<Math.abs(roll));
  assert.deepEqual(car.position.toArray(),[0,0,0]);assert.deepEqual(car.rotation.toArray().slice(0,3),[0,0,0]);
});
