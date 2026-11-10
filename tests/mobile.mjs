import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.GAME_URL||'http://localhost:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);
 const cdp=await context.newCDPSession(page);await page.evaluate(()=>{__sunset.quality(2);__sunset.start();__sunset.step(190);});
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>new Promise(requestAnimationFrame));
  const points={};for(const key of ['l','r','g','b','h','n']){
   const box=await page.locator(`[data-k=${key}]`).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`${key} outside ${viewport.width}x${viewport.height}`);
   points[key]={x:box.x+box.width/2,y:box.y+box.height/2};
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...points.g},{id:2,...points.l},{id:3,...points.n}]});
  const keys=await page.evaluate(()=>{__sunset.poll();return __sunset.state().keys;});assert.equal(keys.g,1);assert.equal(keys.l,1);assert.equal(keys.n,1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  const released=await page.evaluate(()=>{__sunset.poll();return __sunset.state().keys;});assert.equal(released.g,0);assert.equal(released.l,0);assert.equal(released.n,0);
  await page.evaluate(()=>{__sunset.step(1);__sunset.environment(0);__sunset.render();});
  await mkdir('artifacts/phase2',{recursive:true});await page.screenshot({path:`artifacts/phase2/mobile-${viewport.width}.png`});checks.push({viewport,allSixButtonsFit:true,threeFingerNitro:true,cancelReleases:true});
 }
 assert.deepEqual(errors,[]);await writeFile('artifacts/phase2/mobile-checks.json',JSON.stringify({checks,errors,environment:'Chromium touch emulation; not a physical iOS or Android device'},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
