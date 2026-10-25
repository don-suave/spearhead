import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';
export function run(seed,pack=1,maxSteps=30000){
 let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const g=new Game(seed,['ai','ai']).start(flow);let n=0;
 while(g.req&&n++<maxSteps){let a;if(g.req.t=='choice'&&g.req.title=='Spielstart')a=[pack,0,0];else a=aiAnswer(g,g.req,rnd);const e=g.submit(a);if(e)throw new Error(`seed ${seed} step ${n} req ${g.req.t} ${g.req.title||''}: ${e} answer ${JSON.stringify(a)}`)}
 return {g,n}}
if((process.argv[1]||'').endsWith('sb_ai.mjs')){
 const N=+process.argv[2]||5,pack=process.argv[3]==null?1:+process.argv[3];let bad=0;
 for(let i=1;i<=N;i++){try{const {g,n}=run(i,pack);console.log('seed',i,'steps',n,'round',g.S.round,'over',g.S.over,'vp',g.S.P.map(p=>p.vp).join(':'),'map',g.S.K.realm,g.S.K.map,'obj',g.S.obj.length,'ter',g.S.ter.length)}catch(e){bad++;console.log('FEHLER',e.stack.split('\n').slice(0,4).join(' | ').slice(0,500))}}
 console.log(bad?'FAIL':'ALLE OK')}
