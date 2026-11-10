import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameMetrics,DynamicResolution,QUALITY,QUALITY_MENU } from '../src/performance.js';

test('frame metrics use bounded storage, retain chronological samples and honest memory availability',()=>{
  const metrics=new FrameMetrics(5);for(let i=1;i<=8;i++)metrics.add(i*10);
  assert.deepEqual(metrics.frames(),[40,50,60,70,80]);const r=metrics.snapshot();
  assert.equal(r.meanMs,60);assert.equal(r.p95Ms,80);assert.equal(r.p99Ms,80);assert.equal(r.fps,1000/60);
  assert.equal(r.gpuMemoryBytes,null);assert.equal(r.heapAvailableBytes,null);
  assert.equal(metrics.snapshot(null,{usedJSHeapSize:100,jsHeapSizeLimit:150}).heapAvailableBytes,50);
  metrics.add(NaN);assert.equal(metrics.count,5);metrics.reset();assert.equal(metrics.snapshot().fps,0);
});
test('dynamic resolution reduces sustained load gradually and respects its floor',()=>{
  const controller=new DynamicResolution(60);let last=1;
  for(let i=0;i<1200;i++){const next=controller.update(35,1/60);assert.ok(Math.abs(next-last)<.004);assert.ok(next>=.6&&next<=1);last=next;}
  assert.ok(last<.61);
  for(let i=0;i<3600;i++)controller.update(8,1/60);
  assert.ok(controller.scale>.99);
});
test('hysteresis rejects alternating borderline frames and ignores a suspended tab',()=>{
  const controller=new DynamicResolution(60);
  for(let i=0;i<2400;i++)controller.update(i%2?20:14,1/60);
  assert.equal(controller.scale,1);controller.update(12000,12);assert.equal(controller.scale,1);
  controller.targetFps=30;controller.reset();for(let i=0;i<600;i++)controller.update(29,1/30);assert.equal(controller.scale,1);
});
test('quality presets retain saved IDs and offer all five menu choices',()=>{
  assert.deepEqual(QUALITY.map(q=>q.name),['High','Medium','Low','Ultra']);
  assert.deepEqual(QUALITY_MENU,[null,2,1,0,3]);assert.equal(QUALITY[2].shadow,0);assert.ok(QUALITY[3].shadow>QUALITY[0].shadow);
});
