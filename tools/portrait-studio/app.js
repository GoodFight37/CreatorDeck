const $ = (id) => document.getElementById(id);
const token = location.hash.slice(1) || sessionStorage.getItem("portrait-studio-token");
if (token) sessionStorage.setItem("portrait-studio-token", token);
history.replaceState(null, "", location.pathname);
let saveTimer = null; let unsaved = false; let saving = Promise.resolve(); let nextAfterKeep = false; let reviewItems = []; let reviewOffset = 0;
let state; let slug; let image; let selected; let blobUrl; let cx = 0; let cy = 0; let drag; let revision = 0;
const canvas = $("crop"); const context = canvas.getContext("2d");
function message(text) { $("message").textContent = text; }
async function api(url, data) {
  const response = await fetch(url, { method: data ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(data ? { "Content-Type": "application/json" } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  const result = await response.json(); if (!response.ok) throw Error(result.error || "Accès refusé : relance LANCER.cmd et utilise la nouvelle fenêtre."); return result;
}
function element(tag, text, parent) { const e = document.createElement(tag); if (text) e.textContent = text; parent?.append(e); return e; }
function safeLink(url, text, parent) { try { if (new URL(url).protocol !== "https:") return; const e = element("a", text, parent); e.href = url; e.target = "_blank"; e.rel = "noopener noreferrer"; } catch { /* Adresse absente. */ } }
async function refresh() { state = await api("/api/state"); renderNames(); $("progress").textContent = `${Object.keys(state.base).length + Object.keys(state.choices).filter((s) => !state.base[s]).length} / ${state.creators.length} prêts`; }
function renderNames() {
  const filter = $("filter").value.toLocaleLowerCase("fr"); $("names").replaceChildren();
  for (const c of state.creators) {
    const done = state.base[c.slug] || state.choices[c.slug];
    if ($("statusFilter").value && $("statusFilter").value !== (done ? "Prêt" : state.tracking[c.slug]?.status || "À chercher")) continue;
    if (done && !$("showDone").checked) continue;
    if (!(c.slug + " " + c.displayName).toLocaleLowerCase("fr").includes(filter)) continue;
    const b = element("button", `${c.rank}. ${c.displayName}`, $("names"));
    element("small", done ? "Portrait prêt" : state.skipped[c.slug] ? "Passé, à reprendre" : state.tracking[c.slug]?.status || "À chercher", b);
    if (c.slug === slug) b.classList.add("active"); b.onclick = () => choose(c.slug).catch((e) => message(e.message));
  }
}
function closeEditor() { revision++; $("editor").classList.add("hidden"); image = null; selected = null; if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = null; }
async function choose(next) {
  await autosave(); closeEditor(); slug = next; await api("/api/session", { slug }); renderNames(); const c = state.creators.find((c) => c.slug === slug); $("name").textContent = c.displayName;
  $("google").href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(c.displayName + " portrait");
  $("flickr").href = "https://www.flickr.com/search/?license=4%2C5%2C9%2C10&text=" + encodeURIComponent(c.displayName);
  const tracking = state.tracking[slug] || {};
  $("stage").value = tracking.status === "Prêt" ? "À cadrer" : tracking.status || "À chercher";
  $("links").value = (tracking.links || []).join("\n"); $("notes").value = tracking.notes || "";
  $("resumeDraft").disabled = !state.drafts[slug];
  $("external").replaceChildren();
  const query = encodeURIComponent(c.displayName + " portrait");
  for (const [label, url] of [["Bing Images", "https://www.bing.com/images/search?q=" + query], ["YouTube", "https://www.youtube.com/results?search_query=" + query], ["Instagram", "https://www.google.com/search?q=" + encodeURIComponent(c.displayName + " site:instagram.com")], ["X", "https://www.google.com/search?q=" + encodeURIComponent(c.displayName + " site:x.com")], ["Comptes officiels", "https://www.google.com/search?q=" + encodeURIComponent(c.displayName + " site officiel comptes officiels")]]) safeLink(url, label, $("external"));
  for (const link of tracking.links || []) safeLink(link, "Source enregistrée", $("external"));
  $("existing").replaceChildren(); const old = element("img", "", $("existing")); old.className = "current"; old.src = `/seed/avatars/${slug}.webp`; old.alt = "Avatar du catalogue";
  if (state.choices[slug]) { const n = element("img", "", $("existing")); n.className = "current"; n.src = `/chosen/${slug}.webp`; n.alt = "Portrait retenu"; }
  const ready = state.choices[slug] || state.base[slug]; if (ready) { element("p", "Portrait déjà prêt — il sera conservé tant que tu ne le remplaces pas.", $("existing")); if (state.base[slug] && !state.choices[slug]) { const n = element("img", "", $("existing")); n.className = "current"; n.src = `/seed/portraits/${slug}.webp`; n.alt = "Portrait préparé"; } }
  const result = await api("/api/candidates?slug=" + encodeURIComponent(slug)); if (slug !== next) return; renderCandidates(result.candidates); if (state.drafts[slug]) { const response = await fetch("/api/draft-photo?slug=" + slug, { headers: { Authorization: `Bearer ${token}` } }); if (response.ok) await setImage(await response.blob(), state.drafts[slug], next); } message("Choisis une candidate, ajoute une photo du PC, ou recherche dans ton navigateur.");
}
function thumbnail(c) {
  if (c.thumbnail) return c.thumbnail;
  try { const url = new URL(c.original); if (url.hostname !== "upload.wikimedia.org") return ""; const parts = url.pathname.split("/"); const name = parts.at(-1); return url.origin + parts.slice(0, -3).join("/") + "/thumb/" + parts.slice(-3).join("/") + "/320px-" + name; } catch { return ""; }
}
function renderCandidates(list) {
  $("candidates").replaceChildren();
  const photos = list.filter((c) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(c.original || ""));
  if (!photos.length) { element("p", "Aucune photo dans les résultats enregistrés. Essaie une nouvelle recherche ou ajoute une photo avec sa provenance.", $("candidates")); return; }
  for (const c of photos) {
    const card = element("article", "", $("candidates")); card.className = "candidate";
    const img = element("img", "", card); img.loading = "lazy"; img.src = thumbnail(c); img.alt = c.title;
    element("p", c.title, card); element("p", `${c.width} × ${c.height} · ${c.license || "Licence non renseignée"}`, card); safeLink(c.source, "Ouvrir la source", card);
    const b = element("button", "Examiner et cadrer", card); b.onclick = () => loadCandidate(c).catch((e) => message(e.message));
  }
}
async function setImage(blob, candidate, expectedSlug = slug) {
  if (expectedSlug !== slug) return;
  closeEditor(); const currentRevision = revision; unsaved = true; selected = { ...candidate, blob }; blobUrl = URL.createObjectURL(blob); image = new Image(); image.src = blobUrl; await image.decode();
  if (currentRevision !== revision || expectedSlug !== slug) return;
  $("keep").disabled = $("keepNext").disabled = Math.min(image.naturalWidth, image.naturalHeight) < 900;
  cx = image.naturalWidth / 2; cy = image.naturalHeight / 2; $("zoom").max = Math.max(1, Math.min(image.naturalWidth, image.naturalHeight) / 900); $("zoom").value = "1";
  $("title").value = candidate.title || ""; $("author").value = candidate.author || ""; $("source").value = candidate.source || ""; $("license").value = candidate.license || "";
  if (!$("license").value) $("license").value = "";
  $("proofUrl").value = candidate.proofUrl || ""; $("permission").value = candidate.permission || "";
  $("verified").checked = false; $("rights").textContent = candidate.reviewNeeded ? "Commons signale une licence à vérifier. N’exporte pas cette image avant confirmation auprès de la source." : "La licence indiquée est celle de la source ; vérifie aussi l’identité et l’auteur.";
  if (candidate.crop) { cx = candidate.crop.x + candidate.crop.size / 2; cy = candidate.crop.y + candidate.crop.size / 2; $("zoom").value = Math.min(image.naturalWidth, image.naturalHeight) / candidate.crop.size; }
  $("editor").classList.remove("hidden"); draw(); if ($("keep").disabled) message("Image trop petite pour l’export : sauvegardée comme piste, cherche une meilleure originale."); $("editor").scrollIntoView({ behavior: "smooth", block: "start" }); scheduleSave();
}
async function loadCandidate(c) { const expectedSlug = slug; message("Téléchargement de l’originale…"); const response = await fetch(`/api/photo?slug=${encodeURIComponent(slug)}&id=${c.pageid}`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw Error((await response.json()).error); await setImage(await response.blob(), c, expectedSlug); if (expectedSlug === slug) message("Originale chargée. Ajuste le cadre et vérifie les crédits."); }
function crop() { const size = Math.min(image.naturalWidth, image.naturalHeight) / Number($("zoom").value); cx = Math.max(size / 2, Math.min(image.naturalWidth - size / 2, cx)); cy = Math.max(size / 2, Math.min(image.naturalHeight - size / 2, cy)); return { x: cx - size / 2, y: cy - size / 2, size }; }
function draw() { if (!image) return; const r = crop(); context.clearRect(0, 0, 450, 450); context.drawImage(image, r.x, r.y, r.size, r.size, 0, 0, 450, 450); $("dimensions").textContent = `Originale : ${image.naturalWidth} × ${image.naturalHeight} px. Zone conservée : ${Math.round(r.size)} px.`; }
canvas.onpointerdown = (e) => { if (!image) return; drag = { x: e.clientX, y: e.clientY, cx, cy }; canvas.setPointerCapture(e.pointerId); };
canvas.onpointermove = (e) => { if (!drag || !image) return; const ratio = crop().size / canvas.getBoundingClientRect().width; cx = drag.cx - (e.clientX - drag.x) * ratio; cy = drag.cy - (e.clientY - drag.y) * ratio; draw(); };
canvas.onpointerup = canvas.onpointercancel = () => { drag = null; }; $("zoom").oninput = draw;
$("filter").oninput = renderNames; $("showDone").onchange = renderNames; $("cancel").onclick = async () => { try { await autosave(); closeEditor(); unsaved = false; } catch(e) { message(e.message); } };
$("file").onchange = async () => { try { const file = $("file").files[0]; if (file) await setImage(file, { title: file.name }); } catch (e) { message(e.message); } };
$("search").onclick = async () => { try { const expectedSlug = slug; message("Recherche Commons en cours…"); const result = await api("/api/search", { slug }); if (expectedSlug !== slug) return; renderCandidates(result.candidates); message("Recherche enregistrée sur le PC."); } catch (e) { message(e.message); } };
$("skip").onclick = async () => { try { await api("/api/skip", { slug }); await refresh(); const next = state.creators.find((c) => !state.base[c.slug] && !state.choices[c.slug] && !state.skipped[c.slug]); if (next) await choose(next.slug); } catch (e) { message(e.message); } };
$("keep").onclick = async () => {
  $("keep").disabled = true;
  const expectedSlug = slug;
  try {
    if (!image) return; await autosave(); const r = crop(); const output = document.createElement("canvas"); output.width = output.height = 900; output.getContext("2d").drawImage(image, r.x, r.y, r.size, r.size, 0, 0, 900, 900);
    const data = output.toDataURL("image/webp", 0.9); if (!data.startsWith("data:image/webp;")) throw Error("Utilise Edge ou Chrome pour exporter le WebP.");
    const license = $("license").value; const match = license.match(/^CC (BY(?:-SA)?) ([234]\.0)$/); const licenseUrl = match ? `https://creativecommons.org/licenses/${match[1].toLowerCase()}/${match[2]}/` : "https://creativecommons.org/publicdomain/zero/1.0/";
    await api("/api/select", { slug, pageid: selected.pageid, title: $("title").value, author: $("author").value, source: $("source").value, license, licenseUrl, proofUrl: $("proofUrl").value, permission: $("permission").value, verified: $("verified").checked, crop: r, webp: data.split(",")[1] });
    if (expectedSlug === slug) closeEditor(); await refresh(); if (nextAfterKeep && expectedSlug === slug) { const next = state.creators.find(c => !state.base[c.slug] && !state.choices[c.slug] && !state.skipped[c.slug]); if (next) await choose(next.slug); } nextAfterKeep = false; message("Portrait enregistré sur ce PC. Clique sur Exporter pour préparer les fichiers à intégrer.");
  } catch (e) { message(e.message); } finally { $("keep").disabled = false; nextAfterKeep = false; }
};
$("export").onclick = async () => { try { const result = await api("/api/export", {}); message(`${result.count} portraits exportés dans :\n${result.directory}\nCompresse ce dossier en ZIP pour le transmettre à Codex. Aucun fichier du jeu ni GitHub n’a été modifié.`); } catch (e) { message(e.message); } };
$("batch").onclick = async () => { try { const result = await api("/api/batch", {}); state.batch = result; message(result.total ? `Lot lancé : ${result.total} recherches, sans IA. Tu peux continuer à choisir les photos.` : "Les recherches initiales sont déjà présentes. Relance seulement celles des créateurs qui n’ont pas de bonne candidate."); } catch (e) { message(e.message); } };
setInterval(async () => { if (state?.batch?.running) { try { await refresh(); if (!state.batch.running) message(state.batch.error || "Lot terminé et enregistré."); } catch { /* Le serveur peut avoir été fermé. */ } } }, 3000);
try { await refresh(); const first = state.creators.find(c => c.slug === state.session.slug) || state.creators.find((c) => !state.base[c.slug] && !state.choices[c.slug] && !state.skipped[c.slug]) || state.creators[0]; await choose(first.slug); } catch (e) { message(e.message); }

async function importUrl(value) {
  const expectedSlug = slug;
  const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password) throw Error("Utilise un lien HTTPS direct vers une image.");
  message("Récupération de l’image…");
  try {
    const response = await fetch(url.href, { credentials: "omit", signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw Error("Source inaccessible");
    const blob = await response.blob(); if (blob.size > 24 * 1024 * 1024) throw Error("Image trop lourde");
    await setImage(blob, { title: url.pathname.split("/").at(-1), source: url.href }, expectedSlug);
  } catch { throw Error("Ce site bloque l’import direct. Ouvre le lien dans ton navigateur, enregistre l’image puis dépose le fichier ici, ou copie l’image et colle-la avec Ctrl+V."); }
}
$("importUrl").onclick = () => importUrl($("imageUrl").value).catch((e) => message(e.message));
$("dropzone").ondragover = (e) => { e.preventDefault(); };
$("dropzone").ondrop = async (e) => { e.preventDefault(); try { const file = e.dataTransfer.files[0]; if (file) await setImage(file, { title: file.name }); else await importUrl(e.dataTransfer.getData("text/uri-list").split("\n").find((x) => x && !x.startsWith("#")) || e.dataTransfer.getData("text/plain")); } catch (err) { message(err.message); } };
document.addEventListener("paste", async (e) => {
  try {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) { e.preventDefault(); await setImage(item.getAsFile(), { title: "Photo collée" }); }
    else if (e.target.id === "dropzone") { e.preventDefault(); await importUrl(e.clipboardData.getData("text/plain")); }
  } catch (err) { message(err.message); }
});
$("saveTracking").onclick = async () => { try { await api("/api/tracking", { slug, status: $("stage").value, links: $("links").value, notes: $("notes").value }); await refresh(); message("Suivi et sources enregistrés."); } catch (e) { message(e.message); } };
$("saveDraft").onclick = async () => {
  const expectedSlug = slug; const candidate = selected;
  try {
    if (!candidate?.blob) return;
    if (candidate.blob.size > 24 * 1024 * 1024) throw Error("Originale trop lourde : 24 Mo maximum");
    const reader = new FileReader(); const original = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result.split(",")[1]); reader.onerror = reject; reader.readAsDataURL(candidate.blob); });
    if (slug !== expectedSlug || selected !== candidate) return;
    await api("/api/draft", { slug: expectedSlug, original, pageid: candidate.pageid, reviewNeeded: candidate.reviewNeeded, crop: crop(), title: $("title").value, author: $("author").value, source: $("source").value, license: $("license").value, permission: $("permission").value, proofUrl: $("proofUrl").value }); await refresh(); $("resumeDraft").disabled = false; message("Originale et crédits sauvegardés. Tu peux les reprendre après fermeture.");
  } catch (e) { message(e.message); }
};
$("resumeDraft").onclick = async () => { try { const expectedSlug = slug; const candidate = state.drafts[slug]; const response = await fetch("/api/draft-photo?slug=" + slug, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw Error("Photo enregistrée introuvable"); await setImage(await response.blob(), candidate, expectedSlug); } catch (e) { message(e.message); } };

$("statusFilter").onchange = renderNames;
$("keepNext").onclick = () => { nextAfterKeep = true; $("keep").click(); };
async function autosave() {
  clearTimeout(saveTimer); saveTimer = null;
  const expectedSlug = slug; const candidate = selected;
  if (!candidate?.blob || !image?.complete || candidate.blob.size > 24 * 1024 * 1024) return saving;
  const fields = { slug: expectedSlug, title: $("title").value, author: $("author").value, source: $("source").value, license: $("license").value, permission: $("permission").value, proofUrl: $("proofUrl").value, crop: crop(), pageid: candidate.pageid, reviewNeeded: candidate.reviewNeeded };
  saving = saving.catch(() => {}).then(async () => {
    const original = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(",")[1]); reader.onerror = reject; reader.readAsDataURL(candidate.blob); });
    await api("/api/draft", { ...fields, original }); if (expectedSlug === slug && candidate === selected && saveTimer === null) unsaved = false;
  });
  return saving;
}
function scheduleSave() { unsaved = true; clearTimeout(saveTimer); saveTimer = setTimeout(() => autosave().catch(e => message(e.message)), 1000); }
for (const id of ["title","author","source","license","permission","proofUrl","zoom"]) $(id).addEventListener("input", scheduleSave);
canvas.addEventListener("pointerup", () => autosave().catch(e => message(e.message)));
window.addEventListener("beforeunload", e => { if (unsaved) { e.preventDefault(); e.returnValue = ""; } });
$("review").onclick = async () => { try { reviewItems = (await api("/api/review")).items; reviewOffset = 0; $("reviewPanel").classList.remove("hidden"); renderReview(); } catch(e) { message(e.message); } };
$("closeReview").onclick = () => $("reviewPanel").classList.add("hidden");
$("moreReview").onclick = () => { reviewOffset += 20; renderReview(); };
function renderReview() {
  $("reviewCards").replaceChildren();
  for(const item of reviewItems.slice(reviewOffset, reviewOffset+20)) {
    const card=element("article", "", $("reviewCards")); card.className="candidate"; element("h3",item.displayName,card);
    const old=element("img","",card); old.src=`/seed/avatars/${item.slug}.webp`; old.alt="Image actuelle";
    if(!item.candidates.length) { element("p","Aucune candidate assez grande : recherche manuelle à reprendre.",card); continue; }
    const select=element("select","",card); for(const c of item.candidates) {const option=element("option",c.title,select);option.value=c.pageid;}
    const preview=element("img","",card); preview.src=thumbnail(item.candidates[0]); preview.alt="Cadrage central proposé"; preview.style.objectFit="cover"; preview.style.height="auto"; preview.style.aspectRatio="1"; select.onchange=()=>preview.src=thumbnail(item.candidates.find(c=>String(c.pageid)===select.value));
    const credits=element("p","",card); const source=element("div","",card);
    function info() { const c=item.candidates.find(c=>String(c.pageid)===select.value); credits.textContent=`${c.author || "Auteur manquant"} · ${c.license || "Licence inconnue"}${c.reviewNeeded ? " · droits à vérifier" : ""}`; source.replaceChildren(); safeLink(c.source,"Vérifier la source",source); }
    info(); select.addEventListener("change",info);
    const label=element("label","Bonne personne et cadrage correct",card); const checked=element("input","",label); checked.type="checkbox";
    checked.dataset.slug=item.slug;
    const rightsLabel=element("label","Droits et auteur vérifiés sur la source",card); rightsLabel.style.display="block";
    const rights=element("input","",rightsLabel); rights.type="checkbox"; rights.dataset.rights="true";
    checked.rights=rights; select.addEventListener("change",()=>{checked.checked=false;rights.checked=false;});
    const open=element("button","Examiner",card); open.onclick=async()=>{try{await choose(item.slug);await loadCandidate(item.candidates.find(c=>String(c.pageid)===select.value));}catch(e){message(e.message);}};
    checked.candidate=()=>item.candidates.find(c=>String(c.pageid)===select.value);
  }
  $("moreReview").disabled=reviewOffset+20>=reviewItems.length;
}
$("prepareReview").onclick=async()=>{
  $("prepareReview").disabled=true;
  let count=0;
  try {for(const box of $("reviewCards").querySelectorAll("input[data-slug]:checked")) {
    const c=box.candidate(); const response=await fetch(`/api/photo?slug=${box.dataset.slug}&id=${c.pageid}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok) throw Error((await response.json()).error);
    const blob=await response.blob(); const original=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(",")[1]);r.onerror=reject;r.readAsDataURL(blob);});
    await api("/api/draft",{...c,slug:box.dataset.slug,original}); box.checked=false; count++;
    message(`${count} originales préparées. Le cadrage et les droits restent à confirmer.`);
  } await refresh(); }catch(e){message(`${count} photos préparées. ${e.message}`);}finally{$("prepareReview").disabled=false;}
};

$("updates").onclick=async()=>{try{const r=await api("/api/update-check");message(r.available?`Nouvelle version ${r.latest} disponible. Ferme le lanceur, puis double-clique METTRE-A-JOUR.cmd. Tes photos et choix seront conservés.`:`Version ${r.current} à jour.`);}catch(e){message("Vérification impossible : "+e.message);}};
$("approveReview").onclick=async()=>{
  $("approveReview").disabled=true; let count=0;
  try {
    const boxes=[...$("reviewCards").querySelectorAll("input[data-slug]:checked")];
    if(!boxes.length) throw Error("Coche les photos à garder.");
    if(boxes.some(b=>!b.rights.checked)) throw Error("Confirme les droits sur la source pour chaque photo cochée, ou utilise Préparer pour les garder en brouillon.");
    for(const box of boxes) {
      const c=box.candidate(); if(!c.author || !/^(CC BY(?:-SA)? [234]\.0|CC0)$/.test(c.license)) throw Error("Crédits incomplets : utilise Examiner pour ce créateur.");
      const response=await fetch(`/api/photo?slug=${box.dataset.slug}&id=${c.pageid}`,{headers:{Authorization:`Bearer ${token}`}}); if(!response.ok) throw Error((await response.json()).error);
      const blob=await response.blob(); const url=URL.createObjectURL(blob);
      try {const photo=new Image();photo.src=url;await photo.decode();const size=Math.min(photo.naturalWidth,photo.naturalHeight);if(size<900)throw Error("Originale trop petite");const x=(photo.naturalWidth-size)/2,y=(photo.naturalHeight-size)/2;const output=document.createElement("canvas");output.width=output.height=900;output.getContext("2d").drawImage(photo,x,y,size,size,0,0,900,900);
      const match=c.license.match(/^CC (BY(?:-SA)?) ([234]\.0)$/);
      await api("/api/select",{slug:box.dataset.slug,pageid:c.pageid,title:c.title,author:c.author,source:c.source,license:c.license,licenseUrl:match?`https://creativecommons.org/licenses/${match[1].toLowerCase()}/${match[2]}/`:"https://creativecommons.org/publicdomain/zero/1.0/",verified:true,crop:{x,y,size},webp:output.toDataURL("image/webp",.9).split(",")[1]});
      }finally{URL.revokeObjectURL(url);} box.checked=false;count++;message(`${count} portraits du lot enregistrés.`);
    }
    await refresh(); reviewItems=(await api("/api/review")).items; reviewOffset=0;renderReview();
  }catch(e){message(`${count} portraits enregistrés. ${e.message}`);}finally{$("approveReview").disabled=false;}
};
