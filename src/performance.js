// Legacy quality IDs are retained for saved preferences and the existing QA hooks.
export const QUALITY = [
  {name:'High',dpr:1.75,shadow:1024,shadowHz:30,particles:150,lines:36,rain:750,lod:65},
  {name:'Medium',dpr:1.25,shadow:512,shadowHz:24,particles:100,lines:20,rain:500,lod:36},
  {name:'Low',dpr:.85,shadow:0,shadowHz:0,particles:60,lines:12,rain:250,lod:24},
  {name:'Ultra',dpr:2,shadow:1536,shadowHz:60,particles:150,lines:36,rain:900,lod:95},
];
export const QUALITY_MENU=[null,2,1,0,3];

export class FrameMetrics {
  constructor(capacity=300){this.values=new Float64Array(capacity);this.reset();}
  reset(){this.count=0;this.cursor=0;this.simulationCpuMs=0;this.renderCpuMs=0;}
  add(frameMs,simulationCpuMs=0,renderCpuMs=0){
    if(!Number.isFinite(frameMs)||frameMs<=0)return;
    this.values[this.cursor]=frameMs;this.cursor=(this.cursor+1)%this.values.length;
    this.count=Math.min(this.count+1,this.values.length);
    this.simulationCpuMs=simulationCpuMs;this.renderCpuMs=renderCpuMs;
  }
  frames(){const result=[];for(let i=0;i<this.count;i++)result.push(this.values[(this.cursor-this.count+i+this.values.length)%this.values.length]);return result;}
  snapshot(info,memory){
    const sorted=this.frames().sort((a,b)=>a-b);
    const mean=sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:0;
    return{samples:this.count,fps:mean?1000/mean:0,meanMs:mean,
      p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]||0,p99Ms:sorted[Math.max(0,Math.ceil(sorted.length*.99)-1)]||0,
      simulationCpuMs:this.simulationCpuMs,renderSubmissionCpuMs:this.renderCpuMs,
      calls:info?.render.calls??0,triangles:info?.render.triangles??0,geometries:info?.memory.geometries??0,textures:info?.memory.textures??0,programs:info?.programs?.length??0,
      heapUsedBytes:memory?.usedJSHeapSize??null,heapLimitBytes:memory?.jsHeapSizeLimit??null,
      heapAvailableBytes:memory?Math.max(0,memory.jsHeapSizeLimit-memory.usedJSHeapSize):null,gpuMemoryBytes:null};
  }
}

export class DynamicResolution {
  constructor(targetFps=60){this.targetFps=targetFps;this.reset();}
  reset(){this.scale=1;this.goal=1;this.mean=1000/this.targetFps;this.over=0;this.under=0;this.cooldown=1;}
  update(frameMs,elapsed){
    if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>3000||!Number.isFinite(elapsed)||elapsed<=0)return this.scale;
    const dt=Math.min(elapsed,.5),budget=1000/this.targetFps;
    this.mean+=(frameMs-this.mean)*(-Math.expm1(-dt/.65));
    this.cooldown=Math.max(0,this.cooldown-dt);
    this.over=this.mean>budget*1.14?this.over+dt:0;
    this.under=this.mean<budget*.78?this.under+dt:0;
    if(this.cooldown===0){
      if(this.over>.8){this.goal=Math.max(.6,this.goal-.08);this.over=0;this.cooldown=1.5;}
      else if(this.under>3){this.goal=Math.min(1,this.goal+.04);this.under=0;this.cooldown=2.5;}
    }
    this.scale+=(this.goal-this.scale)*(-Math.expm1(-dt*2));
    return this.scale;
  }
}
