/* global chrome */
chrome.runtime.onInstalled.addListener(()=>{chrome.contextMenus.removeAll(()=>chrome.contextMenus.create({id:'send-portrait',title:'Envoyer à CreatorDeck (créateur ouvert)',contexts:['image']}));});
export async function sendImage(info,tab){
 if(info.menuItemId!=='send-portrait')return;
 try{
  const {origin,token}=await chrome.storage.local.get(['origin','token']);
  if(origin!=='http://127.0.0.1:4317' || !token)throw Error('Connecte l’extension à l’atelier avec son bouton de connexion.');
  const headers={Authorization:'Bearer '+token,'X-Studio-Bridge':'1'};
  const current=await fetch(origin+'/api/bridge-state',{headers});if(!current.ok)throw Error('Lance LANCER.cmd puis reconnecte si nécessaire.');
  const target=await current.json();if(!target.slug)throw Error('Choisis d’abord un créateur dans l’atelier.');
  let imageAddress=info.srcUrl;let sourceAddress=info.pageUrl || tab.url;
  for(const address of [info.linkUrl,info.pageUrl]) {try{const u=new URL(address);const original=u.searchParams.get('imgurl') || u.searchParams.get('mediaurl');if(original && new URL(original).protocol==='https:')imageAddress=original;const page=u.searchParams.get('imgrefurl');if(page && new URL(page).protocol==='https:')sourceAddress=page;}catch{/* Pas de lien vers l’originale dans cette page. */}}
  const imageUrl=new URL(imageAddress);if(imageUrl.protocol!=='https:')throw Error('Cette image n’a pas de lien HTTPS. Copie-la ou télécharge-la puis dépose-la dans l’atelier.');
  const response=await fetch(imageUrl.href,{credentials:'omit',signal:AbortSignal.timeout(30000)});
  if(!response.ok || !response.headers.get('content-type')?.startsWith('image/'))throw Error('Le site refuse cette image. Télécharge-la manuellement ou copie-la et colle-la dans l’atelier.');
  const parts=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>24*1024*1024)throw Error('Image trop lourde (24 Mo maximum).');parts.push(chunk);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.length;}
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const source=sourceAddress;
  const saved=await fetch(origin+'/api/receive',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({slug:target.slug,original:btoa(binary),source,imageUrl:imageUrl.href,title:tab.title || 'Photo reçue'})});
  if(!saved.ok)throw Error((await saved.json()).error);
  await chrome.storage.local.set({status:'Photo envoyée pour '+target.name+'. Reviens dans l’atelier pour vérifier et cadrer.'});
  await chrome.action.setBadgeText({text:'✓'});await chrome.action.setBadgeBackgroundColor({color:'#25804c'});
  const tabs=await chrome.tabs.query({url:origin+'/*'});if(tabs[0]){await chrome.tabs.update(tabs[0].id,{active:true});await chrome.windows.update(tabs[0].windowId,{focused:true});}
 }catch(e){await chrome.storage.local.set({status:e.message});await chrome.action.setBadgeText({text:'!'});await chrome.action.setBadgeBackgroundColor({color:'#b53d42'});}
}
chrome.contextMenus.onClicked.addListener(sendImage);
