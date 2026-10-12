/* global chrome */
const status=document.getElementById('status');
const previous=await chrome.storage.local.get('status');status.textContent=previous.status || 'Pas encore connecté.';
document.getElementById('connect').onclick=async()=>{
 try{
  const url=new URL(document.getElementById('connection').value);
  if(url.origin!=='http://127.0.0.1:4317' || !/^[a-f0-9]{48}$/.test(url.hash.slice(1)))throw Error('Copie la connexion depuis l’atelier lancé sur le port 4317.');
  const allowed=await chrome.permissions.request({origins:['https://*/*']});
  if(!allowed)throw Error('Autorisation refusée : tu peux toujours déposer les photos manuellement.');
  const response=await fetch(url.origin+'/api/bridge-state',{headers:{Authorization:'Bearer '+url.hash.slice(1)}});
  if(!response.ok)throw Error('Atelier inaccessible : vérifie que LANCER.cmd est ouvert.');
  const data=await response.json();
  await chrome.storage.local.set({origin:url.origin,token:url.hash.slice(1),status:'Connecté. Créateur ouvert : '+(data.name || 'à choisir')});
  document.getElementById('connection').value='';status.textContent='Connecté. Tu peux envoyer une photo par clic droit.';
 }catch(e){status.textContent=e.message;}
};
