// Spiel-Statistik: meldet Start und Ergebnis jeder Partie an /api/result (nur online, nie blockierend)
import {ARMY,REALM} from './data.js';
const LS=k=>{try{return localStorage.getItem(k)}catch(e){return null}},SS=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const online=()=>/^https?:/.test(location.protocol);
const sent=new Set();
const ck=(k,v)=>{try{if(v==null){const m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}document.cookie=k+'='+encodeURIComponent(v)+';max-age=63072000;path=/;SameSite=Lax'}catch(e){return null}};
export const myName=()=>{const a=LS('sh_name')||ck('sh_name');if(a&&!LS('sh_name'))SS('sh_name',a);return a||''};
const setName=n=>{SS('sh_name',n);ck('sh_name',n)};
// Release-Info: Version und Upload-Zeit (beim Release eingesetzt)
export const relInfo=()=>{const v='__VER__',t='__BUILD__';const d=new Date(t);return (/^v\d/.test(v)?v:'lokaler Build')+(isNaN(d)?'':' · hochgeladen '+d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}))};
export function pid(){let p=LS('sh_pid')||ck('sh_pid');if(!p){p=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now())}SS('sh_pid',p);ck('sh_pid',p);return p}
const BF=[['Aqshy','Ghyran'],['Dolorum','Ossia'],['Ashen Bastion','Shattered Crossroads']];
export function report(G){if(!online()||!G||!G.S)return;const S=G.S,K=S.K;
 const ev=S.over?'end':S.tn>=1&&K.army&&K.army[0]!=null?'start':null;if(!ev)return;const key=G.seed+':'+ev;if(sent.has(key))return;sent.add(key);
 const body={ev,pid:pid(),name:myName()||'Gast',seed:G.seed,v:'__VER__',pack:K.pack|0,field:(BF[K.pack|0]||[])[K.realm|0]||'',map:K.map?'diagonal':'horizontal',
  army:ARMY[K.army[0]]?.n||'',foe:ARMY[K.army[1]]?.n||'',att:K.att,round:S.round,vp:[S.P[0].vp,S.P[1].vp],winner:ev=='end'?S.winner:null,
  opts:{pile:!!K.pile,rres:!!K.rres,rdep:!!K.rdep}};
 try{fetch('/api/result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{})}catch(e){}}
export function askName(force){if(!online())return;if(!force&&myName())return;
 const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:200;background:#000c;display:flex;align-items:center;justify-content:center;padding:20px';
 d.innerHTML='<div style="background:#1b1e24;border:1px solid #3a3f48;border-radius:14px;padding:18px;max-width:340px;width:100%"><b>Wie heißt du?</b><p style="color:#a09b90;margin:8px 0 12px;font-size:13px">Dein Name erscheint in der gemeinsamen Statistik (Start und Ergebnis deiner Spiele).</p><input id="shn" maxlength="20" style="width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px;border-radius:8px;border:1px solid #3a3f48;background:#0c0e11;color:#ece6d8;user-select:text;-webkit-user-select:text" placeholder="Name"><button id="sho" style="margin-top:12px;width:100%">OK</button></div>';
 document.body.appendChild(d);const i=d.querySelector('#shn');i.value=myName();const ok=()=>{setName((i.value.trim()||'Gast').slice(0,20));d.remove()};d.querySelector('#sho').onclick=ok;i.onkeydown=e=>{if(e.key=='Enter')ok()};setTimeout(()=>i.focus(),50)}


// ---- Startseite: Statistik-Übersicht + Knopf „Neues Spiel“ ----
const PK=['Fire and Jade','Sand and Bone','City of Ash'];
function agg(G,key){const m={};G.forEach(g=>{const k=key(g)||'–';const a=m[k]||(m[k]={k,n:0,e:0,w:0,l:0,d:0});a.n++;if(g.ended){a.e++;if(g.winner==0)a.w++;else if(g.winner==1)a.l++;else a.d++}});return Object.values(m).sort((a,b)=>b.n-a.n)}
export function home(onStart){document.getElementById('home')?.remove();
 const d=document.createElement('div');d.id='home';d.style.cssText='position:fixed;inset:0;z-index:150;background:#0c0e11;color:#ece6d8;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;user-select:text;-webkit-user-select:text;padding:calc(env(safe-area-inset-top,0px) + 18px) max(16px,env(safe-area-inset-right)) calc(env(safe-area-inset-bottom,0px) + 24px) max(16px,env(safe-area-inset-left))';
 const css='<style>#home h1{font-size:24px;margin:0}#home h2{font-size:14px;color:#d2a94a;margin:20px 0 6px;font-weight:normal;text-transform:uppercase;letter-spacing:.06em}#home .s{color:#a09b90;font-size:13px}#home .w{overflow-x:auto}#home table{border-collapse:collapse;width:100%}#home th,#home td{padding:5px 7px;border-bottom:1px solid #3a3f48;text-align:left;white-space:nowrap;font-size:13px}#home th{color:#a09b90;font-weight:normal;font-size:11px;text-transform:uppercase}#home td.n,#home th.n{text-align:right}#home .go{display:block;width:100%;max-width:420px;margin:16px 0 0;padding:15px;font-size:18px;font-weight:bold;background:#d2a94a;color:#14110a;border:0;border-radius:12px}#home .nm{margin-left:8px;font-size:13px;background:none;border:0;color:#d2a94a;text-decoration:underline;padding:0}</style>';
 d.innerHTML=css+'<div style="max-width:720px;margin:0 auto"><h1>Spearhead Online</h1><div class="s">Age of Sigmar Spearhead gegen den Computer · '+relInfo()+'</div><button class="go" id="hgo">Neues Spiel</button><button class="go" id="hrl" style="background:#262c36;color:#ece6d8;margin-top:10px;font-size:16px;padding:12px">Regeln &amp; Spearhead-Infos</button><div class="s" id="hnm" style="margin-top:10px"></div><div id="hst"><h2>Statistik</h2><div class="s" id="hsum">lädt …</div></div></div>';
 document.body.appendChild(d);const $=i=>d.querySelector('#'+i);
 const nm=()=>{$('hnm').innerHTML='';const t=document.createTextNode('Spieler: '+(myName()||'Gast'));$('hnm').appendChild(t);if(online()){const b=document.createElement('button');b.className='nm';b.textContent='ändern';b.onclick=()=>{askName(true);const w=setInterval(()=>{if(!document.getElementById('shn')){clearInterval(w);nm()}},200)};$('hnm').appendChild(b)}};nm();const iv=setInterval(()=>{if(!d.isConnected)return clearInterval(iv);const t='Spieler: '+(myName()||'Gast');if(!$('hnm').textContent.startsWith(t))nm()},500);
 $('hgo').onclick=()=>{d.remove();onStart()};
 $('hrl').onclick=()=>document.getElementById('info')?.click();
 if(!online()){$('hst').style.display='none';return}
 const tbl=(h,rows)=>{const w=document.createElement('div');w.className='w';const t=document.createElement('table');const hr=t.insertRow();h.forEach((x,i)=>{const c=document.createElement('th');c.textContent=x;if(i&&x!=='Spieler'&&x!=='Feld'&&x!=='Armee'&&x!=='Ergebnis')c.className='n';hr.appendChild(c)});
  rows.forEach(r=>{const tr=t.insertRow();r.forEach((x,i)=>{const c=tr.insertCell();c.textContent=x;if(typeof x==='number'||x==='–'||/%$/.test(x))c.className='n'})});w.appendChild(t);return w};
 const H=['Gestartet','Beendet','Siege','Nied.','Remis','Quote'],row=a=>[a.k,a.n,a.e,a.w,a.l,a.d,a.e?Math.round(100*a.w/a.e)+'%':'–'];
 fetch('/api/stats').then(r=>r.ok?r.json():r.json().catch(()=>({})).then(j=>Promise.reject(j&&j.error||('HTTP '+r.status)))).then(G=>{const st=$('hst');st.innerHTML='<h2>Statistik</h2>';
  const e=G.filter(g=>g.ended),sm=document.createElement('div');sm.className='s';sm.textContent=G.length+' Spiele gestartet, '+e.length+' beendet, '+new Set(G.map(g=>g.name)).size+' Spieler (Sieg = Mensch gegen Computer)';st.appendChild(sm);
  if(!G.length)return;
  [['Spieler','Name',g=>g.name||'Gast'],['Schlachtfelder','Schlachtfeld',g=>PK[g.pack]+' · '+g.field],['Armeen','Armee',g=>g.army]].forEach(([t,hd,k])=>{const h=document.createElement('h2');h.textContent=t;st.appendChild(h);st.appendChild(tbl([hd,...H],agg(G,k).map(row)))});
  const h=document.createElement('h2');h.textContent='Letzte Spiele';st.appendChild(h);
  st.appendChild(tbl(['Wann','Spieler','Feld','Armee','Ergebnis'],G.slice(0,15).map(g=>[new Date(g.started).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),g.name||'Gast',PK[g.pack]+' · '+g.field,g.army,g.ended?(g.winner==0?'Sieg ':g.winner==1?'Niederlage ':'Remis ')+g.vp_h+':'+g.vp_c:'offen (R'+g.round+')'])))
 }).catch(e=>{$('hsum').textContent='Statistik gerade nicht verfügbar'+(typeof e=='string'&&e?' ('+e+')':'')})}
