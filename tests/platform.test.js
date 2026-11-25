import test from 'node:test';import assert from 'node:assert/strict';import {bindLifecycle,isNativeRuntime} from '../src/platform.js';
test('web and native background events pause, silence and save; listeners clean up',async()=>{
 const document=new EventTarget(),window=new EventTarget();let saved=0,paused=0,silenced=0,callback,removed=0;
 const dispose=bindLifecycle({document,window,nativeApp:{addListener:async(name,cb)=>{assert.equal(name,'appStateChange');callback=cb;return{remove:()=>removed++};}},save:()=>saved++,pause:()=>paused++,silence:()=>silenced++});
 document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));callback({isActive:false});callback({isActive:true});await Promise.resolve();assert.equal(saved,3);assert.equal(paused,3);assert.equal(silenced,3);dispose();assert.equal(removed,1);window.dispatchEvent(new Event('pagehide'));assert.equal(saved,3);
 assert.equal(isNativeRuntime(null),false);assert.equal(isNativeRuntime({isNativePlatform:()=>true}),true);
});
