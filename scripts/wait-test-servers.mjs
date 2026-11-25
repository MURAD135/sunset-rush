// Bounded readiness probe, used by CI before launching any browser tests.
for(const url of [process.env.GAME_URL,process.env.PRODUCTION_URL]){
 if(!url)throw Error('Missing test-server URL');
 let ready=false;
 for(let attempt=0;attempt<50;attempt++){
  try{ready=(await fetch(url,{signal:AbortSignal.timeout(1000)})).ok;}catch{}
  if(ready)break;await new Promise(resolve=>setTimeout(resolve,200));
 }
 if(!ready)throw Error(`Test server did not become ready: ${url}`);
}
