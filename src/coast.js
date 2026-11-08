import * as THREE from 'three';
import { spatialBatch, instancedBoxes } from './graphics.js';

// All meshes and textures in this file are original procedural assets (MIT).
// Static scenery is merged by material; no per-tree / per-window draw calls.
export function buildCoast(group, { radius, width, point, radial }) {
  let seed = 135;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const batches = new Map();
  const mat = (color, {roughness=.8,metalness=0,...options} = {}) => metalness>0 ? new THREE.MeshStandardMaterial({color,roughness,metalness,...options}) : new THREE.MeshLambertMaterial({color,...options});
  const sand = mat('#edc696'), green = mat('#809663'), rock = mat('#ba9679');
  const red = mat('#df593b', { roughness: .45, metalness: .22 });
  const steel = mat('#654b55'), dark = mat('#253c4d'), cream = mat('#fff0c8');
  const trunk = mat('#9b7150'), leaf = mat('#267b60', { side: THREE.DoubleSide });
  const leafLight = mat('#5caa78', { side: THREE.DoubleSide });
  const matrix = new THREE.Object3D();
  function add(geometry, material, x=0,y=0,z=0, rx=0,ry=0,rz=0) {
    matrix.position.set(x,y,z); matrix.rotation.set(rx,ry,rz); matrix.scale.set(1,1,1); matrix.updateMatrix();
    geometry.applyMatrix4(matrix.matrix);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
  }
  const box = (w,h,d,m,x,y,z,ry=0) => add(new THREE.BoxGeometry(w,h,d),m,x,y,z,0,ry);
  function beam(a,b,r,m,sides=6) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const g = new THREE.CylinderGeometry(r,r,delta.length(),sides);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())));
    const p = start.add(end).multiplyScalar(.5); add(g,m,p.x,p.y,p.z);
  }
  // A continuous island follows the actual circuit, so scenery never cuts across the driving surface.
  function island(extra,y,material) {
    const positions=[0,y,0], indices=[];
    for(let i=0;i<=256;i++) { const t=i/256*Math.PI*2, r=radial(t)+width/2+extra; positions.push(Math.cos(t)*r,y,Math.sin(t)*r); if(i<256)indices.push(0,i+2,i+1); }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();add(g,material);
  }
  island(29,-.7,sand); island(16,-.1,green);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},
    vertexShader:`varying vec3 world; void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
    fragmentShader:`varying vec3 world; uniform float time;
      void main(){float wave=sin(world.x*.19+world.z*.11+time*.7)*sin(world.z*.23-time*.5);
      float ripples=pow(max(0.,wave),12.); float distanceFog=smoothstep(250.,1200.,length(world.xz-cameraPosition.xz));
      vec3 sea=mix(vec3(.045,.36,.43),vec3(.17,.57,.58),.5+.5*wave);
      float sunPath=pow(max(0.,1.-abs((world.x-cameraPosition.x)*.0025-(world.z-cameraPosition.z)*.001)),16.);
      sea+=vec3(.8,.44,.19)*ripples*(.15+.7*sunPath);
      gl_FragColor=vec4(mix(sea,vec3(.91,.67,.50),distanceFog),1.);}`
  });
  const water=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),waterMaterial);water.rotation.x=-Math.PI/2;water.position.y=-1.1;water.renderOrder=2;group.add(water);
  group.userData.water=waterMaterial;
  // Long, low coastline rocks. Kept off the road by a radial clearance.
  for(let i=0;i<55;i++) {
    const t=random()*Math.PI*2,r=radial(t)+width/2+20+random()*8;
    const g=new THREE.IcosahedronGeometry(1,0);g.scale(2+random()*5,1+random()*2,2+random()*5);
    add(g,rock,Math.cos(t)*r,-.5,Math.sin(t)*r,0,random()*6.28);
  }
  function palm(x,z,h,angle) {
    const leanX=Math.cos(angle)*h*.12, leanZ=Math.sin(angle)*h*.12;
    beam([x,0,z],[x+leanX,h,z+leanZ],.22,trunk,7);
    const crown=[x+leanX,h,z+leanZ];
    for(let j=0;j<7;j++) {
      const a=angle+j*Math.PI*2/7, len=3.3+random()*1.6, positions=[], indices=[];
      for(let k=0;k<=6;k++) {
        const u=k/6, stretch=u*len, yy=Math.sin(u*Math.PI)*1.1-u*u*1.7, half=Math.sin(Math.PI*u)*.53;
        for(const side of [-1,1]) positions.push(crown[0]+Math.cos(a)*stretch+Math.sin(a)*half*side,crown[1]+yy,crown[2]+Math.sin(a)*stretch-Math.cos(a)*half*side);
        if(k<6) {const n=k*2; indices.push(n,n+1,n+2,n+1,n+3,n+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();add(g,j%2?leaf:leafLight);
    }
  }
  for(let i=0;i<66;i++) {
    const t=i/66*Math.PI*2+.015, side=i%3===0?-1:1;
    const p=point(t,side*(width/2+9+random()*6));palm(p[0],p[1],7+random()*5,random()*6.28);
  }
  // Island hills and cypress clusters on the infield.
  for(let i=0;i<15;i++) {
    const t=random()*6.28, r=25+random()*70, g=new THREE.SphereGeometry(1,12,7);
    g.scale(18+random()*22,8+random()*15,18+random()*20);add(g,i%2?green:rock,Math.cos(t)*r,-3,Math.sin(t)*r);
  }
  // Suspension bridge is a distant landmark over the bay, not an invisible obstacle on the circuit.
  const bridge=new THREE.Group();group.add(bridge);
  // Build in a local frame then rotate all bridge geometry together.
  const before=new Map([...batches].map(([m,list])=>[m,list.length]));
  box(20,1.8,520,dark,0,10,0);box(22,.6,520,red,0,8.6,0);
  for(const z of [-150,150]) {
    for(const x of [-12,12]) {box(3.2,74,4.4,red,x,29,z);box(6,5,9,rock,x,-3,z);}
    for(const y of [19,42,63]) box(27,2.8,3.6,red,0,y,z);
  }
  for(const side of [-1,1]) {
    box(.5,2.2,520,red,side*10.8,11.5,0);
    for(let z=-250;z<250;z+=8) {
      const cableY=t=>Math.abs(t)<=150?24+40*(t/150)**2:64-(Math.abs(t)-150)*.48;
      beam([side*12,cableY(z),z],[side*12,cableY(z+8),z+8],.32,red);
      beam([side*12,11,z],[side*12,cableY(z),z],.09,steel,5);
    }
  }
  const transform=new THREE.Matrix4().makeRotationY(-.34);transform.setPosition(100,0,440);
  for(const [m,list] of batches) for(let i=before.get(m)||0;i<list.length;i++)list[i].applyMatrix4(transform);
  // Stylized peninsula skyline, with baked windows instead of individual lit meshes.
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#788993';ctx.fillRect(0,0,64,128);
  for(let x=5;x<64;x+=12)for(let y=5;y<128;y+=14){ctx.fillStyle=random()>.45?'#edcda0':'#405f72';ctx.fillRect(x,y,5,8);}
  const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
  const building=mat('#ffffff',{map:texture});
  const buildings=[];
  for(let i=0;i<65;i++) {
    const x=-210-random()*310,z=260+random()*220,h=12+random()*64;
    buildings.push({w:10+random()*16,h,d:10+random()*18,x,y:h/2-1,z});
  }
  instancedBoxes(group,building,buildings);
  const sailMaterial=new THREE.MeshBasicMaterial({color:'#fff1d4',side:THREE.DoubleSide});
  // Sailboats and distant layered headlands make the bay read as open water.
  for(let i=0;i<7;i++) {
    const x=300+random()*250,z=-240+random()*520;
    box(2.2,1,8,cream,x,-.1,z,.2);beam([x,0,z],[x,12,z],.1,dark);
    const sail=new THREE.BufferGeometry();sail.setAttribute('position',new THREE.Float32BufferAttribute([x,11,z,x,1,z+4,x,1,z],3));sail.computeVertexNormals();add(sail,sailMaterial);
  }
  const distant=mat('#8c9995');
  for(let i=0;i<14;i++) {
    const g=new THREE.SphereGeometry(1,10,6);g.scale(100+random()*80,25+random()*55,100);
    add(g,distant,-650+i*100,-12,850+random()*80);
  }
  // Start/finish gantry and checkered line aligned with the actual circuit tangent.
  const start=point(0), finishMaterial=new THREE.MeshBasicMaterial({color:'#f5ecdb'});
  for(let j=0;j<2;j++)for(let i=0;i<22;i++)if((i+j)%2===0)box(width/22,.018,.8,finishMaterial,start[0]-width/2+(i+.5)*width/22,.064,j*.8-.4);
  for(const side of [-1,1])box(.7,9.5,.9,dark,start[0]+side*(width/2+1.6),4.75,2);
  box(width+4,1.5,1,dark,start[0],9.5,2);
  const sign=document.createElement('canvas');sign.width=1024;sign.height=128;
  const sx=sign.getContext('2d');sx.fillStyle='#142a36';sx.fillRect(0,0,1024,128);sx.fillStyle='#ffbe70';sx.font='italic 900 65px sans-serif';sx.textAlign='center';sx.fillText('SUNSET  /  RUSH',512,86);
  const signTex=new THREE.CanvasTexture(sign);signTex.encoding=THREE.sRGBEncoding;
  const signMesh=new THREE.Mesh(new THREE.PlaneGeometry(width+2,1.8),new THREE.MeshBasicMaterial({map:signTex,side:THREE.DoubleSide}));signMesh.position.set(start[0],9.5,1.45);signMesh.rotation.y=Math.PI;group.add(signMesh);
  // Warm roadside lamps and direction chevrons.
  for(let i=0;i<30;i++) {
    const t=i/30*Math.PI*2,p=point(t,width/2+5);
    beam([p[0],0,p[1]],[p[0],7,p[1]],.11,dark);
    box(1.7,.15,.65,cream,p[0],7,p[1]);
  }
  for(const [material, geometries] of batches) spatialBatch(group,material,geometries,{castShadow:![sand,green,distant,building].includes(material)});
  return { water:waterMaterial };
}
