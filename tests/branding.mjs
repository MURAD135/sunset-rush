import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='artifacts/phase2/branding',checks=[],screens=[],errors=[];
await mkdir(out,{recursive:true});
const signature=/\b(?:made|generated|created|powered)\s+(?:with|by)\s+(?:ai|claude|codex|openai)\b|\b(?:claude|codex|openai|watermark|lorem ipsum)\b/i;
async function files(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(dir+'/'+e.name):dir+'/'+e.name))).flat();}
const scanned=['index.html',...await files('src'),...await files('public'),...await files('dist')],assets=[];
for(const file of scanned.filter(f=>/\.(?:html|css|js|webmanifest)$/.test(f))){
 const source=await readFile(file,'utf8');assert.equal(signature.test(source),false,'Unexpected tool signature: '+file);
}
assert.ok((await readFile('dist/THIRD_PARTY_NOTICES.txt','utf8')).includes('Copyright © 2010-2021 three.js authors'));
assert.ok((await readFile('dist/THIRD_PARTY_NOTICES.txt','utf8')).includes('Copyright (c) 2015 cannon.js Authors'));
for(const file of await files('public/icons')){
 const source=await readFile(file),built=await readFile(file.replace('public/','dist/'));assert.deepEqual(built,source);
 assets.push({file,sha256:createHash('sha256').update(source).digest('hex')});
}
checks.push('Application source and production HTML/CSS/JS contain no optional AI-tool signatures','Required Three.js and Cannon-es notices remain in the production build','All four original game icons are preserved byte for byte in the build');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 if(process.env.BRANDING_BASELINE_URL){
  const before=await browser.newPage({viewport:{width:960,height:600}});await before.goto(process.env.BRANDING_BASELINE_URL+'/?test=1');await before.locator('#mPlay').waitFor();
  await before.screenshot({path:out+'/menu-before.png'});await before.close();
 }
 const page=await browser.newPage({viewport:{width:960,height:600}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PRODUCTION_URL||'http://localhost:4173/sunset-rush/');await page.locator('#mPlay').waitFor();
 assert.equal(await page.evaluate(()=>typeof window.__sunset),'undefined');
 async function inspect(name){
  const text=await page.evaluate(()=>{
   const parts=[document.body.innerText,document.title];
   for(const e of document.querySelectorAll('*')){
    if(!e.getClientRects().length)continue;
    if(e.getAttribute('alt'))parts.push(e.getAttribute('alt'));
    for(const pseudo of ['::before','::after']){const c=getComputedStyle(e,pseudo).content;if(c!=='none'&&c!=='normal')parts.push(c);}
   }return parts.join('\n');
  });
  assert.equal(signature.test(text),false,name+' contains a tool signature');assert.equal(text.includes('THREE.JS / ARCADE RACING'),false);
  screens.push({name,text});await page.screenshot({path:out+'/'+name+'.png'});
 }
 await inspect('menu-after');
 for(const [name,open,close] of [['settings','#mSet','#cS'],['help','#mHow','#cH'],['achievements','#mAch','#cA']]){await page.locator(open).click();await inspect(name);await page.locator(close).click();}
 await page.locator('#mGar').click();
 for(let i=0;i<5;i++){await page.locator('#tb button').nth(i).click();await inspect('garage-'+i);}
 await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#tm').textContent!=='0:00.0',{},{timeout:60000});await inspect('hud');
 await page.keyboard.press('Escape');await inspect('pause');
 assert.deepEqual(errors,[]);checks.push('Production menu, settings, help, achievements, five garage tabs, HUD and pause UI have no tool signature, including CSS pseudo-elements');
 await writeFile(out+'/report.json',JSON.stringify({checks,errors,scanned,assets,screens,removed:['Optional menu footer engine caption THREE.JS / ARCADE RACING replaced by COASTAL ARCADE RACING'],retained:['Sunset Rush / SR original branding','Original circuit names and racing slogans','Three.js and Cannon-es copyright and MIT notices']},null,2));console.log(JSON.stringify({checks,errors,screens:screens.length},null,2));
}finally{await browser.close();}
