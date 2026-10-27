// Fähigkeiten der vierten Armeenwelle: Khainitischer Schattenzirkel (ks_), Hurakan-Speerspitze (hu_), Kastellitenkompanie (kc_), Tzaangor-Kriegsherde (tz_).
import {yn,scE,mort,AB,en,roll2,fr,lab,hdr,pk,FL,vis,genOf,rep,row,relocate,claims,RSVN} from './abil.js';
import {HK,GL} from './hooks.js';
import {byId,place,rsvForm,placeErr,inCombat,hasAb,ENI,RGI,mx,wnd,hurt,dist,foes,nm,gnl,applyMove,mvOf,attackG,overlapErr,moveErr} from './rules.js';
import {W,H,CR,into,onTer} from './geom.js';
import {destReq,CH} from './cards.js';
import {abs,wholly,setAbs} from './models.js';
import {ARMY,TAC} from './data.js';
import {d6,d3,add,has} from './util.js';
import {choice} from './game.js';
import {addFx,fxL,usedKey,useKey} from './fx.js';

const trOf=(S,o,k)=>{try{return ARMY[S.K.army[o]].tr.includes(k)}catch(e){return false}};
const kw=(u,w)=>(u.kw||'').includes(w);
const canHealX=(S,u)=>{try{return !fxL(S,u,'sense').length}catch(e){return true}};
// Zauberwurf 2W6 mit Zuschlag
const sp4=(G,n,th,bonus=0)=>{const [a,b]=roll2(G.S),ok=a+b+bonus>=th;rep(G,n,row('Zauberwurf ('+th+'+)',[a,b],0),(bonus?'+'+bonus+' · ':'')+(ok?'Zauber gelingt':'Zauber misslingt'));return ok};
// Bewegung mit Sonderregeln: S.cmb erlaubt das Durchqueren der Nahkampfreichweite; end = 'out' (nicht im Nahkampf enden), 'in' (im Nahkampf enden), 'lee' (näher an der leewärtigen Kante, nicht im Nahkampf)
function* mvX(G,u,rng,title,end){const S=G.S;S.cmb=true;
 try{const inC=a=>{const g={...u,x:a.x,y:a.y};return foes(S,u).some(e=>e.x>=0&&dist(g,e)<=CR)};
  const a=yield* destReq(G,u,rng,{text:title+': bis '+rng+' Zoll'+(end=='in'?' (muss im Nahkampf enden)':end=='lee'?' (näher an der leewärtigen Kante, nicht im Nahkampf)':' (nicht im Nahkampf enden)'),
   chk:a=>end=='in'?(inC(a)?'':'Die Einheit muss im Nahkampf enden'):end=='lee'?(inC(a)?'Die Bewegung darf nicht im Nahkampf enden':ed(leeOf(S,u.o),a.x,a.y)<ed(leeOf(S,u.o),u.x,u.y)?'':'Die Einheit muss näher an der leewärtigen Kante enden'):(inC(a)?'Die Bewegung darf nicht im Nahkampf enden':'')});
  if(!a.stay){applyMove(S,u,a,rng);add(S.T.moved,u.id);G.note(title+': '+u.name+' bewegt sich');return true}return false}
 finally{S.cmb=false}}

// ---------- Leeseite (Hurakan) ----------
export const EDN=['obere','rechte','untere','linke'];
const ed=(k,x,y)=>[y,W-x,H-y,x][k];
const bestEdge=(S,o)=>{const E=S.U.filter(x=>x.o!=o&&x.x>=0);if(!E.length)return 0;const cx=E.reduce((t,x)=>t+x.x,0)/E.length,cy=E.reduce((t,x)=>t+x.y,0)/E.length;let b=0;for(let k=1;k<4;k++)if(ed(k,cx,cy)<ed(b,cx,cy))b=k;return b};
export const leeOf=(S,o)=>{const l=S.lee&&S.lee[o];return l==null?bestEdge(S,o):l};
const hwN=(S,o)=>S.hw&&S.hw[o]&&S.hw[o].r==S.round?S.hw[o].n:0;
// Eine Wirbelwind-reiten-Fähigkeit wurde abgehandelt: Zähler erhöhen, Kante im Uhrzeigersinn weiterdrehen
function windS(S,o,G,what){S.hw=S.hw||[null,null];const h=S.hw[o]&&S.hw[o].r==S.round?S.hw[o]:(S.hw[o]={r:S.round,n:0});h.n++;S.lee=S.lee||[null,null];S.lee[o]=(leeOf(S,o)+1)%4;if(G)G.note((what||'Wirbelwind reiten')+': leewärtige Kante wechselt auf die '+EDN[S.lee[o]]+' Kante')}
const leeDist=(S,o,x,y)=>ed(leeOf(S,o),x,y);
// Aufstellen an der leewärtigen Kante (Sprung in den Sturm)
GL.place.leerel=(S,o,u,x,y,a)=>{const k=leeOf(S,o),p=[y,W-x,H-y,x];if(p.indexOf(Math.min(...p))!==k)return 'Ganz innerhalb von 3 Zoll um die leewärtige Kante ('+EDN[k]+' Kante), mehr als 6 Zoll von Feinden';return placeErr(S,'rsv',o,u,x,y,a)};
function* leeRelocate(G,o,u,title){const S=G.S,rs=u.rsv;u.rsv='edge';let p;
 try{p=yield* place(G,o,'leerel',u,title,'Neu aufstellen: ganz innerhalb von 3 Zoll um die leewärtige Schlachtfeldkante ('+EDN[leeOf(S,o)]+' Kante), mehr als 6 Zoll von allen Feinden',{cancel:true})}finally{u.rsv=rs}
 if(p.cancel)return false;const Pf=(u.rsv='edge',rsvForm(u,p.x,p.y));u.rsv=rs;if(Pf)setAbs(u,Pf);else{u.x=p.x;u.y=p.y}G.note(title+': '+u.name+' wird an der leewärtigen Kante neu aufgestellt');return true}
// Neu aufstellen ganz innerhalb von 12" um den General, >6" von Feinden (Die Realität falten)
GL.place.tzfalt=(S,o,u,x,y,a)=>{const g=gnl(S,o),h={...u,x,y};if(!g||g.x<0)return 'Kein General';const P=abs(h);if(!P.every(m=>m.x>=m.l/2&&m.x<=W-m.l/2&&m.y>=m.l/2&&m.y<=H-m.l/2))return 'Außerhalb des Spielfelds';if(P.some(m=>onTer(S,m.x,m.y,m.l/2-.02))||overlapErr(S,h))return 'Nicht auf Gelände oder Modelle';if(!wholly(h,g,12)||foes(S,u).some(e=>e.x>=0&&dist(h,e)<=6))return 'Ganz innerhalb von 12 Zoll um den General, mehr als 6 Zoll von allen Feinden';return ''};
GL.rng.push((S,u,e)=>{if(!u.gen||u.x<0||e.x<0||ENI(S,u.o)!='hu_flugbahn')return Infinity;const k=leeOf(S,u.o);return Math.min(...abs(e).map(m=>ed(k,m.x,m.y)-m.l/2))});
GL.mvChk.push((S,u,x,y)=>{const f=fxL(S,u,'leeF')[0];if(!f)return '';const k=leeOf(S,f.o);return ed(k,x,y)<ed(k,u.x,u.y)?'':'Tosender Gegenwind: Die Bewegung muss näher an der leewärtigen Kante enden'});
GL.ctl.push((S,u)=>{let n=0;for(const o of [0,1]){if(o==u.o||ENI(S,o)!='hu_verweht')continue;const g=gnl(S,o);if(g&&g.x>=0&&dist(g,u)<=6)n-=hwN(S,o)}return n});
GL.ward.push((S,e)=>{if(e.x<0||ENI(S,e.o)!='hu_tempel')return 0;const g=gnl(S,e.o);if(!g||g.x<0)return 0;const inf=S.U.filter(x=>x.o==e.o&&x.x>=0&&x!==g&&kw(x,'Infanterie')&&dist(x,g)<=CR);if(!inf.length)return 0;return e===g||inf.includes(e)?5:0});
// Kraft des Sturms: +1 auf Trefferwürfe, wenn das Ziel näher an der leewärtigen Kante ist als der Angreifer (1× pro Zug, Armee)
GL.pre.push((S,u,e,shoot,G)=>{if(!trOf(S,u.o,'hu_kraft')||u.x<0)return;const T=S.T;if(T.kr)return;const k=leeOf(S,u.o);if(ed(k,e.x,e.y)<ed(k,u.x,u.y)){T.kr={u:u.id,t:e.id,ph:S.ph};if(G)G.note('Kraft des Sturms: +1 auf Trefferwürfe von '+u.name+' gegen '+e.name);windS(S,u.o,G,'Kraft des Sturms')}});
// Schimmerling: 1× pro Phase 1 Wiederholungswurf für den General (als Angreifer oder Verteidiger)
GL.pre.push((S,u,e,shoot,G)=>{for(const x of [u,e]){if(x.gen&&ENI(S,x.o)=='kc_schimmer'&&!usedKey(S,'kcs:'+x.id,'phase')){useKey(S,'kcs:'+x.id,'phase');addFx(S,{k:'rrt',u:x.id,v:1,n0:1,exp:'ph'});if(G)G.note('Schimmerling: '+x.name+' darf 1 Wurf wiederholen')}}});
// Das Land weihen: Rettung 6+ auf geweihten Zielen
GL.ward.push((S,e)=>{if(!S.weih||e.x<0)return 0;for(let k=0;k<S.weih.length;k++){if(S.weih[k]!==e.o)continue;if(S.oc[k]===1-e.o){S.weih[k]=null;continue}if(claims(S,e,k))return 6}return 0});

Object.assign(HK,{
 ks_mord:{rend:(S,u,e,shoot)=>!shoot&&kw(u,'Infanterie')&&has(S.T.charged,u.id)?1:0},
 kc_klinge:{rend:(S,u,e,shoot,w)=>w&&w[0]=='Meisterhaftes Langschwert'?1:0},
 tz_wandel:{rendT:(S,u)=>S.ud===u.o?-1:0},
 tz_voll:{chg:(S,u)=>S.ud===u.o?1:0},
 tz_rauber:{wnd:(S,u)=>u.M&&u.x>=0&&abs(u).every(m=>into(S,1-u.o,m.x,m.y)>=m.l/2)?1:0},
 hu_kraft:{hit:(S,u,e)=>S.T.kr&&S.T.kr.u==u.id&&S.T.kr.t==e.id&&S.T.kr.ph==S.ph?1:0}
});

const tzb=(S,o)=>{try{if(RGI(S,o)!='tz_ritual')return 0;const g=gnl(S,o);return g&&g.x>=0&&S.U.some(x=>x.o==o&&x!==g&&x.x>=0&&wholly(g,x,6))?1:0}catch(e){return 0}};
const visW=(S,g,x,r)=>x.x>=0&&wholly(x,g,r)&&(x===g||vis(S,g,x));
const msk=(S,x)=>x.x>=0&&kw(x,'Infanterie')&&inCombat(S,x)&&!has(S.T.charged,x.id);

// ---------- Rundenbeginn / Aufstellung / Zugende ----------
export function* start4(G,o){const S=G.S;
 if(trOf(S,o,'kc_befehl')){const p=S.P[o],as=p.aside||(p.aside=[]),c0=p.hand.filter(c=>!as.includes(c));S.off=S.off||[null,null];S.off[o]=null;
  if(c0.length){const c=yield* pk(G,o,'Befehl des Offizars: Taktikkarte separat legen',[...c0.map(c=>[TAC[c-1][0]+' – '+TAC[c-1][2],c]),['Keine Karte',null]],c=>c==null?-1:(CH[c]&&CH[c](S,o)?0:1));
   if(c!=null){as.push(c);S.off[o]=c;G.note('Befehl des Offizars: '+(G.isAI(o)?'Computer legt':'Du legst')+' die Karte „'+TAC[c-1][0]+'“ separat (Befehl: '+TAC[c-1][2]+')')}}}}
export function* dep4(G,o){const S=G.S;
 if(trOf(S,o,'hu_sturm')){S.lee=S.lee||[null,null];const b=bestEdge(S,o);let k=b;
  if(!G.isAI(o))k=yield* choice(G,o,'Ein Sturm zieht auf','Wähle die leewärtige Schlachtfeldkante. Deine Winde tragen Einheiten auf diese Kante zu.',EDN.map(t=>({t:t[0].toUpperCase()+t.slice(1)+' Kante'})),{pref:b});
  S.lee[o]=k;G.note('Ein Sturm zieht auf: leewärtige Kante ist die '+EDN[k]+' Kante')}}
// Rückgabe-Zeile für getötete Karten (Das Schicksal betrügen)
export function* betr(G,o,c){const S=G.S;if(!trOf(S,o,'tz_betrug'))return;const p=S.P[o],i=p.disc.lastIndexOf(c);if(i<0)return;
 if(!G.isAI(o)&&!(yield* yn(G,o,'Das Schicksal betrügen','Die Karte „'+TAC[c-1][0]+'“ verdeckt unter das Taktikvorhabendeck legen statt sie abzulegen?',true)))return;
 p.disc.splice(i,1);p.deck.unshift(c);if(S.dsc)S.dsc[o]=Math.max(0,S.dsc[o]-1);G.note('Das Schicksal betrügen: Die Karte „'+TAC[c-1][0]+'“ liegt jetzt unter dem Taktikvorhabendeck')}
export function* eot4(G,o,act){const S=G.S;
 if(S.weih)S.weih.forEach((w,k)=>{if(w!=null&&S.oc[k]===1-w)S.weih[k]=null});
 // Heilige Flamme
 if(ENI(S,o)=='kc_flamme'){const g=genOf(S,o);if(g&&g.x>=0){const c=FL(S,o,x=>x.x>=0&&x.dn=='Freigilden-Stahlhelme (Kastelliten)'&&x.n<x.nmax&&dist(g,x)<=CR&&canHealX(S,x));
   if(c.length){const t=yield* pk(G,o,'Heilige Flamme: Einheit',[...c,['Keine',null]],x=>x?x.nmax-x.n:-1e9);if(t){const k=Math.min(d3(S),t.nmax-t.n);t.n+=k;G.note('Heilige Flamme: '+t.name+' erhält '+k+' Modell(e) zurück')}}}}
 // Mutierende Zauberei
 if(ENI(S,o)=='tz_mutier'){const g=genOf(S,o);if(g&&g.x>=0){const c=en(S,o).filter(e=>dist(g,e)<=12&&vis(S,g,e));
   if(c.length){const t=yield* pk(G,o,'Mutierende Zauberei: feindliches Ziel',[...c.map(x=>[lab(x),x]),['Nicht einsetzen',null]],x=>x?scE(x):-1e9);
    if(t){const fl=FL(S,o,x=>x.x>=0&&/^Tzaangors/.test(x.dn)&&foes(S,x).includes(t)&&dist(x,t)<=CR);let f=null;
     if(fl.length)f=yield* pk(G,o,'Mutierende Zauberei: befreundetes Ziel (optional)',[...fl,['Keine',null]],x=>x?x.nmax-x.n:-1e9);
     const r=d3(S);hdr(G,'Mutierende Zauberei',r,r>=2,2,t.name+': '+r+' tödlicher Schaden'+(f?'; '+f.name+': 1 Modell kehrt zurück':''),'Kein Effekt');
     if(r>=2){mort(G,t,r,'Mutierende Zauberei');if(f&&f.n<f.nmax&&canHealX(S,f))f.n++}}}}}
 // Sprung in den Sturm
 if(o==act&&!G.isAI(o)){for(const u of fr(S,o).filter(x=>hasAb(x,'hu_sprung')&&x.x>=0&&!inCombat(S,x))){
   if(!(yield* yn(G,o,'Sprung in den Sturm',u.name+' an der leewärtigen Kante ('+EDN[leeOf(S,o)]+' Kante) neu aufstellen? (ganz innerhalb von 3 Zoll um die Kante, mehr als 6 Zoll von Feinden)',false)))continue;
   if(yield* leeRelocate(G,o,u,'Sprung in den Sturm'))windS(S,o,G,'Sprung in den Sturm')}}}

export function install4(){
 RSVN['Tzaangor-Erleuchtete']='Vorherbestimmte Ankunft';
 Object.assign(AB,{
  // ===== Khainitischer Schattenzirkel =====
  ks_masken:{n:'Schattenmasken',s:'Beliebige Angriffsphase, 1× pro Zug: Befreundete Infanterie im Nahkampf, die nicht angegriffen hat: −1 auf Treffer- und Verwundungswürfe für Nahkampfattacken gegen sie (Zug)',ph:4,freq:'turn',army:1,src:(S,o)=>trOf(S,o,'ks_masken'),can:(S,o)=>fr(S,o).some(x=>msk(S,x)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Schattenmasken: Einheit',FL(S,o,x=>msk(S,x)),x=>mx(x));if(!t)return;addFx(S,{k:'hitTm',u:t.id,v:-1,exp:'turn'});addFx(S,{k:'wndTm',u:t.id,v:-1,exp:'turn'});G.note('Schattenmasken: Nahkampfattacken gegen '+t.name+' haben −1 auf Treffer- und Verwundungswürfe')},ai:()=>true},
  ks_blut:{n:'Lasst sie bluten',s:'Beliebige Nahkampfphase, 1× pro Schlacht: Befreundete Infanterie im Nahkampf, die nicht angegriffen hat, bewegt sich bis zu 6", ohne im Nahkampf zu enden',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='ks_blut',can:(S,o)=>fr(S,o).some(x=>msk(S,x)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Lasst sie bluten: Einheit',FL(S,o,x=>msk(S,x)),x=>mx(x));if(!t)return;yield* mvX(G,t,6,'Lasst sie bluten','out')}},
  ks_mord:{n:'Mordschlag',s:'Passiv: +1 Wucht für Nahkampfwaffen befreundeter Infanterie, die im selben Zug angegriffen hat',army:1,src:(S,o)=>RGI(S,o)=='ks_mord'},
  ks_avatar:{n:'Avatar der Schatten',s:'Deine Nahkampfphase, 1× pro Schlacht: +1 Wucht für die Nahkampfwaffen der Generalin (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='ks_avatar',can:(S,o)=>S.act==o&&!!genOf(S,o),
   *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'rendP',u:g.id,v:1,exp:'turn'});G.note('Avatar der Schatten: Nahkampfwaffen von '+g.name+' haben +1 Wucht')},ai:()=>true},
  ks_predigt:{n:'Wahnhafte Predigt',s:'Heldenphase: Sichtbare Einheit ganz innerhalb 12" um die Generalin: 3+ → +1 auf Rettungswürfe (Zug)',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='ks_predigt',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>visW(S,g,x,12))},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Wahnhafte Predigt: Ziel',FL(S,o,x=>visW(S,g,x,12)),x=>mx(x));if(!t)return;const r=d6(S);hdr(G,'Wahnhafte Predigt',r,r>=3,3,t.name+': +1 auf Rettungswürfe bis Zugende','Kein Effekt');if(r>=3)addFx(S,{k:'wardB',u:t.id,v:1,exp:'turn'})},ai:()=>true},
  ks_brodel:{n:'Brodelndes Blut',s:'Fernkampfphase: Sichtbarer Feind innerhalb 12" um die Generalin: Wurf ≥ Schutzwert des Ziels → Bewegung halbiert bis zu deinem nächsten Zug',ph:3,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='ks_brodel',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=12&&vis(S,g,e))},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Brodelndes Blut: Ziel',en(S,o).filter(e=>dist(g,e)<=12&&vis(S,g,e)).map(x=>[lab(x),x]),x=>mvOf(S,x));if(!t)return;const r=d6(S);hdr(G,'Brodelndes Blut',r,r>=t.sv,t.sv,t.name+': Bewegung halbiert bis zu deinem nächsten Zug','Kein Effekt');if(r>=t.sv)addFx(S,{k:'mv',u:t.id,v:-Math.floor(mvOf(S,t)/2),exp:'own'})},ai:()=>true},
  ks_aufprall:{n:'Aufprallklingen',s:'Beliebige Angriffsphase: Hat die Generalin angegriffen, wähle Feind innerhalb 1": W3, bei 2+ tödlicher Schaden in Höhe des Wurfs',ph:4,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='ks_aufprall',can:(S,o)=>{const g=genOf(S,o);return !!g&&has(S.T.charged,g.id)&&foes(S,g).some(e=>e.x>=0&&dist(g,e)<=1)},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Aufprallklingen: Ziel',foes(S,g).filter(e=>e.x>=0&&dist(g,e)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d3(S);hdr(G,'Aufprallklingen (W3)',r,r>=2,2,t.name+': '+r+' tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,r,'Aufprallklingen')},ai:()=>true},
  ks_abscheu:{n:'Heiliger Abscheu',s:'Heldenphase: Sichtbare befreundete Infanterie ganz innerhalb 12": 3+ → +1 auf Schutzwürfe bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ks_abscheu'),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Heiliger Abscheu: Ziel',FL(S,u.o,x=>kw(x,'Infanterie')&&visW(S,u,x,12)),x=>mx(x));if(!t)return;const r=d6(S);hdr(G,'Heiliger Abscheu',r,r>=3,3,t.name+': +1 auf Schutzwürfe bis zu deinem nächsten Zug','Kein Effekt');if(r>=3)addFx(S,{k:'svP',u:t.id,v:1,exp:'own'})},ai:()=>true},
  ks_aufw:{n:'Blutige Aufwiegelung',s:'Beliebige Nahkampfphase: Sichtbare befreundete Einheit ganz innerhalb 12": im Nahkampf → Krit. (verwundet) für Nahkampfwaffen, sonst 3+ (Zug)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ks_aufw'),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Blutige Aufwiegelung: Ziel',FL(S,u.o,x=>visW(S,u,x,12)),x=>inCombat(S,x)?mx(x)+50:mx(x));if(!t)return;
    if(inCombat(S,t)){addFx(S,{k:'critVM',u:t.id,exp:'turn'});G.note('Blutige Aufwiegelung: Nahkampfwaffen von '+t.name+' haben Krit. (verwundet)');return}
    const r=d6(S);hdr(G,'Blutige Aufwiegelung',r,r>=3,3,t.name+': Nahkampfwaffen haben Krit. (verwundet)','Kein Effekt');if(r>=3)addFx(S,{k:'critVM',u:t.id,exp:'turn'})},ai:()=>true},
  ks_starren:{n:'Blutrünstiges Starren',s:'Fernkampfphase: Im Nahkampf → Feind im Nahkampf mit ihr, sonst sichtbarer Feind innerhalb 12": 3+ → 1 tödlicher Schaden, bei getötetem Modell 1 weiterer',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ks_starren'),can:(S,u)=>u.x>=0&&(inCombat(S,u)?foes(S,u).some(e=>e.x>=0&&dist(u,e)<=CR):en(S,u.o).some(e=>dist(u,e)<=12&&vis(S,u,e))),
   *run(G,u){const S=G.S,c=inCombat(S,u)?foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR):en(S,u.o).filter(e=>dist(u,e)<=12&&vis(S,u,e)),t=yield* pk(G,u.o,'Blutrünstiges Starren: Ziel',c.map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Blutrünstiges Starren',r,r>=3,3,t.name+': 1 tödlicher Schaden','Kein Effekt');
    if(r>=3){const n0=nm(t);mort(G,t,1,'Blutrünstiges Starren');if(!S.U.includes(t)||nm(t)<n0){if(S.U.includes(t)&&t.x>=0)mort(G,t,1,'Blutrünstiges Starren (weiterer)')}}},ai:()=>true},
  ks_tanz:{n:'Tanz des Todes',s:'Gegnerische Nahkampfphase, 1× pro Zug (Armee): Schlächterschwestern im Nahkampf bewegen sich 2W6", durch Nahkampfreichweiten, und müssen im Nahkampf enden',ph:5,freq:'turn',army:1,src:(S,o)=>fr(S,o).some(x=>hasAb(x,'ks_tanz')),can:(S,o)=>S.act!=o&&fr(S,o).some(x=>hasAb(x,'ks_tanz')&&inCombat(S,x)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Tanz des Todes: Einheit',FL(S,o,x=>hasAb(x,'ks_tanz')&&inCombat(S,x)),x=>mx(x));if(!t)return;const [a,b]=roll2(S);rep(G,'Tanz des Todes',row('2W6',[a,b],0),'Bewegung: bis zu '+(a+b)+' Zoll');yield* mvX(G,t,a+b,'Tanz des Todes','in')}},
  ks_sprung:{n:'Schattensprung',s:'Bewegungsphase, 1× pro Schlacht: Einheit vom Feld nehmen und weiter als 6" von allen Feinden neu aufstellen',ph:2,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'ks_sprung'),
   *run(G,u){const S=G.S,ok=yield* relocate(G,u.o,u,'rein','Schattensprung','Neu aufstellen: mehr als 6 Zoll von allen Feinden');if(ok)add(S.T.moved,u.id)}},
  // ===== Hurakan-Speerspitze =====
  hu_sturm:{n:'Ein Sturm zieht auf',s:'Aufstellungsphase: Wähle eine Schlachtfeldkante als leewärtig. Nach jeder Wirbelwind-reiten-Fähigkeit wandert die leewärtige Kante im Uhrzeigersinn zur nächsten Kante',army:1,src:(S,o)=>trOf(S,o,'hu_sturm')},
  hu_sog:{n:'Im Sog der Winde',s:'Beliebige Bewegungsphase, 1× pro Zug (Armee): Befreundete Einheit außerhalb des Nahkampfs bewegt sich W6", durch Nahkampfreichweiten, muss näher an der leewärtigen Kante enden, nicht im Nahkampf',ph:2,freq:'turn',army:1,src:(S,o)=>trOf(S,o,'hu_sog'),can:(S,o)=>S.act==o&&fr(S,o).some(x=>!inCombat(S,x)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Im Sog der Winde: Einheit',FL(S,o,x=>!inCombat(S,x)),x=>mx(x));if(!t)return;const r=d6(S);rep(G,'Im Sog der Winde',row('W6',[r],0),'Bewegung: bis zu '+r+' Zoll');yield* mvX(G,t,r,'Im Sog der Winde','lee');windS(S,o,G,'Im Sog der Winde')}},
  hu_kraft:{n:'Kraft des Sturms',s:'Reaktion auf eine Attacke-Fähigkeit, 1× pro Zug (Armee, automatisch): +1 auf Trefferwürfe, wenn das Ziel näher an der leewärtigen Kante ist als der Angreifer',army:1,src:(S,o)=>trOf(S,o,'hu_kraft')},
  hu_truemmer:{n:'Herumwirbelnde Trümmer',s:'Heldenphase: Feind, der näher an der leewärtigen Kante ist als das große Gelände in deinem Territorium: so viele Würfel wie die Schlachtrunde, je 3+ → 1 tödlicher Schaden (Wirbelwind reiten)',ph:1,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='hu_truemmer',
   can:(S,o)=>truemmerT(S,o).length>0,
   *run(G,o){const S=G.S,c=truemmerT(S,o),t=yield* pk(G,o,'Herumwirbelnde Trümmer: Ziel',c.map(x=>[lab(x),x]),scE);if(!t)return;const rs=[];let k=0;for(let i=0;i<S.round;i++){const r=d6(S);rs.push(r);if(r>=3)k++}rep(G,'Herumwirbelnde Trümmer',row('Würfel (3+)',rs,3),k?t.name+': '+k+' tödlicher Schaden':'Kein Effekt');if(k)mort(G,t,k,'Herumwirbelnde Trümmer');windS(S,o,G,'Herumwirbelnde Trümmer')},ai:()=>true},
  hu_gegenwind:{n:'Tosender Gegenwind',s:'Gegnerische Heldenphase, 1× pro Schlacht (Armee): Feindliche Einheit muss jede Bewegung dieses Zugs näher an der leewärtigen Kante beenden',army:1,opp:1,oph:1,when:'start',freq:'battle',src:(S,o)=>RGI(S,o)=='hu_gegenwind',can:(S,o)=>en(S,o).length>0,
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Tosender Gegenwind: Ziel',en(S,o).map(x=>[lab(x),x]),x=>mvOf(S,x)+mx(x)*.01);if(!t)return;addFx(S,{k:'leeF',u:t.id,o,exp:'turn'});G.note('Tosender Gegenwind: '+t.name+' muss Bewegungen näher an der leewärtigen Kante ('+EDN[leeOf(S,o)]+') beenden')},ai:(S,o)=>true},
  hu_verweht:{n:'Vom Winde verweht',s:'Passiv: −1 Kontrollwert feindlicher Einheiten innerhalb 6" um den General je Wirbelwind-reiten-Fähigkeit dieser Schlachtrunde',army:1,src:(S,o)=>ENI(S,o)=='hu_verweht'},
  hu_fluester:{n:'Windflüsterer',s:'Beliebige Heldenphase, 1× pro Schlacht (Armee): Ändere die leewärtige Schlachtfeldkante zu einer gewählten Kante',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='hu_fluester',can:(S,o)=>S.act==o,
   *run(G,o){const S=G.S,i=yield* choice(G,o,'Windflüsterer','Aktuell leewärtig: '+EDN[leeOf(S,o)]+' Kante. Neue Kante wählen:',EDN.map(t=>({t:t[0].toUpperCase()+t.slice(1)+' Kante'})),{pref:leeOf(S,o)});S.lee=S.lee||[null,null];S.lee[o]=i;G.note('Windflüsterer: leewärtige Kante ist jetzt die '+EDN[i]+' Kante')}},
  hu_tempel:{n:'Tempelwächter',s:'Passiv: Solange eine befreundete Infanterie in Nahkampfreichweite des Generals ist, haben General und jene Einheiten Rettung 5+',army:1,src:(S,o)=>ENI(S,o)=='hu_tempel'},
  hu_flugbahn:{n:'Gekrümmte Flugbahn',s:'Passiv: Reichweite und Sichtbarkeit für Fernkampfattacken des Generals dürfen von einem beliebigen Punkt der leewärtigen Kante bestimmt werden',army:1,src:(S,o)=>ENI(S,o)=='hu_flugbahn'},
  hu_leiten:{n:'Die Winde leiten',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12": Zauber 2W6 (6+) → darf sich zurückziehen und danach schießen und angreifen, ohne tödlichen Schaden beim Rückzug (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'hu_leiten'),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Die Winde leiten: Ziel',FL(S,u.o,x=>visW(S,u,x,12)),x=>inCombat(S,x)?mx(x)+50:mx(x));if(!t)return;if(!sp4(G,'Die Winde leiten',6))return;addFx(S,{k:'klaev',u:t.id,exp:'turn'});G.note('Die Winde leiten: '+t.name+' darf sich in diesem Zug zurückziehen, danach schießen und angreifen (kein tödlicher Schaden)')},ai:()=>true},
  hu_sprung:{n:'Sprung in den Sturm',s:'Ende deines Zuges: Nicht im Nahkampf → ganz innerhalb 3" um die leewärtige Kante und >6" von Feinden neu aufstellen (Wirbelwind reiten; wird am Zugende angeboten)',unit:1,src:(S,u)=>hasAb(u,'hu_sprung')},
  hu_wall:{n:'Klingenwall',s:'Beliebige Nahkampfphase: Hat die Einheit nicht angegriffen und ist sie im Nahkampf mit einer Einheit, die angegriffen hat: W6 (+1 gegen Kavallerie), 3+ → Kämpft zuerst (Zug)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'hu_wall'),can:(S,u)=>u.x>=0&&!has(S.T.charged,u.id)&&foes(S,u).some(e=>e.x>=0&&has(S.T.charged,e.id)&&dist(u,e)<=CR),
   *run(G,u){const S=G.S,c=foes(S,u).filter(e=>e.x>=0&&has(S.T.charged,e.id)&&dist(u,e)<=CR),cav=c.some(e=>kw(e,'Kavallerie')),r=d6(S),t=r+(cav?1:0);hdr(G,'Klingenwall',t,t>=3,3,u.name+' kämpft in diesem Zug zuerst','Kein Effekt'+(cav?' (Wurf '+r+' +1 gegen Kavallerie)':''));if(t>=3)addFx(S,{k:'first',u:u.id,exp:'turn'})},ai:()=>true},
  hu_auge:{n:'Auge des Sturms',s:'Passiv: −1 auf Trefferwürfe von Attacken gegen befreundete Einheiten ganz innerhalb 6" um diese Einheit',unit:1,src:(S,u)=>hasAb(u,'hu_auge')},
  hu_winde:{n:'Wirbelwinde',s:'Fernkampfphase: Feind, dem Fernkampfattacken dieser Einheit in dieser Phase Schaden zugewiesen haben: 3+ → Kämpft zuletzt (Zug)',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'hu_winde'),can:(S,u)=>u.x>=0&&dmgdT(S,u).length>0,
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Wirbelwinde: Ziel',dmgdT(S,u).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Wirbelwinde',r,r>=3,3,t.name+' kämpft in diesem Zug zuletzt','Kein Effekt');if(r>=3)add(S.T.SL,t.id)},ai:()=>true},
  // ===== Kastellitenkompanie =====
  kc_befehl:{n:'Befehl des Offizars',s:'Beginn jeder Schlachtrunde: Taktikkarte separat und verdeckt legen. Wird ihr Befehl eingesetzt, kehrt die Karte auf die Hand zurück (derselbe Befehl nicht noch einmal in derselben Phase). Sie zählt nicht zum Handlimit',army:1,src:(S,o)=>trOf(S,o,'kc_befehl')},
  kc_angriff:{n:'Für Sigmar, zum Angriff!',s:'Deine Angriffsphase, 1× pro Schlacht: Befreundete Kavallerie, die in dieser Phase angreift, hat in diesem Zug Kämpft zuerst',ph:4,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='kc_angriff',can:(S,o)=>S.act==o&&fr(S,o).some(x=>kw(x,'Kavallerie')&&!has(S.T.charged,x.id)),
   *run(G,o){G.S.T.kcA=1;G.note('Für Sigmar, zum Angriff!: Kavallerie, die in dieser Phase angreift, kämpft in diesem Zug zuerst')},ai:()=>true},
  kc_disz:{n:'Eisenschmiede-Disziplin',s:'Gegnerische Fernkampfphase, 1× pro Schlacht (Armee): Großkanone, 3+ → darf „Fernkampf“ wie in deiner Fernkampfphase einsetzen',army:1,opp:1,oph:3,when:'start',freq:'battle',src:(S,o)=>RGI(S,o)=='kc_disz',can:(S,o)=>fr(S,o).some(x=>hasAb(x,'kc_muni')&&en(S,o).some(e=>dist(x,e)<=24&&vis(S,x,e))),
   *run(G,o){const S=G.S,r=d6(S);hdr(G,'Eisenschmiede-Disziplin',r,r>=3,3,'Die Großkanone feuert','Kein Effekt');if(r<3)return;const k=fr(S,o).filter(x=>hasAb(x,'kc_muni'))[0];if(!k)return;
    const t=yield* pk(G,o,'Eisenschmiede-Disziplin: Ziel',en(S,o).filter(e=>dist(k,e)<=24&&vis(S,k,e)).map(x=>[lab(x),x]),scE);if(!t)return;yield* attackG(G,k,t,true)},ai:()=>true},
  kc_flasche:{n:'Flasche mit Lethisianischem Dunkelwasser',s:'Einmal pro Schlacht, deine Heldenphase: Heile (W6) deinen General',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='kc_flasche',can:(S,o)=>{const g=genOf(S,o);return !!g&&g.dmg>0&&canHealX(S,g)},
   *run(G,o){const g=genOf(G.S,o),h=d6(G.S);g.dmg=Math.max(0,g.dmg-h);G.note('Flasche mit Lethisianischem Dunkelwasser: '+g.name+' heilt bis zu '+h)},ai:()=>true},
  kc_klinge:{n:'Vererbte Klinge',s:'Passiv: +1 Wucht für das Meisterhafte Langschwert des Generals',army:1,src:(S,o)=>ENI(S,o)=='kc_klinge'},
  kc_flamme:{n:'Heilige Flamme',s:'Ende eines beliebigen Zuges: Freigilden-Stahlhelme in Nahkampfreichweite des Generals: bis zu W3 getötete Modelle zurück',army:1,src:(S,o)=>ENI(S,o)=='kc_flamme'},
  kc_schimmer:{n:'Schimmerling',s:'Passiv: In jeder Phase 1 Treffer-, Verwundungs- oder Schutzwurf des Generals wiederholen',army:1,src:(S,o)=>ENI(S,o)=='kc_schimmer'},
  kc_befehlshaber:{n:'Entschlossener Befehlshaber',s:'Heldenphase: Freigilden-Stahlhelme ganz innerhalb 12": 2+ → Auf die Beine! (nicht im Nahkampf: W3 Modelle zurück) oder Weicht keinen Meter! (+3 Kontrollwert bis zu deinem nächsten Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kc_befehlshaber'),can:(S,u)=>u.x>=0&&fr(S,u.o).some(x=>x.dn=='Freigilden-Stahlhelme (Kastelliten)'&&wholly(x,u,12)),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Entschlossener Befehlshaber: Ziel',FL(S,u.o,x=>x.dn=='Freigilden-Stahlhelme (Kastelliten)'&&wholly(x,u,12)),x=>x.nmax-x.n+mx(x)*.01);if(!t)return;const r=d6(S);hdr(G,'Entschlossener Befehlshaber',r,r>=2,2,t.name+': Option wählen','Kein Effekt');if(r<2)return;
    const can=!inCombat(S,t)&&t.n<t.nmax&&canHealX(S,t);const o=yield* pk(G,u.o,'Entschlossener Befehlshaber: Option',[...(can?[['Auf die Beine! – W3 getötete Modelle zurück','heal']]:[]),['Weicht keinen Meter! – +3 Kontrollwert','ctl']],x=>x=='heal'?2:1);
    if(o=='heal'){const k=Math.min(d3(S),t.nmax-t.n);t.n+=k;G.note('Auf die Beine!: '+t.name+' erhält '+k+' Modell(e) zurück')}else{addFx(S,{k:'ctl',u:t.id,v:3,exp:'own'});G.note('Weicht keinen Meter!: Kontrollwert von '+t.name+' +3 bis zu deinem nächsten Zug')}},ai:()=>true},
  kc_weihen:{n:'Das Land weihen',s:'Bewegungsphase: Beanspruchte eigene Kontrolle, nicht von Feinden beansprucht: 3+ → Ziel geweiht; befreundete Einheiten auf geweihten Zielen haben Rettung 6+',ph:2,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kc_weihen'),can:(S,u)=>u.x>=0&&weihK(S,u).length>0,
   *run(G,u){const S=G.S,ks=weihK(S,u);if(!ks.length)return;const k=ks[0],r=d6(S);hdr(G,'Das Land weihen',r,r>=3,3,'Das Ziel gilt als geweiht','Kein Effekt');if(r>=3){S.weih=S.weih||S.obj.map(()=>null);S.weih[k]=u.o;G.note('Das Land weihen: Das Ziel '+(k+1)+' ist geweiht')}},ai:()=>true},
  kc_ansturm:{n:'Verheerender Ansturm',s:'Beliebige Angriffsphase: Hat die Einheit angegriffen, wähle Feind im Nahkampf mit ihr: 2+ → W3 tödlicher Schaden',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kc_ansturm'),can:(S,u)=>u.x>=0&&has(S.T.charged,u.id)&&foes(S,u).some(e=>e.x>=0&&dist(u,e)<=CR),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Verheerender Ansturm: Ziel',foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Verheerender Ansturm',r,r>=2,2,t.name+': W3 tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,d3(S),'Verheerender Ansturm')},ai:()=>true},
  kc_muni:{n:'Granatenmunition',s:'Passiv: Pro Fernkampf-Fähigkeit wird Kanonenkugel oder Kartätsche gewählt (automatisch: Kartätsche bei Bewegung oder nahen Horden); Kanonenkugel nur ohne Bewegung-Fähigkeit',unit:1,src:(S,u)=>hasAb(u,'kc_muni')},
  // ===== Tzaangor-Kriegsherde =====
  tz_zukunft:{n:'Die Zukunft vorhersagen',s:'Heldenphase: Sieh dir bis zu 3 oberste Taktikkarten an und lege jede in beliebiger Reihenfolge oben auf oder unter das Deck',ph:1,freq:'phase',army:1,src:(S,o)=>trOf(S,o,'tz_zukunft'),can:(S,o)=>S.P[o].deck.length>0,
   *run(G,o){const S=G.S,p=S.P[o],top=[];for(let i=0;i<3&&p.deck.length;i++)top.push(p.deck.pop());const keep=[],bot=[];
    for(const c of top){const i=yield* choice(G,o,'Die Zukunft vorhersagen','Karte '+(top.indexOf(c)+1)+'/'+top.length+': '+TAC[c-1][0]+' – '+TAC[c-1][1],[{t:'Oben auf das Deck'},{t:'Unter das Deck'}],{pref:0});(i==0?keep:bot).push(c)}
    const ord=[];while(keep.length>1){const i=yield* choice(G,o,'Reihenfolge','Welche Karte soll als nächste gezogen werden?',keep.map(c=>({t:TAC[c-1][0]})),{pref:0});ord.push(keep.splice(i,1)[0])}ord.push(...keep);
    p.deck.unshift(...bot);for(let i=ord.length-1;i>=0;i--)p.deck.push(ord[i]);G.note('Die Zukunft vorhersagen: '+ord.length+' Karte(n) oben, '+bot.length+' Karte(n) unten')}},
  tz_betrug:{n:'Das Schicksal betrügen',s:'Reaktion auf den Einsatz eines Befehls: Karte verdeckt unter das Taktikvorhabendeck legen statt abzulegen',army:1,src:(S,o)=>trOf(S,o,'tz_betrug')},
  tz_wandel:{n:'Unaufhörlicher Wandel',s:'Passiv: −1 Wucht für Waffen, die Attacken gegen befreundete Einheiten ausführen, solange du der Außenseiter bist',army:1,src:(S,o)=>RGI(S,o)=='tz_wandel'},
  tz_ritual:{n:'Arkane Ritualisten',s:'Passiv: +1 auf Zauberwürfe des Generals, solange er ganz innerhalb 6" um eine andere befreundete Einheit ist',army:1,src:(S,o)=>RGI(S,o)=='tz_ritual'},
  tz_schlag:{n:'Vorhergesagter Schlag',s:'Gegnerische Bewegungsphase, 1× pro Schlacht: Sichtbare befreundete Einheit ganz innerhalb 12" um den General, nicht im Nahkampf, bewegt sich W6", durch Nahkampfreichweiten, nicht im Nahkampf endend',army:1,opp:1,oph:2,when:'start',freq:'battle',src:(S,o)=>ENI(S,o)=='tz_schlag',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>visW(S,g,x,12)&&!inCombat(S,x))},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Vorhergesagter Schlag: Einheit',FL(S,o,x=>visW(S,g,x,12)&&!inCombat(S,x)),x=>mx(x));if(!t)return;const r=d6(S);rep(G,'Vorhergesagter Schlag',row('W6',[r],0),'Bewegung: bis zu '+r+' Zoll');yield* mvX(G,t,r,'Vorhergesagter Schlag','out')},ai:()=>false},
  tz_falten:{n:'Die Realität falten',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12" um den General: Zauber 2W6 (6+) → neu aufstellen ganz innerhalb 12" um den General, >6" von Feinden',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='tz_falten',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>visW(S,g,x,12))},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Die Realität falten: Ziel',FL(S,o,x=>visW(S,g,x,12)),x=>inCombat(S,x)?mx(x)+50:mx(x));if(!t)return;if(!sp4(G,'Die Realität falten',6,tzb(S,o)))return;
    const px=t.x,py=t.y;t.x=-99;const p=yield* place(G,o,'tzfalt',t,'Die Realität falten','Neu aufstellen: ganz innerhalb von 12 Zoll um den General, mehr als 6 Zoll von allen Feinden',{cancel:true});if(p.cancel){t.x=px;t.y=py;return}t.x=p.x;t.y=p.y;add(S.T.moved,t.id);G.note('Die Realität falten: '+t.name+' wird neu aufgestellt')}},
  tz_hoelle:{n:'Höllentor',s:'Heldenphase: Sichtbarer Feind innerhalb 18" um den General: Zauber 2W6 (5+) → 3 Würfel oder so viele wie abgelegte Taktikkarten, je 4+ → 1 tödlicher Schaden',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='tz_hoelle',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=18&&vis(S,g,e))},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Höllentor: Ziel',en(S,o).filter(e=>dist(g,e)<=18&&vis(S,g,e)).map(x=>[lab(x),x]),scE);if(!t)return;if(!sp4(G,'Höllentor',5,tzb(S,o)))return;const n=Math.max(3,(S.dsc||[0,0])[o]),rs=[];let k=0;for(let i=0;i<n;i++){const r=d6(S);rs.push(r);if(r>=4)k++}rep(G,'Höllentor',row('Würfel (4+)',rs,4),k?t.name+': '+k+' tödlicher Schaden':'Kein Effekt');if(k)mort(G,t,k,'Höllentor')},ai:()=>true},
  tz_mutier:{n:'Mutierende Zauberei',s:'Ende eines beliebigen Zuges: Sichtbarer Feind innerhalb 12" um den General, optional befreundete Tzaangors im Nahkampf mit ihm: W3, 2+ → tödlicher Schaden in Höhe des Wurfs, 1 Modell kehrt zurück',army:1,src:(S,o)=>ENI(S,o)=='tz_mutier'},
  tz_aura:{n:'Mutationsaura',s:'Heldenphase: Sichtbarer Feind innerhalb 18": Zauber 2W6 (7+) → bis zu deinem nächsten Zug 1 tödlicher Schaden je unmodifiziertem Trefferwurf 1 bei Nahkampfattacken des Ziels',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'tz_aura'),can:(S,u)=>u.x>=0&&en(S,u.o).some(e=>dist(u,e)<=18&&vis(S,u,e)),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Mutationsaura: Ziel',en(S,u.o).filter(e=>dist(u,e)<=18&&vis(S,u,e)).map(x=>[lab(x),x]),x=>mx(x)*(x.M?x.M.length:1));if(!t)return;if(!sp4(G,'Mutationsaura',7,tzb(S,u.o)))return;addFx(S,{k:'mutau',u:t.id,exp:'own'});G.note('Mutationsaura: '+t.name+' erleidet bis zu deinem nächsten Zug 1 tödlichen Schaden je Trefferwurf 1 im Nahkampf')},ai:()=>true},
  tz_voll:{n:'Vollstrecker des Schicksals',s:'Passiv: +1 auf Angriffswürfe, solange du der Außenseiter bist',unit:1,src:(S,u)=>hasAb(u,'tz_voll')},
  tz_beute:{n:'Auserkorene Beute',s:'Fernkampfphase: Feind, dem Fernkampfattacken dieser Einheit in dieser Phase Schaden zugewiesen haben: +1 auf Trefferwürfe befreundeter Nahkampfattacken gegen ihn (Zug)',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'tz_beute'),can:(S,u)=>u.x>=0&&dmgdT(S,u).length>0,
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Auserkorene Beute: Ziel',dmgdT(S,u).map(x=>[lab(x),x]),scE);if(!t)return;addFx(S,{k:'hitTm',u:t.id,v:1,exp:'turn'});G.note('Auserkorene Beute: Nahkampfattacken gegen '+t.name+' haben +1 auf Trefferwürfe')},ai:()=>true},
  tz_rauber:{n:'Boshafte Räuber',s:'Passiv: +1 auf Verwundungswürfe, solange die Einheit ganz in feindlichem Territorium ist',unit:1,src:(S,u)=>hasAb(u,'tz_rauber')}
 });
}
// Ziele, denen Fernkampfattacken der Einheit in dieser Phase Schaden zugewiesen haben
const dmgdT=(S,u)=>(S.Ph.shd||[]).filter(k=>k.startsWith(u.id+'>')).map(k=>byId(S,+k.split('>')[1])).filter((x,i,a)=>x&&x.x>=0&&a.indexOf(x)==i);
// Herumwirbelnde Trümmer: Feinde, die näher an der leewärtigen Kante sind als ein großes Geländestück im eigenen Territorium
const truemmerT=(S,o)=>{const k=leeOf(S,o),bg=S.ter.filter(t=>t.big&&into(S,o,t.x,t.y)>0);if(!bg.length)return [];return en(S,o).filter(e=>bg.some(t=>ed(k,e.x,e.y)<ed(k,t.x,t.y)))};
// Das Land weihen: Ziele, die die Einheit beansprucht, die ich kontrolliere und die kein Feind beansprucht
const weihK=(S,u)=>S.obj.map((p,k)=>k).filter(k=>claims(S,u,k)&&S.oc[k]===u.o&&!S.U.some(e=>e.o!=u.o&&e.x>=0&&claims(S,e,k)));
