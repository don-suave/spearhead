// Ansicht: Canvas, Pop-ups, Eingabe. Kennt nur Game (Anfragen/Ereignisse), keine Regeln im Detail.
import {Game} from './game.js';import {flow} from './flow.js';import {aiAnswer,aiFallback} from './ai.js';
import {W,H,CR,into,OR,objR} from './geom.js';
import {abs,mDistPt,mgap,cohBad} from './models.js';
import {PH,TWL,TERSZ,ARMY} from './data.js';
import {chargePlan} from './plan.js';
import {depForm,rsvForm,moveForm,pileForm,chargeForm,mvRest,chargeModelErr,CMD,rngOf,mvOf,byId,abilities,globals,stat,eligF,sfOK,dist,foes,wnd,mx,ONM,placeErr,moveErr,adjErr,adjAllow,pileModelErr,chargeErr,pileErr,chargeDest,pileDest,chargeSnap,actCheck,inCombat} from './rules.js';
import {report,askName,home,relInfo,myName} from './stats.js';import {photoOf,ground,drawTerrain,drawObjective,drawToken} from './art.js';import {TAC} from './data.js';import {unitFlags,battleAbs,abOrigin,originOf,srcTag} from './abil.js';

const SC=24,$=id=>document.getElementById(id),COL=['#4aa3ff','#ff6a4a'];
let G,seat=0,mode=null,busy=false,timer=0,nextDelay=600;
const dice=(v,th)=>(v=(v||[]).filter(x=>x>0)).length?`<div class='dr ${v.length>20?'xs':v.length>10?'s':''}'>${v.map((x,i)=>`<i class='d ${th?(x>=th?'ok':'no'):''}' style='animation-delay:${i*35}ms'>${x}</i>`).join('')}</div>`:'';
const rb=bl=>(bl||[]).map(b=>b.k=='txt'?b.s+'<br>':b.k=='row'?(b.v&&b.v.length?(b.l?`<small>${b.l}</small>`:'')+dice(b.v,b.th):''):'').join('');
let tt;function tray(t,h){const d=$('dice');if(d.style.display!='block')d.innerHTML='';d.querySelectorAll('.tx').forEach(x=>x.remove());const s=document.createElement('div');s.className='ts';s.innerHTML=`<b>${t}</b>${h}`;d.appendChild(s);while(d.querySelectorAll('.ts').length>3)d.querySelector('.ts').remove();const x=document.createElement('div');x.className='tx';x.textContent='Beliebig antippen oder scrollen zum Schließen';d.appendChild(x);d.style.display='block';d.scrollTop=d.scrollHeight}
function autoTray(t){const d=$('dice');if(d.style.display!='block')d.innerHTML='';let a=d.querySelector('.ts.auto');if(!a){a=document.createElement('div');a.className='ts auto';a.innerHTML='<b>Automatisch</b>';d.insertBefore(a,d.firstChild)}d.querySelectorAll('.tx').forEach(x=>x.remove());const l=document.createElement('div');l.textContent=t;a.appendChild(l);while(a.children.length>9)a.children[1].remove();const x=document.createElement('div');x.className='tx';x.textContent='Beliebig antippen oder scrollen zum Schließen';d.appendChild(x);d.style.display='block'}
const hideDice=()=>{const d=$('dice');d.style.display='none';d.innerHTML=''};
document.addEventListener('pointerdown',hideDice,true);document.addEventListener('wheel',hideDice,{capture:true,passive:true});
/* ---------- Hinweiszeile ---------- */
let ntm;
function hint(t){$('hint').style.display=t?'flex':'none';$('ht').textContent=t||''}
const drg=()=>mode&&(mode.t=='move'||mode.t=='dest');
function rehint(){const m=mode;hint(m?m.hint:'');const pl=m&&m.t=='place';const hb=$('hb');hb.innerHTML='';
 if(m&&m.t=='bar'){m.q.opts.forEach((o,i)=>{const b=document.createElement('button');b.textContent=o.b||o.t;b.onclick=()=>answer(i);hb.appendChild(b)});['rl','rr','ho','hy','hx'].forEach(i=>$(i).style.display='none');return}
 $('rl').style.display=$('rr').style.display=(pl&&(m.q.kind=='terr'||m.q.kind=='relic'))?'':'none';
 $('ho').style.display='none';$('hy').style.display=m&&m.t=='adj'?'':'none';$('hy').textContent=m&&m.t=='dest'?'Modelle einzeln':'✓ Fertig';
 $('hx').style.display=m&&m.t!='fightsel'&&((m.t=='place'&&m.q.cancel)||m.t!='place')?'':'none';
 $('hx').textContent=m&&m.t=='dest'?(m.chg?'Angriff abbrechen':m.pile?'Nicht nachrücken':'Stehen bleiben'):m&&(m.t=='place'||m.t=='tgt')?'✕ Abbrechen':'✕';
 const ra=!m&&G&&rsvAvail();if(ra&&ra.length){hint('Reserve bereit: '+ra.map(g=>g.t).join(' · '));$('ho').style.display='';$('ho').textContent='Aufstellen';$('hx').style.display='none';$('rl').style.display=$('rr').style.display='none'}}
const rsvAvail=()=>{const q=G&&G.req;return q&&q.t=='act'&&!G.isAI(q.who)?globals(G.S,q.who).filter(g=>g.k.startsWith('rsv:')):[]};
$('ho').onclick=()=>{const l=rsvAvail();if(!l.length)return;const q=G.req;pop('Aus der Reserve aufstellen','Welche Einheit soll jetzt aufgestellt werden?',l.map(g=>({t:g.t,s:g.s,fn:()=>answer({a:g.k})})))};
function note(t){hint(t);clearTimeout(ntm);ntm=setTimeout(rehint,2600)}
let pcache=new Map();
function setMode(m){mode=m;pcache=new Map();rehint()}
/* ---------- Pop-ups ---------- */
let popAfter=null;
function pop(title,body,btns,close=true,after=null){
 const d=$('pop');d.innerHTML='';d.className='';d.style.display='flex';popAfter=after;const s=document.createElement('div');s.className='sheet';
 s.innerHTML=`<h3>${title}</h3><p>${body}</p>`;
 btns.forEach(b=>{const x=document.createElement('button');x.innerHTML=b.t+(b.s?`<small>${b.s}</small>`:'');x.disabled=!!b.dis;x.onclick=()=>{closePop(false);b.fn&&b.fn()};s.appendChild(x)});
 if(close){const x=document.createElement('button');x.textContent=btns.length?'Abbrechen':'OK';x.onclick=()=>closePop();s.appendChild(x)}
 d.appendChild(s);d.onclick=e=>{if(e.target==d&&close)closePop()}}
function closePop(run=true){$('pop').style.display='none';const f=popAfter;popAfter=null;if(run&&f)f()}
const popOpen=()=>$('pop').style.display=='flex';
function blocking(title,html){busy=true;pop(title,html,[],true,()=>{busy=false;pump()})}
/* ---------- Spielfluss: Ereignisse anzeigen, Anfragen stellen ---------- */
function showEvent(e){
 if(e.t=='tray'){tray(e.title,rb(e.blocks));return false}
 if(e.t=='note'){note(e.text);autoTray(e.text);return false}
 if(e.t=='phase'){ui();return false}
 if(e.t=='rep'){if(e.act==seat){blocking(e.title,rb(e.blocks));return true}tray(e.title,rb(e.blocks));return false}
 if(e.t=='msg'){blocking(e.title,rb(e.blocks));return true}
 return false}
function pump(){clearTimeout(timer);if(busy||!G)return;report(G);
 while(G.events.length){if(showEvent(G.events.shift()))return}
 ui();const q=G.req;if(!q){mode=null;rehint();return}
 if(offer!=null&&q.t=='act'&&!G.isAI(q.who)){present(q);offerNow();return}
 if(G.isAI(q.who)){const d=nextDelay;nextDelay=600;timer=setTimeout(aiStep,d);return}
 present(q)}
function aiStep(){if(busy||popOpen()){timer=setTimeout(aiStep,250);return}
 const q=G.req;if(!q||!G.isAI(q.who))return pump();
 let a=aiAnswer(G,q),err=G.submit(a);if(err){console.error('KI',err,a,q);for(const c of aiFallback(G,q)){const e2=G.submit(c);if(!e2){a=c;note('KI-Notausgang: '+err);err='';break}}if(err){note('KI-Fehler: '+err);return}}
 nextDelay=q.t=='act'?(a.a=='next'?500:(G.S.ph==2?1100:2600)):450;pump()}
let offer=null,rings=null;
function answer(a){const q0=G.req,err=G.submit(a);if(err){note(err);return false}rings=null;
 if(q0&&a&&typeof a=='object'&&!G.isAI(q0.who)&&!a.stay&&!a.P&&(a.a=='move'||(q0.t=='dest'&&q0.run)))offer=a.a=='move'?a.u:q0.u;
 mode=null;rehint();pump();return true}
function offerNow(){offer=null;return;const S=G.S,u=byId(S,offer);if(!u||u.x<0||S.ph!=2||u.n<2)return;const al=adjAllow(S,u);if(al<.3||S.T.adj.includes(u.id))return;
 rings={u:u.id,allow:al};
 pop('Modelle anpassen?',`Die Einheit darf noch ${al.toFixed(1)} Zoll je Modell einzeln bewegen. Die Reichweite ist im Feld markiert.`,[{t:'Modelle anpassen',fn:()=>useAb(u,'adj')},{t:'Fertig',fn:()=>{rings=null}}],false)}
function present(q){const S=G.S;
 if(q.t=='choice'&&q.set){setMode(null);pop(q.title,q.text||'',[],false);const sh=$('pop').firstChild,sel=q.set.map(g=>g.def||0),ps=[];
  q.set.forEach((g,gi)=>{const h=document.createElement('div');h.textContent=g.n;h.style.cssText='font-weight:bold;margin:10px 0 4px;color:var(--gold)';const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;flex-wrap:wrap';const ds=document.createElement('div');ds.style.cssText='font-size:12px;opacity:.75;margin-top:4px;min-height:15px';
   const bs=g.opts.map((o,oi)=>{const b=document.createElement('button');b.textContent=o.t;b.style.cssText='flex:1 1 auto;padding:8px 10px';b.onclick=()=>{sel[gi]=oi;paint()};row.appendChild(b);return b});
   ps.push(()=>{bs.forEach((b,oi)=>{const on=sel[gi]==oi;b.style.background=on?'var(--gold)':'';b.style.color=on?'#1a1405':'';b.style.fontWeight=on?'bold':''});ds.textContent=g.opts[sel[gi]].s||''});sh.append(h,row,ds)});
  const paint=()=>ps.forEach(f=>f());paint();const ok=document.createElement('button');ok.textContent='Weiter';ok.style.cssText='margin-top:14px;background:var(--gold);color:#1a1405;font-weight:bold';ok.onclick=()=>{closePop(false);answer(sel.slice())};sh.appendChild(ok)}
 else if(q.t=='choice'&&q.car){setMode(null);pop(q.title,q.text||'',[],false);
  const sh=$('pop').firstChild;const cmp=(a,b)=>a.localeCompare(b,'de');let k=0,fl;const card=document.createElement('div');card.style.cssText='border:1px solid var(--gold);border-radius:12px;padding:14px 12px;margin:8px 0;text-align:center;min-height:132px;display:flex;flex-direction:column;justify-content:center;gap:6px';
  const GAS=[...new Set(q.opts.map(o=>o.ga))].sort(cmp);fl=GAS[0];const fr=document.createElement('div');fr.style.cssText='display:flex;gap:5px;flex-wrap:wrap';
  const L=()=>q.opts.map((o,i)=>i).filter(i=>q.opts[i].ga==fl).sort((a,b)=>cmp(q.opts[a].f,q.opts[b].f)||cmp(q.opts[a].t,q.opts[b].t));
  const fb=GAS.map(g=>{const b=document.createElement('button');b.textContent=g;b.style.cssText='flex:1 1 auto;padding:6px 8px;font-size:13px';b.onclick=()=>{fl=g;k=0;show()};fr.appendChild(b);return b});
  const nav=document.createElement('div');nav.style.cssText='display:flex;gap:8px;align-items:center';const bl=document.createElement('button'),br=document.createElement('button'),dots=document.createElement('div');bl.textContent='◀';br.textContent='▶';bl.style.flex=br.style.flex='none';dots.style.cssText='flex:1;text-align:center;font-size:11px;opacity:.7;letter-spacing:2px';nav.append(bl,dots,br);
  const ok=document.createElement('button');ok.style.cssText='background:var(--gold);color:#1a1405;font-weight:bold';
  const show=()=>{const l=L(),o=q.opts[l[k]];fb.forEach((b,i)=>{const on=GAS[i]==fl;b.style.borderColor=on?'var(--gold)':'';b.style.color=on?'var(--gold)':'';b.style.fontWeight=on?'bold':''});card.innerHTML='<div style="font-size:12px;opacity:.7">'+o.ga+' · '+o.f+'</div><div style="font-size:19px;font-weight:bold;color:var(--gold)">'+o.t+'</div><div style="font-size:12px;opacity:.8;line-height:1.35">'+o.s+'</div>';dots.textContent=l.map((_,i)=>i==k?'●':'○').join(' ');ok.textContent='Auswählen: '+o.t};
  bl.onclick=()=>{const n=L().length;k=(k+n-1)%n;show()};br.onclick=()=>{k=(k+1)%L().length;show()};ok.onclick=()=>{const i=L()[k];closePop(false);answer(i)};
  let x0=null;card.onpointerdown=e=>x0=e.clientX;card.onpointerup=e=>{if(x0!=null&&Math.abs(e.clientX-x0)>40){(e.clientX<x0?br:bl).onclick()}x0=null};
  sh.append(fr,card,nav,ok);show()}
 else if(q.t=='choice'&&q.bar)setMode({t:'bar',q,hint:q.bar})
 else if(q.t=='choice'&&q.sel){setMode(null);pop(q.title,titleSrc(q.who,q.title)+(q.text||'')+(q.blocks?'<br>'+rb(q.blocks):''),[],false);
  const sh=$('pop').firstChild,se=document.createElement('select');se.id='selpick';se.style.cssText='width:100%;padding:10px;margin:6px 0;font-size:15px;background:#1b1f26;color:inherit;border:1px solid var(--line);border-radius:8px';
  q.opts.forEach((o,i)=>{const op=document.createElement('option');op.value=i;op.textContent=o.t;op.disabled=!!o.dis;se.appendChild(op)});
  const ok=document.createElement('button');ok.textContent='Auswählen';ok.onclick=()=>{closePop(false);answer(+se.value)};sh.appendChild(se);sh.appendChild(ok)}
 else if(q.t=='choice'){setMode(null);pop(q.title,titleSrc(q.who,q.title)+(q.text||'')+(q.blocks?'<br>'+rb(q.blocks):''),q.opts.map((o,i)=>({t:o.t,s:/^\d\. /.test(q.title||'')?o.s:withSrc(q.who,o),dis:o.dis,fn:()=>answer(i)})),false);if(q.bot)$('pop').className='bot'}
 else if(q.t=='info'){setMode(null);pop(q.title,q.text+(q.blocks?'<br>'+rb(q.blocks):''),[{t:q.btn||'Weiter',fn:()=>answer(true)}],false)}
 else if(q.t=='place'){const u=q.u;setMode({t:'place',q,a:(u&&u.a0)||0,zone:null,hint:q.text||'Platzieren'})}
 else if(q.t=='dest'&&!q.adjOnly)setMode({t:'dest',q,u:byId(S,q.u),rng:q.rng,roll:q.roll,chg:q.chg,pile:q.pile,tg:q.tgt,hint:q.chg?'Angriff '+q.roll+' Zoll: Einheit ziehen, grün = möglich':q.pile?'Nachrücken (optional): Einheit ziehen (bis 3 Zoll), grün = möglich, ↺↻ dreht':(q.text?q.text+' – ':'')+'Einheit ziehen: grün = möglich, ↺↻ dreht (jedes Modell bis '+q.rng+' Zoll)',a:0});
 else if(q.t=='tgt')setMode({t:'tgt',q,u:byId(S,q.u),roll:q.roll,hint:'Angriffswurf '+q.roll+': gegnerische Einheit antippen'});
 else if(q.t=='dest'&&q.adjOnly){const u=byId(S,q.u);setMode({t:'adj',kind:'pile',u,allow:q.rng||3,P:q.P0.map(p=>[p[0],p[1]]),orig:abs(u),sel:null,tg:q.tgt,hint:'Modell mit dem Finger ziehen (bis '+(q.rng||3).toFixed(0)+' Zoll) – am Ende „Fertig“',back:null})}
 else if(q.t=='split')splitPop(byId(S,q.u),q.inr.map(i=>byId(S,i)),q.rolls||[]);
 else if(q.t=='fight')setMode({t:'fightsel',q,hint:'Du bist dran: Einheit zum Kämpfen antippen'});
 else setMode(null);
 ui()}
/* ---------- Statuszeile ---------- */
function ui(){if(!G)return;const S=G.S,q=G.req;$('undo').disabled=G.undoIdx()<0;
 $('st').innerHTML=!S.stage?'Vorbereitung vor der Schlacht':`R${S.round}/4 · <b style="color:${COL[S.act]}">${S.P[S.act].n}</b> · ${PH[S.ph]}`;
 {const A=S.K.army;$('mu').innerHTML=A&&A[0]!=null&&A[1]!=null&&ARMY[A[0]]&&ARMY[A[1]]?`<span class="pill"><span style="color:${COL[0]}">${ARMY[A[0]].n}</span> <span style="opacity:.6;font-weight:normal">vs</span> <span style="color:${COL[1]}">${ARMY[A[1]].n}</span></span>`:''}
 $('next').disabled=!(q&&q.t=='act'&&!G.isAI(q.who));
 cardsUi();onceUi();$('vp').innerHTML=`SP <b style="color:${COL[0]}">${S.P[0].vp}</b>:<b style="color:${COL[1]}">${S.P[1].vp}</b>`;
 $('next').textContent=S.ph==6?'Zug beenden ▸':(S.ph==5&&!S.Ph.fs.done?'Kämpfen beginnen ▸':'Weiter ▸')}
$('next').onclick=()=>{const q=G.req;if(q&&q.t=='act')answer({a:'next'})};
$('hy').onclick=()=>{const m=mode;if(!m)return;
 if(m.t=='dest'&&m.chg){const u=m.u;setMode({t:'adj',kind:'charge',u,allow:m.roll,roll:m.roll,P:abs(u).map(q=>[q.x,q.y]),orig:abs(u),sel:null,tg:null,hint:'Modell mit dem Finger ziehen (bis '+m.roll+' Zoll) – am Ende „Fertig“',back:m});return}
 if(m.t=='dest'&&m.pile){const u=m.u;setMode({t:'adj',kind:'pile',u,allow:m.rng||3,P:abs(u).map(q=>[q.x,q.y]),orig:abs(u),sel:null,tg:m.tg,hint:'Modell mit dem Finger ziehen (bis '+(m.rng||3).toFixed(0)+' Zoll) – am Ende „Fertig“',back:m});return}
 if(m.t!='adj')return;const e=m.kind=='pile'?pileModelErr(G.S,m.u,byId(G.S,m.tg),m.P):m.kind=='charge'?chargeModelErr(G.S,m.u,m.P,m.roll):adjErr(G.S,m.u,m.P,m.allow);if(e){note(e);return}answer(m.kind=='pile'||m.kind=='charge'?{P:m.P}:{a:'adj',u:m.u.id,P:m.P})};
$('hx').onclick=()=>{const m=mode;if(!m)return;
 if(m.t=='place'){if(m.q.cancel)answer({cancel:true});return}
 if(m.t=='dest'){answer({stay:true});return}
 if(m.t=='tgt'){answer({cancel:true});return}
 setMode(m.back||null)};
const rot=d=>{const m=mode;if(m&&m.t=='place'&&(m.q.kind=='terr'||m.q.kind=='relic')){m.a=(m.a+d+2*Math.PI)%(2*Math.PI);m.zone=null;if(m.gx!=null)hint(placeErr(G.S,'terr',m.q.who,m.q.u,m.gx,m.gy,m.a)||'Gedreht: '+Math.round(m.a*180/Math.PI)+'° – loslassen zum Platzieren')}};
$('rl').onclick=()=>rot(-Math.PI/12);$('rr').onclick=()=>rot(Math.PI/12);
addEventListener('keydown',e=>{if(e.key=='q'||e.key=='ArrowLeft')rot(-Math.PI/12);if(e.key=='e'||e.key=='ArrowRight')rot(Math.PI/12)});
// Regel-App als Overlay (Spielstand bleibt erhalten)
function rulesApp(){const o=$('rov');if(!o)return;
 fetch('regeln.html',{method:'HEAD'}).then(r=>{if(!r.ok)throw 0;o.innerHTML='<iframe src="regeln.html?embed=1" title="Regeln"></iframe>';o.style.display='block'}).catch(()=>{const m=$('mu');if(m){m.innerHTML='<div class="pill">Regel-App nur in der installierten Version verfügbar</div>';setTimeout(()=>{m.innerHTML=''},2500)}})}
$('info').onclick=rulesApp;
addEventListener('message',e=>{if(e.origin===location.origin&&e.data==='close-rules'){const o=$('rov');if(o){o.style.display='none';o.innerHTML=''}}});
$('menu').onclick=()=>{const S=G.S,q=G.req;
 const can=q&&!G.isAI(q.who)&&(q.t=='act'||q.t=='fight');
 pop('Menü',`<div class="ph">${PH.map((p,i)=>`<span class="${i==S.ph?'on':''}">${p}</span>`).join('')}</div><br>Modus: Du gegen Computer (Testversion)${S.stage?`<br>Angreifer: ${S.P[S.K.att].n} · Taktikkarten: ${S.P[seat].hand.length}`:''}<br><small>Spielstand-Kennung: ${S.seed} · ${G.log.length} Züge protokolliert</small><br><small>Spieler: ${(myName()||'Gast').replace(/[<>&"]/g,'')} · Version: ${relInfo()}</small>`,
 [{t:'Ansicht zurücksetzen',fn:resetView},...(S.stage?[{t:'Meine Taktikkarten ('+S.P[seat].hand.length+')',fn:hand}]:[]),...(can?[{t:'Befehle jetzt',fn:()=>answer({a:'cmdwin'})}]:[]),
  ...(can&&q.t=='act'?globals(S,seat).map(g=>({t:g.t,s:withSrc(seat,g),fn:()=>answer({a:g.k})})):[]),{t:'Name ändern',fn:()=>askName(true)},{t:'Startseite / Statistik',fn:()=>home(()=>start())},{t:'Neues Spiel',fn:()=>start()}])};
const KC=['⚔️','💰','💥','👑','🏃','💀','🎯','🔥','☄️','🔨','🔍','⚖️'],KS=['⚡','💀','⛰️','🏴','🕯️','👻','🦴','🗿','⚰️','↩️','😱','🩸'],KG0=['⚔️','🏴','↔️','⚡','⛰️','👑','🔥','🗿','🐉','🏹','⚔️','🛡️'];
function cardsUi(){const S=G.S,h=S.P[seat].hand,d=$('cards');d.innerHTML='';
 h.forEach(c=>{const b=document.createElement('button');b.className='kc'+(CMD[c]&&CMD[c].ph==S.ph?' on':'');b.textContent=(G.S.K.pack==2?KC:G.S.K.pack==1?KS:KG0)[c-1]||'🂠';b.setAttribute('aria-label',TAC[c-1][0]);
  if(CMD[c]&&CMD[c].ph!=null){const i=document.createElement('i');i.textContent=PH[CMD[c].ph].slice(0,1);b.appendChild(i)}
  b.onclick=()=>pop((G.S.K.pack==2?KC:G.S.K.pack==1?KS:KG0)[c-1]+' '+TAC[c-1][0],TAC[c-1][1]+'<br><br><b>Befehl: '+TAC[c-1][2]+'</b><br>'+TAC[c-1][3],[],true);d.appendChild(b)})}
function onceUi(){const S=G.S,d=$('once');d.innerHTML='';if(!S.stage){document.documentElement.style.setProperty('--oh','0px');return}
 [1-seat,seat].forEach(o=>{const l=battleAbs(S,o);if(!l.length)return;const r=document.createElement('div');r.className='or';
  l.forEach(a=>{const b=document.createElement('button');b.className=(o==seat?'me':'en')+(a.used?' us':a.now===false?' idle':a.now===true?' on':'');b.textContent=a.ic;b.setAttribute('aria-label',a.n);
   b.onclick=()=>pop((o==seat?'Eigene':'Gegnerische')+' Fähigkeit: '+a.n,a.s+(a.u?'<br><br>Einheit: '+a.u:'')+'<br><br>'+(a.st||'<b>'+(a.used?'Bereits eingesetzt (1× pro Schlacht)':a.now===false?'Noch verfügbar (1× pro Schlacht) – jetzt nicht einsetzbar, nur zum oben genannten Zeitpunkt':'Jetzt einsetzbar (1× pro Schlacht)')+'</b>'),[],true);r.appendChild(b)});d.appendChild(r)});
 document.documentElement.style.setProperty('--oh',d.offsetHeight+'px')}
function hand(){const h=G.S.P[seat].hand;pop('Meine Taktikkarten','Taktiken werden am Zugende automatisch geprüft. Befehle auf der Kartenrückseite erscheinen bei Beginn der passenden Phase.',h.map(c=>({t:TAC[c-1][0],s:TAC[c-1][1]+'<br><i>Befehl '+TAC[c-1][2]+': '+TAC[c-1][3]+'</i>',dis:true})))}
/* ---------- Eingabe auf dem Feld ---------- */
// Herkunft einer Option (Taktikkarte, Einheit, Kampfeigenschaft, Regiment, Verbesserung, Gelände …) vor den Kurztext setzen
const withSrc=(o,x,u)=>{const S=G.S;let src='';try{src=x.k&&String(x.k).startsWith('ab:')?abOrigin(S,x.k.slice(3),o,u):originOf(S,o,x.t)}catch(e){}return src?srcTag(src)+(x.s||''):x.s};
const titleSrc=(o,t)=>{let s='';try{s=originOf(G.S,o,t)||(G.src?originOf(G.S,G.co!=null?G.co:o,G.src):'')}catch(e){}return srcTag(s)};
function pick(u){const S=G.S,a=abilities(S,u).filter(x=>x.k!='fight');
 pop(u.name,stat(u)+flagHtml(u),a.length?a.map(x=>({t:x.t,s:withSrc(u.o,x,u),dis:x.dis,fn:()=>useAb(u,x.k)})):[{t:'Keine Fähigkeiten in dieser Phase',dis:true}])}
function useAb(u,k){
 if(k=='move')setMode({t:'move',u,rng:mvRest(G.S,u),a:0,hint:'Einheit ziehen: grün = Zielformation möglich · jedes Modell läuft einzeln (bis '+mvRest(G.S,u).toFixed(1)+' Zoll)',back:null});
 else if(k=='shoot')setMode({t:'shoot',u,hint:'Ziel antippen ('+u.rw[0][1]+' Zoll)'});
 else if(k=='adj')setMode({t:'adj',u,allow:adjAllow(G.S,u),P:abs(u).map(m=>[m.x,m.y]),orig:abs(u),sel:null,hint:'Modell mit dem Finger ziehen und loslassen – am Ende „Fertig“',back:null});
 else answer({a:k,u:u.id})}

// Angriffsverteilung: 2 Ziele Schieber, 3 Dreieck, 4 Viereck, mehr Ziele Schieber je Ziel
function splitWeights(n,x,y){ // x,y in 0..1
 if(n==3){const wb=Math.max(0,Math.min(1,x)),wc=Math.max(0,Math.min(1,y));let a=1-wb-wc;if(a<0){const k=wb+wc;return [0,wb/k,wc/k]}return [a,wb,wc]}
 if(n==4)return [(1-x)*(1-y),x*(1-y),x*y,(1-x)*y];
 return null}
function splitPop(u,inr,rolls){const rh=(rolls||[]).map(r=>`<small>${r.n}: ${r.at} Attacken je Modell</small>${dice(r.v)}`).join(''),tot=(rolls||[]).reduce((a,r)=>a+r.v.reduce((x,y)=>x+y,0),0);
 const sh=(pop('Angriffe verteilen',(rolls&&rolls.length?'<b>Angriffswürfe: '+tot+' Attacken</b>'+rh+'<br>':'')+u.name+': Wie sollen die Attacken auf die Gegner im Nahkampf verteilt werden? Punkt ziehen.',[],false),$('pop').firstChild);
 const n=inr.length,names=inr.map(e=>e.name),cols=['#e0a43c','#6fb7e0','#a77be0','#6fcf6f'];
 let w=inr.map(()=>1/n),pt=n==3?[1/3,1/3]:n==4?[.5,.5]:null;
 const box=document.createElement('div'),pc=document.createElement('div');pc.style.cssText='font-size:13px;line-height:1.5;margin:6px 0';
 const upd=()=>{const ord=inr.map((e,i)=>i).sort((a,b)=>inr[a].id-inr[b].id),cnt=[];let c=0;const W=w.reduce((a,b)=>a+b,0)||1;ord.forEach(i=>{const lo=c/W;c+=w[i];cnt[i]=Math.floor(tot*(c/W)+1e-9)-Math.floor(tot*lo+1e-9)});pc.innerHTML=inr.map((e,i)=>`<span style="color:${cols[i%4]}">●</span> ${e.name}: <b>${Math.round(w[i]*100)} %</b>${tot?' → '+cnt[i]+' Attacken':''}`).join('<br>')};
 if(n==2){const r=document.createElement('input');r.type='range';r.min=0;r.max=100;r.value=50;r.style.cssText='width:100%;margin:10px 0';const lb=document.createElement('div');lb.style.cssText='display:flex;justify-content:space-between;font-size:12px';lb.innerHTML=`<span style="color:${cols[0]}">${names[0]}</span><span style="color:${cols[1]}">${names[1]}</span>`;
  r.oninput=()=>{w=[1-r.value/100,r.value/100];upd()};box.append(lb,r)}
 else if(n==3||n==4){const SZ=220,pad=26,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${SZ+2*pad} ${SZ+2*pad}`);svg.style.cssText='width:100%;max-width:300px;touch-action:none;display:block;margin:6px auto';
  // Eckpunkte: 3 → Dreieck (A oben-links? klassisch), 4 → Quadrat
  const V=n==3?[[pad+SZ/2,pad],[pad,pad+SZ],[pad+SZ,pad+SZ]]:[[pad,pad],[pad+SZ,pad],[pad+SZ,pad+SZ],[pad,pad+SZ]];
  // Gewichte aus Position im Dreieck: Schwerpunktkoordinaten bezüglich V
  const bary=(px,py)=>{const [a,b,c]=V,d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]),l1=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/d,l2=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/d;return [l1,l2,1-l1-l2]};
  let P=n==3?[pad+SZ/2,pad+SZ*2/3]:[pad+SZ/2,pad+SZ/2];
  const poly=document.createElementNS(svg.namespaceURI,'polygon');poly.setAttribute('points',V.map(v=>v.join(',')).join(' '));poly.setAttribute('fill','#ffffff0f');poly.setAttribute('stroke','#fff8');svg.appendChild(poly);
  V.forEach((v,i)=>{const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',v[0]);c.setAttribute('cy',v[1]);c.setAttribute('r',7);c.setAttribute('fill',cols[i]);svg.appendChild(c);
   const t=document.createElementNS(svg.namespaceURI,'text');const mid=pad+SZ/2,an=v[0]<mid-5?'start':v[0]>mid+5?'end':'middle';t.setAttribute('x',v[0]+(an=='start'?-pad+4:an=='end'?pad-4:0));t.setAttribute('y',v[1]+(v[1]<pad+SZ/2?-12:20));t.setAttribute('text-anchor',an);t.setAttribute('font-size','11');t.setAttribute('fill','#ddd');t.textContent=names[i].length>18?names[i].slice(0,17)+'…':names[i];svg.appendChild(t)});
  const dot=document.createElementNS(svg.namespaceURI,'circle');dot.setAttribute('r',11);dot.setAttribute('fill','#ffe27a');dot.setAttribute('stroke','#000');dot.setAttribute('stroke-width',2);svg.appendChild(dot);
  const calc=()=>{if(n==3){const [a,b,c]=bary(P[0],P[1]);w=[a,b,c]}else{const x=(P[0]-pad)/SZ,y=(P[1]-pad)/SZ;w=splitWeights(4,x,y)}dot.setAttribute('cx',P[0]);dot.setAttribute('cy',P[1]);upd()};
  const clampTri=(px,py)=>{let [a,b,c]=bary(px,py);a=Math.max(0,a);b=Math.max(0,b);c=Math.max(0,c);const t=a+b+c;a/=t;b/=t;c/=t;return [a*V[0][0]+b*V[1][0]+c*V[2][0],a*V[0][1]+b*V[1][1]+c*V[2][1]]};
  const mv=e=>{const r=svg.getBoundingClientRect(),k=(SZ+2*pad)/r.width;let px=(e.clientX-r.left)*k,py=(e.clientY-r.top)*k;
   if(n==3)P=clampTri(px,py);else P=[Math.max(pad,Math.min(pad+SZ,px)),Math.max(pad,Math.min(pad+SZ,py))];calc()};
  let dr=false;svg.onpointerdown=e=>{dr=true;svg.setPointerCapture(e.pointerId);mv(e)};svg.onpointermove=e=>{if(dr)mv(e)};svg.onpointerup=()=>dr=false;
  calc();box.appendChild(svg)}
 else{inr.forEach((e,i)=>{const r=document.createElement('input');r.type='range';r.min=0;r.max=100;r.value=Math.round(100/n);r.style.cssText='width:100%';const l=document.createElement('div');l.style.fontSize='12px';l.textContent=e.name;r.oninput=()=>{const raw=[...box.querySelectorAll('input')].map(x=>+x.value),t=raw.reduce((a,b)=>a+b,0)||1;w=raw.map(v=>v/t);upd()};box.append(l,r)})}
 upd();
 const bt=document.createElement('div');bt.style.cssText='display:flex;gap:8px;margin-top:8px';
 const go=document.createElement('button');go.textContent='Kämpfen';go.style.cssText='flex:1;background:var(--gold);color:#1a1405;font-weight:bold';
 const eq=document.createElement('button');eq.textContent='Gleichmäßig';const bk=document.createElement('button');bk.textContent='Zurück';
 go.onclick=()=>{const d={};inr.forEach((e,i)=>{const v=Math.round(w[i]*1000);if(v>0)d[e.id]=v});const ids=Object.keys(d);if(!ids.length)return;const pr=ids.reduce((a,b)=>d[a]>=d[b]?a:b);closePop(false);answer(rolls?{d}:{a:'fight',u:u.id,t:+pr,d})};
 eq.onclick=()=>{closePop(false);splitPop(u,inr,rolls)};bk.onclick=()=>closePop(true);
 if(rolls)bt.append(eq,go);else bt.append(bk,eq,go);sh.append(box,pc,bt)}
const flagHtml=u=>{const f=unitFlags(G.S,u);return f.length?'<br><br><b>Zeitweilige Modifikatoren</b>'+f.map(a=>`<br><span style="color:${a.c=='bad'?'#ff8a7a':'#8fe0a0'}">⚑ ${a.d}</span>`).join(''):''};
function fightPick(u){const S=G.S,q=G.req,ok=q.who==seat&&eligF(S,seat).filter(x=>sfOK(S,x)).includes(u),inr=foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR);
 pop(u.name,stat(u)+flagHtml(u),[{t:'Kämpfen',s:inr.length?'Nahkampfreichweite 3"':'Kein Gegner in Reichweite',dis:!ok||!inr.length,fn:()=>{if(inr.length>=2){answer({a:'fight',u:u.id,t:null,split:1});return}setMode({t:'fightT',u,hint:'Ziel im Nahkampf antippen',back:{t:'fightsel',q,hint:'Du bist dran: Einheit zum Kämpfen antippen'}})}},
  ...abilities(S,u).filter(x=>String(x.k).startsWith('ab:')&&x.k!='ab:bd_leg').map(x=>({t:x.t,s:withSrc(u.o,x,u),dis:x.dis,fn:()=>answer({a:x.k,u:u.id})})),
  ...(ok&&!inr.length?[{t:'Nicht kämpfen',fn:()=>answer({a:'fight',u:u.id,t:null})}]:[])])}
function moveTo(u,x,y,rng,mk,m){if(m&&m.chg){const e=foes(G.S,u).filter(f=>f.x>=0).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-a.r-(Math.hypot(b.x-x,b.y-y)-b.r))[0];if(e&&Math.hypot(e.x-x,e.y-y)-e.r-u.r<=2){const q=chargeSnap(G.S,u,e,Math.atan2(y-e.y,x-e.x),m.q.roll);if(q){x=q.x;y=q.y}}}let dx=x-u.x,dy=y-u.y,d=Math.hypot(dx,dy);if(d>rng){dx*=rng/d;dy*=rng/d}
 const tx=Math.min(W-u.r,Math.max(u.r,u.x+dx)),ty=Math.min(H-u.r,Math.max(u.r,u.y+dy)),e=m&&m.chg?chargeErr(G.S,u,tx,ty,m.q.roll):m&&m.pile?pileErr(G.S,u,byId(G.S,m.tg),tx,ty):moveErr(G.S,u,tx,ty,rng);if(e){note(e);return}answer(mk(tx,ty))}
function adjTap(m,x,y){const S=G.S,u=m.u,N=m.P.map((p,i)=>({x:p[0],y:p[1],a:m.orig[i].a,l:m.orig[i].l,w:m.orig[i].w}));
 const near=N.map((p,i)=>[mDistPt(p,x,y),i]).sort((a,b)=>a[0]-b[0])[0];
 if(near[0]<=.35||m.sel==null){if(near[0]<=1.2){m.sel=near[1];note('Modell gewählt – Zielpunkt antippen (bis '+m.allow.toFixed(1)+' Zoll von der Ausgangsposition)');}else note('Zuerst ein Modell antippen');return}
 return adjPut(m,x,y)}
function adjClamp(m,x,y){const i=m.sel,o=m.orig[i];let dx=x-o.x,dy=y-o.y,d=Math.hypot(dx,dy);if(d>m.allow){dx*=m.allow/d;dy*=m.allow/d}return [o.x+dx,o.y+dy]}
function adjPut(m,x,y){const S=G.S,u=m.u,N=m.P.map((p,i)=>({x:p[0],y:p[1],a:m.orig[i].a,l:m.orig[i].l,w:m.orig[i].w}));
 const i=m.sel,o=m.orig[i];let dx=x-o.x,dy=y-o.y,d=Math.hypot(dx,dy);if(d>m.allow){dx*=m.allow/d;dy*=m.allow/d}
 const c={...N[i],x:o.x+dx,y:o.y+dy};let er='';
 if(c.x<c.l/2||c.x>W-c.l/2||c.y<c.l/2||c.y>H-c.l/2)er='Außerhalb des Spielfelds';
 else if(N.some((p,j)=>j!=i&&mgap(c,p)<0))er='Modelle überlappen';
 else if(S.U.some(v=>v!==u&&v.x>=0&&abs(v).some(q=>mgap(c,q)<0)))er='Nicht auf andere Modelle stellen';
 if(er){note(er);return}
 m.P[i]=[c.x,c.y];N[i]=c;const bad=cohBad(N,m.u.coh);m.sel=null;note(bad.length?'Zusammenhalt noch verletzt ('+bad.length+' Modell'+(bad.length>1?'e':'')+')':'Zusammenhalt in Ordnung – weitere Modelle oder „Fertig“')}
// ---- Einrasten: ungültige Ziel- oder Aufstellpunkte werden auf die nächste gültige Position gesetzt ----
function zoneOf(m){if(!m.zone){const S=G.S;m.zone=[];const st=W<40?.5:1;for(let i=st;i<W;i+=st)for(let j=st;j<H;j+=st)if(!placeErr(S,m.q.kind,m.q.who,m.q.u,i,j,m.a))m.zone.push([i,j]);m.zst=st}return m.zone}
// Aufstellen: nächster Punkt der gültigen Zone (bis 10"), dann per Halbierung so nah wie möglich an den angetippten Punkt
function plSnap(m,x,y){const S=G.S,ok=(a,b)=>!placeErr(S,m.q.kind,m.q.who,m.q.u,a,b,m.a);if(ok(x,y))return [x,y];
 const k=x.toFixed(2)+'/'+y.toFixed(2)+'/'+(m.a||0);if(m.ps&&m.ps.k==k)return m.ps.p;
 const z=zoneOf(m).map(c=>[Math.hypot(c[0]-x,c[1]-y),c]).filter(c=>c[0]<=10).sort((a,b)=>a[0]-b[0]);let p=null;
 for(const [,c] of z.slice(0,8)){if(!ok(c[0],c[1]))continue;let lo=0,hi=1;for(let i=0;i<8;i++){const t=(lo+hi)/2;ok(c[0]+(x-c[0])*t,c[1]+(y-c[1])*t)?lo=t:hi=t}const q=[c[0]+(x-c[0])*lo,c[1]+(y-c[1])*lo];if(!p||Math.hypot(q[0]-x,q[1]-y)<Math.hypot(p[0]-x,p[1]-y))p=q}
 m.ps={k,p};return p}
// Bewegen/Angriff/Nachrücken: Punkte auf der Linie vom Ausgangspunkt und Ringe um den Zielpunkt, nächster gültiger gewinnt
function snapPos(f,x,y,ox,oy,full){const r=f(x,y);if(!r.err)return {r,x,y,snap:0};
 const C=[];if(ox!=null)for(let t=.95;t>.02;t-=full?.05:.12)C.push([ox+(x-ox)*t,oy+(y-oy)*t]);
 if(full)for(const d of [.25,.5,.8,1.2,1.7,2.3,3])for(let k=0;k<12;k++){const a=k*Math.PI/6;C.push([x+Math.cos(a)*d,y+Math.sin(a)*d])}
 C.sort((p,q)=>Math.hypot(p[0]-x,p[1]-y)-Math.hypot(q[0]-x,q[1]-y));
 for(const [a,b] of C){if(a<0||b<0||a>W||b>H)continue;const q=f(a,b);if(!q.err)return {r:q,x:a,y:b,snap:1}}return {r,x,y,snap:0}}
const formF=(m,opt)=>(x,y)=>m.pile?pileForm(G.S,m.u,byId(G.S,m.tg),x,y,m.a||0):m.chg?chargeFormA(G.S,m.u,x,y,m.roll,m.a||0):moveForm(G.S,m.u,x,y,m.rng,m.a||0,opt);
function tap(x,y){if(!G)return;const S=G.S,q=G.req;
 const dm=u=>Math.min(...abs(u).map(m=>mDistPt(m,x,y))),hit=S.U.filter(u=>u.x>=0&&dm(u)<=.9).sort((a,b)=>dm(a)-dm(b))[0];
 const m=mode;
 if(m){
  if(m.t=='place'){const e=placeErr(S,m.q.kind,m.q.who,m.q.u,x,y,m.a);if(e){const p=plSnap(m,x,y);if(!p){note(e);return}[x,y]=p}answer({x,y,a:m.a});return}
  if(m.t=='move'||drg()){const s=snapPos(formF(m,false),x,y,m.u.x,m.u.y,true),r=s.r;if(r.err){note(r.err);return}x=s.x;y=s.y;if(m.pile||m.chg){answer({P:r.P});return}answer(m.t=='move'?{a:'move',u:m.u.id,x,y,rot:m.a||0}:{x,y,rot:m.a||0});return}
  if(m.t=='dest'&&!m.chg&&!m.pile)return;
  if(m.t=='dest')return moveTo(m.u,x,y,m.rng,(tx,ty)=>({x:tx,y:ty}),m);
  if(m.t=='adj')return adjTap(m,x,y);
  if(m.t=='fightsel'){if(hit&&hit.o==seat)fightPick(hit);else if(hit)pop(hit.name,S.P[hit.o].n+'<br>'+stat(hit),[]);return}
  if(!hit||hit.o==seat){note('Gegnerische Einheit antippen');return}
  if(m.t=='shoot'){const a={a:'shoot',u:m.u.id,t:hit.id},e=actCheck(S,seat,a);if(e){note(e);return}answer(a);return}
  if(m.t=='fightT'){if(dist(m.u,hit)>CR){note('Ziel nicht in Nahkampfreichweite');return}answer({a:'fight',u:m.u.id,t:hit.id});return}
  if(m.t=='tgt'){answer({t:hit.id});return}
  return}
 if(hit){if(hit.o==seat&&q&&q.t=='act'&&q.who==seat)pick(hit);else pop(hit.name,S.P[hit.o].n+'<br>'+stat(hit)+flagHtml(hit),[])}}
window.__V={splitPop,ai:aiAnswer,dist,chargeDest,pileDest,chargeSnap,get mode(){return mode},get cam(){return {sc,tx,ty,SC}},tap,get busy(){return busy}};
/* ---------- Kamera ---------- */
const cv=$('c'),cx=cv.getContext('2d');let sc=1,tx=0,ty=0,fit=1,dpr=1;
let lastWH='';function resetView(){fit=Math.min(innerWidth/(W*SC),Math.max(200,innerHeight-110)/(H*SC));sc=fit;clampV()}
function clampV(){const f=(v,b,t)=>b<=v?(v-b)/2:Math.min(0,Math.max(v-b,t));tx=f(innerWidth,W*SC*sc,tx);ty=f(innerHeight,H*SC*sc,ty)}
function resize(){dpr=devicePixelRatio||1;cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;resetView()}
function zoomAt(x,y,k){const n=Math.min(fit*5,Math.max(fit,sc*k));k=n/sc;tx=x-(x-tx)*k;ty=y-(y-ty)*k;sc=n;clampV()}
addEventListener('resize',resize);
cv.onwheel=e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,e.deltaY<0?1.15:1/1.15)};
const ptr=new Map();let pd=0,pa=0;
const plc=()=>mode&&(mode.t=='place'||drg());
function dragHint(m){const r=pvOf(m);hint(r.err?r.err+' – beim Loslassen wird die nächste gültige Position gesucht':r.snap?'Ziel ungültig – Einheit rastet an der nächsten gültigen Stelle ein':'Loslassen zum Bewegen · ↺↻ dreht die Formation')}
// Angriff: ist die gezogene Formation regelwidrig (z. B. Zusammenhalt), berechnet die Automatik eine gültige Formation zum nächsten Gegner
function chargeFormA(S,u,x,y,roll,rot){const r=chargeForm(S,u,x,y,roll,rot);if(!r.err)return r;
 const t=foes(S,u).filter(e=>e.x>=0).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(!t)return r;
 const ck=u.id+'|'+t.id+'|'+roll;if(!pcache.has(ck)){let P=null;for(const k of ['reach','wrap']){const q=chargePlan(S,u,t,roll,k);if(q.P&&!chargeModelErr(S,u,q.P,roll)){P=q.P;break}}pcache.set(ck,P)}
 const P=pcache.get(ck);return P?{P,err:''}:r}
function pvOf(m){const k=m.gx.toFixed(2)+'/'+m.gy.toFixed(2)+'/'+(m.a||0).toFixed(3);if(!m.pv||m.pv.k!=k){const s=snapPos(formF(m,true),m.gx,m.gy,m.u.x,m.u.y,false);m.pv={k,...s.r,snap:s.snap}}return m.pv}
function gh(e){const m=mode;m.gx=(e.clientX-tx)/sc/SC;m.gy=(e.clientY-(e.pointerType=='touch'?70:0)-ty)/sc/SC;if(drg()){dragHint(m);return}const er=placeErr(G.S,m.q.kind,m.q.who,m.q.u,m.gx,m.gy,m.a);hint(!er?'Loslassen zum Platzieren':plSnap(m,m.gx,m.gy)?'Rastet an der nächsten gültigen Stelle ein ('+er+')':er)}
const adjXY=e=>[(e.clientX-tx)/sc/SC,(e.clientY-(e.pointerType=='touch'?60:0)-ty)/sc/SC];
cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);if(mode&&mode.t=='adj'&&!ptr.size){const m=mode,[x,y]=adjXY(e),[ox,oy]=[(e.clientX-tx)/sc/SC,(e.clientY-ty)/sc/SC],N=m.P.map((p,i)=>({x:p[0],y:p[1],a:m.orig[i].a,l:m.orig[i].l,w:m.orig[i].w})),near=N.map((p,i)=>[mDistPt(p,ox,oy),i]).sort((a,b)=>a[0]-b[0])[0];if(near[0]<=1.2){m.sel=near[1];m.drg=1;m.keep=m.P[near[1]].slice();m.P[near[1]]=adjClamp(m,x,y);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,m:true,adj:1});note('Ziehen und loslassen – bis '+m.allow.toFixed(1)+' Zoll');return}}
 if(plc())gh(e);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,m:false});if(ptr.size==2){const[a,b]=[...ptr.values()];pd=Math.hypot(a.x-b.x,a.y-b.y);pa=Math.atan2(b.y-a.y,b.x-a.x)}};
cv.onpointermove=e=>{const p=ptr.get(e.pointerId);if(p&&p.adj&&mode&&mode.drg){const[x,y]=adjXY(e);mode.P[mode.sel]=adjClamp(mode,x,y);return}if(plc()&&ptr.size<2){gh(e);if(p){p.x=e.clientX;p.y=e.clientY}return}if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.sx,p.y-p.sy)>8)p.m=true;
 if(ptr.size==1&&p.m){tx+=dx;ty+=dy;clampV()}
 else if(ptr.size==2&&mode&&mode.t=='place'&&(mode.q.kind=='terr'||mode.q.kind=='relic')){const[a,b]=[...ptr.values()],an=Math.atan2(b.y-a.y,b.x-a.x);let da=an-pa;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;pa=an;rot(da);a.m=b.m=true}
 else if(ptr.size==2){const[a,b]=[...ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y);zoomAt((a.x+b.x)/2,(a.y+b.y)/2,d/pd);pd=d;a.m=b.m=true}};
cv.onpointerup=e=>{const p=ptr.get(e.pointerId);ptr.delete(e.pointerId);if(p&&p.adj&&mode&&mode.drg){const m=mode,[x,y]=adjXY(e),k=m.keep;m.drg=0;m.P[m.sel]=k;adjPut(m,x,y);return}if(p&&!p.m&&!ptr.size){if(plc()&&mode.gx!=null)tap(mode.gx,mode.gy);else tap((e.clientX-tx)/sc/SC,(e.clientY-ty)/sc/SC)}};
cv.onpointercancel=e=>ptr.delete(e.pointerId);
/* ---------- Zeichnen ---------- */
function txt(t,x,y,sz,col,al='center'){cx.save();cx.scale(1/SC,1/SC);cx.font=`bold ${sz}px Georgia`;cx.fillStyle=col;cx.textAlign=al;cx.textBaseline='middle';cx.fillText(t,x*SC,y*SC);cx.restore()}
const dash=(a=[.3,.3])=>cx.setLineDash(a),solid=()=>cx.setLineDash([]);
function rectPath(t){cx.save();cx.translate(t.x,t.y);cx.rotate(t.a||0);cx.beginPath();cx.rect(-t.w/2,-t.h/2,t.w,t.h);cx.restore()}
function draw(t){
 if(lastWH!=W+'x'+H){lastWH=W+'x'+H;resetView()}
 cx.setTransform(dpr*sc*SC,0,0,dpr*sc*SC,dpr*tx,dpr*ty);cx.clearRect(-50,-50,W+100,H+100);if(!G)return;
 const S=G.S,K=S.K,q=G.req,sb=K.pack>=1,ca=K.pack==2;
 cx.drawImage(ground(K,W,H),0,0,W,H);
 const oA=K.terr[0]==0?0:1,pa=K.map?(K.dg?[[0,0],[W,0],[W,H]]:[[0,0],[W,0],[0,H]]):[[0,0],[W,0],[W,H/2],[0,H/2]],pb=K.map?(K.dg?[[0,0],[W,H],[0,H]]:[[W,0],[W,H],[0,H]]):[[0,H/2],[W,H/2],[W,H],[0,H]];
 [[pa,oA],[pb,1-oA]].forEach(([p,o])=>{cx.beginPath();p.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1]));cx.closePath();cx.fillStyle=COL[o]+'1f';cx.fill()});
 cx.strokeStyle='#ffffff0d';cx.lineWidth=.03;for(let i=0;i<=W;i++){cx.beginPath();cx.moveTo(i,0);cx.lineTo(i,H);cx.stroke()}for(let j=0;j<=H;j++){cx.beginPath();cx.moveTo(0,j);cx.lineTo(W,j);cx.stroke()}
 cx.save();cx.beginPath();cx.rect(0,0,W,H);cx.clip();cx.lineWidth=.08;const hn=Math.hypot(1/W,1/H),dl=Math.hypot(W,H);
 (S.stage?[0]:[0,6,-6]).forEach(d=>{dash(d?[.2,.3]:[.4,.4]);cx.strokeStyle=d?'#ffffff30':'#ffffff60';const c=d*hn,p=K.map?(K.dg?[W*(1-c)/2,H*(1+c)/2]:[W*(1+c)/2,H*(1+c)/2]):[0,H/2+d],v=K.map?[W/dl*200,(K.dg?1:-1)*H/dl*200]:[W,0];cx.beginPath();cx.moveTo(p[0]-v[0],p[1]-v[1]);cx.lineTo(p[0]+v[0],p[1]+v[1]);cx.stroke()});cx.restore();solid();
 if(S.roads&&!photoOf(K)){cx.fillStyle='#00000030';cx.strokeStyle='#c8b89a33';cx.lineWidth=.06;S.roads.forEach(r=>{if(r.r){cx.beginPath();cx.arc(r.x,r.y,r.r,0,7)}else rectPath(r);cx.fill();cx.stroke()})}
 S.ter.forEach(r=>{if(r.rel){rectPath(r);cx.fillStyle='#8a5a2a';cx.fill();cx.strokeStyle='#ffcf7a';cx.lineWidth=.12;cx.stroke();txt('◆ '+r.rel,r.x,r.y-r.h/2-.5,9,'#ffd890');return}if(r.k=='obsc'){rectPath({...r,w:r.w+2,h:r.h+2});cx.setLineDash([.2,.25]);cx.strokeStyle='#d9c7a066';cx.lineWidth=.06;cx.stroke();cx.setLineDash([])}drawTerrain(cx,r,K);txt(r.nm?r.nm+' '+r.ht+'"':(r.k=='obsc'?'Sichtblocker':r.k=='area'?'Gebiet':'Hindernis')+' '+r.ht+'"',r.x,r.y,r.nm?8:10,'#ffffffa0')});
 S.obj.forEach((p,k)=>{const col=S.oc[k]>=0?COL[S.oc[k]]:'#d2a94a';cx.beginPath();if(p.length>3)rectPath(objR(p));else cx.arc(p[0],p[1],OR(p),0,7);cx.fillStyle=col+(S.fort&&S.fort.includes(k)?'55':photoOf(K)?'1a':'33');cx.fill();cx.strokeStyle=col;cx.lineWidth=.12;cx.stroke();
  cx.beginPath();cx.arc(p[0],p[1],.79,0,7);dash([.2,.3]);cx.lineWidth=.05;cx.stroke();solid()});
 S.obj.forEach((p,k)=>{if(!photoOf(K))drawObjective(cx,p,K,S.oc[k]>=0?COL[S.oc[k]]:'#d2a94a');txt(ONM(S)[k],p[0],p[1],11,'#fff');if([...(S.TW.obj||[]),...(S.TW.cb?[S.TW.cb[0]]:[]),...(S.TW.dk!=null?[S.TW.dk]:[])].includes(k)){cx.beginPath();cx.arc(p[0],p[1],1.6,0,7);cx.strokeStyle='#ffb04a';cx.lineWidth=.15;cx.stroke();txt(TWL[S.TW.id]||'Wendung',p[0],p[1]+2.4,11,'#ffb04a')}});
 const m=mode;
 if(drg()&&m.gx!=null){const pv=pvOf(m),col=pv.err?'#e0603c':'#6fcf6f',A0=abs(m.u);cx.fillStyle=col+'66';cx.strokeStyle=col;cx.lineWidth=.1;
  const c=Math.cos(m.a||0),s=Math.sin(m.a||0),P=pv.P||m.u.M.map(o=>[m.gx+o.dx*c-o.dy*s,m.gy+o.dx*s+o.dy*c]);
  cx.strokeStyle='#ffffff55';cx.lineWidth=.04;A0.forEach((q,i)=>{cx.beginPath();cx.moveTo(q.x,q.y);cx.lineTo(P[i][0],P[i][1]);cx.stroke()});cx.strokeStyle=col;cx.lineWidth=.1;
  P.forEach((p,i)=>{const q=A0[i];cx.save();cx.translate(p[0],p[1]);cx.rotate(q.a+(m.a||0));cx.beginPath();cx.ellipse(0,0,q.l/2,q.w/2,0,0,7);cx.restore();cx.fill();cx.stroke()})}
 if(plc()&&m.t=='place'){zoneOf(m);
  cx.fillStyle='#6fcf6f26';m.zone.forEach(c=>cx.fillRect(c[0]-m.zst/2,c[1]-m.zst/2,m.zst,m.zst));
  if(m.gx!=null){const er0=placeErr(S,m.q.kind,m.q.who,m.q.u,m.gx,m.gy,m.a),sp=er0?plSnap(m,m.gx,m.gy):null,er=er0&&!sp,gx=sp?sp[0]:m.gx,gy=sp?sp[1]:m.gy,col=er?'#e0603c':'#6fcf6f';
   if(sp){cx.strokeStyle='#ffffff88';cx.lineWidth=.05;dash([.15,.15]);cx.beginPath();cx.moveTo(m.gx,m.gy);cx.lineTo(gx,gy);cx.stroke();solid()}
   cx.fillStyle=col+'66';cx.strokeStyle=col;cx.lineWidth=.1;
   if(m.q.kind=='terr'||m.q.kind=='icon'||m.q.kind=='relic'){const [w,h]=m.q.u.w?[m.q.u.w,m.q.u.h]:TERSZ[m.q.u.big?'big':'small'];rectPath({x:gx,y:gy,w,h,a:m.a});cx.fill();cx.stroke()}else{(m.q.kind=='rsv'&&rsvForm(m.q.u,gx,gy)||m.q.kind=='dep'&&depForm(G.S,m.q.who,m.q.u,gx,gy)||abs({...m.q.u,x:gx,y:gy})).forEach(q=>{cx.save();cx.translate(q.x,q.y);cx.rotate(q.a);cx.beginPath();cx.ellipse(0,0,q.l/2,q.w/2,0,0,7);cx.restore();cx.fill();cx.stroke()})}}}
 const ru=m&&m.u;
 if(m&&(m.t=='move'||m.t=='dest')){const ex=m.chg?.5:CR;cx.fillStyle='#e0603c1c';foes(S,ru).filter(e=>e.x>=0).forEach(e=>abs(e).forEach(q=>{cx.save();cx.translate(q.x,q.y);cx.rotate(q.a);cx.beginPath();cx.ellipse(0,0,q.l/2+ex,q.w/2+ex,0,0,7);cx.restore();cx.fill()}));
  cx.beginPath();cx.arc(ru.x,ru.y,m.rng,0,7);cx.fillStyle='#ffffff14';cx.fill();cx.strokeStyle='#fff';cx.lineWidth=.08;dash();cx.stroke();solid()}
 if(rings){const u=byId(S,rings.u);if(u&&u.x>=0){cx.fillStyle='#ffe27a14';cx.strokeStyle='#ffe27acc';cx.lineWidth=.06;dash([.2,.25]);abs(u).forEach(q=>{cx.beginPath();cx.arc(q.x,q.y,rings.allow+q.w/2,0,7);cx.fill();cx.stroke()});solid()}}
 if(m&&m.t=='adj'&&!m.kind){cx.strokeStyle='#ffe27a88';cx.lineWidth=.05;dash([.2,.25]);m.orig.forEach(o=>{cx.beginPath();cx.arc(o.x,o.y,m.allow+o.w/2,0,7);cx.stroke()});solid()}
 if(m&&m.t=='adj'){m.orig.forEach((o,i)=>{cx.save();cx.translate(o.x,o.y);cx.rotate(o.a);cx.beginPath();cx.ellipse(0,0,o.l/2,o.w/2,0,0,7);cx.restore();cx.setLineDash([.15,.15]);cx.strokeStyle='#fff8';cx.lineWidth=.05;cx.stroke();cx.setLineDash([])});
  const N=m.P.map((p,i)=>({x:p[0],y:p[1],a:m.orig[i].a,l:m.orig[i].l,w:m.orig[i].w})),bad=cohBad(N,m.u.coh);N.forEach((q,i)=>{cx.save();cx.translate(q.x,q.y);cx.rotate(q.a);cx.beginPath();cx.ellipse(0,0,q.l/2,q.w/2,0,0,7);cx.restore();cx.fillStyle=bad.includes(i)?'#e0603c88':'#6fcf6f77';cx.fill();cx.lineWidth=i==m.sel?.14:.06;cx.strokeStyle=i==m.sel?'#ffe27a':'#fff';cx.stroke()});
  if(m.sel!=null){const o=m.orig[m.sel];cx.beginPath();cx.arc(o.x,o.y,m.allow,0,7);cx.strokeStyle='#ffe27a';cx.lineWidth=.07;dash();cx.stroke();solid()}}
 if(m&&m.t=='tgt'){cx.beginPath();cx.arc(ru.x,ru.y,m.roll,0,7);cx.strokeStyle='#ffb04a';cx.lineWidth=.08;dash();cx.stroke();solid()}
 if(m&&m.t=='shoot'){cx.beginPath();cx.arc(ru.x,ru.y,rngOf(S,ru,ru.rw[0][1])+ru.r,0,7);cx.strokeStyle='#ffd24a';cx.lineWidth=.08;cx.stroke()}
 if(m&&m.t=='fightT'){cx.beginPath();cx.arc(ru.x,ru.y,CR+ru.r,0,7);cx.strokeStyle='#e0603c';cx.lineWidth=.08;dash();cx.stroke();solid()}
 const mineAct=q&&!G.isAI(q.who)&&q.who==seat;
 S.U.forEach(u=>{if(u.x<0)return;const c=COL[u.o];
  const ready=mineAct&&u.o==seat&&(q.t=='act'?(S.ph>0&&S.ph<6&&abilities(S,u).some(a=>!a.dis&&a.k!='fight')):(q.t=='fight'&&eligF(S,seat).filter(x=>sfOK(S,x)).includes(u)));
  const P=abs(u),cap=m=>{cx.save();cx.translate(m.x,m.y);cx.rotate(m.a);cx.beginPath();cx.ellipse(0,0,m.l/2,m.w/2,0,0,7);cx.restore()};
  const hero=/Held/.test(u.kw)||u.gen;P.forEach(m=>drawToken(cx,m,u,c,S.K.army[u.o],hero,ready,t));
  flagsDraw(u,P)
  const bw=Math.max(1.6,u.r*1.6),by=Math.max(...P.map(m=>m.y+m.l/2))+.2;cx.fillStyle='#000a';cx.fillRect(u.x-bw/2,by,bw,.32);cx.fillStyle=wnd(u)/mx(u)>.4?'#6fcf6f':'#e0603c';cx.fillRect(u.x-bw/2,by,bw*wnd(u)/mx(u),.32)})}
function flagsDraw(u,P){const f=unitFlags(G.S,u);if(!f.length)return;const top=Math.min(...P.map(m=>m.y-m.l/2))-.15,show=f.slice(0,4);
 cx.save();cx.scale(1/SC,1/SC);cx.font='bold 9px system-ui';cx.textBaseline='middle';cx.textAlign='left';
 const hh=11,ws=show.map(a=>cx.measureText('⚑ '+a.t).width+8),ox=u.x*SC;show.forEach((a,i)=>{const w=ws[i],y=top*SC-(i+1)*(hh+2)+hh/2;cx.fillStyle=a.c=='bad'?'#a8322ccc':'#2f7d46cc';cx.beginPath();cx.roundRect(ox-w/2,y-hh/2,w,hh,3);cx.fill();cx.fillStyle='#fff';cx.fillText('⚑ '+a.t,ox-w/2+4,y+.5)});
 if(f.length>4){cx.fillStyle='#000a';cx.fillText('+'+(f.length-4),ox+ws[0]/2+3,top*SC-hh/2-2)}cx.restore()}
function loop(t){draw(t);requestAnimationFrame(loop)}
$('undo').onclick=()=>{if(!G||busy||popOpen())return;const n=G.undoIdx();if(n<0)return;const seed0=G.seed,ctl=G.ctl,lg=G.log.slice(0,n);
 try{clearTimeout(timer);const g=Game.replay(seed0,ctl,flow,lg);g.events.length=0;G=g;window.__G=G;busy=false;mode=null;rings=null;offer=null;closePop(false);note('Aktion zurückgesetzt');pump()}catch(e){console.error(e);note('Rückgängig nicht möglich')}};
function start(seed){clearTimeout(timer);busy=false;mode=null;closePop(false);$('dice').style.display='none';
 G=new Game(seed||((Math.random()*2**32)>>>0),['h','ai']).start(flow);window.__G=G;pump()}
resize();start();home(()=>{});askName();requestAnimationFrame(loop);
