// Release qualification only: exercise existing cars/tracks with real controller
// inputs. No teleport, lap/time mutation or new gameplay/test hooks.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],tracks=[],races=[];
try{
 const page=await browser.newPage({viewport:{width:640,height:400},locale:'en-US'});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|THREE/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{let seed=135;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);if(!localStorage.getItem('fixture')){localStorage.setItem('fixture','1');localStorage.setItem('sunset-st',JSON.stringify({cu:[6,7]}));localStorage.setItem('sunset-day',new Date().toDateString());}});
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);await page.evaluate(()=>{__sunset.quality(2);__sunset.start();});
 for(let track=0;track<11;track++){
  const result=await page.evaluate(track=>{const g=__sunset;g.select(track%8);g.track(track);g.step(190);g.step(90,{g:1});g.render();const s=g.state();return{track:s.track,car:s.car,state:s.state,speed:s.speed,x:s.x,z:s.z,racers:s.results.length};},track);
  assert.equal(result.track,track);assert.equal(result.state,'go');assert.equal(result.racers,5);assert.ok(result.speed>0);assert.ok(Number.isFinite(result.x)&&Number.isFinite(result.z));tracks.push(result);
 }
 for(const choice of [{track:10,car:0,sport:false},{track:0,car:2,sport:true},{track:1,car:7,sport:false}]){
  const result=await page.evaluate(choice=>{const g=__sunset;g.driving(choice.sport);g.select(choice.car);g.track(choice.track);
   for(let frame=0;frame<120*60;frame++)g.advance(1/60,()=>{const s=g.state();if(s.state!=='go')return{};const aim=g.aim(.13),angle=Math.atan2(aim[0]-s.x,aim[1]-s.z),steer=Math.max(-1,Math.min(1,Math.atan2(Math.sin(angle-s.heading),Math.cos(angle-s.heading))*4.5)),target=Math.abs(steer)>.8?40:Math.abs(steer)>.5?47:57;return{g:s.speed<target?1:0,l:Math.max(0,steer),r:Math.max(0,-steer),n:Math.abs(steer)<.24&&s.speed>35?1:0};});
   g.render();const s=g.state();return{...choice,state:s.state,finish:s.finish,laps:s.laps,rank:s.rank,results:s.results};
  },choice);
  assert.equal(result.state,'done',JSON.stringify(result));assert.equal(result.laps.length,3);assert.equal(result.results.length,5);assert.ok(result.results.every(r=>r.finishTime>0));assert.ok(result.finish>20);races.push(result);console.log('Qualified race',choice,result.finish);
 }
 await page.evaluate(()=>__sunset.flush());const before=await page.evaluate(()=>__sunset.save());assert.equal(before.stats.r,3);
 await page.reload();await page.waitForFunction(()=>window.__sunset&&__sunset.save().status==='saved');const restored=await page.evaluate(()=>({save:__sunset.save(),results:__sunset.profile().recentResults}));assert.equal(restored.save.coins,before.coins);assert.equal(restored.save.stats.r,3);assert.equal(restored.results.length,3);assert.deepEqual(restored.results.map(r=>r.track),[10,0,1]);
 assert.deepEqual(errors,[]);await mkdir('artifacts/beta',{recursive:true});await writeFile('artifacts/beta/coverage.json',JSON.stringify({checks:['All 11 tracks start and accept acceleration with five racers; all eight car models are exercised','Three complete three-lap races cover coast/oval/classic, three cars and Classic/Sport with all five finish times','Rewards and three distinct track results survive reload'],browser:browser.version(),tracks,races,errors,note:'Smoke coverage is not a full race on all 11 tracks or every weather/difficulty combination. Software WebGL only.'},null,2));
}finally{await browser.close();}
