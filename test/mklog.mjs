// Erzeugt ein Antwortprotokoll bis zu einer gewünschten Spielsituation (für UI-Tests per Replay)
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {ARMY} from '../src/data.js';import fs from 'node:fs';
const [,,armyName,seedS,roundS,phS]=process.argv;const seed=+seedS||1,round=+roundS||3,ph=+phS||2,a=ARMY.findIndex(x=>x.n==armyName);
let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const g=new Game(seed,['h','ai']).start(flow);let n=0;
while(g.req&&n++<20000){const r=g.req,S=g.S;if(S.round==round&&S.ph==ph&&r.t=='act'&&r.who==0)break;
 const ans=(r.t=='choice'&&r.who==0&&/Armee wählen/.test(r.title||''))?a:aiAnswer(g,r,rnd);const e=g.submit(ans);if(e)throw new Error(e)}
fs.writeFileSync('/tmp/log_'+seed+'.json',JSON.stringify({seed,log:g.log}));console.log('ok',n,'round',g.S.round,'ph',g.S.ph,'req',g.req&&g.req.t,g.S.K.army)
