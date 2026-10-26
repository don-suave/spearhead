// Fähigkeiten der dritten Armeenwelle (Hooks siehe hooks.js).
import {AB,fr,lab,hdr,pk,FL,vis,genOf,nmove,pickF,rep,row} from './abil.js';
import {HK} from './hooks.js';
import {ARMY} from './data.js';
import {d6} from './util.js';
import {addFx,fxL} from './fx.js';
import {wholly} from './models.js';
import {inCombat,isHero,hasAb,mvOf,ENI,RGI,mx,wnd} from './rules.js';
import {destReq} from './cards.js';
import {applyMove} from './rules.js';
import {add,has} from './util.js';

const trOf=(S,o,k)=>{try{return ARMY[S.K.army[o]].tr.includes(k)}catch(e){return false}};
const kw=(u,w)=>(u.kw||'').includes(w);
const gOK=(S,o)=>!!genOf(S,o);

export function install3(){
Object.assign(HK,{
 kv_finte:{nort:(S,u)=>kw(u,'Kavallerie')?1:0},
 kv_schein:{chgRtr:(S,u)=>S.T.kvs&&S.act==u.o?1:0},
 kv_arch:{ward:(S,u)=>u.gen?5:0},
 kv_klinge:{wpn:(S,u,w)=>u.gen&&w[0]=='Klinge des Befehlshabers'&&!String(w[7]||'').includes('D')?w.map((v,i)=>i==7?(v||'')+'D':v):w},
});
Object.assign(AB,{
 kv_arch:{n:'Mächtiger Archaeossianer',s:'Passiv: General hat Rettung 5+',army:1,src:(S,o)=>ENI(S,o)=='kv_arch'},
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
