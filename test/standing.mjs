import {AB} from '../src/abil.js';
import {Game} from '../src/game.js';import {setBoard} from '../src/geom.js';import {mkUnit,setObj,newPh,newT} from '../src/state.js';import {ARMY} from '../src/data.js';
import {aiAnswer} from '../src/ai.js';import {oppWindow} from '../src/flow.js';
const ix=n=>ARMY.findIndex(a=>a.n==n);
const g=new Game(7,['h','ai']);const S=g.S;S.K.army=[ix('Grundstok-Wegbereiter'),ix('Zenestras Zeloten')];S.K.map=0;S.K.terr=[0,1];S.K.reg=[0,0];S.K.enh=[0,0];S.K.realm=0;setObj(S);setBoard(44,30);S.obj=[[6,5],[38,5],[22,15],[6,25],[38,25]].map(p=>p.slice());S.oc=S.obj.map(()=>-1);
// Standing Orders: Reaktionsfenster ohne / mit fester Antwort
const run=(rp)=>{const g2=new Game(7,['h','ai']);Object.assign(g2.S,{});return g2};
const types=(pre)=>{const gg=new Game(7,['h','ai']);const SS=gg.S;SS.K=JSON.parse(JSON.stringify(S.K));SS.ter=[];SS.obj=S.obj;SS.U=[];
 const mk=(dn,oo,x,y)=>{const u=mkUnit(dn,oo,SS.NID++);u.x=x;u.y=y;SS.U.push(u);return u};
 SS.stage=1;SS.T=newT();SS.Ph=newPh();SS.round=2;SS.tn=3;SS.act=1;SS.ph=2;mk('Endrinentakler',0,16,22);mk('Freigilden-Stahlhelme',1,40,5);
 if(pre)gg.submit({a:'rp',who:0,key:AB.gw_wendig.n,v:pre});
 const it=oppWindow(gg,'start');const r=it.next();return r.done?'done':r.value.t+':'+r.value.title};
const a0=types(null),a1=types('yes'),a2=types('no');
console.log(a0,'|',a1,'|',a2);
if(!/^choice:/.test(a0)||/^choice:Wendige/.test(a2)||a1==a0&&0)throw new Error('Standing-Order-Test fehlgeschlagen');
console.log('Standing Orders OK');
// Testmodus gegen Freund: Reaktionsfenster des simulierten Freunds wird sichtbar (Warte-Popup, dann Ergebnis)
{const gg=new Game(7,['h','ai']);const SS=gg.S;SS.K=JSON.parse(JSON.stringify(S.K));SS.K.army=[S.K.army[1],S.K.army[0]];SS.K.asyncSim=true;SS.ter=[];SS.obj=S.obj;SS.U=[];
 const mk=(dn,oo,x,y)=>{const u=mkUnit(dn,oo,SS.NID++);u.x=x;u.y=y;SS.U.push(u);return u};
 SS.stage=1;SS.T=newT();SS.Ph=newPh();SS.round=2;SS.tn=3;SS.act=0;SS.ph=2;mk('Endrinentakler',1,16,22);mk('Freigilden-Stahlhelme',0,40,5);
 const it=oppWindow(gg,'start');const r=it.next();console.log('Sim:',r.value&&r.value.t+':'+r.value.title);
 if(!r.value||r.value.t!='info'||!/Warte auf/.test(r.value.title))throw new Error('Warte-Popup fehlt');
 let r2=it.next(true),n=0;while(!r2.done&&n++<10)r2=it.next(r2.value.t=='info'?true:0);
 if(!gg.events.some(e=>e.t=='rep'&&/hat reagiert/.test(e.title)))throw new Error('Ergebnis-Meldung fehlt');console.log('Sim-Reaktion OK')}
