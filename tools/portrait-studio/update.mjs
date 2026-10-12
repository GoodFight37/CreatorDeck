/** Mise à jour des seuls fichiers de l’atelier depuis son dépôt officiel. */
import { readFile, writeFile, mkdir, rename, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const base='https://raw.githubusercontent.com/GoodFight37/CreatorDeck/main/tools/portrait-studio/';
const allowed=new Set(['server.mjs','app.js','index.html','README.md','package.json','LANCER.cmd','update.mjs','METTRE-A-JOUR.cmd','extension/manifest.json','extension/background.js','extension/popup.js','extension/popup.html','extension/INSTALLER.md']);
async function get(file){const r=await fetch(base+file,{signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw Error(`GitHub répond ${r.status}`);return Buffer.from(await r.arrayBuffer());}
const manifest=JSON.parse(await get('release.json'));
const files={...manifest.files,...manifest.extensionFiles};
if(!manifest.files || Object.keys(files).some(f=>!allowed.has(f)))throw Error('Liste de fichiers invalide');
const staged=[]; const backup=path.join(here,'_travail','sauvegardes-outil',new Date().toISOString().replaceAll(':','-'));
await mkdir(backup,{recursive:true});
for(const [file,sha] of Object.entries(files)){const data=await get(file);if(createHash('sha256').update(data).digest('hex')!==sha)throw Error('Téléchargement incohérent : '+file);await mkdir(path.dirname(path.join(here,file)),{recursive:true});await writeFile(path.join(here,file+'.update'),data);staged.push(file);}
let applied=[];
try {for(const file of staged){await mkdir(path.dirname(path.join(backup,file)),{recursive:true});let existed=true;try{await copyFile(path.join(here,file),path.join(backup,file));}catch(e){if(e.code!=="ENOENT")throw e;existed=false;}await rename(path.join(here,file+'.update'),path.join(here,file));applied.push({file,existed});}await writeFile(path.join(here,'release.json'),JSON.stringify(manifest,null,2)+'\n');}
catch(e){for(const {file,existed} of applied){if(existed)await copyFile(path.join(backup,file),path.join(here,file));else await rm(path.join(here,file));}throw e;}
console.log(`Version ${manifest.version} installée. Photos, recherches et choix conservés. Relance LANCER.cmd.`);
