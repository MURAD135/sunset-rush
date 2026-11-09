import * as THREE from 'three';

// Fixed-capacity, one-draw particle pool. Simulation uses the existing fixed
// step; opacity/diameter replace additive grey dots with expanding soft smoke.
export class RaceParticles {
  constructor(texture,capacity=150){
    this.capacity=capacity;this.budget=capacity;this.cursor=0;this.intensity=1;
    this.position=new Float32Array(capacity*3);this.velocity=new Float32Array(capacity*3);this.color=new Float32Array(capacity*3);
    this.life=new Float32Array(capacity);this.duration=new Float32Array(capacity);this.gravity=new Float32Array(capacity);
    this.kind=new Uint8Array(capacity);this.gain=new Float32Array(capacity);this.size=new Float32Array(capacity);this.opacity=new Float32Array(capacity);
    const geometry=new THREE.BufferGeometry();
    for(const [name,data,itemSize] of [['position',this.position,3],['color',this.color,3],['particleSize',this.size,1],['particleOpacity',this.opacity,1]])geometry.setAttribute(name,new THREE.BufferAttribute(data,itemSize).setUsage(THREE.DynamicDrawUsage));
    const material=new THREE.ShaderMaterial({
      uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),sprite:{value:texture},projectionScale:{value:400}},transparent:true,depthWrite:false,fog:true,
      vertexShader:`attribute vec3 color;
        attribute float particleSize; attribute float particleOpacity;
        uniform float projectionScale; varying vec3 tint; varying float opacity;
        #include <fog_pars_vertex>
        void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
          gl_PointSize=clamp(particleSize*projectionScale/max(1.0,-mvPosition.z),0.0,96.0);tint=color;opacity=particleOpacity;
          #include <fog_vertex>
        }`,
      fragmentShader:`uniform sampler2D sprite;varying vec3 tint;varying float opacity;
        #include <fog_pars_fragment>
        void main(){float alpha=texture2D(sprite,gl_PointCoord).a*opacity;if(alpha<0.004)discard;
          gl_FragColor=vec4(tint,alpha);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`
    });
    this.mesh=new THREE.Points(geometry,material);this.mesh.frustumCulled=false;this.attributes=Object.values(geometry.attributes);
  }
  emit(x,y,z,vx,vy,vz,life,r,g,b,gravity){
    const i=this.cursor++%this.budget,j=i*3;
    this.position[j]=x;this.position[j+1]=y;this.position[j+2]=z;this.velocity[j]=vx;this.velocity[j+1]=vy;this.velocity[j+2]=vz;
    this.life[i]=this.duration[i]=life;this.gravity[i]=gravity;this.gain[i]=this.intensity;
    const smoke=gravity===0&&b<.5,spark=gravity>=10;this.kind[i]=smoke?1:spark?2:gravity>0?3:0;
    this.color[j]=smoke?.64:spark?r*3:r;this.color[j+1]=smoke?.66:spark?g*3:g;this.color[j+2]=smoke?.69:spark?b*3:b;
  }
  step(dt){
    for(let i=0;i<this.capacity;i++){
      if(this.life[i]<=0){this.opacity[i]=this.size[i]=0;continue;}
      const j=i*3;this.life[i]-=dt;this.velocity[j+1]-=this.gravity[i]*dt;
      this.position[j]+=this.velocity[j]*dt;this.position[j+1]=Math.max(.05,this.position[j+1]+this.velocity[j+1]*dt);this.position[j+2]+=this.velocity[j+2]*dt;
      const f=Math.max(0,this.life[i]/this.duration[i]),kind=this.kind[i];
      this.size[i]=kind===1?.8+(1-f)*2:kind===2?.1+f*.16:kind===3?.6+(1-f)*1.2:.25+f*.5;
      this.opacity[i]=kind===1?Math.sin(Math.PI*f)*.45*this.gain[i]:f*(kind===3?.6:.85);
    }
    for(const attribute of this.attributes)attribute.needsUpdate=true;
  }
  setBudget(count){
    this.budget=Math.max(1,Math.min(this.capacity,Math.floor(count)));this.cursor%=this.budget;
    this.life.fill(0,this.budget);this.opacity.fill(0,this.budget);this.mesh.geometry.setDrawRange(0,this.budget);
  }
  clear(){this.life.fill(0);this.opacity.fill(0);this.size.fill(0);this.cursor=0;this.mesh.geometry.attributes.particleOpacity.needsUpdate=true;}
  setProjection(height,fov){this.mesh.material.uniforms.projectionScale.value=height*.5/Math.tan(fov*Math.PI/360);}
}
