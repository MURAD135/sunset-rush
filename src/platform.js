export function isNativeRuntime(host=globalThis.Capacitor){return host?.isNativePlatform?.()===true;}
// A wrapper can inject its App plugin as nativeApp. Core gameplay never imports an SDK.
export function bindLifecycle({document,window,nativeApp=null,save,pause,silence}){
  const background=()=>{pause();silence();Promise.resolve(save()).catch(()=>{});};
  const visibility=()=>{if(document.hidden)background();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',background);
  let handle=null,disposed=false;
  if(nativeApp){Promise.resolve(nativeApp.addListener('appStateChange',({isActive})=>{if(!isActive)background();})).then(value=>{if(disposed)value.remove();else handle=value;}).catch(()=>{});}
  // Foreground never resumes a race/audio without a player gesture.
  return ()=>{disposed=true;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',background);handle?.remove();};
}
