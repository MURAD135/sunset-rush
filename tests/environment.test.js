import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCoastLife,createWater,addPalmWind,addBoats,addBirds} from '../src/environment.js';
import {disposeGroup} from '../src/resources.js';

test('water uniforms and custom shadow resources are disposed once on track replacement',()=>{
 const life=createCoastLife(),water=createWater(life),leaf=new THREE.MeshLambertMaterial();addPalmWind(leaf,life);
 const texture=water.uniforms.ripple.value,depth=leaf.userData.windDepth;let textures=0,depths=0;
 texture.addEventListener('dispose',()=>textures++);depth.addEventListener('dispose',()=>depths++);
 const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.PlaneGeometry(),water));
 for(let i=0;i<2;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(),leaf);mesh.customDepthMaterial=depth;group.add(mesh);}
 disposeGroup(group);assert.equal(textures,1);assert.equal(depths,1);assert.equal(group.children.length,0);
});
test('animated environmental instances share one time source and remain bounded',()=>{
 const group=new THREE.Group(),life=createCoastLife();const boats=addBoats(group,[{x:300,z:20},{x:350,z:100}],life),birds=addBirds(group,life),water=createWater(life);
 assert.equal(water.uniforms.time,life.time);assert.equal(boats.count,2);assert.equal(birds.count,14);
 const geometry=boats.geometry;for(let i=0;i<100;i++){life.time.value=i/60;life.motion.value=.25;}
 assert.equal(boats.geometry,geometry);assert.ok(geometry.boundingSphere.radius>50);assert.ok(birds.geometry.boundingSphere.radius>50);
 assert.ok([...geometry.attributes.position.array].every(Number.isFinite));disposeGroup(group);water.uniforms.ripple.value.dispose();water.dispose();
});
