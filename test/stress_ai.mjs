// Stress-Test: viele KI-Partien mit zufälligen Armeen/Packs; jede abgelehnte KI-Antwort oder Endlosschleife wird gemeldet
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';
const N=+process.argv[2]||40,from=+process.argv[3]||1;let bad=0;
for(let seed=from;seed<from+N;seed++){
 let s=seed*7919;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 try{const g=new Game(seed,['ai','ai']).start(flow);let n=0;
  while(g.req&&n++<30000){const q=g.req;const a=q.set?[seed%3,1]:aiAnswer(g,q,rnd);const e=g.submit(a);if(e){bad++;console.log('seed',seed,'Schritt',n,q.t,q.title||q.kind||'','Fehler:',e,JSON.stringify(a).slice(0,120));break}}
  if(g.req&&n>=30000){bad++;console.log('seed',seed,'Endlos','req',g.req.t,g.req.title||'')}
 }catch(e){bad++;console.log('seed',seed,'Ausnahme',String(e.stack||e).split('\n').slice(0,3).join(' | '))}}
console.log(bad?bad+' PROBLEME':'ALLE OK')
