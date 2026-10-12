/* global chrome */
/** Test navigateur ciblé depuis le dépôt : node tools/portrait-studio/browser.test.mjs */
import { chromium } from 'playwright';
import { createStudio } from './server.mjs';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const directory=await mkdtemp(path.join(os.tmpdir(),'studio-browser-'));
await mkdir(path.join(directory,'seed/avatars'),{recursive:true});
const photo=await readFile(new URL('../../public/creators/curated/mastu.webp',import.meta.url));
for(const f of ['server.mjs','app.js','index.html']) await copyFile(new URL(f,import.meta.url),path.join(directory,f));
const creators=['one','two','three'].map((slug,i)=>({slug,displayName:slug,rank:i+1}));
const candidate={pageid:1,title:'Portrait de test',width:900,height:900,original:'https://upload.wikimedia.org/test.jpg',thumbnail:'https://upload.wikimedia.org/test.jpg',author:'Auteur de test',source:'https://commons.wikimedia.org/wiki/File:Test.jpg',license:'CC BY 4.0',reviewNeeded:false};
for(const [name,data]of Object.entries({creators,overrides:{},published:{},research:{one:{candidates:[candidate]}}}))await writeFile(path.join(directory,'seed',name+'.json'),JSON.stringify(data));
for(const c of creators)await writeFile(path.join(directory,'seed/avatars',c.slug+'.webp'),photo);
const studio=await createStudio({directory,port:4317,quiet:true});
const browser=await chromium.launch({executablePath:process.env.STUDIO_CHROMIUM || '/usr/bin/chromium',args:['--no-sandbox']});
const extensionCode=await readFile(new URL('./extension/background.js',import.meta.url));
try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{
const url=new URL(route.request().url());
if(url.pathname==='/extension/background.js')return route.fulfill({body:extensionCode,contentType:'text/javascript'});
if(url.pathname==='/api/photo')return route.fulfill({body:photo,contentType:'image/webp'});
if(url.hostname==='upload.wikimedia.org')return route.fulfill({body:photo,contentType:'image/webp',headers:{'Access-Control-Allow-Origin':'*'}});
if(url.hostname==='127.0.0.1')return route.continue();return route.abort();});
await page.goto(studio.url);await page.waitForFunction(()=>document.querySelector('#progress').textContent==='0 / 3 prêts');
await page.locator('#searchName').fill('One streamer officiel');await page.locator('#saveSearchName').click();await page.waitForFunction(()=>decodeURIComponent(document.querySelector('#google').href).includes('One streamer officiel'));
assert.equal(studio.state.searchQueries.one,'One streamer officiel');
await page.locator('#review').click();await page.locator('#reviewCards input[data-slug]').check();await page.locator('#approveReview').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Confirme les droits'));
assert.equal(Object.keys(studio.state.choices).length,0);
await page.locator('#reviewCards input[data-rights]').check();await page.locator('#approveReview').click();await page.waitForFunction(()=>document.querySelector('#progress').textContent==='1 / 3 prêts');
assert.equal(studio.state.choices.one.author,'Auteur de test');
await page.locator('#closeReview').click();await page.locator('#names button').filter({hasText:'two'}).click();
await page.locator('#imageUrl').fill('https://upload.wikimedia.org/test.jpg');await page.locator('#importUrl').click();await page.locator('#editor').waitFor({state:'visible'});
await page.locator('#author').fill('Auteur sauvegardé');await page.waitForFunction(()=>document.querySelector('#author').value==='Auteur sauvegardé');
await page.waitForTimeout(1600);assert.equal(studio.state.drafts.two.author,'Auteur sauvegardé');
await page.reload();await page.waitForFunction(()=>document.querySelector('#name').textContent==='two' && document.querySelector('#author').value==='Auteur sauvegardé');
await page.locator('#source').fill('https://example.com/source');await page.locator('#license').selectOption('CC BY 4.0');await page.locator('#verified').check();await page.locator('#keepNext').click();await page.waitForFunction(()=>document.querySelector('#name').textContent==='three');
assert.equal(studio.state.choices.two.author,'Auteur sauvegardé');
await page.locator('#export').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.startsWith('2 portraits exportés'));
assert.equal(Object.keys(JSON.parse(await readFile(studio.work+'/EXPORT/portrait-overrides.patch.json','utf8'))).length,2);assert.deepEqual(errors,[]);
const connection=await (await fetch(new URL('/api/connect',studio.url),{headers:{Authorization:'Bearer '+studio.token}})).json();
await page.evaluate(async({connection,photo})=>{
 const u=new URL(connection);const values={origin:u.origin,token:u.hash.slice(1)};
 globalThis.chrome={runtime:{onInstalled:{addListener(){}}},contextMenus:{onClicked:{addListener(){}},removeAll(){},create(){}},storage:{local:{async get(){return values;},async set(data){Object.assign(values,data);}}},action:{async setBadgeText(){},async setBadgeBackgroundColor(){}},tabs:{async query(){return[];}},windows:{async update(){}}};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>String(url).startsWith('https://example.com/')?new Response(Uint8Array.from(atob(photo),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp'}}):originalFetch(url,options);
 const {sendImage}=await import('/extension/background.js');
 await sendImage({menuItemId:'send-portrait',srcUrl:'https://example.com/photo.webp',pageUrl:'https://example.com/page'},{title:'Photo reçue de test'});
},{connection:connection.connection,photo:photo.toString('base64')});
await page.waitForFunction(()=>document.querySelector('#source').value==='https://example.com/page' && document.querySelector('#editor').classList.contains('hidden')===false);
await page.locator('#visualNext').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.startsWith('Photo choisie et cadrée'));
assert.equal(studio.state.visual.three.rightsStatus,'à vérifier');assert.equal(studio.state.choices.three,undefined);
await page.locator('#export').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('1 sélections avec droits à vérifier'));
const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;await download.saveAs(path.join(directory,'export.zip'));
const ready=JSON.parse(await readFile(studio.work+'/EXPORT/portrait-overrides.patch.json','utf8'));assert.equal(ready.three,undefined);
execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert "A-VERIFIER/three.webp" in z.namelist(); assert "public/creators/curated/three.webp" not in z.namelist()',path.join(directory,'export.zip')]);
assert.deepEqual(errors,[]);
console.log('Navigateur + API Chrome simulées : transfert image/source, sélection sans droits exclue du patch, validation, sauvegarde, reprise et export réussis.');
}finally{await browser.close();await new Promise(r=>studio.server.close(r));await rm(directory,{recursive:true,force:true});}
