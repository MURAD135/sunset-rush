import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// r128 does not compute InstancedMesh bounds. Give each spatial cluster its own
// geometry bounds so both the scene and shadow frusta can actually reject it.
export function instancedBoxes(group,material,boxes,cellSize=180){
  const cells=new Map(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  for(const box of boxes){const key=`${Math.floor(box.x/cellSize)},${Math.floor(box.z/cellSize)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(box);}
  for(const list of cells.values()){
    const geometry=new THREE.BoxGeometry(1,1,1),mesh=new THREE.InstancedMesh(geometry,material,list.length),bounds=new THREE.Box3();
    const center=new THREE.Vector3(list[0].x,0,list[0].z);mesh.position.copy(center);
    list.forEach((b,i)=>{
      position.set(b.x-center.x,b.y,b.z-center.z);scale.set(b.w,b.h,b.d);matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);
      bounds.expandByPoint(new THREE.Vector3(position.x-b.w/2,b.y-b.h/2,position.z-b.d/2));bounds.expandByPoint(new THREE.Vector3(position.x+b.w/2,b.y+b.h/2,position.z+b.d/2));
    });
    geometry.boundingBox=bounds;geometry.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());
    mesh.frustumCulled=true;mesh.receiveShadow=false;mesh.castShadow=false;mesh.name='instanced-city';group.add(mesh);
  }
}

export function spatialBatch(group,material,geometries,{castShadow=true,cellSize=160}={}){
  const cells=new Map();
  for(const geometry of geometries){
    geometry.computeBoundingSphere();const p=geometry.boundingSphere.center;
    const key=geometry.boundingSphere.radius>100?'wide':`${Math.floor(p.x/cellSize)},${Math.floor(p.z/cellSize)}`;
    if(!cells.has(key))cells.set(key,[]);cells.get(key).push(geometry);
  }
  for(const list of cells.values()){
    const flat=list.map(g=>{if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g.index?g.toNonIndexed():g;});
    const geometry=BufferGeometryUtils.mergeBufferGeometries(flat);
    if(!geometry)throw new Error('Coastal batch has incompatible geometry');
    geometry.computeBoundingSphere();geometry.computeBoundingBox();
    // The procedural wind added later can move tips by up to 0.8 world units.
    geometry.boundingSphere.radius+=1;
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=castShadow;mesh.receiveShadow=true;mesh.name='coast-cell';group.add(mesh);
    new Set([...flat,...list]).forEach(g=>g.dispose());
  }
}

// A distant opponent uses a single draw with baked vertex colors. The full
// original car remains available nearby; LOD is never consulted by physics.
export function installCarLOD(car,width=2){
  const parts=[],paint=car.userData.bm.color.clone(),glass=new THREE.Color(0x132936).convertSRGBToLinear(),rubber=new THREE.Color(.025,.03,.04),light=new THREE.Color(0xffedbf).convertSRGBToLinear();
  const add=(g,color,x=0,y=0,z=0)=>{g.translate(x,y,z);const flat=g.index?g.toNonIndexed():g,colors=new Float32Array(flat.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}flat.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(flat);if(flat!==g)g.dispose();};
  add(new THREE.BoxGeometry(width,.52,4.2),paint,0,.62,0);
  add(new THREE.BoxGeometry(width-.52,.43,1.65),glass,0,1.05,-.2);
  add(new THREE.BoxGeometry(width-.6,.07,1.3),paint,0,1.29,-.2);
  add(new THREE.BoxGeometry(width,.08,.4),paint,0,1.15,-2);
  for(const side of [-1,1])for(const z of [-1.4,1.4])add(new THREE.CylinderGeometry(.44,.44,.32,10).rotateZ(Math.PI/2),rubber,side*width/2,.44,z);
  for(const side of [-1,1])add(new THREE.BoxGeometry(.52,.08,.06),light,side*(width/2-.45),.7,2.13);
  const geometry=BufferGeometryUtils.mergeBufferGeometries(parts);parts.forEach(g=>g.dispose());
  const low=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true}));low.castShadow=true;
  const detail=new THREE.Group();for(const child of [...car.children])detail.add(child);car.add(detail,low);low.visible=false;
  car.userData.lod={detail,low,reduced:false};return car;
}
export function updateCarLOD(car,camera,distance){
  const lod=car.userData.lod;if(!lod)return;
  const d2=car.position.distanceToSquared(camera.position),limit=distance*(lod.reduced?.85:1);
  lod.reduced=d2>limit*limit;lod.detail.visible=!lod.reduced;lod.low.visible=lod.reduced;
}
