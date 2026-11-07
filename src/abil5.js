// Fähigkeiten der fünften Armeenwelle: Ogor-Schlundstämme – Schrotthorde (sh_).
import {AB,en,fr,lab,hdr,pk,FL,genOf,rep,row,mort,scE} from './abil.js';
import {HK} from './hooks.js';
import {byId,hasAb,ENI,RGI,mx,dist,foes,mkN} from './rules.js';
import {CR} from './geom.js';
import {wholly} from './models.js';
import {d6,d3} from './util.js';
import {ARMY} from './data.js';
import {addFx,fxL} from './fx.js';

const GNO='Gnoblars';
const canHealX=(S,u)=>{try{return !fxL(S,u,'sense').length}catch(e){return true}};
const kw=(u,w)=>(u.kw||'').includes(w);

Object.assign(HK,{
 // Nützlich bleiben: Rettung 5+, solange mindestens ein Gnoblar- oder Frostsäbelzahn-Marker auf dem Schlachtfeld ist
 sh_nutz:{ward:(S,u)=>u.x>=0&&mkN(u)>0?5:0}
});

// Schrottregen: Ziele, aus denen Fernkampfattacken der Einheit in dieser Phase mindestens 1 Modell getötet haben
const killedT=(S,u)=>(S.Ph.shk||[]).filter(k=>k.startsWith(u.id+'>')).map(k=>byId(S,+k.split('>')[1])).filter((x,i,a)=>x&&x.x>=0&&S.U.includes(x)&&a.indexOf(x)==i);
const gnoNear=(S,o)=>{const g=genOf(S,o);return g&&g.x>=0?fr(S,o).filter(x=>x.dn==GNO&&x.x>=0&&dist(g,x)<=CR):[]};

export function install5(){
 Object.assign(AB,{
  // ===== Schrotthorde =====
  sh_spaet:{n:'Besser spät als nie',s:'Kampfeigenschaft: Die Eisenwänste-Einheit mit 4 Modellen wird nicht aufgestellt; ab der dritten Schlachtrunde kann sie in deiner Bewegungsphase „Dann legen wir mal los“ einsetzen: ganz in eigenem Territorium, ganz innerhalb 6" um eine Schlachtfeldkante, nicht im Nahkampf',army:1,src:(S,o)=>{try{return ARMY[S.K.army[o]].tr.includes('sh_spaet')}catch(e){return false}}},
  sh_leben:{n:'Das Leben ist hart',s:'Heldenphase: Befreundete Gnoblars in Nahkampfreichweite des Generals; W3, bei 2+ heilt der General (Wurfergebnis) und 1 Gnoblar-Modell wird getötet',ph:1,freq:'phase',army:1,src:(S,o)=>RGI(S,o)=='sh_leben',can:(S,o)=>gnoNear(S,o).length>0,
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Das Leben ist hart: Gnoblars',gnoNear(S,o).map(x=>[lab(x),x]),x=>x.n);if(!t)return;const r=d3(S);hdr(G,'Das Leben ist hart',r,r>=2,2,g.name+' heilt '+r+', 1 Modell von '+t.name+' wird getötet','Kein Effekt');
    if(r<2)return;if(canHealX(S,g)){const h=Math.min(r,g.dmg);g.dmg-=h}mort(G,t,1,'Das Leben ist hart')},ai:(S,o)=>{const g=genOf(S,o);return !!g&&g.dmg>=2}},
  sh_art:{n:'Rasende Artillerie',s:'Passiv: Bei unmodifiziertem Angriffswurf von 6+ für die Schrottschleuder +3 Attacken mit ihren Begleiter-Waffen bis Zugende',army:1,src:(S,o)=>RGI(S,o)=='sh_art'},
  sh_wild:{n:'Wilde Instinkte',s:'Reaktion auf Kämpfen-Fähigkeit des Generals: Befreundete Einheit in Nahkampfreichweite des Generals, die noch nicht gekämpft hat, kämpft unmittelbar danach (wird im Kampfablauf angeboten)',army:1,src:(S,o)=>ENI(S,o)=='sh_wild'},
  sh_koerper:{n:'Massiger Körper',s:'Passiv: +2 Ausdauer für den General',army:1,src:(S,o)=>ENI(S,o)=='sh_koerper'},
  sh_falle:{n:'Fiese Falle',s:'Bewegungsphase, 1× pro Schlacht: Feind innerhalb 12" um den General erhält den Falle-Marker; bei jeder Bewegung-/Angriff-Fähigkeit des Ziels W6: 4+ → ohne Effekt, Marker entfernt',ph:2,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='sh_falle',can:(S,o)=>{const g=genOf(S,o);return !!g&&g.x>=0&&en(S,o).some(e=>!e.trap&&dist(g,e)<=12)},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Fiese Falle: Ziel',en(S,o).filter(e=>!e.trap&&dist(g,e)<=12).map(x=>[lab(x),x]),scE);if(!t)return;t.trap=1;G.note('Fiese Falle: '+t.name+' erhält den Falle-Marker')},ai:()=>true},
  sh_jaeger:{n:'Erfahrener Jäger',s:'Heldenphase, 1× pro Schlacht: Feind innerhalb 12" um den General; +1 Wucht für Nahkampfattacken des Generals gegen ihn (Zug)',ph:1,freq:'battle',army:1,src:(S,o)=>ENI(S,o)=='sh_jaeger',can:(S,o)=>{const g=genOf(S,o);return !!g&&g.x>=0&&en(S,o).some(e=>dist(g,e)<=12)},
   *run(G,o){const S=G.S,g=genOf(S,o),t=yield* pk(G,o,'Erfahrener Jäger: Ziel',en(S,o).filter(e=>dist(g,e)<=12).map(x=>[lab(x),x]),e=>-dist(g,e));if(!t)return;addFx(S,{k:'rendX',u:g.id,w:t.id,v:1,exp:'turn'});G.note('Erfahrener Jäger: Nahkampfattacken von '+g.name+' gegen '+t.name+' haben +1 Wucht bis Zugende')},ai:(S,o)=>{const g=genOf(S,o);return !!g&&en(S,o).some(e=>dist(g,e)<=6)}},
  sh_nutz:{n:'Nützlich bleiben',s:'Passiv: Rettung 5+, solange ein Gnoblar- oder Frostsäbelzahn-Marker existiert; jeder erfolgreiche Rettungswurf entfernt 1 Marker; ohne Frostsäbelzahn-Marker keine Reißzähne',unit:1,src:(S,u)=>hasAb(u,'sh_nutz')},
  sh_nicht:{n:'Nicht nachlassen',s:'Heldenphase: Befreundete Infanterie ganz innerhalb 12": W6, 3+ → Wurfergebnis auf den Kontrollwert bis zu deinem nächsten Zug',ph:1,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sh_nicht'),can:(S,u)=>u.x>=0&&fr(S,u.o).some(x=>x!==u&&kw(x,'Infanterie')&&x.x>=0&&wholly(x,u,12)),
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Nicht nachlassen: Infanterie',FL(S,u.o,x=>x!==u&&kw(x,'Infanterie')&&x.x>=0&&wholly(x,u,12)),x=>mx(x)*(x.n||1));if(!t)return;const r=d6(S);hdr(G,'Nicht nachlassen',r,r>=3,3,t.name+': +'+r+' Kontrollwert bis zu deinem nächsten Zug','Kein Effekt');if(r>=3)addFx(S,{k:'ctl',u:t.id,v:r,exp:'own'})},ai:()=>true},
  sh_eisen:{n:'Eiserner Schneid',s:'Passiv: Negative Modifikatoren auf den Kontrollwert werden ignoriert',unit:1,src:(S,u)=>hasAb(u,'sh_eisen')},
  sh_frei:{n:'Kein Mangel an Freiwilligen',s:'Ende eines beliebigen Zuges: W3 Modelle kehren in die Einheit zurück (automatisch)',unit:1,src:(S,u)=>hasAb(u,'sh_frei')},
  sh_regen:{n:'Schrottregen',s:'Fernkampfphase: Feind, aus dem diese Einheit in dieser Phase per Fernkampf mindestens 1 Modell getötet hat: −1 auf seine Trefferwürfe bis Zugende',ph:3,freq:'phase',unit:1,src:(S,u)=>hasAb(u,'sh_regen'),can:(S,u)=>u.x>=0&&killedT(S,u).length>0,
   *run(G,u){const S=G.S,t=yield* pk(G,u.o,'Schrottregen: Ziel',killedT(S,u).map(x=>[lab(x),x]),scE);if(!t)return;addFx(S,{k:'hit',u:t.id,v:-1,exp:'turn'});G.note('Schrottregen: '+t.name+' hat −1 auf Trefferwürfe bis Zugende')},ai:()=>true}
 });
}
