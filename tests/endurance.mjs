import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:640,height:400}}),errors=[],runs=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|THREE/.test(m.text()))errors.push(m.text());});
try{
 await page.goto((process.env.GAME_URL||'http://localhost:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);
 const cdp=await page.context().newCDPSession(page);await cdp.send('HeapProfiler.enable');
 for(let cycle=0;cycle<4;cycle++){
  const result=await page.evaluate(()=>{
   const g=__sunset;g.quality(1);g.start();
   for(let i=0;i<90*60;i++)g.advance(1/60,()=>{
    const p=g.state();if(p.state!=='go')return{};
    const aim=g.aim(.13),desired=Math.atan2(aim[0]-p.x,aim[1]-p.z),steer=Math.max(-1,Math.min(1,Math.atan2(Math.sin(desired-p.heading),Math.cos(desired-p.heading))*4.5)),target=Math.abs(steer)>.8?40:Math.abs(steer)>.5?47:57;
    return{g:p.speed<target?1:0,l:Math.max(0,steer),r:Math.max(0,-steer),n:Math.abs(steer)<.24&&p.speed>35?1:0};
   });
   g.render();const p=g.state();return{race:{finish:p.finish,laps:p.laps,rank:p.rank,results:p.results},resources:g.diagnostics()};
  });
  assert.equal(result.race.laps.length,3);assert.equal(result.race.results.length,5);assert.ok(result.race.finish>40);
  if(runs.length)assert.deepEqual(result.race,runs[0].race);
  await cdp.send('HeapProfiler.collectGarbage');result.heap=await cdp.send('Runtime.getHeapUsage');runs.push(result);console.log('Completed race',cycle+1,result.race.finish,result.resources.geometries,result.resources.textures);
 }
 const warm=runs[1],last=runs.at(-1);
 assert.ok(last.resources.geometries<=warm.resources.geometries+2);assert.ok(last.resources.textures<=warm.resources.textures+1);assert.ok(last.resources.programs<=warm.resources.programs+1);
 assert.ok(last.heap.usedSize<=warm.heap.usedSize+4*1024*1024,'Unexpected retained JS heap growth after warmup');assert.deepEqual(errors,[]);
 const panel=await page.locator('#end').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=400);
 await page.locator('#again').scrollIntoViewIfNeeded();const button=await page.locator('#again').boundingBox();assert.ok(button.y>=0&&button.y+button.height<=400);
 await page.setViewportSize({width:960,height:600});await page.evaluate(()=>{document.querySelector('#end').scrollTop=0;__sunset.render();});
 await mkdir('artifacts/phase2',{recursive:true});await page.screenshot({path:'artifacts/phase2/results-final.png',animations:'disabled'});
 await writeFile('artifacts/phase2/endurance-checks.json',JSON.stringify({checks:['Four full races in the same page preserve all five results, including saved-ghost replay','GPU object counts and retained JS heap stay bounded after warmup','Results panel and restart button stay accessible in a 400-pixel-high viewport'],runs,errors,note:'Forced GC is diagnostic only. Four races are a bounded regression check, not proof against every long-session leak.'},null,2));
}finally{await browser.close();}
