import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { instancedBoxes,installCarLOD,updateCarLOD } from '../src/graphics.js';

test('cluster bounds make r128 instances visible in the correct frustum',()=>{
  const group=new THREE.Group(),material=new THREE.MeshLambertMaterial();
  instancedBoxes(group,material,[{x:0,y:2,z:-20,w:4,h:4,d:4},{x:2000,y:2,z:-20,w:4,h:4,d:4}]);
  group.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(60,1,.1,1000);camera.updateMatrixWorld();
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  assert.equal(group.children.length,2);assert.equal(frustum.intersectsObject(group.children[0]),true);assert.equal(frustum.intersectsObject(group.children[1]),false);
  for(const mesh of group.children){assert.ok(mesh.frustumCulled);assert.ok(mesh.geometry.boundingSphere.radius>=Math.sqrt(12));}
});
test('car LOD preserves its detail hierarchy and uses hysteresis near the threshold',()=>{
  const car=new THREE.Group(),detail=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());car.add(detail);car.userData.bm={color:new THREE.Color(.3,.1,.1)};
  installCarLOD(car);const camera={position:new THREE.Vector3()};
  car.position.z=50;updateCarLOD(car,camera,40);assert.equal(car.userData.lod.detail.visible,false);assert.equal(car.userData.lod.low.visible,true);assert.equal(detail.parent,car.userData.lod.detail);
  car.position.z=38;updateCarLOD(car,camera,40);assert.equal(car.userData.lod.reduced,true);
  car.position.z=32;updateCarLOD(car,camera,40);assert.equal(car.userData.lod.reduced,false);assert.equal(car.position.z,32);
});
