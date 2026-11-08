import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base=process.env.GAME_URL||'http://localhost:5173';
const baseline=process.env.BASELINE_URL;
const out='artifacts/phase1';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],checks=[],races=[],cadence=[];
// Read-only instrumentation of the baseline response; the baseline worktree stays unchanged.
const baselineHooks=`\nif(import.meta.env.DEV && window.__sunset){Object.assign(window.__sunset,{
  advance:(elapsed,driver)=>simulationClock.advance(elapsed,dt=>{Object.assign(K,{l:0,r:0,g:0,b:0,h:0,n:0},driver?.()||{});race(dt);}),
  presentation:()=>({shown:[car,...ai.map(a=>a.m)].map(m=>({x:m.position.x,y:m.position.y,z:m.position.z,heading:m.rotation.y}))}),
  view:()=>({position:cam.position.toArray(),quaternion:cam.quaternion.toArray(),fov:cam.fov})
});}`;
const open=async(url,old=false,options={})=>{
  const page=await browser.newPage({viewport:{width:960,height:600},...options});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let seed=135;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
  await page.route('**/src/game.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    // Static water phase for comparable captures, without changing the game files.
    source=source.replace('rc.userData.water.uniforms.time.value=n/1000','rc.userData.water.uniforms.time.value=0');
    if(old)source+=baselineHooks.replace('import.meta.env.DEV','true');
    await route.fulfill({response,body:source});
  });
  await page.goto(url+'/?test=1');await page.waitForFunction(()=>window.__sunset);
  await page.evaluate(()=>{__sunset.quality(1);__sunset.start();});
  return page;
};
// Driver inputs are based exclusively on the real simulation, evaluated at 60 Hz.
const run=async(page,hz,old=false)=>page.evaluate(({hz,old})=>{
  const game=__sunset;
  const driver=()=>{
    const p=game.state();if(p.state!=='go')return{};
    const aim=game.aim(.13),desired=Math.atan2(aim[0]-p.x,aim[1]-p.z);
    const steer=Math.max(-1,Math.min(1,Math.atan2(Math.sin(desired-p.heading),Math.cos(desired-p.heading))*4.5));
    const target=Math.abs(steer)>.8?40:Math.abs(steer)>.5?47:57;
    return{g:p.speed<target?1:0,l:Math.max(0,steer),r:Math.max(0,-steer),n:Math.abs(steer)<.24&&p.speed>35?1:0};
  };
  // Equal simulated wall duration, including finish coasting, on every cadence.
  for(let frame=0;frame<hz*90;frame++)game.advance(1/hz,driver);
  const p=game.state();
  return{hz,old,state:p.state,time:p.time,finish:p.finish,laps:p.laps,rank:p.rank,x:p.x,z:p.z,speed:p.speed,nitro:p.nitro,heading:p.heading,direction:p.direction,cum:p.cum,results:p.results};
},{hz,old});
try{
  let reference;
  if(baseline){
    const page=await open(baseline,true);
    reference=await run(page,60,true);assert.equal(reference.state,'done');
    console.log('Baseline race:',reference.finish);await page.close();
  }
  for(const hz of [30,60,120,144]){
    const page=await open(base);const result=await run(page,hz);
    assert.equal(result.state,'done');assert.equal(result.laps.length,3);
    const comparable=({hz,old,...race})=>race;
    if(races.length)assert.deepEqual(comparable(result),comparable(races[0]));
    if(reference)assert.deepEqual(comparable(result),comparable(reference));
    races.push(result);console.log(`Race ${hz} Hz: ${result.finish.toFixed(6)} s, rank ${result.rank}`);
    await page.close();
  }
  checks.push('Identical full three-lap race, positions and five-racer results at 30/60/120/144 Hz');
  if(reference)checks.push('Authoritative full-race state equals untouched 2.0 baseline at 60 Hz');

  for(const old of baseline?[true,false]:[false])for(const hz of [30,60,120,144]){
    const page=await open(old?baseline:base,old);
    const sample=await page.evaluate(hz=>{
      const game=__sunset;game.step(190);game.step(60,{g:1});
      let previous=game.presentation().shown,duplicates=[0,0,0,0,0],maxDelta=[0,0,0,0,0];
      // One warm-up display interval removes the documented interpolation latency.
      game.advance(1/hz,()=>({g:1,l:.2}));previous=game.presentation().shown;
      for(let i=0;i<hz;i++){
        game.advance(1/hz,()=>({g:1,l:.2}));const shown=game.presentation().shown;
        for(let j=0;j<shown.length;j++){
          const d=Math.hypot(shown[j].x-previous[j].x,shown[j].z-previous[j].z);
          if(d<1e-10)duplicates[j]++;maxDelta[j]=Math.max(maxDelta[j],d);
        }
        previous=shown;
      }
      return{duplicates,maxDelta};
    },hz);
    if(!old)assert.deepEqual(sample.duplicates,[0,0,0,0,0]);
    cadence.push({version:old?'before':'after',hz,...sample});console.log('Cadence',cadence.at(-1));
    await page.close();
  }
  checks.push('All five vehicles move on every rendered sample at 30/60/120/144 Hz');

  const page=await open(base);
  const edge=await page.evaluate(()=>{
    const game=__sunset;game.step(190);game.step(80,{g:1,r:.4,n:1});
    const physics=()=>{const{frameTimes,renderer,...p}=game.state();return p;};
    const before=physics(),buffers=game.presentation();
    for(let i=0;i<200;i++)game.present((i%19)/18,1/144);
    const after=physics(),sameBuffers=game.presentation();
    game.pause();const paused=game.presentation(),time=game.state().time;
    game.advance(40,{g:1});const pausedAfter=game.presentation();game.pause();
    game.advance(1/144,{});const resumeTime=game.state().time;
    const lap=game.state().lap;game.recover();const recovered=game.presentation();
    game.advance(1/144,{});const recoveredNext=game.presentation();
    const count=game.advance(10,{g:1});const stalled=game.presentation();
    game.camera();const cameraBefore=game.presentation().camera;game.present(1,1/144);const cameraAfter=game.presentation().camera;
    game.restart();const restarted=game.presentation();
    return{before,after,buffers,sameBuffers,paused,pausedAfter,time,resumeTime,lap,recovered,recoveredNext,count,stalled,cameraBefore,cameraAfter,restarted};
  });
  assert.deepEqual(edge.before,edge.after);assert.deepEqual(edge.buffers.current,edge.sameBuffers.current);assert.deepEqual(edge.buffers.previous,edge.sameBuffers.previous);
  assert.deepEqual(edge.paused,edge.pausedAfter);assert.equal(edge.resumeTime,edge.time);
  assert.deepEqual(edge.recovered.previous,edge.recovered.current);assert.equal(edge.recovered.current[0].speed,0);
  assert.deepEqual(edge.recovered.shown,edge.recoveredNext.shown);assert.equal(edge.count,12);assert.ok(edge.stalled.droppedTime>9);
  assert.ok(Math.hypot(...edge.cameraBefore.position.map((v,i)=>v-edge.cameraAfter.position[i]))<1);
  assert.deepEqual(edge.restarted.previous,edge.restarted.current);assert.equal(edge.restarted.alpha,0);
  checks.push('Rendering alone does not mutate simulation, contacts, standings or snapshot endpoints','Pause/resume clears partial time and does not catch up suspended time','Recovery and restart reset both poses','Ten-second stall is bounded to 12 simulation steps','Camera mode transition has no instant positional cut');
  await page.evaluate(()=>{__sunset.step(190);__sunset.step(50,{g:1});__sunset.poll();dispatchEvent(new Event('blur'));});
  assert.equal(await page.evaluate(()=>__sunset.state().paused),1);await page.locator('#pzR').click();
  await page.locator('#back').click();await page.locator('#gm').click();await page.locator('#mSet').click();
  await page.locator('#cameraShake button').nth(0).click();assert.equal(await page.evaluate(()=>__sunset.presentation().shake),0);
  await page.reload();await page.waitForFunction(()=>window.__sunset);assert.equal(await page.evaluate(()=>__sunset.presentation().shake),0);
  checks.push('Blur pauses and clears inputs; camera shake can be disabled and persists');await page.close();
  const reduced=await open(base,false,{reducedMotion:'reduce'});assert.equal(await reduced.evaluate(()=>__sunset.presentation().shake),0);await reduced.close();
  checks.push('Reduced-motion preference defaults camera shake to off');

  let captureView,shotState;
  for(const old of baseline?[true,false]:[false]){
    const page=await open(old?baseline:base,old);
    await page.evaluate(()=>{__sunset.step(190);__sunset.step(70,{g:1,l:.25});__sunset.render();});
    const state=await page.evaluate(()=>{const p=__sunset.state();return{x:p.x,z:p.z,heading:p.heading,time:p.time,speed:p.speed};});
    if(old){captureView=await page.evaluate(()=>__sunset.view());shotState=state;}
    else if(captureView){assert.deepEqual(state,shotState);await page.evaluate(view=>{__sunset.view(view);__sunset.render();},captureView);}
    await page.screenshot({path:`${out}/${old?'before':'after'}-matched.png`});
    if(!old){await page.evaluate(()=>{__sunset.present(1,1/60);__sunset.render();});await page.screenshot({path:`${out}/after-chase-camera.png`});}
    await page.close();
  }
  assert.deepEqual(errors,[]);
  const report={checks,errors,baseline:reference||null,races,cadence,matchedCapture: captureView?{camera:captureView,state:shotState,viewport:{width:960,height:600},seed:135}:null,environment:{browser:browser.version(),renderer:'Chromium / SwiftShader, software rendering; no physical GPU or phone'},method:'Injected display intervals drive the actual 60 Hz controller and Cannon; the input driver runs once per physics step. Cadence measures mesh transforms, not GPU FPS. Rendering-only calls are checked for state mutation. Baseline response instrumentation is test-only; worktree and PR #1 are unchanged.'};
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
