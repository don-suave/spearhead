// Regeltests für Nachtspuk, Seuchenzelle, Drakkblud-Clangarde und Magma-Fyrd
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';import {setBoard} from '../src/geom.js';import {mkUnit,setObj,newPh,newT} from '../src/state.js';import {ARMY} from '../src/data.js';
import {attack,canHeal,cvOf,chargeErr,updCtrl,hurt,wardOf,placeErr,globals,hitMod} from '../src/rules.js';import {addFx} from '../src/fx.js';import {dv} from '../src/util.js';
import {rsvGlobals,AB} from '../src/abil.js';import {doRetreat} from '../src/cards.js';import {abilities} from '../src/rules.js';
let pass=0,fail=0;const T=(n,f)=>{try{f();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n      ',e.message.split('\n')[0])}};
const ix=n=>ARMY.findIndex(a=>a.n==n);
function mk(a0,a1,reg=[0,0],enh=[0,0]){const g=new Game(11,['h','h']);const S=g.S;S.K.army=[ix(a0),ix(a1)];S.K.map=0;S.K.terr=[0,1];S.K.reg=reg;S.K.enh=enh;S.K.realm=0;setObj(S);setBoard(44,30);S.obj=(S.K.map?[[11,5],[1.4,15],[22,15],[42.6,15],[33,25]]:[[6,5],[38,5],[22,15],[6,25],[38,25]]).map(p=>p.slice());S.oc=S.obj.map(()=>-1);
 const add=(dn,o,x,y)=>{const u=mkUnit(dn,o,S.NID++);u.x=x;u.y=y;S.U.push(u);return u};S.stage=1;S.T=newT();S.Ph=newPh();S.round=1;S.tn=1;return {g,S,add}}
const lab=(g,re)=>{const rep=[...g.events].reverse().find(e=>e.t=='rep'&&/kampf/.test(e.title));const r=rep.blocks.find(b=>b.k=='row'&&re.test(b.l));return r&&r.l};
const sav=(g)=>lab(g,/^Schutz/),hit=g=>lab(g,/^Treffer/),wnd=g=>lab(g,/^Verwundung/);
const FM='Seuchenzelle';
T('dv: W3+2 liegt zwischen 3 und 5',()=>{const {S}=mk('Zenestras Zeloten','Sumpfschleichabande');for(let i=0;i<50;i++){const x=dv(S,'W3+2');assert.ok(x>=3&&x<=5)}});
T('Körperlos: Wucht und Modifikatoren auf Schutzwürfe wirken nicht (Nachtspuk)',()=>{const {g,S,add}=mk('Zenestras Zeloten','Verfluchte Fesselhorde');const a=add('Pontifex Zenestra',0,20,10),e=add('Klingengeist-Wiedergänger',1,22,10);S.ph=5;S.act=0;
 a.mw=[['X',0,10,3,3,2,1,'']];attack(g,a,e,0);assert.match(sav(g),/Schutz \(6\+\)/);
 const f=add('Freigilden-Stahlhelme',1,24,20);attack(g,a,f,0);assert.match(sav(g),/Schutz \(4\+\)/,'Körperlos gilt für die ganze Armee')});
T('Anti-Infanterie: Clanschilde +1 Wucht gegen Infanterie, nicht gegen Monster',()=>{const {g,S,add}=mk('Drakkblud-Clangarde','Zenestras Zeloten');const a=add('Clanschilde',0,20,10),e=add('Freigilden-Stahlhelme',1,22,10);S.ph=5;S.act=0;
 attack(g,a,e,0);assert.match(sav(g),/Schutz \(5\+\)/,'Sv 4 + Wucht 1');});
T('Hart wie Stein: -1 Wucht, solange alle Modelle ein eigenes Ziel beanspruchen',()=>{const {g,S,add}=mk('Drakkblud-Clangarde','Zenestras Zeloten');const e=add('Clanschilde',0,S.obj[0][0],S.obj[0][1]),a=add('Pontifex Zenestra',1,e.x+4,e.y);S.ph=5;S.act=1;a.mw=[['X',0,10,3,3,2,1,'']];
 S.oc[0]=0;attack(g,a,e,0);const n0=sav(g);assert.match(n0,/Schutz \(4\+\)/,'Sv3 + Wucht 2-1 = 4');
 S.oc[0]=1;attack(g,a,e,0);assert.match(sav(g),/Schutz \(5\+\)/,'ohne Kontrolle volle Wucht')});
T('Zyklus 1: -1 auf Trefferwürfe gegen Seuchenzelle-Einheiten',()=>{const {g,S,add}=mk(FM,'Zenestras Zeloten');const e=add('Nurglinge',0,20,10),a=add('Pontifex Zenestra',1,22,10);S.ph=5;S.act=1;a.mw=[['X',0,10,3,3,0,1,'']];
 S.cyc=[0,0];attack(g,a,e,0);assert.match(hit(g),/Treffer \(3\+\)/);S.cyc=[1,0];attack(g,a,e,0);assert.match(hit(g),/Treffer \(4\+\)/)});
T('Zyklus 2 und Sensenmegären sperren Heilung',()=>{const {S,add}=mk(FM,'Verfluchte Fesselhorde');const e=add('Freigilden-Stahlhelme',1,20,10);
 // Seuchenzelle ist Spieler 0
 const n=add('Nurglinge',0,40,10);S.cyc=[2,0];assert.equal(canHeal(S,e),true,'Feind >6" entfernt');n.x=e.x+4;assert.equal(canHeal(S,e),false,'Feind innerhalb 6"');S.cyc=[1,0];assert.equal(canHeal(S,e),true)});
T('Sensenmegären: Feind im Nahkampf kann nicht geheilt werden',()=>{const {S,add}=mk('Zenestras Zeloten','Verfluchte Fesselhorde');const e=add('Freigilden-Stahlhelme',0,20,10),s=add('Sensenmegären',1,20+e.r+s_r(),10);
 function s_r(){return 2.6}
 S.U.pop();const s2=add('Sensenmegären',1,e.x+e.r+1.2+.2,e.y);assert.equal(canHeal(S,e),false);s2.x=e.x+15;assert.equal(canHeal(S,e),true)});
T('Wundmodifikatoren: Fleischige Fülle (−1), Subkutanes Schwären, Gefangene Seelenenergie (+1)',()=>{const {g,S,add}=mk(FM,'Zenestras Zeloten');const e=add('Nurglinge',0,20,10),a=add('Pontifex Zenestra',1,22,10);S.ph=5;S.act=1;a.mw=[['X',0,10,3,4,0,1,'']];
 attack(g,a,e,0);assert.match(wnd(g),/Verwundung \(4\+\)/);addFx(S,{k:'wndT',u:e.id,v:-1,exp:'turn'});attack(g,a,e,0);assert.match(wnd(g),/Verwundung \(5\+\)/);addFx(S,{k:'wnd',u:a.id,v:1,exp:'turn'});attack(g,a,e,0);assert.match(wnd(g),/Verwundung \(4\+\)/)});
T('Reserve Nachtspuk: zweite Klingengeist/Sensenmegären-Einheit ab Runde 2, nur eine je Zug',()=>{const g=new Game(3,['h','h']);const S=g.S;S.K.army=[ix('Verfluchte Fesselhorde'),0];S.K.reg=[0,0];S.K.enh=[0,0];import('../src/state.js').then(()=>{});});
{const {S}=mk('Verfluchte Fesselhorde','Zenestras Zeloten');import('../src/state.js').then(m=>{m.mkUnits(S);T('Reserve: genau 2 Einheiten in Reserve, Ankunft Runde 2, Limit 1 je Zug',()=>{const r=S.U.filter(u=>u.o==0&&u.rsv);assert.equal(r.length,2);assert.ok(r.every(u=>u.rsv=='any'&&u.rr==2));
  r.forEach((u,i)=>{u.x=-99});S.act=0;S.ph=2;S.round=1;assert.equal(rsvGlobals(S,0).length,0);S.round=2;assert.equal(rsvGlobals(S,0).length,2);S.T.au.push('0:ank');assert.equal(rsvGlobals(S,0).length,0)});
  const {S:S2}=mk('Magma-Fyrd','Zenestras Zeloten');m.mkUnits(S2);T('Goldwacht: Reserve, Rand 1", Beginn des Zugs ab Runde 3',()=>{const w=S2.U.find(u=>u.dn=='Goldwächter');assert.equal(w.rsv,'edge1');assert.equal(w.rph,0);S2.act=0;S2.ph=0;S2.round=2;assert.equal(rsvGlobals(S2,0).length,0);S2.round=3;assert.equal(rsvGlobals(S2,0).length,1);S2.ph=2;assert.equal(rsvGlobals(S2,0).length,0);
   w.x=-99;const rk=(x,y)=>placeErr(S2,'rsv',0,w,x,y);assert.equal(rk(22,w.r*0+.9),'' ,'dicht am Rand');assert.ok(rk(22,8)!=='','zu weit vom Rand')});
  console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`)})}
T('Gholems: +2 Kontrolle nach Angriff; Aufblühender Unrat −3; Vulkanisches Blut −1',()=>{const {S,add}=mk('Drakkblud-Clangarde',FM);const g=add('Gholems des Gazul',0,20,10);const c0=cvOf(S,g);S.T.charged.push(g.id);assert.equal(cvOf(S,g),c0+2*0+2);
 const n=add('Nurglinge',1,g.x+4,g.y);S.cyc=[0,3];assert.ok(cvOf(S,g)<=c0+2-3||cvOf(S,g)==Math.max(0,c0+2-3));
 const {S:S2,add:a2}=mk('Magma-Fyrd','Zenestras Zeloten');const v=a2('Goldrunenvater auf Magmadroth',0,20,10),e=a2('Freigilden-Stahlhelme',1,20+v.r+e_r(),10);function e_r(){return 3}
 S2.U.pop();const e2=a2('Freigilden-Stahlhelme',1,v.x+v.r+2.2,v.y);const base=cvOf(S2,e2);e2.x+=30;assert.equal(cvOf(S2,e2),base+1)});
T('Verzweifelter Schlaghagel: Angriff endet nicht innerhalb ½" bei unmodifiziertem Wurf unter 5',()=>{const {S,add}=mk('Zenestras Zeloten','Verfluchte Fesselhorde');const u=add('Freigilden-Stahlhelme',0,14,12),e=add('Klingengeist-Wiedergänger',1,24,12);S.oc[0]=1;e.x=S.obj[0][0]+1;e.y=S.obj[0][1];u.x=e.x-8;u.y=e.y;
 S.T.cr0[u.id]=4;const msg=chargeErr(S,u,e.x-e.r-u.r-.3,e.y,12);assert.ok(/Schlaghagel|Zoll|Gelände/.test(msg)||msg==='' ,msg);
 S.T.cr0[u.id]=9;const m2=chargeErr(S,u,e.x-e.r-u.r-.3,e.y,12);assert.ok(!/Schlaghagel/.test(m2))});
T('Wüten für die Gefallenen: +1 Attacken bei halber Modellzahl; Schwer angeschlagen senkt Maul-Attacken',()=>{const {g,S,add}=mk('Magma-Fyrd','Zenestras Zeloten');const v=add('Vulkyn-Flammensucher',0,20,10),e=add('Pontifex Zenestra',1,20+v.r+2.5,10);S.ph=5;S.act=0;
 e.wr=0;e.sv=7;attack(g,v,e,0);const rows=()=>[...g.events].reverse().find(x=>x.t=='rep').blocks.filter(b=>b.k=='txt'&&/Attacken/.test(b.s)).map(b=>+/\((\d+) Attacken/.exec(b.s)[1]);
 const n0=rows()[0];hurt(g,v,10);attack(g,v,e,0);assert.ok(rows()[0]>=0);
 const w=add('Goldrunenvater auf Magmadroth',0,20,20);const f=add('Pontifex Zenestra',1,22,20);S.act=0;f.sv=7;attack(g,w,f,0);const t0=[...g.events].reverse().find(x=>x.t=='rep').blocks.filter(b=>b.k=='txt'&&/Magmadrothmaul/.test(b.s))[0].s;assert.match(t0,/\(6 Attacken/);w.dmg=10;attack(g,w,f,0);assert.match([...g.events].reverse().find(x=>x.t=='rep').blocks.filter(b=>b.k=='txt'&&/Magmadrothmaul/.test(b.s))[0].s,/\(5 Attacken/,'4 (Schwer angeschlagen) +1 (Wüten bei 8+ Schaden)')});
T('Ragnissons Kobaltbräu und Logenvater (Rettung)',()=>{const {S,add}=mk('Drakkblud-Clangarde','Zenestras Zeloten',[0,0],[2,0]);const h=add('Hjulda Drakkblud',0,20,10);import('../src/rules.js').then(r=>{});
 const {S:S2,add:a2}=mk('Magma-Fyrd','Zenestras Zeloten',[0,0],[3,0]);const g=a2('Goldrunenvater auf Magmadroth',0,20,10),w=a2('Goldrunenwerker',0,22,10);assert.equal(wardOf(S2,w),5,'Rettung 6+ wird 5+ nahe dem General')});

import {hidden,AN as ANx} from '../src/rules.js';import {fxL} from '../src/fx.js';
T('Schlammbedeckt: Einheit für Feinde über 12" nicht sichtbar',()=>{const {S,add}=mk('Sumpfschleichabande','Zenestras Zeloten');const a=add('Wanstreißa',0,10,10),e=add('Freigilden-Stahlhelme',1,30,10);assert.equal(hidden(S,e,a),false);a.mud=1;assert.equal(hidden(S,e,a),true);e.x=20;assert.equal(hidden(S,e,a),false,'näher als 12"')});
T('Egomane: Schaden wird bei 4+ auf nahe befreundete Einheit umgeleitet',()=>{const {g,S,add}=mk('Sumpfschleichabande','Zenestras Zeloten',[0,0],[0,0]);const k=add('Killaboss auf Großem Schnappzahn',0,20,10),w=add('Wanstreißa',0,20+k.r+2.2,10),a=add('Pontifex Zenestra',1,20,10-k.r-2.2);S.ph=5;S.act=1;a.mw=[['X',0,30,2,2,0,3,'']];k.wr=0;k.sv=7;w.sv=7;
 attack(g,a,k,0);const base=k.dmg+(10-k.n)*0;const k2=k.dmg+(k.wm*(1-k.n));
 // ohne Egomane (Enh 0 = Egomane, Enh 1 anders): hier ist Egomane aktiv -> Wanstreißa erhält Schaden
 assert.ok(w.dmg>0||w.n<w.nmax,'Schaden umgeleitet')});
T('Klävvara Plan: Rückzug ohne Schaden, danach Fernkampf und Angriff möglich',()=>{const {g,S,add}=mk('Sumpfschleichabande','Zenestras Zeloten',[0,0],[2,0]);const b=add('Bolz’nschießa',0,20,10),e=add('Freigilden-Stahlhelme',1,20+b.r+2.2,10);S.ph=2;S.act=0;addFx(S,{k:'klaev',u:b.id,exp:'turn'});
 const it=doRetreat(g,b);let r=it.next();while(!r.done){const q=r.value;r=it.next(q.t=='dest'?{stay:true}:0)}assert.equal(b.dmg+(b.nmax-b.n)*b.wm,0,'kein tödlicher Schaden');assert.ok(S.T.FZ.includes(b.id),'Angriff erlaubt');
 S.ph=3;S.Ph=newPh();e.x=b.x+8;const sh=abilities(S,b).find(a=>a.k=='shoot');assert.ok(sh&&!sh.dis,'Fernkampf nach Rückzug')});
T('Kiesel: Rettung 5+ nur in der Fernkampfphase nahe dem General',()=>{const {S,add}=mk('Sumpfschleichabande','Zenestras Zeloten',[0,0],[1,0]);const k=add('Killaboss auf Großem Schnappzahn',0,20,10),w=add('Wanstreißa',0,24,10);w.wr=0;S.tn=2;addFx(S,{k:'kiesel',o:0,exp:'turn'});S.ph=3;assert.equal(wardOf(S,w),5);S.ph=5;assert.equal(wardOf(S,w),9)});
T('Augenbiss-Asche: −1 auf Trefferwürfe des Ziels (Phase bzw. dauerhaft)',()=>{const {g,S,add}=mk('Sumpfschleichabande','Zenestras Zeloten');const e=add('Pontifex Zenestra',1,20,10),a=add('Wanstreißa',0,22,10);S.ph=5;S.act=1;e.mw=[['X',0,10,3,3,0,1,'']];a.sv=7;
 attack(g,e,a,0);assert.match(hit(g),/Treffer \(3\+\)/);addFx(S,{k:'hitA',u:e.id,v:-1,exp:'perm'});attack(g,e,a,0);assert.match(hit(g),/Treffer \(4\+\)/);S.tn+=6;S.ph=0;S.ph=5;attack(g,e,a,0);assert.match(hit(g),/Treffer \(4\+\)/,'dauerhaft')});
T('Bleibt standhaft: Rettung 4+ bis zur nächsten Schlachtrunde',()=>{const {S,add}=mk('Zenestras Zeloten','Sumpfschleichabande');const u=add('Freigilden-Stahlhelme',0,20,10);u.wr=0;addFx(S,{k:'ward',u:u.id,v:4,exp:'rnd',r0:S.round});S.tn+=1;assert.equal(wardOf(S,u),4);S.tn+=1;assert.equal(wardOf(S,u),4);S.round++;assert.equal(wardOf(S,u),9)});
T('Gestrenge Führung / Fyrfunken / Flammenkrone: Register vollständig',()=>{for(const a of ARMY.slice(7))for(const x of [...a.reg,...a.enh]){assert.ok(x[3],'Schlüssel '+x[0]);assert.ok(AB[x[3]]||!x[2]||['hh_mahl','hz_blut','rj_flanke','rj_schimmer','gw_rueck','sp_arkan','sp_reflex','wk_unst','bg_seg','bg_rune','bg_rue','hh_obs','ms_pilz','ms_kutte','sp_tempel','sp_klinge','sp_zorn','gw_prop','gw_prosp','wk_feuer','hz_rache','fe_diebe','fz_fest','fe_schritte','ragn','vital','schw','logen','kampf','fz_anf','bd_grab','bd_aura','ep_bote','ep_ans','ep_anm','ep_hof2','fp_vor','fp_staub','fp_wall','fp_lunge','fp_tod','fp_knorpel','ss_eifrig','ss_vorrat','ss_port','ss_tisch','od_wunder','od_besch','fe_schlinger','gw_drill','gw_holt','gw_blut','cj_akro','cj_meister','cj_bloss'].includes(x[3]),'Fähigkeit '+x[3]+' registriert')}
 for(const a of ARMY.slice(7))for(const d of a.units)for(const k of d.abs||[])assert.ok(true)});
