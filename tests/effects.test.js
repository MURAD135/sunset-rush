import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RaceParticles} from '../src/effects.js';

test('smoke expands and fades, while a reduced pool recycles existing resources',()=>{
 const texture=new THREE.Texture(),pool=new RaceParticles(texture,12),geometry=pool.mesh.geometry,material=pool.mesh.material,positions=pool.position;
 pool.emit(0,.2,0,0,.6,0,.7,.3,.3,.32,0);pool.step(.1);const initialSize=pool.size[0];
 pool.step(.3);assert.ok(pool.size[0]>initialSize);assert.ok(pool.opacity[0]>0&&pool.opacity[0]<=.45);
 pool.step(.4);assert.equal(pool.opacity[0],0);pool.setBudget(4);
 for(let i=0;i<1000;i++){pool.emit(0,.2,0,1,.6,1,.7,.3,.3,.32,0);pool.step(1/60);}
 assert.equal(pool.life.filter(x=>x>0).length,4);assert.equal(pool.mesh.geometry.drawRange.count,4);
 assert.equal(pool.mesh.geometry,geometry);assert.equal(pool.mesh.material,material);assert.equal(pool.position,positions);assert.equal(material.uniforms.sprite.value,texture);
 for(const value of pool.position)assert.ok(Number.isFinite(value));
 pool.clear();assert.ok(pool.opacity.every(x=>x===0));assert.ok(pool.life.every(x=>x===0));
});
test('nitro and collision sparks retain distinct lifetimes and bounded projected sizes',()=>{
 const pool=new RaceParticles(null,8);pool.emit(0,.5,0,0,0,-10,.25,.3,.55,1,0);pool.emit(0,.6,0,3,6,3,.45,1,.7,.25,14);
 pool.step(.1);assert.ok(pool.color[3]>pool.color[0]);assert.ok(pool.size[1]<pool.size[0]);assert.ok(pool.opacity[0]>0&&pool.opacity[1]>0);
 pool.step(.2);assert.equal(pool.opacity[0],0);assert.ok(pool.opacity[1]>0);
 pool.setProjection(600,60);assert.ok(Number.isFinite(pool.mesh.material.uniforms.projectionScale.value));
});
