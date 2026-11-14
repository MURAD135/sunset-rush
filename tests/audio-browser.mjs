import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:640,height:480}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(...args){super(...args);window.audioForTest=this;}};window.SunsetRushNative={app:{addListener:async(name,fn)=>{window.nativeStateForTest=fn;return{remove(){}};}}};});
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);
 await page.locator('#mPlay').click();const initial=await page.evaluate(()=>__sunset.audio());assert.equal(initial.sources,6);assert.equal(initial.state,'running');
 await page.evaluate(()=>{__sunset.step(190);__sunset.step(80,{g:1});__sunset.step(25,{g:1,n:1});__sunset.tick(.016);});
 assert.deepEqual(await page.evaluate(()=>__sunset.audio()),initial);
 await page.locator('#snd').click();await page.waitForFunction(()=>__sunset.audio().state==='suspended');await page.locator('#snd').click();await page.waitForFunction(()=>__sunset.audio().state==='running');
 assert.deepEqual(await page.evaluate(()=>__sunset.audio()),initial);
 // Simulate an OS/browser audio interruption with a real suspended context.
 await page.locator('#psb').click();await page.evaluate(()=>audioForTest.suspend());
 assert.equal((await page.evaluate(()=>__sunset.audio())).state,'suspended');
 await page.locator('#pzR').click();await page.waitForFunction(()=>__sunset.audio().state==='running');
 assert.equal(await page.evaluate(()=>__sunset.state().paused),0);
 await page.locator('#psb').click();await page.evaluate(()=>audioForTest.suspend());await page.locator('#pzA').click();
 await page.waitForFunction(()=>__sunset.audio().state==='running');assert.equal(await page.evaluate(()=>__sunset.state().state),'count');
 await page.evaluate(async()=>{__sunset.step(190);nativeStateForTest({isActive:false});await audioForTest.suspend();nativeStateForTest({isActive:true});});
 assert.equal(await page.evaluate(()=>__sunset.state().paused),1);assert.equal((await page.evaluate(()=>__sunset.audio())).state,'suspended');
 await page.locator('#pzRecover').click();await page.waitForFunction(()=>__sunset.audio().state==='running');assert.equal(await page.evaluate(()=>__sunset.state().paused),0);
 assert.deepEqual(await page.evaluate(()=>__sunset.audio()),initial);
 const sound=await page.evaluate(async()=>{const {RaceAudio}=await import('/src/audio.js');const c=new OfflineAudioContext(1,48000,48000),a=new RaceAudio(c);a.update({active:true,speed:35,throttle:1,drift:.3,nitro:true});const b=await c.startRendering(),d=b.getChannelData(0);let power=0,peak=0;for(const x of d){power+=x*x;peak=Math.max(peak,Math.abs(x));}return{rms:Math.sqrt(power/d.length),peak};});
 assert.ok(sound.rms>.001&&sound.peak<1);assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:7,audio:initial,offlineSound:sound,errors},null,2));
}finally{await browser.close();}
