// Stage bundled web assets and native-wrapper configuration. Does not install an SDK,
// generate a signed app, contact a store, or deploy a URL.
import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?walk(`${dir}/${e.name}`):`${dir}/${e.name}`))).flat();
const config=JSON.parse(await readFile('native/capacitor.config.json','utf8'));
if(config.server.url||config.server.cleartext||config.android.allowMixedContent)throw Error('Native bundle must use local assets without cleartext');
const files=(await walk('dist')).sort();
for(const required of ['index.html','manifest.webmanifest','THIRD_PARTY_NOTICES.txt','icons/icon-512.png'])if(!files.includes('dist/'+required))throw Error('Missing '+required);
const hashes=[];for(const file of files)hashes.push({path:file.slice(5),sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
const id=createHash('sha256').update(JSON.stringify(hashes)).digest('hex').slice(0,12),output=`artifacts/native/${id}`;
await mkdir(output,{recursive:true});await cp('dist',`${output}/www`,{recursive:true});await writeFile(`${output}/capacitor.config.json`,JSON.stringify(config,null,2)+'\n');
await writeFile(`${output}/READINESS.json`,JSON.stringify({kind:'unsigned-web-assets-for-native-wrapper',id,appId:config.appId,appIdOwnerConfirmationRequired:true,cloudSave:'unconfigured',nativeSDKsInstalled:false,signedApp:false,deviceTested:false,files:hashes},null,2)+'\n');
console.log(JSON.stringify({output,files:files.length,signedApp:false,cloudSave:'unconfigured'},null,2));
