import { createHash } from "node:crypto";

/** Galerie autonome : choix visuel en brouillon, sans patch de publication. */
export function renderGallery(report) {
  const data = JSON.stringify(report).replace(/</g, "\\u003c");
  const runId = createHash("sha256").update(data).digest("hex").slice(0, 16);
  return `<!doctype html>
<html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CreatorDeck · Pilote portraits</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#11141b;color:#eceef3;font:16px system-ui,sans-serif}
header{padding:26px max(20px,5vw);border-bottom:1px solid #363c49;position:relative;background:#181d27}h1{margin:0 0 12px;font-size:28px}
p{line-height:1.5}header p{max-width:900px}.metrics{display:flex;gap:20px;flex-wrap:wrap}.metrics strong{font-size:25px;display:block}
button,select{font:inherit;padding:10px 14px;border:1px solid #626d80;border-radius:8px;color:#fff;background:#252d3c;min-height:44px}
button{cursor:pointer}button:disabled{opacity:.45;cursor:default}button.active{border-color:#70d9bd;background:#25483f}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 0}
main{padding:20px max(20px,5vw);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:20px}
article{border:1px solid #3d4657;background:#181d27;border-radius:12px;padding:18px;min-width:0}h2{font-size:20px;margin:0 0 4px}.sub{color:#aeb8c9;font-size:14px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.pair img{width:100%;aspect-ratio:1;object-fit:contain;background:#10131a;border-radius:8px}.pair figcaption{margin-bottom:7px}figure{margin:0}
.source{overflow-wrap:anywhere;font-size:14px}a{color:#80d6ff}.choices{display:flex;gap:8px;flex-wrap:wrap}.status{color:#86e7c9;font-size:14px}.reasons{font-size:14px;color:#e5c397}
details{margin:12px 0}summary{cursor:pointer;min-height:36px}.alternate{width:90px;aspect-ratio:1;object-fit:contain;display:block;margin-bottom:6px}.candidate-list{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.candidate-list button{font-size:12px;padding:7px;max-width:110px}
.notice{padding:10px;border-left:3px solid #d8aa65;font-size:14px}.empty{color:#aeb8c9}
</style>
<header><h1>Pilote portraits CreatorDeck</h1>
<p>L’outil rassemble des images et prépare leur cadrage. Compare chaque candidat à l’image actuelle ; garde uniquement une photo nette, reconnaissable, naturelle et bien cadrée. Si rien ne te plaît, conserve l’image actuelle. Aucun choix n’est appliqué automatiquement au jeu.</p>
<div class="metrics" id="metrics"></div>
<div class="toolbar"><label>Afficher <select id="filter"><option value="all">Tous les créateurs</option><option value="proposal">Avec image candidate</option><option value="fallback">Sans nouvelle image à comparer</option><option value="unreviewed">À examiner</option></select></label><button id="export">Exporter mes choix</button></div>
<p class="sub" id="progress"></p><p class="sub" id="storage"></p>
</header><main id="cards"></main>
<script type="application/json" id="data">${data}</script>
<script>
const report=JSON.parse(document.getElementById('data').textContent),key='creatordeck-portrait-pilot-${runId}';
let selections={};try{selections=JSON.parse(localStorage.getItem(key)||'{}')}catch{document.getElementById('storage').textContent='Sauvegarde navigateur indisponible : exporte tes choix avant de fermer.'}
const shown={};const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
function save(){try{localStorage.setItem(key,JSON.stringify(selections))}catch{document.getElementById('storage').textContent='Exporte tes choix pour les conserver.'}render()}
function choose(slug,status,id){selections[slug]={status,candidate:id||null};save()}
function render(){
 const metrics=document.getElementById('metrics');metrics.replaceChildren();for(const [value,label] of [[report.stats.creators,'créateurs'],[report.stats.searchResults,'images trouvées'],[report.stats.creatorsWithCandidates,'profils avec candidat'],[report.stats.keptCurrent,'sans nouveau candidat']]){const n=e('div');n.append(e('strong',String(value)),e('span',label));metrics.append(n)}
 document.getElementById('progress').textContent=Object.keys(selections).length+'/'+report.stats.creators+' créateurs examinés. Export : choix visuels uniquement, pas un fichier de publication.';
 const root=document.getElementById('cards');root.replaceChildren();const filter=document.getElementById('filter').value;
 for(const creator of report.creators){if(filter==='proposal'&&!creator.proposal||filter==='fallback'&&creator.proposal||filter==='unreviewed'&&selections[creator.slug])continue;
 const card=e('article');card.dataset.slug=creator.slug;card.append(e('h2',creator.name),e('div',creator.login+' · rang '+creator.rank,'sub'));
 const currentId=shown[creator.slug]??selections[creator.slug]?.candidate??creator.proposal;
 const c=creator.candidates.find(x=>x.id===currentId);const pair=e('div',undefined,'pair');
 for(const [label,url] of [['Image actuelle',creator.before],['Proposition',c?.preview??creator.before]]){const f=e('figure');f.append(e('figcaption',label));const im=e('img');im.src=url;im.alt=label+' pour '+creator.name;im.loading='lazy';f.append(im);pair.append(f)}card.append(pair);
 if(c){
 card.append(e('p',(c.dimensions?.join(' × ')??'Dimensions inconnues')+' px · '+(c.faceCount??'?')+' visage(s) détecté(s) · netteté indicative '+(c.sharpnessIndicator??'?'),'sub'));
 if(c.reasons.length)card.append(e('p',c.reasons.join(' · '),'reasons'));
 card.append(e('p','Compare les deux images. Garde une nouvelle photo seulement si elle te paraît plus nette et plus naturelle.','notice'));
 }else{card.append(e('p','Aucune nouvelle image candidate à comparer. L’image actuelle est conservée.','empty'))}
 const controls=e('div',undefined,'choices');
 const accept=e('button','Choisir cette photo');accept.disabled=!c?.reviewable;accept.onclick=()=>choose(creator.slug,'visual-selected',c.id);if(selections[creator.slug]?.status==='visual-selected')accept.classList.add('active');
 const keep=e('button','Garder l’actuelle');keep.onclick=()=>choose(creator.slug,'keep-current');if(selections[creator.slug]?.status==='keep-current')keep.classList.add('active');
 const later=e('button','À reprendre');later.onclick=()=>choose(creator.slug,'needs-review',c?.id);
 controls.append(accept,keep,later);card.append(controls);if(selections[creator.slug])card.append(e('p',selections[creator.slug].status==='visual-selected'?'Photo choisie pour le brouillon':selections[creator.slug].status==='keep-current'?'Image actuelle conservée':'Créateur marqué à reprendre','status'));
 const details=e('details'),summary=e('summary','Toutes les candidates et les rejets ('+creator.candidates.length+')');details.append(summary);const list=e('div',undefined,'candidate-list');
 for(let i=0;i<creator.candidates.length;i++){const item=creator.candidates[i],button=e('button');if(item.preview){const im=e('img');im.src=item.preview;im.alt='Alternative '+(i+1)+' pour '+creator.name;im.className='alternate';button.append(im)}button.append(e('span','Alternative '+(i+1)),e('p',item.reasons.join(' · ')||'Comparer netteté et cadrage'));button.onclick=()=>{shown[creator.slug]=item.id;render()};list.append(button)}details.append(list);card.append(details);
 if(creator.error)card.append(e('p','Recherche indisponible : '+creator.error,'reasons'));
 root.append(card);
 }
}
document.getElementById('filter').onchange=render;
document.getElementById('export').onclick=()=>{
 const decisions=report.creators.filter(c=>selections[c.slug]).map(c=>{const s=selections[c.slug],candidate=c.candidates.find(x=>x.id===s.candidate);return {slug:c.slug,name:c.name,...s,candidate:candidate??null}});
 const blob=new Blob([JSON.stringify({version:2,run:'${runId}',generatedAt:report.generatedAt,decisions,note:'Sélection visuelle en brouillon. Aucune image du jeu n’a été changée.'},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=e('a');a.href=url;a.download='choix-portraits-pilote.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};render();
</script></html>`;
}
