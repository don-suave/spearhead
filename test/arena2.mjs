import './aicfg.mjs';import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer as nw} from '../src/ai.js';import {aiAnswer as old} from './ai_base.mjs';
function go(seed,newSeat){let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const g=new Game(seed,['ai','ai']).start(flow);let n=0;
 while(g.req&&n++<30000){const seat=g.req.who!=null?g.req.who:g.S.act;const a=(seat===newSeat?nw:old)(g,g.req,rnd);const e=g.submit(a);if(e){if(seat!==newSeat)return null;throw new Error(e)}}
 return g.S.P.map(p=>p.vp)}
const N=+process.argv[2]||10;let w=0,l=0,d=0,sn=0,so=0;
const OFF=+process.argv[3]||0;for(let i=1+OFF;i<=N+OFF;i++){const ns=i%2,v=go(i,ns);const a=v[ns],b=v[1-ns];sn+=a;so+=b;a>b?w++:a<b?l++:d++;console.log(i,'neu',a,'alt',b)}
console.log('Siege neu',w,'alt',l,'remis',d,'VP neu',sn,'alt',so)
