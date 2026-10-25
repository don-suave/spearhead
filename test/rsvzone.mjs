import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {ARMY} from '../src/data.js';import {placeErr,globals} from '../src/rules.js';import {byId} from '../src/rules.js';
const a=ARMY.findIndex(x=>x.n=='Blutdrangjagd');let found=0;
for(let seed=1;seed<=3;seed++){let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const g=new Game(seed,['h','ai']).start(flow);let n=0;
while(g.req&&n++<20000){const r=g.req,S=g.S;
 if(r.t=='act'&&r.who==0){const gl=globals(S,0).filter(x=>x.k.startsWith('rsv:'));for(const x of gl){const u=byId(S,+x.k.slice(4));let c=0;for(let i=1;i<44;i++)for(let j=1;j<30;j++)if(!placeErr(S,'rsv',0,u,i,j,0))c++;console.log('seed',seed,'round',S.round,'ph',S.ph,u.name,'cells',c);found++}}
 const ans=(r.t=='choice'&&r.who==0&&/Armee wählen/.test(r.title||''))?a:aiAnswer(g,r,rnd);const e=g.submit(ans);if(e)throw new Error(e)}}
console.log('found',found)
