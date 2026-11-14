import test from 'node:test';import assert from 'node:assert/strict';import {FrameBudget} from '../src/frame-budget.js';
test('idle frame budget caps 60/120/144 Hz callbacks near 30 presentations without capping races',()=>{
 for(const hz of [60,120,144]){const gate=new FrameBudget();for(let i=0;i<hz;i++)gate.accept(i*1000/hz);assert.ok(gate.rendered>=29&&gate.rendered<=31);gate.reset();const before=gate.rendered;for(let i=0;i<hz;i++)gate.accept(i*1000/hz,{active:true});assert.equal(gate.rendered-before,hz);}
});
test('background has zero presentations and returning foreground discards idle deadlines',()=>{
 const gate=new FrameBudget();for(let i=0;i<120;i++)gate.accept(i*1000/120,{hidden:true});assert.equal(gate.rendered,0);assert.equal(gate.hidden,120);assert.equal(gate.accept(1000,{active:true}),true);gate.reset();assert.equal(gate.accept(1001),true);
});
