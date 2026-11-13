// CPU serialization only. This deliberately excludes physical storage/GPU timing.
import {SaveStore} from '../src/save-system.js';
import {writeFile,mkdir} from 'node:fs/promises';
const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),key:i=>[...data.keys()][i],get length(){return data.size;}};
const save=new SaveStore(storage,{schedule:()=>0,cancel:()=>{}});
const ghost=JSON.stringify(Array.from({length:4000},(_,i)=>[1700-i,i*2,i]));
for(let i=0;i<11;i++)save.setItem('sunset-g'+i,ghost);
const samples=[];
for(let i=0;i<30;i++){save.setItem('sunset-up',JSON.stringify({u:[0,0,0,0,0],c:i}));const t=performance.now();save.flush();samples.push(performance.now()-t);}
samples.sort((a,b)=>a-b);
const report={environment:`${process.version} ${process.platform}; in-memory adapter, excludes physical disk/WebKit and GPU`,scenario:'11 maximum-length 4000-point ghosts, 30 serializations/checksums/readbacks',chars:save.export().length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:samples[28],p99Ms:samples[29]};
await mkdir('artifacts/phase3',{recursive:true});await writeFile('artifacts/phase3/save-cost.json',JSON.stringify(report,null,2));console.log(report);
