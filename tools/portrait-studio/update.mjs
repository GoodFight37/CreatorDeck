/** Mise à jour des seuls fichiers de l’atelier depuis son dépôt officiel. */
import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const base='https://raw.githubusercontent.com/GoodFight37/CreatorDeck/main/tools/portrait-studio/';
const allowed=new Set(['server.mjs','app.js','index.html','README.md','package.json','LANCER.cmd','update.mjs','METTRE-A-JOUR.cmd']);
async function get(file){const r=await fetch(base+file,{signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw Error(`GitHub répond ${r.status}`);return Buffer.from(await r.arrayBuffer());}
const manifest=JSON.parse(await get('release.json'));
if(!manifest.files || Object.keys(manifest.files).some(f=>!allowed.has(f)))throw Error('Liste de fichiers invalide');
const staged=[]; const backup=path.join(here,'_travail','sauvegardes-outil',new Date().toISOString().replaceAll(':','-'));
await mkdir(backup,{recursive:true});
for(const [file,sha] of Object.entries(manifest.files)){const data=await get(file);if(createHash('sha256').update(data).digest('hex')!==sha)throw Error('Téléchargement incohérent : '+file);await writeFile(path.join(here,file+'.update'),data);staged.push(file);}
let applied=[];
try {for(const file of staged){await copyFile(path.join(here,file),path.join(backup,file));await rename(path.join(here,file+'.update'),path.join(here,file));applied.push(file);}await writeFile(path.join(here,'release.json'),JSON.stringify(manifest,null,2)+'\n');}
catch(e){for(const file of applied)await copyFile(path.join(backup,file),path.join(here,file));throw e;}
console.log(`Version ${manifest.version} installée. Photos, recherches et choix conservés. Relance LANCER.cmd.`);
