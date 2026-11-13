import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const run=async(page,hz,old=false)=>page.evaluate(({hz,old})=>{
  const game=__sunset;
  const driver=()=>{
    const p=game.state();if(p.state!=='go')return{};
    const aim=game.aim(.13),desired=Math.atan2(aim[0]-p.x,aim[1]-p.z);
    const steer=Math.max(-1,Math.min(1,Math.atan2(Math.sin(desired-p.heading),Math.cos(desired-p.heading))*4.5));
    const target=Math.abs(steer)>.8?40:Math.abs(steer)>.5?47:57;
    return{g:p.speed<target?1:0,l:Math.max(0,steer),r:Math.max(0,-steer),n:Math.abs(steer)<.24&&p.speed>35?1:0};
  };
  // Equal simulated wall duration, including finish coasting, on every cadence.
  for(let frame=0;frame<hz*90;frame++)game.advance(1/hz,driver);
  const p=game.state();
  return{hz,old,state:p.state,time:p.time,finish:p.finish,laps:p.laps,rank:p.rank,x:p.x,z:p.z,speed:p.speed,nitro:p.nitro,heading:p.heading,direction:p.direction,cum:p.cum,results:p.results};
},{hz,old});
const races=[],errors=[];
try{
 for(const hz of [30,60,120,144]){
  const page=await browser.newPage({viewport:{width:640,height:480}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let seed=135;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
  await page.goto((process.env.GAME_URL||'http://127.0.0.1:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);
  await page.evaluate(()=>{__sunset.quality(2);__sunset.driving(true);__sunset.start();});
  const result=await run(page,hz);assert.equal(result.state,'done');assert.equal(result.laps.length,3);assert.equal(result.results.length,5);
  const ai=await page.evaluate(()=>__sunset.rivals());assert.ok(ai.decisions.every(n=>n===ai.decisions[0]&&n>600&&n<=900));
  if(races.length){const ref={...races[0],hz};assert.deepEqual(result,ref);}races.push(result);
  const saved=await page.evaluate(async()=>{await __sunset.flush();return __sunset.save();});assert.equal(saved.stats.r,1);assert.ok(saved.stats.bt['10:sport']>0);assert.equal(saved.stats.bt['10'],undefined);
  await page.reload();await page.waitForFunction(()=>window.__sunset);const restored=await page.evaluate(()=>__sunset.save());assert.equal(restored.coins,saved.coins);assert.equal(restored.stats.r,1);assert.equal(restored.stats.bt['10:sport'],saved.stats.bt['10:sport']);
  await page.close();
 }
 assert.deepEqual(errors,[]);await mkdir('artifacts/phase3',{recursive:true});await writeFile('artifacts/phase3/driving.json',JSON.stringify({races,rewardsAndSportRecordsSurviveReload:true,errors},null,2));console.log('Sport: four identical complete races',races.map(r=>({hz:r.hz,finish:r.finish,rank:r.rank})));
}finally{await browser.close();}
