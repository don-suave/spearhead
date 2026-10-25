// Angriffsverteilung: Teilmengen [lo,hi] ergeben zusammen genau alle Attacken
import assert from 'node:assert/strict';import {Game} from '../src/game.js';import {mkUnit,setObj,newPh,newT} from '../src/state.js';import {attack} from '../src/rules.js';
function mk(){const g=new Game(7,['h','h']);const S=g.S;S.K.army=[0,1];S.K.map=0;S.K.terr=[0,1];S.K.reg=[0,0];S.K.enh=[0,0];S.K.realm=0;setObj(S);
 const add=(dn,o,x,y)=>{const u=mkUnit(dn,o,S.NID++);u.x=x;u.y=y;S.U.push(u);return u};S.stage=1;S.T=newT();S.Ph=newPh();S.ph=5;S.act=0;return {g,S,add}}
const cnt=(g,f)=>{const n0=g.events.length;f();const ev=g.events.slice(n0).filter(e=>e.t=='rep'||e.t=='tray');let t=0;ev.forEach(e=>e.blocks.forEach(b=>{if(b.k=='row'&&/^Treffer \(/.test(b.l||''))t+=b.v.length}));return t};
let ok=0;
for(const [dn,tn] of [['Freigilden-Stahlhelme','Bolz’nschießa'],['Skelette (Knochenhorde)','Clanratten'],['Wanstreißa','Freigilden-Stahlhelme']]){
 const row=(sp)=>{const {g,S,add}=mk();const a=add(dn,0,20,15),b=add(tn,1,20+a.r+1.2,15);b.dmg=0;return cnt(g,()=>attack(g,a,b,0,sp))};
 const full=row(),p1=row([0,.4]),p2=row([.4,1]);console.log(dn,'voll',full,'Teile',p1,p2);assert.equal(p1+p2,full);assert.ok(full>0);ok++}
console.log('Verteilung ok',ok)
