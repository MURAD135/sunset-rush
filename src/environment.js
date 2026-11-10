import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Original procedural textures, geometry and animation. No simulation state is read or written.
export function createCoastLife(){return{time:{value:0},motion:{value:1},detail:{value:1},birds:null,traffic:null};}

export function createWater(life){
  const size=128,data=new Uint8Array(size*size*4);
  // A periodic, baked wave field replaces high-contrast stripe interference.
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2,i=(y*size+x)*4;
    data[i]=128+Math.round(52*Math.sin(u*3+Math.sin(v*2))+30*Math.cos(v*5+u));
    data[i+1]=128+Math.round(48*Math.cos(v*3+Math.sin(u*2))+28*Math.sin(u*5-v));
    data[i+2]=128+Math.round(45*Math.sin(u*2-v*3));data[i+3]=255;
  }
  const ripple=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);ripple.wrapS=ripple.wrapT=THREE.RepeatWrapping;ripple.magFilter=THREE.LinearFilter;ripple.minFilter=THREE.LinearMipMapLinearFilter;ripple.generateMipmaps=true;ripple.needsUpdate=true;
  return new THREE.ShaderMaterial({
    uniforms:{time:life.time,detail:life.detail,ripple:{value:ripple}},
    vertexShader:`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
    fragmentShader:`varying vec3 world;uniform sampler2D ripple;uniform float time,detail;
      void main(){
        vec2 uv=world.xz*.019;
        vec2 a=texture2D(ripple,uv+vec2(time*.009,-time*.006)).rg-.5;
        vec2 b=vec2(0.);if(detail>.5)b=texture2D(ripple,uv*.61+vec2(-time*.005,time*.008)).rg-.5;
        vec3 normal=normalize(vec3((a.x+b.x*.55)*.24,1.,(a.y+b.y*.55)*.24));
        vec3 view=normalize(cameraPosition-world);float fresnel=pow(1.-max(dot(normal,view),0.),3.);
        float distanceFog=smoothstep(250.,1400.,length(world.xz-cameraPosition.xz));
        vec3 sea=mix(vec3(.012,.16,.19),vec3(.018,.30,.29),.48+a.x*.3);
        sea=mix(sea,vec3(.17,.36,.40),fresnel*.55);
        vec3 sunDirection=normalize(vec3(330.,80.,600.));
        float glint=pow(max(dot(reflect(-view,normal),sunDirection),0.),64.);
        sea+=vec3(1.8,.93,.34)*glint;
        sea=mix(sea,vec3(.66,.42,.25),distanceFog*.7);
        gl_FragColor=vec4(sea,1.);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  });
}

function vertexAnimation(material,life,body,key){
  material.onBeforeCompile=shader=>{
    shader.uniforms.lifeTime=life.time;shader.uniforms.lifeMotion=life.motion;
    shader.vertexShader='uniform float lifeTime;uniform float lifeMotion;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+body);
  };
  material.customProgramCacheKey=()=>key;
}
export function addPalmWind(material,life){
  const code=`float bend=windWeight*lifeMotion;
    transformed.x+=sin(lifeTime*1.35+position.x*.08+position.z*.11)*bend*.55;
    transformed.z+=cos(lifeTime*.93+position.z*.09)*bend*.32;
    transformed.y+=sin(lifeTime*1.8+position.x*.14)*bend*.12;`;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
  for(const m of [material,depth]){
    vertexAnimation(m,life,code,'coastal-palm-wind-v1');
    const compile=m.onBeforeCompile;m.onBeforeCompile=shader=>{compile(shader);shader.vertexShader='attribute float windWeight;\n'+shader.vertexShader;};
  }
  material.userData.windDepth=depth;
}

export function addSkyClouds(sky){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d');let seed=389;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let band=0;band<18;band++){
    const x=random()*1024,y=120+random()*106,w=45+random()*110,h=5+random()*15;
    for(let j=0;j<7;j++){
      const px=x+(j-3)*w*.18,py=y+Math.sin(j*1.7+band)*h*.35;
      const g=c.createRadialGradient(px,py,0,px,py,w*.32);
      g.addColorStop(0,'rgba(255,235,210,.82)');g.addColorStop(.4,'rgba(255,218,187,.56)');g.addColorStop(1,'rgba(214,168,160,0)');
      c.save();c.translate(px,py);c.scale(1,h/(w*.32));c.translate(-px,-py);c.fillStyle=g;c.fillRect(px-w*.35,py-w*.35,w*.7,w*.7);c.restore();
    }
  }
  // Bake color conversion once instead of three pow() operations per sky pixel.
  const pixels=c.getImageData(0,0,1024,512);for(let i=0;i<pixels.data.length;i+=4)for(let j=0;j<3;j++)pixels.data[i+j]=Math.round(255*(pixels.data[i+j]/255)**2.2);c.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;
  const time={value:0},strength={value:.8};
  sky.material.onBeforeCompile=shader=>{
    shader.uniforms.cloudMap={value:texture};shader.uniforms.cloudTime=time;shader.uniforms.cloudStrength=strength;
    shader.vertexShader='varying vec2 cloudUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncloudUv=uv;');
    shader.fragmentShader='uniform sampler2D cloudMap;uniform float cloudTime,cloudStrength;varying vec2 cloudUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(cloudStrength>0.){vec4 cloud=texture2D(cloudMap,vec2(fract(cloudUv.x+cloudTime*.0008),cloudUv.y));
      diffuseColor.rgb=mix(diffuseColor.rgb,cloud.rgb,cloud.a*cloudStrength);}`);
  };
  sky.material.customProgramCacheKey=()=> 'sunset-cloud-layer-v1';
  return{time,strength,texture};
}

function coloredPart(parts,geometry,color,x=0,y=0,z=0){
  geometry.translate(x,y,z);const g=geometry.index?geometry.toNonIndexed():geometry;
  if(!g.attributes.normal)g.computeVertexNormals();
  if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const c=new THREE.Color(color).convertSRGBToLinear(),values=new Float32Array(g.attributes.position.count*3);
  for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(values,3));parts.push(g);if(g!==geometry)geometry.dispose();
}
function boundsForInstances(geometry,points,padding){
  const bounds=new THREE.Box3();for(const p of points)bounds.expandByPoint(new THREE.Vector3(p.x,p.y||0,p.z));bounds.expandByScalar(padding);geometry.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());geometry.boundingBox=bounds;
}
export function addBoats(group,points,life){
  const parts=[];
  coloredPart(parts,new THREE.BoxGeometry(2.1,.65,7),'#fbecd0',0,-.1,0);
  coloredPart(parts,new THREE.BoxGeometry(1.5,.1,5.4),'#aa7654',0,.25,0);
  coloredPart(parts,new THREE.CylinderGeometry(.07,.09,11,6),'#4a5961',0,5.7,0);
  const sail=new THREE.BufferGeometry();sail.setAttribute('position',new THREE.Float32BufferAttribute([0,11,0,0,1,4.1,.55,5,2,0,11,0,.55,5,2,0,1,0,0,1,0,.55,5,2,0,1,4.1],3));
  coloredPart(parts,sail,'#fff4df');
  const geometry=BufferGeometryUtils.mergeBufferGeometries(parts);parts.forEach(g=>g.dispose());
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  vertexAnimation(material,life,`transformed.y+=sin(lifeTime*.9+instanceMatrix[3].x*.06)*.22*lifeMotion;
    transformed.x+=position.y*sin(lifeTime*.7+instanceMatrix[3].z*.03)*.025*lifeMotion;`,'coastal-boats-v1');
  const boats=new THREE.InstancedMesh(geometry,material,points.length),object=new THREE.Object3D();
  points.forEach((p,i)=>{object.position.set(p.x,0,p.z);object.rotation.y=.2+i*.35;object.updateMatrix();boats.setMatrixAt(i,object.matrix);});
  boundsForInstances(geometry,points,14);boats.frustumCulled=true;boats.name='sailboat-fleet';group.add(boats);return boats;
}
export function addBirds(group,life){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.3,-.8,.12,-.1,-.1,0,-.1,0,0,.3,.1,0,-.1,.8,.12,-.1],3));geometry.computeVertexNormals();
  const material=new THREE.MeshBasicMaterial({color:'#384e5b',side:THREE.DoubleSide});
  vertexAnimation(material,life,`transformed.y+=abs(position.x)*sin(lifeTime*4.+instanceMatrix[3].x)*.6*lifeMotion;
    transformed.x+=sin(lifeTime*.19+instanceMatrix[3].z)*6.*lifeMotion;
    transformed.z+=cos(lifeTime*.16+instanceMatrix[3].x)*7.*lifeMotion;`,'coastal-birds-v1');
  const birds=new THREE.InstancedMesh(geometry,material,14),object=new THREE.Object3D(),points=[];
  for(let i=0;i<14;i++){const p={x:260+Math.sin(i*2.2)*65,y:18+(i%5)*2.4,z:60+Math.cos(i*1.6)*85};points.push(p);object.position.set(p.x,p.y,p.z);object.rotation.y=i*1.8;object.scale.setScalar(1.2);object.updateMatrix();birds.setMatrixAt(i,object.matrix);}
  boundsForInstances(geometry,points,12);birds.frustumCulled=true;birds.name='seagulls';group.add(birds);life.birds=birds;return birds;
}
export function addBridgeTraffic(bridge,life){
  const geometry=new THREE.BoxGeometry(2,.8,4),material=new THREE.MeshLambertMaterial();
  vertexAnimation(material,life,`float travel=mod(instanceMatrix[3].z+250.+lifeTime*(instanceMatrix[3].x>0.?9.:-11.)*lifeMotion,500.)-250.;transformed.z+=travel-instanceMatrix[3].z;`,'coastal-traffic-v1');
  const traffic=new THREE.InstancedMesh(geometry,material,12),object=new THREE.Object3D();
  for(let i=0;i<12;i++){object.position.set(i%2?4:-4,11.5,-235+i*40);object.updateMatrix();traffic.setMatrixAt(i,object.matrix);traffic.setColorAt(i,new THREE.Color(['#ffd483','#edf5ec','#68a8c3'][i%3]).convertSRGBToLinear());}
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,11.5,0),260);traffic.frustumCulled=true;traffic.name='bridge-traffic';bridge.add(traffic);life.traffic=traffic;
}
