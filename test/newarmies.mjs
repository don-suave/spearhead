// KI-gegen-KI-Partien mit gezielter Armeewahl (Index in ARMY); Aufruf: node test/newarmies.mjs [Seeds je Armee]
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {ARMY} from '../src/data.js';
const N=+process.argv[2]||3,from=+process.argv[3]||7;let bad=0;const tally={};
for(let a=from;a<ARMY.length;a++)for(let i=1;i<=N;i++){
 const seed=a*100+i;let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 try{const g=new Game(seed,['ai','ai']).start(flow);let n=0;
  while(g.req&&n++<30000){const r=g.req;const T=r.title||'';const ans=(r.t=='choice'&&/Armee wählen/.test(T))?a:aiAnswer(g,r,rnd);const e=g.submit(ans);if(e)throw new Error(`step ${n} ${r.t} ${r.title||''}: ${e} ${JSON.stringify(ans)}`)}
  {const r=Game.replay(seed,['ai','ai'],flow,g.log);const strip=S=>JSON.stringify(S,(k,v)=>(k=='aiDone'||k=='cs'||k=='cu')?undefined:v);if(strip(r.S)!==strip(g.S))throw new Error('Replay weicht ab')}
  g.events.forEach(e=>{const k=e.t=='rep'||e.t=='tray'?e.title:e.t=='note'?e.text.split(':')[0]:null;if(k)tally[k]=(tally[k]||0)+1});
  console.log(ARMY[a].n,'seed',seed,'steps',n,'round',g.S.round,'over',g.S.over,'vp',g.S.P.map(p=>p.vp).join(':'),'vs',ARMY[g.S.K.army[1]].n,g.req?'REQ '+g.req.t:'')
 }catch(e){bad++;console.log('FEHLER',ARMY[a].n,seed,e.message.slice(0,300),(e.stack||'').split('\n')[1])}}
if(process.argv[4])console.log(JSON.stringify(tally));console.log(bad?'FAIL '+bad:'ALLE OK')
