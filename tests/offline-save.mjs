import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {decodeSave} from '../src/save-system.js';
const base=process.env.PRODUCTION_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],external=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});let page=await context.newPage();
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});};watch(page);
 await page.addInitScript(()=>{if(!localStorage.getItem('fixture')){localStorage.setItem('fixture','1');localStorage.setItem('sunset-up','{"u":[0,0,0,0,0],"c":1200}');localStorage.setItem('sunset-day',new Date().toDateString());}});
 const ready=()=>page.locator('#mPlay').waitFor({state:'visible'});
 const durable=()=>page.evaluate(()=>['sunset-profile-a','sunset-profile-b'].map(k=>localStorage.getItem(k)).filter(Boolean).sort((a,b)=>JSON.parse(b).revision-JSON.parse(a).revision)[0]);
 await page.goto(base);await ready();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await ready();assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller));assert.equal(await page.evaluate(()=>typeof window.__sunset),'undefined');
 await context.setOffline(true);await page.reload();await ready();
 await page.locator('#mGar').click();await page.locator('#cs button').nth(6).click();await page.locator('#tb button').nth(4).click();await page.locator('#up button').first().click();
 await page.locator('#tb button').nth(2).click();await page.locator('#tk button').nth(8).click();await page.locator('#gm').click();await page.locator('#mSet').click();await page.locator('#guestCreate').click();await page.locator('#driveMode button').nth(1).click();await page.locator('#ql button').nth(1).click();
 await page.waitForFunction(()=>{const d=['sunset-profile-a','sunset-profile-b'].map(k=>localStorage.getItem(k)).filter(Boolean).map(JSON.parse).sort((a,b)=>b.revision-a.revision)[0]?.data;return d&&JSON.parse(d['sunset-up']).c===250&&JSON.parse(d['sunset-session']).track===8&&JSON.parse(d['sunset-preferences']).sport;});
 const expected=decodeSave(await durable()).data,guest=await page.evaluate(()=>localStorage.getItem('sunset-local-guest'));
 assert.equal(JSON.parse(expected['sunset-up']).u[0],1);assert.deepEqual(JSON.parse(expected['sunset-st']).cu,[6]);checks.push('production offline car/upgrade purchases and settings reach a validated durable generation');
 await page.evaluate(()=>addEventListener('pagehide',()=>localStorage.setItem('exit-flush','yes')));
 const cdp=await context.newCDPSession(page),crashed=page.waitForEvent('crash');cdp.send('Page.crash').catch(()=>{});await crashed;await page.close();page=await context.newPage();watch(page);await page.goto(base);await ready();
 // Read the stored generation before any recovery/UI checks can manufacture a save.
 const actual=decodeSave(await durable()).data;
 for(const key of ['sunset-up','sunset-session','sunset-preferences','sunset-q'])assert.equal(actual[key],expected[key],key);
 assert.deepEqual(JSON.parse(actual['sunset-st']).cu,[6]);assert.equal(await page.evaluate(()=>localStorage.getItem('exit-flush')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-local-guest')),guest);
 await page.locator('#mGar').click();assert.equal(await page.locator('#cn2').textContent(),'250');assert.ok(await page.locator('#cs button').nth(6).evaluate(e=>e.classList.contains('on')));
 checks.push('offline renderer crash without pagehide restores wallet, ownership, upgrades, circuit, guest and settings from cached production assets');
 await page.setViewportSize({width:390,height:844});await page.locator('#gm').click();await page.locator('#mSet').click();await page.locator('#saveExport').scrollIntoViewIfNeeded();assert.ok(await page.locator('#saveExport').isVisible());assert.ok(await page.locator('#guestCreate').isDisabled());checks.push('restored backup controls remain reachable in portrait and landscape touch emulation');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await mkdir('artifacts/phase3',{recursive:true});await writeFile('artifacts/phase3/offline-save.json',JSON.stringify({checks,errors,external,environment:'Chromium software SwiftShader, mobile touch emulation; no real Safari/Android device',crash:'CDP Page.crash without pagehide; acknowledged autosaves only, not physical power loss',offline:true},null,2));console.log({checks,errors,external});
}finally{await browser.close();}
