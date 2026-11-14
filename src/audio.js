// Original procedural audio. Six persistent sources; no samples or network requests.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function engineVoice(speed,throttle,car=0){
  const gear=Math.min(5,Math.floor(Math.max(0,speed)/12));
  const rpm=clamp((speed-gear*12)/12,0,1);
  const electric=car===7;
  return {gear,frequency:(electric?110:48+[0,10,-7,14,8,-4,-16,0][car%8])+gear*9+rpm*(88+gear*7),
    gain:.018+clamp(throttle,0,1)*.027,cutoff:350+rpm*950+throttle*450,electric};
}
export class RaceAudio {
  constructor(context){
    this.context=context;this.nodes=[];this.sources=[];this.cueIndex=0;
    const make=type=>{const node=context[type]();this.nodes.push(node);return node;};
    this.master=make('createGain');this.master.gain.value=0;
    const limiter=make('createDynamicsCompressor');limiter.threshold.value=-12;limiter.ratio.value=8;
    this.master.connect(limiter);limiter.connect(context.destination);
    const voice=(type,filterType=null)=>{
      const source=make('createOscillator'),gain=make('createGain');source.type=type;gain.gain.value=0;
      let filter=null;if(filterType){filter=make('createBiquadFilter');filter.type=filterType;source.connect(filter);filter.connect(gain);}else source.connect(gain);
      gain.connect(this.master);source.start();this.sources.push(source);return {source,gain,filter};
    };
    this.engine=voice('sawtooth','lowpass');this.harmonic=voice('triangle');this.boost=voice('sine');
    const noise=make('createBufferSource'),buffer=context.createBuffer(1,context.sampleRate,context.sampleRate),data=buffer.getChannelData(0);
    let seed=135;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
    noise.buffer=buffer;noise.loop=true;
    const noiseBand=(type,freq)=>{const filter=make('createBiquadFilter'),gain=make('createGain');filter.type=type;filter.frequency.value=freq;gain.gain.value=0;noise.connect(filter);filter.connect(gain);gain.connect(this.master);return gain;};
    this.skid=noiseBand('bandpass',1800);this.rain=noiseBand('highpass',2400);noise.start();this.sources.push(noise);
    this.cues=[voice('sine'),voice('sine')];
  }
  target(param,value,time=.06){param.setTargetAtTime(value,this.context.currentTime,time);}
  update({active=false,muted=false,speed=0,throttle=0,car=0,nitro=false,drift=0,weather=0}={}){
    const v=engineVoice(speed,throttle,car);
    this.target(this.master.gain,active&&!muted?.7:0,.025);
    this.target(this.engine.source.frequency,v.frequency);this.target(this.harmonic.source.frequency,v.frequency*(v.electric?2: .5));
    this.target(this.engine.filter.frequency,v.cutoff);this.target(this.engine.gain.gain,v.electric?.008:v.gain);
    this.target(this.harmonic.gain.gain,v.electric?.025:v.gain*.35);
    this.target(this.boost.source.frequency,170+speed*3);this.target(this.boost.gain.gain,nitro?.018:0);
    this.target(this.skid.gain,clamp(drift,0,1)*clamp(speed/35,0,1)*.065);this.target(this.rain.gain,weather*.025);
  }
  cue(frequency,duration,type='sine',volume=.1){
    const v=this.cues[this.cueIndex++%2],t=this.context.currentTime;
    v.source.type=type;v.source.frequency.setValueAtTime(frequency,t);
    v.gain.gain.cancelScheduledValues(t);v.gain.gain.setValueAtTime(0,t);
    v.gain.gain.linearRampToValueAtTime(clamp(volume,0,.12),t+.008);
    v.gain.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.02,duration));
  }
  silence(){this.target(this.master.gain,0,.01);}
  async resume(){try{await this.context.resume();return this.context.state==='running';}catch{return false;}}
  dispose(){for(const source of this.sources)source.stop();for(const node of this.nodes)node.disconnect();}
  diagnostics(){return {sources:this.sources.length,nodes:this.nodes.length,state:this.context.state};}
}
