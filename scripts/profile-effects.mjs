// CPU-only comparison. No rasterization, GPU timing, physical battery or FPS claim.
import {RaceParticles} from '../src/effects.js';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
if(!process.env.BASELINE_EFFECTS)throw Error('Provide BASELINE_EFFECTS pointing to the preserved baseline src/effects.js');
const {RaceParticles:Before}=await import(pathToFileURL(process.env.BASELINE_EFFECTS));
function measure(Pool){
 const pool=new Pool(null,150),samples=[];
 for(let frame=0;frame<3600;frame++){
  const start=performance.now();
  if(frame%2===0){for(let n=0;n<2;n++)pool.emit(n,1,0,.5,.6,.5,.7,.3,.3,.32,0);pool.step(1/60);}
  pool.present?.((frame%2)*.5);
  if(frame>=600)samples.push(performance.now()-start);
 }
 samples.sort((a,b)=>a-b);
 const arrays=Object.values(pool).filter(ArrayBuffer.isView);
 return{samples:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:samples[Math.floor(samples.length*.95)],p99Ms:samples[Math.floor(samples.length*.99)],cpuTypedArrayBytes:arrays.reduce((n,a)=>n+a.byteLength,0),gpuAttributeBytes:Object.values(pool.mesh.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)};
}
const report={environment:`${process.version} ${process.platform}; Node CPU only, no browser or GPU`,scenario:'150 capacity, two smoke births per 60 Hz step, 120 Hz presentation, 600 warmup callbacks then 3000 samples',before:measure(Before),after:measure(RaceParticles)};
await mkdir('artifacts/phase3/effects',{recursive:true});await writeFile('artifacts/phase3/effects/cpu.json',JSON.stringify(report,null,2));console.log(report);
