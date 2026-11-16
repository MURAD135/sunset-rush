import * as THREE from 'three';

// Fixed-capacity, single-draw pool. Render buffers are separate from 60 Hz
// particle state; sampling never consumes RNG or touches gameplay/physics.
export class RaceParticles {
  constructor(texture,capacity=150){
    this.capacity=capacity;this.budget=capacity;this.cursor=0;this.intensity=1;this.alpha=1;this.changed=true;
    this.position=new Float32Array(capacity*3);this.velocity=new Float32Array(capacity*3);this.color=new Float32Array(capacity*3);
    this.previous=new Float32Array(capacity*3);this.display=new Float32Array(capacity*3);this.style=new Float32Array(capacity*3);
    this.life=new Float32Array(capacity);this.duration=new Float32Array(capacity);this.gravity=new Float32Array(capacity);
    this.kind=new Uint8Array(capacity);this.gain=new Float32Array(capacity);this.size=new Float32Array(capacity);this.opacity=new Float32Array(capacity);
    this.previousSize=new Float32Array(capacity);this.previousOpacity=new Float32Array(capacity);this.displaySize=new Float32Array(capacity);this.displayOpacity=new Float32Array(capacity);
    const geometry=new THREE.BufferGeometry();
    for(const [name,data,itemSize] of [['position',this.display,3],['color',this.color,3],['particleSize',this.displaySize,1],['particleOpacity',this.displayOpacity,1],['particleVelocity',this.velocity,3],['particleStyle',this.style,3]])geometry.setAttribute(name,new THREE.BufferAttribute(data,itemSize).setUsage(THREE.DynamicDrawUsage));
    const material=new THREE.ShaderMaterial({
      uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),sprite:{value:texture},projectionScale:{value:400},detail:{value:1}},transparent:true,depthWrite:false,fog:true,
      vertexShader:`attribute vec3 color; attribute vec3 particleVelocity; attribute vec3 particleStyle;
        attribute float particleSize; attribute float particleOpacity;
        uniform float projectionScale; uniform float detail;
        varying vec3 tint; varying float opacity; varying vec3 style; varying vec2 direction;
        #include <fog_pars_vertex>
        void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
          gl_PointSize=clamp(particleSize*projectionScale/max(1.0,-mvPosition.z),0.0,mix(48.0,96.0,detail));
          vec2 v=(modelViewMatrix*vec4(particleVelocity,0.0)).xy;float speed=length(v);
          direction=speed>0.01?v/speed:vec2(0.0,1.0);tint=color;opacity=particleOpacity;style=particleStyle;
          #include <fog_vertex>
        }`,
      fragmentShader:`uniform sampler2D sprite;uniform float detail;
        varying vec3 tint;varying float opacity;varying vec3 style;varying vec2 direction;
        #include <fog_pars_fragment>
        void main(){vec2 q=gl_PointCoord-0.5;vec3 light=tint;float alpha;
          if(style.y>0.5&&style.y<1.5){
            // Two cheap waves break the radial stamp into slowly rolling wisps.
            // Low/reduced bypasses these waves and uses the shared soft sprite.
            if(detail>0.5){float phase=style.z+style.x*2.4;
              q*=1.0+0.14*sin(q.x*13.0+phase)*sin(q.y*11.0-phase*0.7);}
            alpha=texture2D(sprite,q+0.5).a*opacity;
            light*=0.82+0.28*(1.0-gl_PointCoord.y);
          }else if(style.y<2.5){
            // Velocity-aligned nitro glow / hot spark core in the same draw.
            vec2 axis=vec2(dot(q,direction),dot(q,vec2(-direction.y,direction.x)));
            float width=style.y<0.5?2.4:5.5;
            float radius=length(vec2(axis.x,axis.y*width));
            float glow=1.0-smoothstep(0.02,0.5,radius);
            float core=1.0-smoothstep(0.0,0.16,radius);
            alpha=glow*opacity;light=mix(tint,vec3(2.6,2.9,3.0),core*(style.y<0.5?0.75:0.3));
          }else{alpha=texture2D(sprite,gl_PointCoord).a*opacity;}
          if(alpha<0.004)discard;gl_FragColor=vec4(light,alpha);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`
    });
    this.mesh=new THREE.Points(geometry,material);this.mesh.frustumCulled=false;this.attributes=Object.values(geometry.attributes);
  }
  emit(x,y,z,vx,vy,vz,life,r,g,b,gravity){
    const i=this.cursor++%this.budget,j=i*3;
    this.position[j]=this.previous[j]=x;this.position[j+1]=this.previous[j+1]=y;this.position[j+2]=this.previous[j+2]=z;
    this.velocity[j]=vx;this.velocity[j+1]=vy;this.velocity[j+2]=vz;
    this.life[i]=this.duration[i]=life;this.gravity[i]=gravity;this.gain[i]=this.intensity;
    const smoke=gravity===0&&b<.5,spark=gravity>=10;this.kind[i]=smoke?1:spark?2:gravity>0?3:0;
    this.color[j]=smoke?.64:spark?r*3:r;this.color[j+1]=smoke?.66:spark?g*3:g;this.color[j+2]=smoke?.69:spark?b*3:b;
    this.size[i]=this.previousSize[i]=0;this.opacity[i]=this.previousOpacity[i]=0;
    this.style[j]=0;this.style[j+1]=this.kind[i];this.style[j+2]=(this.cursor*2.399963)%6.283185;this.changed=true;
  }
  step(dt){
    this.previous.set(this.position);this.previousSize.set(this.size);this.previousOpacity.set(this.opacity);
    const drag=Math.exp(-.55*dt);
    for(let i=0;i<this.budget;i++){
      if(this.life[i]<=0){this.opacity[i]=this.size[i]=0;continue;}
      const j=i*3,kind=this.kind[i];this.life[i]-=dt;this.velocity[j+1]-=this.gravity[i]*dt;
      if(kind===1){this.velocity[j]*=drag;this.velocity[j+2]*=drag;this.velocity[j+1]+=.15*dt;}
      this.position[j]+=this.velocity[j]*dt;this.position[j+1]=Math.max(.05,this.position[j+1]+this.velocity[j+1]*dt);this.position[j+2]+=this.velocity[j+2]*dt;
      const f=Math.max(0,this.life[i]/this.duration[i]);this.style[j]=1-f;
      this.size[i]=kind===1?.8+(1-f)*2.3:kind===2?.22+f*.42:kind===3?.6+(1-f)*1.2:.4+f*.65;
      this.opacity[i]=kind===1?Math.sin(Math.PI*f)*.45*this.gain[i]:f*(kind===3?.6:.85);
    }
    this.changed=true;
  }
  present(alpha=this.alpha){
    alpha=Number.isFinite(alpha)?Math.max(0,Math.min(1,alpha)):1;
    if(!this.changed&&this.alpha===alpha)return;
    for(let i=0;i<this.budget;i++){
      const j=i*3;for(let k=0;k<3;k++)this.display[j+k]=this.previous[j+k]+(this.position[j+k]-this.previous[j+k])*alpha;
      this.displaySize[i]=this.previousSize[i]+(this.size[i]-this.previousSize[i])*alpha;
      this.displayOpacity[i]=this.previousOpacity[i]+(this.opacity[i]-this.previousOpacity[i])*alpha;
    }
    this.alpha=alpha;this.changed=false;for(const attribute of this.attributes)attribute.needsUpdate=true;
  }
  setBudget(count){
    this.budget=Math.max(1,Math.min(this.capacity,Math.floor(count)));this.cursor%=this.budget;
    for(const array of [this.life,this.opacity,this.size,this.previousSize,this.previousOpacity,this.displaySize,this.displayOpacity])array.fill(0,this.budget);
    this.mesh.geometry.setDrawRange(0,this.budget);this.changed=true;
  }
  setDetail(enabled){this.mesh.material.uniforms.detail.value=enabled?1:0;}
  clear(){
    for(const array of [this.life,this.opacity,this.size,this.previousSize,this.previousOpacity,this.displaySize,this.displayOpacity])array.fill(0);
    this.cursor=0;this.changed=true;
  }
  setProjection(height,fov){this.mesh.material.uniforms.projectionScale.value=height*.5/Math.tan(fov*Math.PI/360);}
}
