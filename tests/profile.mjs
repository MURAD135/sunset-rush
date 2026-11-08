import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.env.PROFILE_LABEL||'before',url=process.env.GAME_URL||'http://localhost:5191',out='artifacts/phase2';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const hooks=`\nif(window.__sunset){window.__freezeRender=true;const profilePixel=new Uint8Array(4);__sunset.profile=(options={})=>{
  if(typeof prepareRender==='function')prepareRender(0);
  if(options.shadow!==undefined)sun.castShadow=options.shadow;
  if(options.water!==undefined)rc.children.forEach(m=>{if(m.material===rc.userData.water)m.visible=options.water;});
  if(options.cars!==undefined){car.visible=options.cars;ai.forEach(a=>a.m.visible=options.cars);}
  if(options.ratio!==undefined){rd.setPixelRatio(options.ratio);rs();}
  if(rc.userData.water)rc.userData.water.uniforms.time.value=0;
  skyM.position.copy(cam.position);sunS.position.set(cam.position.x+330,cam.position.y+80,cam.position.z+600);
  rd.shadowMap.needsUpdate=true;rd.info.autoReset=false;rd.info.reset();const t=performance.now();rd.render(sc,cam);
  const context=rd.getContext();context.readPixels(context.drawingBufferWidth>>1,context.drawingBufferHeight>>1,1,1,context.RGBA,context.UNSIGNED_BYTE,profilePixel);
  const gl=rd.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return{ms:performance.now()-t,calls:rd.info.render.calls,triangles:rd.info.render.triangles,geometries:rd.info.memory.geometries,textures:rd.info.memory.textures,programs:rd.info.programs.length,
    environment:{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webglVersion:gl.getParameter(gl.VERSION),heapUsed:performance.memory?.usedJSHeapSize??null,heapLimit:performance.memory?.jsHeapSizeLimit??null,gpuMemoryBytes:null}};
};}`;
await page.addInitScript(()=>{let seed=135;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
await page.route('**/src/game.js',async route=>{
 const response=await route.fetch();let source=await response.text();source=source.replace('  rd.render(sc,cam);','  if(!window.__freezeRender)rd.render(sc,cam);');await route.fulfill({response,body:source+hooks});
});
try{
  await page.goto(url+'/?test=1');await page.waitForFunction(()=>window.__sunset?.profile);
  await page.evaluate(()=>{__sunset.quality(1);__sunset.start();__sunset.step(190);__sunset.step(70,{g:1,l:.25});});
  let view;
  if(label==='before'){view=await page.evaluate(()=>__sunset.view());await writeFile(`${out}/reference-view.json`,JSON.stringify(view,null,2));}
  else {view=JSON.parse(await readFile(`${out}/reference-view.json`,'utf8'));await page.evaluate(v=>__sunset.view(v),view);}
  await page.addStyleTag({content:'#pp{visibility:hidden}'});
  const samples=[];
  for(const variant of [
    {name:'medium-full',shadow:true,water:true,cars:true,ratio:1},
    {name:'no-shadows',shadow:false,water:true,cars:true,ratio:1},
    {name:'no-water',shadow:false,water:false,cars:true,ratio:1},
    {name:'no-cars',shadow:false,water:true,cars:false,ratio:1},
    {name:'half-resolution',shadow:false,water:true,cars:true,ratio:.5}
  ]){
    const rows=await page.evaluate(variant=>{const rows=[];for(let i=0;i<23;i++){const r=__sunset.profile(variant);if(i>=3)rows.push(r);}return rows;},variant);
    const times=rows.map(x=>x.ms).sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/times.length;
    samples.push({variant:variant.name,meanMs:mean,fpsEquivalent:1000/mean,p95Ms:times[Math.ceil(times.length*.95)-1],p99Ms:times[Math.ceil(times.length*.99)-1],...rows.at(-1),ms:undefined,rawMs:rows.map(r=>r.ms)});console.log(label,JSON.stringify(samples.at(-1)));
    if(variant.name==='medium-full')await page.screenshot({path:`${out}/${label}-matched.png`});
  }
  const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
  const simulationMs=await page.evaluate(()=>{const t=performance.now();__sunset.step(1200,{g:1,r:.25});return performance.now()-t;});
  const {profile}=await cdp.send('Profiler.stop');
  const cpu=profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,18).map(n=>({fn:n.callFrame.functionName,file:n.callFrame.url.split('/').at(-1),hits:n.hitCount}));
  const restarts=[];
  for(let i=0;i<5;i++)restarts.push(await page.evaluate(()=>{const t=performance.now();__sunset.restart();const buildMs=performance.now()-t;const r=__sunset.profile({shadow:true,water:true,cars:true,ratio:1});return{buildMs,geometries:r.geometries,textures:r.textures,programs:r.programs};}));
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/${label}-profile.json`,JSON.stringify({label,viewport:{width:960,height:600,dpr:1},quality:'Medium',seed:135,view,samples,simulation:{steps:1200,cpuMs:simulationMs,top:cpu},restarts,errors,method:'20 synchronous WebGL render + 1-pixel readback samples per variant after 3 warmups. Static camera and simulation, seeded geometry, fixed water phase. Shadows forced fresh for every sample; renderer counters include the shadow pass. A readback is required because gl.finish alone returned command-submission timings on this Chromium. CPU sampling covers 1200 actual fixed simulation ticks. Software-renderer timings are not physical GPU FPS; 20 samples give coarse P95/P99 estimates.'},null,2));
}finally{await browser.close();}
