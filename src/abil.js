// Fähigkeiten-Register der Spearheads. Jede Fähigkeit: Name, Kurztext, Phase, Häufigkeit, Quelle, Ausführung.
// unit-Fähigkeiten stehen im Einheiten-Menü, army-Fähigkeiten (Kampfeigenschaften, Regiment, Verbesserung) im Hauptmenü.
import {OR,objD,W,H,CR,tdist} from './geom.js';
import {ARMY} from './data.js';
import {d6,d3,add,has} from './util.js';
import {ask,choice} from './game.js';
import {abs,mgap,wholly,inRange} from './models.js';
import {addFx,fxL,fxSum,usedKey,useKey} from './fx.js';
import {doRetreat,destReq} from './cards.js';
import {ABT,hasAb,RGI,ENI,gnl,foes,byId,dist,inCombat,isHero,wnd,mx,nm,hurt,place,ctrl,cvOf,pileIn,obs,pr,chargeDest,mvOf,applyMove,AN,cycOf,canHeal,hidden,blk,rsvForm,RG,dk,fdTake,fdStage} from './rules.js';
import {mkUnit} from './state.js';
import {setAbs} from './models.js';

const fr=(S,o)=>S.U.filter(x=>x.o==o&&x.x>=0),en=(S,o)=>S.U.filter(x=>x.o!=o&&x.x>=0);
const lab=x=>x.name+' ('+wnd(x)+'/'+mx(x)+')';
const KH=u=>/^(Skelette|Grabhügel)/.test(u.dn);
const armyN=(S,o)=>ARMY[S.K.army[o]].n;
export const CYC=['Zahlloses Ungeziefer (−1 auf Trefferwürfe gegen eigene Einheiten)','Elendsplage (Feinde nahe eigenen Einheiten: keine Heilung)','Aufblühender Unrat (−3 Kontrollwert von Feinden im Nahkampf)','Abstoßender Ekel (−1 auf Angriffswürfe der Feinde)'];
function* yn(G,o,t,text,def=true){if(G.isAI(o))return def;return (yield* choice(G,o,t,text,[{t:'Einsetzen'},{t:'Nicht einsetzen'}],{pref:0}))==0}
const claims=(S,u,k)=>S.obj[k]&&u.M&&abs(u).some(m=>objD(S.obj[k],m.x,m.y)-m.l/2<=0);
const claimsAny=(S,u)=>S.obj.some((p,k)=>claims(S,u,k));
const roll2=S=>[d6(S),d6(S)];
const rep=(G,t,...b)=>G.rep(t,b.map(x=>typeof x=='string'?{k:'txt',s:x}:x));
const row=(l,v,th)=>({k:'row',l,v,th});
const mort=(G,x,n,why)=>{if(n>0){G.note(why+': '+n+' tödlicher Schaden auf '+x.name);hurt(G,x,n)}};
const pickF=(G,o,t,f,self)=>ask(G,o,t,fr(G.S,o).filter(x=>f(x)).map(x=>[lab(x),x]));
const pickE=(G,o,t,f)=>ask(G,o,t,en(G.S,o).filter(x=>f(x)).map(x=>[lab(x),x]));
const genOf=(S,o)=>gnl(S,o);

export const AB={
// ---------- Einheiten-Fähigkeiten ----------
 kskn:{n:'König schlurfender Knochen',s:'Heldenphase: 2+ → +1 auf Treffer im Nahkampf (Knochenhorde, 12")',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'kskn'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'König schlurfender Knochen: Ziel',x=>KH(x)&&wholly(x,u,12));if(!t)return;const r=d6(S);
   if(r>=2)addFx(S,{k:'hit',u:t.id,v:1,exp:'turn'});rep(G,'König schlurfender Knochen',row('Wurf (2+)',[r],2),r>=2?t.name+': +1 auf Trefferwürfe im Nahkampf bis Zugende':'Kein Effekt')},
  ai:(S,u)=>true},
 wille:{n:'Wille der gehörnten Ratte',s:'Heldenphase: 3+ → Ergebnis auf den Kontrollwert (bis zum nächsten eigenen Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'wille'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Wille der gehörnten Ratte: Ziel',x=>wholly(x,u,13));if(!t)return;const r=d6(S);
   if(r>=3)addFx(S,{k:'ctl',u:t.id,v:r,exp:'own'});rep(G,'Wille der gehörnten Ratte',row('Wurf (3+)',[r],3),r>=3?t.name+': Kontrollwert +'+r:'Kein Effekt')},ai:()=>true},
 verd:{n:'Verdorren',s:'Heldenphase: Zauber 2W6 (6+): W3 tödlicher Schaden, Feind innerhalb 13"',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'verd'),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Verdorren: Ziel',x=>dist(u,x)<=13);if(!t)return;const [a,b]=roll2(S);let d=0;if(a+b>=6)d=d3(S);
   rep(G,'Verdorren',row('Zauberwurf (6+)',[a,b],0),a+b>=6?t.name+': '+d+' tödlicher Schaden':'Zauber misslingt');if(d)hurt(G,t,d)},ai:()=>true},
 wut:{n:'Entfesselte Warpwut',s:'Nahkampfphase, 1× pro Schlacht: W3 tödlicher Schaden auf diese Einheit, +1 Attacke (Phase)',ph:5,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'wut'),
  *run(G,u){const S=G.S,d=d3(S);addFx(S,{k:'att',u:u.id,v:1,exp:'ph'});rep(G,'Entfesselte Warpwut',row('W3',[d]),u.name+': +1 Attacke in dieser Phase');hurt(G,u,d)},ai:(S,u)=>inCombat(S,u)&&u.n*u.wm-u.dmg>3},
 streit:{n:'Streiterin des Sigmar',s:'Nahkampfphase, 1× pro Schlacht: Rettung 5+ (Phase)',ph:5,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'streit'),
  *run(G,u){addFx(G.S,{k:'ward',u:u.id,v:5,exp:'ph'});G.note('Streiterin des Sigmar: Rettung 5+ in dieser Phase')},ai:(S,u)=>inCombat(S,u)},
 ban:{n:'Banner der Neugeschmiedeten',s:'Heldenphase: heile W3 und +3 Kontrollwert (12")',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ban'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Banner der Neugeschmiedeten: Ziel',x=>wholly(x,u,12));if(!t)return;const h=canHeal(S,t)?d3(S):0;t.dmg=Math.max(0,t.dmg-h);addFx(S,{k:'ctl',u:t.id,v:3,exp:'own'});rep(G,'Banner der Neugeschmiedeten',row('Heilen (W3)',[h]),t.name+': +3 Kontrollwert bis zum nächsten eigenen Zug')},ai:()=>true},
 gew:{n:'Gewalt eines Meteors',s:'Angriffsphase: nach Angriffswurf 8+: Feind innerhalb 1" kämpft zuletzt',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gew'),can:(S,u)=>(S.T.cr[u.id]||0)>=8,
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Gewalt eines Meteors: Ziel',x=>dist(u,x)<=1);if(!t)return;add(S.T.SL,t.id);G.note('Gewalt eines Meteors: '+t.name+' kämpft zuletzt')},ai:()=>true},
 azyr:{n:'Entfesseltes Azyr',s:'Angriffsphase: nach dem Angriff 2+ → W3 tödlicher Schaden (Feind innerhalb 1")',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'azyr'),can:(S,u)=>has(S.T.charged,u.id),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Entfesseltes Azyr: Ziel',x=>dist(u,x)<=1);if(!t)return;const r=d6(S);rep(G,'Entfesseltes Azyr',row('Wurf (2+)',[r],2),r>=2?'W3 tödlicher Schaden':'Kein Effekt');if(r>=2)hurt(G,t,d3(S))},ai:()=>true},
 urt:{n:'Urteil verhängen',s:'Nahkampfphase, 1× pro Schlacht: Nicht-Held (12") kämpft zweimal, danach zuletzt',ph:5,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'urt'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Urteil verhängen: Ziel',x=>!isHero(x)&&wholly(x,u,12)&&!has(S.T.fought,x.id));if(!t)return;add(S.T.dbl,t.id);G.note('Urteil verhängen: '+t.name+' kämpft zweimal')},ai:()=>false},
 gep:{n:'Geplanter Angriff',s:'Heldenphase: Ziel wählen, das du nicht kontrollierst; +1 Treffer gegen Feinde dort',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gep'),
  *run(G,u){const S=G.S,k=yield* ask(G,u.o,'Geplanter Angriff: Ziel',S.obj.map((p,i)=>[(S.K.realm?DGNx:HZNx)[i]+(S.oc[i]===u.o?' (kontrolliert)':''),i]).filter(x=>S.oc[x[1]]!==u.o));if(k==null)return;
   addFx(S,{k:'gep',o:u.o,v:k,exp:'turn'});G.note('Geplanter Angriff: +1 Treffer gegen Einheiten auf dem gewählten Ziel')},ai:()=>true},
 rf:{n:'Reinigendes Feuer',s:'Heldenphase: Gebet 3+ → je Modell des Ziels (12") 5+ = 1 tödlicher Schaden',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'rf'),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Reinigendes Feuer: Ziel',x=>dist(u,x)<=12);if(!t)return;const r=d6(S);let d=0,rs=[];
   if(r>=3){for(let i=0;i<t.n;i++){const q=d6(S);rs.push(q);if(q>=5)d++}}rep(G,'Reinigendes Feuer',row('Gebetswurf (3+)',[r],3),...(rs.length?[row('Je Modell (5+)',rs,5)]:[]),d?d+' tödlicher Schaden':'Kein Schaden');if(d)hurt(G,t,d)},ai:()=>true},
// ---------- Armee-Fähigkeiten (Kampfeigenschaften, Regiment, Verbesserung) ----------
 aura:{n:'Aura des Altertums',s:'Nahkampfphase, 1× pro Zug: 3+ → −1 Wucht der Nahkampfwaffen eines Feinds (bis zum nächsten eigenen Zug)',ph:5,freq:'turn',army:1,src:(S,o)=>armyN(S,o)=='Knochenhorde-Gruftheer',
  can:(S,o)=>en(S,o).some(e=>fr(S,o).some(f=>dist(f,e)<=CR)),
  *run(G,o){const S=G.S,t=yield* pickE(G,o,'Aura des Altertums: Ziel',e=>fr(S,o).some(f=>dist(f,e)<=CR));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'rend',u:t.id,v:1,exp:'own'});
   rep(G,'Aura des Altertums',row('Wurf (3+)',[r],3),r>=3?t.name+': −1 Wucht bis zu deinem nächsten Zug':'Kein Effekt')},ai:()=>true},
 tot:{n:'Totenheerzug',s:'Heldenphase, 1× pro Zug: Nicht-Held ohne Nahkampf: +1" Bewegung, +3 Kontrollwert (Zug)',ph:1,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='tot',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Totenheerzug: Ziel',x=>!isHero(x)&&!inCombat(S,x));if(!t)return;addFx(S,{k:'mv',u:t.id,v:1,exp:'turn'});addFx(S,{k:'ctl',u:t.id,v:3,exp:'turn'});G.note('Totenheerzug: '+t.name+' +1" Bewegung, +3 Kontrollwert')},ai:()=>true},
 ahass:{n:'Angetrieben von Hass',s:'Angriffsphase: Einheit (12" um den General) darf Angriffswürfe wiederholen',ph:4,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='ahass',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Angetrieben von Hass: Ziel',x=>x!==g&&wholly(x,g,12));if(!t)return;addFx(S,{k:'rrc',u:t.id,v:1,exp:'turn'});G.note('Angetrieben von Hass: '+t.name+' darf Angriffswürfe wiederholen')},ai:()=>true},
 seelen:{n:'Seelensog-Anhänger',s:'Nahkampfphase, 1× pro Schlacht: 2+ → Feind im Nahkampf mit dem General kämpft zuletzt',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='seelen',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Seelensog-Anhänger: Ziel',e=>dist(g,e)<=CR);if(!t)return;const r=d6(S);if(r>=2)add(S.T.SL,t.id);rep(G,'Seelensog-Anhänger',row('Wurf (2+)',[r],2),r>=2?t.name+' kämpft zuletzt':'Kein Effekt')},ai:()=>true},
 wsg:{n:'Warpsteingeschosse',s:'Fernkampfphase, 1× pro Schlacht: Fernkampfwaffe erhält Krit. (tödlich)',ph:3,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='wsg',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Warpsteingeschosse: Einheit',x=>x.rw.length>0);if(!t)return;const w=t.rw.length>1?yield* ask(G,o,'Waffe wählen',t.rw.map(x=>[x[0],x[0]])):t.rw[0][0];addFx(S,{k:'crit',u:t.id,v:w,exp:'ph'});G.note('Warpsteingeschosse: '+w+' hat Krit. (tödlich)')},ai:()=>true},
 sch:{n:'Schwefelsprung',s:'Heldenphase: Zauber 2W6 (6+): General wird >6" von allen Feinden neu aufgestellt, danach keine Bewegung',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='sch',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),[a,b]=roll2(S);rep(G,'Schwefelsprung',row('Zauberwurf (6+)',[a,b],0),a+b>=6?'Der General erscheint an anderer Stelle':'Zauber misslingt');if(a+b<6)return;
   const px=g.x,py=g.y;g.x=-99;const p=yield* place(G,o,'rein',g,'Schwefelsprung','Neu aufstellen: mehr als 6 Zoll von allen Feinden',{});g.x=p.x;g.y=p.y;addFx(S,{k:'nomove',u:g.id,v:1,exp:'own'})},ai:()=>false},
 kae:{n:'Warpblitzkäfig',s:'Nahkampfphase, 1× pro Schlacht: Feind (6") 2+ kämpft zuletzt, bei 1: 1 tödlicher Schaden auf den General',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='kae',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Warpblitzkäfig: Ziel',e=>dist(g,e)<=6);if(!t)return;const r=d6(S);if(r>=2)add(S.T.SL,t.id);rep(G,'Warpblitzkäfig',row('Wurf (2+)',[r],2),r>=2?t.name+' kämpft zuletzt':(r==1?'1 tödlicher Schaden auf den General':'Kein Effekt'));if(r==1)hurt(G,g,1)},ai:(S,o)=>false},
 sie:{n:'Schlagt sie zurück',s:'Ende jedes Zugs: Einheiten im Nahkampf auf Zielen rücken nach, Feind 1": 4+ = 1 tödlicher Schaden',army:1,eot:1,src:(S,o)=>RGI(S,o)=='sie'},
 glanz:{n:'Strahlender Glanz',s:'Bewegungsphase, 1× pro Schlacht (Generalin aufgestellt): je 1 Modell zurück (12" um die Generalin)',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='glanz',can:(S,o)=>{const g=genOf(S,o);return !!g&&has(S.T.arr,g.id)},
  *run(G,o){const S=G.S,g=genOf(S,o);let c=0;fr(S,o).filter(x=>wholly(x,g,12)&&x.n<x.nmax&&canHeal(S,x)).forEach(x=>{x.n++;c++});G.note('Strahlender Glanz: '+c+' Modell(e) zurückgebracht')},ai:()=>true},
 falke:{n:'Falke der celestischen Himmel',s:'Nahkampfphase, 1× pro Schlacht: +1 auf Treffer für Einheiten ganz innerhalb 12" um die Generalin (Phase)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='falke',can:(S,o)=>!!genOf(S,o),
  *run(G,o){addFx(G.S,{k:'falke',o,exp:'ph'});G.note('Falke der celestischen Himmel: +1 auf Treffer in dieser Phase')},ai:(S,o)=>true},
 ruhm:{n:'Ruhmreiches Gleißen',s:'Nahkampfphase, 1× pro Schlacht: Einheit im Nahkampf; je verlorenem Modell 4+ → 1 tödlicher Schaden',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='ruhm',can:(S,o)=>fr(S,o).some(u=>inCombat(S,u)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Ruhmreiches Gleißen: Einheit',x=>inCombat(S,x));if(!t)return;addFx(S,{k:'ruhm',u:t.id,exp:'ph'});G.note('Ruhmreiches Gleißen: '+t.name)},ai:()=>true},
 qs:{n:'Quecksilbertrank',s:'Nahkampfphase, 1× pro Schlacht: General kämpft zuerst (Phase)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='qs',can:(S,o)=>!!genOf(S,o),
  *run(G,o){add(G.S.T.SF,genOf(G.S,o).id);G.note('Quecksilbertrank: der General kämpft zuerst')},ai:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)}},
 nm:{n:'Nullamulett',s:'Ende eines Zugs, 1× pro Schlacht: je Feind auf dem Ziel des Generals 2+ → Wurf vom Kontrollwert abziehen',army:1,eot:1,src:(S,o)=>ENI(S,o)=='nm'},
 fer:{n:'Fersengeld',s:'Nahkampfphase: 3+ → General zieht sich ohne tödlichen Schaden zurück',ph:5,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='fer',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),r=d6(S);rep(G,'Fersengeld',row('Wurf (3+)',[r],3),r>=3?'Der General zieht sich zurück':'Kein Effekt');if(r>=3)yield* doRetreat(G,g,{free:true})},ai:()=>false},
 azs:{n:'Azyrs Schild',s:'Heldenphase, 1× pro Zug: Einheit hat Rettung 5+ bis zu deinem nächsten Zug',ph:1,freq:'turn',army:1,src:(S,o)=>armyN(S,o)=='Wachsame Bruderschaft',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Azyrs Schild: Einheit',x=>true);if(!t)return;addFx(S,{k:'ward',u:t.id,v:5,exp:'own'});G.note('Azyrs Schild: '+t.name+' hat Rettung 5+')},ai:()=>true},
 sta:{n:'Sturmangriff',s:'Angriffsphase, 1× pro Schlacht: Einheit ohne Nahkampf darf nach dem Rennen angreifen',ph:4,freq:'battle',army:1,src:(S,o)=>armyN(S,o)=='Wachsame Bruderschaft',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Sturmangriff: Einheit',x=>!inCombat(S,x)&&has(S.T.ran,x.id));if(!t)return;add(S.T.FZ,t.id);G.note('Sturmangriff: '+t.name+' darf angreifen')},ai:()=>false,can:(S,o)=>fr(S,o).some(x=>has(S.T.ran,x.id)&&!inCombat(S,x))},
 drei:{n:'Immer drei Klauenschritte voraus',s:'Gegnerische Bewegungsphase, 1× pro Phase: Einheit ohne Nahkampf bewegt sich normal',army:1,opp:1,src:(S,o)=>armyN(S,o)=='Warpblitzschwarm'},
// ===== Zeloten / Sumpfschleichabande: bisher offene Verbesserungen =====
 bst:{n:'Bleibt standhaft, Kameraden',s:'Heldenphase, 1× pro Schlacht: Nicht-Held ganz innerhalb 12" um den General: Rettung 4+ bis zur nächsten Schlachtrunde',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='bst',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Bleibt standhaft, Kameraden: Einheit',x=>!isHero(x)&&wholly(x,g,12));if(!t)return;addFx(S,{k:'ward',u:t.id,v:4,exp:'rnd',r0:S.round});G.note('Bleibt standhaft, Kameraden: '+t.name+' hat Rettung 4+ bis zur nächsten Schlachtrunde')},ai:()=>true},
 ifo:{n:'Inbrünstige Forderung',s:'Nahkampfphase, 1× pro Zug: Nicht-Held ganz innerhalb 12" um den General: +1 auf Trefferwürfe im Nahkampf (Zug)',ph:5,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='ifo',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Inbrünstige Forderung: Einheit',x=>!isHero(x)&&wholly(x,g,12));if(!t)return;addFx(S,{k:'hit',u:t.id,v:1,exp:'turn'});G.note('Inbrünstige Forderung: '+t.name+' hat +1 auf Trefferwürfe im Nahkampf')},ai:(S,o)=>fr(S,o).some(x=>inCombat(S,x))},
 kie:{n:'Kiesel, der wie Morks Auge aussieht',s:'Gegnerische Bewegungsphase, 1× pro Schlacht: In der nächsten Fernkampfphase Rettung 5+ für Einheiten ganz innerhalb 12" um den General',army:1,opp:1,oph:2,when:'start',freq:'battle',src:(S,o)=>ENI(S,o)=='kie',can:(S,o)=>!!genOf(S,o),
  *run(G,o){addFx(G.S,{k:'kiesel',o,exp:'turn'});G.note('Kiesel: Einheiten nahe dem General haben in der nächsten Fernkampfphase Rettung 5+')},ai:(S,o)=>true},
 klae:{n:'Klävvara Plan',s:'Heldenphase, 1× pro Zug: Einheit ganz innerhalb 12" um den General: Rückzug ohne tödlichen Schaden, danach noch Fernkampf und Angriff',ph:1,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='klae',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Klävvara Plan: Einheit',x=>wholly(x,g,12));if(!t)return;addFx(S,{k:'klaev',u:t.id,exp:'turn'});G.note('Klävvara Plan: '+t.name+' kann sich ohne Schaden zurückziehen und danach noch schießen und angreifen')},ai:()=>false},
 aug:{n:'Augenbiss-Asche',s:'Nahkampfphase, 1× pro Schlacht: Feind im Nahkampf mit dem General; W6: 1–4 = −1 auf seine Trefferwürfe (Phase), 5+ = −1 für den Rest der Schlacht',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='aug',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Augenbiss-Asche: Ziel',e=>dist(g,e)<=CR);if(!t)return;const r=d6(S);addFx(S,{k:'hitA',u:t.id,v:-1,exp:r>=5?'perm':'ph'});rep(G,'Augenbiss-Asche',row('W6 (5+ = dauerhaft)',[r],5),t.name+': −1 auf Trefferwürfe '+(r>=5?'für den Rest der Schlacht':'für den Rest der Phase'))},ai:()=>true},
// ===== Nachtspuk: Verfluchte Fesselhorde =====
 gse:{n:'Gefangene Seelenenergie',s:'Heldenphase: 3+ → +1 auf Verwundungswürfe einer Einheit ganz innerhalb 12" (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gse'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Gefangene Seelenenergie: Ziel',x=>wholly(x,u,12));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'wnd',u:t.id,v:1,exp:'turn'});
   rep(G,'Gefangene Seelenenergie',row('Wurf (3+)',[r],3),r>=3?t.name+': +1 auf Verwundungswürfe bis Zugende':'Kein Effekt')},ai:()=>true},
 nglied:{n:'Noch ein Glied in der Kette',s:'Nahkampfphase: W6 (+1 nahe dem General) 3+ → +1 auf Trefferwürfe im Nahkampf für Einheiten ganz innerhalb 12"',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'nglied'),
  *run(G,u){const S=G.S,g=genOf(S,u.o),b=g&&wholly(u,g,12)?1:0,r=d6(S),ok=r+b>=3;
   if(ok)fr(S,u.o).filter(x=>wholly(x,u,12)).forEach(x=>addFx(S,{k:'hit',u:x.id,v:1,exp:'ph'}));
   rep(G,'Noch ein Glied in der Kette',row('Wurf (3+)'+(b?' +1':''),[r],3),ok?'+1 auf Trefferwürfe im Nahkampf für Einheiten in 12" (Phase)':'Kein Effekt')},ai:(S,u)=>fr(S,u.o).some(x=>inCombat(S,x))},
 gverb:{n:'Geisterhaftes Verblassen',s:'Bewegungsphase, 1× pro Schlacht: Einheit entfernen und mehr als 6" von allen Feinden neu aufstellen',ph:2,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'gverb'),
  *run(G,u){const S=G.S,o=u.o;u.x=-99;const p=yield* place(G,o,'rein',u,'Geisterhaftes Verblassen','Neu aufstellen: mehr als 6 Zoll von allen Feinden',{});u.x=p.x;u.y=p.y;G.note('Geisterhaftes Verblassen: '+u.name+' erscheint an anderer Stelle')},ai:()=>false},
 vbl:{n:'Verblassen',s:'Heldenphase, 1× pro Zug: Einheit, 3+ → +1 auf Schutzwürfe (Zug)',ph:1,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='vbl',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Verblassen: Einheit',x=>true);if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'svP',u:t.id,v:1,exp:'turn'});rep(G,'Verblassen',row('Wurf (3+)',[r],3),r>=3?t.name+': +1 auf Schutzwürfe bis Zugende':'Kein Effekt')},ai:()=>true},
 wsch:{n:'Wachsender Schrecken',s:'Ende eines Zugs, 1× pro Zug: Einheit, 2+ → Rundennummer vom Kontrollwert feindlicher Einheiten im Nahkampf mit ihr abziehen',army:1,eot:1,freq:'turn',src:(S,o)=>RGI(S,o)=='wsch'},
 geh:{n:'Geistergeheul',s:'Heldenphase, 1× pro Schlacht: Feind innerhalb 12" um den General würfelt bei Angriffen 1 Würfel weniger (bis zu deinem nächsten Zug)',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='geh',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Geistergeheul: Ziel',e=>dist(g,e)<=12);if(!t)return;addFx(S,{k:'cdie',u:t.id,v:1,exp:'own'});G.note('Geistergeheul: '+t.name+' würfelt bei Angriffen 1 Würfel weniger (mindestens 1)')},ai:(S,o)=>true},
 tbes:{n:'Tödliche Besessenheit',s:'Nahkampfphase, 1× pro Zug: feindlicher Held (12" um den General) + Einheit in seiner Nahkampfreichweite; W3, 2+ → so viel tödlicher Schaden auf einen von beiden',ph:5,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='tbes',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(h=>isHero(h)&&dist(g,h)<=12&&en(S,o).some(v=>v!==h&&dist(h,v)<=CR))},
  *run(G,o){const S=G.S,g=genOf(S,o),h=yield* pickE(G,o,'Tödliche Besessenheit: feindlicher Held',e=>isHero(e)&&dist(g,e)<=12&&en(S,o).some(v=>v!==e&&dist(e,v)<=CR));if(!h)return;
   const v=yield* pickE(G,o,'Tödliche Besessenheit: Einheit in seiner Nahkampfreichweite',e=>e!==h&&dist(h,e)<=CR);if(!v)return;const r=d3(S);
   rep(G,'Tödliche Besessenheit',row('W3 (2+)',[r],2),r>=2?'Tödlicher Schaden: '+r:'Kein Effekt');if(r<2)return;
   const t=yield* ask(G,o,'Tödliche Besessenheit: Wer erleidet den Schaden?',[[lab(h),h],[lab(v),v]]);mort(G,t||h,r,'Tödliche Besessenheit')},ai:()=>true},
 hor:{n:'Horrorgeschichten',s:'Nahkampfphase, 1× pro Schlacht: Feind-Infanterie/Kavallerie (6" um den General): Ersatzeinheit nach Verstärkung rufen hat die halbe Modellzahl',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='hor',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>/Infanterie|Kavallerie/.test(e.kw)&&dist(g,e)<=6)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Horrorgeschichten: Ziel',e=>/Infanterie|Kavallerie/.test(e.kw)&&dist(g,e)<=6);if(!t)return;t.horr=1;G.note('Horrorgeschichten: Ersatz für '+t.name+' hat nur die halbe Modellzahl')},ai:()=>true},
 ual:{n:'Unheiliges Antlitz',s:'Heldenphase, 1× pro Zug: Feind im Nahkampf (6" um den General): 3+ → er zieht sich zurück; danach 2W3 tödlicher Schaden, wenn er noch im Nahkampf ist',ph:1,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='ual',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=6&&inCombat(S,e))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Unheiliges Antlitz: Ziel',e=>dist(g,e)<=6&&inCombat(S,e));if(!t)return;const r=d6(S);rep(G,'Unheiliges Antlitz',row('Wurf (3+)',[r],3),r>=3?t.name+' muss sich zurückziehen':'Kein Effekt');if(r<3)return;
   yield* doRetreat(G,t);if(S.U.includes(t)&&inCombat(S,t)){const d=d3(S)+d3(S);mort(G,t,d,'Unheiliges Antlitz')}},ai:()=>true},
// ===== Maggotkin des Nurgle: Seuchenzelle =====
 fuelle:{n:'Fleischige Fülle',s:'Heldenphase: Zauber 2W6 (6+): −1 auf Verwundungswürfe gegen eine Einheit ganz innerhalb 12" (bis zu deinem nächsten Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'fuelle'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Fleischige Fülle: Ziel',x=>wholly(x,u,12));if(!t)return;const [a,b]=roll2(S);if(a+b>=6)addFx(S,{k:'wndT',u:t.id,v:-1,exp:'own'});
   rep(G,'Fleischige Fülle',row('Zauberwurf (6+)',[a,b],0),a+b>=6?t.name+': −1 auf Verwundungswürfe gegen die Einheit':'Zauber misslingt')},ai:()=>true},
 aufd:{n:'Aufdringlich',s:'Angriffsphase: nach dem Angriff, Feind im Nahkampf: W3, 2+ → so viel tödlicher Schaden',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'aufd'),can:(S,u)=>has(S.T.charged,u.id)&&inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Aufdringlich: Ziel',e=>dist(u,e)<=CR);if(!t)return;const r=d3(S);rep(G,'Aufdringlich',row('W3 (2+)',[r],2),r>=2?r+' tödlicher Schaden':'Kein Effekt');if(r>=2)hurt(G,t,r)},ai:()=>true},
 korr:{n:'Korrumpierung des Landes',s:'Ende deines Zugs, 1× pro Zug: Geländestück; W6 je Feind-Einheit innerhalb 3", 4+ → W3 tödlicher Schaden',army:1,eot:1,freq:'turn',src:(S,o)=>RGI(S,o)=='korr'},
 vbod:{n:'Verwesender Boden',s:'Gegnerische Heldenphase, 1× pro Schlacht: feindliche Einheiten −1 Bewegung und −1 auf Rennenwürfe (Zug)',army:1,opp:1,oph:1,when:'start',freq:'battle',src:(S,o)=>RGI(S,o)=='vbod',can:(S,o)=>en(S,o).length>0,
  *run(G,o){const S=G.S;en(S,o).forEach(e=>{addFx(S,{k:'mv',u:e.id,v:-1,exp:'turn'});addFx(S,{k:'run',u:e.id,v:-1,exp:'turn'})});G.note('Verwesender Boden: feindliche Einheiten haben −1 Bewegung und −1 auf Rennenwürfe')},ai:()=>true},
 gas:{n:'Gasausstoß',s:'Nahkampfphase, 1× pro Schlacht: Feind im Nahkampf mit dem General kämpft in diesem Zug zuletzt',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='gas',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Gasausstoß: Ziel',e=>dist(g,e)<=CR);if(!t)return;add(S.T.SL,t.id);G.note('Gasausstoß: '+t.name+' kämpft zuletzt')},ai:()=>true},
 tod:{n:'Überreife Totenschädel',s:'Fernkampfphase, 1× pro Zug (General nicht im Nahkampf): sichtbarer Feind innerhalb 7": W6 4+ → 1 tödlicher Schaden',ph:3,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='tod',can:(S,o)=>{const g=genOf(S,o);return !!g&&!inCombat(S,g)&&en(S,o).some(e=>dist(g,e)<=7&&!hidden(S,g,e))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Überreife Totenschädel: Ziel',e=>dist(g,e)<=7&&!hidden(S,g,e));if(!t)return;const r=d6(S);rep(G,'Überreife Totenschädel',row('Wurf (4+)',[r],4),r>=4?'1 tödlicher Schaden':'Kein Effekt');if(r>=4)hurt(G,t,1)},ai:()=>true},
// ===== Khazalid: Drakkblud-Clangarde =====
 ehre:{n:'Ehre jene, die vorausgingen',s:'Heldenphase, 1× pro Zug: Eine befreundete Einheit erhält 1 Grollmarker',ph:1,freq:'turn',army:1,src:(S,o)=>armyN(S,o)=='Drakkblud-Clangarde',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Ehre jene, die vorausgingen: Einheit',x=>true);if(!t)return;t.gm=(t.gm||0)+1;G.note('Grollmarker: '+t.name+' hat jetzt '+t.gm)},ai:()=>true},
 gf:{n:'Gestrenge Führung',s:'Heldenphase: Clanschilde ganz innerhalb 12": W6 3+ (Wiederholung mit Grollmarker) → +1 Wucht im Nahkampf (bis zu deinem nächsten Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gf'),can:(S,u)=>fr(S,u.o).some(x=>x.dn=='Clanschilde'&&wholly(x,u,12)),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Gestrenge Führung: Clanschilde',x=>x.dn=='Clanschilde'&&wholly(x,u,12));if(!t)return;let r=d6(S);const rs=[r];if(r<3&&(t.gm||0)>0){r=d6(S);rs.push(r)}
   if(r>=3)addFx(S,{k:'rendP',u:t.id,v:1,exp:'own'});rep(G,'Gestrenge Führung',row('Wurf (3+)'+((t.gm||0)>0?', wiederholbar':''),rs,3),r>=3?t.name+': +1 Wucht im Nahkampf':'Kein Effekt')},ai:()=>true},
 rhl:{n:'Runenhämmerer-Lehrling',s:'Fernkampfphase, 1× pro Zug: Ziel aller Schüsse dieser Einheit; W6 3+ (Wiederholung mit Grollmarker) → Rune der Verwerfung / Verbrennungen / Schock',ph:3,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'rhl'),
  can:(S,u)=>{const l=S.T.sh[u.id]||[];return l.length>0&&l.every(i=>i==l[0])&&!!byId(S,l[0])},
  *run(G,u){const S=G.S,o=u.o,l=S.T.sh[u.id],t=byId(S,l[0]);if(!t)return;let r=d6(S);const rs=[r];if(r<3&&(t.gm||0)>0){r=d6(S);rs.push(r)}
   rep(G,'Runenhämmerer-Lehrling',row('Wurf (3+)',rs,3),r>=3?'Wirkung wählbar':'Kein Effekt');if(r<3)return;
   S.rhl=S.rhl||{};const last=S.rhl[o],bad=last&&S.tn==last.t+2?last.e:-1;
   const opts=[['Rune der Verwerfung: −1 auf Verwundungswürfe der Nahkampfattacken des Ziels (bis zu deinem nächsten Zug)',0],['Verbrennungen: +1 auf Trefferwürfe von Nahkampfattacken gegen das Ziel (Zug)',1],['Schock: Das Ziel kämpft in diesem Zug zuletzt',2]].filter(x=>x[1]!=bad);
   const e=yield* ask(G,o,'Runenhämmerer-Lehrling: Wirkung wählen',opts);if(e==null)return;S.rhl[o]={e,t:S.tn};
   if(e==0)addFx(S,{k:'wndM',u:t.id,v:-1,exp:'own'});else if(e==1)addFx(S,{k:'hitTm',u:t.id,v:1,exp:'turn'});else add(S.T.SL,t.id);
   G.note('Runenhämmerer-Lehrling: '+['Rune der Verwerfung','Verbrennungen','Schock'][e]+' auf '+t.name)},ai:()=>true},
 licht:{n:'Inghildes leitendes Licht',s:'Heldenphase, 1× pro Schlacht: Befreundete Infanterie entfernen und mehr als 6" von Feinden neu aufstellen',ph:1,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='licht',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Inghildes leitendes Licht: Einheit',x=>/Infanterie/.test(x.kw));if(!t)return;const px=t.x,py=t.y;t.x=-99;const p=yield* place(G,o,'rein',t,'Inghildes leitendes Licht','Neu aufstellen: mehr als 6 Zoll von allen Feinden',{});t.x=p.x;t.y=p.y;G.note('Inghildes leitendes Licht: '+t.name+' wurde neu aufgestellt')},ai:()=>false},
 eis:{n:'Eiserne Einschüchterung',s:'Heldenphase, 1× pro Schlacht: Feind innerhalb 12" um den General: −W6 Kontrollwert (bis zu deinem nächsten Zug)',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='eis',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Eiserne Einschüchterung: Ziel',e=>dist(g,e)<=12&&!hidden(S,g,e));if(!t)return;const r=d6(S);addFx(S,{k:'ctl',u:t.id,v:-r,exp:'own'});rep(G,'Eiserne Einschüchterung',row('W6',[r]),t.name+': Kontrollwert −'+r)},ai:()=>true},
 takt:{n:'Gut durchdachte Taktiken',s:'Bewegungsphase, 1× pro Schlacht: Einheit ganz innerhalb 12" um den General zieht sich ohne tödlichen Schaden zurück und darf noch angreifen',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='takt',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>wholly(x,g,12)&&inCombat(S,x)&&!has(S.Ph.used,x.id))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Gut durchdachte Taktiken: Einheit',x=>wholly(x,g,12)&&inCombat(S,x)&&!has(S.Ph.used,x.id));if(!t)return;yield* doRetreat(G,t,{free:true});add(S.T.FZ,t.id)},ai:()=>false},
 vergel:{n:'Einen Groll zu vergelten',s:'Ende der gegnerischen Fernkampfphase: Einheit außerhalb des Nahkampfs, der Schaden zugeteilt wurde, darf sich normal bewegen',army:1,opp:1,oph:3,when:'end',freq:'phase',src:(S,o)=>ENI(S,o)=='vergel',can:(S,o)=>fr(S,o).some(x=>(S.Ph.alc||{})[x.id]>0&&!inCombat(S,x)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Einen Groll zu vergelten: Einheit',x=>(S.Ph.alc||{})[x.id]>0&&!inCombat(S,x));if(!t)return;const a=yield* destReq(G,t,mvOf(S,t),{text:'Einen Groll zu vergelten'});if(!a.stay)applyMove(S,t,a,mvOf(S,t))},ai:()=>true},
// ===== Khazalid: Magma-Fyrd =====
 rune:{n:'Die Runen erwecken',s:'Heldenphase: Einheit ganz innerhalb 12", 3+ → −1 auf Verwundungswürfe der Nahkampfattacken gegen sie (bis zu deinem nächsten Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'rune'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Die Runen erwecken: Ziel',x=>wholly(x,u,12));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'wndTm',u:t.id,v:-1,exp:'own'});rep(G,'Die Runen erwecken',row('Wurf (3+)',[r],3),r>=3?t.name+': −1 auf Verwundungswürfe von Nahkampfattacken gegen die Einheit':'Kein Effekt')},ai:()=>true},
 vverd:{n:'Verdammtes Viech',s:'Nahkampfphase: Feind im Nahkampf, 3+ → −1 auf seine Nahkampf-Trefferwürfe (Zug)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'vverd'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Verdammtes Viech: Ziel',e=>dist(u,e)<=CR);if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'hit',u:t.id,v:-1,exp:'turn'});rep(G,'Verdammtes Viech',row('Wurf (3+)',[r],3),r>=3?t.name+': −1 auf Trefferwürfe im Nahkampf':'Kein Effekt')},ai:()=>true},
 lava:{n:'Lavaverkrustet',s:'Fernkampfphase: Feind, der Schaden von dieser Einheit erlitt: 3+ → −1 Bewegung bis zu deinem nächsten Zug',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'lava'),can:(S,u)=>(S.Ph.shd||[]).some(k=>k.startsWith(u.id+'>')&&byId(S,+k.split('>')[1])),
  *run(G,u){const S=G.S,ids=(S.Ph.shd||[]).filter(k=>k.startsWith(u.id+'>')).map(k=>+k.split('>')[1]),t=yield* pickE(G,u.o,'Lavaverkrustet: Ziel',e=>ids.includes(e.id));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'mv',u:t.id,v:-1,exp:'own'});rep(G,'Lavaverkrustet',row('Wurf (3+)',[r],3),r>=3?t.name+': −1 Bewegung':'Kein Effekt')},ai:()=>true},
 kampf:{n:'Kampfeslustig',s:'Aufstellungsphase, 1× pro Schlacht: Nicht-Monster-Einheit bewegt sich normal',army:1,freq:'battle',src:(S,o)=>RGI(S,o)=='kampf'},
 suehn:{n:'Den Groll sühnen',s:'Aufstellungsphase, 1× pro Schlacht: Feind-Einheit wählen; befreundete Infanterie wiederholt Trefferwürfe von 1 im Nahkampf gegen sie',army:1,freq:'battle',src:(S,o)=>RGI(S,o)=='suehn'},
 glut:{n:'Glut der Runen',s:'Ende des gegnerischen Zugs, 1× pro Zug: Einheit (1× pro Schlacht je Einheit) würfelt 6 Würfel gegen einen Feind im Nahkampf; je 4+ = 1 tödlicher Schaden',army:1,eot:1,freq:'turn',src:(S,o)=>RGI(S,o)=='glut'},
 fyrf:{n:'Fŷrfunken',s:'Ende jedes Zugs: Feind im Nahkampf mit dem General erleidet 1 tödlichen Schaden',army:1,eot:1,src:(S,o)=>ENI(S,o)=='fyrf'},
 flam:{n:'Flammenkrone',s:'Nahkampfphase, 1× pro Schlacht: General hat Rettung 4+ (Zug); ab deinem nächsten Zug −1 auf seine Rettungswürfe',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='flam',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'ward',u:g.id,v:4,exp:'turn'});addFx(S,{k:'wardM',u:g.id,v:1,exp:'perm'});G.note('Flammenkrone: '+g.name+' hat Rettung 4+ in diesem Zug')},ai:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)}},
 feuer:{n:'Das Feuer schüren',s:'Fernkampfphase, 1× pro Schlacht: Tosender Fŷratem hat W3+4 Attacken; bei jedem Treffer-Wurf von 1 erleidet der General W3 Schaden',ph:3,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='feuer',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=10)},
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'schuer',u:g.id,v:1,exp:'ph'});G.note('Das Feuer schüren: Tosender Fŷratem hat W3+4 Attacken in dieser Phase')},ai:()=>true},
// ---------- Neue Spearheads (Runde 3) ----------
 od_frucht:{n:'Präsenz der Fruchtbarkeit',s:'Heldenphase, 1× pro Phase: heile (W3) eine befreundete Einheit',ph:1,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='od_frucht',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Präsenz der Fruchtbarkeit: Ziel',x=>x.dmg>0&&canHeal(S,x));if(!t)return;const h=d3(S);t.dmg=Math.max(0,t.dmg-h);rep(G,'Präsenz der Fruchtbarkeit',row('Heilen (W3)',[h]),t.name+' geheilt')},ai:(S,o)=>fr(S,o).some(x=>x.dmg>0)},
 tr_amu:{n:'Amulett des Slaanesh',s:'Heldenphase: heile (W3) die Generalin',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='tr_amu',can:(S,o)=>{const g=genOf(S,o);return !!g&&g.dmg>0&&canHeal(S,g)},
  *run(G,o){const g=genOf(G.S,o),h=d3(G.S);g.dmg=Math.max(0,g.dmg-h);rep(G,'Amulett des Slaanesh',row('Heilen (W3)',[h]),g.name+' geheilt')},ai:()=>true},
 od_atem:{n:'Fauliger Atem',s:'Fernkampfphase: Feind (7" um den General): je Modell 5+ = 1 tödlicher Schaden',ph:3,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='od_atem',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=7)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Fauliger Atem: Ziel',e=>dist(g,e)<=7);if(!t)return;const rs=[];let d=0;for(let i=0;i<t.n;i++){const r=d6(S);rs.push(r);if(r>=5)d++}rep(G,'Fauliger Atem',row('Je Modell (5+)',rs,5),d?d+' tödlicher Schaden':'Kein Schaden');mort(G,t,d,'Fauliger Atem')},ai:()=>true},
 gw_messer:{n:'Wurfmesser',s:'Fernkampfphase: Feind (10" um den General) 3+ = 1 tödlicher Schaden',ph:3,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='gw_messer',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=10)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Wurfmesser: Ziel',e=>dist(g,e)<=10);if(!t)return;const r=d6(S);rep(G,'Wurfmesser',row('Wurf (3+)',[r],3),r>=3?'1 tödlicher Schaden':'Kein Effekt');if(r>=3)mort(G,t,1,'Wurfmesser')},ai:()=>true},
 fe_gries:{n:'Griesgrämige Gestalten',s:'Nahkampfphase, 1× pro Schlacht: Einheit im Nahkampf: +1 Attacke (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='fe_gries',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Griesgrämige Gestalten: Ziel',x=>inCombat(S,x));if(!t)return;addFx(S,{k:'att',u:t.id,v:1,exp:'turn'});G.note('Griesgrämige Gestalten: '+t.name+' +1 Attacke')},ai:()=>true},
 tr_schnell:{n:'Unvergleichliche Schnelligkeit',s:'Nahkampfphase, 1× pro Schlacht: Einheit kämpft zuerst',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='tr_schnell',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)&&!has(S.T.fought,x.id)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Unvergleichliche Schnelligkeit: Ziel',x=>inCombat(S,x)&&!has(S.T.fought,x.id));if(!t)return;add(S.T.SF,t.id);G.note('Unvergleichliche Schnelligkeit: '+t.name+' kämpft zuerst')},ai:()=>true},
 cj_klaue:{n:'Weg der unheimlichen Klaue',s:'Nahkampfphase, 1× pro Schlacht: Held kämpft zuerst',ph:5,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='cj_klaue',can:(S,o)=>fr(S,o).some(x=>isHero(x)&&inCombat(S,x)&&!has(S.T.fought,x.id)),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Weg der unheimlichen Klaue: Held',x=>isHero(x)&&inCombat(S,x)&&!has(S.T.fought,x.id));if(!t)return;add(S.T.SF,t.id);G.note('Weg der unheimlichen Klaue: '+t.name+' kämpft zuerst')},ai:()=>true},
 tr_spiegel:{n:'Zerrspiegel',s:'Fernkampfphase, 1× pro Zug: Feind (9" um die Generalin) 4+ = −1 auf Schutzwürfe',ph:3,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='tr_spiegel',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=9)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Zerrspiegel: Ziel',e=>dist(g,e)<=9);if(!t)return;const r=d6(S);if(r>=4)addFx(S,{k:'svP',u:t.id,v:-1,exp:'own'});rep(G,'Zerrspiegel',row('Wurf (4+)',[r],4),r>=4?t.name+': −1 auf Schutzwürfe':'Kein Effekt')},ai:()=>true},
 cj_schrei:{n:'Todesschrei',s:'Nahkampfphase: Feind (6" um den General) 3+ = −1 auf Trefferwürfe (Zug)',ph:5,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='cj_schrei',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=6)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Todesschrei: Ziel',e=>dist(g,e)<=6);if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'hit',u:t.id,v:-1,exp:'turn'});rep(G,'Todesschrei',row('Wurf (3+)',[r],3),r>=3?t.name+': −1 auf Trefferwürfe':'Kein Effekt')},ai:()=>true},
// ---------- Neue Spearheads: restliche Fähigkeiten ----------
 bd_uebertr:{n:'Abscheuliche Übertragung',s:'Heldenphase: sichtbarer Feind (6"): Zauber 2W6 (6+) → Würfel = Ausdauer des Ziels, je 5+ 1 tödlicher Schaden und heile (1)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bd_uebertr'),can:(S,u)=>en(S,u.o).some(e=>dist(u,e)<=6&&vis(S,u,e)),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Abscheuliche Übertragung: Ziel',EL(S,u.o,e=>dist(u,e)<=6&&vis(S,u,e)),scE);if(!t)return;const [a,b]=roll2(S),rs=[];let k=0;
   if(a+b>=6)for(let i=0;i<t.wm;i++){const r=d6(S);rs.push(r);if(r>=5)k++}
   rep(G,'Abscheuliche Übertragung',row('Zauberwurf (6+)',[a,b],0),a+b>=6?row('Je Ausdauerpunkt (5+)',rs,5):'Zauber misslingt',k?k+' tödlicher Schaden, '+u.name+' heilt '+k:'Kein Schaden');
   if(k){if(canHeal(S,u))u.dmg=Math.max(0,u.dmg-k);mort(G,t,k,'Abscheuliche Übertragung')}},ai:()=>true},
 bd_leg:{n:'Skelettlegion',s:'Nahkampfphase: Legionswurf (W6) je getötetem Modell, je 6 kehrt 1 Modell zurück',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bd_leg'),can:(S,u)=>u.n<u.nmax&&canHeal(S,u),
  *run(G,u){const S=G.S,k=u.nmax-u.n,g=gnl(S,u.o);let bn=0;
   if(ENI(S,u.o)=='bd_grab'&&g&&dist(u,g)<=9&&!usedKey(S,u.o+':grab','battle')){useKey(S,u.o+':grab','battle');bn=1}
   const rs=[];let b=0;for(let i=0;i<k;i++){const r=d6(S);rs.push(r);if(r==6||r+bn>=6)b++}
   u.n=Math.min(u.nmax,u.n+b);rep(G,'Skelettlegion',row('Legionswürfe (6+'+(bn?', +1 Grabsandscherbe':'')+')',rs,6-bn),b?b+' Modell(e) kehren zurück':'Kein Modell kehrt zurück')},ai:(S,u)=>u.nmax-u.n>=2},
 bd_endl:{n:'Endlose Legionen',s:'Bewegungsphase, 1× pro Schlacht: zerstörte Skelette-Einheit wird durch W6 Modelle ersetzt (eigenes Gebiet, >6" von Feinden)',ph:2,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='bd_endl',can:(S,o)=>S.GY.some(g=>g.o==o&&KH(g)&&!g.rp&&!g.repl),
  *run(G,o){const S=G.S,g=yield* pk(G,o,'Endlose Legionen: Einheit',S.GY.filter(x=>x.o==o&&KH(x)&&!x.rp&&!x.repl).map(x=>[x.name,x]));if(!g)return;
   const k=Math.min(d6(S),g.nmax),q=mkUnit(g.dn,o,S.NID++,k);q.repl=1;
   const p=yield* place(G,o,'rep6',q,'Endlose Legionen','Aufstellen: '+k+' Modelle ganz im eigenen Gebiet, mehr als 6 Zoll von Feinden',{cancel:true});
   if(p.cancel){unuse(S,o+':bd_endl','battle');return}q.x=p.x;q.y=p.y;S.U.push(q);g.rp=1;add(S.Ph.used,q.id);add(S.T.arr,q.id);G.note('Endlose Legionen: '+k+' Modelle '+q.name+' erscheinen')},ai:(S,o)=>true},
 bd_vsta:{n:'Verheerender Sturmangriff',s:'Angriffsphase: Blutritter, die angegriffen haben: W3 tödlicher Schaden auf jede Feind-Einheit, über die sie sich bewegt haben (Einheiten an der Bewegungslinie)',ph:4,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='bd_vsta',can:(S,o)=>fr(S,o).some(u=>u.dn=='Blutritter'&&has(S.T.charged,u.id)&&S.T.cs[u.id]),
  *run(G,o){const S=G.S,l=fr(S,o).filter(u=>u.dn=='Blutritter'&&has(S.T.charged,u.id)&&S.T.cs[u.id]);const u=l.length==1?l[0]:yield* pk(G,o,'Verheerender Sturmangriff: Einheit',l.map(x=>[lab(x),x]));if(!u)return;
   const [sx,sy]=S.T.cs[u.id],ex=u.x,ey=u.y,L2=(ex-sx)**2+(ey-sy)**2||1,sd=(px,py)=>{const t=Math.max(0,Math.min(1,((px-sx)*(ex-sx)+(py-sy)*(ey-sy))/L2));return Math.hypot(px-(sx+t*(ex-sx)),py-(sy+t*(ey-sy)))};
   const hit=en(S,o).filter(e=>abs(e).some(m=>sd(m.x,m.y)-m.l/2<=Math.min(u.r,1.5))&&!abs(e).some(m=>abs(u).some(q=>mgap(m,q)<=.6)));
   if(!hit.length){rep(G,'Verheerender Sturmangriff','Keine Einheit auf der Bewegungslinie');return}
   const out=[];hit.forEach(e=>{const d=d3(S);out.push(e.name+': '+d);mort(G,e,d,'Verheerender Sturmangriff')});rep(G,'Verheerender Sturmangriff',out.join('<br>'))},ai:(S,o)=>true},
 bd_fled:{n:'Fledermauswolke',s:'Bewegungsphase, 1× pro Schlacht: General wird entfernt und >6" von allen Feinden neu aufgestellt',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='bd_fled',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),p=yield* place(G,o,'rein',g,'Fledermauswolke','Neu aufstellen: mehr als 6 Zoll von allen Feinden',{cancel:true});if(p.cancel){unuse(S,o+':bd_fled','battle');return}g.x=p.x;g.y=p.y;G.note('Fledermauswolke: '+g.name+' erscheint an anderer Stelle')},ai:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)&&g.dmg*2>=g.wm}},
 bd_geist:{n:'Geistersturmwind',s:'Heldenphase: Zauber 2W6; bei 7+ erleidet jede feindliche Einheit 1 tödlichen Schaden',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='bd_geist',can:(S,o)=>!!genOf(S,o)&&en(S,o).length>0,
  *run(G,o){const S=G.S,[a,b]=roll2(S);rep(G,'Geistersturmwind',row('Zauberwurf (7+)',[a,b],0),a+b>=7?'Jede feindliche Einheit erleidet 1 tödlichen Schaden':'Zauber misslingt');if(a+b>=7)en(S,o).forEach(e=>mort(G,e,1,'Geistersturmwind'))},ai:(S,o)=>en(S,o).length>=2},
 ep_gunst:{n:'Gunstspender',s:'Heldenphase: bis zu X Einheiten (12"), Zauber 2W6 (6+): Dämonetten Anti-Angriff, Jägerinnen +2" Bewegung, Slaaneshbestien +1 auf Nahkampf-Trefferwürfe',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ep_gunst'),can:(S,u)=>fr(S,u.o).some(x=>x!==u&&/^(Dämonetten|Jägerinnen|Slaaneshbestien)/.test(x.dn)&&wholly(x,u,12)),
  *run(G,u){const S=G.S,o=u.o,ch=[],cand=()=>fr(S,o).filter(x=>x!==u&&!ch.includes(x)&&/^(Dämonetten|Jägerinnen|Slaaneshbestien)/.test(x.dn)&&wholly(x,u,12));
   for(let i=0;i<u.n;i++){const l=cand();if(!l.length)break;if(G.isAI(o)){ch.push(l[0]);continue}const t=yield* ask(G,o,'Gunstspender: Ziel '+(i+1)+' von '+u.n,[...l.map(x=>[lab(x),x]),['Fertig',null]]);if(!t)break;ch.push(t)}
   if(!ch.length)return;const [a,b]=roll2(S);rep(G,'Gunstspender',row('Zauberwurf (6+)',[a,b],0),a+b>=6?ch.map(x=>x.name).join(', ')+' erhalten die Gunst':'Zauber misslingt');
   if(a+b>=6)ch.forEach(x=>{if(x.dn=='Dämonetten')addFx(S,{k:'antichg',u:x.id,v:1,exp:'own'});else if(x.dn=='Jägerinnen')addFx(S,{k:'mv',u:x.id,v:2,exp:'own'});else addFx(S,{k:'hit',u:x.id,v:1,exp:'own'})})},ai:()=>true},
 ep_duft:{n:'Einlullender Duft',s:'Angriffsphase, 1× pro Zug (Armee): Feind (9" bzw. im Nahkampf mit dieser Einheit): 4+ → kämpft in diesem Zug zuletzt',ph:4,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'ep_duft'),can:(S,u)=>!usedKey(S,u.o+':duft','turn')&&duftT(S,u).length>0,
  *run(G,u){const S=G.S;useKey(S,u.o+':duft','turn');const t=yield* pk(G,u.o,'Einlullender Duft: Ziel',duftT(S,u).map(e=>[lab(e),e]),scE);if(!t)return;const r=d6(S);if(r>=4)add(S.T.SL,t.id);rep(G,'Einlullender Duft',row('Wurf (4+)',[r],4),r>=4?t.name+' kämpft in diesem Zug zuletzt':'Kein Effekt')},ai:()=>true},
 ep_exz:{n:'Gewaltexzess',s:'Nahkampfphase, 1× pro Schlacht: sichtbare Einheit (12" um den General): Nahkampfwaffen Krit. (2 Treffer) bis zu deinem nächsten Zug',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='ep_exz',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>wholly(x,g,12)&&vis(S,g,x)&&inCombat(S,x))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Gewaltexzess: Ziel',FL(S,o,x=>wholly(x,g,12)&&vis(S,g,x)),x=>inCombat(S,x)?100+mx(x):0);if(!t)return;addFx(S,{k:'critD',u:t.id,v:1,exp:'own'});G.note('Gewaltexzess: '+t.name+' hat Krit. (2 Treffer)')},ai:()=>true},
 ep_duft2:{n:'Unwiderstehlicher Seelenduft',s:'Bewegungsphase, 1× pro Schlacht: Jägerinnen/Slaaneshbestien (12" um den General) werden >6" von Feinden neu aufgestellt',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='ep_duft2',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>/^(Jägerinnen|Slaaneshbestien)/.test(x.dn)&&wholly(x,g,12))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Unwiderstehlicher Seelenduft: Einheit',FL(S,o,x=>/^(Jägerinnen|Slaaneshbestien)/.test(x.dn)&&wholly(x,g,12)),x=>mx(x));if(!t)return;
   const p=yield* place(G,o,'rein',t,'Unwiderstehlicher Seelenduft','Neu aufstellen: mehr als 6 Zoll von allen Feinden',{cancel:true});if(p.cancel){unuse(S,o+':ep_duft2','battle');return}t.x=p.x;t.y=p.y;G.note('Seelenduft: '+t.name+' erscheint an anderer Stelle')},ai:()=>false},
 fp_krieg:{n:'Brüllender Kriegsherr',s:'Heldenphase: sichtbare Einheit (12"): 3+ → +1 auf Angriffswürfe (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'fp_krieg'),can:(S,u)=>fr(S,u.o).some(x=>dist(u,x)<=12&&vis(S,u,x)),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Brüllender Kriegsherr: Ziel',FL(S,u.o,x=>dist(u,x)<=12&&vis(S,u,x)),x=>inCombat(S,x)?0:mx(x));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'chg',u:t.id,v:1,exp:'turn'});rep(G,'Brüllender Kriegsherr',row('Wurf (3+)',[r],3),r>=3?t.name+': +1 auf Angriffswürfe':'Kein Effekt')},ai:()=>true},
 fp_blut:{n:'Blutiger Schrecken',s:'Nahkampfphase, 1× pro Zug (Armee): Einheit hat angegriffen → Feind im Nahkampf mit ihr: 3+ → −1 auf seine Trefferwürfe (Zug)',ph:5,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'fp_blut'),can:(S,u)=>has(S.T.charged,u.id)&&!usedKey(S,u.o+':fpb','turn')&&foes(S,u).some(e=>e.x>=0&&dist(u,e)<=CR),
  *run(G,u){const S=G.S;useKey(S,u.o+':fpb','turn');const t=yield* pk(G,u.o,'Blutiger Schrecken: Ziel',EL(S,u.o,e=>dist(u,e)<=CR),scE);if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'hit',u:t.id,v:-1,exp:'turn'});rep(G,'Blutiger Schrecken',row('Wurf (3+)',[r],3),r>=3?t.name+': −1 auf Trefferwürfe':'Kein Effekt')},ai:()=>true},
 ss_rost:{n:'Rostschlund',s:'Heldenphase: sichtbarer Feind (12"): Zauber 2W6 (6+; voller Kessel: W3, bei 2+ +2); −1 Wucht auf seine Nahkampfwaffen bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ss_rost'),can:(S,u)=>{const f=rostOrg(S,u);return en(S,u.o).some(e=>dist(f,e)<=12&&vis(S,f,e))},
  *run(G,u){const S=G.S,o=u.o,f=rostOrg(S,u),t=yield* pk(G,o,'Rostschlund: Ziel',EL(S,o,e=>dist(f,e)<=12&&vis(S,f,e)),e=>(e.mw.reduce((q,w)=>Math.max(q,+w[5]||0),0))*3+mx(e)/4);if(!t)return;let bn=0,kt='';
   if(S.kes[o]){const q=d3(S);if(q==1){S.kes[o]=0;kt='Kessel: Wurf 1 – der Kessel wird leer'}else{bn=2;kt='Kessel: Wurf '+q+' – +2 auf den Zauberwurf'}}
   fr(S,o).forEach(x=>{x.fok=0});const [a,b]=roll2(S),tot=a+b+bn;
   if(tot>=6)addFx(S,{k:'rend',u:t.id,v:1,exp:'own'});rep(G,'Rostschlund',kt,row('Zauberwurf (6+'+(bn?', +2':'')+')',[a,b],0),tot>=6?t.name+': −1 Wucht auf Nahkampfwaffen':'Zauber misslingt')},ai:()=>true},
 ss_fokus:{n:'Fokusse der Wanstmagie',s:'Heldenphase, 1× pro Zug (Armee): beim nächsten Rostschlund gelten Reichweite und Sichtbarkeit von dieser Einheit aus',ph:1,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'ss_fokus'),can:(S,u)=>!usedKey(S,u.o+':fok','turn')&&fr(S,u.o).some(x=>hasAb(x,'ss_rost')),
  *run(G,u){const S=G.S;useKey(S,u.o+':fok','turn');fr(S,u.o).forEach(x=>{x.fok=0});u.fok=1;G.note('Fokusse der Wanstmagie: Rostschlund wirkt von '+u.name+' aus')},ai:()=>false},
 ss_kost:{n:'Verkoster',s:'Nahkampfphase: Kessel voll → sichtbare Einheit (12" um den General): +1 auf Nahkampf-Trefferwürfe (Zug); der Kessel wird leer',ph:5,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='ss_kost',can:(S,o)=>{const g=genOf(S,o);return !!g&&!!S.kes[o]&&fr(S,o).some(x=>wholly(x,g,12)&&vis(S,g,x)&&inCombat(S,x))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Verkoster: Ziel',FL(S,o,x=>wholly(x,g,12)&&vis(S,g,x)),x=>inCombat(S,x)?100+mx(x):0);if(!t)return;addFx(S,{k:'hit',u:t.id,v:1,exp:'turn'});S.kes[o]=0;G.note('Verkoster: '+t.name+' erhält +1 auf Nahkampf-Trefferwürfe, der Kessel ist leer')},ai:()=>true},
 ss_hunger:{n:'Nagender Hunger',s:'Gegnerische Bewegungsphase, 1× pro Schlacht: Einheiten außerhalb des Nahkampfs bewegen sich bis zu W3" (W6" bei leerem Kessel und ganz innerhalb 9" um den General)',army:1,opp:1,oph:2,when:'start',freq:'battle',src:(S,o)=>ENI(S,o)=='ss_hunger',can:(S,o)=>fr(S,o).some(x=>!inCombat(S,x)),
  *run(G,o){const S=G.S,g=genOf(S,o);for(const u of [...fr(S,o)]){if(!S.U.includes(u)||inCombat(S,u)||fxL(S,u,'nomove').length)continue;
    const big=!S.kes[o]&&g&&wholly(u,g,9),r=big?d6(S):d3(S);let mv=true;if(!G.isAI(o))mv=(yield* choice(G,o,'Nagender Hunger: '+u.name,'Wurf '+r+': bis zu '+r+' Zoll bewegen (nicht im Nahkampf enden)?',[{t:'Bewegen'},{t:'Stehen bleiben'}],{pref:0}))==0;if(!mv)continue;
    const a=yield* destReq(G,u,r,{text:'Nagender Hunger: bis '+r+' Zoll'});if(!a.stay)applyMove(S,u,a,r)}},ai:(S,o)=>false},
 od_zaehl:{n:'Zählt weiter, ich beobachte euch',s:'Heldenphase: Seuchenhüter (14"): +1 Attacke (Nahkampf) oder +1 auf Schutzwürfe bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'od_zaehl'),can:(S,u)=>fr(S,u.o).some(x=>x.dn=='Seuchenhüter'&&wholly(x,u,14)),
  *run(G,u){const S=G.S,o=u.o,t=yield* pk(G,o,'Zählt weiter: Ziel',FL(S,o,x=>x.dn=='Seuchenhüter'&&wholly(x,u,14)),x=>inCombat(S,x)?100+mx(x):mx(x));if(!t)return;
   const i=yield* choice(G,o,'Zählt weiter, ich beobachte euch','Effekt für '+t.name,[{t:'Liste der Hiebe',s:'+1 Attackenwert der Nahkampfwaffen'},{t:'Vermerkte Ausdauer',s:'+1 auf Schutzwürfe'}],{pref:inCombat(S,t)?1:0});
   addFx(S,i==0?{k:'att',u:t.id,v:1,exp:'own'}:{k:'svP',u:t.id,v:1,exp:'own'});G.note('Zählt weiter: '+t.name+(i==0?' +1 Attacke':' +1 Schutzwurf'))},ai:()=>true},
 od_zerst:{n:'Zerstörung und Verfall',s:'Angriffsphase: hat die Einheit angegriffen, Feind innerhalb 1": 2+ → W3 tödlicher Schaden',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'od_zerst'),can:(S,u)=>has(S.T.charged,u.id)&&en(S,u.o).some(e=>dist(u,e)<=1),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Zerstörung und Verfall: Ziel',EL(S,u.o,e=>dist(u,e)<=1),scE);if(!t)return;const r=d6(S);rep(G,'Zerstörung und Verfall',row('Wurf (2+)',[r],2),r>=2?'W3 tödlicher Schaden':'Kein Effekt');if(r>=2)mort(G,t,d3(S),'Zerstörung und Verfall')},ai:()=>true},
 od_gaertner:{n:'Nurgles Gärtner',s:'Bewegungsphase: beansprucht der General ein Ziel ohne Feind: 3+ → entweiht; Einheiten darauf haben Rettung 4+ (bis der Feind es erobert)',ph:2,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='od_gaertner',can:(S,o)=>gaertK(S,o).length>0,
  *run(G,o){const S=G.S,rs=[];gaertK(S,o).forEach(k=>{const r=d6(S);rs.push(r);if(r>=3){S.ent[k]=o;G.note('Nurgles Gärtner: Ziel '+(k+1)+' ist entweiht')}});rep(G,"Nurgles Gärtner",row('Wurf (3+)',rs,3),rs.some(r=>r>=3)?'Ziel entweiht':'Kein Effekt')},ai:()=>true},
 od_fieber:{n:'Gabe des Fieberwahns',s:'Nahkampfphase, 1× pro Schlacht: +1 auf den Attackenwert der Nahkampfwaffen befreundeter Einheiten ganz innerhalb 7" um den General (Phase)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='od_fieber',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>wholly(x,g,7)&&inCombat(S,x))},
  *run(G,o){const S=G.S,g=genOf(S,o),l=fr(S,o).filter(x=>wholly(x,g,7));l.forEach(x=>addFx(S,{k:'att',u:x.id,v:1,exp:'ph'}));G.note('Gabe des Fieberwahns: '+l.map(x=>x.name).join(', ')+' +1 Attacke')},ai:()=>true},
 fz_mark:{n:'Markiertes Ziel',s:'Fernkampfphase: Feind, den diese Einheit beschossen hat: +1 auf Trefferwürfe der Fernkampfattacken befreundeter Einheiten gegen ihn (Zug)',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'fz_mark'),can:(S,u)=>shotT(S,u).length>0,
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Markiertes Ziel: Feind',shotT(S,u).map(e=>[lab(e),e]),scE);if(!t)return;addFx(S,{k:'hitTs',u:t.id,v:1,exp:'turn'});G.note('Markiertes Ziel: '+t.name+' wird leichter getroffen (Fernkampf +1)')},ai:()=>true},
 fz_glueh:{n:'Glühende Waffen',s:'Heldenphase: Zauber 2W6 (6+): Einheit (12"): Nahkampfwaffen Krit. (tödlich) bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'fz_glueh'),can:(S,u)=>fr(S,u.o).some(x=>wholly(x,u,12)),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Glühende Waffen: Ziel',FL(S,u.o,x=>wholly(x,u,12)),x=>x.mw.length?mx(x):0);if(!t)return;const [a,b]=roll2(S);rep(G,'Glühende Waffen',row('Zauberwurf (6+)',[a,b],0),a+b>=6?t.name+': Nahkampfwaffen Krit. (tödlich)':'Zauber misslingt');if(a+b>=6)addFx(S,{k:'critA',u:t.id,v:1,exp:'own'})},ai:()=>true},
 fz_pause:{n:'Keine Pause',s:'Fernkampfphase, 1× pro Zug (Armee): Schwarzpulverknappe-Marker wandert zu einer anderen Freigilden-Füsiliere-Einheit',ph:3,freq:'turn',army:1,src:(S,o)=>fr(S,o).some(x=>x.knp),can:(S,o)=>fr(S,o).some(x=>x.knp)&&fr(S,o).some(x=>!x.knp&&x.dn=='Freigilden-Füsiliere'),
  *run(G,o){const S=G.S,f=fr(S,o).find(x=>x.knp),t=yield* pk(G,o,'Keine Pause: Ziel',FL(S,o,x=>!x.knp&&x.dn=='Freigilden-Füsiliere'),x=>inCombat(S,x)?100:0);if(!t)return;f.knp=0;t.knp=1;G.note('Keine Pause: Der Schwarzpulverknappe wechselt zu '+t.name)},ai:(S,o)=>{const f=fr(S,o).find(x=>x.knp);return !!f&&!inCombat(S,f)&&fr(S,o).some(x=>!x.knp&&x.dn=='Freigilden-Füsiliere'&&inCombat(S,x))}},
 fz_vers:{n:'Gut versorgt',s:'Fernkampfphase, 1× pro Zug (Armee): Nicht-Helden-Einheit: 3+ → +1 auf Verwundungswürfe der Fernkampfattacken (Phase)',ph:3,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='fz_vers',can:(S,o)=>fr(S,o).some(x=>!isHero(x)&&x.rw.length),
  *run(G,o){const S=G.S,t=yield* pk(G,o,'Gut versorgt: Ziel',FL(S,o,x=>!isHero(x)&&x.rw.length),x=>x.rw.reduce((q,w)=>q+(+w[2]||2),0)*nm(x));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'wndS',u:t.id,v:1,exp:'ph'});rep(G,'Gut versorgt',row('Wurf (3+)',[r],3),r>=3?t.name+': +1 auf Verwundungswürfe (Fernkampf)':'Kein Effekt')},ai:()=>true},
 fz_takt:{n:'Versierter Taktiker',s:'Bewegungsphase, 1× pro Schlacht: 2 zerstörte Freigilden-Füsiliere-Einheiten werden durch 1 Einheit mit 10 Modellen ersetzt (>6" von Feinden)',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='fz_takt',can:(S,o)=>S.GY.filter(g=>g.o==o&&g.dn=='Freigilden-Füsiliere'&&!g.rp&&!g.repl).length>=2,
  *run(G,o){const S=G.S,l=S.GY.filter(g=>g.o==o&&g.dn=='Freigilden-Füsiliere'&&!g.rp&&!g.repl).slice(0,2),q=mkUnit('Freigilden-Füsiliere',o,S.NID++,10);q.repl=1;
   const p=yield* place(G,o,'rep6',q,'Versierter Taktiker','Aufstellen: 10 Modelle ganz im eigenen Gebiet, mehr als 6 Zoll von Feinden',{cancel:true});if(p.cancel){unuse(S,o+':fz_takt','battle');return}
   q.x=p.x;q.y=p.y;S.U.push(q);l.forEach(g=>{g.rp=1});add(S.Ph.used,q.id);add(S.T.arr,q.id);G.note('Versierter Taktiker: Ersatzeinheit mit 10 Modellen')},ai:()=>true},
 fz_schild:{n:'Schildschlag',s:'Bewegungsphase, 1× pro Zug: Feind (Infanterie/Kriegsmaschine/Kavallerie) im Nahkampf mit dem General: 3+ → Rückzug',ph:2,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='fz_schild',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=CR&&/Infanterie|Kriegsmaschine|Kavallerie/.test(e.kw))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Schildschlag: Ziel',EL(S,o,e=>dist(g,e)<=CR&&/Infanterie|Kriegsmaschine|Kavallerie/.test(e.kw)),scE);if(!t)return;const r=d6(S);rep(G,'Schildschlag',row('Wurf (3+)',[r],3),r>=3?t.name+' muss sich zurückziehen':'Kein Effekt');if(r>=3)yield* doRetreat(G,t,{})},ai:()=>true},
 fz_salve:{n:'Salve aus nächster Nähe',s:'Nahkampfphase, 1× pro Zug: Feind im Nahkampf mit dem General: W3, bei 2+ so viel tödlicher Schaden',ph:5,freq:'turn',army:1,src:(S,o)=>ENI(S,o)=='fz_salve',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=CR)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Salve aus nächster Nähe: Ziel',EL(S,o,e=>dist(g,e)<=CR),scE);if(!t)return;const r=d3(S);rep(G,'Salve aus nächster Nähe',row('W3 (2+)',[r],2),r>=2?r+' tödlicher Schaden':'Kein Effekt');if(r>=2)mort(G,t,r,'Salve aus nächster Nähe')},ai:()=>true},
 fe_wurf:{n:'Fallen lassen, werfen oder rollen',s:'Fernkampfphase: Fallen lassen (Nahbeschuss), Werfen (+6" Reichweite) oder Rollen (+1 Treffer); Effekt je Zug nur für 1 Einheit',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'fe_wurf'),can:(S,u)=>u.rw.length>0&&(S.T.few||[]).length<3,
  *run(G,u){const S=G.S,used=S.T.few||(S.T.few=[]),O=[{t:'Fallen lassen',s:'Fernkampfwaffen haben Nahbeschuss',dis:used.includes(0)},{t:'Werfen',s:'+6" Reichweite',dis:used.includes(1)},{t:'Rollen',s:'+1 auf Trefferwürfe (Fernkampf)',dis:used.includes(2)}];
   const pref=[2,1,0].find(i=>!O[i].dis),i=yield* choice(G,u.o,'Fallen lassen, werfen oder rollen','Effekt für '+u.name+' (Rest des Zugs)',O,{pref});used.push(i);
   addFx(S,i==0?{k:'nahb',u:u.id,exp:'turn'}:i==1?{k:'rng',u:u.id,v:6,exp:'turn'}:{k:'hitS',u:u.id,v:1,exp:'turn'});G.note('Fallen lassen, werfen oder rollen: '+u.name+' – '+O[i].t)},ai:()=>true},
 fe_kegel:{n:'Umgekegelt',s:'Fernkampfphase: Feind, dem Schaden zugewiesen wurde: 3+ → seine Angriffswürfe nutzen den niedrigeren Würfel zweimal (bis zu deinem nächsten Zug)',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'fe_kegel'),can:(S,u)=>kegelT(S,u).length>0,
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Umgekegelt: Ziel',kegelT(S,u).map(e=>[lab(e),e]),scE);if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'cdlow',u:t.id,exp:'own'});rep(G,'Umgekegelt',row('Wurf (3+)',[r],3),r>=3?t.name+': Angriffswürfe nutzen den niedrigsten W6 für beide':'Kein Effekt')},ai:()=>true},
 fe_auge:{n:'Mach ein Auge zu!',s:'Heldenphase: andere Einheit (12" um den General): +1 auf Trefferwürfe der Fernkampfattacken (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'fe_auge')&&u.gen,can:(S,u)=>fr(S,u.o).some(x=>x!==u&&wholly(x,u,12)&&x.rw.length),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Mach ein Auge zu!: Ziel',FL(S,u.o,x=>x!==u&&wholly(x,u,12)&&x.rw.length),x=>mx(x));if(!t)return;addFx(S,{k:'hitS',u:t.id,v:1,exp:'turn'});G.note('Mach ein Auge zu!: '+t.name+' +1 auf Trefferwürfe (Fernkampf)')},ai:()=>true},
 fe_schaedel:{n:'Harter Schädel',s:'Nahkampfphase, 1× pro Schlacht: +1 auf Trefferwürfe der Koppnuss des Generals (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='fe_schaedel',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'hitW',u:g.id,w:'Koppnuss',v:1,exp:'turn'});G.note('Harter Schädel: Koppnuss +1 auf Trefferwürfe')},ai:()=>true},
 fe_glueck:{n:'Glücksfelsen',s:'Fernkampfphase, 1× pro Schlacht: +1 auf den Attackenwert der Schmeißsteine des Generals (Zug)',ph:3,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='fe_glueck',can:(S,o)=>{const g=genOf(S,o);return !!g&&g.rw.length>0&&en(S,o).some(e=>dist(g,e)<=18)},
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'attW',u:g.id,w:'Schmeißsteine',v:1,exp:'turn'});G.note('Glücksfelsen: Schmeißsteine +1 Attacke')},ai:()=>true},
 tr_vision:{n:'Vision der Verdammnis',s:'Heldenphase: Zauber 2W6 (6+): 6 Würfel, je 4+ = 1 Verderbtheitspunkt',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'tr_vision'),
  *run(G,u){const S=G.S,o=u.o,[a,b]=roll2(S);let k=0;const rs=[];if(a+b>=6)for(let i=0;i<6;i++){const r=d6(S);rs.push(r);if(r>=4)k++}
   S.vd[o]+=k;rep(G,'Vision der Verdammnis',row('Zauberwurf (6+)',[a,b],0),a+b>=6?row('6 Würfel (4+)',rs,4):'Zauber misslingt','Verderbtheitspunkte: '+S.vd[o]+(k?' (+'+k+')':'')+'<br><small>12+: Angriff nach Rennen · 18+: Krit. (tödlich) · 24+: Rettung 5+</small>')},ai:()=>true},
 tr_toeten:{n:'Töten um jeden Preis',s:'Ende der gegnerischen Fernkampfphase: Einheit, der Schaden zugewiesen wurde, bewegt sich normal',army:1,opp:1,oph:3,when:'end',freq:'phase',src:(S,o)=>fr(S,o).some(x=>hasAb(x,'tr_toeten')),can:(S,o)=>toetL(S,o).length>0,
  *run(G,o){const S=G.S;for(const u of toetL(S,o)){if(!S.U.includes(u)||inCombat(S,u))continue;const mv=mvOf(S,u);let y=true;if(!G.isAI(o))y=(yield* choice(G,o,'Töten um jeden Preis: '+u.name,'Normale Bewegung ausführen (bis '+mv+' Zoll)?',[{t:'Bewegen'},{t:'Stehen bleiben'}],{pref:0}))==0;if(!y)continue;
    const a=yield* destReq(G,u,mv,{text:'Töten um jeden Preis'});if(!a.stay){const L=applyMove(S,u,a,mv);add(S.T.moved,u.id)}}},ai:(S,o)=>true},
 tr_praes:{n:'Präsenz der Ablenkung',s:'Bewegungsphase: Einheit darf Rückzug einsetzen und später im Zug noch Fernkampf und Angriff einsetzen',ph:2,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='tr_praes',can:(S,o)=>fr(S,o).some(x=>inCombat(S,x)),
  *run(G,o){const S=G.S,t=yield* pk(G,o,'Präsenz der Ablenkung: Einheit',FL(S,o,x=>inCombat(S,x)),x=>wnd(x)*-1+mx(x));if(!t)return;addFx(S,{k:'klaev',u:t.id,exp:'turn'});G.note('Präsenz der Ablenkung: '+t.name+' darf sich zurückziehen und danach schießen und angreifen')},ai:()=>false},
 tr_chor:{n:'Kakofonischer Chor',s:'Heldenphase: Zauber 2W6 (6+), Kakofoniewurf W6: Feinde (6" um die Generalin) mit niedrigerem Kontrollwert erleiden W3 tödlichen Schaden (je Einheit)',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='tr_chor',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=6)},
  *run(G,o){const S=G.S,g=genOf(S,o),[a,b]=roll2(S);if(a+b<6){rep(G,'Kakofonischer Chor',row('Zauberwurf (6+)',[a,b],0),'Zauber misslingt');return}const kw=d6(S),out=[];
   en(S,o).filter(e=>dist(g,e)<=6).forEach(e=>{if(cvOf(S,e)<kw){const d=d3(S);out.push(e.name+': '+d);mort(G,e,d,'Kakofonischer Chor')}});
   rep(G,'Kakofonischer Chor',row('Zauberwurf (6+)',[a,b],0),row('Kakofoniewurf',[kw]),out.length?out.join('<br>'):'Kein Feind mit niedrigerem Kontrollwert')},ai:()=>true},
 tr_zepter:{n:'Zepter der Dominanz',s:'Nahkampfphase: je Feind im Nahkampf mit der Generalin 5+ → kämpft in dieser Phase zuletzt',ph:5,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='tr_zepter',can:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=CR)},
  *run(G,o){const S=G.S,g=genOf(S,o),l=en(S,o).filter(e=>dist(g,e)<=CR),rs=[];l.forEach(e=>{const r=d6(S);rs.push(r);if(r>=5)add(S.T.SL,e.id)});rep(G,'Zepter der Dominanz',row('Würfe (5+)',rs,5),l.filter((e,i)=>rs[i]>=5).map(e=>e.name+' kämpft zuletzt').join('<br>')||'Kein Effekt')},ai:()=>true},
 gw_plaenk:{n:'Erfahrene Plänkler',s:'Bewegungsphase: Einheit (12" um diese Einheit): 3+ → +2" Bewegung, aber kein Rennen (Zug)',ph:2,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gw_plaenk'),can:(S,u)=>fr(S,u.o).some(x=>wholly(x,u,12)&&!inCombat(S,x)),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Erfahrene Plänkler: Ziel',FL(S,u.o,x=>wholly(x,u,12)&&!inCombat(S,x)),x=>mx(x));if(!t)return;const r=d6(S);if(r>=3){addFx(S,{k:'mv',u:t.id,v:2,exp:'turn'});addFx(S,{k:'norun',u:t.id,exp:'turn'})}rep(G,'Erfahrene Plänkler',row('Wurf (3+)',[r],3),r>=3?t.name+': +2" Bewegung, kein Rennen':'Kein Effekt')},ai:()=>false},
 gw_land:{n:'Das Land weihen',s:'Heldenphase: Ziel innerhalb 12", Gebetswurf W6 (3+): Einheiten, die das Ziel beanspruchen, haben Rettung 5+ (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gw_land'),can:(S,u)=>S.obj.some((p,k)=>Math.hypot(p[0]-u.x,p[1]-u.y)-u.r<=12),
  *run(G,u){const S=G.S,l=S.obj.map((p,k)=>[k,p]).filter(([k,p])=>Math.hypot(p[0]-u.x,p[1]-u.y)-u.r<=12).map(([k])=>['Ziel '+(k+1)+' ('+fr(S,u.o).filter(x=>claims(S,x,k)).length+' eigene Einheiten)',k]);
   const k=yield* pk(G,u.o,'Das Land weihen: Ziel',l,k=>fr(S,u.o).filter(x=>claims(S,x,k)).length);if(k==null)return;const r=d6(S);if(r>=3)addFx(S,{k:'consec',o:u.o,v:k,exp:'turn'});rep(G,'Das Land weihen',row('Gebetswurf (3+)',[r],3),r>=3?'Einheiten auf Ziel '+(k+1)+' haben Rettung 5+':'Gebet erhört nicht')},ai:()=>true},
 gw_fels:{n:'Felsenfester Wille',s:'Nahkampfphase: hat die Einheit nicht angegriffen: Feind im Nahkampf mit ihr: −1 Wucht seiner Waffen gegen diese Einheit (Zug)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gw_fels'),can:(S,u)=>!has(S.T.charged,u.id)&&en(S,u.o).some(e=>dist(u,e)<=CR),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Felsenfester Wille: Ziel',EL(S,u.o,e=>dist(u,e)<=CR),e=>e.mw.reduce((q,w)=>Math.max(q,+w[5]||0),0));if(!t)return;addFx(S,{k:'rendV',u:t.id,w:u.id,v:1,exp:'turn'});G.note('Felsenfester Wille: '+t.name+' hat −1 Wucht gegen '+u.name)},ai:()=>true},
 gw_kund:{n:'Erfahrener Kundschafter',s:'Bewegungsphase, 1× pro Schlacht: Einheit ganz innerhalb 6" einer Kante wird ganz innerhalb 3" einer Kante, >6" von Feinden, neu aufgestellt',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='gw_kund',can:(S,o)=>edgeU(S,o).length>0,
  *run(G,o){yield* edgeJump(G,o,'gw_kund','Erfahrener Kundschafter')},ai:()=>false},
 gw_klinge:{n:'Klinge des Kraken',s:'Nahkampfphase, 1× pro Schlacht: Attackenwert der Nahkampfwaffen des Generals verdoppelt (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='gw_klinge',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'attD',u:g.id,exp:'turn'});G.note('Klinge des Kraken: '+g.name+' verdoppelt den Attackenwert')},ai:()=>true},
 cj_huscht:{n:'Weg des huschenden Schattens',s:'Bewegungsphase, 1× pro Schlacht: Einheit ganz innerhalb 6" einer Kante wird ganz innerhalb 3" einer Kante, >6" von Feinden, neu aufgestellt',ph:2,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='cj_huscht',can:(S,o)=>edgeU(S,o).length>0,
  *run(G,o){yield* edgeJump(G,o,'cj_huscht','Weg des huschenden Schattens')},ai:()=>false},
 cj_losl:{n:'Los-los, bringt sie zur Strecke',s:'Heldenphase: Gossenläufer (12"): 3+ → +1 auf Angriffswürfe (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'cj_losl'),can:(S,u)=>fr(S,u.o).some(x=>x.dn=='Gossenläufer'&&wholly(x,u,12)&&vis(S,u,x)),
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Los-los: Gossenläufer',FL(S,u.o,x=>x.dn=='Gossenläufer'&&wholly(x,u,12)&&vis(S,u,x)),x=>mx(x));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'chg',u:t.id,v:1,exp:'turn'});rep(G,'Los-los, bringt sie zur Strecke',row('Wurf (3+)',[r],3),r>=3?t.name+': +1 auf Angriffswürfe':'Kein Effekt')},ai:()=>true},
 cj_schatten:{n:'In Schatten gehüllt',s:'Nahkampfphase, 1× pro Zug (Armee): Held, andere Einheit mit ≥2 Modellen: W6 (3+): Held erscheint ganz innerhalb 6" von ihr (auch im Nahkampf)',ph:5,freq:'turn',unit:1,src:(S,u)=>isHero(u)&&AN(S,u.o)=="Crixxits Jagdrudel",can:(S,u)=>!usedKey(S,u.o+':cjsh','turn')&&fr(S,u.o).some(x=>x!==u&&nm(x)>=2),
  *run(G,u){const S=G.S,o=u.o;useKey(S,o+':cjsh','turn');const t=yield* pk(G,o,'In Schatten gehüllt: Ziel',FL(S,o,x=>x!==u&&nm(x)>=2),x=>foes(S,x).some(e=>e.x>=0&&dist(x,e)<=12)?100+mx(x):mx(x));if(!t)return;
   const bn=u.gen&&ENI(S,o)=='cj_meister'?1:0,r=d6(S);rep(G,'In Schatten gehüllt',row('Schattenlaufwurf (3+'+(bn?', +1':'')+')',[r],3-bn),r+bn>=3?u.name+' erscheint bei '+t.name:'Kein Effekt');
   if(r+bn<3)return;u.sht=t.id;const p=yield* place(G,o,'shadow',u,'In Schatten gehüllt','Aufstellen: ganz innerhalb von 6 Zoll um '+t.name,{cancel:true});delete u.sht;if(p.cancel)return;u.x=p.x;u.y=p.y;add(S.Ph.used,u.id);G.note('In Schatten gehüllt: '+u.name+' erscheint')},ai:(S,u)=>false},
 cj_spreng:{n:'Sprengratten',s:'Angriffsphase, 1× pro Zug (Armee): Gossenläufer mit Marker: Feind (9"): 3+ → 1 tödlicher Schaden; bei 1–2 geht der Marker verloren',ph:4,freq:'turn',army:1,src:(S,o)=>fr(S,o).some(x=>x.spr),can:(S,o)=>fr(S,o).some(x=>x.spr&&en(S,o).some(e=>dist(x,e)<=9)),
  *run(G,o){const S=G.S,l=fr(S,o).filter(x=>x.spr&&en(S,o).some(e=>dist(x,e)<=9)),u=yield* pk(G,o,'Sprengratten: Einheit',l.map(x=>[lab(x),x]),x=>mx(x));if(!u)return;
   const t=yield* pk(G,o,'Sprengratten: Ziel',EL(S,o,e=>dist(u,e)<=9),scE);if(!t)return;const r=d6(S);rep(G,'Sprengratten',row('Wurf (3+)',[r],3),r>=3?'1 tödlicher Schaden auf '+t.name:'Kein Effekt'+(r<=2?' – Marker verloren':''));if(r>=3)mort(G,t,1,'Sprengratten');if(r<=2)u.spr=0},ai:()=>true},
 cj_rauch:{n:'Rauchbomben',s:'Nahkampfphase, 1× pro Zug (Armee): Einheit im Nahkampf: 4+ → sofortiger Rückzug',ph:5,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'cj_rauch'),can:(S,u)=>inCombat(S,u)&&!usedKey(S,u.o+':rauch','turn'),
  *run(G,u){const S=G.S;useKey(S,u.o+':rauch','turn');const r=d6(S);rep(G,'Rauchbomben',row('Wurf (4+)',[r],4),r>=4?u.name+' zieht sich zurück':'Kein Effekt');if(r>=4)yield* doRetreat(G,u,{})},ai:(S,u)=>wnd(u)<mx(u)},
};
// ---------- Neue Spearheads (Etappe 1) ----------
const spellG=function*(G,t,need){const S=G.S,o=G.co,cb=o!=null&&RGI(S,o)=='sp_arkan'?1:0;let [a,b]=roll2(S);
 if(a+b+cb<need&&o!=null&&S.fd&&S.fd[o]&&S.fd[o].length){const d=[a,b],lo=a<=b?0:1,hi=1-lo,fc=[0,0],vs=[d[lo]];fc[o]=1;const n0=S.fd[o].length;yield* fdStage(G,o,vs,x=>x+d[hi]+cb>=need,fc,'Zauberwurf ('+need+'+): '+a+' + '+b+(cb?' +1':''),false,true);d[lo]=vs[0];a=d[0];b=d[1]}
 if(cb)G.note('Arkane Überlegenheit: +1 auf den Zauberwurf');return {a,b,ok:a+b+cb>=need}};
const retM=(G,t,n)=>{const k=Math.min(n,t.nmax-t.n);if(k>0&&canHeal(G.S,t)){t.n+=k;return k}return 0};
const selI=function*(G,o,t,text,opts,def=0){if(G.isAI(o))return def;return yield* choice(G,o,t,text,opts.map(x=>({t:x})),{pref:def})};
const nHit=(S,t)=>t.n*t.wm-t.dmg;
const fOth=(S,u,rg)=>x=>x!==u&&wholly(x,u,rg);
Object.assign(AB,{
 hz_massl:{n:'Maßloses Gemetzel',s:'Heldenphase: Einheit ganz innerhalb 12": +1 Attacke auf Nahkampfwaffen (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'hz_massl'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Maßloses Gemetzel: Ziel',fOth(S,u,12));if(!t)return;addFx(S,{k:'att',u:t.id,v:1,exp:'turn'});G.note('Maßloses Gemetzel: '+t.name+' +1 Attacke im Nahkampf bis Zugende')},ai:()=>true},
 hz_feuer:{n:'Feuer des Verderbens',s:'Heldenphase: Zauber 2W6 (6+): W3 tödlicher Schaden, Feind innerhalb 12"',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'hz_feuer'),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Feuer des Verderbens: Ziel',x=>dist(u,x)<=12);if(!t)return;const r=yield* spellG(G,t,6),d=r.ok?d3(S):0;rep(G,'Feuer des Verderbens',row('Zauberwurf (6+)',[r.a,r.b],0),r.ok?t.name+': '+d+' tödlicher Schaden':'Zauber misslingt');if(d)hurt(G,t,d)},ai:()=>true},
 hz_segen:{n:'Segen des Khaine',s:'Nahkampfphase: Einheit ganz innerhalb 12" um die Generalin: +1 auf Schutzwürfe (Phase)',ph:5,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='hz_segen',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Segen des Khaine: Ziel',x=>x!==g&&wholly(x,g,12));if(!t)return;addFx(S,{k:'svP',u:t.id,v:1,exp:'ph'});G.note('Segen des Khaine: '+t.name+' +1 auf Schutzwürfe in dieser Phase')},ai:(S,o)=>fr(S,o).some(x=>inCombat(S,x))},
 rj_geheul:{n:'Großes Fletscha-Geheul',s:'Heldenphase, 1× pro Zug (Armee): diese und eine Einheit in Nahkampfreichweite: 3+ → +1 Wucht und +1 Attacke auf Begleiter-Waffen (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'rj_geheul'),can:(S,u)=>!usedKey(S,u.o+':geheul','turn'),
  *run(G,u){const S=G.S;const t=yield* pickF(G,u.o,'Großes Fletscha-Geheul: zweite Einheit',x=>x!==u&&dist(u,x)<=CR);if(!t)return;useKey(S,u.o+':geheul','turn');const r=d6(S);
   if(r>=3)[u,t].forEach(x=>x.mw.filter(w=>(w[7]||'').includes('G')).forEach(w=>{addFx(S,{k:'attW',u:x.id,w:w[0],v:1,exp:'turn'});addFx(S,{k:'rendW',u:x.id,w:w[0],v:1,exp:'turn'})}));
   rep(G,'Großes Fletscha-Geheul',row('Wurf (3+)',[r],3),r>=3?u.name+' und '+t.name+': Begleiter-Waffen +1 Wucht, +1 Attacke':'Kein Effekt')},ai:()=>true},
 rj_klaevva:{n:'Klävva wie ein Zahnfletscha',s:'Nahkampfphase, 1× pro Schlacht: Einheiten ganz innerhalb 12" um den Träger: +1 Wucht im Nahkampf (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='rj_klaevva',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o);fr(S,o).filter(x=>x===g||wholly(x,g,12)).forEach(x=>addFx(S,{k:'rendP',u:x.id,v:1,exp:'turn'}));G.note('Klävva wie ein Zahnfletscha: +1 Wucht für Einheiten um den General bis Zugende')},ai:(S,o)=>fr(S,o).some(x=>inCombat(S,x))},
 rj_strahl:{n:'Fetzgits Strahlen',s:'Nahkampfphase, 1× pro Schlacht: Feind im Nahkampf mit dem General: −1 auf seine Trefferwürfe (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='rj_strahl',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Fetzgits Strahlen: Ziel',e=>dist(g,e)<=CR);if(!t)return;addFx(S,{k:'hitA',u:t.id,v:-1,exp:'turn'});G.note('Fetzgits Strahlen: '+t.name+' −1 auf Trefferwürfe bis Zugende')},ai:()=>true},
 ms_horden:{n:'Irre Horden',s:'Heldenphase: Mondclan-Piksa-Einheit: bis zu W3 getötete Modelle zurück',ph:1,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='ms_horden',can:(S,o)=>fr(S,o).some(x=>x.dn=='Mondclan-Piksa'&&x.n<x.nmax),
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Irre Horden: Ziel',x=>x.dn=='Mondclan-Piksa'&&x.n<x.nmax);if(!t)return;const d=d3(S),k=retM(G,t,d);rep(G,'Irre Horden',row('W3',[d]),t.name+': '+k+' Modell(e) zurück')},ai:()=>true},
 ms_boss:{n:'Ich bin da Boss',s:'Heldenphase: Mondclan-Piksa ganz innerhalb 12": W6 Modelle zurück (nicht im Nahkampf) oder +1 auf Trefferwürfe (bis zum nächsten Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ms_boss'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Ich bin da Boss: Ziel',x=>x.dn=='Mondclan-Piksa'&&wholly(x,u,12));if(!t)return;
   const ok=!inCombat(S,t)&&t.n<t.nmax,c=ok?yield* selI(G,u.o,'Ich bin da Boss','Wähle den Effekt.',['Ich brauch’ hier mehr Grots! (W6 Modelle zurück)','Stecht se ab! (+1 auf Trefferwürfe)'],0):1;
   if(c==0){const d=d6(S),k=retM(G,t,d);rep(G,'Ich bin da Boss',row('W6',[d]),t.name+': '+k+' Modell(e) zurück')}else{addFx(S,{k:'hitA',u:t.id,v:1,exp:'own'});G.note('Stecht se ab!: '+t.name+' +1 auf Trefferwürfe bis zu deinem nächsten Zug')}},ai:()=>true},
 ms_netz:{n:'Netzgits',s:'Nahkampfphase: feindliche Infanterie im Nahkampf: 2+ → −1 auf ihre Trefferwürfe (Phase)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'ms_netz'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Netzgits: Ziel',e=>/Infanterie/.test(e.kw)&&dist(u,e)<=CR);if(!t)return;const r=d6(S);if(r>=2)addFx(S,{k:'hitA',u:t.id,v:-1,exp:'ph'});rep(G,'Netzgits',row('Wurf (2+)',[r],2),r>=2?t.name+': −1 auf Trefferwürfe in dieser Phase':'Kein Effekt')},ai:()=>true},
 sp_bestie:{n:'Bestie der dunklen Dschungel',s:'Nahkampfphase (General im Nahkampf): Gigantische Kiefer (Würfel > Ausdauer ⇒ 1 Modell getötet) oder Brüllen (−W6 Kontrolle)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sp_bestie'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Bestie der dunklen Dschungel: Ziel',e=>dist(u,e)<=CR);if(!t)return;const c=yield* selI(G,u.o,'Bestie der dunklen Dschungel','Wähle den Effekt.',['Gigantische Kiefer','Brüllen'],0);
   if(c==0){const r=d6(S),ok=r>t.wm;rep(G,'Gigantische Kiefer',row('Wurf (> Ausdauer '+t.wm+')',[r],t.wm+1),ok?'1 Modell von '+t.name+' getötet':'Kein Effekt');if(ok)hurt(G,t,t.wm)}
   else{const r=d6(S);addFx(S,{k:'ctl',u:t.id,v:-r,exp:'turn'});rep(G,'Brüllen',row('W6',[r]),t.name+': −'+r+' Kontrollwert in diesem Zug')}},ai:()=>true},
 sp_kriegsherr:{n:'Uralter Kriegsherr',s:'Heldenphase: Einheit ganz innerhalb 12": +1 auf Angriffswürfe (bis zum nächsten Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sp_kriegsherr'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Uralter Kriegsherr: Ziel',fOth(S,u,12));if(!t)return;addFx(S,{k:'chg',u:t.id,v:1,exp:'own'});G.note('Uralter Kriegsherr: '+t.name+' +1 auf Angriffswürfe')},ai:()=>true},
 gw_meister:{n:'Außergewöhnlicher Endrinenmeister',s:'Heldenphase: Einheit mit Fliegen ganz innerhalb 12": W3, bei 2+ heile (Ergebnis)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gw_meister'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Außergewöhnlicher Endrinenmeister: Ziel',x=>/Fliegen/.test(x.kw)&&wholly(x,u,12));if(!t)return;const r=d3(S),h=r>=2&&canHeal(S,t)?Math.min(r,t.dmg):0;if(h)t.dmg-=h;rep(G,'Außergewöhnlicher Endrinenmeister',row('W3 (2+)',[r],2),h?t.name+': heilt '+h:'Kein Effekt')},ai:(S,u)=>fr(S,u.o).some(x=>/Fliegen/.test(x.kw)&&x.dmg>0)},
 gw_abwehr:{n:'Kanonenboot-Abwehrfeuer',s:'Nahkampfphase: Feind im Nahkampf, der angegriffen hat: W3, bei 2+ tödlicher Schaden in Höhe des Ergebnisses',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'gw_abwehr'),can:(S,u)=>S.U.some(e=>e.o!=u.o&&e.x>=0&&has(S.T.charged,e.id)&&dist(u,e)<=CR),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Abwehrfeuer: Ziel',e=>has(S.T.charged,e.id)&&dist(u,e)<=CR);if(!t)return;const r=d3(S);rep(G,'Kanonenboot-Abwehrfeuer',row('W3 (2+)',[r],2),r>=2?t.name+': '+r+' tödlicher Schaden':'Kein Effekt');if(r>=2)hurt(G,t,r)},ai:()=>true},
 gw_tank:{n:'Nottreibstofftanks',s:'Nahkampfphase, 1× pro Schlacht: der General kämpft zuerst (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='gw_tank',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o);add(S.T.SF,g.id);G.note('Nottreibstofftanks: '+g.name+' kämpft zuerst')},ai:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)}},
 gw_bomb:{n:'Celestium-Sprengbomben',s:'Nahkampfphase: Feind im Nahkampf mit dem General: 3+ → keine Rettungswürfe (Zug)',ph:5,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='gw_bomb',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Celestium-Sprengbomben: Ziel',e=>dist(g,e)<=CR);if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'noward',u:t.id,exp:'turn'});rep(G,'Celestium-Sprengbomben',row('Wurf (3+)',[r],3),r>=3?t.name+': keine Rettungswürfe bis Zugende':'Kein Effekt')},ai:()=>true},
 lu_dunkel:{n:'Dunkelheit der Seele',s:'Heldenphase: Feind innerhalb 12": 3+ → −W6 Kontrollwert (Zug)',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'lu_dunkel'),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Dunkelheit der Seele: Ziel',e=>dist(u,e)<=12);if(!t)return;const r=d6(S);let v=0;if(r>=3){v=d6(S);addFx(S,{k:'ctl',u:t.id,v:-v,exp:'turn'})}rep(G,'Dunkelheit der Seele',row('Wurf (3+)',[r],3),v?t.name+': −'+v+' Kontrollwert':'Kein Effekt')},ai:()=>true},
 lu_amph:{n:'Mondfeueramphore',s:'Nahkampfphase, 1× pro Schlacht: Feind im Nahkampf, der angegriffen hat: 2+ → W3 tödlicher Schaden',ph:5,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'lu_amph'),can:(S,u)=>S.U.some(e=>e.o!=u.o&&e.x>=0&&has(S.T.charged,e.id)&&dist(u,e)<=CR),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Mondfeueramphore: Ziel',e=>has(S.T.charged,e.id)&&dist(u,e)<=CR);if(!t)return;const r=d6(S),d=r>=2?d3(S):0;rep(G,'Mondfeueramphore',row('Wurf (2+)',[r],2),d?t.name+': '+d+' tödlicher Schaden':'Kein Effekt');if(d)hurt(G,t,d)},ai:()=>true},
 lu_bogen:{n:'In hohem Bogen',s:'Fernkampfphase: +6" Reichweite der Bögen, aber −1 auf Trefferwürfe (Phase)',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'lu_bogen'),
  *run(G,u){const S=G.S;addFx(S,{k:'rng',u:u.id,v:6,exp:'ph'});addFx(S,{k:'hitS',u:u.id,v:-1,exp:'ph'});G.note('In hohem Bogen: '+u.name+' +6" Reichweite, −1 auf Trefferwürfe')},ai:()=>false},
 lu_hitze:{n:'Überwältigende Hitze',s:'Heldenphase: Zauber 2W6 (7+), Feind innerhalb 24": halber Bewegungswert (bis nächster Zug), Würfel ≥ Schutz ⇒ W3 tödlicher Schaden',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='lu_hitze',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Überwältigende Hitze: Ziel',e=>dist(g,e)<=24);if(!t)return;const r=yield* spellG(G,t,7);let d=0,q=0;if(r.ok){addFx(S,{k:'mv',u:t.id,v:-Math.floor(t.mv/2),exp:'own'});q=d6(S);if(q>=t.sv)d=d3(S)}
   rep(G,'Überwältigende Hitze',row('Zauberwurf (7+)',[r.a,r.b],0),r.ok?t.name+': Bewegung halbiert'+(d?', '+d+' tödlicher Schaden (Wurf '+q+')':' (Wurf '+q+')'):'Zauber misslingt');if(d)hurt(G,t,d)},ai:()=>true},
 lu_schutz:{n:'Schutz von Hysh',s:'Heldenphase: Zauber 2W6 (7+): Einheit ganz innerhalb 12" hat Rettung 5+ (bis nächster Zug)',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='lu_schutz',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Schutz von Hysh: Ziel',x=>wholly(x,g,12));if(!t)return;const r=yield* spellG(G,t,7);if(r.ok)addFx(S,{k:'ward',u:t.id,v:5,exp:'own'});rep(G,'Schutz von Hysh',row('Zauberwurf (7+)',[r.a,r.b],0),r.ok?t.name+': Rettung 5+':'Zauber misslingt')},ai:()=>true},
 lu_schnell:{n:'Schnelligkeit von Hysh',s:'Heldenphase: Zauber 2W6 (5+): Einheit ganz innerhalb 18": doppelter Bewegungswert (bis nächster Zug)',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='lu_schnell',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Schnelligkeit von Hysh: Ziel',x=>wholly(x,g,18));if(!t)return;const r=yield* spellG(G,t,5);if(r.ok)addFx(S,{k:'mv',u:t.id,v:t.mv,exp:'own'});rep(G,'Schnelligkeit von Hysh',row('Zauberwurf (5+)',[r.a,r.b],0),r.ok?t.name+': Bewegung verdoppelt':'Zauber misslingt')},ai:()=>true},
 wk_blitz:{n:'Blitz des Wandels',s:'Heldenphase: Zauber 2W6 (6+), Feind innerhalb 18": W3 tödlicher Schaden; bei Verlust eines Modells: 1 Modell in Tzaangors (18") zurück',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'wk_blitz'),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Blitz des Wandels: Ziel',e=>dist(u,e)<=18);if(!t)return;const r=yield* spellG(G,t,6),d=r.ok?d3(S):0,n0=t.n;rep(G,'Blitz des Wandels',row('Zauberwurf (6+)',[r.a,r.b],0),r.ok?t.name+': '+d+' tödlicher Schaden':'Zauber misslingt');if(d)hurt(G,t,d);
   if(d&&t.n<n0){const z=yield* pickF(G,u.o,'Blitz des Wandels: Tzaangors',x=>x.dn=='Tzaangors'&&x.n<x.nmax&&wholly(x,u,18));if(z)G.note('Blitz des Wandels: '+z.name+' '+retM(G,z,1)+' Modell zurück')}},ai:()=>true},
 wk_schild:{n:'Schild des Schicksals',s:'Heldenphase: Zauber 2W6 (6+): Einheit ganz innerhalb 18" hat Rettung 6+ (bis nächster Zug)',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='wk_schild',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Schild des Schicksals: Ziel',x=>wholly(x,g,18));if(!t)return;const r=yield* spellG(G,t,6);if(r.ok)addFx(S,{k:'ward',u:t.id,v:6,exp:'own'});rep(G,'Schild des Schicksals',row('Zauberwurf (6+)',[r.a,r.b],0),r.ok?t.name+': Rettung 6+':'Zauber misslingt')},ai:()=>true},
 wk_herz:{n:'Dämonenherz',s:'Nahkampfphase, 1× pro Schlacht: Feind innerhalb 1" um den General: tödlicher Schaden = Schlachtrunde',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='wk_herz',can:(S,o)=>{const g=genOf(S,o);return !!g&&S.U.some(e=>e.o!=o&&e.x>=0&&dist(g,e)<=1)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Dämonenherz: Ziel',e=>dist(g,e)<=1);if(!t)return;G.note('Dämonenherz: '+S.round+' tödlicher Schaden auf '+t.name);hurt(G,t,S.round)},ai:()=>true},
 wk_amulett:{n:'Amulett der Zeitverschiebung',s:'Nahkampfphase, 1× pro Schlacht: Feind innerhalb 9": kämpft in dieser Phase zuerst',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='wk_amulett',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Amulett der Zeitverschiebung: Ziel',e=>dist(g,e)<=9);if(!t)return;add(S.T.SF,t.id);G.note('Amulett der Zeitverschiebung: '+t.name+' kämpft zuerst')},ai:()=>false},
});
// ---------- Etappe 2 ----------
const bz=(S,o)=>(S.bz||[0,0])[o],bzSub=(S,o,n)=>{(S.bz||(S.bz=[0,0]))[o]-=n},bzAdd=(S,o,n=1)=>{(S.bz||(S.bz=[0,0]))[o]+=n};
const prayer=(G)=>d6(G.S);
Object.assign(AB,{
 hh_dkp:{n:'Dämonenkraft nutzen',s:'Heldenphase, 1× pro Zug: alle DKP entfernen; DKP = Schlachtrunde + 1 verteilen (höchstens 3 je Einheit)',ph:1,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'hh_dkp'),
  *run(G,u){const S=G.S;S.dk={};let n=S.round+1;const got=[];
   while(n>0){const t=yield* pickF(G,u.o,'Dämonenkraft ('+n+' DKP übrig): Einheit',x=>(S.dk[x.id]||0)<3);if(!t)break;S.dk[t.id]=(S.dk[t.id]||0)+1;n--;got.push(t.name)}
   G.note('Dämonenkraft: '+got.join(', ')+(n?' ('+n+' verfallen)':''))},ai:()=>true},
 hh_gong:{n:'Schlagt die Gongs',s:'Beliebige Heldenphase, 1× pro Schlacht: Gongträger-Marker entfernen, W3 Modelle zurück',ph:1,freq:'battle',unit:1,src:(S,u)=>hasAb(u,'hh_gong'),can:(S,u)=>u.n<u.nmax,
  *run(G,u){const S=G.S,d=d3(S),k=retM(G,u,d);rep(G,'Schlagt die Gongs',row('W3',[d]),u.name+': '+k+' Modell(e) zurück')},ai:()=>true},
 hh_kelch:{n:'Kelch der Finsternis',s:'Fernkampfphase, 1× pro Schlacht: Feind innerhalb 12" um den General: W3 tödlicher Schaden',ph:3,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='hh_kelch',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Kelch der Finsternis: Ziel',e=>dist(g,e)<=12);if(!t)return;const d=d3(S);G.note('Kelch der Finsternis: '+d+' tödlicher Schaden auf '+t.name);hurt(G,t,d)},ai:()=>true},
 hh_perg:{n:'Pergament der Petrifikation',s:'Heldenphase, 1× pro Schlacht: General hat bis Zugende Rettung 2+, kann aber keine Fähigkeiten einsetzen',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='hh_perg',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'ward',u:g.id,v:2,exp:'turn'});addFx(S,{k:'nomove',u:g.id,exp:'turn'});G.note('Pergament der Petrifikation: '+g.name+' Rettung 2+ bis Zugende')},ai:()=>false},
 sb_schutz:{n:'Schuppenschutz',s:'Heldenphase: Saurus-Einheit: 3+ → Rettung 6+ (bis nächster Zug)',ph:1,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='sb_schutz',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Schuppenschutz: Ziel',x=>/Saurus|Sonnenblut/.test(x.dn));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'ward',u:t.id,v:6,exp:'own'});rep(G,'Schuppenschutz',row('Wurf (3+)',[r],3),r>=3?t.name+': Rettung 6+':'Kein Effekt')},ai:()=>true},
 sp_huan:{n:'Huanchis Jagdzeichen',s:'Fernkampfphase: Skink-Einheit: 3+ → Fernkampfwaffen Krit. (verwundet) bis Zugende',ph:3,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='sp_huan',
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Ziel',x=>/Skink/.test(x.kw)&&x.rw.length);if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'critV',u:t.id,exp:'turn'});rep(G,'Fernkampf-Segen',row('Wurf (3+)',[r],3),r>=3?t.name+': Krit. (verwundet)':'Kein Effekt')},ai:()=>true},
 sp_zer:{n:'Zerschmetternder Schlag',s:'Nahkampfphase: Feind im Nahkampf mit dem General: keine Rettungswürfe (Zug)',ph:5,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='sp_zer',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Ziel',e=>dist(g,e)<=CR);if(!t)return;addFx(S,{k:'noward',u:t.id,exp:'turn'});G.note(t.name+': keine Rettungswürfe bis Zugende')},ai:()=>true},
 sp_gift:{n:'Giftgetier',s:'Nahkampfphase: Feind im Nahkampf mit dem General: W3; 1 ⇒ Marker weg, 2+ ⇒ tödlicher Schaden in Höhe des Ergebnisses',ph:5,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='sp_gift',can:(S,o)=>{const g=genOf(S,o);return !!g&&g.gift!==0&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickE(G,o,'Giftgetier: Ziel',e=>dist(g,e)<=CR);if(!t)return;const r=d3(S);if(r==1){g.gift=0;G.note('Giftgetier: Marker verloren')}else{G.note('Giftgetier: '+r+' tödlicher Schaden auf '+t.name);hurt(G,t,r)}},ai:()=>true},
 sp_brull:{n:'Brutales Brüllen',s:'Heldenphase: Einheit ganz innerhalb 12": 3+ → Waffen Krit. (2 Treffer) bis Zugende',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sp_brull'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Brutales Brüllen: Ziel',x=>wholly(x,u,12));if(!t)return;const r=d6(S);if(r>=3)addFx(S,{k:'critD',u:t.id,exp:'turn'});rep(G,'Brutales Brüllen',row('Wurf (3+)',[r],3),r>=3?t.name+': Krit. (2 Treffer) bis Zugende':'Kein Effekt')},ai:()=>true},
 sp_schrei:{n:'Nervenzerreißende Schreie',s:'Nahkampfphase: Feind im Nahkampf: 4+ → −1 auf seine Trefferwürfe (Zug)',ph:5,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sp_schrei'),can:(S,u)=>inCombat(S,u),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Ziel',e=>dist(u,e)<=CR);if(!t)return;const r=d6(S);if(r>=4)addFx(S,{k:'hitA',u:t.id,v:-1,exp:'turn'});rep(G,'Nervenzerreißende Schreie',row('Wurf (4+)',[r],4),r>=4?t.name+': −1 auf Trefferwürfe':'Kein Effekt')},ai:()=>true},
 bg_blut:{n:'Blutgebet',s:'Heldenphase: Einheit ganz innerhalb 16" um den General: Gebet 3+ → heile (W3)',ph:1,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='bg_blut',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Gebet: Ziel',x=>wholly(x,g,16));if(!t)return;const r=prayer(G),h=r>=3&&canHeal(S,t)?Math.min(d3(S),t.dmg):0;if(h)t.dmg-=h;rep(G,'Gebet',row('Gebetswurf (3+)',[r],3),h?t.name+': heilt '+h:'Kein Effekt')},ai:(S,o)=>fr(S,o).some(x=>x.dmg>0)},
 bg_flam:{n:'Flammende Hingabe',s:'Heldenphase: Einheit ganz innerhalb 16" um den General: Gebet 4+ → +1 Wucht im Nahkampf (bis nächster Zug)',ph:1,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='bg_flam',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pickF(G,o,'Gebet: Ziel',x=>wholly(x,g,16));if(!t)return;const r=prayer(G);if(r>=4)addFx(S,{k:'rendP',u:t.id,v:1,exp:'own'});rep(G,'Gebet',row('Gebetswurf (4+)',[r],4),r>=4?t.name+': +1 Wucht':'Kein Effekt')},ai:()=>true},
 bg_koch:{n:'Kochendes Blut',s:'Heldenphase: Feind innerhalb 16": Gebet 4+ → W3 tödlicher Schaden',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bg_koch'),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Kochendes Blut: Ziel',e=>dist(u,e)<=16);if(!t)return;const r=prayer(G),d=r>=4?d3(S):0;rep(G,'Kochendes Blut',row('Gebetswurf (4+)',[r],4),d?t.name+': '+d+' tödlicher Schaden':'Kein Effekt');if(d)hurt(G,t,d)},ai:()=>true},
 bg_opfer:{n:'Blutopfer',s:'Heldenphase: Befreundete Einheit in Nahkampfreichweite: 2+ → W3 tödlicher Schaden auf sie und +1 Blutzehnt',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bg_opfer'),
  *run(G,u){const S=G.S,t=yield* pickF(G,u.o,'Blutopfer: Ziel',x=>x!==u&&dist(u,x)<=CR);if(!t)return;const r=d6(S);let d=0;if(r>=2){d=d3(S);bzAdd(S,u.o)}rep(G,'Blutopfer',row('Wurf (2+)',[r],2),d?t.name+': '+d+' tödlicher Schaden, +1 Blutzehnt ('+bz(S,u.o)+')':'Kein Effekt');if(d)hurt(G,t,d)},ai:(S,u)=>false},
 bg_koepfe:{n:'Köpfe müssen rollen',s:'Heldenphase, 1× pro Zug: 3 Blutzehnt: bis zu 3 Einheiten +1 Wucht im Nahkampf (bis nächster Zug)',ph:1,freq:'turn',unit:1,src:(S,u)=>hasAb(u,'bg_koepfe'),can:(S,u)=>bz(S,u.o)>=3,
  *run(G,u){const S=G.S;bzSub(S,u.o,3);const ch=[];for(let i=0;i<3;i++){const t=yield* pickF(G,u.o,'Köpfe müssen rollen ('+(i+1)+'/3)',x=>!ch.includes(x));if(!t)break;ch.push(t);addFx(S,{k:'rendP',u:t.id,v:1,exp:'own'})}G.note('Köpfe müssen rollen: +1 Wucht für '+ch.map(x=>x.name).join(', ')+' (Blutzehnt übrig: '+bz(S,u.o)+')')},ai:()=>true},
 bg_stampede:{n:'Messing-Stampede',s:'Angriffsphase: nach dem Angriff: Feind innerhalb 1": 2+ → 1 tödlicher Schaden',ph:4,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'bg_stampede'),can:(S,u)=>has(S.T.charged,u.id),
  *run(G,u){const S=G.S,t=yield* pickE(G,u.o,'Messing-Stampede: Ziel',e=>dist(u,e)<=1);if(!t)return;const r=d6(S);rep(G,'Messing-Stampede',row('Wurf (2+)',[r],2),r>=2?t.name+': 1 tödlicher Schaden':'Kein Effekt');if(r>=2)hurt(G,t,1)},ai:()=>true},
});
// ---------- Etappe 3 ----------
export function* roundStartAb(G){const S=G.S;
 for(const o of [0,1]){try{if(ARMY[S.K.army[o]].tr.includes('ob_pool')){(S.obp||(S.obp=[0,0]))[o]=2;G.note((o?'Computer':'Du')+': 2 Ossiarch-Befehlspunkte')}}catch(e){}}
 for(const o of [0,1]){
  if(AN(S,o)=='Strahlende Phalanx'){const c=yield* selI(G,o,'Kriegsfacette – Runde '+S.round,'Wähle die Facette dieser Schlachtrunde; nur sie ist aktiv.',['Hyshs Macht (Heldenphase, Krit. bei 5+)','Strahlende Kompanie (−1 auf Trefferwürfe gegen dich)','Überlegene Reaktionen (2 Einheiten kämpfen nacheinander)'],1);
   (S.fac||(S.fac=[-1,-1]))[o]=c;G.note((o?'Computer':'Du')+': Kriegsfacette '+['Hyshs Macht','Strahlende Kompanie','Überlegene Reaktionen'][c])}}
 if(S.round==1)for(const o of [0,1]){if(AN(S,o)=='Wandelklingenzirkel'&&S.U.some(x=>x.o==o&&hasAb(x,'wk_schick'))){const d=[];for(let i=0;i<9;i++)d.push(d6(S));d.sort((a,b)=>a-b);fdA(S,o).splice(0,9,...d);(S.fd0||(S.fd0=[[],[]]))[o]=d.slice();
   const c=yield* selI(G,o,'Meister des Schicksals','Deine 9 Schicksalswürfel: '+d.join(', ')+'. Sie ersetzen Zauber-, Renn-, Angriffs-, Treffer-, Verwundungs- und Schutzwürfe. Einsatz:',['Bei jedem Wurf nachfragen (Zauber, Rennen, Angriff, Treffer, Verwunden, Schutz)','Automatisch (je Attacke höchstens 2)','Nicht einsetzen'],1);(S.fdp||(S.fdp=[0,0]))[o]=[2,1,0][c];G.note((o?'Computer':'Du')+': Schicksalswürfel '+d.join(', ')+' ('+['mit Nachfrage','automatisch','nicht eingesetzt'][c]+')')}}
 if(S.round==1){const ms=[0,1].filter(o=>AN(S,o)=='Mondsuchtmob');if(ms.length){const o=ms.length==2?S.first:ms[0];
  const c=yield* selI(G,o,'Im Licht des Bös’n Mondes','Welches Territorium liegt in Runde 1–2 im Mondlicht? (Runde 3–4 das andere)',['Eigenes Territorium','Feindliches Territorium'],1);
  S.moon={o,t:c==0?o:1-o};G.note('Im Licht des Bös’n Mondes: '+(c==0?'eigenes':'feindliches')+' Territorium in Runde 1–2')}}
 if(S.moon&&S.round==3)G.note('Mondlicht wechselt in das andere Territorium')}
Object.assign(AB,{
 hz_offen:{n:'Mörderische Offenbarung',s:'Heldenphase, 1× pro Schlacht: alle erhalten sofort den Ritus der nächsten Schlachtrunde',ph:1,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='hz_offen',can:(S,o)=>S.round<4,
  *run(G,o){const S=G.S;(S.rev||(S.rev=[]))[o]=S.round;G.note('Mörderische Offenbarung: Ritus der Runde '+(S.round+1)+' gilt bereits jetzt')},ai:(S,o)=>S.round<=2},
 lu_hyshs:{n:'Hyshs Macht',s:'Heldenphase, 1× pro Zug, nur Facette „Hyshs Macht“: Einheit: 2+ → Krit. bei unmodifiziertem 5+ (bis nächster Zug)',ph:1,freq:'turn',army:1,src:(S,o)=>AN(S,o)=='Strahlende Phalanx',can:(S,o)=>(S.fac||[])[o]==0,
  *run(G,o){const S=G.S,t=yield* pickF(G,o,'Hyshs Macht: Ziel',x=>true);if(!t)return;const r=d6(S);if(r>=2)addFx(S,{k:'crit5',u:t.id,exp:'own'});rep(G,'Hyshs Macht',row('Wurf (2+)',[r],2),r>=2?t.name+': Krit. bei 5+':'Kein Effekt')},ai:()=>true},
 hh_amu:{n:'Amulett des Blutgottes',s:'Nahkampfphase, 1× pro Schlacht: Attacken des Generals: Krit. bei unmodifiziertem 5+ (Zug)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='hh_amu',can:(S,o)=>{const g=genOf(S,o);return !!g&&inCombat(S,g)},
  *run(G,o){const S=G.S,g=genOf(S,o);addFx(S,{k:'crit5',u:g.id,exp:'turn'});G.note('Amulett: '+g.name+' Krit. bei 5+ bis Zugende')},ai:()=>true},
});
const HZNx=['Vulcatrix','Ignax','Dracothion','Behemat','Nagendra'],DGNx=['Vulcatrix','Behemat','Dracothion','Ignax','Nagendra'];

// ---------- Hilfen für die neuen Spearheads ----------
const vis=(S,a,b)=>!blk(S,a,b)&&!hidden(S,a,b);
function* pk(G,o,t,list,sc){if(!list.length)return null;if(G.isAI(o)){let b=list[0],bv=-1e9;for(const x of list){const v=sc?sc(x[1]):0;if(v>bv){bv=v;b=x}}return b[1]}return yield* ask(G,o,t,list)}
const scE=e=>(isHero(e)?6:0)-wnd(e)/3;
const EL=(S,o,f)=>en(S,o).filter(f).map(x=>[lab(x),x]);
const FL=(S,o,f)=>fr(S,o).filter(f).map(x=>[lab(x),x]);
const unuse=(S,key,freq)=>{const a=freq=='battle'?S.Ub:freq=='turn'?S.T.au:S.Ph.au;const i=a.indexOf(key);if(i>=0)a.splice(i,1)};
const rostOrg=(S,u)=>fr(S,u.o).find(x=>x.fok)||u;
const duftT=(S,u)=>inCombat(S,u)?en(S,u.o).filter(e=>dist(u,e)<=CR):en(S,u.o).filter(e=>dist(u,e)<=9&&vis(S,u,e));
const gaertK=(S,o)=>{const g=genOf(S,o);return g?S.obj.map((p,k)=>k).filter(k=>claims(S,g,k)&&!en(S,o).some(e=>claims(S,e,k))&&S.ent[k]!==o):[]};
const shotT=(S,u)=>(S.T.sh[u.id]||[]).map(id=>byId(S,id)).filter(e=>e&&e.x>=0&&S.U.includes(e)&&e.o!=u.o);
const kegelT=(S,u)=>{const ids=new Set((S.Ph.shd||[]).map(s=>+String(s).split('>')[1]));return en(S,u.o).filter(e=>ids.has(e.id))};
const toetL=(S,o)=>fr(S,o).filter(x=>hasAb(x,'tr_toeten')&&((S.Ph.alc||{})[x.id]>0)&&!inCombat(S,x));
const edgeU=(S,o)=>fr(S,o).filter(x=>x.M&&abs(x).every(m=>Math.min(m.x,m.y,W-m.x,H-m.y)-m.l/2<=6));
function* edgeJump(G,o,key,title){const S=G.S,t=yield* pk(G,o,title+': Einheit',FL(S,o,x=>edgeU(S,o).includes(x)),x=>mx(x));if(!t)return;
 const kd=t.rsv;t.rsv='edge';const p=yield* place(G,o,'rsv',t,title,'Neu aufstellen: ganz innerhalb von 3 Zoll um eine Kante, mehr als 6 Zoll von Feinden',{cancel:true});
 if(p.cancel){t.rsv=kd||0;unuse(S,o+':'+key,'battle');return}
 const Pf=rsvForm(t,p.x,p.y);if(Pf)setAbs(t,Pf);else{t.x=p.x;t.y=p.y}t.rsv=kd||0;G.note(title+': '+t.name+' wird neu aufgestellt')}
// Ende eines beliebigen Zugs (o = Spieler, act = aktiver Spieler)
export function* eot2(G,o,act){const S=G.S,g=genOf(S,o);
 if(AN(S,o)=='Sonnenblütige Pirscher'){const sa=fr(S,o).filter(x=>/Saurus|Sonnenblut/.test(x.dn));const es=en(S,o).filter(e=>sa.some(f=>dist(f,e)<=CR));es.forEach(e=>{const r=d6(S);if(r>=4){G.note('Vergeltung Azyrs: 1 tödlicher Schaden auf '+e.name);hurt(G,e,1)}})}
 for(const u of fr(S,o).filter(x=>hasAb(x,'hz_krist'))){const l=en(S,o).filter(e=>dist(u,e)<=1);if(!l.length)continue;const t=yield* pk(G,o,'In Kristall verwandelt: Ziel',l.map(x=>[lab(x),x]),scE);if(!t)continue;const r=d6(S);hdr(G,'In Kristall verwandelt',r,r>=2,2,t.name+': 1 tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,1,'In Kristall verwandelt')}
 if(RGI(S,o)=='sp_raub'){const l=en(S,o).filter(e=>fr(S,o).some(f=>dist(f,e)<=CR)),rs=[];l.forEach(e=>{const r=d6(S);rs.push(r);if(r>=3)mort(G,e,1,'Raubtierhafte Kämpfer')});if(l.length)rep(G,'Raubtierhafte Kämpfer',row('Würfe (3+)',rs,3),l.map((e,i)=>e.name+(rs[i]>=3?': 1 tödlicher Schaden':': nichts')).join('<br>'))}
 if(ENI(S,o)=='sp_sotek'&&g){const r=d6(S);addFx(S,{k:'ctl',u:g.id,v:r,exp:'turn'});G.note('Soteks Blick: '+g.name+' +'+r+' Kontrollwert in diesem Zug')}
 if(ENI(S,o)=='rj_meuchel'&&g){const l=heroT(S,g);if(l.length){const t=yield* pk(G,o,'Hinterhältiger Meuchelmörder: Held',l.map(x=>[lab(x),x]),scE);if(t){const r=d3(S);hdr(G,'Hinterhältiger Meuchelmörder',r,r>=2,2,t.name+': '+r+' tödlicher Schaden','Kein Effekt');if(r>=2)mort(G,t,r,'Hinterhältiger Meuchelmörder')}}}
 if(ENI(S,o)=='ms_tag'&&g&&has(S.T.fought,g.id)&&!fxL(S,g,'nomove').length){const r=d6(S)+d6(S);yield* nmove(G,g,'An ’nem andern Tag weiterkämpf’n',r)}
 if(ENI(S,o)=='sp_alt'&&!g&&S.G[o]===S.tn&&!usedKey(S,o+':sp_alt','battle')&&S.GY.some(x=>x.o==o&&x.gen&&x.dn=='Sonnenblut-Kohorte')){useKey(S,o+':sp_alt','battle');const r=d6(S);hdr(G,'Von den Alten gesegnet',r,r>=2,2,'Eine Ersatzeinheit erscheint','Kein Effekt');
  if(r>=2){const q=mkUnit('Sonnenblut-Kohorte',o,S.NID++,1);q.repl=1;const p=yield* place(G,o,'rein',q,'Von den Alten gesegnet','Aufstellen: mehr als 6 Zoll von allen Feinden',{cancel:true});if(!p.cancel){q.x=p.x;q.y=p.y;S.U.push(q);G.note('Von den Alten gesegnet: '+q.name+' erscheint')}}}
 if(AN(S,o)=='Blutgeschworene Pilger'&&g)fr(S,o).filter(x=>x.dn=='Blutjäger'&&x.n<x.nmax&&dist(x,g)<=8).forEach(x=>{const k=retM(G,x,d3(S));if(k)G.note('Rasende Hingabe: '+x.name+' '+k+' Modell(e) zurück')});
 // Ab damit in den Topf (Schlundsucher-Mob): Kessel wird voll, wenn in diesem Zug eine Feind-Einheit zerstört wurde
 if(armyN(S,o)=='Schlundsucher-Mob'&&g&&S.D[1-o]>0&&!S.kes[o]){S.kes[o]=1;G.note('Ab damit in den Topf: Der Fleischerkessel ist voll')}
 if(RGI(S,o)=='fp_vor'&&o==act&&!usedKey(S,o+':fp_vor','battle')){const l=fr(S,o).filter(u=>has(S.T.charged,u.id));
  if(l.length&&(yield* yn(G,o,'Brutales Voranstürmen','Einheit, die angegriffen hat, bewegt sich bis zu 2W6" (nicht im Nahkampf endend), 1× pro Schlacht',false))){
   const u=yield* pk(G,o,'Brutales Voranstürmen: Einheit',l.map(x=>[lab(x),x]),x=>inCombat(S,x)?0:1);
   if(u){useKey(S,o+':fp_vor','battle');const r=d6(S)+d6(S);const a=yield* destReq(G,u,r,{text:'Brutales Voranstürmen: bis '+r+' Zoll'});if(!a.stay){applyMove(S,u,a,r);G.note('Brutales Voranstürmen: '+u.name+' bewegt sich')}}}}
 if(ENI(S,o)=='fp_knorpel'&&g&&!usedKey(S,o+':fp_knorpel','battle')){const t=foes(S,g).filter(e=>e.x>=0&&dist(g,e)<=CR);
  if(t.length&&(yield* yn(G,o,'Knorpelfresser','Jede feindliche Einheit im Nahkampf mit dem General erleidet W3 Schaden, dann heilt der General (3). 1× pro Schlacht',g.dmg>0||t.length>1))){
   useKey(S,o+':fp_knorpel','battle');const out=[];t.forEach(e=>{const d=d3(S);out.push(e.name+': '+d);mort(G,e,d,'Knorpelfresser')});if(S.U.includes(g)&&canHeal(S,g))g.dmg=Math.max(0,g.dmg-3);G.note('Knorpelfresser: '+out.join(', ')+' – '+g.name+' heilt (3)')}}
 if(ENI(S,o)=='ss_port'&&g&&S.kes[o]){const l=fr(S,o).filter(x=>x.dmg>0&&wholly(x,g,9)&&vis(S,g,x)&&canHeal(S,x));if(l.length){l.forEach(x=>{x.dmg=Math.max(0,x.dmg-1)});G.note('Großzügige Portionen: '+l.map(x=>x.name).join(', ')+' heilen (1)')}}
 if(ENI(S,o)=='od_besch'&&g){const l=fr(S,o).filter(x=>x.dn=='Seuchenhüter'&&x.n<x.nmax&&wholly(x,g,14)&&canHeal(S,x));if(l.length){const t=yield* pk(G,o,'Seuchenhüter-Beschwörer: Einheit',l.map(x=>[lab(x),x]),x=>x.nmax-x.n);if(t){t.n++;G.note('Seuchenhüter-Beschwörer: '+t.name+' erhält 1 Modell zurück')}}}
 if(ENI(S,o)=='fe_schlinger'&&g&&(S.T.gk||[]).includes(g.id)&&g.dmg>0&&canHeal(S,g)){const h=d3(S);g.dmg=Math.max(0,g.dmg-h);G.note('Hungriger Schlinger: '+g.name+' heilt '+h)}
 // Unerbittliche Angreifer (Faulige Pestkönige)
 for(const u of fr(S,o).filter(x=>hasAb(x,'od_unerb'))){const l=foes(S,u).filter(e=>e.x>=0&&/Infanterie/.test(e.kw)&&dist(u,e)<=CR);if(!l.length)continue;
  const t=yield* pk(G,o,'Unerbittliche Angreifer: Ziel',l.map(x=>[lab(x),x]),scE);if(!t)continue;const k=abs(u).filter(m=>abs(t).some(q=>mgap(m,q)<=CR)).length;let d=0;const rs=[];for(let i=0;i<k;i++){const r=d6(S);rs.push(r);if(r>t.wm)d++}
  rep(G,'Unerbittliche Angreifer',row('Würfe (> Ausdauer '+t.wm+')',rs,t.wm+1),d?d+' tödlicher Schaden auf '+t.name:'Kein Schaden');if(d)mort(G,t,d,'Unerbittliche Angreifer')}
 // Thexa-Marker
 const th=fr(S,o).find(x=>hasAb(x,'gw_thexa'));
 if(th){const hold=S.U.find(x=>x.thx&&x.x>=0);
  if(!hold){th.thx=1}
  else if(hold===th){const e=en(S,o).filter(x=>dist(th,x)<=6).sort((a,b)=>dist(th,a)-dist(th,b))[0];if(e){th.thx=0;e.thx=1;G.note('Thexa: Der Marker wechselt zu '+e.name)}}
  else if(hold.o!=o){const d=d3(S);hold.thx=0;th.thx=1;G.note('Thexa: '+hold.name+' erleidet '+d+' tödlichen Schaden');mort(G,hold,d,'Thexa')}}
 // Glut und Asche (Freigilden-Grenadiere), 1× pro Zug (Armee)
 if(!usedKey(S,o+':gw_glut','turn')){const u=fr(S,o).find(x=>hasAb(x,'gw_glut'));
  if(u){const ts=S.ter.filter(t=>tdist(u,t)<=3),ks=S.obj.map((p,k)=>k).filter(k=>claims(S,u,k));
   const cand=[...ts.map(t=>({t,k:null})),{t:null,k:null}];let best=null,bv=0;
   for(const t of [null,...ts])for(const k of [null,...ks]){const l=en(S,o).filter(e=>(t&&tdist(e,t)<=3)||(k!=null&&claims(S,e,k)));if(l.length>bv){bv=l.length;best={t,k,l}}}
   if(best&&(yield* yn(G,o,'Glut und Asche','Feindliche Einheiten, die dasselbe Gelände/Ziel beanspruchen wie '+u.name+': je 3+ → 1 tödlicher Schaden ('+best.l.length+' Ziel(e), 1× pro Zug)',true))){
    useKey(S,o+':gw_glut','turn');const rs=[];best.l.forEach(e=>{const r=d6(S);rs.push(r);if(r>=3)mort(G,e,1,'Glut und Asche')});rep(G,'Glut und Asche',row('Würfe (3+)',rs,3),best.l.map((e,i)=>e.name+(rs[i]>=3?': 1 tödlicher Schaden':': nichts')).join('<br>'))}}}}
// Aufstellungsphase (nach der Aufstellung beider Armeen)
export function* dep2(G,o){const S=G.S;
 if(RGI(S,o)=='fz_anf'){fr(S,o).filter(u=>u.dn=='Wilderkorps-Jäger').forEach(u=>{if(!/Verstärkung/.test(u.kw))u.kw+=', Verstärkung'});G.note('Respektierter Anführer: Wilderkorps-Jäger erhalten Verstärkung')}
 const mv1=function*(u,title){const mv=mvOf(S,u),a=yield* destReq(G,u,mv,{text:title});if(!a.stay){applyMove(S,u,a,mv);G.note(title+': '+u.name+' bewegt sich')}};
 if(RGI(S,o)=='ep_ans'){const g=genOf(S,o),l=g?fr(S,o).filter(x=>/^(Jägerinnen|Slaaneshbestien)/.test(x.dn)&&wholly(x,g,12)):[];
  if(l.length){const t=yield* pk(G,o,'Dämonischer Ansturm',[...l.map(x=>[lab(x),x]),['Keine Einheit',null]],x=>x?mx(x):-1e8);if(t){useKey(S,o+':ep_ans','battle');yield* mv1(t,'Dämonischer Ansturm')}}}
 if(RGI(S,o)=='hh_mahl'&&!usedKey(S,o+':hh_mahl','battle')){const l=fr(S,o).filter(x=>/^Infernale Kohorte/.test(x.dn));if(l.length&&(yield* yn(G,o,'Mahlender Vormarsch','Bis zu 2 Infernale-Kohorte-Einheiten bewegen sich sofort bis zu 3 Zoll, greifen aber in Runde 1 nicht an (1× pro Schlacht)',true))){useKey(S,o+':hh_mahl','battle');const done=[];
  for(let i=0;i<2;i++){const c=l.filter(x=>!done.includes(x)),t=c.length?yield* pk(G,o,'Mahlender Vormarsch ('+(i+1)+'/2): Einheit',[...c.map(x=>[lab(x),x]),['Keine weitere',null]],x=>x?mx(x):-1e9):null;if(!t)break;done.push(t);yield* nmove(G,t,'Mahlender Vormarsch',3);addFx(S,{k:'nochg',u:t.id,exp:'rnd',r0:1})}}}
 if(RGI(S,o)=='rj_flanke'&&!usedKey(S,o+':rj_flanke','battle')&&(yield* yn(G,o,'Flankenkämpfer','Bis zu 2 Einheiten vom Feld nehmen und >6 Zoll von allen Feinden neu aufstellen (1× pro Schlacht)',true))){useKey(S,o+':rj_flanke','battle');const done=[];
  for(let i=0;i<2;i++){const c=fr(S,o).filter(x=>!done.includes(x)&&!inCombat(S,x)),t=c.length?yield* pk(G,o,'Flankenkämpfer ('+(i+1)+'/2): Einheit',[...c.map(x=>[lab(x),x]),['Keine weitere',null]],x=>x?mx(x):-1e9):null;if(!t)break;done.push(t);yield* relocate(G,o,t,'rein','Flankenkämpfer','Neu aufstellen: mehr als 6 Zoll von allen Feinden')}}
 for(const u of fr(S,o).filter(x=>hasAb(x,'fz_fahr'))){if(G.isAI(o)||(yield* yn(G,o,'Erfahrene Fährtenleser',u.name+' führt eine Normale Bewegung aus?',true)))yield* mv1(u,'Erfahrene Fährtenleser')}}

// ---------- Hilfen für Regeln/Ablauf ----------
export const abKey=(S,u,id,o)=>(AB[id].army?o:u.id)+':'+id;
export const abUsed=(S,u,id,o)=>AB[id].freq?usedKey(S,abKey(S,u,id,o),AB[id].freq):false;
// Einheiten-Fähigkeiten dieser Phase für das Einheiten-Menü
export function abList(S,u){return Object.entries(AB).filter(([id,a])=>a.unit&&(a.ph==S.ph||(a.freq=='battle'&&a.ph))&&a.src(S,u)).map(([id,a])=>({k:'ab:'+id,t:a.n,s:a.s,dis:a.ph!=S.ph||abUsed(S,u,id)||(a.can&&!a.can(S,u))||fxL(S,u,'nomove').length>0&&false}))}
// Armee-Fähigkeiten dieser Phase (Hauptmenü); nur eigene Phase bzw. bei beliebiger Nahkampfphase auch gegnerische
export function abGlobals(S,o){const g=[];
 for(const [id,a] of Object.entries(AB)){if(!a.army||a.eot||a.opp||!a.src(S,o))continue;const ownPh=S.act==o;
  const off=a.ph!=S.ph||(!ownPh&&S.ph!=5);if(off&&!(a.freq=='battle'&&a.ph))continue;
  g.push({k:'ab:'+id,t:a.n,s:a.s,dis:off||abUsed(S,null,id,o)||(a.can&&!a.can(S,o))})}
 return g}
export function* runAb(G,id,u,o){const S=G.S,a=AB[id];useKey(S,abKey(S,u,id,o),a.freq||'phase');G.src=a.n;G.co=o;try{yield* a.run(G,a.army?o:u)}finally{G.src=null;G.co=null}}
export const abAI=(S,o)=>{ // KI: erste sinnvolle verfügbare Fähigkeit dieser Phase
 for(const [id,a] of Object.entries(AB)){if(!a.ai||a.eot||a.opp)continue;
  if(a.unit){for(const u of fr(S,o)){if(a.ph==S.ph&&a.src(S,u)&&!abUsed(S,u,id,o)&&(!a.can||a.can(S,u))&&a.ai(S,u))return {a:'ab:'+id,u:u.id}}}
  else if(a.src(S,o)&&a.ph==S.ph&&S.act==o&&!abUsed(S,null,id,o)&&(!a.can||a.can(S,o))&&a.ai(S,o))return {a:'ab:'+id}}
 return null}
// Prüfung einer Fähigkeits-Aktion
export function abCheck(S,who,a){const id=a.a.slice(3),A=AB[id];if(!A)return 'Unbekannt';
 if(A.unit){const u=byId(S,a.u);if(!u||u.o!=who||u.x<0)return 'Keine eigene Einheit';const e=abList(S,u).find(x=>x.k==a.a);return e&&!e.dis?'':'Fähigkeit jetzt nicht möglich'}
 return abGlobals(S,who).some(x=>x.k==a.a&&!x.dis)?'':'Fähigkeit jetzt nicht möglich'}

// ---------- Ende eines Zugs: automatische Fähigkeiten ----------
export function* eot(G){const S=G.S,act=S.act;
 S.U.filter(u=>u.x>=0&&u.n<u.nmax&&(hasAb(u,'legion')||hasAb(u,'schwarm'))&&canHeal(S,u)).forEach(u=>{const big=hasAb(u,'schwarm')&&RGI(S,u.o)=='endl',x=big?d6(S):d3(S),n=Math.min(u.nmax-u.n,x);if(n>0){u.n+=n;G.note((hasAb(u,'legion')?'Skelettlegion':'Wimmelnder Schwarm')+': '+u.name+' erhält '+n+' Modell(e) zurück')}});
 for(const o of [act,1-act]){
  yield* eot2(G,o,act);yield* eot3(G,o,act);
  if(AB.nm.src(S,o)&&!usedKey(S,o+':nm','battle')){const g=genOf(S,o);if(g){const ks=S.obj.map((p,k)=>k).filter(k=>claims(S,g,k));
   const es=S.U.filter(e=>e.o!=o&&e.x>=0&&ks.some(k=>claims(S,e,k)));if(es.length){useKey(S,o+':nm','battle');const rs=[];es.forEach(e=>{const r=d6(S);rs.push(r);if(r>=2)addFx(S,{k:'ctl',u:e.id,v:-r,exp:'turn'})});G.rep('Nullamulett',[row('Würfe (2+)',rs,2),{k:'txt',s:'Kontrollwerte der betroffenen Feinde sinken in diesem Zug.'}])}}}
  if(AB.sie.src(S,o)){fr(S,o).filter(u=>inCombat(S,u)&&claimsAny(S,u)).forEach(u=>{const t=foes(S,u).filter(e=>e.x>=0).sort((a,b)=>dist(u,a)-dist(u,b))[0];if(t&&dist(u,t)<=CR)pileIn(S,u,t);
    const e=foes(S,u).filter(f=>f.x>=0&&dist(u,f)<=1).sort((a,b)=>dist(u,a)-dist(u,b))[0];if(e){const r=d6(S);G.note('Schlagt sie zurück: '+u.name+' rückt nach, Wurf '+r+(r>=4?' – 1 tödlicher Schaden auf '+e.name:''));if(r>=4)hurt(G,e,1)}})}
  if(ENI(S,o)=='fyrf'){const g=genOf(S,o);const e=g&&foes(S,g).filter(x=>x.x>=0&&dist(g,x)<=CR)[0];if(e){G.note('Fŷrfunken: '+e.name+' erleidet 1 tödlichen Schaden');hurt(G,e,1)}}
  if(RGI(S,o)=='korr'&&o==act&&!abUsed(S,null,'korr',o)&&S.ter.length){
   const cnt=t=>en(S,o).filter(e=>tdist(e,t)<=3).length,best=[...S.ter].sort((a,b)=>cnt(b)-cnt(a))[0];
   if(cnt(best)>0&&(yield* yn(G,o,'Korrumpierung des Landes','Geländestück wählen: W6 je Feind-Einheit innerhalb 3", 4+ → W3 tödlicher Schaden (1× pro Zug)')))
    {useKey(S,abKey(S,null,'korr',o),'turn');let t=best;if(!G.isAI(o)){const c=yield* ask(G,o,'Geländestück wählen',S.ter.map(t=>[(t.big?'Großes':'Kleines')+' Gelände ('+Math.round(t.x)+'/'+Math.round(t.y)+') – '+cnt(t)+' Feind(e) in 3"',t]));if(c)t=c}
     en(S,o).filter(e=>tdist(e,t)<=3).forEach(e=>{const r=d6(S);G.note('Korrumpierung des Landes: '+e.name+' Wurf '+r+(r>=4?' → W3 tödlicher Schaden':''));if(r>=4)hurt(G,e,d3(S))})}}
  if(RGI(S,o)=='wsch'&&!abUsed(S,null,'wsch',o)&&fr(S,o).some(u=>inCombat(S,u))&&(yield* yn(G,o,'Wachsender Schrecken','Einheit wählen: 2+ → Rundennummer vom Kontrollwert der Feinde im Nahkampf mit ihr abziehen (1× pro Zug)'))){
   const t=yield* pickF(G,o,'Wachsender Schrecken: Einheit',x=>inCombat(S,x));if(t){useKey(S,abKey(S,null,'wsch',o),'turn');const r=d6(S);
    if(r>=2)foes(S,t).filter(e=>e.x>=0&&dist(t,e)<=CR).forEach(e=>addFx(S,{k:'ctl',u:e.id,v:-S.round,exp:'turn'}));
    rep(G,'Wachsender Schrecken',row('Wurf (2+)',[r],2),r>=2?'Kontrollwert der Feinde im Nahkampf mit '+t.name+' sinkt um '+S.round:'Kein Effekt')}}
  if(RGI(S,o)=='glut'&&o!=act&&!abUsed(S,null,'glut',o)){
   const c=fr(S,o).filter(u=>!usedKey(S,u.id+':glut','battle')&&inCombat(S,u));
   if(c.length&&(yield* yn(G,o,'Glut der Runen','Einheit würfelt 6 Würfel gegen einen Feind im Nahkampf: je 4+ = 1 tödlicher Schaden (1× pro Einheit und Schlacht)'))){
    const u=G.isAI(o)?c[0]:yield* ask(G,o,'Glut der Runen: Einheit',c.map(x=>[lab(x),x]));if(u){const e=G.isAI(o)?foes(S,u).filter(x=>x.x>=0&&dist(u,x)<=CR)[0]:yield* pickE(G,o,'Glut der Runen: Ziel',x=>dist(u,x)<=CR);
     if(e){useKey(S,abKey(S,null,'glut',o),'turn');useKey(S,u.id+':glut','battle');const rs=[];for(let i=0;i<6;i++)rs.push(d6(S));const k=rs.filter(x=>x>=4).length;rep(G,'Glut der Runen',row('6 Würfel (4+)',rs,4),k?e.name+': '+k+' tödlicher Schaden':'Kein Schaden');if(k)hurt(G,e,k)}}}}
 }
 S.U.filter(u=>u.x>=0&&hasAb(u,'nurgl')&&u.dmg>0&&canHeal(S,u)).forEach(u=>{const h=d3(S);u.dmg=Math.max(0,u.dmg-h);G.note('Endloser Schwarm: '+u.name+' heilt '+h)})}

// ---------- Reserven ----------
export const RSVN={'Skelette (Knochenhorde)':'Die Toten erheben sich','Vargheister':'Sturzflug','Goldwächter':'Feurige Verstärkung','Annihilatoren':'Blitzartiges Eintreffen','Yndrasta, der Celestische Speer':'Blitzartiges Eintreffen','Hungrige Ogors (3 Modelle)':'Noch mehr Ogors, mein Herr!','Prankenbiestreiter':'Noch mehr Ogors, mein Herr!','Verschlinger-Schlundrudel':'Rasende Jäger','Squighoppa':'Squiglawine','Huanchis Jäger':'Chamäleon-Hinterhalt','Chotec-Echse':'Chamäleon-Hinterhalt'};
export const inRsv=(S,o)=>S.U.filter(u=>u.o==o&&u.x<0&&u.rsv);
export function rsvGlobals(S,o){if(S.act!=o)return [];return inRsv(S,o).filter(u=>S.round>=u.rr&&S.ph==(u.rph==null?2:u.rph)&&!(u.lim&&usedKey(S,o+':ank','turn'))).map(u=>({k:'rsv:'+u.id,t:(RSVN[u.dn]?RSVN[u.dn]+': ':'')+u.name+' aufstellen',s:{edge:'Bis 3" vom Rand, mehr als 6" von Feinden',edge1:'Bis 1" vom Rand, mehr als 6" von Feinden',any:'Mehr als 6" von allen Feinden',edgeT:'Ganz im eigenen Territorium, bis 3" vom Rand, mehr als 6" von Feinden',corner:'Bis 6" von einer Ecke, mehr als 9" von Feinden'}[u.rsv]}))}

// ---- Flags: zeitweilige Modifikatoren, die nicht zu den Grundregeln der Einheit gehören ----
const sg=v=>(v>0?'+':'')+v;
const FXL={notgt:['nicht anvisierbar','kann nicht von Fernkampfattacken anvisiert werden'],only:['nur ein Ziel','Alle Attacken müssen einen bestimmten Helden zum Ziel haben'],nochg:['kein Angriff','darf nicht angreifen'],rendWS:['Wucht Fk','Wucht der Fernkampfwaffe'],hit:['Treffer','Trefferwürfe'],hitS:['Treffer Fk','Trefferwürfe (Fernkampf)'],hitTs:['Treffer','Trefferwürfe'],hitTm:['Treffer Nk','Trefferwürfe (Nahkampf)'],hitA:['Treffer','Trefferwürfe'],hitW:['Treffer Waffe','Trefferwürfe einer Waffe'],
 rend:['Rend','Durchschlag'],rendP:['Rend','Durchschlag'],rendV:['Rend','Durchschlag'],chg:['Angriff','Angriffswurf'],ward:['Ward','Ward-Rettung'],wardM:['Ward','Ward-Rettung'],svP:['Rettung','Rettungswürfe'],
 mv:['Bewegung','Bewegung'],run:['Rennen','Rennenwürfe'],ctl:['Kontrolle','Kontrollwert'],att:['Attacken','Attackenwert'],attW:['Attacken Waffe','Attackenwert einer Waffe'],attD:['Attacken ×2','Attackenwert verdoppelt'],
 wnd:['Wunden','Wundenwert'],wndS:['Wunden','Wundenwert'],wndT:['Wunden','Wundenwert'],wndTm:['Wunden','Wundenwert'],wndM:['Wunden','Wundenwert'],crit:['Krit.','Kritische Treffer'],critA:['Krit. Angr.','Kritisch (Attacke)'],critD:['Krit. Vert.','Kritisch (Verteidigung)'],
 norun:['kein Rennen','darf nicht rennen'],nomove:['festgehalten','darf sich nicht bewegen'],first:['kämpft zuerst','kämpft zuerst'],last:['kämpft zuletzt','kämpft zuletzt (im Gebiet)'],fz:['Angriff frei','darf auch nach Rennen/Rückzug angreifen'],ctlmax:['Kontrolle max. 1','Kontrollwert höchstens 1'],cdlow:['Angriff schlecht','Angriffswurf: niedrigster Würfel'],cdie:['Angriff −1 Würfel','Ein Würfel weniger beim Angriff'],antichg:['Angriff schwer','Angriffe gegen sie schwerer'],klaev:['Klaue','Sonderwirkung'],schuer:['Schüren','Schüren'],ruhm:['Ruhm','Sonderwirkung'],dmgw:['Schaden Waffe','Schaden einer Waffe'],rrc:['Wiederholung Angriff','Angriffswurf wiederholen']};
const EXPL={ph:'bis Ende der Phase',turn:'bis Ende des Zugs',own:'bis zum nächsten eigenen Zug',rnd:'bis Ende der Runde',perm:'bis Ende der Schlacht'};
export function unitFlags(S,u){const f=[];
 S.E.filter(e=>e.u===u.id&&(e.exp=='ph'?(S.tn==e.t0&&S.ph==e.p0):e.exp=='turn'?S.tn==e.t0:e.exp=='own'?S.tn<e.t0+2:e.exp=='rnd'?S.round==e.r0:true)).forEach(e=>{const l=FXL[e.k]||[e.k,e.k];const v=typeof e.v=='number'?(e.k.startsWith('ward')?e.v+'+':sg(e.v)):'';const bad=typeof e.v=='number'&&e.k!='ward'&&e.v<0||['norun','nomove','cdlow','cdie','last','ctlmax'].includes(e.k);
  f.push({c:bad?'bad':'good',t:l[0]+(v?' '+v:''),d:l[1]+(v?' '+v:'')+(e.w&&typeof e.w=='string'?' ('+e.w+')':'')+' – '+(EXPL[e.exp]||'')})});
 if(u.grd!=null)f.push({c:'bad',t:'Groll',d:'Vom Groll betroffen: befreundete Infanterie wiederholt Trefferwürfe von 1 im Nahkampf gegen diese Einheit'});
 if(u.mud)f.push({c:'good',t:'Schlamm',d:'Schlammbedeckt: für Feinde über 12 Zoll nicht sichtbar'});
 const T=S.TW||{};
 if(T.bm&&T.bm.includes(u.id))f.push({c:'bad',t:'Blutmarke',d:'Blutmarkiert (Wendung): bei Zerstörung erhält der Gegner 1 Siegpunkt'});
 if(T.ens===u.id)f.push({c:'bad',t:'Ranken',d:'Fesselnde Ranken (Wendung): Bewegung halbiert, Angriff mit einem Würfel'});
 if(T.fren===u.id)f.push({c:'good',t:'Rasend',d:'Rasende Einheit (Wendung)'});
 if(T.wd===u.id)f.push({c:'good',t:'Dornenschild',d:'Dornenschild (Wendung): Ward 6+'});
 if(T.nw===u.id)f.push({c:'bad',t:'Fäule',d:'Nurgles Fäule (Wendung): Schutzwürfe −1'});
 if(T.rot===u.id)f.push({c:'bad',t:'Dunst',d:'Zersetzender Dunst (Wendung): kein Ward'});
 if(S.Ph&&S.Ph.tfl&&S.Ph.tfl.includes(u.id))f.push({c:'good',t:'Durchscheinend',d:'Translucent Flesh: Angriffe gegen die Einheit scheitern bei unmodifizierten Würfen von 1–3 (Treffer und Verwundung)'});
 if(T.wnU===u.id)f.push({c:'good',t:'Anpassung',d:'Adaptable Defence (Wendung): ignoriert alle Modifikatoren auf Schutzwürfe'});
 if(T.ssU===u.id)f.push({c:'good',t:'Ward 5+',d:'Secured Supply Lines (Wendung): Ward 5+, solange sie eines der gewählten Geländestücke kontestiert'});
 if(T.spear===u.id)f.push({c:'good',t:'Speerspitze',d:'Speerspitze (Wendung)'});
 if(S.T.SL&&S.T.SL.includes(u.id))f.push({c:'bad',t:'zuletzt',d:'Kämpft in diesem Zug zuletzt'});
 if(S.T.SF&&S.T.SF.includes(u.id))f.push({c:'good',t:'zuerst',d:'Kämpft in diesem Zug zuerst'});
 return f}
// Fähigkeiten „1× pro Schlacht“ einer Armee (für die Leiste im Feld)
const ICN=a=>{const t=a.s;return /zuerst/.test(t)?'⏩':/zuletzt/.test(t)?'⏪':/Rettung|Ward|Schild/.test(t)?'🛡️':/tödlich/.test(t)?'💀':/aufgestellt|aufstell|Aufstell/.test(t)?'📍':/zurück|kehrt|Modell/.test(t)?'↩️':/Kontroll/.test(t)?'🚩':/Bewegung|bewegt|rück/.test(t)?'🏃':/Treffer|Attacke|Wucht|Krit|Nahkampf|Fernkampf/.test(t)?'⚔️':'✨'};
// Zeitpunkt einer Fähigkeit: aus dem Text („Nahkampfphase …“, „Gegnerische Bewegungsphase …“); true, wenn sie jetzt eingesetzt werden kann
const PHN=['Aufstellungsphase','Heldenphase','Bewegungsphase','Fernkampfphase','Angriffsphase','Nahkampfphase'];
const nowOK=(S,o,a)=>{const m=/^(Gegnerische )?(Aufstellungsphase|Heldenphase|Bewegungsphase|Fernkampfphase|Angriffsphase|Nahkampfphase)/.exec(a.s||'');if(!m)return true;const i=PHN.indexOf(m[2]);if(i==0)return S.ph==0;return S.ph==i&&(m[1]?S.act!=o:S.act==o)};
export function battleAbs(S,o){const r=[];
 for(const [id,a] of Object.entries(AB)){if(a.freq!='battle')continue;
  if(a.army){try{if(a.src(S,o))r.push({id,o,n:a.n,s:a.s,ic:ICN(a),used:abUsed(S,null,id,o),now:nowOK(S,o,a)})}catch(e){}}
  else if(a.unit){S.U.filter(u=>u.o==o&&u.x>=0).forEach(u=>{try{if(a.src(S,u))r.push({id,o,n:a.n,s:a.s,ic:ICN(a),u:u.name,used:abUsed(S,u,id),now:nowOK(S,u.o,a)})}catch(e){}})}}
 if(S.fd0&&S.fd0[o]&&S.fd0[o].length){const rem=(S.fd&&S.fd[o]||[]).slice().sort((x,y)=>x-y),pol=(S.fdp||[0,0])[o];r.push({id:'fd',o,n:'Schicksalswürfel',ic:'🎲',s:'Meister des Schicksals: ersetzt Zauber-, Renn-, Angriffs-, Treffer-, Verwundungs- und Schutzwürfe.',st:rem.length?'<b>Verbleibende Würfel: '+rem.join(', ')+'</b><br>Einsatz: '+['nicht einsetzen','automatisch','bei jedem Wurf nachfragen'][pol]:'<b>Alle Schicksalswürfel sind verbraucht.</b>',used:!rem.length})}
 return r}

// ---------- Etappe 4: restliche Fähigkeiten der neuen Spearheads ----------
const segD=(x1,y1,x2,y2,px,py)=>{const dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy;let t=L?((px-x1)*dx+(py-y1)*dy)/L:0;t=Math.max(0,Math.min(1,t));return Math.hypot(x1+t*dx-px,y1+t*dy-py)};
// Feinde, über deren Modelle sich Modelle der Einheit bewegt haben (Gerade von der alten zur neuen Position): Map Einheit → Anzahl Modelle
export function crossed(S,u,P0){const A=abs(u),res=new Map();
 en(S,u.o).forEach(e=>{const E=abs(e);let c=0;A.forEach((m,i)=>{const p=P0[i];if(p&&E.some(q=>segD(p.x,p.y,m.x,m.y,q.x,q.y)<(m.l+q.l)/2*.95))c++});if(c)res.set(e,c)});return res}
export function* crossAb(G,u,P0){const S=G.S;if(!S.U.includes(u)||!u.M||!P0)return;const m=crossed(S,u,P0);if(!m.size)return;const bo=hasAb(u,'ms_boing');
 for(const [e,c] of m){if(!S.U.includes(e))continue;const rs=[];for(let i=0;i<c;i++)rs.push(d6(S));const k=rs.filter(x=>x>=4).length;
  rep(G,bo?'Boing! Boing! Boing!':'Messerscharfe Finnen',row('Würfe (4+, '+e.name+')',rs,4),k?k+' tödlicher Schaden':'Kein Schaden');if(k)hurt(G,e,k)}}
function* nmove(G,t,title,rng){const S=G.S,mv=rng==null?mvOf(S,t):rng,a=yield* destReq(G,t,mv,{text:title+(rng!=null?': bis '+mv+' Zoll':'')});if(!a.stay){applyMove(S,t,a,mv);add(S.T.moved,t.id);G.note(title+': '+t.name+' bewegt sich');return true}return false}
function* relocate(G,o,t,kind,title,text){const px=t.x,py=t.y;t.x=-99;const p=yield* place(G,o,kind,t,title,text,{cancel:true});if(p.cancel){t.x=px;t.y=py;return false}t.x=p.x;t.y=p.y;G.note(title+': '+t.name+' wird neu aufgestellt');return true}
const dmgBy=(S,u)=>[...new Set((S.Ph.shd||[]).filter(s=>String(s).startsWith(u.id+'>')).map(s=>+String(s).split('>')[1]))].map(id=>byId(S,id)).filter(e=>e&&e.x>=0&&S.U.includes(e));
const bombU=(S,o)=>fr(S,o).filter(u=>{if(!hasAb(u,'hh_flug'))return false;const l=S.T.sh[u.id]||[];if(!l.length||new Set(l).size!=1)return false;const t=byId(S,l[0]);return t&&t.x>=0&&S.U.includes(t)});
const untL=(S,o)=>{const ids=new Set((S.Ph.shd||[]).filter(s=>{const a=byId(S,+String(s).split('>')[0]);return a&&a.o==o&&hasAb(a,'hh_flug')}).map(s=>+String(s).split('>')[1]));return en(S,o).filter(e=>ids.has(e.id)&&/Infanterie/.test(e.kw))};
const fdA=(S,o)=>(S.fd||(S.fd=[[],[]]))[o];
const hdr=(G,t,r,ok,th,good,bad)=>rep(G,t,row('Wurf ('+th+'+)',[r],th),ok?good:bad);
function* mordRun(G,o){const S=G.S;bzSub(S,o,1);const k=d3(S),done=[];G.note('Mordlust: bis zu '+k+' Einheit(en) bewegen sich W6 Zoll');
 for(let i=0;i<k;i++){const l=FL(S,o,x=>!done.includes(x)&&!inCombat(S,x)&&!fxL(S,x,'nomove').length);if(!l.length)break;const t=yield* pk(G,o,'Mordlust ('+(i+1)+'/'+k+'): Einheit',[...l,['Keine weitere',null]],x=>x?mx(x):-1e9);if(!t)break;done.push(t);const r=d6(S);yield* nmove(G,t,'Mordlust (W6 = '+r+')',r)}}
const heroT=(S,g)=>en(S,g.o).filter(e=>isHero(e)&&dist(g,e)<=CR);
Object.assign(AB,{
// --- Helfeuerheer ---
 hh_bomb:{n:'Zerstörerisches Bombardement',s:'Fernkampfphase, 1× pro Zug (Armee): Peinigerbombarde hat dasselbe Ziel beschossen: bis zu DKP weitere Feinde (6" um das Ziel); je Ziel 3+ → −3 Kontrollwert (Zug)',ph:3,freq:'turn',army:1,src:(S,o)=>fr(S,o).some(x=>hasAb(x,'hh_flug')),can:(S,o)=>bombU(S,o).length>0,
  *run(G,o){const S=G.S,u=yield* pk(G,o,'Zerstörerisches Bombardement: Einheit',bombU(S,o).map(x=>[lab(x),x]),x=>dk(S,x));if(!u)return;const t=byId(S,S.T.sh[u.id][0]),k=dk(S,u),tg=[t];
   for(let i=0;i<k;i++){const l=en(S,o).filter(x=>!tg.includes(x)&&dist(t,x)<=6);if(!l.length)break;const x=yield* pk(G,o,'Zerstörerisches Bombardement: weiteres Ziel ('+(i+1)+'/'+k+')',[...l.map(y=>[lab(y),y]),['Keine weiteren',null]],y=>y?scE(y):-1e9);if(!x)break;tg.push(x)}
   const rs=[];tg.forEach(x=>{const r=d6(S);rs.push(r);if(r>=3)addFx(S,{k:'ctl',u:x.id,v:-3,exp:'turn'})});rep(G,'Zerstörerisches Bombardement',row('Würfe (3+)',rs,3),tg.map((x,i)=>x.name+(rs[i]>=3?': −3 Kontrollwert':': kein Effekt')).join('<br>'))},ai:()=>true},
 hh_unt:{n:'Unterdrückendes Bombardement',s:'Fernkampfphase, 1× pro Zug: Feindliche Infanterie, der eine Peinigerbombarde Schaden zugewiesen hat: bis zu deinem nächsten Zug 1 Würfel weniger bei Angriffswürfen',ph:3,freq:'turn',army:1,src:(S,o)=>RGI(S,o)=='hh_unt',can:(S,o)=>untL(S,o).length>0,
  *run(G,o){const S=G.S,t=yield* pk(G,o,'Unterdrückendes Bombardement: Ziel',untL(S,o).map(x=>[lab(x),x]),scE);if(!t)return;addFx(S,{k:'cdie',u:t.id,v:1,exp:'own'});G.note('Unterdrückendes Bombardement: '+t.name+' hat bis zu deinem nächsten Zug 1 Würfel weniger beim Angriff')},ai:()=>true},
// --- Sonnenblütige Pirscher / Sternenpanzerheer ---
 sp_stern:{n:'Sternengift',s:'Fernkampfphase: Feind, dem diese Einheit Schaden zugewiesen hat: 2+ → −1 auf seine Verwundungswürfe im Nahkampf (Zug)',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sp_stern'),can:(S,u)=>dmgBy(S,u).length>0,
  *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Sternengift: Ziel',dmgBy(S,u).map(x=>[lab(x),x]),scE);if(!t)return;const r=d6(S);if(r>=2)addFx(S,{k:'wndM',u:t.id,v:-1,exp:'turn'});hdr(G,'Sternengift',r,r>=2,2,t.name+': −1 auf Verwundungswürfe im Nahkampf bis Zugende','Kein Effekt')},ai:()=>true},
 sp_inst:{n:'Instinktiver Anführer',s:'Heldenphase: Sichtbare Einheit ganz innerhalb 12" um den General (nicht im Nahkampf): 3+ → sofortige Normale Bewegung',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='sp_inst',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Instinktiver Anführer: Einheit',FL(S,o,x=>wholly(x,g,12)&&vis(S,g,x)&&!inCombat(S,x)&&!fxL(S,x,'nomove').length),x=>mvOf(S,x));if(!t)return;const r=d6(S);hdr(G,'Instinktiver Anführer',r,r>=3,3,t.name+' darf sich bewegen','Kein Effekt');if(r>=3)yield* nmove(G,t,'Instinktiver Anführer')},ai:()=>true},
 sp_strat:{n:'Uralter Stratege',s:'Gegnerische Bewegungsphase, 1× pro Schlacht: Einheit ganz innerhalb 12" um den General (nicht er selbst) bewegt sich normal',army:1,opp:1,oph:2,when:'start',freq:'battle',src:(S,o)=>ENI(S,o)=='sp_strat',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>x!==g&&wholly(x,g,12)&&!inCombat(S,x))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Uralter Stratege: Einheit',FL(S,o,x=>x!==g&&wholly(x,g,12)&&!inCombat(S,x)&&!fxL(S,x,'nomove').length),x=>mvOf(S,x));if(!t)return;yield* nmove(G,t,'Uralter Stratege')},ai:()=>true},
 sp_sotek:{n:'Soteks Blick',s:'Ende jedes Zugs: Würfel wird auf den Kontrollwert des Generals addiert (automatisch)',army:1,eot:1,src:(S,o)=>ENI(S,o)=='sp_sotek'},
 sp_raub:{n:'Raubtierhafte Kämpfer',s:'Ende jedes Zugs: je feindlicher Einheit im Nahkampf mit einer eigenen Einheit 3+ → 1 tödlicher Schaden (automatisch)',army:1,eot:1,src:(S,o)=>RGI(S,o)=='sp_raub'},
 sp_alt:{n:'Von den Alten gesegnet',s:'Ende eines Zugs, in dem der General zerstört wurde: 2+ → Ersatzeinheit mit 1 Sonnenblut-Modell (>6" von Feinden), 1× pro Schlacht (automatisch)',army:1,eot:1,src:(S,o)=>ENI(S,o)=='sp_alt'},
// --- Blutgeschworene Pilger ---
 bg_mord:{n:'Mordlust',s:'Heldenphase, 1× pro Zug: 1 Blutzehnt ausgeben, bis zu W3 Einheiten bewegen sich je W6 Zoll',ph:1,freq:'turn',army:1,src:(S,o)=>AN(S,o)=='Blutgeschworene Pilger'&&fr(S,o).some(x=>x.dn=='Mordpriester'),can:(S,o)=>bz(S,o)>=1&&fr(S,o).some(x=>!inCombat(S,x)),*run(G,o){yield* mordRun(G,o)},ai:(S,o)=>bz(S,o)>=3},
 bg_mord2:{n:'Mordlust',s:'Gegnerische Heldenphase, 1× pro Zug: 1 Blutzehnt ausgeben, bis zu W3 Einheiten bewegen sich je W6 Zoll',army:1,opp:1,oph:1,when:'start',freq:'turn',src:(S,o)=>AN(S,o)=='Blutgeschworene Pilger'&&fr(S,o).some(x=>x.dn=='Mordpriester'),can:(S,o)=>bz(S,o)>=1&&fr(S,o).some(x=>!inCombat(S,x)),*run(G,o){yield* mordRun(G,o)},ai:(S,o)=>bz(S,o)>=4},
 bg_kopf:{n:'Kopfjäger',s:'Nahkampfphase: Feindlicher Held im Nahkampf mit dem General: General kämpft zuerst, aber nur gegen diesen Helden',ph:5,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='bg_kopf',can:(S,o)=>{const g=genOf(S,o);return !!g&&heroT(S,g).length>0&&!has(S.T.fought,g.id)},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Kopfjäger: Held',heroT(S,g).map(x=>[lab(x),x]),scE);if(!t)return;addFx(S,{k:'only',u:g.id,v:t.id,exp:'ph'});add(S.T.SF,g.id);G.note('Kopfjäger: '+g.name+' kämpft zuerst und greift nur '+t.name+' an')},ai:()=>true},
// --- Herzspaltzirkel ---
 hz_redn:{n:'Flammende Rednerin',s:'Heldenphase: Einheit ganz innerhalb 9" um die Generalin (nicht im Nahkampf): je getötetem Modell 5+ → Modell zurück',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='hz_redn',can:(S,o)=>{const g=genOf(S,o);return !!g&&fr(S,o).some(x=>x.n<x.nmax&&wholly(x,g,9)&&!inCombat(S,x))},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Flammende Rednerin: Einheit',FL(S,o,x=>x.n<x.nmax&&wholly(x,g,9)&&!inCombat(S,x)),x=>x.nmax-x.n);if(!t)return;const rs=[];for(let i=0;i<t.nmax-t.n;i++)rs.push(d6(S));const k=retM(G,t,rs.filter(x=>x>=5).length);rep(G,'Flammende Rednerin',row('Würfe (5+)',rs,5),t.name+': '+k+' Modell(e) zurück')},ai:()=>true},
 hz_nebel:{n:'Schattennebelfläschchen',s:'Nahkampfphase, 1× pro Schlacht: Einheiten ganz innerhalb 12" um die Generalin: −1 auf Trefferwürfe gegen sie (Phase)',ph:5,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='hz_nebel',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),l=fr(S,o).filter(x=>wholly(x,g,12));l.forEach(x=>addFx(S,{k:'hitT',u:x.id,v:-1,exp:'ph'}));G.note('Schattennebelfläschchen: −1 auf Trefferwürfe gegen '+l.map(x=>x.name).join(', ')+' bis Phasenende')},ai:(S,o)=>fr(S,o).some(x=>inCombat(S,x))},
// --- Rudelfletscha-Jäga ---
 rj_zerst:{n:'Rasende Zerstörung',s:'Bewegungsphase: Bewegung bis zum Bewegungswert durch Modelle und Nahkampfreichweiten (nicht im Nahkampf endend); durchquerte feindliche Infanterie: W3 tödlicher Schaden',ph:2,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'rj_zerst'),can:(S,u)=>!has(S.Ph.used,u.id)&&!inCombat(S,u)&&!fxL(S,u,'nomove').length,
  *run(G,u){const S=G.S,mv=mvOf(S,u),P0=abs(u).map(m=>({x:m.x,y:m.y}));let moved=false;u.pass=1;try{const a=yield* destReq(G,u,mv,{text:'Rasende Zerstörung: bis '+mv+' Zoll'});if(!a.stay){const L=applyMove(S,u,a,mv);add(S.T.moved,u.id);add(S.Ph.used,u.id);S.T.mvt[u.id]=mv;S.T.mvd[u.id]=(S.T.mvd[u.id]||0)+L;moved=true}}finally{u.pass=0}
   if(!moved)return;const l=[...crossed(S,u,P0).keys()].filter(e=>/Infanterie/.test(e.kw)&&S.U.includes(e));if(!l.length){G.note('Rasende Zerstörung: keine Infanterie durchquert');return}
   const t=yield* pk(G,u.o,'Rasende Zerstörung: Ziel',l.map(x=>[lab(x),x]),scE);if(t)mort(G,t,d3(S),'Rasende Zerstörung')},ai:()=>false},
 rj_scherbe:{n:'Sonn’nräuber-Scherbe',s:'Gegnerische Bewegungsphase, 1× pro Schlacht: Einheiten ganz innerhalb 6" um den General können bis Zugende nicht von Fernkampfattacken anvisiert werden (außer der Angreifer ist im Nahkampf mit dem Ziel)',army:1,opp:1,oph:2,when:'start',freq:'battle',src:(S,o)=>ENI(S,o)=='rj_scherbe',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o),l=fr(S,o).filter(x=>wholly(x,g,6));l.forEach(x=>addFx(S,{k:'notgt',u:x.id,ex:1,exp:'turn'}));G.note('Sonn’nräuber-Scherbe: '+l.map(x=>x.name).join(', ')+' können nicht anvisiert werden')},ai:()=>true},
 rj_meuchel:{n:'Hinterhältiger Meuchelmörder',s:'Ende jedes Zugs: Feindlicher Held im Nahkampf mit dem General: W3 (2+) tödlicher Schaden in Höhe des Ergebnisses (automatisch)',army:1,eot:1,src:(S,o)=>ENI(S,o)=='rj_meuchel'},
// --- Mondsuchtmob ---
 ms_hand:{n:'Die Hand des Gork',s:'Bewegungsphase, 1× pro Schlacht (Armee): Einheit nicht im Nahkampf vom Feld nehmen und >9" von allen Feinden neu aufstellen',ph:2,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='ms_hand',can:(S,o)=>fr(S,o).some(x=>!inCombat(S,x)),
  *run(G,o){const S=G.S,t=yield* pk(G,o,'Die Hand des Gork: Einheit',FL(S,o,x=>!inCombat(S,x)),x=>mx(x));if(!t)return;if(!(yield* relocate(G,o,t,'rein9','Die Hand des Gork','Neu aufstellen: mehr als 9 Zoll von allen Feinden')))unuse(S,o+':ms_hand','battle')},ai:()=>false},
 ms_tag:{n:'An ’nem andern Tag weiterkämpf’n',s:'Ende jedes Zugs: Hat der General gekämpft, bewegt er sich bis zu 2W6" (nicht im Nahkampf endend)',army:1,eot:1,src:(S,o)=>ENI(S,o)=='ms_tag'},
 ms_nacht:{n:'Nachtschattenpilz',s:'Gegnerische Bewegungsphase, 1× pro Schlacht: Einheit in Nahkampfreichweite des Generals kann in der nächsten Fernkampfphase nicht anvisiert werden',army:1,opp:1,oph:2,when:'start',freq:'battle',src:(S,o)=>ENI(S,o)=='ms_nacht',can:(S,o)=>{const g=genOf(S,o);return !!g},
  *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Nachtschattenpilz: Einheit',FL(S,o,x=>dist(g,x)<=CR),x=>mx(x));if(!t)return;addFx(S,{k:'notgt',u:t.id,exp:'turn'});G.note('Nachtschattenpilz: '+t.name+' kann in der nächsten Fernkampfphase nicht anvisiert werden')},ai:()=>true},
// --- Grundstok-Wegbereiter ---
 gw_knall:{n:'Knallkonfusionsgeschosse',s:'Fernkampfphase, 1× pro Schlacht (Armee): Feind, dem diese Einheit Schaden zugewiesen hat: −W6 Kontrollwert (Zug)',ph:3,freq:'battle',army:1,src:(S,o)=>fr(S,o).some(x=>hasAb(x,'gw_knall')),can:(S,o)=>fr(S,o).some(x=>hasAb(x,'gw_knall')&&dmgBy(S,x).length>0),
  *run(G,o){const S=G.S,l=[];fr(S,o).filter(x=>hasAb(x,'gw_knall')).forEach(x=>dmgBy(S,x).forEach(e=>{if(!l.includes(e))l.push(e)}));const t=yield* pk(G,o,'Knallkonfusionsgeschosse: Ziel',l.map(x=>[lab(x),x]),x=>cvOf(S,x));if(!t)return;const r=d6(S);addFx(S,{k:'ctl',u:t.id,v:-r,exp:'turn'});rep(G,'Knallkonfusionsgeschosse',row('W6',[r]),t.name+': −'+r+' Kontrollwert bis Zugende')},ai:()=>true},
 gw_wendig:{n:'Wendige Himmelsfahrer',s:'Gegnerische Bewegungsphase: Endrinentakler: 3+ → sofortige Normale Bewegung',army:1,opp:1,oph:2,when:'start',freq:'phase',src:(S,o)=>fr(S,o).some(x=>hasAb(x,'gw_wendig')),can:(S,o)=>fr(S,o).some(x=>hasAb(x,'gw_wendig')&&!inCombat(S,x)),
  *run(G,o){const S=G.S;for(const u of fr(S,o).filter(x=>hasAb(x,'gw_wendig')&&!inCombat(S,x)&&!fxL(S,x,'nomove').length)){if(!S.U.includes(u))continue;const r=d6(S);hdr(G,'Wendige Himmelsfahrer',r,r>=3,3,u.name+' bewegt sich','Kein Effekt ('+u.name+')');if(r>=3)yield* nmove(G,u,'Wendige Himmelsfahrer')}},ai:()=>true},
 gw_umpos:{n:'Schnelle Umpositionierung',s:'Bewegungsphase, 1× pro Schlacht (Armee): Einheit mit Fliegen vom Feld nehmen und >6" von Feinden neu aufstellen; sie kann in diesem Zug nicht angreifen',ph:2,freq:'battle',army:1,src:(S,o)=>RGI(S,o)=='gw_umpos',can:(S,o)=>fr(S,o).some(x=>/Fliegen/.test(x.kw)),
  *run(G,o){const S=G.S,t=yield* pk(G,o,'Schnelle Umpositionierung: Einheit',FL(S,o,x=>/Fliegen/.test(x.kw)),x=>mx(x));if(!t)return;if(yield* relocate(G,o,t,'rein','Schnelle Umpositionierung','Neu aufstellen: mehr als 6 Zoll von allen Feinden'))addFx(S,{k:'nochg',u:t.id,exp:'turn'});else unuse(S,o+':gw_umpos','battle')},ai:()=>false},
// --- Strahlende Phalanx ---
 sp_weg:{n:'Wegstein',s:'Bewegungsphase: Die Generalin vom Feld nehmen und >6" von Feinden neu aufstellen',ph:2,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='sp_weg',can:(S,o)=>!!genOf(S,o),
  *run(G,o){const S=G.S,g=genOf(S,o);if(!(yield* relocate(G,o,g,'rein','Wegstein','Neu aufstellen: mehr als 6 Zoll von allen Feinden')))unuse(S,o+':sp_weg','phase')},ai:()=>false},
// --- Wandelklingenzirkel ---
 wk_hexen:{n:'Hexenwerk',s:'Fernkampfphase: Zauber 2W6 (6+): +1 Wucht auf die Zaubergeschosse (Phase)',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'wk_hexen'),
  *run(G,u){const S=G.S,r=yield* spellG(G,u,6);if(r.ok)addFx(S,{k:'rendWS',u:u.id,w:'Zaubergeschosse',v:1,exp:'ph'});rep(G,'Hexenwerk',row('Zauberwurf (6+)',[r.a,r.b],0),r.ok?u.name+': +1 Wucht auf die Zaubergeschosse':'Zauber misslingt')},ai:()=>true},
 wk_erspaeh:{n:'Zukünftiges Erspähen',s:'Heldenphase, weniger als 6 Schicksalswürfel: Zauber 2W6 (7+) → Würfel wird den Schicksalswürfeln hinzugefügt',ph:1,freq:'phase',army:1,src:(S,o)=>ENI(S,o)=='wk_erspaeh',can:(S,o)=>!!genOf(S,o)&&fdA(S,o).length<6,
  *run(G,o){const S=G.S,r=yield* spellG(G,null,7);let t='Zauber misslingt';if(r.ok){const v=d6(S);fdA(S,o).push(v);fdA(S,o).sort((a,b)=>a-b);t='Neuer Schicksalswürfel: '+v}rep(G,'Zukünftiges Erspähen',row('Zauberwurf (7+)',[r.a,r.b],0),t)},ai:()=>true},
});
// Perfekter Streich (Vanari-Klingenmeister): je Attacke 2+ → 1 tödlicher Schaden
export function perfStreich(G,u,e){const S=G.S,n=3*(u.M?inRange(u,e,CR):nm(u)),rs=[];let k=0;for(let i=0;i<n;i++){const r=d6(S);rs.push(r);if(r>=2)k++}
 add(S.Ph.used,u.id);(S.Ph.alc||(S.Ph.alc={}))[e.id]=((S.Ph.alc||{})[e.id]||0)+k;rep(G,'Perfekter Streich',row('Attacken (2+): '+u.name+' → '+e.name,rs,2),k?k+' tödlicher Schaden':'Kein Schaden');if(k)hurt(G,e,k)}

// ---------- Herkunft einer Fähigkeit/Option (für die Anzeige „woher kommt das?“) ----------
import {TAC as TACO,TWD as TWDO} from './data.js';
const strip=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/^(Reaktion|Befehl|Befehle)\s*[:–-]\s*/,'').replace(/\s*\((Kampfeigenschaft|Reaktion|Passiv|Befehl)[^)]*\)\s*$/,'').trim();
export function abOrigin(S,id,o,u){const a=AB[id];if(!a||!S.K||!S.K.army)return '';const A=ARMY[S.K.army[o]];if(!A)return '';
 const eq=x=>x&&strip(x)===strip(a.n);
 const r=A.reg.find(x=>x[3]===id||eq(x[0]));if(r)return 'Regimentsfähigkeit „'+r[0]+'“';
 const e=A.enh.find(x=>x[3]===id||eq(x[0]));if(e){const g=S.U.find(x=>x.o===o&&x.gen);return 'Verbesserung des Generals „'+e[0]+'“'+(g?' – '+g.name:'')}
 if(u&&(u.abs||[]).includes(id))return 'Einheit: '+u.name;
 for(const d of A.units){if((d.abs||[]).includes(id))return 'Einheit: '+d.n;for(const t of d.tx||[])if(eq(t[0]))return /Kampfeigenschaft/.test(t[0])?'Kampfeigenschaft der Armee „'+A.n+'“':'Einheit: '+d.n}
 if(u&&a.unit)return 'Einheit: '+u.name;
 return 'Kampfeigenschaft der Armee „'+A.n+'“'}
// Herkunft anhand des angezeigten Namens (Titel oder Optionstext eines Dialogs)
export function originOf(S,o,name){if(!S||!S.K||!S.K.army||o==null||o<0)return '';const n0=strip(name);if(!n0||n0.length<3)return '';
 // erst der volle Name, dann der Teil vor „:“ bzw. vor einer Klammer (Folgefragen wie „Reinigendes Feuer: Ziel“)
 const tries=[n0,n0.split(':')[0].trim(),n0.replace(/\s*\(.*$/,'').trim(),n0.split(':')[0].replace(/\s*\(.*$/,'').trim()].filter((v,i,a)=>v.length>=3&&a.indexOf(v)==i);
 for(const n of tries){const r=origin1(S,o,n);if(r)return r}
 // Fragen beim Ausspielen der aktuellen Wendungskarte
 if(S.TW&&S.TW.id&&/^(Wendungskarte|Dein Ziel wählen|Ziel \d von \d|Speerspitze wählen|Blutmarkiert|Alarielles Segen|Segen des Großvaters|Rasende Einheit|Gegnerische Einheit markieren|Fesselnde Ranken|Dornenschild|Jadeschauer|Gegner wählen)/.test(n0)){const t=(TWDO[S.K.realm]||[]).find(x=>x&&x[0]==S.TW.id);if(t)return 'Wendungskarte „'+t[1]+'“'}
 return ''}
function origin1(S,o,n){
 const P=S.P&&S.P[o];
 const card=c=>TACO[c-1]&&(strip(TACO[c-1][2])===n?'Taktikkarte „'+TACO[c-1][0]+'“ (als Befehl)':strip(TACO[c-1][0])===n?'Taktikkarte „'+TACO[c-1][0]+'“':'');
 for(const c of (P&&P.hand)||[]){const v=card(c);if(v)return v}
 for(let c=1;c<=TACO.length;c++){const v=card(c);if(v)return v}
 const A=ARMY[S.K.army[o]];
 if(A){const r=A.reg.find(x=>strip(x[0])===n);if(r)return 'Regimentsfähigkeit „'+r[0]+'“';
  const e=A.enh.find(x=>strip(x[0])===n);if(e){const g=S.U.find(x=>x.o===o&&x.gen);return 'Verbesserung des Generals „'+e[0]+'“'+(g?' – '+g.name:'')}
  for(const d of A.units)for(const t of d.tx||[])if(strip(t[0])===n)return /Kampfeigenschaft/.test(t[0])?'Kampfeigenschaft der Armee „'+A.n+'“':'Einheit: '+d.n;
  for(const d of A.units)for(const k of d.abs||[])if(ABT[k]&&strip(ABT[k][0])===n)return 'Einheit: '+d.n}
 const id=Object.keys(AB).find(k=>strip(AB[k].n)===n)||(n.length>=6?Object.keys(AB).find(k=>strip(AB[k].n).startsWith(n)):null);if(id){const u=S.U.find(x=>x.o===o&&(x.abs||[]).includes(id));return abOrigin(S,id,o,u)}
 const ter=(S.ter||[]).find(t=>(t.rel&&n.startsWith(t.rel))||(t.nm&&n.startsWith(t.nm)));if(ter)return ter.rel?'Reliquie „'+ter.rel+'“':'Gelände „'+ter.nm+'“';
 for(const g of TWDO||[])for(const t of g||[])if(t&&strip(t[1])===n)return 'Wendungskarte „'+t[1]+'“';
 return ''}
export const srcTag=s=>s?'<span style="display:block;color:#e8c46a;font-weight:600;margin-bottom:2px">⟡ '+s+'</span>':'';

// ---------- Hilfen und neue Armeen (Etappe 5: abil3.js) ----------
export {fr,en,lab,yn,rep,row,mort,pickF,pickE,genOf,nmove,roll2,claims,relocate,heroT,armyN,segD,pk,hdr,FL,vis,scE};
import {install3,eot3} from './abil3.js';
install3();
