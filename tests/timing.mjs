import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto((process.env.GAME_URL||'http://localhost:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);
  await page.evaluate(()=>{__sunset.quality(2);__sunset.start();__sunset.step(250,{g:1});
    window.pad={connected:true,axes:[0],buttons:Array.from({length:16},()=>({value:0,pressed:false}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
  });
  const result=await page.evaluate(()=>{
    const game=__sunset;
    const press=(button,elapsed)=>{pad.buttons[button].pressed=true;game.tick(elapsed);pad.buttons[button].pressed=false;};
    press(9,.03);const paused=game.state();game.tick(5);const afterPause=game.state();
    press(9,10);const resumed=game.state();game.tick(1/60);const afterResume=game.state();
    pad.buttons[7].value=1;press(8,10);const recovered=game.state(),poses=game.presentation();
    game.tick(1/60);const driven=game.state();
    const beforeCamera=game.presentation().camera;press(3,1/144);const afterCamera=game.presentation();
    pad.connected=false;dispatchEvent(new Event('gamepaddisconnected'));game.tick(1/144);const released=game.state();
    return{paused,afterPause,resumed,afterResume,recovered,poses,driven,beforeCamera,afterCamera,released};
  });
  assert.equal(result.paused.paused,1);assert.equal(result.afterPause.time,result.paused.time);
  assert.equal(result.resumed.paused,0);assert.equal(result.resumed.time,result.paused.time);
  assert.ok(Math.abs(result.afterResume.time-result.resumed.time-1/60)<1e-10);
  assert.equal(result.recovered.time,result.afterResume.time);assert.equal(result.recovered.speed,0);
  assert.deepEqual(result.poses.previous,result.poses.current);assert.equal(result.poses.alpha,0);
  assert.ok(result.driven.speed>0);assert.equal(result.released.keys.g,0);
  assert.equal(result.afterCamera.cameraMode,1);assert.ok(Math.hypot(...result.beforeCamera.position.map((x,i)=>x-result.afterCamera.camera.position[i]))<1);
  checks.push('Gamepad pause freezes simulation even across a five-second stall','Gamepad resume inside input polling discards a stale ten-second frame interval','Gamepad recovery inside input polling resets both poses without advancing race time','Driving resumes on the next 60 Hz tick','Gamepad camera switch is smooth; disconnect clears throttle');
  // Synthetic WebGL notifications exercise the event handlers, not a physical GPU reset.
  const context=await page.evaluate(()=>{
    document.querySelector('#c').dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
    const paused=__sunset.state();__sunset.tick(10);
    document.querySelector('#c').dispatchEvent(new Event('webglcontextrestored'));
    return{paused,after:__sunset.state(),poses:__sunset.presentation(),errorHidden:document.querySelector('#graphicsError').hidden};
  });
  assert.equal(context.paused.paused,1);assert.equal(context.after.time,context.paused.time);assert.equal(context.poses.alpha,0);assert.equal(context.errorHidden,true);
  checks.push('WebGL loss notifications pause; restoration clears clock history (synthetic events, not a GPU reset)');
  assert.deepEqual(errors,[]);
  await mkdir('artifacts/phase1',{recursive:true});await writeFile('artifacts/phase1/timing-report.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
