import {run} from './ai_vs_ai.mjs';import {Game} from '../src/game.js';import {flow} from '../src/flow.js';
let bad=0;
for(let seed=1;seed<=30;seed++){
 const {g}=run(seed);
 const g2=Game.replay(seed,['ai','ai'],flow,g.log);
 const st=S=>JSON.stringify(S,(k,v)=>k=='aiDone'||k=='cs'||k=='cu'?undefined:v),a=st(g.S),b=st(g2.S);
 if(a!==b){bad++;console.log('Abweichung bei seed',seed)}
}
console.log(bad?'REPLAY FAIL':'Replay deterministisch (30 Seeds)')
