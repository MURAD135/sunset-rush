import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const mergeBufferGeometries = BufferGeometryUtils.mergeBufferGeometries.bind(BufferGeometryUtils);

export function disposeGroup(group, sharedTextures = new Set()) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(o => {
    if(o.geometry&&!sharedTextures.has(o.geometry))geometries.add(o.geometry);
    const all=[...(o.material?(Array.isArray(o.material)?o.material:[o.material]):[]),o.customDepthMaterial,o.customDistanceMaterial];
    for(const m of all){
      if(!m||sharedTextures.has(m))continue;materials.add(m);
      for(const v of Object.values(m))if(v?.isTexture&&!sharedTextures.has(v))textures.add(v);
      for(const u of Object.values(m.uniforms||{}))if(u.value?.isTexture&&!sharedTextures.has(u.value))textures.add(u.value);
    }
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.clear();
}

// Wheels, flames, light sprites and beams remain separate animated objects.
export function batchCar(group) {
  const batches=new Map();
  for(const mesh of [...group.children]) {
    if(!mesh.isMesh || !mesh.castShadow || !mesh.visible || group.userData.fl?.includes(mesh))continue;
    if(!batches.has(mesh.material))batches.set(mesh.material,[]);
    batches.get(mesh.material).push(mesh);
  }
  for(const [material, meshes] of batches) {
    if(meshes.length<2)continue;
    const geometries=meshes.map(m=>{m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix);return g.index?g.toNonIndexed():g;});
    const merged=mergeBufferGeometries(geometries);
    geometries.forEach(g=>g.dispose());
    if(!merged)continue;
    for(const m of meshes) {group.remove(m);m.geometry.dispose();}
    const m=new THREE.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
  }
}

export function correctColors(group){
  group.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){
    if(m.userData.srgbReady)continue;
    m.userData.srgbReady=true;
    if(m.color)m.color.convertSRGBToLinear();
    if(m.emissive)m.emissive.convertSRGBToLinear();
  }});
}
