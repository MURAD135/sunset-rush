import * as THREE from 'three';
import './style.css';
import './coast.css';
import { ArcadePhysics, FixedClock, FIXED_STEP } from './physics.js';
import { RaceProgress, rankRacers, wrapAngle, TAU } from './progress.js';
import { installInput } from './input.js';
import { PoseHistory, ChaseCamera } from './presentation.js';
import { FrameMetrics, DynamicResolution, QUALITY, QUALITY_MENU } from './performance.js';
import { installCarLOD, updateCarLOD } from './graphics.js';
import { addSkyClouds } from './environment.js';
import { createSportBody, createCabinGeometry, createSunsetEnvironment, animateChassis } from './car-visuals.js';
import { buildCoast } from './coast.js';
import { disposeGroup, batchCar, correctColors } from './resources.js';

const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const cv=$('c');let rd;
try{rd=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});}catch(error){$('graphicsError').hidden=false;throw error;}
rd.setPixelRatio(Math.min(devicePixelRatio,2));
rd.outputEncoding=THREE.sRGBEncoding;rd.toneMapping=THREE.ACESFilmicToneMapping;rd.toneMappingExposure=1.05;
const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(48,1,.1,2500);
const frameMetrics=new FrameMetrics(),resolution=new DynamicResolution(matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,innerHeight)<600?30:60);
let metricTime=0,shadowTime=Infinity,resolutionTime=0,reducedEffects=false,dynamicResolution=true,trackBuildKey='',trackBuilds=0,environmentTime=0,environmentOverride=null;
try{const p=JSON.parse(localStorage.getItem('sunset-graphics'));if(p){reducedEffects=!!p.reduced;dynamicResolution=p.dynamic!==false;if([30,60,120].includes(p.target))resolution.targetFps=p.target;resolution.reset();}}catch(e){}
sc.background=new THREE.Color('#171a30');sc.fog=new THREE.Fog('#171a30',30,140);
function rs(){rd.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener('resize',rs);rs();
const hemi=new THREE.HemisphereLight(0xfff0dc,0x30365a,.95);sc.add(hemi);
const hs=new THREE.SpotLight(0xfff2c4,2,100,.55,.5);hs.visible=false;sc.add(hs,hs.target);
const sun=new THREE.DirectionalLight(0xffffff,.9);sun.position.set(30,50,20);sc.add(sun,sun.target);rd.shadowMap.enabled=true;rd.shadowMap.autoUpdate=false;rd.info.autoReset=false;rd.shadowMap.type=THREE.PCFSoftShadowMap;sun.castShadow=true;const sc2=sun.shadow.camera;sc2.left=sc2.bottom=-16;sc2.right=sc2.top=16;sc2.near=1;sc2.far=140;sun.shadow.bias=-.0006;sun.shadow.mapSize.set(1024,1024);
const rim=new THREE.DirectionalLight(0x88aaff,.5);rim.position.set(-20,12,-30);sc.add(rim);

/* ---------- Car ---------- */
const TY=[
{n:'جي تي',w:2,h:.55,c:.55,wing:.5,wy:1.2,mx:58,ac:26,hd:1,off:18,s:[3,3,3]},
{n:'هايبر',w:2.2,h:.42,c:.42,wing:.7,wy:1.1,mx:66,ac:30,hd:.85,off:14,s:[5,4,2]},
{n:'رالي',w:1.9,h:.7,c:.6,wing:.35,wy:1.4,mx:52,ac:24,hd:1.35,off:32,s:[2,2,5]},
{n:'إيطالي',w:2.1,h:.45,c:.42,cl:1.6,cz:.35,wing:.6,wy:1.05,mx:64,ac:29,hd:.95,off:15,ex:1,sp:1,s:[4,4,3]},
{n:'بريطاني',w:2.2,h:.4,c:.4,cl:1.5,cz:.5,wing:.85,wy:1.18,mx:68,ac:32,hd:.9,off:13,ex:1,sp:1,s:[5,5,3]},
{n:'ألماني',w:2,h:.62,c:.62,cl:2.3,cz:-.2,wing:.3,wy:1.3,mx:56,ac:27,hd:1.15,off:20,gr:1,s:[3,3,4]},
{n:'عضلات',w:2.1,h:.62,c:.5,cl:1.4,cz:-.55,wing:.3,wy:1.2,mx:60,ac:30,hd:.9,off:18,gr:1,s:[4,5,2]},
{n:'كهربائية',w:2,h:.5,c:.48,cl:2.2,cz:-.15,wing:.2,wy:1.1,mx:60,ac:34,hd:1.05,off:16,sp:1,s:[4,5,4]}];
const ENV=createSunsetEnvironment();
// Bake roughness-aware reflections once. Byte-target PMREM in r128 also works without
// floating-point render targets on WebGL 1. Keep the cube for Phong trim/rims.
const envGenerator=new THREE.PMREMGenerator(rd),PAINT_ENV=envGenerator.fromCubemap(ENV);envGenerator.dispose();
const GLW=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
const ASP=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#c4c4c8';x.fillRect(0,0,128,128);for(let i=0;i<2400;i++){const v=140+Math.random()*100|0;x.fillStyle='rgb('+v+','+v+','+(v+4)+')';x.fillRect(Math.random()*128,Math.random()*128,1+Math.random()*1.6,1+Math.random()*1.6)}x.fillStyle='rgba(0,0,0,.13)';x.fillRect(28,0,22,128);x.fillRect(78,0,22,128);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t})();
const GRS=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#bdbdbd';x.fillRect(0,0,128,128);for(let i=0;i<1800;i++){const v=150+Math.random()*100|0;x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(Math.random()*128,Math.random()*128,2,2)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(140,140);return t})();
const BEAMG=(()=>{const g=new THREE.ConeGeometry(1.1,10,16,1,true).rotateX(-Math.PI/2).translate(0,0,5),p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const k=Math.pow(Math.max(0,1-p.getZ(i)/10),1.6)*.3;c[i*3]=k;c[i*3+1]=k*.93;c[i*3+2]=k*.75}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g})(),BEAMM=new THREE.MeshBasicMaterial({vertexColors:true,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false});
function makeCar(col,ty=0,o={}){
  const F=[[90,.55],[8,.12],[150,.9]][o.fin|0],T=TY[ty],g=new THREE.Group(),w=T.w,yb=.3,yh=yb+T.h+.05,CL=T.cl||1.9,cz=T.cz==null?-.3:T.cz,yr=yh+T.c*.86,r=cz-CL/2,f=cz+CL/2,tp=yh+.125,gx=w/2-.5,
  bm=new THREE.MeshPhysicalMaterial({color:col,metalness:.52,roughness:o.fin===1?.65:.23,clearcoat:o.fin===1?0:1,clearcoatRoughness:.14,envMap:PAINT_ENV.texture,envMapIntensity:.95}),
  gl=new THREE.MeshPhysicalMaterial({color:0x203643,metalness:.25,roughness:.09,envMap:PAINT_ENV.texture,envMapIntensity:1.1,clearcoat:1}),
  dk=new THREE.MeshPhongMaterial({color:0x101218,shininess:50}),
  add=(geo,mat,x,y,z,p=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;p.add(m);return m},
  B=(a,b,c)=>new THREE.BoxGeometry(a,b,c);
  add(createSportBody(w,T.h),bm,0,0,0);
  add(createCabinGeometry(w-.32,yh-.02,T.c*.86,CL,cz),gl,0,0,0);
  const rl=Math.max(.3,f-.7-r-.5),rcz=(r+.5+f-.7)/2;add(B((w-.32)*.74,.045,rl+.15),bm,0,yr+.005,rcz);
  for(const side of [-1,1])for(const front of [false,true]){
    const a=new THREE.Vector3(side*(w-.32)/2,yh-.02,front?f:r),b=new THREE.Vector3(side*(w-.32)*.37,yr-.02,front?f-.62:r+.43),d=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
    const pillar=add(B(.04,d.length(),.045),bm,mid.x,mid.y,mid.z);pillar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  }
  const hl=new THREE.MeshBasicMaterial({color:0xfff3cf}),tl=new THREE.MeshBasicMaterial({color:0xaa1010}),mt=new THREE.MeshPhongMaterial({color:0xb9bcc6,shininess:120,envMap:ENV,reflectivity:.6,combine:THREE.MixOperation}),tls=[],bms=[],
  sp=(x,z,c,s)=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:GLW,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.8}));m.scale.set(s,s,1);m.position.set(x,yb+.4,z);g.add(m);return m};
  [-1,1].forEach(s=>{add(B(.5,.1,.1),hl,s*gx,yb+.38,2.27);add(B(.5,.07,.1),tl,s*gx,yb+.42,-2.3);add(B(.08,.09,2.4),dk,s*(w/2+.02),yb,-.2);add(B(.22,.1,.14),bm,s*(w/2+.1),yh+.14,f-.45);add(new THREE.CylinderGeometry(.07,.07,.3,10).rotateX(Math.PI/2),mt,s*.5,yb+.1,-2.3);add(B(.34,.02,.55),dk,s*.45,yh-.05,f+.5);sp(s*gx,2.3,0xfff0c0,.55);tls.push(sp(s*gx,-2.31,0xff2020,.5));const bz=new THREE.Mesh(BEAMG,BEAMM);bz.position.set(s*gx,yb+.38,2.3);bz.rotation.y=s*.06;bz.scale.set(1,.6,1);bz.visible=false;g.add(bz);bms.push(bz)});
  if(T.sp)add(B(w+.1,.06,.4),dk,0,yb+.08,2.25);if(T.ex)[-1,1].forEach(s=>add(B(.1,.22,.9),dk,s*(w/2+.02),yb+.45,-.9));if(T.gr)[-.32,.32].forEach(x=>add(B(.42,.18,.08),dk,x,yb+.3,2.3));
  const wy=T.wy+(o.wing==2?.35:0);if(o.wing!=0){add(B(w,.08,T.wing),bm,0,wy,-2.05);[-.8,.8].forEach(x=>add(B(.1,wy-yh+.1,.2),dk,x,(wy+yh)/2,-2))}
  if(o.stripe){const sm=new THREE.MeshPhongMaterial({color:o.stripe,shininess:60});add(createSportBody(.34,T.h),sm,0,.006,0);add(B(.34,.012,rl),sm,0,yr+.035,rcz)}
  const sk=new THREE.MeshPhongMaterial({color:0x23252d,shininess:30}),cal=new THREE.MeshPhongMaterial({color:0xd8202a,shininess:80}),dkm=new THREE.MeshPhongMaterial({color:0x4a4d58,shininess:90}),swm=new THREE.MeshLambertMaterial({color:0x272a33}),wp=new THREE.MeshBasicMaterial({color:0xe9e9e4}),
  dsc=new THREE.CylinderGeometry(.27,.27,.04,20).rotateZ(Math.PI/2),sw=new THREE.TorusGeometry(.39,.03,6,24).rotateY(Math.PI/2);
  [-.3,.3].forEach(x=>{add(B(.42,.1,.4),sk,x,yh+.16,rcz-.2);add(B(.4,.28,.1),sk,x,yh+.25,rcz-.36)});
  add(B(w-.8,.1,.3),sk,0,yh+.2,f-.7);add(new THREE.TorusGeometry(.13,.025,6,14).rotateX(-1.1),dk,-.3,yh+.3,f-.95);
  [-1,1].forEach(s=>{add(B(.05,T.c*.86,.09),bm,s*(w/2-.28),yh+T.c*.43,rcz).rotation.z=s*.28;add(B(.012,.3,.02),dk,s*(w/2-.02),yh-.13,f-.35);add(B(.012,.3,.02),dk,s*(w/2-.02),yh-.13,r+.1);add(B(.025,.045,.2),mt,s*(w/2-.01),yh-.02,f-.8);add(B(.62,.16,.06),dk,s*gx,yb+.38,2.23)});
  add(B(.04,.1,.25),dk,0,yr+.07,r+.8);add(B(w-1,.12,.08),dk,0,yb+.2,2.3);add(B(.5,.16,.02),wp,0,yb+.28,-2.33);add(B(w-.5,.04,.03),tl,0,yb+.12,-2.28);
  add(B(w-.38,.15,.28),dk,0,.34,-2.16);
  for(const x of [-.65,-.32,0,.32,.65])add(B(.035,.14,.38),dk,x,.28,-2.1);
  [-1,1].forEach(s=>{add(B(.08,.18,.045),tl,s*(w/2-.25),.66,-2.25);add(B(.5,.035,.06),hl,s*gx,.73,2.16);});
  if(T.ex)add(B(.5,.05,.35),dk,0,yh-.04,f+.45);
  const tg=new THREE.CylinderGeometry(.44,.44,.36,24).rotateZ(Math.PI/2),hg=new THREE.CylinderGeometry(.115,.115,.38,12).rotateZ(Math.PI/2),rg=new THREE.TorusGeometry(.3,.035,6,20).rotateY(Math.PI/2),tm=new THREE.MeshLambertMaterial({color:0x15161c}),hm=new THREE.MeshPhongMaterial({color:o.rim||0xc9ccd6,shininess:120,envMap:ENV,reflectivity:.6,combine:THREE.MixOperation}),wh=[];
  [[-1,1.4],[1,1.4],[-1,-1.4],[1,-1.4]].forEach(([s,z])=>{const wg=new THREE.Group();wg.rotation.order='YXZ';wg.position.set(s*(w/2+.02),.44,z);add(tg,tm,0,0,0,wg);add(hg,hm,s*.01,0,0,wg);add(rg,hm,s*.19,0,0,wg);add(dsc,hm,s*.08,0,0,wg);add(sw,tm,s*.17,0,0,wg);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;add(B(.045,.24,.055),hm,s*.2,Math.cos(a)*.18,Math.sin(a)*.18,wg).rotation.x=a;}g.add(wg);wh.push(wg);add(B(.1,.14,.22),cal,s*(w/2-.12),.62,z);add(new THREE.TorusGeometry(.5,.075,6,18,Math.PI).rotateY(Math.PI/2),bm,s*(w/2+.06),.44,z)});
  const fm=new THREE.MeshBasicMaterial({color:0x70baff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}),fl=[-.55,.55].map(x=>{const c=add(new THREE.ConeGeometry(.22,1.4,10).rotateX(-Math.PI/2),fm,x,yb+.15,-2.9);c.visible=false;return c});
  const shd=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.25}));shd.rotation.x=-Math.PI/2;shd.scale.set(1.5,2.8,1);shd.position.y=.03;g.add(shd);
  if(o.glow){const gm=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:o.glow,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));gm.rotation.x=-Math.PI/2;gm.scale.set(1.35,2.6,1);gm.position.y=.05;g.add(gm)}
  g.userData={bm,wh,fl,tl,tls,bs:bms,width:w,shape:{height:T.h,cabin:T.c*.86,length:CL,center:cz}};
  wh.forEach(batchCar);batchCar(g);
  const body=new THREE.Group();for(const part of [...g.children])if(part!==shd&&!wh.includes(part))body.add(part);g.add(body);g.userData.body=body;
  correctColors(g);return g;
}
function makeCarOld(col,ty=0,o={}){const F=[[90,0x777777],[8,0x111111],[150,0xcccccc]][o.fin|0],T=TY[ty],cy=T.h+T.c/2+.225;
  const g=new THREE.Group(),bm=new THREE.MeshPhongMaterial({color:col,shininess:F[0],specular:F[1]}),
  dk=new THREE.MeshPhongMaterial({color:0x10131f,shininess:120,specular:0x99aabb}),
  add=(geo,mat,x,y,z,p=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);p.add(m);return m},
  B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  add(B(T.w,T.h,4.4),bm,0,.345+T.h/2,0);add(B(T.w-.2,.2,1.5),bm,0,.345+T.h,1.25);
  const CL=T.cl||1.9,CZ=T.cz==null?-.3:T.cz;add(B(T.w-.36,T.c,CL),dk,0,cy,CZ);add(B(T.w-.5,.1,CL-.3),bm,0,cy+T.c/2+.035,CZ);
  const wy=T.wy+(o.wing==2?.35:0),W1=o.wing!=0;if(W1)add(B(T.w,.08,T.wing),bm,0,wy,-2.1);
  if(W1)[-.8,.8].forEach(x=>add(B(.1,wy-.8,.2),dk,x,(wy+.8)/2,-2));
  if(T.sp)add(B(T.w+.1,.06,.4),dk,0,.4,2.3);if(T.ex)[-1,1].forEach(s=>add(B(.1,.22,.9),dk,s*(T.w/2+.01),.66,-.9));if(T.gr)[-.32,.32].forEach(x=>add(B(.42,.2,.08),dk,x,.58,2.22));
  if(o.stripe){const sm=new THREE.MeshPhongMaterial({color:o.stripe,shininess:60});add(B(.34,.012,1.5),sm,0,.345+T.h+.106,1.25);add(B(.34,.012,1.6),sm,0,cy+T.c/2+.092,-.3);add(B(.34,.012,.9),sm,0,.345+T.h+.006,-1.725)}
  const hl=new THREE.MeshBasicMaterial({color:0xfff2c4}),tl=new THREE.MeshBasicMaterial({color:0xff2a2a});
  [-.65,.65].forEach(x=>{add(B(.5,.18,.1),hl,x,.7,2.2);add(B(.6,.14,.1),tl,x,.72,-2.2)});
  const tg=new THREE.CylinderGeometry(.44,.44,.36,20).rotateZ(Math.PI/2),hg=new THREE.CylinderGeometry(.3,.3,.38,16).rotateZ(Math.PI/2),
  tm=new THREE.MeshLambertMaterial({color:0x15161c}),hm=new THREE.MeshPhongMaterial({color:o.rim||0xc9ccd6,shininess:100}),wh=[];
  [[-1,1.4],[1,1.4],[-1,-1.4],[1,-1.4]].forEach(([s,z])=>{const x=s*(T.w/2+.05),w=new THREE.Group();w.position.set(x,.44,z);add(tg,tm,0,0,0,w);add(hg,hm,0,0,0,w);g.add(w);wh.push(w)});
  const sh=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.35}));
  sh.rotation.x=-Math.PI/2;sh.scale.set(1.5,2.8,1);sh.position.y=.03;g.add(sh);
  const fm=new THREE.MeshBasicMaterial({color:0x7ab8ff}),fl=[-.55,.55].map(x=>{const c=add(new THREE.ConeGeometry(.22,1.4,10).rotateX(-Math.PI/2),fm,x,.62,-2.9);c.visible=false;return c});
  if(o.glow){const gm=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:o.glow,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));gm.rotation.x=-Math.PI/2;gm.scale.set(1.35,2.6,1);gm.position.y=.05;g.add(gm)}
  g.userData={bm,wh,fl};return g;
}

/* ---------- Garage ---------- */
const gar=new THREE.Group();sc.add(gar);
const fl=new THREE.Mesh(new THREE.CircleGeometry(40,48),new THREE.MeshLambertMaterial({color:0x1f2340}));fl.rotation.x=-Math.PI/2;fl.position.y=-.21;gar.add(fl);
const tt=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,.2,56),new THREE.MeshPhongMaterial({color:0x2c3157,shininess:60}));tt.position.y=-.1;tt.receiveShadow=true;gar.add(tt);
const rg=new THREE.Mesh(new THREE.RingGeometry(3.7,3.85,64),new THREE.MeshBasicMaterial({color:0xffb547}));rg.rotation.x=-Math.PI/2;rg.position.y=.01;gar.add(rg);

/* ---------- Track ---------- */
let R=110,W=18,LAPS=3,TK={a:0,k:2};let RB=0,RG=[0,6.2832],NB=0;const nm=t=>((t%6.2832)+6.2832)%6.2832,fu=t=>{const u=(nm(t)-TK.f[0])/(TK.f[1]-TK.f[0]);return u>0&&u<1?u:-1},
rad=(t,b=RB)=>{let r=R*(1+TK.a*Math.cos(TK.k*t));const u=TK.f?fu(t):-1;if(u>0&&!b)r+=TK.f[2]*Math.pow(Math.sin(Math.PI*u),2);return r},
dr=(t,b=RB)=>{let d=-R*TK.a*TK.k*Math.sin(TK.k*t);const u=TK.f?fu(t):-1;if(u>0&&!b)d+=TK.f[2]*Math.PI/(TK.f[1]-TK.f[0])*Math.sin(2*Math.PI*u);return d};
function cl(t,o=0,b=RB){const r=rad(t,b)+o,d=dr(t,b);return[r*Math.cos(t),r*Math.sin(t),Math.atan2(d*Math.cos(t)-r*Math.sin(t),d*Math.sin(t)+r*Math.cos(t))]}
function offd(x,z){const t=Math.atan2(z,x),h=Math.hypot(x,z),e=b=>{const r=rad(t,b);return Math.abs(h-r)*r/Math.hypot(r,dr(t,b))},a=e(0);NB=0;if(TK.f&&fu(t)>0){const c=e(1);if(c<a){NB=1;return c}}return a}
const rc=new THREE.Group();sc.add(rc);
function buildTrack(){trackBuilds++;trackBuildKey=[TR.indexOf(TK),thm,sfc,wxs].join(':');disposeGroup(rc,new Set([ASP,GRS,GLW]));rc.userData.water=null;rc.userData.coast=null;
const gr=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshLambertMaterial({color:TH[thm].gr,map:GRS}));gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;if(!TK.coast)rc.add(gr);else {gr.geometry.dispose();gr.material.dispose();}
const ring=(a,b,c,y,md,ph,mp)=>{const pos=[],uv=[],idx=[],N=200;for(let i=0;i<=N;i++){const t=RG[0]+(RG[1]-RG[0])*i/N,f=Math.hypot(rad(t),dr(t))/rad(t),p=cl(t,(a-R)*f),q=cl(t,(b-R)*f),v=i/N*R*.35;pos.push(p[0],y,p[1],q[0],y,q[1]);uv.push(0,v,1,v);if(i<N&&(!md||(i%md<md/2)==(ph==1)))idx.push(2*i,2*i+1,2*i+2,2*i+1,2*i+3,2*i+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:c,map:mp||null,side:THREE.DoubleSide}));m.receiveShadow=true;rc.add(m)};
const wall=(o,h,c,ph)=>{const pos=[],idx=[],N=200;for(let i=0;i<=N;i++){const t=RG[0]+(RG[1]-RG[0])*i/N,f=Math.hypot(rad(t),dr(t))/rad(t),p=cl(t,o*f);pos.push(p[0],0,p[1],p[0],h,p[1]);if(i<N&&(i%8<4)==(ph==1)&&!(TK.f&&o<0&&RB==0&&fu(t)>0))idx.push(2*i,2*i+1,2*i+2,2*i+1,2*i+3,2*i+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide}));m.castShadow=true;rc.add(m)};
const ring0=(a,b,c,y)=>{const pos=[],idx=[],N=200;for(let i=0;i<=N;i++){const t=i/N*6.2832,f=Math.hypot(rad(t),dr(t))/rad(t),p=cl(t,(a-R)*f),q=cl(t,(b-R)*f);pos.push(p[0],y,p[1],q[0],y,q[1]);if(i<N)idx.push(2*i,2*i+1,2*i+2,2*i+1,2*i+3,2*i+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();rc.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide})))};
ring(R-W/2-4,R+W/2+4,0x77736b,.015);ring(R-W/2,R+W/2,[TH[thm].as,0x8a6a45,0x5a4128][sfc],.02,0,0,ASP);[-1,1].forEach(s=>{const o=s*(W/2),o2=o+s*1.4;ring(Math.min(R+o,R+o2),Math.max(R+o,R+o2),0xe63946,.03,6,1);ring(Math.min(R+o,R+o2),Math.max(R+o,R+o2),0xf4f1ea,.03,6,0);ring(R+o-s*.7,R+o-s*.4,0xffffff,.035);wall(s*(W/2+4.2),.9,0xf4f1ea,1);wall(s*(W/2+4.2),.9,0xe63946,0)});ring(R-.18,R+.18,0xffe27a,.035,4,1);
const sl=new THREE.Mesh(new THREE.BoxGeometry(W,.05,1.6),new THREE.MeshBasicMaterial({color:0xffffff}));sl.position.set(rad(0),.05,0);rc.add(sl);
if(TK.coast){CRB=CRH=null;CR=[];IT.length=BP.length=PD.length=0;buildCoast(rc,{radius:R,width:W,point:cl,radial:rad});correctColors(rc);return;}
const tg1=new THREE.ConeGeometry(3,9,7),tg2=new THREE.CylinderGeometry(.5,.6,2.5,6),tm1=new THREE.MeshLambertMaterial({color:TH[thm].tr}),tm2=new THREE.MeshLambertMaterial({color:0x5a3b25});
for(let i=0;i<90;i++){const a=Math.random()*6.283;if(TK.f&&fu(a)>0)continue;const inn=Math.random()<.3,rr=rad(a),d=inn?Math.max(8,rr-W/2-14-Math.random()*rr*.4):rr+W/2+14+Math.random()*190;
  const t=new THREE.Mesh(tg1,tm1),k=new THREE.Mesh(tg2,tm2);t.position.set(Math.cos(a)*d,6.5,Math.sin(a)*d);k.position.set(t.position.x,1.2,t.position.z);const s=.8+Math.random()*.6;t.scale.setScalar(s);t.position.y=6.5*s;const t2=new THREE.Mesh(tg1,tm1);t2.scale.setScalar(s*.65);t2.position.set(t.position.x,t.position.y+4.2*s,t.position.z);t.castShadow=true;rc.add(t,k,t2)}
  const fo=t=>Math.hypot(rad(t),dr(t))/rad(t),lm=new THREE.MeshLambertMaterial({color:0x565b68}),lh=new THREE.MeshBasicMaterial({color:0xfff0c0}),lit=TH[thm].night||wxs==2;
  for(let i=0;i<14;i++){const t=i/14*6.2832,p=cl(t,(W/2+7)*fo(t)),po=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,9,6),lm),hd=new THREE.Mesh(new THREE.BoxGeometry(1.6,.25,.6),lh);po.position.set(p[0],4.5,p[1]);hd.position.set(p[0],9,p[1]);po.castShadow=true;rc.add(po,hd);if(lit){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLW,color:0xffe9a8,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));s.scale.set(10,10,1);s.position.set(p[0],8.8,p[1]);rc.add(s)}}
  const AD=['نيترو','سرعة','تيربو','سباق','وحش الطريق','بطل'],AC2=['#e63946','#3a86ff','#ffb547','#2a9d8f'];
  for(let i=0;i<8;i++){const t=(i+.5)/8*6.2832,c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');x.fillStyle=AC2[i%4];x.fillRect(0,0,256,96);x.fillStyle='rgba(255,255,255,.18)';x.fillRect(0,60,256,36);x.fillStyle='#fff';x.font='800 50px Tajawal,sans-serif';x.textAlign='center';x.fillText(tr(AD[i%6]),128,62);const p=cl(t,(W/2+14)*fo(t)),m=new THREE.Mesh(new THREE.PlaneGeometry(14,5.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)})),pl2=new THREE.Mesh(new THREE.BoxGeometry(.4,6,.4),lm);m.position.set(p[0],6,p[1]);m.rotation.y=Math.atan2(-Math.cos(t),-Math.sin(t));pl2.position.set(p[0],3,p[1]);rc.add(m,pl2)}
  const mtm=new THREE.MeshLambertMaterial({color:new THREE.Color(TH[thm].bg).multiplyScalar(.55).lerp(new THREE.Color(TH[thm].gr),.35)});for(let i=0;i<26;i++){const a=i/26*6.2832+Math.random()*.2,d=380+Math.random()*60,m=new THREE.Mesh(new THREE.ConeGeometry(70+Math.random()*60,60+Math.random()*80,6),mtm);m.position.set(Math.cos(a)*d,25,Math.sin(a)*d);rc.add(m)}
  CRB=CRH=null;CR=[];
  if(TK.f){const f0=TK.f[0],f1=TK.f[1];RB=1;RG=[f0-.02,f1+.02];ring(R-W/2-4,R+W/2+4,0x77736b,.015);ring(R-W/2,R+W/2,[TH[thm].as,0x8a6a45,0x5a4128][sfc],.021,0,0,ASP);ring(R-.18,R+.18,0xffe27a,.036,4,1);
    RG=[f0+(f1-f0)*.29,f0+(f1-f0)*.71];const pos=[],idx=[],col=[],N=60,M=14,HW=W/2+2.4;for(let i=0;i<=N;i++){const t=RG[0]+(RG[1]-RG[0])*i/N,ff=Math.hypot(rad(t),dr(t))/rad(t);for(let j=0;j<=M;j++){const a2=Math.PI*j/M,p=cl(t,HW*Math.cos(a2)*ff);pos.push(p[0],7.5*Math.pow(Math.sin(a2),.5)+.02,p[1]);const yl=i<=1||i>=N-1;col.push(yl?1:.32,yl?.8:.33,yl?.2:.37);if(i<N&&j<M){const k=i*(M+1)+j;idx.push(k,k+1,k+M+1,k+1,k+M+2,k+M+1)}}if(i%3==0){const p=cl(t,0),lt=new THREE.Mesh(new THREE.BoxGeometry(1.2,.15,.5),lh);lt.position.set(p[0],7.2,p[1]);lt.rotation.y=p[2];rc.add(lt)}}
    const tg3=new THREE.BufferGeometry();tg3.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));tg3.setAttribute('color',new THREE.Float32BufferAttribute(col,3));tg3.setIndex(idx);tg3.computeVertexNormals();const tn=new THREE.Mesh(tg3,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));tn.castShadow=true;rc.add(tn);RB=0;RG=[0,6.2832]}
  {const o0=W/2+6,pp2=[];RG=[-.16,.16];[[o0,1.2],[o0+3,2.6],[o0+6,4]].forEach(([o,h])=>{[0,1].forEach(q=>wall(o,h,0x7c7f8c,q));ring(R+o,R+o+3,0x9a9ca8,h);for(let t=-.14;t<=.14;t+=.012){const p=cl(t,(o+1.5)*fo(t));pp2.push([p[0],p[1],h,Math.random()*6.28,Math.atan2(-Math.cos(t),-Math.sin(t))])}});RG=[0,6.2832];
    for(let c=0;c<9;c++){let t=.5+Math.random()*5.6;if(TK.f&&fu(t)>0)t=.4;for(let j=0;j<10;j++){const t2=t+(Math.random()-.5)*.05,p=cl(t2,(W/2+7+Math.random()*4)*fo(t2));pp2.push([p[0],p[1],0,Math.random()*6.28,Math.atan2(-Math.cos(t2),-Math.sin(t2))])}}
    const n=pp2.length,cc=new THREE.Color(),sk2=[0xe8b894,0xc68d66,0x8d5a3b,0xf0c8a8];CRB=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,1,.35),new THREE.MeshLambertMaterial(),n);CRH=new THREE.InstancedMesh(new THREE.SphereGeometry(.2,8,6),new THREE.MeshLambertMaterial(),n);pp2.forEach((_,i)=>{CRB.setColorAt(i,cc.setHSL(Math.random(),.65,.5));CRH.setColorAt(i,cc.setHex(sk2[i%4]))});CRB.frustumCulled=CRH.frustumCulled=false;rc.add(CRB,CRH);CR=pp2}
  IT.length=0;{const mk=(k,t,o,m,r)=>{const p=cl(t,o);m.rotation.order='YXZ';m.position.x=p[0];m.position.z=p[1];m.rotation.y=p[2];rc.add(m);IT.push({k,x:p[0],z:p[1],r,m,on:1,t:0})},
    cg=new THREE.CylinderGeometry(.55,.55,.12,14).rotateX(Math.PI/2),cm=new THREE.MeshPhongMaterial({color:0xffc83d,emissive:0x6b4a00,shininess:120}),ng=new THREE.ConeGeometry(.35,.9,8),nm2=new THREE.MeshLambertMaterial({color:0xff7a1a}),og=new THREE.CircleGeometry(3,20).rotateX(-Math.PI/2),om=new THREE.MeshPhongMaterial({color:0x08080c,shininess:140,specular:0x8899aa}),rg2=new THREE.BoxGeometry(6,.6,7),rm2=new THREE.MeshLambertMaterial({color:0xffc94a});
    [.9,1.9,5.3,5.9].forEach(t0=>{for(let j=0;j<7;j++){const m=new THREE.Mesh(cg,cm);m.position.y=1.2;mk('c',t0+j*.014,Math.sin(j*.9)*W*.22,m,2)}});
    [1.3,2.6,5.1].forEach(t0=>{for(let j=0;j<3;j++){const m=new THREE.Mesh(ng,nm2);m.position.y=.45;mk('n',t0+j*.004,-W*.3+j*W*.06,m,1)}});
    [1.5,5.6].forEach(t0=>{const m=new THREE.Mesh(og,om);m.position.y=.05;mk('o',t0,W*.12,m,3)});
    [2.1,5.4].forEach(t0=>{const m=new THREE.Mesh(rg2,rm2);m.position.y=.2;m.rotation.x=-.1;mk('r',t0,0,m,3.4)})}
  BP.length=0;[1.6,3.4,5].forEach(u=>{const p=cl(u),m=new THREE.Mesh(new THREE.BoxGeometry(6,.05,4),new THREE.MeshBasicMaterial({color:0x35e0ff}));m.position.set(p[0],.07,p[1]);m.rotation.y=p[2];rc.add(m);BP.push({x:p[0],z:p[1]})});
  PD.length=0;if(sfc==2)for(let i=0;i<14;i++){const u=.7+Math.random()*4.9,p=cl(u,(Math.random()-.5)*W*.6),r=2.2+Math.random()*1.6,m=new THREE.Mesh(new THREE.CircleGeometry(r,16),new THREE.MeshBasicMaterial({color:0x3d2b1b}));m.rotation.x=-Math.PI/2;m.position.set(p[0],.045,p[1]);rc.add(m);PD.push({x:p[0],z:p[1],r})}}

/* ---------- Cars & state ---------- */
let car,ty=0,col='#18b8c1',dif=1,trk=10,thm=0,lps=3,wxs=0,sfc=0,hb=.95,lf=0;
const opt={fin:0,wing:1,stripe:0,rim:'#c9ccd6',glow:0},DF=[.88,1,1.1],TR=[{R:110,W:18,a:0,k:2},{R:130,W:18,a:.22,k:2},{R:135,W:17,a:.18,k:3},{R:140,W:18,a:.1,k:5},{R:170,W:24,a:0,k:2},{R:75,W:14,a:0,k:2},{R:230,W:20,a:.12,k:5,f:[3,4.8,46]},{R:150,W:18,a:.1,k:6},{R:210,W:20,a:.14,k:4,f:[.9,2.7,44]},{R:300,W:22,a:.1,k:3,f:[4.6,6,50]},{R:170,W:22,a:.12,k:3,coast:true}],PD=[],BP=[],IT=[],MUD=new THREE.Color(0x5a4128),
TH=[{bg:'#f4b98a',gr:0x56803f,as:0x3a3d46,tr:0x2f5d34,f:[80,480]},{bg:'#0b1026',gr:0x1c2b2a,as:0x25272e,tr:0x143325,f:[40,260],night:1},{bg:'#f1cf94',gr:0xd9b26f,as:0x4a4642,tr:0x7a8f3a,f:[90,520]},{bg:'#dfeaf2',gr:0xf2f6fa,as:0x44474f,tr:0x5f8a78,f:[60,380]}];
function setCar(i){ty=i;if(car){sc.remove(car);disposeGroup(car,new Set([ENV,PAINT_ENV.texture,GLW,BEAMG,BEAMM]));}car=makeCar(col,i,opt);sc.add(car);[...$('cs').children].forEach((b,j)=>b.classList.toggle('on',j==i));$('st').innerHTML=['السرعة','التسارع','التحكم'].map((n,j)=>'<i>'+n+'<u style="width:'+TY[i].s[j]*20+'%"></u></i>').join('')}
TY.forEach((t,i)=>{const b=document.createElement('button');b.textContent=t.n;b.onclick=()=>{if(i>5&&!S.cu.includes(i)){const pr=i==6?800:1200;if(coins<pr){popup('عملات غير كافية');return}coins-=pr;S.cu.push(i);svu();svs();upUi();carLock()}setCar(i)};$('cs').appendChild(b)});
['خصم سهل','خصم متوسط','خصم صعب'].forEach((n,i)=>{const b=document.createElement('button');b.textContent=n;if(i==1)b.className='on';b.onclick=()=>{dif=i;[...$('df').children].forEach((x,j)=>x.classList.toggle('on',j==i))};$('df').appendChild(b)});
setCar(0);
const ai=[{m:makeCar('#ffb547',3),v:40,sk:1.02,ne:1,bl:-4},{m:makeCar('#f4f1ea',5),v:44,sk:.98,ne:1,bl:4},{m:makeCar('#2a9d8f',4),v:42,sk:1,ne:1,bl:-1.5},{m:makeCar('#9b5de5',1),v:41,sk:1.01,ne:1,bl:1.5}];ai.forEach(a=>{installCarLOD(a.m,a.m.userData.width);sc.add(a.m);});
const drivePhysics=new ArcadePhysics(4), simulationClock=new FixedClock();
let progress=new RaceProgress(),raceElapsed=0,input=null,resultRefresh=0;
const P={x:0,z:0,th:0,v:0,steer:0,prev:0,cum:0,last:-1,t:0,ls:0,laps:[],fin:0};
const poses=new PoseHistory(1+ai.length),chaseCamera=new ChaseCamera();
let cameraShake=matchMedia('(prefers-reduced-motion: reduce)').matches?0:.35;
try{const value=localStorage.getItem('sunset-camera-shake');if(value!==null&&[0,.35,1].includes(+value))cameraShake=+value;}catch(e){}
let mode='garage',state='count',cd=0,go_t=0,endT=0,yaw=.6,pitch=.28,dist=9.5,idle=0;
const K={l:0,r:0,g:0,b:0,h:0,n:0},ptr=new Map();let pd=0,nosOn=0,paused=0,cmv=0,shk=0,hc=0,ql=0,fc=0,QA=1,SHD=1,CRV=1,FPSON=0,fa=.016,bad=0,cn=0,UP=[0,0,0,0,0],coins=0,CR=[],CRB,CRH;

const cols=[['#e63946','أحمر'],['#ffb547','عنبري'],['#2a9d8f','أخضر'],['#3a86ff','أزرق'],['#f1f1f1','أبيض'],['#9b5de5','بنفسجي']];
cols.forEach(([c,n],i)=>{const b=document.createElement('button');b.style.background=c;b.setAttribute('aria-label',n);if(!i)b.className='on';
  b.onclick=()=>{col=c;car.userData.bm.color.set(c).convertSRGBToLinear();[...$('sw').children].forEach(x=>x.classList.remove('on'));b.classList.add('on')};$('sw').appendChild(b)});

function setMode(m){
  mode=m;input?.clear();simulationClock.reset();const r=m==='race';$('fx').classList.remove('on');pts.visible=skM.visible=r;if(!r){ghM.visible=slines.visible=tnl.visible=false;pl.fill(0);}gar.visible=!r;rc.visible=r;ai.forEach(a=>a.m.visible=r);
  const T2=TH[thm],c=new THREE.Color(r?T2.bg:'#171a30');if(r&&wxs)c.lerp(new THREE.Color(0x4a5566),wxs==2?.7:.5);sc.background.copy(c);sc.fog.color.copy(c);setSky(r?c.clone().lerp(new THREE.Color(T2.night?0x02030a:wxs?0x3a4658:0x2a5aa8),.65):'#0b0d1c',c);sunS.visible=!!(r&&!T2.night&&!wxs);sc.fog.near=r?T2.f[0]*(wxs?.4:1):30;sc.fog.far=r?T2.f[1]*(wxs?.5:1):140;rain.visible=!!(r&&wxs>0);
  const nt=!!(r&&T2.night);hb=nt?.4:(r&&wxs?.6:.95);hemi.intensity=hb;sun.intensity=nt?.12:(r&&wxs?.45:.9);rim.intensity=nt?.1:.5;hs.visible=nt||!!(r&&wxs==2);
  $('gTop').hidden=$('gBot').hidden=r;$('hud').hidden=$('ctl').hidden=$('mm').hidden=!r;$('end').hidden=true;$('raceTitle').hidden=$('keysHelp').hidden=!r;$('raceTitle').lastElementChild.textContent=TK.coast?'GOLDEN COAST / CIRCUIT 01':'SUNSET RUSH / ARCADE CIRCUIT';
  if(r){reset();$('raceTitle').lastElementChild.textContent=TK.coast?'GOLDEN COAST / CIRCUIT 01':'SUNSET RUSH / ARCADE CIRCUIT';correctColors(rc);if(TK.coast&&thm===0&&!wxs){sc.fog.near=180;sc.fog.far=1400;sc.fog.color.set('#ebbd9d').convertSRGBToLinear();setSky('#73afd0','#ffcea5');sun.color.set('#ffdbac');sun.intensity=1.2;hemi.intensity=.9;}}else{car.position.set(0,0,0);car.rotation.set(0,0,0);animateChassis(car,{speed:0,wheel:0,pitch:0,roll:0});$('cnt').textContent='';car.userData.bm.color.set(col).convertSRGBToLinear()}
}
function reset(){
  $('fx').classList.remove('on');
  TK=TR[trk];R=TK.R;W=TK.W;LAPS=lps;const trackKey=[trk,thm,sfc,wxs].join(':');if(!TK.coast||trackKey!==trackBuildKey)buildTrack();correctColors(rc);ai.forEach((a,i)=>{a.bl=[-.28,.28,-.1,.1][i]*W;a.o=a.bl;a.ne=1;a.br=0});
  const a=-.075;const q=cl(a);progress=new RaceProgress(a,LAPS);raceElapsed=0;simulationClock.reset();input?.clear();P.x=q[0];P.z=q[1];P.th=P.mv=q[2];P.v=0;P.steer=0;P.prev=a;P.cum=a;P.last=-1;P.t=0;P.ls=0;P.laps=[];P.fin=0;P.nt=100;P.nl=0;nosOn=0;paused=0;cn=4;SC=0;CB=1;cbT=0;drT=0;hits=0;PR=0;wp=0;tkT=0;P.y=0;P.vy=0;P.air=0;slip=0;psg=0;js=0;skClr();GR_=[];gt=0;ghM.visible=false;try{GH=JSON.parse(localStorage.getItem('sunset-g'+trk))}catch(e){GH=null}$('pz').hidden=true;car.userData.bm.color.set(col).convertSRGBToLinear();
  ai.forEach((o,i)=>{o.cum=a-(i>1?.055:0);o.finishTime=null;o.speed=0;o.wheel=0;});state='count';cd=3;go_t=0;endT=0;$('end').hidden=true;
  P.wheel=0;ptc=0;shk=0;hc=0;environmentTime=0;shadowTime=Infinity;frameMetrics.reset();syncPresentation();
}
const fmt=t=>Math.floor(t/60)+':'+(t%60).toFixed(1).padStart(4,'0');

/* ---------- Loops ---------- */
function garage(dt){
  if(!$('menu').hidden){
    const p=car.position;cam.position.set(p.x+6,3.1,p.z-10);cam.lookAt(p.x-4,2.2,p.z+9);cam.fov=52;cam.updateProjectionMatrix();
    sun.position.set(p.x+40,65,p.z+25);sun.target.position.copy(p);return;
  }

  if(!ptr.size){idle+=dt;if(idle>1.5)yaw+=dt*.35}
  const cp=Math.cos(pitch);
  cam.position.set(Math.sin(yaw)*cp*dist,.9+Math.sin(pitch)*dist,Math.cos(yaw)*cp*dist);cam.lookAt(0,.05,0);cam.fov=48;sun.position.set(30,50,20);sun.target.position.set(0,0,0);car.userData.bs.forEach(b=>b.visible=!!GL);cam.updateProjectionMatrix();
}
function race(dt){
  if(state==='count'){cd-=dt;const cn2=Math.ceil(cd);if(cn2!==cn&&dt>0){cn=cn2;bip(cn2>0?440:880,cn2>0?.12:.35)}$('cnt').textContent=cd>0?Math.ceil(cd):'انطلق!';if(K.g||K.n){if(cd>1.2)js=1;else if(cd>.05&&!js)psg=1}if(cd<=0){state='go';go_t=.9;if(psg&&!js){P.v=14;CB=Math.min(5,CB+1);addSc(150,'انطلاقة مثالية');bip(900,.15)}psg=0}}
  else if(go_t>0){go_t-=dt;if(go_t<=0)$('cnt').textContent=''}
  const run=state!=='count';
  if(run){
    raceElapsed+=dt;
    const fin=state==='done',gas=(K.g||AUTO||(K.n&&!P.nl))&&!fin,br=K.b||fin;
    if(state==='go')P.t+=dt;
    const tgt=TL?-clamp(GM/22,-1,1):K.l-K.r;P.steer+=(tgt-P.steer)*Math.min(1,dt*8);
    const T=TY[ty],GR=[1,.82,.62][sfc]*[1,.85,.75][wxs]*(1+.06*UP[1])*(slip>0?.35:1)*(K.h&&P.v>12?.42:1);P.th+=P.steer*(K.h?1.65:1.1)*SS*T.hd*(.75+.25*GR)/(1+P.v/60)*Math.min(1,P.v/8)*dt;
    const off=offd(P.x,P.z)>W/2+1,nos=!!(K.n&&!P.nl&&gas&&!off);if(nos&&!nosOn){P.v+=4;bip(320,.4,'sawtooth',.1);try{navigator.vibrate(40)}catch(e){}}nosOn=nos;P.nt=clamp(P.nt+(nos?-26/(1+.12*UP[2]):5*(1+.25*UP[2]))*dt,0,100);if(P.nt<=0)P.nl=1;else if(P.nt>=25)P.nl=0;const mx=((off?T.off:T.mx*(1+.04*UP[0]))+(nos?22:0))*(.7+.3*GR);
    if(gas)P.v+=(T.ac*(1+.05*UP[0])+(nos?20:0))*(.6+.4*GR)*Math.max(K.g,AUTO||nos?1:0)*dt;else P.v-=8*dt;if(br)P.v-=45*GR*(fin?1:K.b)*dt;if(K.h)P.v-=7*dt;car.userData.tl.color.setHex(br?0xff5050:0xaa1010);car.userData.tls.forEach(s=>s.material.opacity=br?1:.45);
    if(P.v>mx)P.v-=(P.v-mx)*Math.min(1,dt*2.5);P.v=Math.max(0,P.v);
    P.mv+=wrapAngle(P.th-P.mv)*Math.min(1,dt*(K.h?7:14)*GR);if(Math.abs(P.mv-P.th)>.1&&P.v>28&&!off)P.nt=clamp(P.nt+16*dt,0,100);
    const contacts=drivePhysics.move(P,ai.map(a=>{const p=cl(a.cum,a.o,a.br|0);return{x:p[0],z:p[1],heading:p[2],speed:a.speed||0};}),dt);
    if(contacts&&hc<=0&&P.v>5){hits++;CB=1;shk=.18;hc=.3;burst(P.x,P.z);}
    let dirt=off&&sfc>0;PD.forEach(d=>{if(Math.hypot(P.x-d.x,P.z-d.z)<d.r){P.v-=P.v*1.4*dt;dirt=true}});if(dirt)car.userData.bm.color.lerp(MUD,dt*.3);BP.forEach(b=>{if(Math.hypot(P.x-b.x,P.z-b.z)<4.2){P.v+=45*dt;P.nt=clamp(P.nt+30*dt,0,100)}});
    {const bo=offd(P.x,P.z),lim=inTun()?W/2+1.3:W/2+3.8;if(bo>lim){const t=Math.atan2(P.z,P.x),q=cl(t,0,NB),s=lim/bo;P.x=q[0]+(P.x-q[0])*s;P.z=q[1]+(P.z-q[1])*s;let d=q[2]-P.th;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;if(Math.abs(d)<2.2){P.th+=d*Math.min(1,dt*5);P.mv+=(P.th-P.mv)*Math.min(1,dt*8)}if(hc<=0&&P.v>12){burst(P.x,P.z);hits++;CB=1;shk=.3;P.v*=.6;hc=.35;try{navigator.vibrate(50)}catch(e){}}else P.v*=1-dt*.8}}fxEmit(dt,off,nos);
    const ang=Math.atan2(P.z,P.x);
    if(state==='go'){
      const lapFinished=progress.update(ang,P.t,offd(P.x,P.z)<=W/2+4);
      P.cum=progress.distance;P.prev=ang;P.last=progress.completed;P.laps=progress.lapTimes;
      if(lapFinished){bip(660,.25,'sine',.12);cf();addSc(300,'اللفة');if(progress.completed===LAPS-1)popup('اللفة الأخيرة!');}
      if(progress.finished){state='done';P.fin=progress.finishTime;endT=1.2;}
    }
    ai.forEach((a,i)=>{if(!(TK.f&&fu(a.cum)>0))a.br=Math.random()<.65?1:0;const rr=rad(a.cum,a.br|0),d1=dr(a.cum,a.br|0),d2=-R*TK.a*TK.k*TK.k*Math.cos(TK.k*a.cum),kn=rr*rr+2*d1*d1-rr*d2,Rc=kn>0?Math.pow(rr*rr+d1*d1,1.5)/kn:1e4;const pa=Math.atan2(P.z,P.x),po=Math.hypot(P.x,P.z)-rad(pa),gp=(P.cum-a.cum)*rr;let ot=a.bl-(Rc<160?W*.3*(1-Rc/160):0);if(Math.abs(gp)<14&&Math.abs(po-a.o)<3.4)ot=a.o+(a.o>=po?1:-1)*4;ot=clamp(ot,-W/2+2.6,W/2-2.6);a.o+=(ot-a.o)*Math.min(1,dt*1.8);const st=Rc>350&&a.ne>.25;a.ne=clamp(a.ne+(st?-.5:.12)*dt,0,1);
    const previous=a.cum;
    a.speed=Math.max(12,Math.min(a.v*a.sk*DF[dif]*rbf(a)*(st?1.1:1),12+.32*Rc)*[1,.9,.8][sfc]*(1-.07*wxs)+3*Math.sin(raceElapsed*.7+i*2));
    // Yield behind another rival if both are in the same lane; choose a free passing lane.
    for(const other of ai){if(other===a)continue;const gap=(other.cum-a.cum)*rr;
      if(gap>0&&gap<12&&Math.abs(other.o-a.o)<2.8){a.o+=(a.o<=other.o?-1:1)*dt*2;a.o=clamp(a.o,-W/2+2.6,W/2-2.6);a.speed=Math.min(a.speed,Math.max(15,other.speed*.94));}
    }
    a.cum+=a.speed/Math.hypot(rr+a.o,d1)*dt;
    if(a.finishTime==null&&a.cum>=LAPS*TAU)a.finishTime=raceElapsed-dt*(a.cum-LAPS*TAU)/(a.cum-previous);
    });
    if(state==='done'){P.place=standings().findIndex(a=>a.id===0)+1;if(!$('end').hidden){resultRefresh+=dt;if(resultRefresh>.25){resultRefresh=0;updateResults();}}}
    if(endT>0){endT-=dt;if(endT<=0)showEnd()}
  }
  // Visual suspension and wheel phases have fixed-step endpoints as well.
  ptc+=(((K.b?.035:0)-(K.g||AUTO?(P.v<40?.02:.006):0))-ptc)*Math.min(1,dt*6);
  P.wheel+=P.v*dt/.44;ai.forEach(a=>a.wheel+=(a.speed||0)*dt/.44);
  shk=Math.max(0,shk-dt*1.2);
  const rank=standings().findIndex(a=>a.id===0)+1;
  $('spd').textContent=Math.round(P.v*3.6);$('lap').textContent=Math.min(progress.completed+1,LAPS)+'/'+LAPS;
  $('pos').textContent=rank+'/'+(ai.length+1);$('tm').textContent=fmt(P.t);$('nt').textContent=Math.round(P.nt)+'%';$('nbi').style.width=P.nt+'%';rainUpd(dt);scUpd(dt,rank);itUpd(dt);ghUpd(dt);tnl.visible=inTun();pUpd(dt);hc-=dt;
  if(state==='go'&&go_t<=0){const w=P.v>10&&Math.cos(P.th-cl(Math.atan2(P.z,P.x))[2])<-.3;$('cnt').style.fontSize=w?'40px':'';$('cnt').textContent=w?'عكس الاتجاه!':''}
  const nb=$('nb');nb.style.background='linear-gradient(to top,#3a86ff '+P.nt+'%,rgba(58,134,255,.22) '+P.nt+'%)';nb.style.opacity=P.nl?.5:1;nb.style.boxShadow=nosOn?'0 0 22px #5aa0ff':'none';$('fx').classList.toggle('on',!!nosOn);
}
// Only this capture reads authoritative simulation state. Rendering never writes it.
function capturePoses(){
  const p=poses.current[0];
  p.x=P.x;p.y=P.y;p.z=P.z;p.heading=P.th;p.direction=P.mv;
  p.speed=P.v;p.steer=P.steer;p.roll=P.steer*clamp(P.v/55,0,1)*.07;p.pitch=ptc;
  p.wheel=P.wheel;p.boost=nosOn?1:0;p.shake=shk;
  ai.forEach((a,i)=>{const q=cl(a.cum,a.o,a.br|0),p=poses.current[i+1];
    p.x=q[0];p.y=0;p.z=q[1];p.heading=p.direction=q[2];p.speed=a.speed||0;p.wheel=a.wheel||0;
  });
}
function stepSimulation(dt){poses.beginStep();race(dt);capturePoses();}
function syncPresentation(){
  capturePoses();poses.reset();simulationClock.reset();last=performance.now();chaseCamera.reset();
  renderRace(1,0);
}
function renderRace(alpha,dt){
  const shown=poses.sample(alpha),lit=!!(TH[thm].night||wxs>0);
  for(let i=0;i<shown.length;i++){
    const p=shown[i],mesh=i===0?car:ai[i-1].m;
    mesh.position.set(p.x,p.y,p.z);mesh.rotation.order='YXZ';mesh.rotation.set(p.pitch,p.heading,p.roll);animateChassis(mesh,p,reducedEffects);
    mesh.userData.wh.forEach((w,j)=>{w.rotation.x=p.wheel;if(j<2)w.rotation.y=p.steer*.42;});
    mesh.userData.bs.forEach(b=>b.visible=lit);
  }
  const p=shown[0],view=chaseCamera.update(p,cmv,dt,cameraShake);
  car.userData.fl.forEach((f,i)=>{f.visible=p.boost>.01;f.scale.z=.98+.15*Math.sin(chaseCamera.time*38+i*2);});
  cam.position.set(view.x,view.y,view.z);cam.lookAt(view.lookX,view.lookY,view.lookZ);
  if(cam.fov!==view.fov){cam.fov=view.fov;cam.updateProjectionMatrix();}
  const fx=Math.sin(p.heading),fz=Math.cos(p.heading);
  hs.position.set(p.x+fx*2,p.y+1.2,p.z+fz*2);hs.target.position.set(p.x+fx*30,p.y,p.z+fz*30);
  sun.position.set(p.x+30,50,p.z+20);sun.target.position.set(p.x,0,p.z);tnl.position.set(p.x,5,p.z);
  slUpd(dt,p);crUpd(chaseCamera.time);mmDraw();
}
function advanceRace(elapsed,beforeStep){
  if(paused)return 0;
  const steps=simulationClock.advance(elapsed,dt=>{beforeStep?.();stepSimulation(dt);});
  renderRace(simulationClock.alpha,Math.min(Math.max(elapsed,0),.2));
  return steps;
}
function standings(){return rankRacers([{id:0,name:'YOU',distance:P.cum,finishTime:P.fin||null},...ai.map((a,i)=>({id:i+1,name:['SOL','NOVA','KAI','LUNA'][i],distance:a.cum,finishTime:a.finishTime}))]);}
function showEnd(){
  const o=['الأول','الثاني','الثالث','الرابع','الخامس'],best=Math.min(...P.laps);let rec='';
  try{const b=parseFloat(localStorage.getItem('sunset-best-'+trk+'-'+LAPS));if(!b||P.fin<b){localStorage.setItem('sunset-best-'+trk+'-'+LAPS,P.fin);rec=b?'<br>رقم قياسي جديد.':''}else rec='<br>أفضل وقت لك: '+fmt(b)}catch(e){}
  $('eT').textContent=(['🥇','🥈','🥉'][P.place-1]||'🏁')+' المركز '+o[P.place-1];
  $('eS').innerHTML='الوقت الكلي '+fmt(P.fin)+'<br>أسرع لفة '+fmt(best)+rec+(()=>{const cg=Math.round([120,70,40,20,10][P.place-1]*LAPS/3*(DAILY?2:1)*(1+.25*UP[4]));coins+=cg;S.tc+=cg;svu();upUi();const bn=[1000,600,400,200,100][P.place-1]+(hits?0:500);SC+=bn;S.ts+=Math.round(SC);S.xp+=Math.round(SC/8+(P.place==1?60:20));const nl=1+Math.floor(Math.sqrt(S.xp/60));if(nl>S.lv){S.lv=nl;coins+=100*nl;svu();upUi();toastT('⬆️ مستوى جديد! '+nl+' · +'+100*nl+' عملة')}const nw=SC>S.hs;S.hs=Math.max(S.hs,SC);S.r++;if(!S.bt[trk]||P.fin<S.bt[trk]){S.bt[trk]=P.fin;try{localStorage.setItem('sunset-g'+trk,JSON.stringify(GR_))}catch(e){}}trrUi();if(P.place==1){S.w++;if(wxs>0)S.f.rn=1;if(sfc==2)S.f.md=1}if(!hits)S.f.cl=1;if(DAILY)S.f.dy=1;chk();return'<br>+'+cg+' عملة<br>النقاط: '+Math.round(SC)+(nw?' ⭐':'')})();$('end').hidden=false;$('pp').replaceChildren();updateResults();
}
function updateResults(){const table=$('resultsTable');table.innerHTML=standings().map((a,i)=>'<tr class="'+(a.id===0?'you':'')+'"><td>'+String(i+1).padStart(2,'0')+'</td><th>'+a.name+'</th><td>'+(a.finishTime!=null?fmt(a.finishTime):'RACING')+'</td></tr>').join('');
}
const RN=900,rx=new Float32Array(RN),rz=new Float32Array(RN),ry=new Float32Array(RN),rpos=new Float32Array(RN*6);
for(let i=0;i<RN;i++){rx[i]=(Math.random()-.5)*70;rz[i]=(Math.random()-.5)*70;ry[i]=Math.random()*28}
const rain=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(rpos,3)),new THREE.LineBasicMaterial({color:0xcfe3ff,transparent:true,opacity:.55}));rain.frustumCulled=false;rain.visible=false;sc.add(rain);
function rainUpd(dt){if(!rain.visible)return;const ox=cam.position.x+Math.sin(P.th)*20,oz=cam.position.z+Math.cos(P.th)*20;for(let i=0;i<RN;i++){ry[i]-=dt*(wxs==2?60:45);if(ry[i]<0)ry[i]+=28;const j=i*6;rpos[j]=ox+rx[i];rpos[j+1]=ry[i];rpos[j+2]=oz+rz[i];rpos[j+3]=rpos[j]+.15;rpos[j+4]=ry[i]+1.3;rpos[j+5]=rpos[j+2]}rain.geometry.attributes.position.needsUpdate=true;
  if(wxs==2){if(lf>0)lf-=dt;else if(Math.random()<dt*.12)lf=.14;hemi.intensity=hb+(lf>0?1.6:0)}else hemi.intensity=hb}
const NP=150,pp=new Float32Array(NP*3),pc=new Float32Array(NP*3),pb=new Float32Array(NP*3),pv=new Float32Array(NP*3),pl=new Float32Array(NP),pm=new Float32Array(NP),pg=new Float32Array(NP);let pi=0;const rnd=()=>Math.random()-.5;
const pts=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(pp,3)).setAttribute('color',new THREE.BufferAttribute(pc,3)),new THREE.PointsMaterial({size:1.5,map:GLW,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));pts.frustumCulled=false;sc.add(pts);
function emit(x,y,z,vx,vy,vz,l,r,g,b,gv){const i=pi++%NP,j=i*3;pp[j]=x;pp[j+1]=y;pp[j+2]=z;pv[j]=vx;pv[j+1]=vy;pv[j+2]=vz;pl[i]=pm[i]=l;pb[j]=r;pb[j+1]=g;pb[j+2]=b;pg[i]=gv}
function burst(x,z){bip(90,.18,'sawtooth',.18);for(let i=0;i<14;i++)emit(x,.6,z,rnd()*14,2+Math.random()*5,rnd()*14,.45,1,.7,.25,14)}
function pUpd(dt){for(let i=0;i<NP;i++){const j=i*3;if(pl[i]>0){pl[i]-=dt;pv[j+1]-=pg[i]*dt;pp[j]+=pv[j]*dt;pp[j+1]=Math.max(.05,pp[j+1]+pv[j+1]*dt);pp[j+2]+=pv[j+2]*dt;const f=Math.max(0,pl[i]/pm[i]);pc[j]=pb[j]*f;pc[j+1]=pb[j+1]*f;pc[j+2]=pb[j+2]*f}else pc[j]=pc[j+1]=pc[j+2]=0}pts.geometry.attributes.position.needsUpdate=true;pts.geometry.attributes.color.needsUpdate=true}
function fxEmit(dt,off,nos){const f=Math.sin(P.th),c=Math.cos(P.th),sk=Math.abs(P.mv-P.th)>.12&&P.v>20;if(sk&&!off&&P.y<.1){skd+=P.v*dt;if(skd>.9){skd=0;skid()}}
  if(P.v>12&&(sk||off))[-1,1].forEach(s=>{const x=P.x-f*1.6-c*s*.95,z=P.z-c*1.6+f*s*.95;if(sk&&!off)emit(x,.2,z,rnd(),.6,rnd(),.7,.3,.3,.32,0);else emit(x,.25,z,rnd()*2,1.5,rnd()*2,.5,sfc?.4:.5,sfc?.26:.42,sfc?.13:.25,6)});
  if(nos)[-1,1].forEach(s=>emit(P.x-f*2.6-c*s*.55,.5,P.z-c*2.6+f*s*.55,-f*10,rnd(),-c*10,.25,.3,.55,1,0))}
const NS=36,sa=new Float32Array(NS),sr=new Float32Array(NS),sz=new Float32Array(NS),spos=new Float32Array(NS*6);for(let i=0;i<NS;i++){sa[i]=Math.random()*6.283;sr[i]=2.5+Math.random()*7;sz[i]=Math.random()*40}
const slines=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(spos,3)),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0}));slines.frustumCulled=false;slines.visible=false;sc.add(slines);
function slUpd(dt,pose){const a=clamp((pose.speed-38)/26,0,1);slines.visible=mode==='race'&&a>0;if(!slines.visible)return;slines.material.opacity=a*.4;const f=Math.sin(pose.heading),c=Math.cos(pose.heading),L=1+pose.speed*.05;for(let i=0;i<NS;i++){sz[i]-=dt*(pose.speed+30);if(sz[i]<4)sz[i]+=44;const ox=Math.cos(sa[i])*sr[i],oy=Math.sin(sa[i])*sr[i]*.6+2.5,bx=cam.position.x+f*sz[i]-c*ox,bz=cam.position.z+c*sz[i]+f*ox,j=i*6;spos[j]=bx;spos[j+1]=oy;spos[j+2]=bz;spos[j+3]=bx+f*L;spos[j+4]=oy;spos[j+5]=bz+c*L}slines.geometry.attributes.position.needsUpdate=true}
function applyResolution(scale=1){
  const ratio=Math.min(devicePixelRatio,QUALITY[ql].dpr)*scale;
  if(Math.abs(rd.getPixelRatio()-ratio)>.015){rd.setPixelRatio(ratio);rs();}
}
function applyQuality(){
  const quality=QUALITY[ql],budget=reducedEffects?.55:1;
  pts.geometry.setDrawRange(0,Math.floor(quality.particles*budget));
  slines.geometry.setDrawRange(0,Math.floor(quality.lines*budget)*2);rain.geometry.setDrawRange(0,Math.floor(quality.rain*budget)*2);
  sun.castShadow=quality.shadow>0&&!!SHD;
  if(sun.shadow.mapSize.x!==quality.shadow&&quality.shadow>0){
    sun.shadow.mapSize.set(quality.shadow,quality.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
  }
  if(!quality.shadow&&sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
  shadowTime=Infinity;rd.shadowMap.needsUpdate=true;
}
function setQ(i){
  ql=QUALITY[i]?i:1;resolution.reset();resolutionTime=0;applyQuality();applyResolution();
  [...$('ql').children].forEach((b,j)=>b.classList.toggle('on',j===(QA?0:QUALITY_MENU.indexOf(ql))));
}
function prepareRender(dt){
  if(environmentOverride===null&&(!paused||mode==='garage'))environmentTime+=Math.min(Math.max(dt,0),.2);
  const time=environmentOverride??environmentTime;
  skyClouds.time.value=time;skyClouds.strength.value=rc.visible&&TK.coast?(TH[thm].night?.1:wxs?.3:.85):0;
  const life=rc.userData.coast;
  if(life){life.time.value=time;life.motion.value=reducedEffects?.25:1;life.detail.value=ql===2||reducedEffects?0:1;if(life.birds)life.birds.visible=ql!==2&&!reducedEffects;if(life.traffic)life.traffic.visible=ql!==2&&!reducedEffects;}
  const quality=QUALITY[ql];ai.forEach(a=>updateCarLOD(a.m,cam,quality.lod));
  shadowTime+=Math.max(0,dt);
  rd.shadowMap.needsUpdate=!!(sun.castShadow&&shadowTime>=1/quality.shadowHz);
  if(rd.shadowMap.needsUpdate)shadowTime=0;
  rd.info.reset();
}
function updateDiagnostics(dt){
  metricTime+=dt;if(!FPSON||metricTime<.5)return;metricTime=0;
  const p=frameMetrics.snapshot(rd.info,performance.memory),mb=v=>(v/1048576).toFixed(0);
  $('fp').textContent=`${p.fps.toFixed(1)} FPS · avg ${p.meanMs.toFixed(1)} ms
P95 ${p.p95Ms.toFixed(1)} · P99 ${p.p99Ms.toFixed(1)} ms
${p.calls} calls · ${p.triangles.toLocaleString()} tris
GPU objects ${p.geometries} geo / ${p.textures} tex / ${p.programs} programs
Heap ${p.heapUsedBytes===null?'n/a':mb(p.heapUsedBytes)+' / '+mb(p.heapLimitBytes)+' MiB; free '+mb(p.heapAvailableBytes)}
${QA?'Auto / ':''}${QUALITY[ql].name} · DPR ${rd.getPixelRatio().toFixed(2)} · target ${resolution.targetFps}`;
}

const mc=$('mm').getContext('2d');
function mmDraw(){const S=R*(1+TK.a);mc.clearRect(0,0,192,192);mc.lineWidth=12;mc.strokeStyle='rgba(128,128,140,.8)';mc.beginPath();for(let i=0;i<=60;i++){const p=cl(i/60*6.2832),X=96+p[0]/S*76,Y=96+p[1]/S*76;i?mc.lineTo(X,Y):mc.moveTo(X,Y)}mc.stroke();
  const dot=(x,z,c,r)=>{mc.fillStyle=c;mc.beginPath();mc.arc(96+x/S*76,96+z/S*76,r,0,6.283);mc.fill()};
  ai.forEach((a,i)=>dot(a.m.position.x,a.m.position.z,i?'#f1f1f1':'#3a86ff',6));dot(P.x,P.z,'#ff9f1c',8)}
let AC,osc,gn,mute=0;
function sndInit(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();osc=AC.createOscillator();gn=AC.createGain();const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;osc.type='sawtooth';gn.gain.value=0;osc.connect(lp);lp.connect(gn);gn.connect(AC.destination);osc.start()}catch(e){AC=0}}
let rnN=null,rnG=null;
function rainSnd(){if(!rnN){const b=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;rnN=AC.createBufferSource();rnN.buffer=b;rnN.loop=true;const hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;rnG=AC.createGain();rnG.gain.value=0;rnN.connect(hp);hp.connect(rnG);rnG.connect(AC.destination);rnN.start()}const t=(mode==='race'&&!mute&&!paused&&wxs>0)?(wxs==2?.09:.05):0;rnG.gain.value+=(t-rnG.gain.value)*.1}
function bip(f,d,ty='square',v=.1){if(!AC||mute)return;try{const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=ty;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(t+d)}catch(e){}}
const skyM=new THREE.Mesh(new THREE.SphereGeometry(700,16,10),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false,toneMapped:false}));skyM.renderOrder=-1;sc.add(skyM);const skyClouds=addSkyClouds(skyM);
const sunS=new THREE.Sprite(new THREE.SpriteMaterial({map:GLW,color:0xffc68a,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));sunS.scale.set(125,125,1);sunS.visible=false;sc.add(sunS);
function setSky(top,hor){const g=skyM.geometry,p=g.attributes.position,n=p.count,c=new Float32Array(n*3),a=new THREE.Color(top).convertSRGBToLinear(),b=new THREE.Color(hor).convertSRGBToLinear(),t=new THREE.Color();for(let i=0;i<n;i++){const k=clamp(p.getY(i)/700,0,1);t.copy(b).lerp(a,Math.pow(k,.6));c[i*3]=t.r;c[i*3+1]=t.g;c[i*3+2]=t.b}g.setAttribute('color',new THREE.BufferAttribute(c,3))}
const DM=new THREE.Object3D();
function crUpd(tm){if(!CRB)return;CRB.visible=CRH.visible=!!CRV;if(!CRV)return;for(let i=0;i<CR.length;i++){const c=CR[i],dx=P.x-c[0],dz=P.z-c[1],k=Math.exp(-(dx*dx+dz*dz)/1100),b=Math.abs(Math.sin(tm*5+c[3]))*(.06+.6*k)*(wxs?.4:1);DM.rotation.y=c[4];DM.position.set(c[0],c[2]+.5+b,c[1]);DM.updateMatrix();CRB.setMatrixAt(i,DM.matrix);DM.position.y=c[2]+1.2+b;DM.updateMatrix();CRH.setMatrixAt(i,DM.matrix)}CRB.instanceMatrix.needsUpdate=CRH.instanceMatrix.needsUpdate=true}
function cf(){for(let i=0;i<30;i++){const c=Math.random();emit(P.x+rnd()*6,2,P.z+rnd()*6,rnd()*8,5+Math.random()*5,rnd()*8,1.1,.6+Math.random()*.4,.4+c*.5,.5+(1-c)*.5,7)}}
function svu(){try{localStorage.setItem('sunset-up',JSON.stringify({u:UP,c:coins}))}catch(e){}}
function upUi(){$('cn2').textContent=coins;$('cn').textContent='العملات: '+coins;[...$('up').children].forEach((b,j)=>{b.textContent=['المحرك','الإطارات','النيترو','المغناطيس','المضاعف'][j]+' '+UP[j]+'/3'+(UP[j]<3?' · '+upc(j):'')})}
let TL=0,GM=0,skd=0,psg=0,js=0,ptc=0,slip=0,SC=0,CB=1,cbT=0,drT=0,hits=0,PR=0,wp=0,tkT=0,S={t:0,r:0,w:0,hs:0,ds:0,ns:0,tc:0,mx:0,f:{},a:[],o:[],bt:{},ts:0,xp:0,lv:1,dm:null,cu:[]};
try{const s=JSON.parse(localStorage.getItem('sunset-st'));if(s)S=Object.assign(S,s)}catch(e){}
const svs=()=>{try{localStorage.setItem('sunset-st',JSON.stringify(S))}catch(e){}},ACH=[['أول فوز',s=>s.w>=1],['ثلاثة انتصارات',s=>s.w>=3],['ملك الانجراف',s=>s.ds>=60],['مدمن نيترو',s=>s.ns>=30],['سرعة خارقة',s=>s.mx>=200],['سباق نظيف',s=>s.f.cl],['عابر النفق',s=>s.f.tn],['سائق المطر',s=>s.f.rn],['سيد الوحل',s=>s.f.md],['تاجر العملات',s=>s.tc>=1000],['ماراثون',s=>s.t>=1800],['بطل اليوم',s=>s.f.dy]];
function popup(t){const e=document.createElement('div');e.className='pop';e.textContent=t;$('pp').appendChild(e);setTimeout(()=>e.remove(),1000)}
function toast(n){const e=document.createElement('div');e.className='ts';e.textContent='🏆 إنجاز جديد! '+n;$('pp').appendChild(e);setTimeout(()=>e.remove(),3500)}
function addSc(n,t){SC+=n*CB;popup('+'+Math.round(n*CB)+' '+t);cbT=4}
function achUi(){const fm=t=>Math.floor(t/3600)+':'+String(Math.floor(t%3600/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  $('stg').innerHTML=[['وقت اللعب',fm(S.t)],['السباقات',S.r],['الانتصارات',S.w],['أعلى نقاط',Math.round(S.hs)],['وقت الانجراف',Math.round(S.ds)+'s'],['وقت النيترو',Math.round(S.ns)+'s']].map(([a,b])=>'<div class="chip"><small>'+a+'</small><b>'+b+'</b></div>').join('');
  dayInit();$('msn').innerHTML=S.dm.ids.map((id,k)=>{const v=Math.min(MS[id][2],Math.floor(MS[id][1](S)-S.dm.b[id]));return'<div class="rw2"><span>'+MS[id][0]+'</span><b>'+(S.dm.cl[k]?'✅':v+'/'+MS[id][2])+'</b></div>'}).join('');xpUi();$('acl').innerHTML=ACH.map(([n],i)=>'<div class="rw2"><span>'+n+'</span><b>'+(S.a.includes(i)?'🏆':'🔒')+'</b></div>').join('')}
function chk(){dayInit();S.dm.ids.forEach((id,k)=>{if(!S.dm.cl[k]&&MS[id][1](S)-S.dm.b[id]>=MS[id][2]){S.dm.cl[k]=1;coins+=150;svu();upUi();toastT('✅ '+MS[id][0]+' +150 عملة')}});ACH.forEach(([n,f],i)=>{if(!S.a.includes(i)&&f(S)){S.a.push(i);toast(n)}});svs();achUi()}
setInterval(()=>{if(!document.hidden){S.t++;if(S.t%10==0)chk()}},1000);
function scUpd(dt,rank){if(state!=='go'||paused)return;const sk=Math.abs(P.mv-P.th)>.12&&P.v>20;
  if(sk){drT+=dt;S.ds+=dt;SC+=40*dt*CB;if(drT>=1){drT=0;CB=Math.min(5,CB+1);addSc(60,'انجراف')}}
  if(nosOn){S.ns+=dt;SC+=25*dt*CB}
  const on=BP.some(b=>Math.hypot(P.x-b.x,P.z-b.z)<4.2);if(on&&!wp){CB=Math.min(5,CB+1);addSc(100,'نيترو')}wp=on;
  if(PR&&rank<PR){CB=Math.min(5,CB+1);addSc(150,'تجاوز')}PR=rank;
  if(cbT>0){cbT-=dt;if(cbT<=0)CB=1}
  if(NB==1&&TK.f&&fu(Math.atan2(P.z,P.x))>0)tkT+=dt;else tkT=0;if(tkT>2.5)S.f.tn=1;
  S.mx=Math.max(S.mx,Math.round(P.v*3.6));$('sc').textContent=Math.round(SC);$('cbx').textContent=CB>1?'×'+CB:''}
const tnl=new THREE.PointLight(0xffe2a0,1.4,45);tnl.visible=false;sc.add(tnl);
function inTun(){if(!TK.f||NB!==1)return false;const u=(nm(Math.atan2(P.z,P.x))-TK.f[0])/(TK.f[1]-TK.f[0]);return u>.29&&u<.71}
function itUpd(dt){IT.forEach(it=>{if(it.k==='c'&&it.on)it.m.rotation.y+=dt*3;if(it.k==='n'&&it.t>0){it.t-=dt;it.m.position.x+=it.vx*dt;it.m.position.z+=it.vz*dt;it.m.rotation.x+=dt*9;it.m.position.y=Math.max(.3,it.m.position.y+(it.t>.5?dt*6:-dt*9));if(it.t<=0)it.m.visible=false}});
  if(state!=='go'||paused)return;if(slip>0){slip-=dt;P.th+=rnd()*3*dt*clamp(P.v/50,0,1)}
  if(P.y>0||P.air){P.y+=P.vy*dt;P.vy-=24*dt;if(P.air)P.at+=dt;if(P.y<=0){P.y=0;if(P.air){P.air=0;shk=.3;burst(P.x,P.z);if(P.at>.5){CB=Math.min(5,CB+1);addSc(200,'قفزة')}}}}
  IT.forEach(it=>{if(!it.on)return;const d=Math.hypot(P.x-it.x,P.z-it.z);
    if(it.k==='c'&&d<2.4+UP[3]*2.2&&P.y<1.5){it.on=0;it.m.visible=false;const cv=[1,2,2,3][UP[4]];coins+=cv;S.tc+=cv;svu();upUi();SC+=25*CB;bip(1300,.07,'sine',.06);popup('+'+cv+' عملة')}
    else if(it.k==='n'&&d<1.7&&P.y<.8){it.on=0;it.t=1;it.vx=Math.sin(P.th)*P.v*.7+rnd()*6;it.vz=Math.cos(P.th)*P.v*.7+rnd()*6;P.v*=.96;SC+=10;bip(220,.08,'square',.06)}
    else if(it.k==='o'&&d<it.r&&slip<=0&&P.y<.5){slip=1.4;popup('زيت')}
    else if(it.k==='r'&&d<3.4&&P.v>22&&!P.air){P.air=1;P.at=0;P.y=.01;P.vy=Math.min(11,P.v*.17);bip(500,.2,'triangle',.08)}})}
const upc=j=>Math.round([150,300,500][UP[j]]*(j>2?1.4:1));
function trrUi(){$('trr').textContent=S.bt[trk]?'أفضل وقت لك: '+fmt(S.bt[trk]):''}
function toastT(t){const e=document.createElement('div');e.className='ts';e.textContent=t;$('pp').appendChild(e);setTimeout(()=>e.remove(),3500)}
const MS=[['انجرف 40 ثانية',s=>s.ds,40],['اجمع 150 عملة',s=>s.tc,150],['أنهِ 3 سباقات',s=>s.r,3],['فز بسباق',s=>s.w,1],['استخدم النيترو 20 ثانية',s=>s.ns,20],['اكسب 3000 نقطة',s=>s.ts,3000]];
function dayInit(){const n=new Date(),d=n.toDateString();if(!S.dm||S.dm.d!==d){const s0=n.getDate()*7+n.getMonth()*3,a=[0,1,2,3,4,5].sort((x,y)=>((x*37+s0)%11)-((y*37+s0)%11));S.dm={d,b:MS.map(m=>m[1](S)),ids:a.slice(0,3),cl:[0,0,0]}}}
function xpUi(){const L=1+Math.floor(Math.sqrt(S.xp/60)),lo=60*(L-1)*(L-1),hi=60*L*L;$('lv').textContent='المستوى '+L;$('lvi').style.width=Math.round(100*(S.xp-lo)/(hi-lo))+'%'}
let GH=null,GR_=[],gt=0,GHON=1;const ghM=makeCar('#9fd8ff',0);ghM.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.35;o.material.depthWrite=false}});ghM.userData.bs.forEach(b=>b.visible=false);ghM.visible=false;sc.add(ghM);
function ghUpd(dt){if(state!=='go'||paused)return;gt+=dt;if(gt>=.1){gt-=.1;if(GR_.length<4000)GR_.push([Math.round(P.x*10),Math.round(P.z*10),Math.round(P.th*100)])}
  if(GH&&GHON){const f=P.t/.1,i=Math.floor(f),a=GH[i],b=GH[i+1];if(a&&b){const k=f-i;ghM.visible=true;ghM.position.set((a[0]+(b[0]-a[0])*k)/10,0,(a[1]+(b[1]-a[1])*k)/10);ghM.rotation.y=(a[2]+(b[2]-a[2])*k)/100}else ghM.visible=false}else ghM.visible=false}
const SKN=240,skM=new THREE.InstancedMesh(new THREE.PlaneGeometry(.35,.9).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.45,depthWrite:false}),SKN),DM2=new THREE.Object3D();let ski=0;skM.frustumCulled=false;sc.add(skM);
function skClr(){ski=0;for(let i=0;i<SKN;i++){DM2.position.set(0,-5,0);DM2.rotation.set(0,0,0);DM2.updateMatrix();skM.setMatrixAt(i,DM2.matrix)}skM.instanceMatrix.needsUpdate=true}skClr();
function skid(){const f=Math.sin(P.th),c=Math.cos(P.th);[-1,1].forEach(s=>{DM2.position.set(P.x-f*1.6-c*s*.95,.045,P.z-c*1.6+f*s*.95);DM2.rotation.set(0,P.mv,0);DM2.updateMatrix();skM.setMatrixAt(ski++%SKN,DM2.matrix)});skM.instanceMatrix.needsUpdate=true}
function carLock(){[...$('cs').children].forEach((b,i)=>{b.textContent=TY[i].n+(i>5&&!S.cu.includes(i)?' 🔒'+(i==6?800:1200):'')})}
function rbf(a){const gap=P.cum-a.cum,lap=Math.max(0,Math.floor(Math.max(P.cum,0)/6.2832));return clamp(1+gap*.12,.93,1.07)*(1+.02*lap)}
function sndUpd(){if(!AC||!gn)return;rainSnd();const on=mode==='race'&&!mute&&!paused&&state!=='count';gn.gain.value+=((on?(nosOn?.08:.05):0)-gn.gain.value)*.2;{const g=Math.min(5,Math.floor(P.v/12)),r=Math.min(1,(P.v-g*12)/12);osc.frequency.value=60+g*10+r*(95+g*8)+(nosOn?25:0)}}
let last=performance.now();

function updateScene(elapsed){
  const revision=simulationClock.revision;
  input?.poll();
  if(mode==='garage')garage(Math.min(elapsed,.1));
  // Gamepad actions happen during poll, after the frame's elapsed time was read.
  // A resume/recovery here must not replay time from before the clock reset.
  else if(!paused)advanceRace(revision===simulationClock.revision?elapsed:0);
  else simulationClock.reset();
}
function frame(n){
  const elapsed=Math.max(0,(n-last)/1000);last=n;
  const startCpu=performance.now();
  if(!testManual)updateScene(elapsed);
  const simulationCpu=performance.now()-startCpu;
  if(QA&&dynamicResolution&&!paused&&!testManual){
    const scale=resolution.update(elapsed*1000,elapsed);resolutionTime+=elapsed;
    if(resolutionTime>=.35){resolutionTime=0;applyResolution(Math.round(scale*40)/40);}
  }
  sndUpd();skyM.position.copy(cam.position);sunS.position.set(cam.position.x+330,cam.position.y+80,cam.position.z+600);
  prepareRender(elapsed);const renderStart=performance.now();
  rd.render(sc,cam);frameMetrics.add(elapsed*1000,simulationCpu,performance.now()-renderStart);updateDiagnostics(elapsed);requestAnimationFrame(frame);
}
let testManual=false;
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();if(mode==='race'&&!paused)pauseRace();$('graphicsError').hidden=false;});
cv.addEventListener('webglcontextrestored',()=>{$('graphicsError').hidden=true;simulationClock.reset();poses.reset();last=performance.now();});

/* ---------- Input ---------- */
cv.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,[e.clientX,e.clientY]);cv.setPointerCapture(e.pointerId);idle=0});
cv.addEventListener('pointermove',e=>{
  if(!ptr.has(e.pointerId)||mode!=='garage')return;const o=ptr.get(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);idle=0;
  if(ptr.size===1){yaw-=(e.clientX-o[0])*.01;pitch=clamp(pitch+(e.clientY-o[1])*.006,.04,1.3)}
  else if(ptr.size===2){const[a,b]=[...ptr.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd)dist=clamp(dist*pd/d,5,18);pd=d}
});
['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,e=>{ptr.delete(e.pointerId);pd=0}));
cv.addEventListener('wheel',e=>{if(mode==='garage'){dist=clamp(dist+e.deltaY*.01,5,18);idle=0}},{passive:true});
function pauseRace(){if(mode!=='race'||state==='done')return;paused=paused?0:1;$('pz').hidden=!paused;input?.clear();simulationClock.reset();poses.reset();last=performance.now();}
function recoverCar(){
  if(mode!=='race'||state!=='go'||paused)return;
  const p=cl(P.cum,0,NB);P.x=p[0];P.z=p[1];P.th=P.mv=p[2];P.v=0;P.y=P.vy=0;P.air=0;
  progress.recover(Math.atan2(P.z,P.x));P.nt=Math.max(0,P.nt-15);hc=1;P.steer=0;ptc=0;nosOn=0;shk=0;input?.clear();syncPresentation();
}
input=installInput(K,{pause:pauseRace,recover:recoverCar,camera:()=>cmv=(cmv+1)%3,onBlur:()=>{if(mode==='race'&&state!=='done'&&!paused)pauseRace();}});
function seg(id,L,cur,fn){const c=$(id);L.forEach((n,i)=>{const b=document.createElement('button');b.textContent=n;if(i==cur)b.className='on';b.onclick=()=>{[...c.children].forEach((x,j)=>x.classList.toggle('on',j==i));fn(i)};c.appendChild(b)})}
function swa(id,L,fn){const c=$(id);L.forEach((v,i)=>{const b=document.createElement('button');b.style.background=v||'var(--panel)';if(!v){b.textContent='×';b.style.boxShadow='inset 0 0 0 1px var(--ink)'}if(!i)b.className='on';b.onclick=()=>{[...c.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');fn(v)};c.appendChild(b)})}
const ci=document.createElement('input');ci.type='color';ci.value='#e63946';ci.className='ci';ci.setAttribute('aria-label','لون مخصص');ci.oninput=()=>{col=ci.value;car.userData.bm.color.set(col).convertSRGBToLinear();[...$('sw').children].forEach(x=>x.classList.remove('on'))};$('sw').appendChild(ci);
seg('tb',['السيارة','الشكل','الحلبة','الأجواء','الورشة'],0,i=>[0,1,2,3,4].forEach(j=>$('t'+j).hidden=j!=i));
seg('fn',['لامع','مطفي','معدني'],0,i=>{opt.fin=i;setCar(ty)});
seg('wg',['بدون جناح','جناح','جناح عالٍ'],1,i=>{opt.wing=i;setCar(ty)});
swa('sp',[0,'#ffffff','#111111','#ffb547'],v=>{opt.stripe=v;setCar(ty)});
swa('rm',['#c9ccd6','#111111','#ffb547','#e63946','#3a86ff'],v=>{opt.rim=v;setCar(ty)});
swa('gl',[0,'#00e5ff','#ff2ec4','#7cff4f'],v=>{opt.glow=v;setCar(ty)});
seg('tk',['كلاسيك','بيضاوية','مثلثة','متعرجة','واسعة','ضيّقة','الطريق الطويل','نجمة','الجبل','الماراثون','ساحل الغروب'],10,i=>{trk=i;trrUi()});seg('wx',['صافٍ','مطر','عاصفة'],0,i=>wxs=i);seg('sf',['إسفلت','ترابي','وحل'],0,i=>sfc=i);
seg('tz',['غروب','ليل','صحراء','ثلج'],0,i=>thm=i);
seg('lp',['2 لفة','3 لفات','5 لفات'],1,i=>lps=[2,3,5][i]);
try{const s=JSON.parse(localStorage.getItem('sunset-up'));if(s){UP=s.u;while(UP.length<5)UP.push(0);coins=s.c}}catch(e){}
[0,1,2,3,4].forEach(j=>{const b=document.createElement('button');b.onclick=()=>{const c=upc(j);if(UP[j]<3&&coins>=c){coins-=c;UP[j]++;svu();upUi()}};$('up').appendChild(b)});upUi();
const IC={h:'<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',c:'<svg viewBox="0 0 24 24"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',v:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',m:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',p:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>'};
let VB=1,AUTO=0,SS=1,rs2=0,DAILY=0,GL=0;
try{if(navigator.vibrate){const v0=navigator.vibrate.bind(navigator);navigator.vibrate=n=>VB?v0(n):false}}catch(e){}
$('back').innerHTML=IC.h;$('cmb').innerHTML=IC.c;$('psb').innerHTML=IC.p;$('gm').innerHTML=IC.h;
const sI=()=>{$('snd').innerHTML=mute?IC.m:IC.v;$('tgS').setAttribute('aria-checked',String(!mute))},shw=(id,v)=>{$(id).hidden=!v};sI();
function showMenu(){
  $('gTop').hidden=$('gBot').hidden=true;$('menu').hidden=false;
  TK=TR[10];R=TK.R;W=TK.W;buildTrack();gar.visible=false;rc.visible=true;
  ai.forEach(a=>a.m.visible=false);const p=cl(-.075);car.position.set(p[0],0,p[1]);car.rotation.set(0,p[2],0);
  sc.fog.color.set('#ebbd9d').convertSRGBToLinear();sc.fog.near=180;sc.fog.far=1400;
  setSky('#73afd0','#ffcea5');sunS.visible=true;sun.color.set('#ffdbac');sun.intensity=1.2;hemi.intensity=.9;
}
$('mSet').onclick=()=>shw('sSet',1);$('cS').onclick=()=>shw('sSet',0);$('mHow').onclick=()=>shw('sHow',1);$('cH').onclick=()=>shw('sHow',0);
$('mGar').onclick=()=>{setMode('garage');$('menu').hidden=true;$('gTop').hidden=$('gBot').hidden=false};$('gm').onclick=showMenu;
$('mPlay').onclick=()=>{DAILY=0;$('menu').hidden=true;sndInit();if(AC&&AC.resume)AC.resume();setMode('race')};
const tgl=(id,fn)=>{const b=$(id);b.onclick=()=>{const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',String(on));fn(on)}};
tgl('tgS',on=>{mute=!on;sI()});tgl('tgV',on=>VB=on?1:0);tgl('tgA',on=>AUTO=on?1:0);
seg('ss',['منخفضة','عادية','عالية'],1,i=>SS=[.8,1,1.25][i]);
seg('cameraShake',['متوقف','خفيف','كامل'],[0,.35,1].indexOf(cameraShake),i=>{cameraShake=[0,.35,1][i];try{localStorage.setItem('sunset-camera-shake',cameraShake)}catch(e){}});
$('rst').onclick=()=>{if(!rs2){rs2=1;$('rst').textContent='اضغط مرة أخرى للتأكيد';setTimeout(()=>{rs2=0;$('rst').textContent='إعادة ضبط التقدم والعملات'},3000)}else{UP=[0,0,0,0,0];coins=0;svu();upUi();rs2=0;$('rst').textContent='تمت إعادة الضبط'}};
$('pzRecover').onclick=()=>{paused=0;$('pz').hidden=true;input.clear();recoverCar();};
$('pzR').onclick=()=>{if(paused)pauseRace();};$('pzA').onclick=()=>{$('pz').hidden=true;reset()};$('pzG').onclick=()=>{$('pz').hidden=true;paused=0;setMode('garage')};
addEventListener('contextmenu',e=>e.preventDefault());addEventListener('blur',()=>{K.l=K.r=K.g=K.b=K.n=0});
$('cmb').onclick=()=>cmv=(cmv+1)%3;$('psb').onclick=pauseRace;
const rb=document.createElement('button');rb.className='back';rb.textContent='رجوع';rb.hidden=true;rb.style.cssText='position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);right:14px;z-index:3';document.body.appendChild(rb);
const phb=document.createElement('button');phb.textContent='تصوير';phb.onclick=()=>{$('gTop').hidden=$('gBot').hidden=true;rb.hidden=false};rb.onclick=()=>{$('gTop').hidden=$('gBot').hidden=false;rb.hidden=true};const lgb=document.createElement('button');lgb.textContent='المصابيح';lgb.onclick=()=>{GL=!GL};$('vw').appendChild(lgb);$('vw').appendChild(phb);
const svq=()=>{try{localStorage.setItem('sunset-q',JSON.stringify([QA?0:ql+1,SHD,CRV,FPSON]))}catch(e){}},q2=(id,fn)=>{const b=$(id);b.onclick=()=>{const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',String(on));fn(on);svq()}},tgs=(id,on)=>$(id).setAttribute('aria-checked',String(!!on));
seg('ql',['تلقائي','منخفضة','متوسطة','عالية','فائقة'],0,i=>{QA=i==0;setQ(QA?ql:QUALITY_MENU[i]);svq()});
q2('tgSh',on=>{SHD=on?1:0;applyQuality();});q2('tgCr',on=>CRV=on?1:0);q2('tgGh',on=>GHON=on?1:0);q2('tgFp',on=>{FPSON=on?1:0;$('fp').hidden=!on});
const saveGraphics=()=>{try{localStorage.setItem('sunset-graphics',JSON.stringify({reduced:reducedEffects,dynamic:dynamicResolution,target:resolution.targetFps}));}catch(e){}};
tgs('tgFx',reducedEffects);tgs('tgDrs',dynamicResolution);
tgl('tgFx',on=>{reducedEffects=on;applyQuality();saveGraphics();});
tgl('tgDrs',on=>{dynamicResolution=on;resolution.reset();applyResolution();saveGraphics();});
seg('targetFps',['30','60','120'],[30,60,120].indexOf(resolution.targetFps),i=>{resolution.targetFps=[30,60,120][i];resolution.reset();saveGraphics();});
if(matchMedia('(pointer:coarse)').matches)setQ(2);else if(devicePixelRatio>2.5||(navigator.hardwareConcurrency||8)<=4)setQ(1);
try{const q=JSON.parse(localStorage.getItem('sunset-q'));if(q){QA=q[0]==0;SHD=q[1];CRV=q[2];FPSON=q[3];setQ(QA?ql:q[0]-1);tgs('tgSh',SHD);tgs('tgCr',CRV);tgs('tgFp',FPSON);$('fp').hidden=!FPSON}}catch(e){}
applyQuality();applyResolution();
$('start').onclick=()=>{DAILY=0;sndInit();if(AC&&AC.resume)AC.resume();setMode('race')};
$('snd').onclick=()=>{mute=!mute;sI()};
[['أمام',0,.2],['جانب',1.57,.12],['خلف',3.14,.2],['فوق',.6,1.3]].forEach(([n,y,p])=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>{yaw=y;pitch=p;idle=-6};$('vw').appendChild(b)});$('back').onclick=$('toG').onclick=()=>setMode('garage');$('again').onclick=reset;
const I18=[
['فائقة','Ultra','Ultra','Ultra'],['تخفيف المؤثرات','Reduce effects','Réduire les effets','Reducir efectos'],['دقة تكيفية في الوضع التلقائي','Adaptive resolution in Auto','Résolution adaptative en Auto','Resolución adaptativa en Auto'],['هدف الإطارات','Target FPS','FPS cible','FPS objetivo'],
['اهتزاز الكاميرا','Camera shake','Secousses de caméra','Vibración de cámara'],
['متوقف','Off','Désactivé','Desactivado'],['خفيف','Reduced','Réduit','Reducido'],['كامل','Full','Complet','Completo'],
['ساحل الغروب','Sunset Coast','Côte du soleil','Costa del sol'],
['انجراف يدوي','Handbrake','Frein à main','Freno de mano'],
['إعادة السيارة للطريق','Recover car','Replacer la voiture','Recuperar coche'],
['WASD أو الأسهم للقيادة · Space للانجراف · Shift للنيترو · R للعودة إلى الطريق · Esc للإيقاف.','WASD / arrows to drive · Space to drift · Shift for nitro · R to recover · Esc to pause.','WASD / flèches : conduire · Espace : déraper · Shift : nitro · R : retour · Esc : pause.','WASD / flechas: conducir · Espacio: derrapar · Shift: nitro · R: recuperar · Esc: pausa.'],
['يد التحكم: العصا اليسرى للتوجيه، RT للتسارع، LT للفرملة، B للانجراف، X للنيترو، Start للإيقاف.','Gamepad: left stick steer, RT gas, LT brake, B drift, X nitro, Start pause.','Manette : stick gauche, RT gaz, LT frein, B dérapage, X nitro, Start pause.','Mando: stick izquierdo, RT gas, LT freno, B derrape, X nitro, Start pausa.'],
['على الهاتف اضغط التسريع والتوجيه معًا، وأضف الانجراف أو النيترو عند الحاجة.','On touch screens hold gas and steering together, then add drift or nitro.','Sur écran tactile, maintenez gaz et direction, puis dérapage ou nitro.','En pantalla táctil mantén gas y dirección, añade derrape o nitro.'],
['العب الآن','Play now','Jouer','Jugar ahora'],['تحدي اليوم · عملات ×2','Daily challenge · 2× coins','Défi du jour · pièces ×2','Reto diario · monedas ×2'],['المرآب والتخصيص','Garage & customize','Garage et personnalisation','Garaje y personalizar'],['طريقة اللعب','How to play','Comment jouer','Cómo jugar'],['الإعدادات','Settings','Réglages','Ajustes'],['الإصدار','Version','Version','Versión'],['الصوت','Sound','Son','Sonido'],['الاهتزاز','Vibration','Vibrations','Vibración'],['تسريع تلقائي','Auto accelerate','Accélération auto','Acelerar automático'],['حساسية التوجيه','Steering sensitivity','Sensibilité de direction','Sensibilidad de dirección'],['منخفضة','Low','Basse','Baja'],['عادية','Normal','Normale','Normal'],['عالية','High','Élevée','Alta'],['اللغة','Language','Langue','Idioma'],
['إعادة ضبط التقدم والعملات','Reset progress & coins','Réinitialiser progrès et pièces','Reiniciar progreso y monedas'],['اضغط مرة أخرى للتأكيد','Tap again to confirm','Touchez encore pour confirmer','Toca otra vez para confirmar'],['تمت إعادة الضبط','Reset done','Réinitialisé','Reiniciado'],['حسنًا','OK','OK','OK'],['فهمت','Got it','Compris','Entendido'],
['قُد بأزرار اليسار واليمين والتسريع.','Steer with left/right and hold gas.','Dirigez avec gauche/droite et gardez le gaz.','Gira con izquierda/derecha y mantén el gas.'],['النيترو يتعبّأ بالانجراف وبالمربعات الزرقاء.','Nitro charges by drifting and over blue pads.','Le nitro se charge en dérapant et sur les carrés bleus.','El nitro se carga derrapando y sobre las losas azules.'],['اختر النفق المختصر أو الطريق الخارجي.','Take the shortcut tunnel or the outer road.','Prenez le tunnel raccourci ou la route extérieure.','Toma el túnel corto o la ruta exterior.'],['المطر والوحل يقللان التماسك، فخفّف قبل المنعطف.','Rain and mud reduce grip, so slow before corners.','La pluie et la boue réduisent l’adhérence : ralentissez avant les virages.','La lluvia y el barro reducen el agarre: frena antes de las curvas.'],['اكسب العملات وطوّر سيارتك في الورشة.','Earn coins and upgrade your car in the workshop.','Gagnez des pièces et améliorez votre voiture à l’atelier.','Gana monedas y mejora tu coche en el taller.'],
['إيقاف مؤقت','Paused','Pause','Pausa'],['متابعة','Resume','Reprendre','Continuar'],['إعادة السباق','Restart race','Recommencer','Reiniciar carrera'],['المرآب','Garage','Garage','Garaje'],
['اسحب لتدور حول السيارة، واقرص بإصبعين للتقريب','Drag to orbit the car, pinch to zoom','Glissez pour tourner, pincez pour zoomer','Arrastra para girar, pellizca para acercar'],['أمام','Front','Avant','Frente'],['جانب','Side','Côté','Lado'],['خلف','Rear','Arrière','Atrás'],['فوق','Top','Dessus','Arriba'],['تصوير','Photo','Photo','Foto'],['رجوع','Back','Retour','Volver'],
['السيارة','Car','Voiture','Coche'],['الشكل','Look','Style','Estilo'],['الحلبة','Track','Piste','Pista'],['الأجواء','Weather','Météo','Clima'],['الورشة','Workshop','Atelier','Taller'],
['هايبر','Hyper','Hyper','Hiper'],['رالي','Rally','Rallye','Rally'],['إيطالي','Italian','Italienne','Italiano'],['بريطاني','British','Britannique','Británico'],['ألماني','German','Allemande','Alemán'],['السرعة','Speed','Vitesse','Velocidad'],['التسارع','Accel.','Accél.','Acel.'],['التحكم','Handling','Tenue de route','Control'],
['لامع','Gloss','Brillant','Brillo'],['مطفي','Matte','Mat','Mate'],['معدني','Metallic','Métallisé','Metálico'],['بدون جناح','No wing','Sans aileron','Sin alerón'],['جناح عالٍ','Tall wing','Aileron haut','Alerón alto'],['جناح','Wing','Aileron','Alerón'],['خطوط','Stripes','Bandes','Rayas'],['الجنوط','Rims','Jantes','Llantas'],['إضاءة سفلية','Underglow','Néons','Neón inferior'],
['كلاسيك','Classic','Classique','Clásica'],['بيضاوية','Oval','Ovale','Ovalada'],['مثلثة','Triangle','Triangle','Triángulo'],['متعرجة','Winding','Sinueuse','Sinuosa'],['واسعة','Wide','Large','Ancha'],['ضيّقة','Narrow','Étroite','Estrecha'],['الطريق الطويل','Long road','Longue route','Ruta larga'],['2 لفة','2 laps','2 tours','2 vueltas'],['3 لفات','3 laps','3 tours','3 vueltas'],['5 لفات','5 laps','5 tours','5 vueltas'],['خصم سهل','Easy rivals','Rivaux faciles','Rivales fáciles'],['خصم متوسط','Medium rivals','Rivaux moyens','Rivales medios'],['خصم صعب','Hard rivals','Rivaux difficiles','Rivales difíciles'],
['الغروب','SUNSET','SUNSET','SUNSET'],['غروب','Sunset','Coucher de soleil','Atardecer'],['ليل','Night','Nuit','Noche'],['صحراء','Desert','Désert','Desierto'],['ثلج','Snow','Neige','Nieve'],['صافٍ','Clear','Dégagé','Despejado'],['مطر','Rain','Pluie','Lluvia'],['عاصفة','Storm','Orage','Tormenta'],['إسفلت','Asphalt','Asphalte','Asfalto'],['ترابي','Dirt','Terre','Tierra'],['وحل','Mud','Boue','Barro'],['جودة عالية','High quality','Qualité haute','Calidad alta'],['متوسطة','Medium','Moyenne','Media'],
['العملات:','Coins:','Pièces :','Monedas:'],['المحرك','Engine','Moteur','Motor'],['الإطارات','Tires','Pneus','Neumáticos'],['النيترو','Nitro','Nitro','Nitro'],['نيترو','Nitro','Nitro','Nitro'],['ابدأ السباق','Start race','Démarrer','Iniciar carrera'],
['المركز','Place','Place','Puesto'],['اللفة','Lap','Tour','Vuelta'],['الوقت','Time','Temps','Tiempo'],['كم/س','km/h','km/h','km/h'],['تسريع','Gas','Gaz','Gas'],['فرامل','Brake','Frein','Freno'],['يسار','Left','Gauche','Izq.'],['يمين','Right','Droite','Der.'],['انطلق!','GO!','GO !','¡YA!'],['عكس الاتجاه!','Wrong way!','Sens inverse !','¡Dirección contraria!'],
['الأول','1st','1er','1.º'],['الثاني','2nd','2e','2.º'],['الثالث','3rd','3e','3.º'],['الرابع','4th','4e','4.º'],['الخامس','5th','5e','5.º'],['الوقت الكلي','Total time','Temps total','Tiempo total'],['أسرع لفة','Best lap','Meilleur tour','Mejor vuelta'],['رقم قياسي جديد.','New record.','Nouveau record.','Nuevo récord.'],['أفضل وقت لك:','Your best:','Votre record :','Tu mejor:'],['عملة','coins','pièces','monedas'],['سباق جديد','New race','Nouvelle course','Nueva carrera'],
['سباق','RACE','COURSE','CARRERA'],['تيربو','Turbo','Turbo','Turbo'],['وحش الطريق','Road beast','Bête de route','Bestia de ruta'],['بطل','Champion','Champion','Campeón'],['سرعة','Speed','Vitesse','Velocidad'],['المصابيح','Lights','Phares','Luces'],['النقاط:','Score:','Score :','Puntos:'],['النقاط','Score','Score','Puntos'],['أعلى نقاط','Best score','Meilleur score','Mejor puntuación'],['الإنجازات','Achievements','Succès','Logros'],['وقت اللعب','Play time','Temps de jeu','Tiempo de juego'],['السباقات','Races','Courses','Carreras'],['الانتصارات','Wins','Victoires','Victorias'],['وقت الانجراف','Drift time','Temps de dérapage','Tiempo de derrape'],['وقت النيترو','Nitro time','Temps de nitro','Tiempo de nitro'],['انجراف','Drift','Dérapage','Derrape'],['تجاوز','Overtake','Dépassement','Adelantamiento'],['إنجاز جديد!','New achievement!','Nouveau succès !','¡Nuevo logro!'],['أول فوز','First win','Première victoire','Primera victoria'],['ثلاثة انتصارات','Three wins','Trois victoires','Tres victorias'],['ملك الانجراف','Drift king','Roi du dérapage','Rey del derrape'],['مدمن نيترو','Nitro addict','Accro au nitro','Adicto al nitro'],['سرعة خارقة','Supersonic','Supersonique','Supersónico'],['سباق نظيف','Clean race','Course propre','Carrera limpia'],['عابر النفق','Tunnel runner','Coureur du tunnel','Corredor del túnel'],['سائق المطر','Rain driver','Pilote sous la pluie','Piloto de lluvia'],['سيد الوحل','Mud master','Maître de la boue','Maestro del barro'],['تاجر العملات','Coin tycoon','Magnat des pièces','Magnate de monedas'],['ماراثون','Marathon','Marathon','Maratón'],['بطل اليوم','Daily champion','Champion du jour','Campeón del día'],['زيت','Oil','Huile','Aceite'],['قفزة','Jump','Saut','Salto'],['جودة الرسوميات','Graphics quality','Qualité graphique','Calidad gráfica'],['الظلال','Shadows','Ombres','Sombras'],['الحشود','Crowds','Foules','Multitudes'],['عرض الإطارات','Show FPS','Afficher les FPS','Mostrar FPS'],['تلقائي','Auto','Auto','Auto'],['المغناطيس','Magnet','Aimant','Imán'],['المضاعف','Multiplier','Multiplicateur','Multiplicador'],['مكافأة يومية','Daily bonus','Bonus quotidien','Bonificación diaria'],['سلسلة','Streak','Série','Racha'],['عملات غير كافية','Not enough coins','Pas assez de pièces','Monedas insuficientes'],['نجمة','Star','Étoile','Estrella'],['الجبل','Mountain','Montagne','Montaña'],['الماراثون','Marathon','Marathon','Maratón'],['المستوى','Level','Niveau','Nivel'],['مستوى جديد!','Level up!','Niveau supérieur !','¡Subes de nivel!'],['مهام اليوم','Daily missions','Missions du jour','Misiones diarias'],['انجرف 40 ثانية','Drift for 40s','Dérapez 40 s','Derrapa 40 s'],['اجمع 150 عملة','Earn 150 coins','Gagnez 150 pièces','Gana 150 monedas'],['أنهِ 3 سباقات','Finish 3 races','Terminez 3 courses','Termina 3 carreras'],['فز بسباق','Win a race','Gagnez une course','Gana una carrera'],['استخدم النيترو 20 ثانية','Use nitro for 20s','Nitro pendant 20 s','Usa nitro 20 s'],['اكسب 3000 نقطة','Score 3000 points','Marquez 3000 points','Consigue 3000 puntos'],['سيارة الشبح','Ghost car','Voiture fantôme','Coche fantasma'],['انطلاقة مثالية','Perfect start','Départ parfait','Salida perfecta'],['مشاركة','Share','Partager','Compartir'],['عضلات','Muscle','Muscle','Muscle'],['كهربائية','Electric','Électrique','Eléctrico'],['التوجيه بإمالة الجهاز','Tilt steering','Direction par inclinaison','Dirección por inclinación'],['اللفة الأخيرة!','Final lap!','Dernier tour !','¡Última vuelta!']];
const LN=['ar','en','fr','es'],LNM=['العربية','English','Français','Español'];let LG=0,D=[];const OR=new WeakMap(),tr=s=>{if(!LG)return s;for(const[a,b]of D)s=s.split(a).join(b);return s};
function trNode(n){const p=n.parentNode;if(!p||p.nodeName==='SCRIPT'||p.nodeName==='STYLE')return;let o=OR.get(n);if(o===undefined){o=n.nodeValue;if(!/[\u0600-\u06FF]/.test(o))return;OR.set(n,o)}const t=tr(o);if(n.nodeValue!==t)n.nodeValue=t}
function walk(r){const w=document.createTreeWalker(r,4);let n;while(n=w.nextNode())trNode(n)}
function setLang(i){LG=i;D=I18.map(r=>[r[0],r[i]]).sort((a,b)=>b[0].length-a[0].length);document.documentElement.lang=LN[i];document.documentElement.dir=i?'ltr':'rtl';walk(document.body);try{localStorage.setItem('sunset-lang',i)}catch(e){}[...$('lg').children].forEach((b,j)=>b.classList.toggle('on',j==i))}
new MutationObserver(ms=>{if(!LG)return;ms.forEach(m=>m.addedNodes.forEach(n=>n.nodeType===3?trNode(n):n.nodeType===1&&walk(n)))}).observe(document.body,{childList:true,subtree:true});
document.querySelector('.hw').innerHTML=['WASD أو الأسهم للقيادة · Space للانجراف · Shift للنيترو · R للعودة إلى الطريق · Esc للإيقاف.','يد التحكم: العصا اليسرى للتوجيه، RT للتسارع، LT للفرملة، B للانجراف، X للنيترو، Start للإيقاف.','على الهاتف اضغط التسريع والتوجيه معًا، وأضف الانجراف أو النيترو عند الحاجة.','النيترو يتعبّأ بالانجراف وبالمربعات الزرقاء.','اختر النفق المختصر أو الطريق الخارجي.','المطر والوحل يقللان التماسك، فخفّف قبل المنعطف.','اكسب العملات وطوّر سيارتك في الورشة.'].map(s=>'<li>'+s+'</li>').join('');
$('mDay').onclick=()=>{const d=new Date(),s=d.getFullYear()*372+d.getMonth()*31+d.getDate(),rn=k=>((s*9301+k*49297)%233280)/233280;trk=Math.floor(rn(1)*TR.length);thm=Math.floor(rn(2)*4);wxs=Math.floor(rn(3)*3);sfc=Math.floor(rn(4)*3);lps=3;DAILY=1;$('menu').hidden=true;sndInit();if(AC&&AC.resume)AC.resume();setMode('race')};
$('mAch').onclick=()=>{achUi();shw('sAch',1)};$('cA').onclick=()=>shw('sAch',0);achUi();
seg('lg',LNM,0,setLang);let l0=1;try{const sv=localStorage.getItem('sunset-lang'),k=LN.indexOf((navigator.language||'en').slice(0,2));l0=sv!==null?+sv:(k<0?1:k)}catch(e){}if(!(l0>=0&&l0<LN.length))l0=1;setLang(l0);
const PM=[['#ffd700',300],['#c9d2dc',300],['#ff2ec4',400]],pmUi=()=>[...$('sw2').children].forEach((b,i)=>{b.textContent=S.o.includes(i)?'':'🔒'+PM[i][1]});
PM.forEach(([c,pr],i)=>{const b=document.createElement('button');b.style.background=c;b.style.fontSize='10px';b.style.color='#000';b.onclick=()=>{if(S.o.includes(i)){col=c;car.userData.bm.color.set(c).convertSRGBToLinear()}else if(coins>=pr){coins-=pr;S.o.push(i);svu();svs();upUi();pmUi();col=c;car.userData.bm.color.set(c).convertSRGBToLinear()}else popup('عملات غير كافية')};$('sw2').appendChild(b)});pmUi();trrUi();upUi();
try{const d=new Date().toDateString(),l=localStorage.getItem('sunset-day'),y=new Date(Date.now()-864e5).toDateString();let st=+(localStorage.getItem('sunset-streak')||0);if(l!==d){st=l===y?st+1:1;const g=Math.min(200,25+st*25);coins+=g;S.tc+=g;svu();svs();upUi();localStorage.setItem('sunset-day',d);localStorage.setItem('sunset-streak',st);setTimeout(()=>{if(mode==='garage')toastT('🎁 مكافأة يومية: +'+g+' عملة · سلسلة '+st);},1200)}}catch(e){}
$('tgTl').onclick=async()=>{const b=$('tgTl'),on=b.getAttribute('aria-checked')!=='true';if(on&&window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission){try{const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')return}catch(e){return}}b.setAttribute('aria-checked',String(on));TL=on?1:0;$('ctl').classList.toggle('tl',on)};
addEventListener('deviceorientation',e=>{if(e.gamma!=null)GM=Math.abs(e.gamma)<3?0:e.gamma});carLock();
$('shr').onclick=()=>{const t=tr('النقاط:')+' '+Math.round(SC)+' · SUNSET RUSH';if(navigator.share)navigator.share({text:t}).catch(()=>{});else try{navigator.clipboard.writeText(t)}catch(e){}};dayInit();achUi();
correctColors(gar);setMode('garage');showMenu();requestAnimationFrame(frame);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
}

if(import.meta.env.DEV && new URLSearchParams(location.search).has('test')){
  garage(0);testManual=true;
  window.__sunset={
    start:()=>{$('menu').hidden=true;setMode('race');},
    state:()=>({mode,state,paused,car:ty,track:trk,time:P.t,speed:P.v,nitro:P.nt,x:P.x,z:P.z,heading:P.th,direction:P.mv,drifting:Math.abs(wrapAngle(P.mv-P.th))>.12,cum:P.cum,lap:progress.completed,laps:[...P.laps],finish:P.fin,rank:P.place,results:standings(),keys:{...K},contacts:drivePhysics.contacts,renderer:{calls:rd.info.render.calls,triangles:rd.info.render.triangles,geometries:rd.info.memory.geometries,textures:rd.info.memory.textures},frameTimes:frameMetrics.frames()}),
    step:(frames,keys={})=>{Object.assign(K,{l:0,r:0,g:0,b:0,h:0,n:0},keys);for(let i=0;i<frames;i++)if(!paused)stepSimulation(FIXED_STEP);if(!paused)renderRace(1,Math.min(frames*FIXED_STEP,.2));},
    poll:()=>input.poll(),resetMetrics:()=>frameMetrics.reset(),restart:reset,recover:recoverCar,pause:pauseRace,
    select:(i)=>{setCar(i);if(mode==='race')renderRace(1,0);},quality:i=>{QA=i==='auto';setQ(QA?ql:i);},track:i=>{trk=i;reset();},
    aim:distance=>cl(P.cum+distance),
    render:()=>{skyM.position.copy(cam.position);prepareRender(1/60);rd.render(sc,cam);},
    manual:value=>{testManual=value;simulationClock.reset();poses.reset();last=performance.now();},
    advance:(elapsed,keys={})=>advanceRace(elapsed,()=>Object.assign(K,{l:0,r:0,g:0,b:0,h:0,n:0},typeof keys==='function'?keys():keys)),
    tick:updateScene,
    present:(alpha,dt=0)=>renderRace(alpha,dt),
    presentation:()=>({alpha:simulationClock.alpha,droppedTime:simulationClock.droppedTime,previous:poses.previous.map(p=>({...p})),current:poses.current.map(p=>({...p})),shown:[car,...ai.map(a=>a.m)].map(m=>({x:m.position.x,y:m.position.y,z:m.position.z,heading:m.rotation.y})),camera:{position:cam.position.toArray(),quaternion:cam.quaternion.toArray(),fov:cam.fov},shake:cameraShake,cameraMode:cmv}),
    camera:()=>{cmv=(cmv+1)%3;},
    environment:value=>{environmentOverride=value;prepareRender(0);return{time:rc.userData.coast?.time.value,birds:rc.userData.coast?.birds?.visible,traffic:rc.userData.coast?.traffic?.visible,waterDetail:rc.userData.coast?.detail.value};},
    diagnostics:()=>({...frameMetrics.snapshot(rd.info,performance.memory),quality:QUALITY[ql].name,auto:!!QA,dpr:rd.getPixelRatio(),resolutionScale:resolution.scale,reducedEffects,trackBuilds,lowDetailRivals:ai.filter(a=>a.m.userData.lod.reduced).length,canvas:[cv.width,cv.height]}),
    graphics:(options={})=>{if(options.reduced!==undefined)reducedEffects=options.reduced;if(options.shadows!==undefined)SHD=options.shadows?1:0;applyQuality();},
    view:value=>{if(value){cam.position.fromArray(value.position);cam.quaternion.fromArray(value.quaternion);cam.fov=value.fov;cam.updateProjectionMatrix();}return{position:cam.position.toArray(),quaternion:cam.quaternion.toArray(),fov:cam.fov};},
  };
}
