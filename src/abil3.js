// Fähigkeiten der dritten Armeenwelle (Hooks siehe hooks.js).
import {scE,mort,AB,abUsed,en,roll2,fr,lab,hdr,pk,FL,vis,genOf,nmove,pickF,rep,row} from './abil.js';
import {HK} from './hooks.js';
import {ARMY} from './data.js';
import {d6,d3} from './util.js';
import {addFx,fxL} from './fx.js';
import {wholly} from './models.js';
import {inCombat,isHero,hasAb,mvOf,ENI,RGI,mx,wnd,hurt,dist,foes,nm} from './rules.js';
import {usedKey,useKey} from './fx.js';
import {udist} from './models.js';
import {destReq} from './cards.js';
import {applyMove} from './rules.js';
import {add,has} from './util.js';

const trOf=(S,o,k)=>{try{return ARMY[S.K.army[o]].tr.includes(k)}catch(e){return false}};
const kw=(u,w)=>(u.kw||'').includes(w);
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
export function* eot3(G,o,act){const S=G.S;
 for(const k of fr(S,o).filter(x=>hasAb(x,'ob_ernte')&&(x.kt||0)>0)){const t=yield* pk(G,o,'Konstrukt reparieren: Mortek-Garde',FL(S,o,x=>x.dn=='Mortek-Garde'&&dist(k,x)<=6&&x.n<x.nmax),x=>x.nmax-x.n);if(!t)continue;let h=0;const rs=[];for(let i=0;i<k.kt;i++){const r=d6(S);rs.push(r);if(r>=4)h++}h=Math.min(h,t.nmax-t.n);t.n+=h;G.rep('Konstrukt reparieren',[row('Würfe (4+) – '+k.kt+' Knochentribut',rs,4),{k:'txt',s:h+' Modell(e) kehren zurück zu '+t.name}]);k.kt=0}}
export function install3(){
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
}
