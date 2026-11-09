import * as THREE from 'three';

// Original longitudinal body rings: rounded shoulders and tapered nose/tail.
// Shared vertices smooth the paint highlights without subdivision or extra draws.
export function createSportBody(width=2,height=.55){
  const sections=[[-2.3,.77,.8],[-2.12,.94,.96],[-1.6,1,1],[-.85,1.02,1],[.65,.97,.98],[1.55,.95,.93],[2.13,.85,.79],[2.3,.67,.57]];
  const ring=[[-.82,0],[.82,0],[1,.2],[1,.66],[.84,1],[-.84,1],[-1,.66],[-1,.2]],positions=[],uv=[],indices=[];
  for(const [z,w,h] of sections)for(const [x,y] of ring){positions.push(x*width*w/2,.3+y*(height+.05)*h,z);uv.push(x*.5+.5,(z+2.3)/4.6);}
  for(let s=0;s<sections.length-1;s++)for(let i=0;i<8;i++){const a=s*8+i,b=s*8+(i+1)%8;indices.push(a,b,a+8,b,b+8,a+8);}
  for(let i=1;i<7;i++){indices.push(0,i+1,i);const end=(sections.length-1)*8;indices.push(end,end+i,end+i+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

export function createCabinGeometry(width,deck,height,length,center){
  const rear=center-length/2,front=center+length/2,w=width/2;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -w,deck,rear,w,deck,rear,w,deck,front,-w,deck,front,
    -w*.74,deck+height,rear+.43,w*.74,deck+height,rear+.43,w*.74,deck+height,front-.62,-w*.74,deck+height,front-.62
  ],3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],2));
  geometry.setIndex([0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,7,5,5,7,6,0,1,3,1,2,3]);
  const flat=geometry.toNonIndexed();geometry.dispose();flat.computeVertexNormals();return flat;
}

// Six different, directionally continuous faces; no live reflection camera.
// Local deterministic maths deliberately leaves the gameplay random stream alone.
export function createSunsetEnvironment(size=128){
  const faces=[],sun=new THREE.Vector3(330,80,600).normalize();
  for(let face=0;face<6;face++){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1;
      const dir=[[1,-v,-u],[-1,-v,u],[u,1,v],[u,-1,-v],[u,-v,1],[-u,-v,-1]][face],length=Math.hypot(...dir),nx=dir[0]/length,ny=dir[1]/length,nz=dir[2]/length;
      const t=Math.min(1,Math.abs(ny)*1.8),horizon=ny>=0?[255,211,165]:[91,98,106],pole=ny>=0?[91,148,205]:[30,37,45];
      const reflection=Math.pow(Math.max(0,nx*sun.x+ny*sun.y+nz*sun.z),160)*95;
      const cloud=ny>.04&&ny<.45?Math.max(0,Math.sin(nx*17+nz*9+ny*31))**8*14:0;
      for(let c=0;c<3;c++)pixels.data[(y*size+x)*4+c]=Math.min(255,horizon[c]*(1-t)+pole[c]*t+reflection+cloud);
      pixels.data[(y*size+x)*4+3]=255;
    }
    ctx.putImageData(pixels,0,0);faces.push(canvas);
  }
  const texture=new THREE.CubeTexture(faces);texture.encoding=THREE.sRGBEncoding;texture.needsUpdate=true;return texture;
}

// Presentation only: no acceleration is fed back to Cannon, progress or camera.
// Use the already interpolated pose, so 120/144 Hz rendering stays continuous.
export function animateChassis(car,pose,reduced=false){
  const body=car.userData.body;if(!body)return;
  const amount=reduced?.35:1,travel=Math.min(1,Math.abs(pose.speed)/45);
  body.rotation.x=pose.pitch*.35*amount;body.rotation.z=pose.roll*.5*amount;
  body.position.y=Math.sin(pose.wheel*1.3)*.012*travel*amount;
  const wheels=car.userData.wh;
  for(let i=0;i<wheels.length;i++){
    const side=i%2===0?-1:1,front=i<2?1:-1;
    wheels[i].position.y=.44+Math.max(-.065,Math.min(.065,side*pose.roll*.14+front*pose.pitch*.18))*amount;
  }
}
