export function isNativeRuntime(host=globalThis.Capacitor){return host?.isNativePlatform?.()===true;}
// A wrapper can inject its App plugin as nativeApp. Core gameplay never imports an SDK.
export function bindLifecycle({document,window,nativeApp=null,save,pause,silence,onActivity=()=>{}}){
  const background=()=>{pause();silence();Promise.resolve(save()).catch(()=>{});};
  const activity=(active,source)=>{onActivity(active,source);if(!active)background();};
  const visibility=()=>activity(!document.hidden,'web'),hide=()=>activity(false,'page'),show=()=>activity(true,'page');
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
  let handle=null,disposed=false;
  if(nativeApp){Promise.resolve(nativeApp.addListener('appStateChange',({isActive})=>activity(isActive,'native'))).then(value=>{if(disposed)value.remove();else handle=value;}).catch(()=>{});}
  // Foreground never resumes a race/audio without a player gesture.
  return ()=>{disposed=true;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);handle?.remove();};
}
