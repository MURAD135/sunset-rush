const integer=(value,min,max,fallback)=>Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
const color=(value,fallback)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
export function normalizeSession(v){
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid session preferences');
  const o=v.opt||{};
  return {car:integer(v.car,0,7,0),color:color(v.color,'#18b8c1'),track:integer(v.track,0,10,10),difficulty:integer(v.difficulty,0,2,1),weather:integer(v.weather,0,2,0),surface:integer(v.surface,0,2,0),theme:integer(v.theme,0,3,0),laps:[2,3,5].includes(v.laps)?v.laps:3,camera:integer(v.camera,0,2,0),ghost:v.ghost!==false,lights:!!v.lights,opt:{fin:integer(o.fin,0,2,0),wing:integer(o.wing,0,2,1),stripe:o.stripe===0?0:color(o.stripe,0),rim:color(o.rim,'#c9ccd6'),glow:o.glow===0?0:color(o.glow,0)}};
}
export function normalizeResults(rows){
  if(!Array.isArray(rows)||rows.length>20)throw Error('Invalid race history');
  const seen=new Set();return rows.map(r=>{
    if(!r||typeof r.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(r.id)||seen.has(r.id)||!Number.isSafeInteger(r.at)||r.at<0||!Number.isInteger(r.track)||r.track<0||r.track>10||!Number.isInteger(r.car)||r.car<0||r.car>7||!['classic','sport'].includes(r.mode)||!Array.isArray(r.laps)||![2,3,5].includes(r.laps.length)||r.laps.some(t=>!Number.isFinite(t)||t<=0||t>86400)||!Number.isFinite(r.time)||r.time<=0||r.time>86400||!Number.isInteger(r.place)||r.place<1||r.place>5||!Number.isFinite(r.score)||r.score<0||r.score>1e12)throw Error('Invalid race result');
    seen.add(r.id);return{id:r.id,at:r.at,track:r.track,car:r.car,mode:r.mode,laps:r.laps,time:r.time,place:r.place,score:r.score};
  });
}
