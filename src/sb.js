// Battlepack „Sand and Bone“: Taktikkarten (Bedingungen + Befehle), Wendungen, Geländefähigkeiten
import {W,H,into,tdist,OR} from './geom.js';
import {d6,d3,add,has} from './util.js';
import {fxL,addFx,usedKey,useKey} from './fx.js';
import {mkUnit} from './state.js';
import {abs} from './models.js';
import {ask} from './game.js';
import {myU,foes,inCombat,wnd,mx,isHero,ct,cvOf,hurt,place,canHeal,applyMove,lt,terrOwn,ONM} from './rules.js';
import {destReq,doCharge,doRetreat,razeOK,whollyT} from './cards.js';

const pickU=(G,s,t,l)=>ask(G,s,t,l.map(x=>[x.name+' ('+wnd(x)+'/'+mx(x)+')',x]));
const nameIdx=(S,n)=>S.on?S.on.indexOf(n):-1;
const R=S=>({r0:S.round,exp:'rnd'});
// Geländekontrolle: Einheiten innerhalb von 3 Zoll, nach Kontrollwert
export function terrCtl(S,t){const cs=[0,0];S.U.forEach(u=>{if(u.x>=0&&tdist(u,t)<=3)cs[u.o]+=cvOf(S,u)});return cs[0]>cs[1]?0:cs[1]>cs[0]?1:-1}
const whollyTerr=(S,o,p)=>into(S,o,p[0],p[1])>=OR(p);

export const SBCH={
 1:(S,o)=>S.T.sl[o]>0&&S.T.sl[1-o]>0,
 2:(S,o)=>S.D[1-o]>0&&S.D[1-o]>S.D[o],
 3:(S,o)=>{const t=lt(S,o);return !!t&&terrCtl(S,t)===o},
 4:(S,o)=>razeOK(S,o),
 5:(S,o)=>S.obj.some((p,k)=>S.oc[k]===o&&!['Blood','Necropolis'].includes(S.on[k])&&!whollyTerr(S,o,p)),
 6:(S,o)=>S.obj.filter((p,k)=>S.ocs[k]===1-o&&S.oc[k]===o).length>=2,
 7:(S,o)=>myU(S,o).some(u=>has(S.T.fought,u.id)&&!S.obj.some(p=>ct(u,p))),
 8:(S,o)=>S.obj.some((p,k)=>S.ocs[k]===1-o&&S.oc[k]===o&&!S.U.some(u=>ct(u,p)&&has(S.T.fought,u.id))),
 9:(S,o)=>S.oc[nameIdx(S,'Necropolis')]===o,
 10:(S,o)=>S.obj.filter((p,k)=>S.oc[k]===o&&!whollyTerr(S,o,p)).length>=2,
 11:(S,o)=>myU(S,o).some(u=>whollyT(S,1-o,u)&&!inCombat(S,u)),
 12:(S,o)=>S.oc[nameIdx(S,'Blood')]===o};

export const SBCMD={1:{ph:4,w:'opp'},2:{ph:6,w:'any'},3:{ph:5,w:'any'},4:{ph:4,w:'any'},5:{ph:1,w:'own'},6:{r:'atk'},7:{ph:1,w:'own'},8:{ph:1,w:'any'},9:{ph:5,w:'any'},10:{ph:2,w:'opp'},11:{ph:4,w:'any'},12:{ph:5,w:'opp'}};
export const SBCR2={6:(S,e)=>add(S.Ph.tfl,e.id)};

const repl=(S,s)=>S.GY.filter(g=>g.o==s&&!g.rp&&!g.repl);
const contested=(S,h)=>S.obj.filter(p=>ct(h,p)&&S.U.some(e=>e.o!=h.o&&e.x>=0&&ct(e,p)));
export function SBOK(S,s,c){const my=myU(S,s);
 switch(c){
  case 1:return my.some(x=>!inCombat(S,x)&&foes(S,x).some(e=>e.x>=0&&Math.hypot(e.x-x.x,e.y-x.y)<=16));
  case 2:case 3:case 11:return my.some(x=>inCombat(S,x));
  case 4:return my.some(x=>!inCombat(S,x));
  case 5:return repl(S,s).length>0;
  case 7:return my.some(h=>isHero(h)&&contested(S,h).length>0);
  case 8:return S.ter.some(t=>terrOwn(S,t)==s&&!t.my);
  case 9:case 12:return my.length>0;
  case 10:return my.length>0;
  default:return true}}

export const SBCE={
 1:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Counter-Charge: Einheit wählen',myU(S,s).filter(x=>!inCombat(S,x)));if(x)yield* doCharge(G,x)},
 2:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Speed of Death: Einheit wählen',myU(S,s).filter(x=>inCombat(S,x)));if(!x)return;
  const ox=x.x,oy=x.y;x.x=-99;const a=yield* place(G,s,'rein',x,'Speed of Death','Aufstellen: mehr als 6 Zoll von allen Gegnern');if(a&&a.x!=null){x.x=a.x;x.y=a.y;G.note('Speed of Death: '+x.name+' neu aufgestellt')}else{x.x=ox;x.y=oy}},
 3:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Frantic Scramble: Einheit wählen',myU(S,s).filter(x=>inCombat(S,x)));if(!x)return;
  S.cmb=true;try{const a=yield* destReq(G,x,3,{text:'Frantic Scramble (bis 3 Zoll, auch in den Nahkampf)'});if(!a.stay){applyMove(S,x,a,3);add(S.T.moved,x.id)}}finally{S.cmb=false}},
 4:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Determined Effort: Einheit wählen',myU(S,s).filter(x=>!inCombat(S,x)));if(!x)return;const r=d3(S);addFx(S,{k:'chg',u:x.id,v:r,exp:'turn'});G.tray('Determined Effort',[{k:'row',l:'W3',v:[r]},{k:'txt',s:x.name+': +'+r+' auf Angriffswürfe bis Zugende'}])},
 5:function*(G,s){const S=G.S,g=yield* ask(G,s,'Final Breath: Einheit wählen',repl(S,s).map(g=>[g.name,g]));if(!g)return;g.rp=1;
  const k=g.wm>4?1:Math.max(1,Math.floor(4/g.wm)),q=Object.assign(mkUnit(g.dn,s,S.NID++,k),{rp:1,repl:1});if(g.wm>4)q.dmg=g.wm-4;
  const a=yield* place(G,s,'rein',q,'Final Breath','Aufstellen: mehr als 6 Zoll von allen Gegnern');q.x=a.x;q.y=a.y;S.U.push(q);G.note('Final Breath: '+q.name+' ('+k+' Modell'+(k>1?'e':'')+') aufgestellt')},
 7:function*(G,s){const S=G.S,h=yield* pickU(G,s,'Aura of Ending: Held wählen',myU(S,s).filter(x=>isHero(x)&&contested(S,x).length));if(!h)return;
  const p=contested(S,h)[0],es=S.U.filter(e=>e.o!=s&&e.x>=0&&ct(e,p));
  for(const e of es){const r=d6(S);G.tray('Aura of Ending: '+e.name,[{k:'row',l:'4+ → 2 tödlicher Schaden',v:[r],th:4}]);if(r>=4)hurt(G,e,2)}},
 8:function*(G,s){const S=G.S,l=S.ter.filter(t=>terrOwn(S,t)==s&&!t.my);if(!l.length)return;
  const t=yield* ask(G,s,'Monument of Living Bone: Gelände wählen',l.map(t=>[t.nm+' ('+t.x.toFixed(0)+'|'+t.y.toFixed(0)+')',t]));if(!t||S.mon)return;
  S.obj.push([t.x,t.y,3.5]);S.oc.push(-1);S.ocs.push(-1);S.on.push('Monument');S.mon=1;G.note('Monument of Living Bone: '+t.nm+' zählt bis Zugende als Ziel')},
 9:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Grind Them to Dust: Einheit wählen',myU(S,s).filter(x=>!has(S.T.fought,x.id)&&!has(S.T.dbl,x.id)));if(!x)return;add(S.T.dbl,x.id);add(S.T.dm,x.id);G.note('Grind Them to Dust: '+x.name+' kämpft zweimal (danach W3 tödlicher Schaden, zuletzt)')},
 10:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Re-form the Line!: Einheit wählen',myU(S,s));if(!x)return;
  if(inCombat(S,x)){yield* doRetreat(G,x);return}
  if(x.n<x.nmax&&canHeal(S,x)){const m=x.nmax-x.n,rs=[];for(let i=0;i<m;i++)rs.push(d6(S));const b=rs.filter(v=>v>=5).length;x.n=Math.min(x.nmax,x.n+b);G.tray('Re-form the Line!',[{k:'row',l:b+' Modell(e) zurück (5+)',v:rs,th:5}])}
  else if(x.dmg>0&&canHeal(S,x)){const rs=[];for(let i=0;i<x.dmg;i++)rs.push(d6(S));const b=rs.filter(v=>v>=5).length;x.dmg=Math.max(0,x.dmg-b);G.tray('Re-form the Line!',[{k:'row',l:b+' Schaden geheilt (5+)',v:rs,th:5}])}},
 11:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Terrifying Assault: eigene Einheit wählen',myU(S,s).filter(x=>inCombat(S,x)));if(!x)return;
  const e=yield* ask(G,s,'Feindliche Einheit im Nahkampf',foes(S,x).filter(e=>e.x>=0&&inCombat(S,e)&&Math.hypot(e.x-x.x,e.y-x.y)<=x.r+e.r+4).map(e=>[e.name,e]));if(!e)return;
  const r=d6(S);addFx(S,{k:'ctl',u:e.id,v:-r,exp:'turn'});G.tray('Terrifying Assault',[{k:'row',l:'Kontrollwert von '+e.name+' −'+r,v:[r]}])},
 12:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Unleash Bloodlust: Einheit wählen',myU(S,s));if(!x)return;addFx(S,{k:'att',u:x.id,v:1,exp:'turn'});addFx(S,{k:'ctlmax',u:x.id,v:1,...R(S)});G.note('Unleash Bloodlust: '+x.name+' +1 Attacke, max. Kontrollwert 1 bis Rundenende')}};

// ---- Geländefähigkeiten (Heer, 1× pro Zug) ----
const und=(S,s)=>S.ud===s?1:0;
export function terrAbil(S,s){const L=[];
 const cr=S.ter.find(t=>t.my=='crypt'),ic=S.ter.find(t=>t.my=='icon');
 if(S.ph==5&&cr&&!usedKey(S,s+':crypt','turn')&&myU(S,s).some(x=>tdist(x,cr)<=6))L.push({t:'Crypt of Blood: Unholy Draught',s:'Einheit im Umkreis von 6": W6 (+1 als Außenseiter) – 4+: +1 auf Trefferwürfe im Nahkampf, sonst W3 tödlicher Schaden',run:function*(G){const x=yield* pickU(G,s,'Unholy Draught: Einheit wählen',myU(S,s).filter(x=>tdist(x,cr)<=6));if(!x)return;useKey(S,s+':crypt','turn');
   const r=d6(S),t=r+und(S,s);G.tray('Unholy Draught',[{k:'row',l:'W6'+(und(S,s)?' +1 (Außenseiter)':'')+' = '+t+' (4+)',v:[r],th:4}]);if(t>=4){addFx(S,{k:'hit',u:x.id,v:1,exp:'turn'});G.note(x.name+': +1 auf Trefferwürfe im Nahkampf bis Zugende')}else{const d=d3(S);G.note(x.name+' erleidet '+d+' tödlichen Schaden');hurt(G,x,d)}}});
 if(S.ph==6&&ic&&!usedKey(S,s+':icon','turn')&&myU(S,s).some(x=>tdist(x,ic)<=6))L.push({t:'Icon of Nulahmia: Veiled Promises',s:'Einheit im Umkreis von 6": W6 (+1 als Außenseiter) – 4+: Kontrollwert +3, sonst −3 bis Zugende',run:function*(G){const x=yield* pickU(G,s,'Veiled Promises: Einheit wählen',myU(S,s).filter(x=>tdist(x,ic)<=6));if(!x)return;useKey(S,s+':icon','turn');
   const r=d6(S),t=r+und(S,s),v=t>=4?3:-3;G.tray('Veiled Promises',[{k:'row',l:'W6'+(und(S,s)?' +1 (Außenseiter)':'')+' = '+t+' (4+)',v:[r],th:4}]);addFx(S,{k:'ctl',u:x.id,v,exp:'turn'});G.note(x.name+': Kontrollwert '+(v>0?'+3':'−3')+' bis Zugende')}});
 return L}

// ---- Wendungskarten ----
const tn=(t,i)=>t.nm||('Gelände '+(i+1));
export function* sbAp(G,u,key,{A,who,un,ob,lg}){const S=G.S,TW=S.TW;TW.ud=u;
 const ter=ex=>S.ter.map((t,i)=>[tn(t,i)+' ('+t.x.toFixed(0)+'|'+t.y.toFixed(0)+')',i]).filter(o=>o[1]!==ex),act=S.act;
 if(key=='og'){TW.obj=[yield* A(G,who(),'Overpowering Grief: Ziel wählen',ob())]}
 else if(key=='ds'){const p=who();TW.dkO=p;TW.dk=yield* A(G,p,'Darkened Skies: Ziel wählen',ob())}
 else if(key=='hl'){const p=who(),q={big:false,name:'Icon of Nulahmia',w:2,h:2,k:'obst',ht:4,my:'icon',nm:'Icon of Nulahmia'};
  const a=yield* place(G,p,'icon',q,'Icon of Nulahmia','Mittelpunkt antippen (mehr als 3" von Gelände und Einheiten, nicht auf einem Ziel)');
  const t={x:a.x,y:a.y,w:2,h:2,a:a.a||0,big:false,k:'obst',ht:4,my:'icon',nm:'Icon of Nulahmia'};S.ter.push(t);TW.icon=t;lg.push('Icon of Nulahmia aufgestellt ('+a.x.toFixed(1)+'|'+a.y.toFixed(1)+')')}
 else if(key=='dc'){
  if(u>=0){const k=yield* A(G,u,'Ziel 1 von 2',ob());TW.obj=[k];TW.obj.push(yield* A(G,u,'Ziel 2 von 2',ob(k)))}
  else{const k=yield* A(G,act,'Dein Ziel wählen',ob());TW.obj=[k];TW.obj.push(yield* A(G,1-act,'Dein Ziel wählen',ob(k)))}}
 else if(key=='ss'){
  if(u>=0){const k=yield* A(G,u,'Gelände 1 von 2',ter());TW.tf=[k];TW.tf.push(yield* A(G,u,'Gelände 2 von 2',ter(k)));TW.ssU=yield* A(G,u,'Einheit mit Rettungswurf 5+ wählen',un(u))}
  else{const k=yield* A(G,act,'Dein Gelände wählen',ter());TW.tf=[k];TW.tf.push(yield* A(G,1-act,'Dein Gelände wählen',ter(k)))}}
 else if(key=='ir'){const p=who(),e=yield* A(G,p,'Invincible Redoubts',[['Precision Strike (eigene Einheit kämpft zuerst im eigenen Gebiet)',0],['Dissent in the Ranks (feindliche Einheit kämpft zuletzt in deinem Gebiet)',1]]);
  const id=yield* A(G,p,e?'Feindliche Einheit wählen':'Eigene Einheit wählen',un(e?1-p:p));
  if(id!=null)addFx(S,{k:e?'last':'first',u:id,cond:'terr',t:p,r0:S.round,exp:'rnd'})}
 else if(key=='cb'){const p=who();TW.cb=[yield* A(G,p,'Co-ordinated Bombardment: Ziel wählen',ob()),p]}
 else if(key=='wn'){const p=who(),e=yield* A(G,p,'Will of the Necropolis',[['Adaptable Defence (eigene Einheit ignoriert Schutzwurf-Modifikatoren)',0],['Broken Will (feindliche Einheit: max. Kontrollwert 1)',1]]);
  const id=yield* A(G,p,e?'Feindliche Einheit wählen':'Eigene Einheit wählen',un(e?1-p:p));
  if(e)addFx(S,{k:'ctlmax',u:id,v:1,...R(S)});else TW.wnU=id}
 else if(key=='ui'&&u>=0){const id=yield* A(G,u,'Einheit wählen (+W6 Kontrollwert)',un(u)),r=d6(S);addFx(S,{k:'ctl',u:id,v:r,...R(S)});G.tray('Uncompromising Invasion',[{k:'row',l:'Kontrollwert +'+r+' bis Rundenende',v:[r]}])}
 else if(key=='sg'||key=='by'){const p=u>=0?u:null;if(p!=null){const id=yield* A(G,p,key=='sg'?'Einheit wählen (Angriff nach Rennen/Rückzug)':'Einheit wählen (Anti-charge)',un(p));
   if(key=='sg')addFx(S,{k:'fz',u:id,...R(S)});else addFx(S,{k:'antichg',u:id,v:1,...R(S)})}}}

export function sbVP(S,o){const k=S.TW.id,TW=S.TW;
 if(k=='sm')return myU(S,o).filter(x=>inCombat(S,x)).length+(TW.ud===o&&S.rd&&S.rd[o]>S.rd[1-o]?1:0);
 if(k=='sg')return S.GY.filter(g=>g.o==o&&!g.repl).length;
 if(k=='by')return S.obj.filter((p,i)=>S.oc[i]===o&&S.ocs[i]===1-o).length;
 if(k=='dc')return TW.obj&&TW.obj.length==2&&TW.obj.every(i=>S.oc[i]===o)?2:0;
 if(k=='ui')return S.obj.filter((p,i)=>S.oc[i]===o&&!whollyTerr(S,o,p)&&!(S.cs&&S.cs[i]&&S.cs[i][1-o]>0)).length;
 if(k=='ss')return TW.tf&&TW.tf.length==2&&TW.tf.every(i=>S.ter[i]&&terrCtl(S,S.ter[i])===o)?1:0;
 return 0}
export function sbRound(G){const S=G.S,t=S.TW.icon;if(t){const i=S.ter.indexOf(t);if(i>=0)S.ter.splice(i,1)}}
