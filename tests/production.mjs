import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base=process.env.PRODUCTION_URL||'http://localhost:4173/sunset-rush/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:960,height:600}}),page=await context.newPage(),errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))external.push(r.url());});
try{
  await page.goto(base);await page.locator('#mPlay').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>typeof window.__sunset),'undefined');
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.locator('#mPlay').waitFor({state:'visible'});
  assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller));
  await context.setOffline(true);await page.reload();await page.locator('#mPlay').waitFor({state:'visible'});
  await page.locator('#mPlay').click();
  await page.waitForFunction(()=>!['','0:00.0'].includes(document.querySelector('#tm').textContent),{},{timeout:45000});
  await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>Number(document.querySelector('#spd').textContent)>35,{},{timeout:30000});await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#pz').isVisible(),true);await page.locator('#pzR').click();
  await page.screenshot({path:'artifacts/production-offline.png'});
  await context.setOffline(false);
  const data={subpath:base,offlinePlayable:true,productionTestHooksAbsent:true,noExternalRequests:external.length===0,errors,external,cache:await page.evaluate(()=>caches.keys())};
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await writeFile('artifacts/production-report.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));
}finally{await browser.close();}
