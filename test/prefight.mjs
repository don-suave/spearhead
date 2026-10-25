import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {ARMY} from '../src/data.js';
let seen={pre:0,cont:0,res:0};const a=ARMY.findIndex(x=>x.n=='Knochenhorde-Grabwache')>=0?ARMY.findIndex(x=>x.n=='Knochenhorde-Grabwache'):0;
for(let seed=1;seed<=4;seed++){let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const g=new Game(seed,['h','ai']).start(flow);let n=0;
 while(g.req&&n++<20000){const r=g.req;if(r.title&&/Vor dem Kampf/.test(r.title))seen.pre++;if(r.title&&/Umkämpftes Ziel/.test(r.title))seen.cont++;if(r.title&&/^Ergebnis/.test(r.title))seen.res++;
  const ans=(r.t=='choice'&&r.who==0&&/Armee wählen/.test(r.title||''))?2:aiAnswer(g,r,rnd);const e=g.submit(ans);if(e)throw new Error(e)}
 console.log('seed',seed,'steps',n,'over',g.S.over)}
console.log(seen)
