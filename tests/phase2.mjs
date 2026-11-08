import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|THREE/.test(m.text()))errors.push(m.text());});
const base=process.env.GAME_URL||'http://localhost:5173';
try{
 await page.goto(base+'/?test=1');await page.waitForFunction(()=>window.__sunset);
 await page.evaluate(()=>{__sunset.quality(1);__sunset.start();__sunset.step(190);__sunset.step(70,{g:1,l:.25});__sunset.render();});
 const physics=await page.evaluate(()=>{const {renderer,frameTimes,...p}=__sunset.state();return p;});
 const qualities=[];
 for(const q of [2,1,0,3])qualities.push(await page.evaluate(q=>{__sunset.quality(q);__sunset.render();return __sunset.diagnostics();},q));
 assert.deepEqual(qualities.map(q=>q.quality),['Low','Medium','High','Ultra']);
 assert.ok(qualities[0].lowDetailRivals>=qualities[3].lowDetailRivals);assert.ok(qualities[0].dpr<qualities[3].dpr);
 assert.deepEqual(await page.evaluate(()=>{const{renderer,frameTimes,...p}=__sunset.state();return p;}),physics);
 checks.push('All four fixed quality presets render without changing simulation; distant rivals use LOD');
 const resources=[];
 for(let cycle=0;cycle<4;cycle++){
   await page.evaluate(()=>{for(const q of [2,1,0,3]){__sunset.quality(q);__sunset.render();}__sunset.quality(1);__sunset.restart();__sunset.render();});
   resources.push(await page.evaluate(()=>__sunset.diagnostics()));
 }
 assert.equal(resources.at(-1).trackBuilds,resources[0].trackBuilds);
 assert.ok(resources.at(-1).geometries<=resources[1].geometries+2);assert.ok(resources.at(-1).textures<=resources[1].textures+1);assert.ok(resources.at(-1).programs<=resources[1].programs+1);
 checks.push('Coastal restarts reuse the track; repeated quality changes do not grow GPU object counts after warmup');
 await page.evaluate(()=>{__sunset.quality('auto');__sunset.manual(false);});
 await page.waitForFunction(()=>__sunset.diagnostics().resolutionScale<.94,{},{timeout:60000});
 const dynamic=await page.evaluate(()=>{__sunset.manual(true);return __sunset.diagnostics();});assert.ok(dynamic.auto);assert.ok(dynamic.dpr<1);
 checks.push('Auto resolution responds to measured real rAF load and lowers framebuffer size');
 await page.locator('#back').click();await page.locator('#gm').click();await page.locator('#mSet').click();
 await page.locator('#tgFx').click();await page.locator('#tgFp').click();await page.locator('#targetFps button').nth(2).click();
 assert.equal(await page.evaluate(()=>__sunset.diagnostics().reducedEffects),true);
 await page.reload();await page.waitForFunction(()=>window.__sunset);assert.equal(await page.evaluate(()=>__sunset.diagnostics().reducedEffects),true);
 assert.equal(await page.locator('#targetFps button.on').textContent(),'120');
 checks.push('Reduced effects and frame target persist; diagnostics are available in the UI');
 await page.setViewportSize({width:390,height:844});await page.locator('#mSet').click();
 for(const selector of ['#ql','#targetFps','#cameraShake']){const b=await page.locator(selector).boundingBox();assert.ok(b.x>=0&&b.x+b.width<=390,`${selector} overflows portrait screen`);}
 await page.setViewportSize({width:844,height:390});
 for(const selector of ['#ql','#targetFps','#cameraShake']){const b=await page.locator(selector).boundingBox();assert.ok(b.x>=0&&b.x+b.width<=844,`${selector} overflows landscape screen`);}
 checks.push('Quality, target FPS and camera controls fit portrait and landscape layouts');
 await page.close();
 const racePage=await browser.newPage({viewport:{width:640,height:400}});racePage.on('pageerror',e=>errors.push(e.message));
 await racePage.goto(base+'/?test=1');await racePage.waitForFunction(()=>window.__sunset);
 const race=await racePage.evaluate(()=>{
  const g=__sunset;g.quality(2);g.start();
  for(let i=0;i<90*60;i++)g.advance(1/60,()=>{
   const p=g.state();if(p.state!=='go')return{};const aim=g.aim(.13),desired=Math.atan2(aim[0]-p.x,aim[1]-p.z),steer=Math.max(-1,Math.min(1,Math.atan2(Math.sin(desired-p.heading),Math.cos(desired-p.heading))*4.5)),target=Math.abs(steer)>.8?40:Math.abs(steer)>.5?47:57;
   return{g:p.speed<target?1:0,l:Math.max(0,steer),r:Math.max(0,-steer),n:Math.abs(steer)<.24&&p.speed>35?1:0};
  });const p=g.state();return{time:p.time,finish:p.finish,laps:p.laps,rank:p.rank,results:p.results};
 });
 const reference=JSON.parse(await readFile('docs/v3/phase1-results.json','utf8')).races[0];
 for(const key of Object.keys(race))assert.deepEqual(race[key],reference[key]);checks.push('A complete race and all five finish results match c81bccd exactly');
 await racePage.close();assert.deepEqual(errors,[]);
 await mkdir('artifacts/phase2',{recursive:true});await writeFile('artifacts/phase2/checks.json',JSON.stringify({checks,errors,qualities,resources,dynamic,race},null,2));console.log(JSON.stringify({checks,errors,race},null,2));
}finally{await browser.close();}
