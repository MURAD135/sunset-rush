import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {encodeSave,defaultStats} from '../src/save-system.js';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const base=process.env.GAME_URL||'http://127.0.0.1:5173',errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:900,height:700}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('fixture')){localStorage.setItem('fixture','1');localStorage.setItem('sunset-profile-a','damaged A');localStorage.setItem('sunset-profile-b','damaged B');}});
 await page.goto(base+'/?test=1');await page.waitForFunction(()=>window.__sunset&&__sunset.save().status==='blocked');await page.locator('#mSet').click();
 const download=page.waitForEvent('download');await page.locator('#saveDamaged').click();const file=await download;
 assert.deepEqual(JSON.parse(await readFile(await file.path(),'utf8')).slots,['damaged A','damaged B']);checks.push('unreadable local generations are downloadable without overwriting originals');
 let confirmation='';page.on('dialog',d=>{confirmation=d.message();d.accept();});
 const text=encodeSave({'sunset-up':'{"u":[2,0,0,0,0],"c":420}','sunset-st':JSON.stringify({...defaultStats(),r:8,cu:[6]}),'sunset-day':new Date().toDateString()});
 const imported=page.waitForEvent('load');await page.locator('#saveFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await imported;await page.waitForFunction(()=>window.__sunset&&__sunset.save().status==='saved');
 assert.match(confirmation,/archived first/);const restored=await page.evaluate(()=>({save:__sunset.save(),archive:JSON.parse(localStorage.getItem('sunset-damaged-backup'))}));
 assert.equal(restored.save.coins,420);assert.equal(restored.save.upgrades[0],2);assert.equal(restored.save.stats.r,8);assert.deepEqual(restored.save.stats.cu,[6]);assert.deepEqual(restored.archive.slots,['damaged A','damaged B']);checks.push('explicit validated import archives both corrupt generations and restores coherent progress after reload');
 await page.locator('#mSet').click();assert.equal(await page.locator('#saveDamaged').isVisible(),true);
 assert.deepEqual(errors,[]);await mkdir('artifacts/phase3',{recursive:true});await writeFile('artifacts/phase3/recovery-browser.json',JSON.stringify({checks,errors},null,2));console.log({checks,errors});
}finally{await browser.close();}
