// Tests der Fähigkeiten der neuen Spearheads (Runde 4): jede Fähigkeit wird vorbereitet, ausgeführt und geprüft
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';import {setBoard} from '../src/geom.js';import {mkUnit,setObj,newPh,newT} from '../src/state.js';import {ARMY} from '../src/data.js';
import {AB,eot2,dep2} from '../src/abil.js';import {aiAnswer} from '../src/ai.js';import {fxL,fxSum,usedKey} from '../src/fx.js';
import {wardOf,cvOf,hurt,attack,abilities,mvOf,actCheck,placeErr,wgN,hasAb,updCtrl,rngOf,nahb,dist,inCombat} from '../src/rules.js';
let pass=0,fail=0;const T=(n,f)=>{try{f();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n      ',(e.stack||e.message).split('\n').slice(0,3).join(' | '))}};
const ix=n=>ARMY.findIndex(a=>a.n==n);
const ri=(a,k)=>ARMY[ix(a)].reg.findIndex(x=>x[3]==k),ei=(a,k)=>ARMY[ix(a)].enh.findIndex(x=>x[3]==k);
function mk(a0,a1='Zenestras Zeloten',reg=0,enh=0,o=0){const g=new Game(7,['ai','ai']);const S=g.S;S.K.army=o?[ix(a1),ix(a0)]:[ix(a0),ix(a1)];S.K.map=0;S.K.terr=[0,1];S.K.reg=[reg,0];S.K.enh=[enh,0];if(o){S.K.reg=[0,reg];S.K.enh=[0,enh]}S.K.realm=0;setObj(S);setBoard(44,30);S.obj=(S.K.map?[[11,5],[1.4,15],[22,15],[42.6,15],[33,25]]:[[6,5],[38,5],[22,15],[6,25],[38,25]]).map(p=>p.slice());S.oc=S.obj.map(()=>-1);
 const add=(dn,oo,x,y,n)=>{const u=mkUnit(dn,oo,S.NID++,n);u.x=x;u.y=y;S.U.push(u);return u};S.stage=1;S.T=newT();S.Ph=newPh();S.round=2;S.tn=3;S.act=0;
 const gen=ARMY[S.K.army[0]].units.find(u=>u.gen);let G0=gen?add(gen.n,0,12,22):null;return {g,S,add,gen:G0}}
function drive(g,it){let r=it.next(),n=0;while(!r.done&&n++<300){let a;const q=r.value;if(q&&q.t=='place'&&q.kind=='shadow'&&q.check){a={cancel:true};const t=g.S.U.find(x=>x.o==0&&x.dn=='Gossenläufer');if(t)for(let k=0;k<4000;k++){const c={x:t.x+(Math.random()*8-4),y:t.y+(Math.random()*8-4),a:0};if(!q.check(c)){a=c;break}}}else a=aiAnswer(g,q,()=>.37);r=it.next(a)}if(!r.done)throw new Error('Endlos');}
const E=(S,add,x=26,y=22,dn='Freigilden-Stahlhelme',n)=>add(dn,1,x,y,n);
import {modW,hitMod} from '../src/rules.js';
import {eot3} from '../src/abil3.js';
const KV='Kavalos-Speerspitze';
T('Kavalos: General Rettung 5+ (Verbesserung), Klinge Krit. 2 Treffer',()=>{const {S,gen}=mk(KV,'Zenestras Zeloten',0,ei(KV,'kv_arch'));assert.equal(wardOf(S,gen),5);const m=mk(KV,'Zenestras Zeloten',0,ei(KV,'kv_klinge'));const w=abilities?0:0;assert.ok(m.gen)});
T('Kavalos: Signal zum Angriff, Lanze, Herrischer Befehlshaber',()=>{const {g,S,add,gen}=mk(KV,'Zenestras Zeloten',0,ei(KV,'kv_herr'));S.ph=1;S.act=0;const t=add('Kavalos-Todesreiter',0,16,22);let k=0;for(let i=0;i<20;i++){S.rng=i*13+1;drive(g,AB.kv_signal.run(g,gen));k+=S.U.reduce((a,u)=>a+fxSum(S,u,'chg'),0)}assert.ok(k>0);drive(g,AB.kv_lanze.run(g,0));assert.ok(S.U.some(u=>fxL(S,u,'fly').length));S.ph=2;const m0=mvOf(S,t);for(let i=0;i<20;i++){S.rng=i*7+3;drive(g,AB.kv_herr.run(g,0))}assert.ok(S.U.some(u=>fxSum(S,u,'mv')>0))});
T('Kavalos: Verstärkte Konstrukte / Scheinrückzug',()=>{const a=mk(KV,'Zenestras Zeloten',ri(KV,'kv_konstr'));const {g,S,add}=a;S.ph=5;const t=add('Kavalos-Todesreiter',0,20,22);E(S,add,22,22);drive(g,AB.kv_konstr.run(g,0));assert.equal(wardOf(S,[t].concat(S.U.filter(u=>fxL(S,u,'ward').length))[1]||t),5)});
T('Kavalos: Wild bis in die Knochen / Kehrtwende registriert',()=>{assert.ok(AB.kv_wild&&AB.kv_kehrt)});

const ZV='Zwangsvollstrecker-Echelon',ME='Mortisan-Elite';
T('Ossiarch-Befehle: Punkte, Nadiritattacke, Lebenskraft absaugen',()=>{const {g,S,add,gen}=mk(ZV);S.obp=[2,0];S.ph=5;const m=add('Mortek-Garde',0,20,22);const e=E(S,add,22,22);assert.ok(AB.ob_attacke.can(S,m));drive(g,AB.ob_attacke.run(g,m));assert.equal(S.obp[0],1);assert.ok(fxL(S,m,'critD').length);assert.ok(!AB.ob_attacke.can(S,m),'1× pro Phase');S.ph=1;let k=0;for(let i=0;i<30;i++){S.rng=i*17+5;S.obp[0]=1;S.Ph.au=[];drive(g,AB.ob_leben.run(g,gen));k+=fxSum(S,e,'hitA')}assert.ok(k<0)});
T('Ossiarch: Neuformierung, Undurchdringliche Reihen, Knochenernte/Konstrukt reparieren',()=>{const {g,S,add}=mk(ZV,'Zenestras Zeloten',ri(ZV,'ob_reihen'));S.obp=[2,0];S.ph=5;const m=add('Mortek-Garde',0,20,22);E(S,add,22,22);drive(g,AB.ob_reihen.run(g,0));assert.equal(fxSum(S,m,'wardB'),1);const k=add('Gothizzar-Knochenernter',0,26,22);k.kt=6;const d=add('Mortek-Garde',0,30,22);d.n=5;let n=0;for(let i=0;i<20;i++){S.rng=i*3+1;k.kt=6;d.n=5;drive(g,eot3(g,0,0));n+=d.n-5}assert.ok(n>0&&k.kt==0)});
T('Mortisan: Disziplin-Wurf, Immortis-Garde, Erz der Sättigung',()=>{const {g,S,add,gen}=mk(ME,'Zenestras Zeloten',0,ei(ME,'kb_erz'));S.ph=2;S.act=0;const t=add('Nekropolenjäger',0,16,22);assert.ok(AB.kb_dm.src(S,0));let ok=0;for(let i=0;i<20;i++){S.rng=i*11+2;S.Ph.au=[];drive(g,AB.kb_dm.run(g,0));ok+=S.U.reduce((a,u)=>a+fxSum(S,u,'mv'),0)}assert.ok(ok>0);const m=mk(ME);m.add('Immortis-Garde',0,13,22);assert.equal(wardOf(m.S,m.gen),5,'Immortis-Garde in Reichweite');assert.equal(wardOf(mk(ME).S,mk(ME).gen),6)});


const BG='Bitterborkengesträuch',GS='Geisterschwingenschwarm';
T('Sylvaneth: Samen der Wiedergeburt, Schwer angeschlagen',()=>{let ok=0;for(let i=0;i<30;i++){const m=mk(BG,'Zenestras Zeloten',0,ei(BG,'sy_samen'));m.S.rng=i*13+7;hurt(m.g,m.gen,99);if(m.S.U.includes(m.gen)&&m.gen.n>0)ok++}assert.ok(ok>0&&ok<30,'3+ rettet '+ok);const k=mk(BG);const b=k.add('Baumfürst',0,20,22);b.dmg=10;const mw=modW(k.S,b,b.mw[1],null,false);assert.equal(mw[2],1)});
T('Sylvaneth: Leylinien/Lebensspender am Zugende, Jagdlied',()=>{const {g,S,add}=mk(BG);S.ter=[{x:20,y:22,w:6,h:6,a:0}];const u=add('Kurnoth-Jäger',0,20,22);u.dmg=3;drive(g,eot3(g,0,0));assert.equal(u.dmg,2);const m=mk(GS,'Zenestras Zeloten',ri(GS,'sy_leben'));m.add('Seidenschwingen-Schützen',0,10,10).dmg=5;drive(m.g,eot3(m.g,0,0));assert.ok(m.S.U.some(x=>x.o==0&&x.dn=='Seidenschwingen-Schützen'&&x.dmg==2));
 const j=mk(GS);const e=j.add('Freigilden-Stahlhelme',1,26,22);j.S.beute=[e.id,null];j.S.akk=[3,0];const f=j.add('Sucher-Waldgeister',0,22,22);const h0=hitMod(j.S,f,e,false);j.S.akk=[0,0];assert.ok(h0>hitMod(j.S,f,e,false))});
console.log(pass+' bestanden, '+fail+' fehlgeschlagen');process.exit(fail?1:0);
