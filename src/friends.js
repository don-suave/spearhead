// Gerätegebundenes Konto + Freundesliste (Einladung per Link). Das Konto (id + Geheimnis) liegt nur in diesem Browser.
import {myName} from './stats.js';
const LS=k=>{try{return localStorage.getItem(k)}catch(e){return null}},SS=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const esc=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const acct=()=>{try{return JSON.parse(LS('sh_acct'))}catch(e){return null}};
async function api(b){const r=await fetch('/api/acct',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||'Server nicht erreichbar ('+r.status+')');return j}
async function ensure(){let a=acct();if(a)return a;const j=await api({op:'new',name:myName()||'Gast'});a={id:j.id,secret:j.secret};SS('sh_acct',JSON.stringify(a));return a}
const box=(html,onclose)=>{document.getElementById('frdlg')?.remove();const d=document.createElement('div');d.id='frdlg';
 d.style.cssText='position:fixed;inset:0;z-index:300;background:#000b;display:flex;align-items:center;justify-content:center;padding:16px';
 d.innerHTML='<div style="background:#1a1e25;color:#ece6d8;border:1px solid #3a3f48;border-radius:12px;padding:16px;max-width:460px;width:100%;max-height:90vh;overflow:auto;font:14px system-ui"></div>';
 d.firstChild.innerHTML=html;document.body.appendChild(d);d.onclick=e=>{if(e.target==d){d.remove();onclose&&onclose()}};return d.firstChild};
const btn='style="display:block;width:100%;margin-top:10px;padding:11px;border-radius:8px;border:0;background:#d2a94a;color:#111;font-size:15px;font-weight:600"';
const btn2='style="display:block;width:100%;margin-top:8px;padding:10px;border-radius:8px;border:1px solid #3a3f48;background:#262c36;color:#ece6d8;font-size:14px"';
export async function friendsUi(){
 const d=box('<b>Freunde</b><div style="margin-top:8px;color:#a09b90">lädt …</div>');
 try{
  const a=await ensure(),j=await api({op:'friends',...a});
  const draw=(msg='')=>{d.innerHTML='<b style="font-size:17px">Freunde</b><div style="color:#a09b90;margin:4px 0 8px">Konto: '+esc(j.me.name)+' · an dieses Gerät gebunden</div>'
   +(j.friends.length?j.friends.map(f=>'<div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #3a3f48"><span style="flex:1">'+esc(f.name)+'</span><button data-t="'+esc(f.name)+'" '+'style="padding:7px 10px;border-radius:7px;border:1px solid #3a3f48;background:#262c36;color:#ece6d8">Test-Partie</button></div>').join(''):'<div style="color:#a09b90;padding:8px 0">Noch keine Freunde. Lade jemanden per Link ein.</div>')
   +'<button id="fi" '+btn+'>Freund einladen (Link)</button><div id="fl" style="margin-top:8px;word-break:break-all;color:#a09b90">'+msg+'</div>'
   +'<button id="fc" '+btn2+'>Schließen</button>';
   d.querySelector('#fc').onclick=()=>document.getElementById('frdlg').remove();
   d.querySelectorAll('button[data-t]').forEach(b=>b.onclick=()=>{globalThis.__sim=1;globalThis.__foeName=b.dataset.t;document.getElementById('frdlg').remove();document.getElementById('home')?.remove();window.__shNew&&window.__shNew()});
   d.querySelector('#fi').onclick=async()=>{try{const r=await api({op:'invite',...a}),url=location.origin+location.pathname+'?inv='+r.code;
     if(navigator.share){try{await navigator.share({title:'Spearhead Online',text:'Komm in meine Freundesliste bei Spearhead:',url});return}catch(e){}}
     try{await navigator.clipboard.writeText(url);draw('Link kopiert (14 Tage gültig, einmal nutzbar):<br>'+esc(url))}catch(e){draw('Link (14 Tage gültig, einmal nutzbar):<br>'+esc(url))}}catch(e){draw('Fehler: '+esc(e.message))}}};
  draw()}catch(e){d.innerHTML='<b>Freunde</b><p>'+esc(e.message.includes('fetch')||/Failed|Network/i.test(e.message)?'Keine Verbindung – für Konto und Freunde wird das Internet gebraucht.':e.message)+'</p><button id="fc" '+btn2+'>Schließen</button>';d.querySelector('#fc').onclick=()=>document.getElementById('frdlg').remove()}}
// Einladungslink beim Start: ?inv=CODE
export async function checkInvite(){
 let c;try{c=new URLSearchParams(location.search).get('inv')}catch(e){}if(!c||!/^[0-9a-f]{6,40}$/.test(c))return;
 try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}
 let nm;try{const r=await fetch('/api/acct?code='+c);const j=await r.json();if(!r.ok)throw new Error(j.error||'ungültig');nm=j.name}catch(e){const d=box('<b>Einladung</b><p>'+esc(e.message)+'</p><button id="fc" '+btn2+'>OK</button>');d.querySelector('#fc').onclick=()=>document.getElementById('frdlg').remove();return}
 const d=box('<b style="font-size:17px">Einladung</b><p><b>'+esc(nm)+'</b> lädt dich ein, Freunde bei Spearhead zu werden. Dabei wird ein Konto auf diesem Gerät angelegt (Name: '+esc(myName()||'Gast')+').</p><button id="fa" '+btn+'>Annehmen</button><button id="fn" '+btn2+'>Ablehnen</button>');
 d.querySelector('#fn').onclick=()=>document.getElementById('frdlg').remove();
 d.querySelector('#fa').onclick=async()=>{try{const a=await ensure();await api({op:'accept',...a,code:c});document.getElementById('frdlg').remove();friendsUi()}catch(e){d.innerHTML='<b>Einladung</b><p>'+esc(e.message)+'</p><button id="fc" '+btn2+'>OK</button>';d.querySelector('#fc').onclick=()=>document.getElementById('frdlg').remove()}}}
window.__shFriends=friendsUi;
