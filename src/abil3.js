// Fähigkeiten der dritten Armeenwelle (Hooks siehe hooks.js).
import {yn,scE,mort,AB,abUsed,en,roll2,fr,lab,hdr,pk,FL,vis,genOf,nmove,pickF,rep,row,relocate,claims,pickE} from './abil.js';
import {HK,GL} from './hooks.js';
import {placeErr,inCombat,isHero,hasAb,mvOf,ENI,RGI,mx,wnd,hurt,dist,foes,nm,cvOf,gnl,applyMove} from './rules.js';
import {ptDist} from './geom.js';
import {doRetreat,destReq} from './cards.js';
import {abs,wholly,udist,mgap} from './models.js';
import {ARMY} from './data.js';
import {d6,d3,add,has} from './util.js';
import {TAC} from './data.js';
import {choice} from './game.js';
import {CH} from './cards.js';
import {addFx,fxL,fxSum,usedKey,useKey} from './fx.js';
const trOf=(S,o,k)=>{try{return ARMY[S.K.army[o]].tr.includes(k)}catch(e){return false}};
const kw=(u,w)=>(u.kw||'').includes(w);
const canHealX=(S,u)=>{try{return !fxL(S,u,'sense').length}catch(e){return true}};
const gOK=(S,o)=>!!genOf(S,o);

// --- Ossiarch-Befehle: 2 Punkte pro Schlachtrunde, je Einheit höchstens 1 Einsatz pro Phase
const obOK=(S,o,u)=>((S.obp||[0,0])[o]||0)>0&&!usedKey(S,'ob:'+u.id,'phase');
const obPay=(S,o,u)=>{S.obp[o]--;useKey(S,'ob:'+u.id,'phase')};
const obS=t=>t+' [Ossiarch-Befehl: 1 Punkt]';
const spell=(G,n,th)=>{const [a,b]=roll2(G.S);rep(G,n,row('Zauberwurf ('+th+'+)',[a,b],0),a+b>=th?'Zauber gelingt':'Zauber misslingt');return a+b>=th};
// --- Disziplin-Wurf (Mortisan-Elite)
function* disz(G,o,ph,second){const S=G.S,g=genOf(S,o),done=S.T.dzT||(S.T.dzT=[]);
 const t=yield* pickF(G,o,'Unerbittliche Disziplin: Ziel',x=>!second||!done.includes(x.id));if(!t)return;done.push(t.id);
 const r=d6(S),w12=g&&wholly(t,g,12),bn=(w12?1:0)+(RGI(S,o)=='kb_feld'?1:0)+(hasAb(t,'kb_herold')&&!w12?1:0),tot=r+bn;
 hdr(G,'Disziplin-Wurf',tot,tot>=4,4,t.name+': Effekt','Kein Effekt (Wurf '+r+(bn?' +'+bn:'')+')');if(tot<4)return;
 if(ph==2){addFx(S,{k:'mv',u:t.id,v:2,exp:'ph'});G.note('Disziplin: '+t.name+' +2" Bewegung')}
 else if(ph==4){addFx(S,{k:'chg',u:t.id,v:1,exp:'ph'});G.note('Disziplin: '+t.name+' +1 auf Angriffswürfe')}
 else{const c=G.isAI(o)?'w':yield* pk(G,o,'Disziplin: Effekt',[['+1 auf Verwundungswürfe im Nahkampf','w'],['Rettung 5+','r']],()=>0);if(c=='w'){addFx(S,{k:'wndM',u:t.id,v:1,exp:'ph'});G.note('Disziplin: '+t.name+' +1 auf Verwundungswürfe im Nahkampf')}else{addFx(S,{k:'ward',u:t.id,v:5,exp:'ph'});G.note('Disziplin: '+t.name+' hat Rettung 5+')}}}
const dzAB=(id,ph,nmx,second)=>({n:second?'Unvergleichlicher Zusammenhalt ('+nmx+')':'Unerbittliche Disziplin ('+nmx+')',s:(['Bewegungsphase','Angriffsphase','Nahkampfphase'][[2,4,5].indexOf(ph)])+', 1× pro Phase (Armee): Disziplin-Wurf (W6, 4+) für eine befreundete Einheit'+(second?' – zweiter Einsatz, anderes Ziel':''),ph,freq:'phase',army:1,src:(S,o)=>trOf(S,o,'kb_disz')&&(!second||RGI(S,o)=='kb_zus'),can:(S,o)=>fr(S,o).length>0&&(!second||(abUsed(S,null,'kb_d'+(ph==2?'m':ph==4?'a':'f'),o)&&!usedKey(S,o+':dz2','turn'))),*run(G,o){if(second)useKey(G.S,o+':dz2','turn');yield* disz(G,o,ph,second)},ai:()=>true});
// --- Sylvaneth
const nearT=(S,m,d)=>S.ter.some(t=>!t.rel&&ptDist(t,m.x,m.y)-m.l/2<=d);
const unitNearT=(S,u)=>u.x>=0&&u.M&&abs(u).some(m=>nearT(S,m,3));
const beute=(S,o)=>{S.beute||(S.beute=[null,null]);const id=S.beute[o];if(id==null)return null;const t=S.U.find(x=>x.id==id);if(!t){S.beute[o]=null;(S.akk||(S.akk=[0,0]))[o]++;return null}return t};
const akkOf=(S,u)=>((S.akk||[0,0])[u.o]||0)+fxSum(S,u,'akkB');
const nearB=(S,u)=>{const b=beute(S,u.o);return !!b&&b.x>=0&&u.x>=0&&dist(u,b)<=9};
export function* beuteStart(G,o){const S=G.S;if(!(trOf(S,o,'sy_rache')||trOf(S,o,'kh_beute'))||beute(S,o))return;const c=S.U.filter(e=>e.o!=o);if(!c.length)return;const t=yield* pk(G,o,'Ziel der Rache: Beute wählen',c.map(x=>[lab(x),x]),scE);if(!t)return;S.beute[o]=t.id;G.note((o?'Computer':'Du')+': Beute ist '+t.name)}

// ---- Sklaven der Finsternis: Bluthauchlegion (Auge der Götter) ----
const AGN={2:'Schutz des Tzeentch (Rettung 6+)',3:'Anmut des Slaanesh (+1 auf Rennenwürfe)',4:'Segen des Nurgle (−1 auf Verwundungswürfe gegen die Einheit)',5:'Wut des Khorne (+1 Wucht der Nahkampfwaffen)'};
const agL=(S,u)=>(S.ag&&S.ag[u.id])||[];
const agH=(S,u,k)=>agL(S,u).includes(k);
const isCK=u=>/^(Chaoskrieger|Chaosritter)/.test(u.dn||u.n||'');
function* augeRoll(G,o,u,src){const S=G.S;S.ag||(S.ag={});const L=S.ag[u.id]||(S.ag[u.id]=[]);const r=d6(S);let k=r;
 if(r==6){const c=[2,3,4,5].filter(x=>!L.includes(x));k=c.length?yield* pk(G,o,'Champion des Chaos: Fähigkeit für '+u.name,c.map(x=>[AGN[x],x]),x=>({5:4,2:3,4:2,3:1})[x]):0}
 let txt;if(r==1||!k)txt='Von den Göttern abgewiesen: kein Effekt';else if(L.includes(k))txt=u.name+' hat '+AGN[k]+' bereits (nicht kumulativ)';else{L.push(k);txt=u.name+' erhält dauerhaft: '+AGN[k]}
 rep(G,'Auge der Götter'+(src?' ('+src+')':''),row('W6',[r]),txt)}
const agOK=(S,o,x)=>x.x>=0&&((!inCombat(S,x)&&S.obj.some((p,k)=>claims(S,x,k)&&S.oc[k]!==1-o))||has(S.T.ds||[],x.id));
export function* eot3(G,o,act){const S=G.S;
 if(ENI(S,o)=='id_raubseele'){const g=genOf(S,o);if(g&&g.dmg>0&&inCombat(S,g)&&canHealX(S,g)){const h=d3(S);g.dmg=Math.max(0,g.dmg-h);G.note('Seelenräuber: '+g.name+' heilt '+h)}}
 if(RGI(S,o)=='id_raub'&&!usedKey(S,o+':raub','turn')){const c=FL(S,o,x=>x.x>=0&&kw(x,'Kavallerie')&&has(S.T.fought,x.id)&&x.dmg>0&&canHealX(S,x));if(c.length){const t=yield* pk(G,o,'Schleiersee-Raubfische: Einheit heilen',[...c,['Keine',null]],x=>x?x.dmg:-1e9);if(t){useKey(S,o+':raub','turn');const h=d3(S);t.dmg=Math.max(0,t.dmg-h);G.note('Schleiersee-Raubfische: '+t.name+' heilt '+h)}}}
 if(trOf(S,o,'sd_auge')&&!usedKey(S,o+':auge','turn')){const c=FL(S,o,x=>agOK(S,o,x));if(c.length){const t=yield* pk(G,o,'Auge der Götter: Einheit wählen',[...c,['Keine',null]],x=>x?10-agL(S,x).length*2+mx(x)*.01:-1e9);if(t){useKey(S,o+':auge','turn');yield* augeRoll(G,o,t)}}}
 {const g=genOf(S,o);if(g&&g.dmg>0&&canHealX(S,g)){const k=ENI(S,o);if(k=='fy_stur'||(k=='kh_blut'&&!usedKey(S,o+':kblut','turn'))){if(k=='kh_blut')useKey(S,o+':kblut','turn');const h=d3(S);g.dmg=Math.max(0,g.dmg-h);G.note((k=='fy_stur'?'Zu stur zum Sterben':'Von Blut gestärkt')+': '+g.name+' heilt bis zu '+h)}}
  if(g&&ENI(S,o)=='kh_bisse'){const b=beute(S,o);if(b&&b.x>=0&&inCombat(S,g)&&dist(g,b)<=1){const h=d3(S);G.note('Wilde Bisse: '+b.name+' erleidet '+h+' tödlichen Schaden');mort(G,b,h,'Wilde Bisse')}}
  if(trOf(S,o,'kh_beute')&&!usedKey(S,o+':bltg','turn')){const c=FL(S,o,x=>has(S.T.kl||[],x.id));if(c.length){const t=yield* pk(G,o,'Blutgetränkt: Einheit',[...c,['Keine',null]],x=>x?mx(x):-1e9);if(t){useKey(S,o+':bltg','turn');addFx(S,{k:'critTA',u:t.id,exp:'battle'});G.note('Blutgetränkt: '+t.name+' hat bis Schlachtende Krit. (tödlich) im Nahkampf')}}}}
 if(trOf(S,o,'sy_ley')&&!usedKey(S,o+':ley','turn')){useKey(S,o+':ley','turn');const hs=fr(S,o).filter(u=>u.dmg>0&&unitNearT(S,u));hs.forEach(u=>{u.dmg=Math.max(0,u.dmg-1)});if(hs.length)G.note('Leylinien: '+hs.map(u=>u.name).join(', ')+' heilen 1')}
 if(trOf(S,o,'sy_ley')&&!usedKey(S,o+':zusch','turn')){const c=FL(S,o,x=>unitNearT(S,x)&&has(S.T.fought,x.id));if(c.length){const t=yield* pk(G,o,'Zuschlagen und Verschwinden: Einheit',[...c,['Keine',null]],x=>x?mx(x):-1e9);if(t){useKey(S,o+':zusch','turn');const r=d6(S);hdr(G,'Zuschlagen und Verschwinden',r,r>=2,2,t.name+' wird neu aufgestellt','Kein Effekt');if(r>=2)yield* relocate(G,o,t,'ter3','Zuschlagen und Verschwinden','Neu aufstellen: jedes Modell innerhalb 3 Zoll um ein Geländestück, mehr als 6 Zoll von Feinden')}}}
 if(RGI(S,o)=='sy_rach'&&!usedKey(S,o+':rach','turn')){const c=S.U.filter(e=>e.o!=o&&e.x>=0&&S.obj.some((p,i)=>claims(S,e,i)));if(c.length){const t=yield* pk(G,o,'Rachsüchtige Geister des Landes: Ziel',[...c.map(x=>[lab(x),x]),['Keins',null]],x=>x?scE(x):-1e9);if(t){useKey(S,o+':rach','turn');const r=d6(S);hdr(G,'Rachsüchtige Geister des Landes',r,r>=4,4,t.name+': W3 tödlicher Schaden','Kein Effekt');if(r>=4)mort(G,t,d3(S),'Rachsüchtige Geister')}}}
 if(RGI(S,o)=='sy_leben'&&!usedKey(S,o+':leben','turn')){useKey(S,o+':leben','turn');const hs=fr(S,o).filter(u=>u.dmg>0);hs.forEach(u=>{u.dmg=Math.max(0,u.dmg-3)});if(hs.length)G.note('Lebensspender: '+hs.map(u=>u.name).join(', ')+' heilen 3')}
 if(RGI(S,o)=='sy_blatt'&&!usedKey(S,o+':blatt','battle')){const c=FL(S,o,x=>inCombat(S,x));if(c.length){const t=yield* pk(G,o,'Blätter im Wind: Einheit',[...c,['Nicht einsetzen',null]],x=>x?mx(x):-1e9);if(t){useKey(S,o+':blatt','battle');yield* doRetreat(G,t,{free:true})}}}

 for(const k of fr(S,o).filter(x=>hasAb(x,'ob_ernte')&&(x.kt||0)>0)){const t=yield* pk(G,o,'Konstrukt reparieren: Mortek-Garde',FL(S,o,x=>x.dn=='Mortek-Garde'&&dist(k,x)<=6&&x.n<x.nmax),x=>x.nmax-x.n);if(!t)continue;let h=0;const rs=[];for(let i=0;i<k.kt;i++){const r=d6(S);rs.push(r);if(r>=4)h++}h=Math.min(h,t.nmax-t.n);t.n+=h;G.rep('Konstrukt reparieren',[row('Würfe (4+) – '+k.kt+' Knochentribut',rs,4),{k:'txt',s:h+' Modell(e) kehren zurück zu '+t.name}]);k.kt=0}}
export function install3(){

const rl_=(S,o,i)=>(S.rn&&S.rn[o]&&S.tn<S.rn[o].t0+2)?(S.rn[o].lv[i]||0):0;
Object.assign(HK,{
 fy_rune:{hit:(S,u,e,shoot)=>!shoot&&rl_(S,u.o,0)>=1?1:0,att:(S,u,w,e,shoot)=>!shoot&&rl_(S,u.o,0)>=2&&typeof w[2]=='number'?1:0,
  rend:(S,u,e,shoot,w)=>!shoot&&rl_(S,u.o,1)>=1?1:0,dmg:(S,u,e,shoot,w)=>!shoot&&rl_(S,u.o,1)>=2?1:0,
  ward:(S,u)=>rl_(S,u.o,2)>=1?5:0,svT:(S,d)=>rl_(S,d.o,2)>=2?1:0,mv:(S,u)=>rl_(S,u.o,3)>=1?2:0,chg:(S,u)=>rl_(S,u.o,3)>=2?2:0},
 fy_aura:{ctl:(S,u)=>u.gen?3:0},
 fy_wirb:{att:(S,u,w,e,shoot)=>!shoot&&has(S.T.charged,u.id)&&typeof w[2]=='number'?1:0},
 bw_fels:{att:(S,u,w)=>fxL(S,u,'rockA').length&&w[0]=='Felsbrocken werfen'&&typeof w[2]=='number'?1:0},
 bw_rev:{hit:(S,u,e,shoot)=>u.gen&&e&&S.obj.some((p,i)=>claims(S,e,i)&&S.oc[i]!=u.o)?1:0},
 kh_hunde:{chg:()=>1},
 kh_geruch:{hit:(S,u,e,shoot)=>!shoot&&e&&has(S.T.dd||[],e.id)?1:0,wnd:(S,u,e,shoot)=>!shoot&&e&&has(S.T.dd||[],e.id)?1:0},
 kh_fass:{hitT:(S,d,a,shoot)=>shoot&&d.gen?-1:0,wndT:(S,d,a,shoot)=>shoot&&d.gen?-1:0}
});
GL.sv.push((S,e)=>e.x>=0&&S.U.some(x=>x.o==e.o&&x.x>=0&&hasAb(x,'fy_ikone')&&wholly(e,x,12))?1:0);
GL.ward.push((S,e)=>{const g=gnl(S,e.o);if(!g||g.x<0)return 0;if(e!==g&&!hasAb(e,'fy_wacht'))return 0;const w=S.U.find(x=>x.o==e.o&&x.x>=0&&hasAb(x,'fy_wacht')&&wholly(g,x,1));return w&&(e===g||e===w)?5:0});
GL.ward.push((S,e)=>S.U.some(k=>k.o==e.o&&k.x>=0&&hasAb(k,'sy_gesandte')&&e.x>=0&&S.obj.some((p,i)=>claims(S,k,i)&&claims(S,e,i)))?6:0);
GL.chg.push((S,u)=>{if(u.x<0||!S.K||!S.K.army)return 0;const g=gnl(S,u.o);if(!g||ENI(S,u.o)!='sy_ger'||!wholly(u,g,12)||!inCombat(S,g))return 0;const b=beute(S,u.o);return b&&dist(g,b)<=1?2:1});
GL.place.ter3=(S,o,u,x,y,a)=>{const e=placeErr(S,'rein',o,u,x,y,a);if(e)return e;return abs({...u,x,y}).every(m=>nearT(S,m,3))?'':'Jedes Modell innerhalb von 3 Zoll um ein Geländestück, mehr als 6 Zoll von Feinden'};

Object.assign(HK,{
 kv_finte:{nort:(S,u)=>kw(u,'Kavallerie')?1:0},
 kv_schein:{chgRtr:(S,u)=>S.T.kvs&&S.act==u.o?1:0},
 kv_arch:{ward:(S,u)=>u.gen?5:0},
 kv_klinge:{wpn:(S,u,w)=>u.gen&&w[0]=='Klinge des Befehlshabers'&&!String(w[7]||'').includes('D')?w.map((v,i)=>i==7?(v||'')+'D':v):w},
});
Object.assign(HK,{
 ob_sense:{wpn:(S,u,w)=>u.gen&&ENI(S,u.o)=='ob_mord'&&w[0]=='Seelenernter-Sense'&&!String(w[7]||'').includes('D')?w.map((v,i)=>i==7?(v||'')+'D':v):w},
 kb_erz:{rendT:(S,d,a,shoot,w)=>(!shoot&&d.gen&&(+w[5]||0)>0)?-1:0},
});
Object.assign(AB,{
 kb_dm:dzAB('kb_dm',2,'Bewegung',false),kb_da:dzAB('kb_da',4,'Angriff',false),kb_df:dzAB('kb_df',5,'Nahkampf',false),
 kb_dm2:dzAB('kb_dm2',2,'Bewegung',true),kb_da2:dzAB('kb_da2',4,'Angriff',true),kb_df2:dzAB('kb_df2',5,'Nahkampf',true),
 kb_zus:{n:'Unvergleichlicher Zusammenhalt',s:'Passiv: Unerbittliche Disziplin darf pro Phase ein zweites Mal eingesetzt werden (anderes Ziel)',army:1,src:(S,o)=>RGI(S,o)=='kb_zus'},
 kb_feld:{n:'Makellose Feldherrenkunst',s:'Passiv: +1 auf Disziplin-Würfe',army:1,src:(S,o)=>RGI(S,o)=='kb_feld'},
 kb_erz:{n:'Erz der Sättigung',s:'Passiv: −1 Wucht auf Nahkampfwaffen gegen den General',army:1,src:(S,o)=>ENI(S,o)=='kb_erz'},
 kb_splitter:{n:'Knochensplittersturm',s:'Heldenphase: Sichtbarer Feind innerhalb 12" um den General: 2W6 7+ → je Modell W6 5+ 1 tödlicher Schaden',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='kb_splitter',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Knochensplittersturm: Ziel',en(S,o).filter(x=>dist(g,x)<=12&&vis(S,g,x)).map(x=>[lab(x),x]),x=>nm(x));if(!t)return;if(!spell(G,'Knochensplittersturm',7))return;const rs=[];let k=0;for(let i=0;i<nm(t);i++){const r=d6(S);rs.push(r);if(r>=5)k++}G.rep('Knochensplittersturm',[row('Würfe (5+)',rs,5),{k:'txt',s:k+' tödlicher Schaden auf '+t.name}]);if(k)hurt(G,t,k)},ai:()=>true},
 kb_ausb:{n:'Konstrukte ausbessern',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12" um den General: 2W6 6+ → heile W3',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='kb_ausb',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Konstrukte ausbessern: Ziel',FL(S,o,x=>wholly(x,g,12)&&vis(S,g,x)&&x.dmg>0),x=>x.dmg);if(!t)return;if(!spell(G,'Konstrukte ausbessern',6))return;const h=d3(S);t.dmg=Math.max(0,t.dmg-h);G.note('Konstrukte ausbessern: '+t.name+' heilt bis zu '+h)},ai:()=>true},
 kb_helm:{n:'Helm der Tyrannei',s:'Heldenphase, 1× pro Schlacht (Ende deines Zugs): Feind innerhalb 12" um den General: 3+ → −3 Kontrollwert bis Zugende',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='kb_helm',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Helm der Tyrannei: Ziel',en(S,o).filter(x=>dist(g,x)<=12).map(x=>[lab(x),x]),x=>isHero(x)?3:0);if(!t)return;const r=d6(S);hdr(G,'Helm der Tyrannei',r,r>=3,3,t.name+' −3 Kontrollwert','Kein Effekt');if(r>=3)addFx(S,{k:'ctl',u:t.id,v:-3,exp:'turn'})},ai:()=>true},
 kb_garde:{n:'Seelengebundene Beschützer',s:'Passiv: General hat Rettung 5+ in Nahkampfreichweite der Immortis-Garde',unit:1,src:(S,u)=>hasAb(u,'kb_garde')},
 kb_herold:{n:'Herolde des Nagasch',s:'Passiv: +1 auf Disziplin-Würfe, solange nicht ganz innerhalb 12" um den General',unit:1,src:(S,u)=>hasAb(u,'kb_herold')},
 kb_verf:{n:'Verfeinerte Schöpfung',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12": 2W6 5+ → Nahkampfwaffen Krit. (2 Treffer) bis zum nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kb_verf'),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Verfeinerte Schöpfung: Ziel',FL(S,u.o,x=>wholly(x,u,12)&&vis(S,u,x)),x=>mx(x));if(!t)return;if(!spell(G,'Verfeinerte Schöpfung',5))return;addFx(S,{k:'critD',u:t.id,exp:'own'});G.note('Verfeinerte Schöpfung: '+t.name+' Krit. (2 Treffer) bis zum nächsten Zug')},ai:()=>true},
 kb_aspekt:{n:'Aspekt wechseln',s:'Nahkampfphase: Einheit wählt Antlitz der Parade (−1 auf Treffer gegen sie im Nahkampf) oder Antlitz des Zerstörers (keine Rettungswürfe gegen ihren Schaden) bis Zugende',ph:5,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'kb_aspekt'),
  *run(G,u){const S=G.S,c=G.isAI(u.o)?'z':yield* pk(G,u.o,'Aspekt wechseln',[['Antlitz der Parade (−1 auf Treffer gegen diese Einheit)','p'],['Antlitz des Zerstörers (keine Rettungswürfe)','z']],()=>0);if(c=='p'){addFx(S,{k:'hitTm',u:u.id,v:-1,exp:'turn'});G.note('Antlitz der Parade: −1 auf Treffer im Nahkampf gegen '+u.name)}else{addFx(S,{k:'nward',u:u.id,exp:'turn'});G.note('Antlitz des Zerstörers: keine Rettungswürfe gegen Schaden von '+u.name)}},ai:()=>true},
 ob_ernte:{n:'Knochenernte',s:'Passiv: je getötetem feindlichem Modell im Nahkampf +1 Knochentribut (max. 6); am Zugende Konstrukt reparieren',unit:1,src:(S,u)=>hasAb(u,'ob_ernte')},
 ob_mord:{n:'Mörderischer Angriff',s:'Passiv: Seelenernter-Sense des Generals hat Krit. (2 Treffer)',army:1,src:(S,o)=>ENI(S,o)=='ob_mord'},
 ob_mark:{n:'Markpakt',s:'Passiv: General heilt nach seinen Nahkampfattacken so viele Schadenspunkte, wie er zugefügt hat',army:1,src:(S,o)=>ENI(S,o)=='ob_mark'},
 ob_reihen:{n:obS('Undurchdringliche Reihen'),s:'Nahkampfphase, 1× pro Schlacht, Ossiarch-Befehl: Befreundete Einheit hat bis Phasenende +1 auf Rettungswürfe',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='ob_reihen',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)&&obOK(S,o,x)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Undurchdringliche Reihen: Einheit',x=>inCombat(S,x)&&obOK(S,o,x));if(!t)return;obPay(S,o,t);addFx(S,{k:'wardB',u:t.id,v:1,exp:'ph'});G.note('Undurchdringliche Reihen: '+t.name+' +1 auf Rettungswürfe')},ai:()=>true},
 ob_neu:{n:obS('Neuformierung'),s:'Bewegungsphase, 1× pro Schlacht, Ossiarch-Befehl: Mortek-Garde im Nahkampf darf Rückzug ohne tödlichen Schaden einsetzen',ph:2,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='ob_neu',can:(S,o)=>fr(S,o).some(x=>x.dn=='Mortek-Garde'&&inCombat(S,x)&&obOK(S,o,x)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Neuformierung: Mortek-Garde',x=>x.dn=='Mortek-Garde'&&inCombat(S,x)&&obOK(S,o,x));if(!t)return;obPay(S,o,t);addFx(S,{k:'nort',u:t.id,exp:'ph'});G.note('Neuformierung: '+t.name+' zieht sich ohne tödlichen Schaden zurück')},ai:()=>false},
 ob_nadi:{n:'Nadiritwaffen verstärken',s:'Heldenphase: Sichtbare Mortek-Garde ganz innerhalb 12" um den General: 2W6 5+ → +1 Wucht im Nahkampf bis zum nächsten Zug',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='ob_nadi',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Nadiritwaffen verstärken: Mortek-Garde',FL(S,o,x=>x.dn=='Mortek-Garde'&&wholly(x,g,12)&&vis(S,g,x)),x=>mx(x));if(!t)return;if(!spell(G,'Nadiritwaffen verstärken',5))return;addFx(S,{k:'rendP',u:t.id,v:1,exp:'own'});G.note('Nadiritwaffen verstärken: '+t.name+' +1 Wucht')},ai:()=>true},
 ob_unauf:{n:'Unaufhaltbarer Befehlshaber',s:'Bewegungsphase: Mortek-Garde ganz innerhalb 12" um den General: 2+ → +3" Bewegung in dieser Phase',ph:2,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='ob_unauf',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Unaufhaltbarer Befehlshaber: Mortek-Garde',FL(S,o,x=>x.dn=='Mortek-Garde'&&wholly(x,g,12)),x=>mvOf(S,x));if(!t)return;const r=d6(S);hdr(G,'Unaufhaltbarer Befehlshaber',r,r>=2,2,t.name+' +3" Bewegung','Kein Effekt');if(r>=2)addFx(S,{k:'mv',u:t.id,v:3,exp:'ph'})},ai:()=>true},
 ob_attacke:{n:obS('Nadiritattacke'),s:'Nahkampfphase, Ossiarch-Befehl: Nahkampfwaffen der Einheit haben bis Phasenende Krit. (2 Treffer)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ob_attacke'),can:(S,u)=>obOK(S,u.o,u)&&inCombat(S,u),
  *run(G,u){const S=G.S;obPay(S,u.o,u);addFx(S,{k:'critD',u:u.id,exp:'ph'});G.note('Nadiritattacke: '+u.name+' Krit. (2 Treffer)')},ai:()=>true},
 ob_leben:{n:obS('Lebenskraft absaugen'),s:'Heldenphase, Ossiarch-Befehl: Sichtbarer Feind innerhalb 18": 2W6 6+ → −1 auf Trefferwürfe seiner Attacken bis zum nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ob_leben'),can:(S,u)=>obOK(S,u.o,u),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Lebenskraft absaugen: Ziel',en(S,u.o).filter(x=>dist(u,x)<=18&&vis(S,u,x)).map(x=>[lab(x),x]),scE);if(!t)return;obPay(S,u.o,u);if(!spell(G,'Lebenskraft absaugen',6))return;addFx(S,{k:'hitA',u:t.id,v:-1,exp:'own'});G.note('Lebenskraft absaugen: '+t.name+' −1 auf Trefferwürfe')},ai:()=>true},
 ob_flicken:{n:obS('Knochen flicken'),s:'Bewegungsphase, Ossiarch-Befehl: Befreundete Einheit ganz innerhalb 12" (nicht im Nahkampf): heile W3, sonst kehren Modelle mit Ausdauer ≤ W3 zurück',ph:2,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ob_flicken'),can:(S,u)=>obOK(S,u.o,u),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Knochen flicken: Einheit',FL(S,u.o,x=>wholly(x,u,12)&&!inCombat(S,x)&&(x.dmg>0||x.n<x.nmax)),x=>x.dmg+(x.nmax-x.n));if(!t)return;obPay(S,u.o,u);const h=d3(S);if(t.dmg>0){t.dmg=Math.max(0,t.dmg-h);G.note('Knochen flicken: '+t.name+' heilt bis zu '+h)}else{const k=Math.min(t.nmax-t.n,Math.floor(h/Math.max(1,t.wm)));t.n+=k;G.note('Knochen flicken: '+k+' Modell(e) kehren zu '+t.name+' zurück')}},ai:()=>true},
 ob_keil:{n:obS('Todesreiter-Keil'),s:'Angriffsphase, Ossiarch-Befehl: Einheit bewegt sich über feindliche Infanterie, als hätte sie Fliegen; nach dem Angriff: Feind im Nahkampf 2+ → W3 tödlicher Schaden',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ob_keil'),can:(S,u)=>obOK(S,u.o,u),
  *run(G,u){const S=G.S;obPay(S,u.o,u);addFx(S,{k:'fly',u:u.id,exp:'ph'});G.note('Todesreiter-Keil: '+u.name+' bewegt sich über feindliche Infanterie hinweg');
   if(!has(S.T.charged,u.id))return;const t=yield* pk(G,u.o,'Todesreiter-Keil: Feind',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Todesreiter-Keil',r,r>=2,2,t.name+': W3 tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,d3(S),'Todesreiter-Keil')},ai:()=>true},
});
Object.assign(AB,{ kv_arch:{n:'Mächtiger Archaeossianer',s:'Passiv: General hat Rettung 5+',army:1,src:(S,o)=>ENI(S,o)=='kv_arch'},
 kv_klinge:{n:'Mörderische Klinge',s:'Passiv: Klinge des Befehlshabers hat Krit. (2 Treffer)',army:1,src:(S,o)=>ENI(S,o)=='kv_klinge'},
 kv_lanze:{n:'Kavalos-Lanze',s:'Heldenphase, 1× pro Zug: Befreundete Einheit darf sich bis Zugende durch feindliche Modelle bewegen, als hätte sie Fliegen',ph:1,freq:'turn',army:1,src:(S,o)=>trOf(S,o,'kv_lanze'),can:(S,o)=>fr(S,o).length>0,
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Kavalos-Lanze: Einheit',x=>true);if(!t)return;addFx(S,{k:'fly',u:t.id,exp:'turn'});G.note('Kavalos-Lanze: '+t.name+' bewegt sich bis Zugende wie mit Fliegen')},ai:()=>true},
 kv_schein:{n:'Scheinrückzug',s:'Bewegungsphase, 1× pro Schlacht: Befreundete Einheiten dürfen in diesem Zug auch nach einem Rückzug Angriff-Fähigkeiten einsetzen',ph:2,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='kv_schein',can:()=>true,
  *run(G,o){G.S.T.kvs=true;G.note('Scheinrückzug: Angriffe nach Rückzug erlaubt (Zug)')},ai:()=>true},
 kv_konstr:{n:'Verstärkte Konstrukte',s:'Nahkampfphase, 1× pro Schlacht: Befreundete Einheit hat bis Zugende Rettung 5+',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='kv_konstr',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Verstärkte Konstrukte: Einheit',x=>inCombat(S,x));if(!t)return;addFx(S,{k:'ward',u:t.id,v:5,exp:'turn'});G.note('Verstärkte Konstrukte: '+t.name+' hat Rettung 5+')},ai:()=>true},
 kv_herr:{n:'Herrischer Befehlshaber',s:'Bewegungsphase: Sichtbare Einheit ganz innerhalb 12" um den General: 3+ → +2" Bewegung (Zug)',ph:2,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='kv_herr',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Herrischer Befehlshaber: Einheit',FL(S,o,x=>wholly(x,g,12)&&vis(S,g,x)),x=>mvOf(S,x));if(!t)return;const r=d6(S);hdr(G,'Herrischer Befehlshaber',r,r>=3,3,t.name+' +2" Bewegung','Kein Effekt');if(r>=3)addFx(S,{k:'mv',u:t.id,v:2,exp:'turn'})},ai:()=>true},
 kv_kalt:{n:'Kalte Grausamkeit',s:'Nahkampfphase: Wenn der General nicht angegriffen hat und im Nahkampf ist: Sichtbare Einheit ganz innerhalb 12": 3+ → +1 Wucht im Nahkampf (Zug)',ph:5,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='kv_kalt',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)&&!has(S.T.charged,g.id)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Kalte Grausamkeit: Einheit',FL(S,o,x=>wholly(x,g,12)&&vis(S,g,x)),x=>mx(x));if(!t)return;const r=d6(S);hdr(G,'Kalte Grausamkeit',r,r>=3,3,t.name+' +1 Wucht im Nahkampf','Kein Effekt');if(r>=3)addFx(S,{k:'rendP',u:t.id,v:1,exp:'turn'})},ai:()=>true},
 kv_signal:{n:'Signal zum Angriff',s:'Heldenphase: Sichtbare Einheit ganz innerhalb 12" um diese Einheit: 3+ → +1 auf Angriffswürfe (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kv_signal'),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Signal zum Angriff: Einheit',FL(S,u.o,x=>wholly(x,u,12)&&vis(S,u,x)),x=>mvOf(S,x));if(!t)return;const r=d6(S);hdr(G,'Signal zum Angriff',r,r>=3,3,t.name+' +1 auf Angriffswürfe','Kein Effekt');if(r>=3)addFx(S,{k:'chg',u:t.id,v:1,exp:'turn'})},ai:()=>true},
 kv_kehrt:{n:'Kehrtwende',s:'Nahkampfphase: Hat die Einheit in diesem Zug angegriffen: 3+ → bewegt sich bis zu ihrer Bewegung, darf nicht im Nahkampf enden',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kv_kehrt'),can:(S,u)=>has(S.T.charged,u.id),
  *run(G,u){const S=G.S,r=d6(S);hdr(G,'Kehrtwende',r,r>=3,3,u.name+' darf sich bewegen','Kein Effekt');if(r<3)return;const mv=mvOf(S,u),a=yield* destReq(G,u,mv,{text:'Kehrtwende: bis '+mv+' Zoll (nicht im Nahkampf enden)',chk:a=>S.U.some(e=>e.o!=u.o&&e.x>=0&&(e.M||[]).some&&0)?'':''});if(!a.stay){applyMove(S,u,a,mv);add(S.T.moved,u.id);G.note('Kehrtwende: '+u.name+' bewegt sich')}},ai:()=>false},
 kv_wild:{n:'Wild bis in die Knochen',s:'Bewegungsphase: Die Einheit darf sich 3" bewegen, auch in den Nahkampf',ph:2,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kv_wild'),
  *run(G,u){const S=G.S;S.cmb=true;try{const a=yield* destReq(G,u,3,{text:'Wild bis in die Knochen: bis 3 Zoll (darf im Nahkampf enden)'});if(!a.stay){applyMove(S,u,a,3);add(S.T.moved,u.id);G.note('Wild bis in die Knochen: '+u.name+' bewegt sich')}}finally{S.cmb=false}},ai:()=>true},
});

Object.assign(HK,{
 sy_jagd:{hit:(S,u)=>nearB(S,u)&&akkOf(S,u)>=2?1:0,wnd:(S,u)=>nearB(S,u)&&akkOf(S,u)>=3?1:0,chg:(S,u)=>nearB(S,u)&&akkOf(S,u)>=1?1:0,run:(S,u)=>nearB(S,u)&&akkOf(S,u)>=1?1:0},
 sy_jv:{rend:(S,u,e,shoot,w)=>!shoot&&u.gen&&(()=>{const b=beute(S,u.o);return b&&b.x>=0&&dist(u,b)<=9&&vis(S,u,b)})()?1:0},
 sy_knorr:{rendT:(S,d,a,shoot,w)=>d.gen?-99:0},
 sy_schwer:{att:(S,u,w)=>w[0]=='Gewaltige pfählende Krallen'&&u.dmg>=10&&typeof w[2]=='number'?1-w[2]:0}
});
Object.assign(AB,{
 sy_besch:{n:'Beschreiter der verborgenen Pfade',s:'Bewegungsphase, 1× pro Zug (Armee): Einheit innerhalb 3" um ein Geländestück (nicht im Nahkampf) wird >6" von Feinden neu aufgestellt, danach keine Bewegung-Fähigkeiten in dieser Phase',ph:2,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='sy_besch',can:(S,o)=>fr(S,o).some(x=>unitNearT(S,x)&&!inCombat(S,x)),
  *run(G,o){const S=G.S,t=yield* pk(G,o,'Beschreiter der verborgenen Pfade: Einheit',FL(S,o,x=>unitNearT(S,x)&&!inCombat(S,x)),x=>mx(x));if(!t)return;if(yield* relocate(G,o,t,'rein','Beschreiter der verborgenen Pfade','Neu aufstellen: mehr als 6 Zoll von allen Feinden'))addFx(S,{k:'nomove',u:t.id,exp:'ph'})},ai:()=>false},
 sy_ley:{n:'Leylinien',s:'Passiv: Ende jedes Zugs heilt jede befreundete Einheit innerhalb 3" um ein Geländestück 1 (automatisch)',army:1,src:(S,o)=>trOf(S,o,'sy_ley')},
 sy_nach:{n:'Nachwachsen',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 18" um die Generalin: 2W6 5+ → heile W6',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='sy_nach',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Nachwachsen: Ziel',FL(S,o,x=>wholly(x,g,18)&&vis(S,g,x)&&x.dmg>0),x=>x.dmg);if(!t)return;if(!spell(G,'Nachwachsen',5))return;const h=d6(S);t.dmg=Math.max(0,t.dmg-h);G.note('Nachwachsen: '+t.name+' heilt bis zu '+h)},ai:()=>true},
 sy_baum:{n:'Baumlied',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12" um die Generalin: 2W6 7+ → +1 Wucht im Nahkampf bis zum nächsten Zug',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='sy_baum',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Baumlied: Ziel',FL(S,o,x=>wholly(x,g,12)&&vis(S,g,x)),x=>mx(x));if(!t)return;if(!spell(G,'Baumlied',7))return;addFx(S,{k:'rendP',u:t.id,v:1,exp:'own'});G.note('Baumlied: '+t.name+' +1 Wucht im Nahkampf')},ai:()=>true},
 sy_knorr:{n:'Knorrige Kriegerin',s:'Passiv: Die Generalin ignoriert negative Modifikatoren auf Schutzwürfe',army:1,src:(S,o)=>ENI(S,o)=='sy_knorr'},
 sy_samen:{n:'Samen der Wiedergeburt',s:'Passiv, 1× pro Schlacht: würde die Generalin zerstört, 3+ → bleibt mit 1 Ausdauer',army:1,src:(S,o)=>ENI(S,o)=='sy_samen'},
 sy_gruen:{n:'Grünende Harmonie',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 18": 2W6 7+ → 1 zerstörtes Modell kehrt zurück (W3 bei Wehrhaften Waldgeistern)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sy_gruen'),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Grünende Harmonie: Ziel',FL(S,u.o,x=>wholly(x,u,18)&&vis(S,u,x)&&x.n<x.nmax),x=>x.nmax-x.n);if(!t)return;if(!spell(G,'Grünende Harmonie',7))return;const k=Math.min(t.nmax-t.n,t.dn=='Wehrhafte Waldgeister'?d3(S):1);t.n+=k;G.note('Grünende Harmonie: '+k+' Modell(e) kehren zu '+t.name+' zurück')},ai:()=>true},
 sy_erd:{n:'Erderschütterer',s:'Nahkampfphase: Feind im Nahkampf mit dieser Einheit: 4+ → kämpft in dieser Phase zuletzt',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sy_erd'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Erderschütterer: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Erderschütterer',r,r>=4,4,t.name+' kämpft zuletzt','Kein Effekt');if(r>=4)add(S.T.SL,t.id)},ai:()=>true},
 sy_schwer:{n:'Schwer angeschlagen',s:'Passiv: Ab 10 Schadenspunkten hat die Gewaltige pfählende Krallen nur noch 1 Attacke',unit:1,src:(S,u)=>hasAb(u,'sy_schwer')},
 sy_gesandte:{n:'Gesandte der Immerkönigin',s:'Passiv: Befreundete Einheiten am selben Ziel wie diese Einheit haben Rettung 6+',unit:1,src:(S,u)=>hasAb(u,'sy_gesandte')},
 sy_erinn:{n:'Krieger-Erinnerungen',s:'Nahkampfphase: Einheit wählt: Kriegerische Erinnerungen (+1 auf Trefferwürfe im Nahkampf) oder Friedliche Erinnerungen (+1 auf Schutzwürfe) bis Phasenende',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sy_erinn'),
  *run(G,u){const S=G.S,c=G.isAI(u.o)?'k':yield* pk(G,u.o,'Krieger-Erinnerungen',[['Kriegerische Erinnerungen (+1 auf Treffer im Nahkampf)','k'],['Friedliche Erinnerungen (+1 auf Schutzwürfe)','f']],()=>0);if(c=='k'){addFx(S,{k:'hitA',u:u.id,v:1,exp:'ph'});G.note('Kriegerische Erinnerungen: +1 auf Treffer')}else{addFx(S,{k:'svP',u:u.id,v:1,exp:'ph'});G.note('Friedliche Erinnerungen: +1 auf Schutzwürfe')}},ai:()=>true},
 sy_horn:{n:'Kernholzjagdhorn',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12": zählt bis zu deinem nächsten Zug als hätte sie 1 zusätzlichen Akkord (Jagdlied)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sy_horn'),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Kernholzjagdhorn: Ziel',FL(S,u.o,x=>wholly(x,u,12)&&vis(S,u,x)),x=>mx(x));if(!t)return;addFx(S,{k:'akkB',u:t.id,v:1,exp:'own'});G.note('Kernholzjagdhorn: '+t.name+' +1 Akkord')},ai:()=>true},
 sy_zeph:{n:'Zephirkäfer',s:'Fernkampfphase: Nachdem die Einheit eine Fernkampf-Fähigkeit eingesetzt hat: bewegt sich bis zu W6", ohne im Nahkampf zu enden',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sy_zeph'),can:(S,u)=>!!(S.T.sh&&S.T.sh[u.id]),
  *run(G,u){const S=G.S,r=d6(S);yield* nmove(G,u,'Zephirkäfer (W6 = '+r+')',r)},ai:()=>true},
 sy_lanze:{n:'Lanzenreiter-Angriff',s:'Angriffsphase: Hat die Einheit angegriffen: Sichtbarer Feind innerhalb 1": W3 (+1 wenn Beute); bei 2+ tödlicher Schaden in Höhe des Ergebnisses',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sy_lanze'),can:(S,u)=>has(S.T.charged,u.id),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Lanzenreiter-Angriff: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1&&vis(S,u,x)).map(x=>[lab(x),x]),scE);if(!t)return;const b=beute(S,u.o),r=d3(S)+(b&&b.id==t.id?1:0);hdr(G,'Lanzenreiter-Angriff',r,r>=2,2,t.name+': '+r+' tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,r,'Lanzenreiter-Angriff')},ai:()=>true},
 sy_brumm:{n:'Ohrenbetäubendes Brummen',s:'Nahkampfphase: Hat die Einheit nicht angegriffen: Feind im Nahkampf: W6 > Kontrollwert → −1 Attacken seiner Nahkampfwaffen (Zug)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sy_brumm'),can:(S,u)=>!has(S.T.charged,u.id)&&inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Ohrenbetäubendes Brummen: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S),cv=cvOf(S,t);hdr(G,'Ohrenbetäubendes Brummen',r,r>cv,cv+1,t.name+': −1 Attacken (Nahkampf)','Kein Effekt (Kontrollwert '+cv+')');if(r>cv)addFx(S,{k:'att',u:t.id,v:-1,exp:'turn'})},ai:()=>true},
 sy_jv:{n:'Jagdvorsteher',s:'Passiv: +1 Wucht auf Nahkampfwaffen der Generalin, solange die Beute sichtbar und innerhalb 9" ist',army:1,src:(S,o)=>ENI(S,o)=='sy_jv'},
 sy_ger:{n:'Gerissener Verfolger',s:'Passiv: +1 (mit Beute im Nahkampf +2) auf Angriffswürfe befreundeter Einheiten ganz innerhalb 12" um die Generalin, solange diese im Nahkampf ist',army:1,src:(S,o)=>ENI(S,o)=='sy_ger'},
 sy_tapfer:{n:'Tapferer Geist',s:'Heldenphase, 1× pro Schlacht: +1 auf Verwundungswürfe im Nahkampf für befreundete Einheiten in Nahkampfreichweite der Generalin bis Zugende',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='sy_tapfer',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),l=fr(S,o).filter(x=>dist(g,x)<=1);l.forEach(x=>addFx(S,{k:'wndM',u:x.id,v:1,exp:'turn'}));G.note('Tapferer Geist: +1 auf Verwundungswürfe für '+l.map(x=>x.name).join(', '))},ai:()=>true},
 sy_zephb:{n:'Zephirbegleiter',s:'Nahkampfphase: Wurde die Generalin in diesem Zug angegriffen und hat gekämpft: bewegt sich bis zu 2W6", ohne im Nahkampf zu enden',ph:5,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='sy_zephb',can:(S,o)=>{const g=genOf(S,o);return !!g&&has(S.T.fought,g.id)},
  *run(G,o){const S=G.S,g=genOf(S,o),[a,b]=roll2(S);yield* nmove(G,g,'Zephirbegleiter (2W6 = '+(a+b)+')',a+b)},ai:()=>true},
 sy_blatt:{n:'Blätter im Wind',s:'Passiv, 1× pro Schlacht, Ende eines Zugs: Befreundete Einheit im Nahkampf zieht sich ohne tödlichen Schaden zurück',army:1,src:(S,o)=>RGI(S,o)=='sy_blatt'},
 sy_leben:{n:'Lebensspender',s:'Passiv: Ende jedes Zugs heilen alle befreundeten Einheiten 3 (automatisch)',army:1,src:(S,o)=>RGI(S,o)=='sy_leben'},
 sy_rach:{n:'Rachsüchtige Geister des Landes',s:'Passiv: Ende jedes Zugs: Feind auf einem Ziel: 4+ → W3 tödlicher Schaden (Abfrage am Zugende)',army:1,src:(S,o)=>RGI(S,o)=='sy_rach'},
 sy_zusch:{n:'Zuschlagen und Verschwinden',s:'Passiv: Ende jedes Zugs (Abfrage)',army:1,src:(S,o)=>trOf(S,o,'sy_zusch')},
 sy_jagdlied:{n:'Jagdlied',s:'Passiv: Akkorde (je zerstörter Beute): 1 → +1 auf Rennen/Angriff, 2 → +1 auf Treffer, 3+ → +1 auf Verwundung für Einheiten innerhalb 9" um die Beute',army:1,src:(S,o)=>trOf(S,o,'sy_jagd')},
});

Object.assign(AB,{
 fy_runen:{n:'Die Runen erwecken',s:'Heldenphase (Beginn deines Zuges), 1× pro Schlachtrunde: Wähle eine noch nicht aktivierte Ur-Gold-Rune, wirf einen W6: 1–5 gewöhnlicher Effekt, 6 zusätzlich der verstärkte Effekt (bis zu deinem nächsten Zug)',ph:1,freq:'turn',army:1,src:(S,o)=>trOf(S,o,'fy_rune'),can:(S,o)=>((S.rnu&&S.rnu[o])||[]).length<4,
  *run(G,o){const S=G.S;S.rnu||(S.rnu=[[],[]]);const nm_=['Rune der Wut','Rune der sengenden Hitze','Rune der feurigen Entschlossenheit','Rune des unerbittlichen Eifers'],l=[0,1,2,3].filter(i=>!S.rnu[o].includes(i));
   const i=yield* pk(G,o,'Die Runen erwecken: Rune wählen',l.map(x=>[nm_[x],x]),x=>[2,1,0,3][x]);if(i==null)return;let r=d6(S);
   if(ENI(S,o)=='fy_geist'&&r<6){const ok=G.isAI(o)||(yield* yn(G,o,'Grimnirs Geist','Aktivierungswurf '+r+' wiederholen?',true));if(ok){const r2=d6(S);G.note('Grimnirs Geist: Wurf '+r+' wiederholt → '+r2);r=r2}}
   S.rnu[o].push(i);const lv=[0,0,0,0];lv[i]=r==6?2:1;S.rn||(S.rn=[null,null]);S.rn[o]={lv,t0:S.tn};hdr(G,nm_[i],r,true,1,nm_[i]+(r==6?': gewöhnlicher + verstärkter Effekt':': gewöhnlicher Effekt')+' bis zu deinem nächsten Zug','')},ai:()=>true},
 fy_tunnel:{n:'Magmatunnel',s:'Heldenphase, nur Runde 1, 1× pro Schlacht: Bis zu 2 befreundete Einheiten werden >6" von Feinden neu aufgestellt',ph:1,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='fy_tunnel',can:(S,o)=>S.round==1,
  *run(G,o){const S=G.S,done=[];for(let i=0;i<2;i++){const c=FL(S,o,x=>!done.includes(x)&&!inCombat(S,x)),t=c.length?yield* pk(G,o,'Magmatunnel ('+(i+1)+'/2): Einheit',[...c,['Keine weitere',null]],x=>x?mx(x):-1e9):null;if(!t)break;done.push(t);yield* relocate(G,o,t,'rein','Magmatunnel','Neu aufstellen: mehr als 6 Zoll von allen Feinden')}},ai:()=>false},
 fy_wurf:{n:'Fyrstahl-Wurfaxt',s:'Fernkampfphase, 1× pro Zug (Armee): Beliebig viele befreundete Einheiten (nicht im Nahkampf) wählen je einen sichtbaren Feind innerhalb 10": 4+ → W3 tödlicher Schaden',ph:3,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='fy_wurf',can:(S,o)=>fr(S,o).some(x=>!inCombat(S,x)&&en(S,o).some(e=>dist(x,e)<=10)),
  *run(G,o){const S=G.S;for(const u of fr(S,o).filter(x=>!inCombat(S,x))){const c=en(S,o).filter(e=>e.x>=0&&dist(u,e)<=10&&vis(S,u,e));if(!c.length)continue;const t=yield* pk(G,o,'Fyrstahl-Wurfaxt: Ziel für '+u.name,[...c.map(x=>[lab(x),x]),['Kein Wurf',null]],x=>x?scE(x):-1e9);if(!t)continue;const r=d6(S);hdr(G,'Fyrstahl-Wurfaxt ('+u.name+')',r,r>=4,4,t.name+': W3 tödlicher Schaden','Kein Effekt');if(r>=4)mort(G,t,d3(S),'Fyrstahl-Wurfaxt')}},ai:()=>true},
 fy_horn:{n:'Grimnirhorn',s:'Heldenphase: Der General (nicht im Nahkampf): Je befreundeter Einheit mit zerstörten Modellen W6: 3+ → 1 Modell kehrt zurück',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='fy_horn',can:(S,o)=>{const g=genOf(S,o);return !!g&&!inCombat(S,g)},
  *run(G,o){const S=G.S;for(const u of fr(S,o).filter(x=>x.n<x.nmax)){const r=d6(S);if(r>=3){u.n++;G.note('Grimnirhorn: Wurf '+r+' – 1 Modell kehrt zu '+u.name+' zurück')}else G.note('Grimnirhorn: Wurf '+r+' – '+u.name+' kein Effekt')}},ai:()=>true},
 fy_stur:{n:'Zu stur zum Sterben',s:'Passiv: Zugende: General heilt W3 (automatisch)',army:1,src:(S,o)=>ENI(S,o)=='fy_stur'},
 fy_aura:{n:'Aura der Macht',s:'Passiv: +3 auf den Kontrollwert des Generals',army:1,src:(S,o)=>ENI(S,o)=='fy_aura'},
 fy_geist:{n:'Grimnirs Geist',s:'Passiv: Aktivierungswürfe der Ur-Gold-Runen dürfen wiederholt werden',army:1,src:(S,o)=>ENI(S,o)=='fy_geist'},
 fy_rune:{n:'Ur-Gold-Runen',s:'Passiv: Effekte der Runen wirken automatisch bis zum nächsten eigenen Zug',army:1,src:(S,o)=>trOf(S,o,'fy_rune')},
 fy_ikone:{n:'Ikone des Grimnir',s:'Passiv: +1 auf Schutzwürfe befreundeter Einheiten ganz innerhalb 12"',unit:1,src:(S,u)=>hasAb(u,'fy_ikone')},
 fy_pflanz:{n:'Die Ikone aufpflanzen',s:'Heldenphase, 1× pro Schlacht: Befreundete Einheiten ganz innerhalb 12" haben bis Zugende Rettung 5+',ph:1,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'fy_pflanz'),
  *run(G,u){const S=G.S;const l=fr(S,u.o).filter(x=>wholly(x,u,12));l.forEach(x=>addFx(S,{k:'ward',u:x.id,v:5,exp:'turn'}));G.note('Die Ikone aufpflanzen: '+l.map(x=>x.name).join(', ')+' haben Rettung 5+')},ai:()=>true},
 fy_wacht:{n:'Pflichterfüllung bis in den Tod',s:'Passiv: Solange der General vollständig in Nahkampfreichweite ist, haben Wacht und General Rettung 5+',unit:1,src:(S,u)=>hasAb(u,'fy_wacht')},
 fy_wirb:{n:'Wirbelwind der Zerstörung',s:'Passiv: +1 Attacke, wenn die Einheit in diesem Zug angegriffen hat',unit:1,src:(S,u)=>hasAb(u,'fy_wirb')},
 bw_tasche:{n:'Inne Tasche stopf’n',s:'Nahkampfphase: Feind im Nahkampf: W6 ≥ 2× Ausdauer → 1 Modell wird getötet',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bw_tasche'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S,k=ENI(S,u.o)=='bw_grosse'&&u.gen?2:1,done=[];for(let i=0;i<k;i++){const t=yield* pk(G,u.o,'Inne Tasche stopf’n ('+(i+1)+'/'+k+'): Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1&&!done.includes(x)).map(x=>[lab(x),x]),scE);if(!t)break;done.push(t);const r=d6(S),need=2*t.wm;hdr(G,'Inne Tasche stopf’n',r,r>=need,need,t.name+': 1 Modell wird getötet','Kein Effekt (Ausdauer '+t.wm+')');if(r>=need){hurt(G,t,Math.max(1,t.wm-t.dmg));if(RGI(S,u.o)=='bw_fein'&&u.dmg>0){const h=d3(S);u.dmg=Math.max(0,u.dmg-h);G.note('Feindfresser: '+u.name+' heilt bis zu '+h)}}}},ai:()=>true},
 bw_gebr:{n:'Lautes Gebrüll',s:'Nahkampfphase: Feind im Nahkampf: 2+ → −1 auf Trefferwürfe seiner Attacken (Phase)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bw_gebr'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Lautes Gebrüll: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Lautes Gebrüll',r,r>=2,2,t.name+': −1 auf Trefferwürfe','Kein Effekt');if(r>=2)addFx(S,{k:'hitA',u:t.id,v:-1,exp:'ph'})},ai:()=>true},
 bw_steine:{n:'Nehmt euch die Steine un’ werft se!',s:'Heldenphase: Befreundete Einheit ganz innerhalb 12" um den General: +1 Attacke bei Felsbrocken werfen (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bw_steine'),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Nehmt euch die Steine: Einheit',FL(S,u.o,x=>x!==u&&wholly(x,u,12)),x=>mx(x));if(!t)return;addFx(S,{k:'rockA',u:t.id,exp:'turn'});G.note('Nehmt euch die Steine: '+t.name+' +1 Attacke bei Felsbrocken werfen')},ai:()=>true},
 bw_erd:{n:'Erderschütternder Angriff',s:'Angriffsphase, 1× pro Phase (Armee): Einheit, die angegriffen hat: je Feind im Nahkampf 3+ → kämpft zuletzt',ph:4,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='bw_erd',can:(S,o)=>fr(S,o).some(x=>has(S.T.charged,x.id)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Erderschütternder Angriff: Einheit',x=>has(S.T.charged,x.id));if(!t)return;for(const e of foes(S,t).filter(x=>x.x>=0&&dist(t,x)<=1)){const r=d6(S);hdr(G,'Erderschütternder Angriff ('+e.name+')',r,r>=3,3,e.name+' kämpft zuletzt','Kein Effekt');if(r>=3)add(S.T.SL,e.id)}},ai:()=>true},
 bw_fein:{n:'Feindfresser',s:'Passiv: Wird durch „Inne Tasche stopf’n“ ein Modell getötet, heilt die Einheit W3',army:1,src:(S,o)=>RGI(S,o)=='bw_fein'},
 bw_zaeh:{n:'Monstermäßig zäh',s:'Passiv: Ausdauer des Generals 15',army:1,src:(S,o)=>ENI(S,o)=='bw_zaeh'},
 bw_grosse:{n:'Richtich grosse Tasche',s:'Passiv: „Inne Tasche stopf’n“ des Generals darf 2 Einheiten wählen',army:1,src:(S,o)=>ENI(S,o)=='bw_grosse'},
 bw_lul:{n:'Langer Lulatsch',s:'Passiv: Angriffswurf des Generals 3W6',army:1,src:(S,o)=>ENI(S,o)=='bw_lul'},
 bw_rev:{n:'Aggressives Revierverhalten',s:'Passiv: +1 auf Trefferwürfe des Generals gegen Einheiten auf einem Ziel, das du nicht kontrollierst',army:1,src:(S,o)=>ENI(S,o)=='bw_rev'},
 bw_baum:{n:'Baum fällt!',s:'Passiv: Stirbt ein Gargant: Wettwurf; Gewinner wählt Punkt, Feinde in 2" erleiden W3 tödlichen Schaden',unit:1,src:(S,u)=>hasAb(u,'bw_baum')},
 kh_verfolg:{n:'Die Beute verfolgen',s:'Heldenphase: Karanak bewegt sich W6" (nicht im Nahkampf enden, außer er stand darin; näher an die Beute)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kh_verfolg'),
  *run(G,u){const S=G.S,r=d6(S),b=beute(S,u.o),inC=inCombat(S,u),d0=b&&b.x>=0?dist(u,b):0;const a=yield* destReq(G,u,r,{text:'Die Beute verfolgen: bis '+r+' Zoll',chk:a=>{if(!inC&&S.U.some(e=>e.o!=u.o&&e.x>=0&&Math.hypot(a.x-e.x,a.y-e.y)-u.r-e.r<=1))return 'Darf nicht im Nahkampf enden';if(b&&b.x>=0&&Math.hypot(a.x-b.x,a.y-b.y)-u.r-b.r>=d0)return 'Muss näher an die Beute heran';return ''}});if(!a.stay){applyMove(S,u,a,r);add(S.T.moved,u.id);G.note('Die Beute verfolgen: '+u.name+' bewegt sich')}},ai:()=>true},
 kh_jaeger:{n:'Rudeljäger',s:'Nahkampfphase: Feind im Nahkampf mit dieser Einheit und einer Bluthunde-Einheit: Krit. bei unmodifiziert 5+ gegen ihn (Zug)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kh_jaeger'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S;const c=foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1&&S.U.some(h=>h.o==u.o&&h.dn=='Bluthunde'&&h.x>=0&&dist(h,x)<=1));const t=yield* pk(G,u.o,'Rudeljäger: Ziel',c.map(x=>[lab(x),x]),scE);if(!t)return;addFx(S,{k:'crit5',u:u.id,exp:'turn'});G.note('Rudeljäger: '+u.name+' Krit. bei 5+ (Zug)')},ai:()=>true},
 kh_tod:{n:'Todessprung',s:'Angriffsphase, 1× pro Schlacht: Angriffswurf des Generals mit zusätzlichem Würfel (Zug)',ph:4,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='kh_tod',can:(S,o)=>gOK(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'tod',u:g.id,exp:'turn'});G.note('Todessprung: '+g.name+' würfelt beim Angriff 3W6 (muss im Nahkampf mit der Beute enden)')},ai:()=>true},
 kh_wild:{n:'Wilder und Wilder',s:'Nahkampfphase, 1× pro Schlacht: Einheit im Nahkampf: +1 Attacke (Held: +W3) auf Nahkampfwaffen (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='kh_wild',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Wilder und Wilder: Einheit',x=>inCombat(S,x));if(!t)return;const v=foes(S,t).some(e=>e.x>=0&&dist(t,e)<=1&&isHero(e))?d3(S):1;addFx(S,{k:'att',u:t.id,v,exp:'turn'});G.note('Wilder und Wilder: '+t.name+' +'+v+' Attacken')},ai:()=>true},
 kh_geruch:{n:'Der Geruch von Blut',s:'Passiv: +1 auf Treffer- und Verwundungswürfe im Nahkampf gegen Einheiten, denen in diesem Zug Schaden zugewiesen wurde',army:1,src:(S,o)=>RGI(S,o)=='kh_geruch'},
 kh_blut:{n:'Von Blut gestärkt',s:'Passiv: Zugende: General heilt W3 (automatisch)',army:1,src:(S,o)=>ENI(S,o)=='kh_blut'},
 kh_fass:{n:'Schwer zu fassender Jäger',s:'Passiv: −1 auf Treffer- und Verwundungswürfe für Fernkampfattacken gegen den General',army:1,src:(S,o)=>ENI(S,o)=='kh_fass'},
 kh_bisse:{n:'Wilde Bisse',s:'Passiv: Zugende: General im Nahkampf mit der Beute → Beute erleidet W3 tödlichen Schaden (automatisch)',army:1,src:(S,o)=>ENI(S,o)=='kh_bisse'},
});
 // ---- Ogor-Schlundstämme: Tyrannengebrüll ----
 Object.assign(HK,{
  og_hunger:{chg:()=>1},
  og_bauch:{hit:(S,u,e,shoot)=>shoot&&!has(S.T.moved,u.id)?1:0},
  og_linie:{wndT:(S,d,a,shoot)=>shoot?-1:0},
  og_rhinox:{wpn:(S,u,w)=>w[0]=='Scharfe Rhinoxhörner'&&has(S.T.charged,u.id)?w.map((v,i)=>i==6?3:v):w}
 });
 Object.assign(AB,{
  og_rang:{n:'Tyrann ersten Ranges',s:'Heldenphase: Befreundete Einheit ganz innerhalb 12" (nicht der Tyrann selbst): +3 Kontrolle bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'og_rang'),can:(S,u)=>fr(S,u.o).some(x=>x!==u&&wholly(x,u,12)),
   *run(G,u){const S=G.S;const t=yield* pk(G,u.o,'Tyrann ersten Ranges: Ziel',FL(S,u.o,x=>x!==u&&wholly(x,u,12)),x=>mx(x));if(!t)return;addFx(S,{k:'ctl',u:t.id,v:3,exp:'own'});rep(G,'Tyrann ersten Ranges',[],t.name+': +3 Kontrolle bis zu deinem nächsten Zug')},ai:()=>true},
  og_hunger:{n:'Von Hunger getrieben',s:'Passiv: +1 auf Angriffswürfe der Einheit',unit:1,src:(S,u)=>hasAb(u,'og_hunger')},
  og_bauch:{n:'Nach Bauchgefühl schießen',s:'Passiv: +1 auf Trefferwürfe im Fernkampf, wenn die Einheit sich in diesem Zug nicht bewegt hat',unit:1,src:(S,u)=>hasAb(u,'og_bauch')},
  og_linie:{n:'Linienbrecher',s:'Passiv: −1 auf Verwundungswürfe für Fernkampfattacken gegen diese Einheit',unit:1,src:(S,u)=>hasAb(u,'og_linie')},
  og_rhinox:{n:'Rhinox-Angriff',s:'Passiv: Schaden der Scharfen Rhinoxhörner ist 3, wenn die Einheit in diesem Zug angegriffen hat',unit:1,src:(S,u)=>hasAb(u,'og_rhinox')},
  og_schmetter:{n:'Schmetterwanst',s:'Angriffsphase, 1× pro Phase (Armee): Jede befreundete Einheit, die angegriffen hat, wählt 1 Feind im Nahkampf: 4+ → 1 tödlicher Schaden',ph:4,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='og_schmetter',can:(S,o)=>fr(S,o).some(x=>has(S.T.charged,x.id)&&en(S,o).some(e=>inCombat(S,e)&&dist(x,e)<=1)),
   *run(G,o){const S=G.S;for(const u of fr(S,o).filter(x=>has(S.T.charged,x.id))){const c=en(S,o).filter(e=>dist(u,e)<=1);if(!c.length)continue;const t=yield* pk(G,o,'Schmetterwanst: Ziel für '+u.name,[...c.map(x=>[lab(x),x]),['Kein Wurf',null]],x=>x?scE(x):-1e9);if(!t)continue;const r=d6(S);hdr(G,'Schmetterwanst ('+u.name+')',r,r>=4,4,t.name+': 1 tödlicher Schaden','Kein Effekt');if(r>=4)mort(G,t,1,'Schmetterwanst')}},ai:()=>true},
  og_zaeh:{n:'Zähe Zucht',s:'Passiv: +1 Ausdauer für Eisenspeier und Trauerfangreiter',army:1,src:(S,o)=>RGI(S,o)=='og_zaeh'},
  og_sturm:{n:'Sturmläufer',s:'Passiv: Bewegung des Generals 8"',army:1,src:(S,o)=>ENI(S,o)=='og_sturm'},
  og_phiole:{n:'Steinyakblut-Phiole',s:'Passiv, 1× pro Schlacht: Wird der General erstmals von einer gegnerischen Attacke angesagt, hat er in dieser Phase Rettung 3+',army:1,src:(S,o)=>ENI(S,o)=='og_phiole'},
  og_bruell:{n:'Donnerndes Brüllen',s:'Nahkampfphase: Würfle: 4+ → −1 auf Trefferwürfe feindlicher Einheiten innerhalb 9" um den General (Phase)',ph:5,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='og_bruell',can:(S,o)=>{const g=genOf(S,o);return !!g},
   *run(G,o){const S=G.S,g=genOf(S,o);const r=d6(S);hdr(G,'Donnerndes Brüllen',r,r>=4,4,'Feinde innerhalb 9": −1 auf Trefferwürfe','Kein Effekt');if(r>=4)en(S,o).filter(e=>dist(g,e)<=9).forEach(e=>addFx(S,{k:'hit',u:e.id,v:-1,exp:'ph'}))},ai:()=>true},
  og_made:{n:'Fettmade',s:'Bewegungsphase, 1× pro Schlacht: Eisenspeier oder Trauerfangreiter in Nahkampfreichweite des Generals heilen W6',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='og_made',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>(x.dn=='Eisenspeier'||x.dn=='Trauerfangreiter')&&dist(g,x)<=1&&x.dmg>0)},
   *run(G,o){const S=G.S,g=genOf(S,o);const t=yield* pk(G,o,'Fettmade: Einheit heilen',FL(S,o,x=>(x.dn=='Eisenspeier'||x.dn=='Trauerfangreiter')&&dist(g,x)<=1),x=>x.dmg||0);if(!t)return;const h=d6(S);t.dmg=Math.max(0,(t.dmg||0)-h);rep(G,'Fettmade',row('Heilung',[h]),t.name+' heilt '+h)},ai:()=>true}
 });
 // ---- Sklaven der Finsternis: Bluthauchlegion ----
 Object.assign(HK,{
  sd_auge:{ward:(S,u)=>agH(S,u,2)?6:0,run:(S,u)=>agH(S,u,3)?1:0,wndT:(S,d,a,shoot)=>agH(S,d,4)?-1:0,rend:(S,u,e,shoot,w)=>!shoot&&agH(S,u,5)?1:0},
  sd_erob:{ctl:(S,u)=>/^Chaoskrieger/.test(u.dn||u.n||'')?3:0},
  sd_boten:{wnd:(S,u,e,shoot)=>!shoot&&e&&S.obj.some((p,k)=>claims(S,e,k)&&S.oc[k]!==u.o)?1:0},
  sd_lanze:{rend:(S,u,e,shoot,w)=>!shoot&&w&&w[0]=='Verfluchte Lanze'&&has(S.T.charged,u.id)?1:0},
  sd_khorne:{rend:(S,u,e,shoot,w)=>!shoot&&u.gen&&has(S.T.charged,u.id)?1:0},
  sd_nurgle:{wndT:(S,d,a,shoot)=>!shoot&&d.gen?-1:0}
 });
 GL.place.sdm=(S,o,u,x,y,a)=>{const e=placeErr(S,'rein',o,u,x,y,a);if(e)return e;const g=gnl(S,o);return g&&wholly({...u,x,y},g,6)?'':'Ganz innerhalb von 6 Zoll um den General, mehr als 6 Zoll von Feinden'};
 Object.assign(AB,{
  sd_auge:{n:'Auge der Götter',s:'Zugende (jeder Zug), 1× pro Zug: Eigene Einheit, die ein nicht gegnerisch kontrolliertes Ziel beansprucht (nicht im Nahkampf) oder in diesem Zug eine Einheit zerstört hat, würfelt auf der Tabelle (2 Rettung 6+, 3 +1 Rennen, 4 −1 Verwundung gegen sie, 5 +1 Wucht, 6 freie Wahl) – dauerhaft (automatisch am Zugende)',army:1,src:(S,o)=>trOf(S,o,'sd_auge')},
  sd_gunst:{n:'Günstling des Pantheons',s:'Heldenphase: W6 4+ → Wurf auf der „Auge der Götter“-Tabelle für diese Einheit',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sd_gunst'),can:()=>true,
   *run(G,u){const S=G.S,r=d6(S);hdr(G,'Günstling des Pantheons',r,r>=4,4,'Wurf auf der „Auge der Götter“-Tabelle','Kein Effekt');if(r>=4)yield* augeRoll(G,u.o,u,'Günstling')},ai:()=>true},
  sd_champ:{n:'Entschlossener Champion',s:'Nahkampfphase: Befreundete Einheit ganz innerhalb 12" (nicht der Champion): W6 2+ → +1 auf Trefferwürfe in dieser Phase',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sd_champ'),can:(S,u)=>fr(S,u.o).some(x=>x!==u&&wholly(x,u,12)),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Entschlossener Champion: Ziel',FL(S,u.o,x=>x!==u&&wholly(x,u,12)),x=>mx(x));if(!t)return;const r=d6(S);hdr(G,'Entschlossener Champion',r,r>=2,2,t.name+': +1 auf Trefferwürfe in dieser Phase','Kein Effekt');if(r>=2)addFx(S,{k:'hitA',u:t.id,v:1,exp:'ph'})},ai:()=>true},
  sd_tod:{n:'Schneller Tod',s:'Angriffsphase: Hat die Einheit angegriffen: Feind innerhalb 1": W6 2+ → W3 tödlicher Schaden',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sd_tod'),can:(S,u)=>has(S.T.charged,u.id)&&foes(S,u).some(x=>x.x>=0&&dist(u,x)<=1),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Schneller Tod: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Schneller Tod',r,r>=2,2,t.name+': W3 tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,d3(S),'Schneller Tod')},ai:()=>true},
  sd_boten:{n:'Boten der Vernichtung',s:'Passiv: +1 auf Verwundungswürfe im Nahkampf gegen Einheiten, die ein nicht von dir kontrolliertes Ziel beanspruchen',unit:1,src:(S,u)=>hasAb(u,'sd_boten')},
  sd_lanze:{n:'Im Angriff aufgespießt',s:'Passiv: +1 Wucht der Verfluchten Lanzen, wenn die Einheit im selben Zug angegriffen hat',unit:1,src:(S,u)=>hasAb(u,'sd_lanze')},
  sd_banner:{n:'Schreckensbanner',s:'Heldenphase, nur Runde 1, 1× pro Schlacht: Chaoskrieger- oder Chaosritter-Einheit würfelt auf der „Auge der Götter“-Tabelle',ph:1,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='sd_banner',can:(S,o)=>S.round==1&&fr(S,o).some(isCK),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Schreckensbanner: Einheit',FL(S,o,isCK),x=>10-agL(S,x).length*2);if(!t)return;yield* augeRoll(G,o,t,'Schreckensbanner')},ai:()=>true},
  sd_erob:{n:'Dunkle Eroberer',s:'Passiv: +3 Kontrolle für befreundete Chaoskrieger-Einheiten',army:1,src:(S,o)=>RGI(S,o)=='sd_erob'},
  sd_khorne:{n:'Mal des Khorne',s:'Passiv: +1 Wucht der Nahkampfwaffen des Generals, wenn er im selben Zug angegriffen hat',army:1,src:(S,o)=>ENI(S,o)=='sd_khorne'},
  sd_nurgle:{n:'Mal des Nurgle',s:'Passiv: −1 auf Verwundungswürfe für Nahkampfattacken gegen den General',army:1,src:(S,o)=>ENI(S,o)=='sd_nurgle'},
  sd_slaan:{n:'Mal des Slaanesh',s:'Passiv: Der General kämpft zuerst',army:1,src:(S,o)=>ENI(S,o)=='sd_slaan'},
  sd_tzeentch:{n:'Mal des Tzeentch',s:'Bewegungsphase, 1× pro Schlacht: Befreundete Einheit (nicht der General) wird ganz innerhalb 6" um den General, >6" von Feinden neu aufgestellt; keine Bewegung-Fähigkeiten mehr in dieser Phase',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='sd_tzeentch',can:(S,o)=>!!genOf(S,o)&&fr(S,o).some(x=>!x.gen),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Mal des Tzeentch: Einheit',FL(S,o,x=>!x.gen),x=>mx(x));if(!t)return;if(yield* relocate(G,o,t,'sdm','Mal des Tzeentch','Neu aufstellen: ganz innerhalb 6 Zoll um den General, mehr als 6 Zoll von allen Feinden'))addFx(S,{k:'nomove',u:t.id,exp:'ph'})},ai:()=>false}
 });

 // ---- Sklaven der Finsternis: Finsterschwur-Plünderer ----
 Object.assign(HK,{
  sd_klinge:{wpn:(S,u,w)=>w[0]=='Runengravierte Axt'?w.map((v,i)=>i==5?2:v):w},
  sd_talis:{ward:()=>4},
  sd_reiter:{hitT:(S,d,a,shoot)=>shoot?-1:0}
 });
 GL.after.push((G,u,e,k)=>{const S=G.S;if(!hasAb(e,'sd_glor')||!S.U.includes(u))return;let n=0;const rs=[];for(let i=0;i<k;i++){const r=d6(S);rs.push(r);if(r>=5)n++}rep(G,'Glorreicher Tod ('+e.name+')',row('Würfe (5+)',rs,5),n?u.name+': '+n+' tödlicher Schaden':'Kein Effekt');if(n)mort(G,u,n,'Glorreicher Tod')});
 Object.assign(AB,{
  sd_schwur:{n:'Schwüre der Finsternis',s:'Heldenphase, 1× pro Zug (Armee): Taktikkarte als Schwur zeigen. Wird ihr Vorhaben in diesem Zug erfüllt, wird sie zur Seite gelegt (zählt nicht zu den 3 Handkarten) und ihr Befehl bleibt einsetzbar',ph:1,freq:'turn',army:1,src:(S,o)=>trOf(S,o,'sd_schwur'),can:(S,o)=>S.P[o].hand.some(c=>!(S.P[o].aside||[]).includes(c)),
   *run(G,o){const S=G.S,p=S.P[o],c0=p.hand.filter(c=>!(p.aside||[]).includes(c));const c=yield* pk(G,o,'Schwur: Taktikkarte zeigen',c0.map(c=>[TAC[c-1][0]+' – '+TAC[c-1][1],c]),c=>CH[c]&&CH[c](S,o)?2:1);if(!c)return;(S.oath||(S.oath=[null,null]))[o]=c;G.note((o?'Computer':'Du')+' schwört: '+TAC[c-1][0])},ai:()=>true},
  sd_ueberleg:{n:'Schwur der Überlegenheit',s:'Heldenphase: Befreundete Einheit ganz innerhalb 12" um die Generalin: +1 auf Trefferwürfe bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sd_ueberleg'),can:(S,u)=>fr(S,u.o).some(x=>x!==u&&wholly(x,u,12)),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Schwur der Überlegenheit: Ziel',FL(S,u.o,x=>x!==u&&wholly(x,u,12)),x=>mx(x));if(!t)return;addFx(S,{k:'hitA',u:t.id,v:1,exp:'own'});rep(G,'Schwur der Überlegenheit',[],t.name+': +1 auf Trefferwürfe bis zu deinem nächsten Zug')},ai:()=>true},
  sd_vision:{n:'Visionen des Ruhms',s:'Heldenphase: 8 Würfel, je 4+ = 1 Wiederholung (Treffer, Verwundung oder Schutz) bis zu deinem nächsten Zug (automatisch bei misslungenen Würfen; Rennen ausgenommen)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sd_vision'),can:()=>true,
   *run(G,u){const S=G.S,rs=[];for(let i=0;i<8;i++)rs.push(d6(S));const n=rs.filter(x=>x>=4).length;if(n)addFx(S,{k:'rrt',u:u.id,v:n,n0:n,dice:rs.slice(),exp:'own'});rep(G,'Visionen des Ruhms',row('8 Würfel (4+)',rs,4),n?u.name+': '+n+' Wiederholung(en) bis zu deinem nächsten Zug':'Keine Wiederholung');if(n&&!G.isAI(u.o)&&(S.rrpol||[])[u.o]==null){const c=yield* choice(G,u.o,'Visionen des Ruhms','Deine Wiederholungswürfel: '+rs.join(", ")+' ('+n+' Treffer). Sie wiederholen Treffer-, Verwundungs- und Schutzwürfe. Einsatz:',['Bei jedem Wurf nachfragen','Automatisch','Nicht einsetzen'].map(x=>({t:x})),{pref:1});(S.rrpol||(S.rrpol=[null,null]))[u.o]=[2,1,0][c]}},ai:()=>true},
  sd_reiter:{n:'Schnelle Angreifer',s:'Passiv: −1 auf Trefferwürfe für Fernkampfattacken gegen diese Einheit',unit:1,src:(S,u)=>hasAb(u,'sd_reiter')},
  sd_glor:{n:'Glorreicher Tod',s:'Passiv: Pro im Nahkampf getötetem Modell W6: 5+ → 1 tödlicher Schaden für den Angreifer (automatisch)',unit:1,src:(S,u)=>hasAb(u,'sd_glor')},
  sd_wut:{n:'Arkhars Wut',s:'Nahkampfphase, 1× pro Zug (Armee): Befreundete Einheit im Nahkampf: +1 Wucht und +1 Attacken der Nahkampfwaffen (nicht Begleiter) bis Zugende',ph:5,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='sd_wut',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Arkhars Wut: Einheit im Nahkampf',FL(S,o,x=>inCombat(S,x)),x=>mx(x));if(!t)return;addFx(S,{k:'rendN',u:t.id,v:1,exp:'turn'});addFx(S,{k:'attN',u:t.id,v:1,exp:'turn'});rep(G,'Arkhars Wut',[],t.name+': +1 Wucht und +1 Attacken im Nahkampf bis Zugende')},ai:()=>true},
  sd_invasor:{n:'Furchtlose Invasoren',s:'Bewegungsphase, 1× pro Zug (Armee): Befreundete Einheit im Nahkampf: Rückzug ohne tödlichen Schaden, danach noch Angriff möglich',ph:2,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='sd_invasor',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Furchtlose Invasoren: Einheit im Nahkampf',FL(S,o,x=>inCombat(S,x)),x=>mx(x));if(!t)return;addFx(S,{k:'klaev',u:t.id,exp:'turn'});rep(G,'Furchtlose Invasoren',[],t.name+': Rückzug ohne tödlichen Schaden, danach Angriff erlaubt')},ai:()=>true},
  sd_klinge:{n:'Blutrünstige Klinge',s:'Passiv: Wucht der Runengravierten Axt der Generalin ist 2',army:1,src:(S,o)=>ENI(S,o)=='sd_klinge'},
  sd_talis:{n:'Götterschattentalisman',s:'Passiv: Generalin hat Rettung 4+',army:1,src:(S,o)=>ENI(S,o)=='sd_talis'},
  sd_ritual:{n:'Grausamer Ritualist',s:'Passiv: Beim Ziehen der Taktikkarten (Generalin auf dem Schlachtfeld): 1 zusätzliche Karte ziehen, dann 1 Handkarte unter das Deck legen',army:1,src:(S,o)=>ENI(S,o)=='sd_ritual'},
  sd_ueber:{n:'Überfallchampion',s:'Angriffsphase: Andere befreundete Einheit ganz innerhalb 12" um die Generalin darf Angriffswürfe wiederholen (bis Zugende)',ph:4,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='sd_ueber',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>x!==g&&wholly(x,g,12))},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Überfallchampion: Ziel',FL(S,o,x=>x!==g&&wholly(x,g,12)),x=>mx(x));if(!t)return;addFx(S,{k:'rrc',u:t.id,v:1,exp:'turn'});rep(G,'Überfallchampion',[],t.name+' darf Angriffswürfe wiederholen')},ai:()=>true}
 });

 // ---- Tiefenvolk der Idoneth: Seelenraubgesellschaft ----
 Object.assign(HK,{
  id_tiden:{hitT:(S,d,a,shoot)=>shoot&&S.round==1?-1:0,ranOK:(S,u)=>S.round==2?(has(S.T.rtr||[],u.id)?0:1):S.round==4?(has(S.T.rtr||[],u.id)?1:0):0,first:(S,u)=>S.round==3?1:0},
  id_welle:{rend:(S,u,e,shoot,w)=>!shoot&&/^Namarti-Schwertknechte/.test(u.dn||u.n||'')&&has(S.T.charged,u.id)?1:0},
  id_raeuber:{att:(S,u,w)=>w&&w[0]=='Wilder Biss des Allopexes'&&foes(S,u).some(e=>e.x>=0&&dist(u,e)<=6&&(e.dmg>0||has(S.T.sm||[],e.id)))?1:0}
 });
 Object.assign(AB,{
  id_tiden:{n:'Tiden des Todes',s:'Passiv, nach Schlachtrunde: R1 −1 auf Fernkampf-Treffer gegen die Einheit · R2 Rennen, danach Fernkampf/Angriff erlaubt · R3 kämpft zuerst · R4 Rückzug, danach Fernkampf/Angriff erlaubt',army:1,src:(S,o)=>trOf(S,o,'id_tiden')},
  id_nebel:{n:'Ritual des schleichenden Nebels',s:'Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12": W6 3+ → −1 auf Verwundungswürfe gegen sie bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'id_nebel'),can:(S,u)=>fr(S,u.o).some(x=>wholly(x,u,12)&&vis(S,u,x)),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Ritual des schleichenden Nebels: Ziel',FL(S,u.o,x=>wholly(x,u,12)&&vis(S,u,x)),x=>mx(x));if(!t)return;const b=u.gen&&ENI(S,u.o)=='id_erz'?1:0,r=d6(S);hdr(G,'Ritual des schleichenden Nebels',r+b,r+b>=3,3,t.name+': −1 auf Verwundungswürfe gegen die Einheit bis zu deinem nächsten Zug','Kein Effekt');if(r+b>=3)addFx(S,{k:'wndT',u:t.id,v:-1,exp:'own'})},ai:()=>true},
  id_bio:{n:'Biovoltaischer Schlag',s:'Angriffsphase, 1× pro Schlacht: Hat die Einheit angegriffen: Feind innerhalb 1" – 1 Würfel pro Modell: 4-5 → 1, 6+ → W3 tödlicher Schaden (+1 auf jeden Wurf, wenn das Ziel mehr Modelle hat)',ph:4,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'id_bio'),can:(S,u)=>has(S.T.charged,u.id)&&foes(S,u).some(x=>x.x>=0&&dist(u,x)<=1),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Biovoltaischer Schlag: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const b=t.n>u.n?1:0,rs=[];let dm=0;for(let i=0;i<u.n;i++){const r=d6(S);rs.push(r);const v=r+b;if(v>=6)dm+=d3(S);else if(v>=4)dm+=1}rep(G,'Biovoltaischer Schlag',row('Würfe'+(b?' (+1)':''),rs),dm?t.name+': '+dm+' tödlicher Schaden':'Kein Effekt');if(dm)mort(G,t,dm,'Biovoltaischer Schlag')},ai:()=>true},
  id_raeuber:{n:'Blutrünstige Räuber',s:'Passiv: +1 Attacke des Wilden Bisses, solange ein Feind innerhalb 6" angeschlagen ist oder in diesem Zug ein Modell verloren hat',unit:1,src:(S,u)=>hasAb(u,'id_raeuber')},
  id_hiebe:{n:'Geschwungene Hiebe',s:'Passiv: +1 Wucht der Lanmari gegen Monster',unit:1,src:(S,u)=>hasAb(u,'id_hiebe')},
  id_welle:{n:'Weg der hereinbrechenden Welle',s:'Passiv: +1 Wucht der Nahkampfwaffen befreundeter Namarti-Schwertknechte, die im selben Zug angegriffen haben',army:1,src:(S,o)=>RGI(S,o)=='id_welle'},
  id_raub:{n:'Schleiersee-Raubfische',s:'Zugende (jeder Zug), 1× pro Zug: Kavallerie-Einheit, die in diesem Zug gekämpft hat, heilt W3 (am Zugende angeboten)',army:1,src:(S,o)=>RGI(S,o)=='id_raub'},
  id_erz:{n:'Erzritualist',s:'Passiv: +1 auf Würfe für das Ritual des schleichenden Nebels',army:1,src:(S,o)=>ENI(S,o)=='id_erz'},
  id_stahl:{n:'Stahlausterpanzer',s:'Passiv: Modifikatoren auf Schutzwürfe des Generals (positiv wie negativ, auch Wucht) werden ignoriert',army:1,src:(S,o)=>ENI(S,o)=='id_stahl'},
  id_geist:{n:'Geistesfeuer',s:'Nahkampfphase, 1× pro Schlacht: Feind im Nahkampf mit dem General trifft bis Phasenende nur bei unmodifiziertem 6',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='id_geist',can:(S,o)=>{const g=genOf(S,o);return !!g&&foes(S,g).some(e=>e.x>=0&&dist(g,e)<=1)},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Geistesfeuer: Feind im Nahkampf',foes(S,g).filter(e=>e.x>=0&&dist(g,e)<=1).map(x=>[lab(x),x]),scE);if(!t)return;addFx(S,{k:'hit6',u:t.id,exp:'ph'});rep(G,'Geistesfeuer',[],t.name+' trifft bis zum Phasenende nur bei einem unmodifizierten Trefferwurf von 6')},ai:()=>true},
  id_leck:{n:'Köstliche Leckerbissen',s:'Heldenphase: Jede befreundete Kavallerie-Einheit in Nahkampfreichweite des Generals heilt 1',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='id_leck',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>kw(x,'Kavallerie')&&dist(g,x)<=1&&x.dmg>0)},
   *run(G,o){const S=G.S,g=genOf(S,o);const l=fr(S,o).filter(x=>kw(x,'Kavallerie')&&dist(g,x)<=1&&x.dmg>0&&canHealX(S,x));l.forEach(x=>{x.dmg=Math.max(0,x.dmg-1)});rep(G,'Köstliche Leckerbissen',[],l.length?l.map(x=>x.name).join(', ')+' heilt je 1':'Keine Einheit geheilt')},ai:()=>true}
 });

 // ---- Tiefenvolk der Idoneth: Akhelianer-Flutgarde ----
 Object.assign(HK,{
  id_imp:{first:(S,u)=>S.imp&&S.imp[u.o]===0?1:0,wpn:(S,u,w)=>S.imp&&S.imp[u.o]===1&&w[1]===0&&!(w[7]||'').includes('T')?w.map((v,i)=>i==7?(v||'')+'T':v):w},
  id_amulett:{ward:()=>5},
  id_volt:{wpn:(S,u,w)=>w[0]=='Königliche Akhelianer-Waffen'&&!(w[7]||'').includes('C')?w.map((v,i)=>i==7?(v||'')+'C':v):w}
 });
 Object.assign(AB,{
  id_imp:{n:'Königlicher Imperativ',s:'Nahkampfphase, nur Runde 3, 1× pro Schlacht (Armee): Auf sie! (befreundete Einheiten kämpfen zuerst) oder Gezielter Schlag (Nahkampfwaffen haben Krit. tödlich) – für den Rest der Schlacht',ph:5,freq:'battle',army:1,src:(S,o)=>trOf(S,o,'id_imp'),can:(S,o)=>S.round==3,
   *run(G,o){const S=G.S;const c=yield* pk(G,o,'Königlicher Imperativ',[['Auf sie! – befreundete Einheiten kämpfen zuerst',0],['Gezielter Schlag – Nahkampfwaffen haben Krit. (tödlich)',1]],x=>x==1?2:1);if(c==null)return;(S.imp||(S.imp=[null,null]))[o]=c;rep(G,'Königlicher Imperativ',[],c==0?'Auf sie!: Befreundete Einheiten haben Kämpft zuerst (Rest der Schlacht)':'Gezielter Schlag: Nahkampfwaffen befreundeter Einheiten haben Krit. (tödlich) (Rest der Schlacht)')},ai:()=>true},
  id_raub1:{n:'Zum Raub entschlossen',s:'Heldenphase: Andere befreundete Einheit vollständig in Nahkampfreichweite: W6 3+ → +1 auf Schutzwürfe bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'id_raub1'),can:(S,u)=>fr(S,u.o).some(x=>x!==u&&wholly(x,u,1)),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Zum Raub entschlossen: Ziel',FL(S,u.o,x=>x!==u&&wholly(x,u,1)),x=>mx(x));if(!t)return;const r=d6(S);hdr(G,'Zum Raub entschlossen',r,r>=3,3,t.name+': +1 auf Schutzwürfe bis zu deinem nächsten Zug','Kein Effekt');if(r>=3)addFx(S,{k:'svP',u:t.id,v:1,exp:'own'})},ai:()=>true},
  id_wellen:{n:'Wellenreiter',s:'Angriffsphase: Hat die Einheit angegriffen: Feind innerhalb 1": W3, bei 2+ tödlicher Schaden in Höhe des Wurfs',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'id_wellen'),can:(S,u)=>has(S.T.charged,u.id)&&foes(S,u).some(x=>x.x>=0&&dist(u,x)<=1),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Wellenreiter: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d3(S);hdr(G,'Wellenreiter',r,r>=2,2,t.name+': '+r+' tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,r,'Wellenreiter')},ai:()=>true},
  id_bio2:{n:'Biovoltaischer Schlag',s:'Angriffsphase, 1× pro Schlacht: Hat die Einheit angegriffen: Feind innerhalb 1" – 1 Würfel pro Modell, je 3+ (+1 wenn das Ziel mehr Modelle hat) → 1 tödlicher Schaden',ph:4,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'id_bio2'),can:(S,u)=>has(S.T.charged,u.id)&&foes(S,u).some(x=>x.x>=0&&dist(u,x)<=1),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Biovoltaischer Schlag: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const b=t.n>u.n?1:0,rs=[];let dm=0;for(let i=0;i<u.n;i++){const r=d6(S);rs.push(r);if(r+b>=3)dm++}rep(G,'Biovoltaischer Schlag',row('Würfel (3+'+(b?', +1':'')+')',rs,3-b),dm?t.name+': '+dm+' tödlicher Schaden':'Kein Effekt');if(dm)mort(G,t,dm,'Biovoltaischer Schlag')},ai:()=>true},
  id_feld:{n:'Biovoltaisches Feld',s:'Nahkampfphase, 1× pro Schlacht: Feind im Nahkampf mit der Einheit: W6 3+ → −1 auf den Attackenwert seiner Nahkampfwaffen bis Zugende',ph:5,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'id_feld'),can:(S,u)=>foes(S,u).some(x=>x.x>=0&&dist(u,x)<=1),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Biovoltaisches Feld: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);hdr(G,'Biovoltaisches Feld',r,r>=3,3,t.name+': −1 Attacken (Nahkampf) bis Zugende','Kein Effekt');if(r>=3)addFx(S,{k:'att',u:t.id,v:-1,exp:'turn'})},ai:()=>true},
  id_lauf:{n:'Im Laufen schießen',s:'Passiv: Fernkampf auch nach Rennen oder Rückzug im selben Zug',unit:1,src:(S,u)=>hasAb(u,'id_lauf')},
  id_speer:{n:'Der Speer von Asphoren',s:'Angriffsphase, 1× pro Zug (Armee): Einheit außerhalb des Nahkampfs: +1 auf Angriffswürfe bis Zugende',ph:4,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='id_speer',can:(S,o)=>fr(S,o).some(x=>!inCombat(S,x)&&!has(S.T.charged,x.id)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Der Speer von Asphoren: Einheit',FL(S,o,x=>!inCombat(S,x)&&!has(S.T.charged,x.id)),x=>mx(x));if(!t)return;addFx(S,{k:'chg',u:t.id,v:1,exp:'turn'});rep(G,'Der Speer von Asphoren',[],t.name+': +1 auf Angriffswürfe bis Zugende')},ai:()=>true},
  id_schild:{n:'Der Schild von Ulchiss',s:'Bewegungsphase, 1× pro Zug (Armee): Einheit im Nahkampf: Rückzüge verursachen bis Zugende keinen tödlichen Schaden',ph:2,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='id_schild',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)),
   *run(G,o){const S=G.S,t=yield* pk(G,o,'Der Schild von Ulchiss: Einheit im Nahkampf',FL(S,o,x=>inCombat(S,x)),x=>mx(x));if(!t)return;addFx(S,{k:'nort',u:t.id,exp:'turn'});rep(G,'Der Schild von Ulchiss',[],t.name+': Rückzug ohne tödlichen Schaden bis Zugende')},ai:()=>true},
  id_seelen:{n:'Pflichtbewusste Seelen',s:'Heldenphase, 1× pro Schlacht: Einheit ganz innerhalb 12" um den General: 1 Modell (Infanterie: W3) zurückbringen',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='id_seelen',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>x.n<x.nmax&&wholly(x,g,12))},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Pflichtbewusste Seelen: Einheit',FL(S,o,x=>x.n<x.nmax&&wholly(x,g,12)),x=>x.nmax-x.n);if(!t)return;const k=kw(t,'Infanterie')?d3(S):1,b=Math.min(k,t.nmax-t.n);t.n+=b;rep(G,'Pflichtbewusste Seelen',[],t.name+': '+b+' Modell(e) zurück')},ai:()=>true},
  id_amulett:{n:'Schimmerndes Amulett',s:'Passiv: General hat Rettung 5+',army:1,src:(S,o)=>ENI(S,o)=='id_amulett'},
  id_volt:{n:'Voltaischer Angriff',s:'Passiv: Königliche Akhelianer-Waffen des Generals haben Angriff (+1 Schaden)',army:1,src:(S,o)=>ENI(S,o)=='id_volt'},
  id_raubseele:{n:'Seelenräuber',s:'Zugende (jeder Zug): Ist der General im Nahkampf, heilt er W3 (automatisch)',army:1,src:(S,o)=>ENI(S,o)=='id_raubseele'}
 });

 // ---- Orruk-Kriegsclans: Eisenkiefa-Moschmob ----
 Object.assign(HK,{
  oz_natur:{att:(S,u,w,e,shoot)=>!shoot&&has(S.T.charged,u.id)&&(S.T.cr0[u.id]||0)>=8?1:0},
  oz_stein:{wpn:(S,u,w)=>w[1]===0&&w[5]!==2?w.map((v,i)=>i==5?2:v):w},
  oz_troph:{ctl:(S,u)=>u.gen?5-u.cv:0},
  oz_ruest:{ward:()=>6},
  oz_wut:{first:(S,u)=>has(S.T.charged,u.id)?1:0}
 });
 GL.chg.push((S,u)=>{try{if(ENI(S,u.o)!='oz_mega')return 0;const g=genOf(S,u.o);return g&&g!==u&&has(S.T.charged,g.id)&&wholly(u,g,12)?1:0}catch(e){return 0}});
 const ozTargets=(S,o)=>fr(S,o).filter(x=>x.x>=0&&!has(S.T.arr,x.id));
 function* ozMove(G,t){const S=G.S,was=inCombat(S,t);S.cmb=true;try{const a=yield* destReq(G,t,3,{text:'Mächtige Zerstörer: bis 3 Zoll (darf im Nahkampf enden'+(was?', muss im Nahkampf enden':'')+')',chk:was?(a=>{const g={...t,x:a.x,y:a.y};return foes(S,t).some(e=>e.x>=0&&dist(g,e)<=1)?'':'Die Einheit muss im Nahkampf enden'}):undefined});if(!a.stay){applyMove(S,t,a,3);add(S.T.moved,t.id);G.note('Mächtige Zerstörer: '+t.name+' bewegt sich')}}finally{S.cmb=false}}
 Object.assign(AB,{
  oz_zerst:{n:'Mächtige Zerstörer',s:'Heldenphase, 1× pro Zug (Armee): Befreundete Einheit (nicht in diesem Zug aufgestellt) bewegt sich bis 3", auch in den Nahkampf; war sie im Nahkampf, muss sie dort enden',ph:1,freq:'turn',army:1,src:(S,o)=>trOf(S,o,'oz_zerst'),can:(S,o)=>ozTargets(S,o).length>0,
   *run(G,o){const S=G.S;let all=false;if(RGI(S,o)=='oz_radau'&&!usedKey(S,o+':radau','battle')&&ozTargets(S,o).length>1){const ok=G.isAI(o)?ozTargets(S,o).length>=3:yield* yn(G,o,'Ordentlicher Radau','Alle befreundeten Einheiten (nicht in diesem Zug aufgestellt) sind Ziele von Mächtige Zerstörer?',true);if(ok){useKey(S,o+':radau','battle');all=true}}
    if(!all){const t=yield* pk(G,o,'Mächtige Zerstörer: Einheit',FL(S,o,x=>x.x>=0&&!has(S.T.arr,x.id)),x=>mx(x));if(!t)return;yield* ozMove(G,t);return}
    const done=[];for(let i=0;i<9;i++){const c=ozTargets(S,o).filter(x=>!done.includes(x));if(!c.length)break;const t=yield* pk(G,o,'Ordentlicher Radau ('+(done.length+1)+'): Einheit',[...c.map(x=>[lab(x),x]),['Keine weitere',null]],x=>x?mx(x):-1e9);if(!t)break;done.push(t);yield* ozMove(G,t)}},ai:()=>true},
  oz_natur:{n:'Naturgewalt',s:'Passiv: Unmodifizierter Angriffswurf 8+: +1 auf den Attackenwert der Nahkampfwaffen der Einheit bis Zugende',army:1,src:(S,o)=>RGI(S,o)=='oz_natur'},
  oz_radau:{n:'Ordentlicher Radau',s:'Reaktion, 1× pro Schlacht: Bei „Mächtige Zerstörer“ sind alle befreundeten Einheiten (nicht in diesem Zug aufgestellt) Ziele',army:1,src:(S,o)=>RGI(S,o)=='oz_radau'},
  oz_stein:{n:'Bernsteinknochen-Wetzstein',s:'Passiv: Wuchtwert der Nahkampfwaffen des Generals ist 2',army:1,src:(S,o)=>ENI(S,o)=='oz_stein'},
  oz_troph:{n:'Trophäenschädel',s:'Passiv: Kontrollwert des Generals ist 5',army:1,src:(S,o)=>ENI(S,o)=='oz_troph'},
  oz_ruest:{n:'Rüstung des Gork',s:'Passiv: General hat Rettung 6+',army:1,src:(S,o)=>ENI(S,o)=='oz_ruest'},
  oz_mega:{n:'Megabossig',s:'Passiv: Hat der General angegriffen: +1 auf Angriffswürfe befreundeter Einheiten ganz innerhalb 12" (bis Zugende)',army:1,src:(S,o)=>ENI(S,o)=='oz_mega'},
  oz_haut:{n:'Haut drauf, Jungs',s:'Heldenphase: Diese Einheit oder befreundete Kraftprotz-Einheit ganz innerhalb 12": W6 2+ → +1 Attacken (Nahkampf) bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'oz_haut'),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Haut drauf, Jungs: Ziel',FL(S,u.o,x=>x===u||(kw(x,'Kraftprotz')&&wholly(x,u,12))),x=>mx(x));if(!t)return;const r=d6(S);hdr(G,'Haut drauf, Jungs',r,r>=2,2,t.name+': +1 Attacken bis zu deinem nächsten Zug','Kein Effekt');if(r>=2)addFx(S,{k:'att',u:t.id,v:1,exp:'own'})},ai:()=>true},
  oz_schild:{n:'Schildschlag',s:'Nahkampfphase: Feind innerhalb 1": 1 W6 je Modell der Einheit innerhalb 3" um das Ziel, je 6+ → 1 tödlicher Schaden',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'oz_schild'),can:(S,u)=>foes(S,u).some(x=>x.x>=0&&dist(u,x)<=1),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Schildschlag: Ziel',foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=1).map(x=>[lab(x),x]),scE);if(!t)return;const T=abs(t),k=abs(u).filter(m=>T.some(q=>mgap(m,q)<=3)).length,rs=[];let dm=0;for(let i=0;i<k;i++){const r=d6(S);rs.push(r);if(r>=6)dm++}rep(G,'Schildschlag',row('Würfel (6+)',rs,6),dm?t.name+': '+dm+' tödlicher Schaden':'Kein Effekt');if(dm)mort(G,t,dm,'Schildschlag')},ai:()=>true},
  oz_wut:{n:'Entfesselte Wut',s:'Passiv: Kämpft zuerst, wenn die Einheit im selben Zug angegriffen hat',unit:1,src:(S,u)=>hasAb(u,'oz_wut')},
  oz_glotz:{n:'Was glotzt’n so?',s:'Passiv: Feindliche Einheiten mit Ausdauerwert 1 oder 2 können im Nahkampf mit dieser Einheit keine Ziele beanspruchen',unit:1,src:(S,u)=>hasAb(u,'oz_glotz')}
 });

}
