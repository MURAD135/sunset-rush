import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:640,height:480}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.SunsetRushNative={app:{addListener:async(name,fn)=>{window.nativeState=fn;return{remove(){}};}}};});
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);
 await page.locator('#mPlay').click();await page.evaluate(()=>{__sunset.quality(2);__sunset.step(190);nativeState({isActive:false});});
 await page.waitForFunction(()=>__sunset.audio().state==='suspended'&&__sunset.save().status==='saved');
 const before=await page.evaluate(()=>({power:__sunset.power(),time:__sunset.save().stats.t}));await page.waitForTimeout(5500);
 const after=await page.evaluate(()=>({power:__sunset.power(),time:__sunset.save().stats.t}));
 assert.equal(after.power.rendered,before.power.rendered);assert.equal(after.power.saveRequests,before.power.saveRequests);assert.equal(after.time,before.time);checks.push('native background produces zero rendered frames, periodic save requests or play-time increments during 5.5 seconds');
 await page.evaluate(()=>nativeState({isActive:true}));assert.equal(await page.evaluate(()=>__sunset.state().paused),1);assert.equal((await page.evaluate(()=>__sunset.audio())).state,'suspended');
 await page.locator('#pzR').click();await page.waitForFunction(()=>__sunset.audio().state==='running');checks.push('foreground remains paused and audio resumes only on player gesture');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>__sunset.audio().state==='suspended');
 const hidden=await page.evaluate(()=>__sunset.power().rendered);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>__sunset.power().rendered),hidden);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.locator('#pzR').click();await page.waitForFunction(()=>__sunset.audio().state==='running');checks.push('web visibility suspends rendering/audio and returns without suspended-time catch-up');
 await page.locator('#snd').click();await page.waitForFunction(()=>__sunset.audio().state==='suspended');checks.push('muting suspends audio processing without allocating new sources');assert.equal((await page.evaluate(()=>__sunset.audio())).sources,6);
 const budget=await page.evaluate(async()=>{const{FrameBudget}=await import('/src/frame-budget.js');return[60,120,144].map(hz=>{const gate=new FrameBudget();for(let i=0;i<hz;i++)gate.accept(i*1000/hz);return{callbackHz:hz,idleFrames:gate.rendered};});});
 assert.deepEqual(errors,[]);await mkdir('artifacts/phase3',{recursive:true});await writeFile('artifacts/phase3/power.json',JSON.stringify({checks,errors,before,after,budget,note:'Synthetic native/web background events in Chromium SwiftShader; scheduler counts, not physical energy or FPS measurements.'},null,2));console.log({checks,budget,errors});
}finally{await browser.close();}
