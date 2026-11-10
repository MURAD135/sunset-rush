import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:640,height:400}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|THREE/.test(m.text()))errors.push(m.text());});
try{
 await page.goto((process.env.GAME_URL||'http://localhost:5173')+'/?test=1');await page.waitForFunction(()=>window.__sunset);
 const sample=await page.evaluate(()=>{
  const g=__sunset;g.quality(1);g.start();g.step(190);g.step(70,{g:1,l:.25});
  const state=()=>{const{renderer,frameTimes,...p}=g.state();return p;},before=state();
  const pixels=time=>{g.environment(time);g.render();const c=document.querySelector('#c'),gl=c.getContext('webgl2')||c.getContext('webgl'),data=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
  const first=pixels(0),last=pixels(4);let changed=0,total=0;for(let i=0;i<first.length;i+=4){let diff=0;for(let j=0;j<3;j++)diff+=Math.abs(first[i+j]-last[i+j]);if(diff>3)changed++;total+=diff;}
  const active=g.environment(4);g.graphics({reduced:true});const reduced=g.environment(4);g.quality(2);const low=g.environment(4);
  return{before,after:state(),changedPixels:changed,meanChannelDelta:total/(first.length*.75),active,reduced,low};
 });
 assert.deepEqual(sample.before,sample.after);assert.ok(sample.changedPixels>100);assert.ok(sample.active.birds&&sample.active.traffic);assert.equal(sample.reduced.birds,false);assert.equal(sample.reduced.traffic,false);assert.equal(sample.low.waterDetail,0);
 checks.push('Water, wind and wildlife animation changes actual rendered pixels without changing race state','Reduced effects and Low disable secondary animation and simplify water');
 const resources=[];
 for(let i=0;i<4;i++)resources.push(await page.evaluate(()=>{__sunset.track(0);__sunset.render();__sunset.track(10);__sunset.render();return __sunset.diagnostics();}));
 assert.ok(resources.at(-1).geometries<=resources[1].geometries+2);assert.ok(resources.at(-1).textures<=resources[1].textures+1);assert.ok(resources.at(-1).programs<=resources[1].programs+1);
 checks.push('Repeated coast/classic switching releases water textures and custom shadow programs');
 assert.deepEqual(errors,[]);await mkdir('artifacts/phase2',{recursive:true});await writeFile('artifacts/phase2/environment-checks.json',JSON.stringify({checks,errors,sample,resources},null,2));console.log(JSON.stringify({checks,errors,changedPixels:sample.changedPixels},null,2));
}finally{await browser.close();}
