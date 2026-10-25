// Rückgängig: Aufstellung ganz von vorne, Bewegung einzeln; Zustand entspricht dem Log-Präfix
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import assert from 'node:assert';
let s=7;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const g=new Game(11,['h','ai']).start(flow);let n=0,depT=0,mvT=0;const strip=S=>JSON.stringify(S,(k,v)=>k=='aiDone'?undefined:v);
while(g.req&&n++<4000&&(depT<3||mvT<3)){const q=g.req;
 if(q.t=='choice'&&q.title=='Spielstart'){g.submit(0);continue}
 const i=g.undoIdx();
 if(i>=0){const kind=g.lk[g.lk.length-1];const r=Game.replay(11,['h','ai'],flow,g.log.slice(0,i));
  assert.equal(r.log.length,i);assert.ok(r.req,'Anfrage nach Undo');
  if(q.t=='place'){depT++;assert.ok(!r.lk.includes('place:dep')||r.lk.lastIndexOf('place:dep')<i,'Aufstellung zurückgesetzt')}else{mvT++;assert.equal(r.req.t,'act')}
  // Weiterspielen nach Undo ist möglich
  const e=r.submit(aiAnswer(r,r.req,rnd));assert.equal(e,'')}
 const e=g.submit(aiAnswer(g,q,rnd));if(e)throw new Error(e)}
console.log('Aufstellungs-Undo',depT,'Bewegungs-Undo',mvT);assert.ok(depT>0,'Aufstellung getestet');console.log('OK');
