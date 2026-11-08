const codes={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'g',KeyW:'g',ArrowDown:'b',KeyS:'b',Space:'h',ShiftLeft:'n',ShiftRight:'n',KeyE:'n'};
const blank=()=>({l:0,r:0,g:0,b:0,h:0,n:0});
export function readGamepad(pad){
  const k=blank();if(!pad?.connected)return k;
  let axis=pad.axes[0]||0;axis=Math.abs(axis)<.14?0:(Math.abs(axis)-.14)/.86*Math.sign(axis);
  k.l=Math.max(0,-axis,pad.buttons[14]?.value||0);k.r=Math.max(0,axis,pad.buttons[15]?.value||0);
  k.g=Math.max(pad.buttons[7]?.value||0,pad.buttons[0]?.value||0);
  k.b=pad.buttons[6]?.value||0;k.h=pad.buttons[1]?.value||0;k.n=pad.buttons[2]?.value||0;
  return k;
}
export function installInput(target,{pause,recover,camera,onBlur}){
  const held=new Set(),touch=new Map();let lastStart=false,lastRecover=false,lastCamera=false;
  const clear=()=>{held.clear();touch.clear();Object.assign(target,blank());};
  addEventListener('keydown',e=>{
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(codes[e.code]){held.add(e.code);e.preventDefault();}
    if(!e.repeat){if(e.code==='Escape')pause();if(e.code==='KeyR')recover();if(e.code==='KeyC')camera();}
  });
  addEventListener('keyup',e=>held.delete(e.code));
  for(const button of document.querySelectorAll('#ctl button[data-k]')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touch.set(e.pointerId,button.dataset.k);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>touch.delete(e.pointerId));
  }
  addEventListener('blur',()=>{clear();onBlur();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();onBlur();}});
  addEventListener('gamepaddisconnected',clear);
  return {clear,poll(){
    const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
    Object.assign(target,readGamepad(pad));
    for(const code of held)target[codes[code]]=1;for(const action of touch.values())target[action]=1;
    const start=!!pad?.buttons[9]?.pressed, back=!!pad?.buttons[8]?.pressed, cam=!!pad?.buttons[3]?.pressed;
    if(start&&!lastStart)pause();if(back&&!lastRecover)recover();if(cam&&!lastCamera)camera();
    lastStart=start;lastRecover=back;lastCamera=cam;
  }};
}
