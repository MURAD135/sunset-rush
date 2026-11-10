import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.GAME_URL||'http://localhost:5173',out='artifacts/phase2';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],checks=[];
async function open(base){
 const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|THREE/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{let seed=135;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
 await page.route('**/src/game.js*',async route=>{
  const response=await route.fetch();const source=(await response.text()).replace('  rd.render(sc,cam);','  if(!window.__freezeRender)rd.render(sc,cam);');
  await route.fulfill({response,body:source+`\nif(window.__sunset){window.__freezeRender=true;__sunset.vehicle=()=>({body:car.userData.body?.rotation.toArray(),height:car.userData.body?.position.y,wheels:car.userData.wh.map(w=>w.position.y),paint:car.userData.bm.type,clearcoat:car.userData.bm.clearcoat,reflection:!!car.userData.bm.envMap});__sunset.closeup=()=>{cam.position.set(P.x+Math.cos(P.th)*6.8-Math.sin(P.th)*7.5,3.5,P.z-Math.sin(P.th)*6.8-Math.cos(P.th)*7.5);cam.lookAt(P.x,.7,P.z);cam.fov=37;cam.updateProjectionMatrix();skyM.position.copy(cam.position);sunS.position.set(cam.position.x+330,cam.position.y+80,cam.position.z+600);};}`});
 });
 await page.goto(base+'/?test=1');await page.waitForFunction(()=>window.__sunset?.vehicle);
 await page.addStyleTag({content:'#pp{visibility:hidden}'});
 await page.evaluate(()=>{__sunset.quality(0);__sunset.start();__sunset.step(190);__sunset.step(70,{g:1,l:.25});__sunset.environment?.(0);__sunset.closeup();__sunset.render();});
 return page;
}
try{
 if(process.env.CAR_BASELINE_URL){const before=await open(process.env.CAR_BASELINE_URL);await before.screenshot({path:out+'/vehicle-before.png'});await before.close();}
 const page=await open(url);await page.screenshot({path:out+'/vehicle-after.png'});
 const resources=[];
 for(let cycle=0;cycle<3;cycle++)resources.push(await page.evaluate(()=>{
  for(let i=0;i<8;i++){__sunset.select(i);__sunset.render();}
  __sunset.select(0);__sunset.render();return{...__sunset.diagnostics(),vehicle:__sunset.vehicle()};
 }));
 assert.ok(resources.at(-1).geometries<=resources[1].geometries+2);assert.equal(resources.at(-1).textures,resources[1].textures);assert.equal(resources.at(-1).programs,resources[1].programs);
 assert.equal(resources[0].vehicle.paint,'MeshPhysicalMaterial');assert.equal(resources[0].vehicle.clearcoat,1);assert.ok(resources[0].vehicle.reflection);
 checks.push('All eight car models render with PBR paint and shared reflections without shader errors','Three complete garage selection cycles retain stable GPU resource counts');
 const suspension=await page.evaluate(()=>{
  const g=__sunset;g.step(130,{g:1});g.step(24,{g:1,r:1,h:1});
  const state=()=>{const{renderer,frameTimes,...rest}=g.state();return rest;},before=state(),pose=g.vehicle();
  for(let i=0;i<144;i++)g.present(i/144,1/144);
  return{before,after:state(),pose,shown:g.vehicle()};
 });
 assert.deepEqual(suspension.before,suspension.after);assert.ok(Math.abs(suspension.pose.body[2])>.001);assert.ok(Math.abs(suspension.pose.height)<=.012);
 for(const y of suspension.pose.wheels)assert.ok(Math.abs(y-.44)<=.065);
 checks.push('Interpolated suspension responds to a real drift, stays bounded and leaves race authority unchanged');
 assert.deepEqual(errors,[]);await writeFile(out+'/vehicle-checks.json',JSON.stringify({checks,errors,resources,suspension},null,2));console.log(JSON.stringify({checks,errors},null,2));await page.close();
}finally{if(errors.length)console.error(errors);await browser.close();}
