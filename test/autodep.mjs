// Aufstellung: „Rest automatisch“ stellt alle übrigen Einheiten regelkonform auf; Rückgängig-Arten
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import assert from 'node:assert';
let s=5;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const g=new Game(21,['h','ai']).start(flow);let auto=false,kinds=new Set(),n=0;
while(g.req&&n++<3000){const q=g.req;
 if(q.t=='choice'&&q.title=='Spielstart'){g.submit(0);continue}
 if(q.t=='place'&&q.kind=='dep'&&!G_ai(q)&&!auto){assert.ok(q.auto,'auto angeboten');assert.equal(g.submit({auto:true}),'');auto=true;continue}
 const i=g.undoIdx();if(i>=0)kinds.add(g.lk[i]);
 if(auto&&q.t=='act'&&g.S.round>=2)break;
 const e=g.submit(aiAnswer(g,q,rnd));if(e)throw new Error(e)}
function G_ai(q){return g.isAI(q.who)}
assert.ok(auto,'Auto genutzt');
const us=g.S.U.filter(u=>u.o==0&&!u.rsv&&!u.amb);assert.ok(us.every(u=>u.x>=0),'alle Einheiten stehen');
console.log('Undo-Arten',[...kinds].join(' '));console.log('OK');
