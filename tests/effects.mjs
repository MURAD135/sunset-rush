import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const out='artifacts/phase2',checks=[],errors=[];await mkdir(out,{recursive:true});
const page=await browser.newPage({viewport:{width:960,height:600}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|THREE/.test(m.text()))errors.push(m.text());});
await page.route('**/src/game.js*',async route=>{
 const response=await route.fetch(),source=(await response.text()).replace('  rd.render(sc,cam);','  if(!window.__freezeRender)rd.render(sc,cam);');
 await route.fulfill({response,body:source+`\nif(window.__sunset){window.__freezeRender=true;__sunset.effects=()=>({active:particles.life.filter(x=>x>0).length,smoke:particles.kind.filter((k,i)=>k===1&&particles.life[i]>0).length,sparks:particles.kind.filter((k,i)=>k===2&&particles.life[i]>0).length,opacity:Array.from(particles.opacity),size:Array.from(particles.size),budget:particles.budget,skids:ski,flames:car.userData.fl.filter(f=>f.visible).length});__sunset.sparkTest=()=>{burst(P.x,P.z);pUpd(1/60);};}`});
});
try{
 await page.goto((process.env.GAME_URL||'http://localhost:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset?.effects);
 await page.addStyleTag({content:'#pp{visibility:hidden}'});
 await page.evaluate(()=>{__sunset.quality(1);__sunset.start();__sunset.step(190);__sunset.step(80,{g:1});__sunset.step(24,{g:1,h:1,r:1});__sunset.environment(0);__sunset.render();});
 const drift=await page.evaluate(()=>__sunset.effects());assert.ok(drift.smoke>0,JSON.stringify({smoke:drift.smoke,active:drift.active,state:await page.evaluate(()=>__sunset.state())}));assert.ok(drift.skids>0);assert.ok(drift.opacity.some(x=>x>0));
 await page.screenshot({path:out+'/drift-after.png'});checks.push('Real throttle and handbrake produce visible pooled smoke and skid marks');
 await page.evaluate(()=>{__sunset.recover();__sunset.step(80,{g:1});__sunset.step(20,{g:1,n:1});__sunset.render();});
 const nitro=await page.evaluate(()=>__sunset.effects());assert.equal(nitro.flames,2);assert.ok(nitro.active>0);await page.screenshot({path:out+'/nitro-after.png'});
 checks.push('Nitro produces animated exhaust flames and short-lived particles');
 await page.evaluate(()=>{__sunset.sparkTest();__sunset.render();});const sparks=await page.evaluate(()=>__sunset.effects());assert.ok(sparks.sparks>0);checks.push('Collision-effect pool renders sparks without creating another draw or shader error');
 await page.evaluate(()=>{__sunset.quality(2);__sunset.graphics({reduced:true});__sunset.step(30,{g:1,n:1});__sunset.render();});
 const low=await page.evaluate(()=>__sunset.effects());assert.equal(low.budget,33);assert.ok(low.active<=33);
 await page.evaluate(()=>{__sunset.restart();__sunset.render();});const cleared=await page.evaluate(()=>__sunset.effects());assert.equal(cleared.active,0);assert.equal(cleared.skids,0);assert.ok(cleared.opacity.every(x=>x===0));checks.push('Low/reduced effects honor the 33-particle budget and restart clears every trail');
 assert.deepEqual(errors,[]);await writeFile(out+'/effects-checks.json',JSON.stringify({checks,errors,drift,nitro,sparks,low,cleared},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{if(errors.length)console.error(errors);await browser.close();}
