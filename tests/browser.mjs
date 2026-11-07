import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.GAME_URL||'http://localhost:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
await mkdir('artifacts',{recursive:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],checks=[];
page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
const state=()=>page.evaluate(()=>window.__sunset.state());
const step=(n,keys={})=>page.evaluate(([n,k])=>window.__sunset.step(n,k),[n,keys]);
try{
  await page.goto(base+'/?test=1');await page.waitForFunction(()=>window.__sunset);
  await page.evaluate(()=>{window.__sunset.quality(1);window.__sunset.start();});
  await step(190);assert.equal((await state()).state,'go');checks.push('countdown');
  await page.keyboard.down('KeyW');await page.evaluate(()=>{__sunset.poll();__sunset.step(120,__sunset.state().keys);});await page.keyboard.up('KeyW');
  assert.ok((await state()).speed>25);checks.push('keyboard acceleration');
  const before=(await state()).speed;await step(45,{b:1});assert.ok((await state()).speed<before-10);checks.push('braking');
  await page.evaluate(()=>__sunset.recover());await step(80,{g:1});const nt=(await state()).nitro;await step(25,{g:1,n:1});assert.ok((await state()).nitro<nt);checks.push('nitro consumption');
  await step(30,{g:1,h:1,r:1});assert.ok((await state()).drifting,JSON.stringify(await state()));checks.push('handbrake drift');
  await page.keyboard.press('Escape');const paused=await state();await step(120,{g:1});assert.equal((await state()).time,paused.time);assert.ok(paused.paused);await page.locator('#pzR').click();checks.push('pause/resume');
  await page.keyboard.down('KeyW');await page.evaluate(()=>{__sunset.poll();dispatchEvent(new Event('blur'));__sunset.poll();});assert.equal((await state()).keys.g,0);assert.equal((await state()).paused,1);await page.keyboard.up('KeyW');await page.locator('#pzR').click();checks.push('blur clears inputs and pauses');
  await page.evaluate(()=>{window.testPad={connected:true,axes:[-.8],buttons:Array.from({length:16},()=>({value:0,pressed:false}))};testPad.buttons[7].value=.7;testPad.buttons[2].value=1;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[testPad]});__sunset.poll();});
  const pad=(await state()).keys;assert.ok(pad.l>.7);assert.equal(pad.g,.7);assert.equal(pad.n,1);
  await page.evaluate(()=>{testPad.connected=false;dispatchEvent(new Event('gamepaddisconnected'));__sunset.poll();delete navigator.getGamepads;});assert.equal((await state()).keys.g,0);checks.push('injected gamepad mapping and disconnect release');
  await page.evaluate(()=>__sunset.restart());await step(190);
  // A test driver supplies only steering/throttle to the real controller and Cannon world.
  // It never teleports the car or alters distance, laps, checkpoints, rivals or time.
  const drive=await page.evaluate(()=>{
    const game=window.__sunset;let frames=0,maxSpeed=0,contacts=0,minRank=5,maxRank=1;
    for(;frames<18000;frames++){
      const p=game.state();if(p.state==='done')break;
      const aim=game.aim(.13),desired=Math.atan2(aim[0]-p.x,aim[1]-p.z);
      const error=Math.atan2(Math.sin(desired-p.heading),Math.cos(desired-p.heading));
      const steer=Math.max(-1,Math.min(1,error*4.5));
      const target= Math.abs(steer)>.8?40:Math.abs(steer)>.5?47:57;
      game.step(1,{g:p.speed<target?1:0,l:Math.max(0,steer),r:Math.max(0,-steer),n:Math.abs(steer)<.24&&p.speed>35?1:0});
      maxSpeed=Math.max(maxSpeed,p.speed);contacts+=p.contacts;const rank=p.results.findIndex(a=>a.id===0)+1;minRank=Math.min(minRank,rank);maxRank=Math.max(maxRank,rank);
    }
    game.step(80);game.render();return{frames,maxSpeed,contacts,minRank,maxRank,state:game.state()};
  });
  console.log('FULL RACE',JSON.stringify({frames:drive.frames,finish:drive.state.finish,lap:drive.state.lap,cum:drive.state.cum,rank:drive.state.rank,maxSpeed:drive.maxSpeed}));
  assert.equal(drive.state.state,'done');assert.equal(drive.state.lap,3);assert.equal(drive.state.laps.length,3);assert.ok(drive.state.finish>40);assert.equal(await page.locator('#resultsTable tr').count(),5);checks.push('complete three-lap race and five-place result table');
  assert.ok(drive.maxRank>drive.minRank);checks.push('rivals overtake and standings change');await page.screenshot({path:'artifacts/results.png'});
  await step(600);assert.equal((await state()).rank,drive.state.rank);checks.push('finish rank remains fixed');
  await page.locator('#again').click();assert.equal((await state()).state,'count');assert.equal((await state()).lap,0);assert.equal((await state()).nitro,100);checks.push('restart resets race');
  for(const i of [0,1,2]){await page.evaluate(i=>__sunset.select(i),i);assert.equal((await state()).car,i);}checks.push('three selectable cars');
  const memories=[];for(let i=0;i<5;i++){await page.evaluate(()=>{__sunset.restart();__sunset.render();});memories.push((await state()).renderer);}
  assert.ok(memories.at(-1).geometries<=memories[1].geometries+3);assert.ok(memories.at(-1).textures<=memories[1].textures+1);checks.push('restarts do not grow GPU resource counts');
  await page.evaluate(()=>{__sunset.select(1);__sunset.start();__sunset.step(190);__sunset.step(65,{g:1,r:.5});__sunset.render();});await page.screenshot({path:'artifacts/race-desktop.png'});
  const performanceSamples=[];
  for(const quality of [0,1,2]){
    await page.evaluate(q=>{__sunset.quality(q);__sunset.resetMetrics();},quality);await page.waitForFunction(()=>__sunset.state().frameTimes.length>=32,{},{timeout:60000});
    const sample=await state(),times=sample.frameTimes.slice(-30).sort((a,b)=>a-b);
    performanceSamples.push({quality,renderer:sample.renderer,medianFrameMs:times[Math.floor(times.length/2)],p95FrameMs:times[Math.floor(times.length*.95)]});
  }
  await page.evaluate(()=>__sunset.track(0));await step(190);await step(90,{g:1});assert.ok((await state()).speed>15);checks.push('original classic track remains drivable');
  await page.evaluate(()=>{__sunset.track(6);__sunset.render();});checks.push('original fork/tunnel track builds');
  await page.locator('#back').click();await page.locator('#gm').click();await page.evaluate(()=>__sunset.manual(false));await page.waitForTimeout(250);await page.screenshot({path:'artifacts/menu-desktop.png'});
  // Exercise actual pointer handlers in a mobile viewport, including simultaneous fingers.
  await page.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));await mp.goto(base+'/?test=1',{waitUntil:'domcontentloaded',timeout:60000});await mp.waitForFunction(()=>window.__sunset);await mp.evaluate(()=>{__sunset.quality(2);__sunset.start();__sunset.step(190);});
  const cdp=await mp.context().newCDPSession(mp);
  const rect=async selector=>{const b=await mp.locator(selector).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=390&&b.y+b.height<=844,selector+' outside viewport');return{x:b.x+b.width/2,y:b.y+b.height/2};};
  const gas=await rect('[data-k=g]'),left=await rect('[data-k=l]'),drift=await rect('[data-k=h]');await rect('[data-k=n]');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...gas},{id:2,...left},{id:3,...drift}]});
  const pressed=await mp.evaluate(()=>{__sunset.poll();return __sunset.state().keys;});assert.equal(pressed.g,1);assert.equal(pressed.l,1);assert.equal(pressed.h,1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});const released=await mp.evaluate(()=>{__sunset.poll();return __sunset.state().keys;});assert.equal(released.g,0);assert.equal(released.l,0);checks.push('mobile three-finger controls and pointer cancellation');
  await mp.evaluate(()=>{__sunset.step(60,{g:1});__sunset.render();});await mp.screenshot({path:'artifacts/race-mobile.png'});await mp.locator('#psb').click();await mp.locator('#pzRecover').click();assert.equal(await mp.evaluate(()=>__sunset.state().speed),0);checks.push('touch-accessible recovery');await mp.setViewportSize({width:844,height:390});await mp.screenshot({path:'artifacts/race-mobile-landscape.png'});
  await mobile.close();assert.deepEqual(errors,[]);
  const report={checks,errors,race:{time:drive.state.finish,laps:drive.state.laps,rank:drive.state.rank,maxSpeedKmh:drive.maxSpeed*3.6,contactFrames:drive.contacts,rankRange:[drive.minRank,drive.maxRank]},memories,performanceSamples,environment:'Headless Chromium / SwiftShader software renderer; not a physical mobile or GPU benchmark.'};
  await writeFile('artifacts/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
