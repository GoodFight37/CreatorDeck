import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
const exec=promisify(execFile);
test('mise à jour : contrôle des empreintes, sauvegarde du code, conservation du travail',async()=>{
const dir=await mkdtemp(path.join(os.tmpdir(),'studio-update-'));
try{
await mkdir(path.join(dir,'_travail'),{recursive:true});await writeFile(path.join(dir,'_travail/state.json'),'mes choix');await writeFile(path.join(dir,'app.js'),'ancien code');await copyFile(new URL('./update.mjs',import.meta.url),path.join(dir,'update.mjs'));
const sha=createHash('sha256').update('nouveau code').digest('hex');
const manifest={version:'test',files:{'app.js':sha},extensionFiles:{'extension/popup.js':sha}};
const shim='globalThis.fetch=async url=>new Response(String(url).endsWith("release.json")?'+JSON.stringify(JSON.stringify(manifest))+':"nouveau code");';await writeFile(path.join(dir,'shim.mjs'),shim);
await exec(process.execPath,['--import',path.join(dir,'shim.mjs'),path.join(dir,'update.mjs')]);assert.equal(await readFile(path.join(dir,'app.js'),'utf8'),'nouveau code');assert.equal(await readFile(path.join(dir,'extension/popup.js'),'utf8'),'nouveau code');assert.equal(await readFile(path.join(dir,'_travail/state.json'),'utf8'),'mes choix');
await writeFile(path.join(dir,'shim.mjs'),shim.replace(':"nouveau code"',':"fichier corrompu"'));
await assert.rejects(exec(process.execPath,['--import',path.join(dir,'shim.mjs'),path.join(dir,'update.mjs')]));assert.equal(await readFile(path.join(dir,'app.js'),'utf8'),'nouveau code');assert.equal(await readFile(path.join(dir,'extension/popup.js'),'utf8'),'nouveau code');assert.equal(await readFile(path.join(dir,'_travail/state.json'),'utf8'),'mes choix');
}finally{await rm(dir,{recursive:true,force:true});}
});
