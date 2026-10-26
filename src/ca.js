// Battlepack „City of Ash“: Reliquien, Ruined Manor, Taktikkarten (Bedingungen + Befehle), Wendungen
import {W,H,CR,into,tdist,ptDist,rectDist,objR} from './geom.js';
import {d6,d3,add,has} from './util.js';
import {fxL,addFx,usedKey,useKey} from './fx.js';
import {abs,edgeD,inRangePt} from './models.js';
import {ask,choice,info} from './game.js';
import {myU,foes,inCombat,wnd,mx,isHero,cvOf,hurt,place,applyMove,dist,byId,lt,terrOwn} from './rules.js';
import {destReq,doCharge,rolloff,razeOK,whollyT} from './cards.js';
import {SBCE,terrCtl} from './sb.js';
import {CA_RS} from './packdata.js';

const pickU=(G,s,t,l)=>ask(G,s,t,l.map(x=>[x.name+' ('+wnd(x)+'/'+mx(x)+')',x]));
const R=S=>({r0:S.round,exp:'rnd'});
export const rels=S=>S.ter.filter(t=>t.rel);
const relL=S=>S.ter.map((t,i)=>[t,i]).filter(([t])=>t.rel).map(([t,i])=>[t.rel,i]);
const gu=(S,id)=>byId(S,id)||S.GY.find(x=>x.id==id);
const oi=(S,n)=>S.on?S.on.indexOf(n):-1;
// Geländestück aus mehreren Teilen (Ruined Manor als L-Form): Kontrolle über alle Teile
export function featCtl(S,t){const P=t.fid!=null?S.ter.filter(x=>x.fid===t.fid):[t];const cs=[0,0];S.U.forEach(u=>{if(u.x>=0&&P.some(p=>tdist(u,p)<=3))cs[u.o]+=cvOf(S,u)});return cs[0]>cs[1]?0:cs[1]>cs[0]?1:-1}
const relCtl=(S,o)=>rels(S).filter(t=>terrCtl(S,t)===o).length;

// ---------- Platzierung von Reliquien ----------
export function relErr(S,o,u,x,y,a){const r={x,y,w:u.w,h:u.h,a:a||0},C=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>{const c=Math.cos(r.a),s=Math.sin(r.a);return [x+i*r.w/2*c-j*r.h/2*s,y+i*r.w/2*s+j*r.h/2*c]});
 if(C.some(p=>p[0]<0||p[0]>W||p[1]<0||p[1]>H))return 'Ganz auf dem Spielfeld';
 if(u.start&&C.some(p=>into(S,o,p[0],p[1])<0))return 'Ganz im eigenen Gebiet';
 if(S.ter.some(t=>t!==u.self&&!t.rel&&rectDist(r,t)<=0))return 'Nicht auf Gelände';
 if(S.ter.some(t=>t.rel&&t!==u.self&&rectDist(r,t)<=6))return 'Mehr als 6 Zoll von anderen Reliquien';
 if(S.U.some(e=>e.o!=o&&e.x>=0&&abs(e).some(m=>ptDist(r,m.x,m.y)-m.l/2<=3)))return 'Mehr als 3 Zoll von allen Feinden';
 if(S.U.some(e=>e.o==o&&e.x>=0&&abs(e).some(m=>ptDist(r,m.x,m.y)-m.l/2<0)))return 'Nicht auf Modelle';
 return ''}
export function* placeRelic(G,o,name,start=false,self=null){const S=G.S,[w,h]=CA_RS[name];
 const a=yield* place(G,o,'relic',{w,h,name,start,self},'Reliquie: '+name,name+': Mittelpunkt antippen'+(start?' (ganz im eigenen Gebiet)':' (mehr als 3" von Feinden, mehr als 6" von anderen Reliquien)'));
 if(self){self.x=a.x;self.y=a.y;self.a=a.a||0;return self}
 const t={x:a.x,y:a.y,w,h,a:a.a||0,big:false,k:'obst',ht:1.5,rel:name,nm:name};S.ter.push(t);G.note('Reliquie aufgestellt: '+name);return t}

// ---------- Ruined Manor auf einer Ecke eines rechteckigen Ziels ----------
export function manorOpts(S,o,len,th){const out=[];Object.entries(S.mr||{}).forEach(([k0,p])=>{const k=+k0,R0=objR(p),c=Math.cos(R0.a),s=Math.sin(R0.a);
 [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([i,j],ci)=>{const cx=R0.x+i*R0.w/2*c-j*R0.h/2*s,cy=R0.y+i*R0.w/2*s+j*R0.h/2*c;
  // zwei Mauern entlang der Zielkanten, von der Ecke nach innen
  const lr=(cx<p[0]?'links':'rechts'),tb=(cy<p[1]?'oben':'unten');
  // Mauern entlang der Zielkanten; immer nach innen: das Gelände steht ganz innerhalb des rechteckigen Ziels
  for(const [sx,sy,LL] of [[1,1,len],[1,1,3.5],[1,1,3],[1,1,2.5]]){const ax=[-i*c*sx,-i*s*sx],ay=[j*s*sy,-j*c*sy],L=LL,M=LL;
   const p1={x:cx+ax[0]*L/2+ay[0]*th/2*(sx==sy?1:-1)*0+ay[0]*th/2,y:cy+ax[1]*L/2+ay[1]*th/2,w:L,h:th,a:R0.a},p2={x:cx+ay[0]*M/2+ax[0]*th/2,y:cy+ay[1]*M/2+ax[1]*th/2,w:th,h:M,a:R0.a};
   const P=[p1,p2],cs=P.flatMap(q=>{const C=Math.cos(q.a),Sn=Math.sin(q.a);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[q.x+u*q.w/2*C-v*q.h/2*Sn,q.y+u*q.w/2*Sn+v*q.h/2*C])});
   if(cs.some(q=>q[0]<0||q[0]>W||q[1]<0||q[1]>H||into(S,o,q[0],q[1])<0))continue;
   if(S.ter.some(t=>P.some(q=>rectDist(q,t)<=1)))continue;
   out.push({k,ci,P,t:S.on[k]+': Ecke '+tb+' '+lr});break}})});return out}

// ---------- Taktikkarten ----------
export const CACH={
 1:(S,o)=>rels(S).some(t=>into(S,1-o,t.x,t.y)>0&&terrCtl(S,t)===o),
 2:(S,o)=>Object.entries(S.T.mt||{}).some(([t,a])=>{const v=gu(S,+t);return v&&v.o!=o&&a.filter(id=>{const x=gu(S,id);return x&&x.o==o}).length>=2}),
 3:(S,o)=>myU(S,o).some(u=>edgeD(u,3)<=3)&&myU(S,o).some(u=>edgeD(u,1)<=3),
 4:(S,o)=>S.G[1-o]===S.tn||(S.G[1-o]!=null&&S.G[1-o]<S.tn&&S.D[1-o]>0),
 5:(S,o)=>myU(S,o).some(u=>whollyT(S,1-o,u)&&!inCombat(S,u)),
 6:(S,o)=>!!(S.T.ptl&&S.T.ptl[o]),
 7:(S,o)=>myU(S,o).filter(u=>inRangePt(u,W/2,H/2,3)>0).length>=2,
 8:(S,o)=>razeOK(S,o),
 9:(S,o)=>S.oc[oi(S,'Twin-Tailed Comet')]===o,
 10:(S,o)=>S.oc[oi(S,'Ghal Maraz')]===o,
 11:(S,o)=>myU(S,o).length>0&&myU(S,o).every(u=>rels(S).some(t=>tdist(u,t)<=3)),
 12:(S,o)=>relCtl(S,o)>relCtl(S,1-o)};
export const CACMD={1:{ph:2,w:'opp'},2:{ph:1,w:'any'},3:{ph:6,w:'any'},4:{ph:4,w:'opp'},5:{ph:4,w:'any'},6:{ph:1,w:'own'},7:{ph:5,w:'any'},8:{ph:5,w:'any'},9:{ph:1,w:'any'},10:{ph:6,w:'any'},11:{ph:2,w:'opp'},12:{ph:5,w:'any'}};
export const CACR2={};
const nearRel=(S,u,d)=>rels(S).some(t=>tdist(u,t)<=d);
export function CAOK(S,s,c){const my=myU(S,s);
 switch(c){case 1:return my.length>0;case 2:return my.some(u=>nearRel(S,u,6));case 3:case 5:case 8:case 10:return rels(S).length>0;
  case 4:return my.some(x=>!inCombat(S,x)&&foes(S,x).some(e=>e.x>=0&&Math.hypot(e.x-x.x,e.y-x.y)<=16));
  case 6:return S.GY.some(g=>g.o==s&&!g.rp&&!g.repl);case 7:return my.some(x=>inCombat(S,x));case 11:return my.some(x=>!inCombat(S,x));default:return my.length>0}}
const pickRel=(G,s,t)=>ask(G,s,t,relL(G.S));
export const CACE={
 1:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Prepared Riposte: Einheit wählen',myU(S,s));if(x){addFx(S,{k:'first',u:x.id,cond:'rip',exp:'turn'});G.note('Prepared Riposte: '+x.name+' kämpft zuerst gegen Einheiten, die in diesem Zug angegriffen haben')}},
 2:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Motivated by Greed: Einheit wählen',myU(S,s).filter(u=>nearRel(S,u,6)));if(!x)return;const r=d6(S);addFx(S,{k:'ctl',u:x.id,v:r,exp:S.act==s?'own':'turn'});G.tray('Motivated by Greed',[{k:'row',l:x.name+': Kontrollwert +'+r,v:[r]}])},
 3:function*(G,s){const S=G.S,i=yield* pickRel(G,s,'Rigged Explosions: Reliquie wählen');if(i==null)return;const t=S.ter[i];for(const u of S.U.filter(u=>u.x>=0&&tdist(u,t)<=3)){const d=d3(S);G.tray('Rigged Explosions: '+u.name,[{k:'row',l:d+' tödlicher Schaden',v:[d]}]);hurt(G,u,d)}},
 4:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Counter-Charge: Einheit wählen',myU(S,s).filter(x=>!inCombat(S,x)));if(x)yield* doCharge(G,x)},
 5:function*(G,s){const S=G.S,i=yield* pickRel(G,s,'Race for the Loot: Reliquie wählen');if(i==null)return;S.T.rfl.push({o:s,i});G.note('Race for the Loot: Angriffe dürfen bis ½" an '+S.ter[i].rel+' enden')},
 6:SBCE[5],
 7:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Slip Away: Einheit wählen',myU(S,s).filter(x=>inCombat(S,x)));if(!x)return;const a=yield* destReq(G,x,5,{text:'Slip Away: bis 5 Zoll, nicht im Nahkampf enden'});if(!a.stay){applyMove(S,x,a,5);add(S.T.moved,x.id)}},
 8:function*(G,s){const S=G.S,i=yield* pickRel(G,s,'Covetous Frenzy: Reliquie wählen');if(i==null)return;S.T.cf.push({o:s,i});G.note('Covetous Frenzy: +1 auf Trefferwürfe bis 3" um '+S.ter[i].rel)},
 9:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Go Down Fighting: Einheit wählen',myU(S,s));if(x){addFx(S,{k:'gdf',u:x.id,exp:'turn'});G.note('Go Down Fighting: '+x.name)}},
 10:function*(G,s){const S=G.S,i=yield* pickRel(G,s,"Fool's Gold: Reliquie wählen");if(i==null)return;const t=S.ter[i];yield* placeRelic(G,s,t.rel,false,t);G.note("Fool's Gold: "+t.rel+' versetzt')},
 11:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Redeploy: Einheit wählen',myU(S,s).filter(x=>!inCombat(S,x)));if(!x)return;const r=d6(S);G.tray('Redeploy',[{k:'row',l:'',v:[r]}]);const a=yield* destReq(G,x,r);if(!a.stay){applyMove(S,x,a,r);add(S.T.moved,x.id)}},
 12:SBCE[9]};

// ---------- Fähigkeiten der Reliquien (Mensch; „Caltrops“ automatisch für beide) ----------
export function caTerrAbil(S,s){const L=[];if(S.act!==s)return L;
 const b=rels(S).find(t=>t.rel=='Barrel of Emberstone'),m=rels(S).find(t=>t.rel=='Inconspicuous Manhole');
 if(S.ph==1&&b&&!usedKey(S,s+':barrel','turn')&&myU(S,s).some(x=>tdist(x,b)<=3))L.push({t:'Barrel of Emberstone',s:'Eigene Einheit bis 3": +1 auf Verwundungswürfe bis Zugende (1× pro Zug)',run:function*(G){const x=yield* pickU(G,s,'Barrel of Emberstone: Einheit wählen',myU(S,s).filter(x=>tdist(x,b)<=3));if(!x)return;useKey(S,s+':barrel','turn');addFx(S,{k:'wnd',u:x.id,v:1,exp:'turn'});G.note('Barrel of Emberstone: '+x.name+' +1 auf Verwundungswürfe')}});
 if(S.ph==2&&m&&!usedKey(S,s+':manhole','turn')&&myU(S,s).some(x=>x.M&&abs(x).every(q=>ptDist(m,q.x,q.y)+q.l/2<=3)))L.push({t:'Inconspicuous Manhole',s:'Eigene Einheit ganz bis 3": ganz im eigenen Gebiet und mehr als 6" von Feinden neu aufstellen (1× pro Zug)',run:function*(G){const x=yield* pickU(G,s,'Inconspicuous Manhole: Einheit wählen',myU(S,s).filter(x=>x.M&&abs(x).every(q=>ptDist(m,q.x,q.y)+q.l/2<=3)));if(!x)return;useKey(S,s+':manhole','turn');const ox=x.x,oy=x.y;x.x=-99;const a=yield* place(G,s,'rep6',x,'Inconspicuous Manhole','Aufstellen: ganz im eigenen Gebiet, mehr als 6" von Feinden');if(a&&a.x!=null){x.x=a.x;x.y=a.y;add(S.T.moved,x.id)}else{x.x=ox;x.y=oy}}});
 return L}
export function caCaltrops(G){const S=G.S,c=rels(S).find(t=>t.rel=='Ulguan Steel Caltrops');if(!c||usedKey(S,S.act+':calt','turn'))return;
 const tg=S.U.filter(u=>u.x>=0&&has(S.T.charged,u.id)&&tdist(u,c)<=3);if(!tg.length)return;useKey(S,S.act+':calt','turn');
 tg.forEach(u=>{const r=d3(S);G.tray('Ulguan Steel Caltrops: '+u.name,[{k:'row',l:r>=2?r+' tödlicher Schaden':'kein Schaden (1)',v:[r],th:2}]);if(r>=2)hurt(G,u,r)})}

// ---------- Wendungskarten ----------
const EDG=['oberer Rand','rechter Rand','unterer Rand','linker Rand'];
const nearEdge=(u,e)=>edgeD(u,e)<=3;
export function* caAp(G,u,key,{A,who,un,ob,lg}){const S=G.S,TW=S.TW,act=S.act;TW.ud=u;
 const placer=function*(name){if(rels(S).some(t=>t.rel==name)){lg.push(name+' liegt bereits auf dem Schlachtfeld');return}const p=who();yield* placeRelic(G,p,name);lg.push((p?'Computer':'Du')+' stellt '+name+' auf')};
 const force=function*(t,picked,again){if(u<0)return picked;const y=G.isAI(u)?0:yield* choice(G,u,t,'Als Außenseiter darfst du würfeln: Bei 3+ muss der Gegner neu wählen.',[{t:'Würfeln'},{t:'Nicht würfeln'}],{pref:0});if(y)return picked;const r=d6(S);G.tray(t+': Außenseiter würfelt',[{k:'row',l:'3+',v:[r],th:3}]);lg.push('Außenseiter würfelt '+r+(r>=3?' – Gegner muss neu wählen':''));return r>=3?yield* again(picked):picked};
 if(key=='sp'){const f=[act,1-act];TW.sp=[null,null];for(const o of f)TW.sp[o]=yield* A(G,o,'Staging Posts: Ziel wählen',ob());
  if(u>=0)TW.sp[1-u]=yield* force('Staging Posts',TW.sp[1-u],function*(pk){return yield* A(G,1-u,'Staging Posts: anderes Ziel wählen',ob(pk))})}
 else if(key=='ct'){for(const o of [act,1-act]){const l=S.U.filter(x=>x.o!=o&&x.x>=0&&rels(S).some(t=>tdist(x,t)<=3)).map(x=>[x.name,x.id]);if(!l.length)continue;const id=yield* A(G,o,'Cursed Treasure: feindliche Einheit wählen',l);addFx(S,{k:'ctlmax',u:id,v:1,...R(S)})}yield* placer('Ulguan Steel Caltrops')}
 else if(key=='ee')yield* placer('Barrel of Emberstone');
 else if(key=='te'){TW.te=-1;if(u>=0){const i=yield* A(G,u,'A Timely Exit: Rand blockieren?',[...EDG.map((e,k)=>[e,k]),['Keinen',-1]]);TW.te=i}}
 else if(key=='gy')yield* placer('Crate of Aqua Ghyranis');
 else if(key=='wh'){if(u>=0){const id=yield* A(G,u,'We’ll Have That!: Sturmtrupp wählen (+2 auf Angriffswürfe)',[...un(u),['Keine',null]]);if(id!=null)addFx(S,{k:'chg',u:id,v:2,...R(S)})}}
 else if(key=='as'){TW.mk=[null,null];for(const o of [act,1-act])TW.mk[o]=yield* A(G,o,'Assassinate: feindliche Einheit als Ziel markieren',un(1-o));yield* placer('Inconspicuous Manhole')}
 else if(key=='av'){TW.lo=[null,null];for(const o of [act,1-act])TW.lo[o]=yield* A(G,o,'Aggressive Valuation: eigene Einheit trägt die Beute',un(o));
  if(u>=0)TW.lo[1-u]=yield* force('Aggressive Valuation',TW.lo[1-u],function*(pk){return yield* A(G,1-u,'Aggressive Valuation: andere Einheit wählen',un(1-u).filter(x=>x[1]!==pk))})}
 else if(key=='sd'){yield* placer('Battered Barricade')}
 else if(key=='cx')yield* placer('Ulguan Steel Caltrops');
 else if(key=='ar'){const ord=u>=0?[u,1-u]:[act,1-act];for(const o of ord){for(let n=0;n<2;n++){const l=myU(S,o).filter(x=>!inCombat(S,x));if(!l.length)break;const x=yield* A(G,o,'Adrenaline Rush: Einheit '+(n+1)+' von 2 (bis 3")',[...l.map(x=>[x.name,x.id]),['Keine weitere',null]]);if(x==null)break;const v=byId(S,x);
   S.cmb=o===u;try{const a=yield* destReq(G,v,3,{text:'Adrenaline Rush: bis 3 Zoll'+(o===u?' (darf im Nahkampf enden)':'')});if(!a.stay)applyMove(S,v,a,3)}finally{S.cmb=false}}}}
 else if(key=='rm'){if(u>=0){const id=yield* A(G,u,'Rapid Manoeuvres: Einheit mit Anti-charge (+1 Wucht)',[...un(u),['Keine',null]]);if(id!=null)addFx(S,{k:'antichg',u:id,v:1,...R(S)})}}}
export function caVP(S,o){const k=S.TW.id,TW=S.TW;
 if(k=='sp')return TW.sp?[...new Set(TW.sp)].filter(i=>i!=null&&S.oc[i]===o).length:0;
 if(k=='ee'){const m=(S.man||[])[1-o];return m&&featCtl(S,m)===o?1:0}
 if(k=='te')return [0,1,2,3].filter(e=>e!==TW.te&&!S.U.some(x=>x.o!=o&&x.x>=0&&nearEdge(x,e))).length;
 if(k=='wh'){const t=(S.rel0||[])[1-o];return t&&S.ter.includes(t)&&terrCtl(S,t)===o?1:0}
 if(k=='sd')return rels(S).filter((t,i)=>terrCtl(S,t)===o&&(S.rcT?S.rcT[i]:-1)!==o).length;
 if(k=='cx')return S.oc[S.on.indexOf('The Junction')]===o?1:0;
 return 0}
export function caRound(G){const S=G.S,TW=S.TW;
 if(TW.id=='as'&&TW.mk)[0,1].forEach(o=>{if(TW.mk[o]!=null&&has(S.dead,TW.mk[o])){S.P[o].vp++;G.note(S.P[o].n+': Markierte Einheit zerstört (+1 SP, Assassinate)')}});
 if(TW.id=='av'&&TW.lo)[0,1].forEach(o=>{const t=TW.lo[1-o];if(t!=null&&has(S.dead,t)){S.P[o].vp++;G.note(S.P[o].n+': Beuteträger des Gegners zerstört (+1 SP, Aggressive Valuation)')}})}
// Zugbeginn: Reliquienkontrolle merken (Stockpiling Drive)
export function caTurnStart(S){S.rcT=rels(S).map(t=>terrCtl(S,t))}
