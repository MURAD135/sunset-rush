import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceAudio, engineVoice } from '../src/audio.js';
function context(){
  const param=()=>({value:0,setTargetAtTime(v,t,c){assert.ok(Number.isFinite(v)&&c>0);this.value=v;},setValueAtTime(v){this.value=v;},cancelScheduledValues(){},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){assert.ok(v>0);this.value=v;}});
  const node=()=>({gain:param(),frequency:param(),threshold:param(),ratio:param(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}});
  return {sampleRate:8000,currentTime:0,state:'running',destination:{},createGain:node,createDynamicsCompressor:node,createOscillator:node,createBiquadFilter:node,createBufferSource:node,createBuffer:(n,l)=>({getChannelData:()=>new Float32Array(l)}),resume:async()=>{}};
}
test('engine voices respond to load, speed, shifts and electric selection',()=>{
  assert.ok(engineVoice(10,1).frequency>engineVoice(2,1).frequency);
  assert.ok(engineVoice(10,1).gain>engineVoice(10,0).gain);
  assert.equal(engineVoice(13,1).gear,1);assert.equal(engineVoice(50,1,7).electric,true);
});
test('pooled audio retains six sources through races and cues, mutes and disposes',()=>{
  const audio=new RaceAudio(context()),before=audio.diagnostics();
  for(let i=0;i<5000;i++){audio.update({active:true,speed:i%90,throttle:1,car:i%8,nitro:i%2,drift:.5,weather:2});audio.cue(400,.1);}
  assert.deepEqual(audio.diagnostics(),before);assert.equal(before.sources,6);
  audio.update({active:true,muted:true});assert.equal(audio.master.gain.value,0);
  audio.silence();audio.dispose();assert.ok(audio.nodes.every(n=>n.disconnected));assert.ok(audio.sources.every(n=>n.stopped));
});
