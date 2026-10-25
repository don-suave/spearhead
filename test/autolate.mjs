// Spätere Aufstellung: Ein Mensch, der die Bewegungsphase ohne Aufstellen beendet, bekommt die Reserve automatisch angeboten
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {ARMY} from '../src/data.js';
const a=ARMY.findIndex(x=>x.n=='Blutdrangjagd');let prompts=0,placed=0,cancelled=0;
for(let seed=1;seed<=3;seed++){let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const g=new Game(seed,['h','ai']).start(flow);let n=0,k=0;
 while(g.req&&n++<20000){const r=g.req,S=g.S;let ans;
  if(r.t=='choice'&&r.who==0&&/Armee wählen/.test(r.title||''))ans=a;
  else if(r.t=='act'&&r.who==0&&S.ph==2&&S.stage)ans={a:'next'}; // Mensch stellt nie selbst über das Menü auf
  else if(r.t=='place'&&r.kind=='rsv'&&r.who==0){prompts++;ans=(k++==0)?{cancel:true}:aiAnswer(g,r,rnd);if(ans.cancel)cancelled++;else placed++}
  else ans=aiAnswer(g,r,rnd);
  const e=g.submit(ans);if(e)throw new Error(e+' '+JSON.stringify(r).slice(0,200))}}
console.log('Angebote',prompts,'aufgestellt',placed,'abgebrochen',cancelled);
if(!prompts||!placed||!cancelled)throw new Error('Reserve wurde nicht automatisch angeboten');console.log('autolate ok')
