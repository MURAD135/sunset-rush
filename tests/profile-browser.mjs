import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],checks=[],base=process.env.GAME_URL||'http://127.0.0.1:5173';
try{
 const context=await browser.newContext({viewport:{width:960,height:800}});let page=await context.newPage();
 const watch=p=>p.on('pageerror',e=>errors.push(e.message));watch(page);
 await page.addInitScript(()=>{if(!localStorage.getItem('fixture')){localStorage.setItem('fixture','1');localStorage.setItem('sunset-up','{"u":[0,0,0],"c":3000}');localStorage.setItem('sunset-st',JSON.stringify({a:[0,2],r:7,bt:{0:85,10:70}}));localStorage.setItem('sunset-day',new Date().toDateString());}});
 const ready=()=>page.waitForFunction(()=>window.__sunset&&__sunset.save().status==='saved');
 await page.goto(base+'/?test=1');await ready();await page.locator('#mGar').click();await page.locator('#cs button').nth(6).click();await page.locator('#sw2 button').first().click();
 await page.locator('#tb button').nth(1).click();await page.locator('#fn button').nth(2).click();await page.locator('#wg button').nth(2).click();await page.locator('#sp button').nth(1).click();await page.locator('#rm button').nth(2).click();await page.locator('#gl button').nth(3).click();
 await page.locator('#tb button').nth(2).click();assert.equal(await page.locator('#tk button').count(),11);await page.locator('#tk button').nth(3).click();await page.locator('#lp button').nth(2).click();await page.locator('#df button').nth(2).click();
 await page.locator('#tb button').nth(3).click();await page.locator('#tz button').nth(1).click();await page.locator('#wx button').nth(2).click();await page.locator('#sf button').nth(1).click();
 await page.locator('#tb button').nth(4).click();await page.locator('#up button').first().click();
 await page.locator('#gm').click();await page.locator('#mSet').click();await page.locator('#tgGh').click();await page.locator('#ql button').nth(1).click();await page.locator('#lg button').nth(2).click();
 await page.waitForFunction(()=>__sunset.save().status==='saved');
 const expected=await page.evaluate(()=>({save:__sunset.save(),profile:__sunset.profile()}));assert.equal(expected.save.coins,1750);assert.deepEqual(expected.save.stats.cu,[6]);assert.deepEqual(expected.save.stats.o,[0]);assert.equal(expected.profile.session.car,6);assert.equal(expected.profile.session.track,3);
 // Abrupt renderer crash: no pagehide flush is allowed to make this test pass.
 await page.evaluate(()=>addEventListener('pagehide',()=>localStorage.setItem('pagehide-fired','1')));
 const cdp=await context.newCDPSession(page),crashed=page.waitForEvent('crash');cdp.send('Page.crash').catch(()=>{});await crashed;await page.close();page=await context.newPage();watch(page);await page.goto(base+'/?test=1');await ready();
 const actual=await page.evaluate(()=>({save:__sunset.save(),profile:__sunset.profile(),exit:localStorage.getItem('pagehide-fired'),lang:document.documentElement.lang}));
 assert.equal(actual.exit,null);assert.equal(actual.save.coins,1750);assert.deepEqual(actual.save.upgrades,[1,0,0,0,0]);assert.deepEqual(actual.save.stats.cu,[6]);assert.deepEqual(actual.save.stats.o,[0]);assert.deepEqual(actual.save.stats.a,expected.save.stats.a);assert.deepEqual(actual.save.stats.bt,expected.save.stats.bt);assert.deepEqual(actual.profile,expected.profile);assert.equal(actual.lang,'fr');
 checks.push('paid car, paint, upgrade, achievements, bests and all session preferences survive a renderer crash without pagehide');
 // A corrupted latest generation falls back to the last valid complete generation.
 const generations=await page.evaluate(()=>['sunset-profile-a','sunset-profile-b'].map(k=>({key:k,raw:localStorage.getItem(k)})).filter(x=>x.raw).map(x=>({...x,revision:JSON.parse(x.raw).revision})).sort((a,b)=>b.revision-a.revision));
 assert.equal(generations.length,2);const backup=JSON.parse(generations[1].raw);
 await page.evaluate(k=>localStorage.setItem(k,'damaged'),generations[0].key);await page.reload();await ready();
 assert.equal((await page.evaluate(()=>__sunset.save())).coins,JSON.parse(backup.data['sunset-up']).c);checks.push('corrupt current generation recovers coherent wallet from previous generation');
 assert.deepEqual(errors,[]);await mkdir('artifacts/phase3',{recursive:true});await writeFile('artifacts/phase3/profile-crash.json',JSON.stringify({checks,errors,crash:'Chrome DevTools Page.crash; renderer termination, not a physical power cut',profile:actual.profile,coins:actual.save.coins},null,2));console.log({checks,errors});
}finally{await browser.close();}
