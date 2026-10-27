// Spielablauf als Generator: Vorbereitung, Runden, Züge, Phasen
import {ARMY,TAC,TWD,REALM,PH,TERSZ,TERK} from './data.js';
import {settings,choice,ask,info} from './game.js';
import {fxL,addFx,usedKey,useKey} from './fx.js';
import {rand,d6,d3,shuffle,range,add,has} from './util.js';
import {newT,newPh,mkUnit,mkUnits,setObj} from './state.js';
import {roundStartAb,runAb,eot,dep2,AB,abUsed,CYC,rsvGlobals,crossAb,perfStreich} from './abil.js';
import {unitFlags} from './abil.js';
import {attackG,depForm,abilities,ONM,autoPile,modW,pileR,phaseSkip,hurt,inCombat,mvOf,ENI,gnl,pileModelErr,pr,obs,hasAb,byId,eligF,sfOK,pileIn,pileErr,reactAtk,attack,actCheck,skill,updCtrl,ctrl,cnm,place,foes,dist,globals,useCard,wnd,mx,AN,RG,RGI,canHeal,isHero,rsvForm,applyMove,mvRest} from './rules.js';
import {CR,W,H,pathPts,plen,terrRoom} from './geom.js';
import {setAbs,abs,inRange} from './models.js';
import {SB_TER,CA_MANOR,CA_START,CA_REL} from './packdata.js';
import {manorOpts,placeRelic} from './ca.js';
import {setPack,PACKN,PACKS} from './packs.js';
import {HK} from './cards.js';
import {CH,destReq,endTac,twVP,twAfter,twRound,applyTw,cmdWindow,doCharge,doRun,doRetreat} from './cards.js';

export function turnStart(S){S.tn++;S.D=[0,0];S.ocs=S.oc.slice();S.T=newT();S.Ph=newPh();if(RGI(S,S.act)=='bg_seg'&&d6(S)>=2)(S.bz||(S.bz=[0,0]))[S.act]++;S.U.forEach(u=>{if(u.x>=0&&hasAb(u,'ms_regen')&&u.dmg>0&&canHeal(S,u))u.dmg=Math.max(0,u.dmg-d3(S))});if(S.K.pack==2&&HK.ts)HK.ts(S)}
const draw1=(S,p)=>{while(p.hand.length-(p.aside||[]).length<3){if(!p.deck.length){p.deck=shuffle(S,p.disc);p.disc=[]}if(!p.deck.length)break;p.hand.push(p.deck.pop())}};

const GA={'Städte Sigmars':'Ordnung','Sturmgeschmiedete Ewige':'Ordnung','Khazalid':'Ordnung','Skaven':'Chaos','Maggotkin des Nurgle':'Chaos','Seelenbrand-Grabesfürsten':'Tod','Höfe der Leichenfresser':'Tod','Nachtspuk':'Tod','Orruk-Kriegsclans':'Zerstörung','Hedoniten des Slaanesh':'Chaos','Ogor-Schlundstämme':'Zerstörung','Behemats Söhne':'Zerstörung','Helschmiede des Hashut':'Chaos','Seraphon':'Ordnung','Klingen des Khorne':'Chaos','Töchter des Khaine':'Ordnung','Mondwahn-Gits':'Zerstörung','Himmelsherrscher der Kharadron':'Ordnung','Lichtfürsten der Lumineth':'Ordnung','Jünger des Tzeentch':'Chaos','Knochenlegionen der Ossiarch':'Tod','Sylvaneth':'Ordnung','Sklaven der Finsternis':'Chaos','Tiefenvolk der Idoneth':'Ordnung'};
export function* flow(G){
 const S=G.S,K=S.K;
 S.P.forEach(p=>{p.deck=shuffle(S,range(12))});
 setPack(0);
 const st=yield* settings(G,'Spielstart','Voreinstellungen bestätigen oder ändern.',[
  {n:'Battlepack',def:0,opts:PACKN.map((t,i)=>({t,s:PACKS[i]}))},
  // Option „Schlachtrunden-Infos“ (Nein/Ja) ist im Startmenü ausgeblendet, K.rinfo bleibt im Code erhalten (hier auf true setzen oder wieder ins Menü aufnehmen)
  {n:'Aufstellung',def:0,opts:[{t:'Manuell'},{t:'Zufällig',s:'Deine Einheiten werden nach allen Regeln zufällig aufgestellt.'}]}]);
 K.pack=st[0];K.pile=true;K.rres=false;K.rinfo=false;K.rdep=st[1]==1;
 setPack(K.pack);
 const i=yield* choice(G,0,'Armee wählen','Dein Gegner (Computer) spielt eine andere Armee.',ARMY.map(a=>({t:a.n,f:a.f,ga:GA[a.f]||'Ordnung',s:a.units.map(d=>d.n).join(' · ')})),{car:1});
 K.army=[i,(i+1+Math.floor(rand(S)*(ARMY.length-1)))%ARMY.length];mkUnits(S);
 yield* prebattle(G);
 S.stage=1;updCtrl(S);S.ocs=S.oc.slice();
 yield* battle(G)}

function* prebattle(G){const S=G.S,K=S.K;let a,b;do{a=d6(S);b=d6(S)}while(a==b);
 const blocks=[{k:'txt',s:'Du'},{k:'row',l:'',v:[a]},{k:'txt',s:'Computer'},{k:'row',l:'',v:[b]}];let at;
 if(a>b){const i=yield* choice(G,0,'1. Würfelduell','Du gewinnst und wählst deine Rolle.',[{t:'Angreifer'},{t:'Verteidiger'}],{blocks});at=i==0?0:1}
 else{yield* info(G,0,'1. Würfelduell','Der Computer gewinnt und wird Angreifer.','Weiter',{blocks});at=1}
 K.att=at;K.def=1-at;
 yield* pickReg(G,K.att);yield* pickReg(G,K.def);
 K.realm=yield* choice(G,K.def,'3. Schlachtfeldseite',K.pack>=1?'Verteidiger wählt das Schlachtfeld:':'Verteidiger wählt die Seite des Reichs:',(K.pack==1?['Dolorum','Ossia']:K.pack==2?['Ashen Bastion','Shattered Crossroads']:REALM).map(t=>({t})));K.twist=shuffle(S,range(6));
 const m=yield* choice(G,K.def,'4. Aufstellungskarte','Verteidiger wählt die Karte:',[{t:'Horizontal'},{t:'Diagonal'}]);
 const t=yield* choice(G,K.def,'4. Territorium','Welches Gebiet gehört dir?',[{t:'Gebiet A (oben'+(m?(K.pack>=1?' rechts)':' links)'):')')},{t:'Gebiet B (unten'+(m?(K.pack>=1?' links)':' rechts)'):')')}]);
 K.map=m;K.dg=K.pack>=1&&m?1:0;K.terr=K.def==0?[t,1-t]:[1-t,t];setObj(S);
 yield* terrain(G);yield* deploy(G)}
function* pickReg(G,o){const S=G.S,A=ARMY[S.K.army[o]];
 const op=x=>({t:x[0],s:x[1]+(x[2]?'':'<br><i>(noch ohne Wirkung)</i>')});
 S.K.reg[o]=yield* choice(G,o,'2. Regimentsfähigkeit ('+S.P[o].n+')','Wähle:',A.reg.map(op));
 S.K.enh[o]=yield* choice(G,o,'2. Verbesserung des Generals ('+S.P[o].n+')','Wähle:',A.enh.map(op))}
function* terrain(G){const S=G.S,K=S.K;
 if(K.pack==1)return yield* terrainSB(G);
 if(K.pack==2)return yield* terrainCA(G);
 yield* infoR(G,0,'5. Gelände aufstellen',`Reich: ${REALM[K.realm]} · Karte: ${K.map?'diagonal':'horizontal'}<br>Verteidiger (${S.P[K.def].n}) beginnt: je 1 großes und 1 kleines Gelände, dann der Angreifer. Ganz im eigenen Gebiet, mehr als 6 Zoll zu anderem Gelände, mehr als 3 Zoll zu den langen Kanten und zum Feindgebiet, nicht auf Zielen. Gelände lässt sich frei drehen.`,'Los');
 for(const [o,big] of [[K.def,1],[K.def,0],[K.att,1],[K.att,0]]){
  {const [w0,h0]=TERSZ[big?'big':'small'],g0=terrRoom(S,o,w0,h0);if(g0<6)G.note('Kein Platz mit 6 Zoll Abstand – Abstand zu anderem Gelände auf '+g0+' Zoll gelockert')}
  const a=yield* place(G,o,'terr',{big},'Gelände',`Gelände (${big?'groß':'klein'}): Mittelpunkt antippen, mit ↺ ↻ drehen`);
  const [w,h]=TERSZ[big?'big':'small'];S.ter.push({x:a.x,y:a.y,w,h,a:a.a||0,big:!!big,...TERK[big?'big':'small']})}}
const SBG={A:['Large Wall','Small Fence'],B:['Small Wall','Large Fence']};
function* terrainSB(G){const S=G.S,K=S.K;
 if(K.realm==1){const c=SB_TER['Crypt of Blood'];S.ter.push({x:W/2,y:H/2,w:c.w,h:c.h,a:Math.atan2(H,W),big:true,k:c.k,ht:c.ht,my:'crypt',nm:'Crypt of Blood'})}
 const gi=yield* choice(G,K.def,'5. Geländegruppe','Verteidiger wählt eine Geländegruppe, der Angreifer erhält die andere:',[{t:'Gruppe A',s:'Large Wall + Small Fence'},{t:'Gruppe B',s:'Small Wall + Large Fence'}]);
 const grp=[gi?SBG.B:SBG.A,gi?SBG.A:SBG.B];
 yield* infoR(G,0,'5. Gelände aufstellen',`Schlachtfeld: ${K.realm?'Ossia':'Dolorum'} · Karte: ${K.map?'diagonal':'horizontal'}<br>Verteidiger (${S.P[K.def].n}) erhält ${grp[0].join(' + ')}, Angreifer (${S.P[K.att].n}) ${grp[1].join(' + ')}. Je 1 großes und 1 kleines Gelände ganz im eigenen Gebiet, mehr als 6 Zoll zu anderem Gelände, mehr als 3 Zoll zu den langen Kanten und zum Feindgebiet, nicht auf Zielen.${K.realm?'<br>In der Mitte steht die Crypt of Blood.':''}<br><small>Geländemaße geschätzt (Modellfotos).</small>`,'Los');
 for(const [o,gr,big] of [[K.def,0,1],[K.def,0,0],[K.att,1,1],[K.att,1,0]]){
  const nmT=grp[gr].find(n=>SB_TER[n].big==!!big),d=SB_TER[nmT];
  {const g0=terrRoom(S,o,d.w,d.h);if(g0<6)G.note('Kein Platz mit 6 Zoll Abstand – Abstand zu anderem Gelände auf '+g0+' Zoll gelockert')}
  const a=yield* place(G,o,'terr',{big:!!big,w:d.w,h:d.h,name:nmT,a0:K.map?Math.atan2(H,W):0},'Gelände',`${nmT}: Mittelpunkt antippen, mit ↺ ↻ drehen`);
  S.ter.push({x:a.x,y:a.y,w:d.w,h:d.h,a:a.a||0,big:!!big,k:d.k,ht:d.ht,nm:nmT})}}
function* terrainCA(G){const S=G.S,K=S.K,{len,th,ht}=CA_MANOR;S.man=[null,null];
 yield* infoR(G,0,'5. Gelände aufstellen',`Schlachtfeld: ${K.realm?'Shattered Crossroads':'Ashen Bastion'} · Karte: ${K.map?'diagonal':'horizontal'}<br>Verteidiger (${S.P[K.def].n}) beginnt: je ein Ruined Manor (großes Gelände: Deckung, instabil) ganz im eigenen Gebiet auf eine Ecke eines rechteckigen Ziels. Ziele mit Gelände darauf sind befestigt: Einheiten, deren Modelle alle darauf stehen, haben Deckung.<br>Danach stellt jeder eine Start-Reliquie im eigenen Gebiet auf.<br><small>Manor-Grundriss geschätzt (L-Form, je 4" Mauer, immer innerhalb des Ziels; bei Platznot gekürzt).</small>`,'Los');
 for(const o of [K.def,K.att]){const op=manorOpts(S,o,len,th);if(!op.length){G.note('Kein gültiger Platz für das Ruined Manor ('+S.P[o].n+')');continue}
  const i=yield* choice(G,o,'5. Ruined Manor ('+S.P[o].n+')','Auf welche Zielecke im eigenen Gebiet?',op.map(x=>({t:x.t})),{bar:'Ruined Manor: Zielecke wählen'});const c=op[i];
  c.P.forEach((q,j)=>S.ter.push({...q,big:true,k:'obst',ht,nm:'Ruined Manor',fid:o,man:o}));S.man[o]=S.ter.find(t=>t.fid===o);if(!S.fort.includes(c.k))S.fort.push(c.k)}
 const st=CA_START[K.realm?'Shattered Crossroads':'Ashen Bastion'];S.rel0=[null,null];
 const i=yield* choice(G,K.def,'6. Start-Reliquie ('+S.P[K.def].n+')','Verteidiger wählt eine Start-Reliquie und stellt sie ganz im eigenen Gebiet auf:',st.map(n=>({t:n,s:CA_REL[n]})));
 S.rel0[K.def]=yield* placeRelic(G,K.def,st[i],true);S.rel0[K.att]=yield* placeRelic(G,K.att,st[1-i],true)}
function* infoR(G,...a){if(G.S.K.rinfo)yield* info(G,...a)}
// Zufällige Aufstellung nach allen Regeln: Zufallspunkt, an dem auch alle übrigen Einheiten noch Platz finden
function randDep(S,o,u,rem){
 const cand=[];for(let x=.5;x<W;x+=.5)for(let y=.5;y<H;y+=.5)if(!placeErr(S,'dep',o,u,x,y,0))cand.push([x,y]);
 shuffle(S,cand);const rs=rem.filter(q=>q.M);
 const put=(v,x,y)=>{const Pf=depForm(S,o,v,x,y);if(Pf)setAbs(v,Pf);else{v.x=x;v.y=y}};
 const fits=(x,y)=>{if(!rs.length)return true;const us=[u,...rs],sv=us.map(v=>({x:v.x,y:v.y,r:v.r,M:v.M.map(m=>({...m}))}));
  try{put(u,x,y);for(const v of rs){let ok=false;for(let gx=.5;gx<W&&!ok;gx+=1)for(let gy=.5;gy<H&&!ok;gy+=1)if(!placeErr(S,'dep',o,v,gx,gy,0)){put(v,gx,gy);ok=true}if(!ok)return false}return true}finally{us.forEach((v,i)=>{v.x=sv[i].x;v.y=sv[i].y;v.r=sv[i].r;v.M=sv[i].M})}};
 for(const [x,y] of cand.slice(0,40))if(fits(x,y))return {x,y};
 return cand.length?{x:cand[0][0],y:cand[0][1]}:null}
function* deploy(G){const S=G.S,K=S.K;
 yield* infoR(G,0,'6. Aufstellung',`Der Angreifer (${S.P[K.att].n}) stellt seine Armee zuerst auf, dann der Verteidiger. Ganz im eigenen Gebiet, mehr als 6 Zoll vom Feindgebiet (gestrichelte Linie).`,'Los');
 for(const o of [K.att,K.def]){
  if(ARMY[K.army[o]].tunnel){const l=S.U.filter(u=>u.o==o&&!u.amb&&!u.rsv).map(u=>[u.name+(u.c>1?' ('+u.id+')':''),u]);const t=yield* ask(G,o,'Die lauernde Rattenschar',[...l,['Keine Einheit',null]],'Eine Einheit in Reserve (Tunnel) stellen? Sie kommt per Nagloch-Überfall (Bewegungsphase) bis 6" von einer Ecke, mehr als 9" von Feinden. Wird sie bis Ende von Runde 3 nicht aufgestellt, ist sie zerstört.');if(t){t.rsv='corner';t.rr=1;t.tun=1}}
  const DL=S.U.filter(u=>u.o==o&&!u.amb&&!u.rsv);if(G.isAI(o))DL.sort((a,b)=>b.r*b.n-a.r*a.n);
  for(const u of DL){
  const rp=K.rdep&&!G.isAI(o)?randDep(S,o,u,DL.slice(DL.indexOf(u)+1)):null;const a=rp||(yield* place(G,o,'dep',u,'Aufstellen',`Aufstellen: ${u.name} (antippen)`));const Pf=depForm(S,o,u,a.x,a.y);if(Pf)setAbs(u,Pf);else{u.x=a.x;u.y=a.y}}}
 yield* depAbil(G)}

function* battle(G){const S=G.S;let f=true;
 while(!S.over){
  yield* startRound(G,f);f=false;
  for(let k=0;k<2&&!S.over;k++){if(k==1){S.act=1-S.first;turnStart(S)}yield* turn(G)}
  if(S.over)return;
  if(S.round==3)S.U.filter(u=>u.tun&&u.rsv&&u.x<0).forEach(u=>{G.note(u.name+' ist in den Tunneln verloren (Ende Runde 3) und wird zerstört');hurt(G,u,mx(u))});
  if(S.over)return;
  twRound(G);
  if(S.round==4){S.over=true;const v=S.P[0].vp,w=S.P[1].vp;S.winner=v==w?-1:(v>w?0:1);G.msg('Spielende',[{k:'txt',s:`${v==w?'Unentschieden':S.P[v>w?0:1].n+' gewinnt'} (${v}:${w}).`}]);return}
  S.round++}}

function* startRound(G,f){const S=G.S,P=S.P,K=S.K;
 const u=P[0].vp<P[1].vp?0:P[1].vp<P[0].vp?1:-1,pf=S.first;S.ud=u;S.rd=[0,0];
 let w,t;
 if(f){w=K.att;t=`Der Angreifer (${K.att?'Computer':'du'}) wählt den ersten Zug.`}
 else{const a=d6(S),b=d6(S);w=a==b?S.first:(a>b?0:1);G.msg('Prioritätswurf',[{k:'txt',s:'Du'},{k:'row',l:'',v:[a]},{k:'txt',s:'Computer'},{k:'row',l:'',v:[b]}]);t=`${w?'Computer entscheidet':'Du entscheidest'}.`}
 const i0=yield* choice(G,w,'Schlachtrunde '+S.round,t+'<br>Wer beginnt?',[{t:'Ich beginne'},{t:'Gegner beginnt'}],{pref:0});
 const first=i0==0?w:1-w;S.first=first;S.act=first;
 const sz=!f&&first!=pf,dv=Math.abs(P[0].vp-P[1].vp),dr=i=>!(sz&&i==first&&!(u==i&&dv>=5));
 turnStart(S);cycStep(G);K.tw=K.twist.pop();
 yield* info(G,0,'Wendungskarte – Schlachtrunde '+S.round,`Zu Beginn der Schlachtrunde wird die Wendungskarte aufgedeckt (vor dem Nachziehen der Taktikkarten):<br><b>${TWD[K.realm][K.tw-1][1]}</b><small>${TWD[K.realm][K.tw-1][2]}</small>`,'Weiter');
 yield* applyTw(G,u);yield* roundStartAb(G);
 for(const i of [0,1]){if(f||!dr(i)||G.isAI(i))continue;
  while(P[i].hand.length){const h=P[i].hand;const k=yield* choice(G,i,'Taktikkarten ablegen?','Du darfst beliebig viele Karten offen ablegen, bevor du nachziehst.',[...h.map(c=>({t:'Ablegen: '+TAC[c-1][0]})),{t:'Fertig – nachziehen'}],{pref:h.length});if(k==h.length)break;const c=h[k];h.splice(k,1);P[i].disc.push(c)}}
 P.forEach((p,i)=>{if(dr(i))draw1(S,p)});
 for(const i of [0,1]){if(!dr(i)||ENI(S,i)!='sd_ritual'||!gnl(S,i))continue;const p=P[i];if(!p.deck.length){p.deck=shuffle(S,p.disc);p.disc=[]}if(!p.deck.length)continue;p.hand.push(p.deck.pop());const h=p.hand.filter(c=>!(p.aside||[]).includes(c));let pr=0;h.forEach((c,j)=>{if(!CH[c]||!CH[c](S,i))pr=j});const k=G.isAI(i)?pr:yield* choice(G,i,'Grausamer Ritualist','Du hast 1 zusätzliche Taktikkarte gezogen. Lege 1 Karte deiner Hand unter dein Deck:',h.map(c=>({t:'Unter das Deck: '+TAC[c-1][0],s:TAC[c-1][1]})),{pref:pr});const c=h[k];p.hand.splice(p.hand.indexOf(c),1);p.deck.unshift(c);G.note('Grausamer Ritualist ('+(i?'Computer':'Du')+'): zusätzliche Karte gezogen, 1 Karte unter das Deck gelegt')}
 if(S.round==1)[0,1].forEach(o=>{if(ENI(S,o)=='ss_vorrat'){S.kes[o]=1;G.note('Gut bestückte Vorratskammer: Der Fleischerkessel ist voll')}});
 yield* infoR(G,0,'Schlachtrunde '+S.round,`1. ${t.replace(/<br>.*/,'')}<br>2. ${u>=0?(u?'Computer ist':'Du bist')+' Außenseiter (+1 BP)':'Kein Außenseiter'}<br>3. Wendungskarte: ${TWD[K.realm][K.tw-1][1]} (s. o.)<br>4. Taktikkarten gezogen${sz?' (Initiative an sich gerissen)':''}<br>5. Keine Fähigkeiten zu Beginn der Schlachtrunde<br>Kontrolle: du ${cnm(S,0)||'keins'}, Computer ${cnm(S,1)||'keins'}`,'Los');
 if(S.round==1)yield* mudCover(G)}

function cycStep(G){const S=G.S;if(!S.cyc)S.cyc=[0,0];
 [0,1].forEach(o=>{if(AN(S,o)!='Seuchenzelle')return;
  if(S.round==1){let r=d6(S);while(r>=5)r=d6(S);S.cyc[o]=r}else S.cyc[o]=S.cyc[o]%4+1;
  G.note('Zyklus der Korrumpierung ('+(o?'Computer':'Du')+'): '+CYC[S.cyc[o]-1])})}
// Fenster der nicht aktiven Seite (Fähigkeiten in gegnerischen Phasen)
function* oppWindow(G,when){const S=G.S,o=1-S.act;
 for(const [id,a] of Object.entries(AB)){if(!a.opp||a.oph!==S.ph||a.when!==when||!a.src(S,o)||abUsed(S,null,id,o)||(a.can&&!a.can(S,o)))continue;
  const y=G.isAI(o)?(a.ai(S,o)?0:1):yield* choice(G,o,a.n,a.s+' – einsetzen?',[{t:'Einsetzen'},{t:'Nicht einsetzen'}],{pref:1});
  if(y==0)yield* runAb(G,id,null,o)}}
// Fähigkeiten der Aufstellungsphase (nach der Aufstellung beider Armeen)
function* depAbil(G){const S=G.S,K=S.K;
 for(const o of [K.att,K.def]){
  yield* dep2(G,o);
  if(RGI(S,o)=='kampf'){const l=S.U.filter(u=>u.o==o&&u.x>=0&&!/Monster/.test(u.kw)).map(u=>[u.name+(u.c>1?' ('+u.id+')':''),u]);
   const t=l.length?yield* ask(G,o,'Kampfeslustig',[...l,['Keine Einheit',null]],'1× pro Schlacht: Eine Nicht-Monster-Einheit darf jetzt eine Normale Bewegung ausführen.'):null;
   if(t){useKey(S,o+':kampf','battle');const a=yield* destReq(G,t,mvOf(S,t),{text:'Kampfeslustig'});if(!a.stay)applyMove(S,t,a,mvOf(S,t))}}
  if(RGI(S,o)=='suehn'){const l=S.U.filter(u=>u.o!=o&&u.x>=0).map(u=>[u.name+(u.c>1?' ('+u.id+')':''),u]);
   const t=l.length?yield* ask(G,o,'Den Groll sühnen',[...l,['Keine Einheit',null]],'1× pro Schlacht: Feind-Einheit wählen, die „vom Groll betroffen“ ist. Befreundete Infanterie wiederholt Trefferwürfe von 1 im Nahkampf gegen sie.'):null;
   if(t){useKey(S,o+':suehn','battle');t.grd=o;G.note('Den Groll sühnen: '+t.name+' ist vom Groll betroffen')}}}}
function* mudCover(G){const S=G.S;
 for(const o of [S.K.att,S.K.def]){if(RG(S,o)!='Schlammbedeckt')continue;
  const t=yield* ask(G,o,'Schlammbedeckt',S.U.filter(u=>u.o==o&&u.x>=0).map(u=>[u.name+(u.c>1?' ('+u.id+')':''),u]),'Wähle eine Einheit: Für Feinde, die weiter als 12 Zoll entfernt sind, ist sie in dieser Schlacht nicht sichtbar.');
  if(t){t.mud=1;G.note('Schlammbedeckt: '+t.name+' ist für Feinde über 12 Zoll nicht sichtbar')}}}
function* oppMove(G){const S=G.S,o=1-S.act;if(!AB.drei.src(S,o))return;
 const l=S.U.filter(u=>u.o==o&&u.x>=0&&!inCombat(S,u)&&!fxL(S,u,'nomove').length);if(!l.length)return;
 const t=yield* ask(G,o,'Immer drei Klauenschritte voraus',[...l.map(u=>[u.name,u]),['Keine',null]],'Einheit wählen, die sich jetzt normal bewegen darf (1× in dieser Phase)');
 if(!t)return;const a=yield* destReq(G,t,mvOf(S,t),{text:'Immer drei Klauenschritte voraus'});if(!a.stay)applyMove(S,t,a,mvOf(S,t))}
const PHN=['Aufstellung','Heldenphase','Bewegungsphase','Fernkampfphase','Angriffsphase','Nahkampfphase','Zugende'];
const snapOf=S=>({u:S.U.map(u=>[u.id,u.n,wnd(u)]),vp:[S.P[0].vp,S.P[1].vp],oc:S.oc.slice(),fl:Object.fromEntries(S.U.filter(u=>u.x>=0).map(u=>[u.id,unitFlags(S,u).map(f=>f.t)]))});
const gu=(S,id)=>byId(S,id)||S.GY.find(x=>x.id==id);
function sumLines(S,s0,ev,D,ph){const L=[],o=u=>u.o?'Computer':'Du',nmU=id=>{const u=gu(S,id);return u?`<b>${u.name}</b> (${o(u)})`:'?'};
 if(ph!=1){s0.u.forEach(([id,n0])=>{const u=gu(S,id);if(!u||u.n>=n0)return;L.push(`${nmU(id)}: <b>−${n0-u.n} Modell${n0-u.n>1?'e':''}</b>${u.n<=0?' – zerstört':''}`)});return L}
 const agg={};D.forEach(r=>{const k=(r.a!=null?'u'+r.a:'s'+(r.s||''))+'>'+r.t,e=agg[k]||(agg[k]={a:r.a,s:r.s,t:r.t,d:0,l:0});e.d+=r.d;e.l+=r.l});
 Object.values(agg).filter(e=>e.d>0).forEach(e=>{const src=e.a!=null?nmU(e.a):(e.s?'<i>'+e.s+'</i>':'Effekt');L.push(`${src} → ${nmU(e.t)}: <b>${e.d} Schaden</b>${e.l?', '+e.l+' Modell'+(e.l>1?'e':'')+' verloren':''}`)});
 s0.u.forEach(([id,n0,w0])=>{const u=gu(S,id);if(!u)return;if(n0>0&&u.n<=0)L.push(`${nmU(id)} <b>zerstört</b>`);else if(wnd(u)>w0&&u.n>=n0)L.push(`${nmU(id)}: ${wnd(u)-w0} Wunde(n) geheilt`)});
 S.U.filter(u=>u.x>=0).forEach(u=>{const old=s0.fl[u.id]||[];unitFlags(S,u).filter(f=>!old.includes(f.t)).forEach(f=>L.push(`${nmU(u.id)}: ⚑ ${f.d}`))});
 [0,1].forEach(i=>{const d=S.P[i].vp-s0.vp[i];if(d)L.push(`Siegpunkte ${o({o:i})}: ${d>0?'+':''}${d}`)});
 S.oc.forEach((c,k)=>{if(c!==s0.oc[k])L.push(`Ziel ${ONM(S)[k]}: ${c<0?'niemand':c?'Computer':'Du'} kontrolliert`)});
 const seen=new Set();ev.forEach(t=>{if(/ wählt: /.test(t)||seen.has(t))return;seen.add(t);L.push(t)});return L.slice(0,24)}
function* preFight(G){const S=G.S;if(S.Ph.pre)return;S.Ph.pre=1;
 for(const o of [S.act,1-S.act]){if(G.isAI(o))continue;
  for(;;){const L=[];S.U.filter(u=>u.o==o&&u.x>=0).forEach(u=>abilities(S,u).filter(x=>(x.k=='ab:bd_leg'||x.k=='fa')&&!x.dis).forEach(x=>L.push([u,x])));
   if(!L.length)break;
   const i=yield* choice(G,o,'Vor dem Kampf','Fähigkeiten, die vor dem ersten Kampf der Nahkampfphase genutzt werden (danach nicht mehr):',[...L.map(([u,x])=>({t:x.t+': '+u.name,s:x.s})),{t:'Weiter zum Kampf'}],{pref:L.length});
   if(i==L.length)break;const [u,x]=L[i];
   if(x.k=='fa')yield* doAction(G,{a:'fa',u:u.id});else yield* runAb(G,x.k.slice(3),u,o)}}}
function* turn(G){const S=G.S;
 for(let ph=0;ph<=6&&!S.over;ph++){
  S.ph=ph;S.Ph=newPh();G.emit({t:'phase'});const s0=snapOf(S);G.phEv=[];G.phD=[];
  if(ph>0)yield* cmdWindow(G);
  if(ph==5&&HK.ph5)HK.ph5(G);
  if(ph==1||ph==2)yield* oppWindow(G,'start');
  if(ph==2)yield* oppMove(G);
  if(ph==2&&!S.over)yield* autoReinf(G);
  const sk=ph>=1&&ph<=5&&!S.over?phaseSkip(S):'';
  if(sk)G.tray(S.P[S.act].n+': '+PHN[ph]+' übersprungen',[{k:'txt',s:sk}]);
  while(!S.over&&!sk){const a=yield {t:'act',who:S.act,check:a=>actCheck(S,S.act,a)};
   if(a.a=='next'){if(S.ph==5&&!S.Ph.fs.done){yield* preFight(G);yield* fights(G);continue}break}
   yield* doAction(G,a)}
  if(!S.over)yield* autoLate(G);
  if(ph==3&&!S.over)yield* oppWindow(G,'end');
  G.phEv=null;G.phD=null}
 if(!S.over)yield* endTurn(G)}

export function* fights(G){const S=G.S,fs=S.Ph.fs;fs.on=true;fs.done=false;fs.who=S.act;
 const pk=o=>eligF(S,o).filter(x=>sfOK(S,x));
 while(!S.over){if(fs.bote&&!pk(fs.who).some(x=>x.dn=='Dämonetten')){fs.bote=0;fs.who=1-fs.who}
  let w=fs.who;
  if(!pk(w).length){w=1-w;if(!pk(w).length){fs.on=false;fs.done=true;G.note('Nahkampf abgeschlossen – weiter mit „Weiter“');return}}
  fs.who=w;
  const a=yield {t:'fight',who:w,check:a=>{if(!a)return 'Ungültig';if(a.a=='cmdwin')return '';if(a.a&&a.a.startsWith('ab:'))return a.a=='ab:bd_leg'&&!G.isAI(w)?'Nur vor dem ersten Kampf':actCheck(S,w,a);const u=byId(S,a.u);
   if(a.a!='fight'||!u||!pk(w).includes(u))return 'Diese Einheit kann jetzt nicht kämpfen';
   if(fs.bote&&u.dn!='Dämonetten')return 'Boten der Entehrung: Als zweite Einheit muss eine Dämonetten-Einheit kämpfen';
   const inr=foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR),only=fxL(S,u,'only').filter(f=>inr.some(e=>e.id==f.v));
   if(only.length&&a.t!=null&&a.t!=only[0].v)return 'Kopfjäger: Alle Attacken müssen den gewählten Helden zum Ziel haben';if(only.length&&(a.d||a.split))return 'Kopfjäger: keine Verteilung möglich';
   if(a.d){const ks=Object.keys(a.d);if(!ks.length||ks.some(k=>!inr.includes(byId(S,+k))||!Number.isFinite(a.d[k])||a.d[k]<0)||ks.reduce((q,k)=>q+a.d[k],0)<=0)return 'Ungültige Verteilung'}
   if(a.split)return inr.length>=2?'':'Keine Verteilung möglich';
   if(a.t==null)return inr.length?'Ziel wählen':'';const t=byId(S,a.t);return t&&t.o!=w&&inr.includes(t)?'':'Ziel nicht in Nahkampfreichweite'}};
  if(a.a=='cmdwin'){yield* cmdWindow(G);continue}
  if(a.a.startsWith('ab:')){yield* runAb(G,a.a.slice(3),a.u!=null?byId(S,a.u):null,w);continue}
  const u=byId(S,a.u);let t=a.t!=null?byId(S,a.t):null;add(S.T.fought,u.id);let dmap=a.d||null,pre=null;
  if(fs.sec&&RGI(S,w)=='sp_reflex'){addFx(S,{k:'svP',u:u.id,v:1,exp:'ph'});G.note('Verbesserte Reflexe: '+u.name+' +1 auf Schutzwürfe bis Phasenende')}
  {const oz=fxL(S,u,'only').filter(f=>foes(S,u).some(e=>e.x>=0&&e.id==f.v&&dist(u,e)<=CR));if(!t&&oz.length)t=byId(S,oz[0].v)}
  let perf=false;if(t&&hasAb(u,'lu_besch')&&!dmap&&!a.split)perf=G.isAI(w)?(wnd(t)<=3*(u.M?inRange(u,t,CR):1)*1.2):(yield* choice(G,w,'Schwertmeister','Profil für '+u.name+' wählen:',[{t:'Schlaghagel',s:'Normales Waffenprofil'},{t:'Perfekter Streich',s:'Je Attacke 2+ → 1 tödlicher Schaden'}],{pref:0}))==1;
  if(u.gen&&ENI(S,w)=='ep_anm'&&has(S.T.charged,u.id)){const x=d6(S);(S.T.pex||(S.T.pex={}))[u.id]=x;G.note('Verzerrte Anmut: Nachrücken +'+x+' Zoll')}
  if(a.split){const inr=foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR);pre={};const rolls=[];
   u.mw.forEach((w0,wi)=>{const w=modW(S,u,w0,inr[0],0),at=w[2];if(typeof at!='string')return;const q=/^(\d?)W(\d)(?:\+(\d+))?$/.exec(at),ex=+q[3]||0,av=Math.max(...inr.map(e=>u.M?inRange(u,e,CR):u.n)),mn=w[8]==null?av:Math.min(w[8],av),ar=[];for(let k=0;k<(+q[1]||1)*mn;k++)ar.push((q[2]=='3'?d3(S):d6(S))+ex);pre[wi]=ar;rolls.push({n:w0[0],at,v:ar})});
   const sp=yield {t:'split',who:w,u:u.id,inr:inr.map(e=>e.id),rolls,check:x=>{if(!x||!x.d)return 'Ungültig';const ks=Object.keys(x.d);return ks.length&&ks.every(k=>inr.some(e=>e.id==+k)&&Number.isFinite(x.d[k])&&x.d[k]>=0)&&ks.reduce((q,k)=>q+x.d[k],0)>0?'':'Ungültige Verteilung'}};
   dmap=sp.d;const ids=Object.keys(dmap).filter(k=>dmap[k]>0);t=byId(S,+ids.reduce((x,y)=>dmap[x]>=dmap[y]?x:y))}
  if(t){if(S.K.pile){if(G.isAI(w)){const pm=pileIn(S,u,t);if(pm)G.note('Nachrücken: '+pm.toFixed(1)+' Zoll')}
   else{const P=autoPile(S,u,t);if(P){setAbs(u,P.map(p=>({x:+p[0],y:+p[1]})));G.note('Nachrücken: '+u.name)}}}yield* reactAtk(G,u,t,0);
   const dd=dmap?Object.keys(dmap).map(Number).filter(i=>dmap[i]>0):null;
   if(dd&&dd.length>1){const tot=dd.reduce((q,i)=>q+dmap[i],0);let c=0;G.note('Angriffsverteilung: '+dd.map(i=>(byId(S,i)||{name:'?'}).name+' '+Math.round(dmap[i]/tot*100)+' %').join(' · '));
    for(const i of dd){const tt=byId(S,i),lo=c/tot;c+=dmap[i];if(tt&&S.U.includes(tt)&&S.U.includes(u))yield* attackG(G,u,tt,0,[lo,c/tot],pre)}}
   else if(S.U.includes(t)&&S.U.includes(u)){if(perf)perfStreich(G,u,t);else yield* attackG(G,u,t,0)}}
  if(has(S.T.dbl,u.id)&&S.U.includes(u)){if(has(S.T.dm,u.id)){const d=d3(S);G.note('Grind Them to Dust: '+u.name+' erleidet '+d+' tödlichen Schaden');hurt(G,u,d)}S.T.dbl.splice(S.T.dbl.indexOf(u.id),1);S.T.fought.splice(S.T.fought.indexOf(u.id),1);add(S.T.SL,u.id);G.note('Urteil verhängen: '+u.name+' kämpft ein zweites Mal (zuletzt)')}
  if(fs.bote){fs.bote=0;fs.who=1-w}
  else if(RGI(S,w)=='ep_bote'&&u.dn=='Dämonetten'&&pk(w).some(x=>x.dn=='Dämonetten')){fs.bote=1;fs.who=w;G.note('Boten der Entehrung: Eine zweite Dämonetten-Einheit kämpft unmittelbar danach')}
  else if(AN(S,w)=='Strahlende Phalanx'&&(S.fac||[])[w]==2&&!fs.sec&&pk(w).length&&S.U.includes(u)){fs.sec=1;fs.who=w;G.note('Überlegene Reaktionen: Du wählst eine zweite Einheit')}
  else{fs.sec=0;fs.who=1-w}}}

// Verstärkung: automatisch zu Beginn der eigenen Bewegungsphase für jede vollständig entfernte Einheit mit Verstärkung (einmalig je Einheit)
// Spätere Aufstellungen (Reserven, Hinterhalt) werden am Ende der passenden Phase automatisch angeboten; Abbrechen lässt die Einheit in Reserve
function* autoLate(G){const S=G.S,o=S.act,seen=new Set();
 for(;;){if(S.over)return;const g=globals(S,o).find(g=>(g.k.startsWith('rsv:')||g.k=='amb')&&!seen.has(g.k));if(!g)return;seen.add(g.k);
  if(!G.isAI(o)){const u=g.k=='amb'?S.U.find(x=>x.o==o&&x.amb&&x.x<0):byId(S,+g.k.slice(4));G.note((u?u.name:g.t)+' kann jetzt aufs Schlachtfeld – Position antippen oder „Abbrechen“ (bleibt in Reserve)')}
  yield* doAction(G,{a:g.k})}}
function* autoReinf(G){const S=G.S,o=S.act;
 for(const g of S.GY.filter(g=>g.o==o&&/Verstärkung/.test(g.kw)&&!g.rp&&!g.repl&&g.dr===S.round-1)){
  if(S.over)return;
  const q=mkUnit(g.dn,o,S.NID++,g.horr?Math.ceil(g.nmax/2):undefined);q.repl=1;let kd='repl';
  if(ENI(S,o)=='herr'&&gnl(S,o)&&!usedKey(S,o+':herr','battle')){const y=yield* choice(G,o,'Herr der wimmelnden Horde','Ersatzeinheit stattdessen ganz innerhalb von 13" um den General aufstellen (1× pro Schlacht)?',[{t:'Ja'},{t:'Nein'}],{pref:0});if(y==0){kd='repl13';useKey(S,o+':herr','battle')}}
  const p=yield* place(G,o,kd,q,'Verstärkung: '+g.name,kd=='repl13'?'Aufstellen: ganz innerhalb von 13 Zoll um den General':'Aufstellen: eigenes Gebiet, höchstens 6 Zoll vom Spielfeldrand, nicht im Nahkampf',{cancel:true});
  g.rp=1;if(p.cancel)continue;
  q.x=p.x;q.y=p.y;S.U.push(q);add(S.Ph.used,q.id);add(S.T.arr,q.id);G.note('Verstärkung: '+q.name+' wird aufgestellt')}}
export function* doAction(G,a){const S=G.S,o=S.act;
 if(a.a=='cmdwin')return yield* cmdWindow(G);
 if(a.a=='amb'){const q=S.U.find(x=>x.o==o&&x.amb&&x.x<0);const p=yield* place(G,o,'amb',q,'Plötzlicher Hinterhalt','Aufstellen: 3 bis 6 Zoll vom Gegner',{cancel:true});if(p.cancel)return;q.x=p.x;q.y=p.y;return}
 if(a.a.startsWith('rsv:')){const q=byId(S,+a.a.slice(4));const p=yield* place(G,o,'rsv',q,'Aus der Reserve aufstellen','Aufstellen: '+q.name,{cancel:true});if(p.cancel)return;{const Pf=rsvForm(q,p.x,p.y);if(Pf)setAbs(q,Pf);else{q.x=p.x;q.y=p.y}}q.rsv=0;if(q.lim)useKey(S,o+':ank','turn');add(S.T.arr,q.id);S.T.mvt[q.id]=0;add(S.Ph.used,q.id);add(S.T.moved,q.id);G.note(q.name+' erscheint auf dem Schlachtfeld');return}
 if(a.a.startsWith('ab:')){const id=a.a.slice(3);yield* runAb(G,id,a.u!=null?byId(S,a.u):null,o);return}
 const u=byId(S,a.u),P0=u&&u.M&&S.ph==2?abs(u).map(m=>({x:m.x,y:m.y})):null;
 if(a.a=='move'){const L=applyMove(S,u,a,mvRest(S,u));add(S.Ph.used,u.id);add(S.T.moved,u.id);S.T.mvt[u.id]=mvOf(S,u);S.T.mvd[u.id]=(S.T.mvd[u.id]||0)+L}
 else if(a.a=='adj'){const A0=abs(u),used=Math.max(...a.P.map((p,i)=>Math.hypot(+p[0]-A0[i].x,+p[1]-A0[i].y)));setAbs(u,a.P.map(p=>({x:+p[0],y:+p[1]})));add(S.T.moved,u.id);
  if(has(S.Ph.used,u.id))S.T.adj.push(u.id);else{S.T.adjB.push(u.id);S.T.mvt[u.id]=mvOf(S,u)}
  S.T.mvd[u.id]=(S.T.mvd[u.id]||0)+used}
 else if(a.a=='run')yield* doRun(G,u);
 else if(a.a=='retreat')yield* doRetreat(G,u);
 else if(a.a=='charge')yield* doCharge(G,u);
 else if(a.a=='shoot'){const t=byId(S,a.t);
  if(hasAb(u,'mm')&&!has(S.T.moved,u.id)){const y=G.isAI(u.o)?0:yield* choice(G,u.o,'Mehr-Mehr Warpenergie!','Warpstein-Muskete überladen: Wurf 2+ → Schaden 3; bei 1 W3 tödlicher Schaden auf diese Einheit.',[{t:'Überladen'},{t:'Nicht überladen'}],{pref:0});
   if(y==0){const r=d6(S);G.rep('Mehr-Mehr Warpenergie!',[{k:'row',l:'Wurf (2+)',v:[r],th:2},{k:'txt',s:r>=2?'Schadenswert 3 in dieser Phase':'Rückschlag: W3 tödlicher Schaden'}]);if(r>=2)addFx(S,{k:'dmgw',u:u.id,v:'Warpstein-Muskete',n:3,exp:'ph'});else hurt(G,u,d3(S))}}
  if(!S.U.includes(u))return;yield* reactAtk(G,u,t,1);if(S.U.includes(t)&&S.U.includes(u))yield* attackG(G,u,t,1)}
 else yield* skill(G,u,a.a);
 if(P0&&['move','run','retreat'].includes(a.a)&&(hasAb(u,'ms_boing')||hasAb(u,'wk_finne')))yield* crossAb(G,u,P0)}

export function* endTurn(G){const S=G.S,act=S.act;
 S.U.filter(u=>u.o==act&&u.x>=0&&hasAb(u,'rise')&&u.n<u.nmax&&canHeal(S,u)).forEach(u=>{u.n++;G.note('Verflucht, sich wieder zu erheben: '+u.name+' erhält 1 Modell zurück')});
 yield* eot(G);
 const oc0=S.oc.slice();updCtrl(S);
 for(let k=0;k<S.obj.length;k++){const c=S.cs&&S.cs[k];if(!c||!(c[0]>0&&c[1]>0))continue;
  const ln=o=>`<b>${o?'Computer':'Du'}</b>: `+((S.cu[k]||[]).filter(x=>x.o==o).map(x=>x.n+' '+x.v).join(' + ')||'–')+` = <b>${c[o]}</b>`;
  const r=c[0]==c[1]?(S.oc[k]<0?'Gleichstand – niemand kontrolliert das Ziel':'Gleichstand – '+(S.oc[k]?'Computer':'Du')+' behält die Kontrolle'):(c[0]>c[1]?'Du kontrollierst das Ziel':'Computer kontrolliert das Ziel');
  yield* info(G,0,'Umkämpftes Ziel: '+ONM(S)[k],'Kontrollwerte:<br>'+ln(0)+'<br>'+ln(1)+'<br><br><b>'+r+'</b>','OK')}
 const a=ctrl(S,act),b=ctrl(S,1-act),tc=endTac(S,act),tv=twVP(S,act);const mon=S.mon;
 const s=(a>=1)+(a>=2)+(a>b)+S.P[act].done+tc.length+tv;S.P[act].done=0;S.P[act].vp+=s; twAfter(G);
 if(mon){S.obj.pop();S.oc.pop();S.ocs.pop();S.on.pop();S.mon=0;updCtrl(S)}
 G.msg('Zugende',[{k:'txt',s:`${act?'Computer erhält':'Du erhältst'} ${s} Siegpunkt(e) (Ziele ${a}:${b}; du hältst: ${cnm(S,0)||'keins'}, Computer: ${cnm(S,1)||'keins'}).${tc.length?'<br>Taktik erfüllt: '+tc.join(', '):''}${tv?'<br>Wendungskarte: +'+tv+' SP':''}`}])}
