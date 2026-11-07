// Komplette KI-Partien mit erzwungener Schrotthorde (beide Seiten oder gegen Zufall): Abstürze, abgelehnte Antworten, Wilde Instinkte / Falle / Reserve im Ablauf
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {ARMY} from '../src/data.js';
const N=+process.argv[2]||12,SH=ARMY.findIndex(a=>a.n=='Schrotthorde');let bad=0,stat={wild:0,trap:0,rsv:0,frei:0,eisen:0,games:0};
for(let seed=+process.env.FROM||1;seed<(+process.env.FROM||1)+N;seed++){
 let s=seed*7919;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 try{const g=new Game(seed,['ai','ai']).start(flow);let n=0;const em=g.emit.bind(g);g.emit=x=>{const j=JSON.stringify(x);if(/Wilde Instinkte: Eine weitere/.test(j))stat.wild++;if(/Fiese Falle/.test(j))stat.trap++;if(/Dann legen wir mal los|Eisenwänste \(Nachhut\) erscheint/.test(j))stat.rsv++;if(/Kein Mangel an Freiwilligen/.test(j))stat.frei++;if(/Nützlich bleiben/.test(j))stat.eisen++;return em(x)};
  while(g.req&&n++<40000){const q=g.req;let a;
   if(q.set)a=[seed%3,1];
   else if(q.t=='choice'&&/^Armee wählen|^Gegnerischer Spearhead/.test(q.title)){const i=q.opts.findIndex(o=>/Schrotthorde/.test((o.t||'')+(o.s||'')));a=i>=0?i:aiAnswer(g,q,rnd)}
   else if(q.t=='choice'&&/Verbesserung des Generals/.test(q.title)){a=process.env.ENH?+process.env.ENH:seed%4}
   else if(q.t=='choice'&&/Regimentsfähigkeit/.test(q.title)){a=seed%2}
   else a=aiAnswer(g,q,rnd);
   const e=g.submit(a);if(e){bad++;console.log('seed',seed,'Schritt',n,q.t,q.title||q.kind||'','Fehler:',e,JSON.stringify(a).slice(0,120));break}}
  if(g.req&&n>=40000){bad++;console.log('seed',seed,'Endlos')}
  const S=g.S;stat.games++;const log=JSON.stringify(g.log||[]);
  if(S.K.army.some(x=>x==SH)===false)console.log('seed',seed,'keine Schrotthorde gewählt',S.K.army);
 }catch(e){bad++;console.log('seed',seed,'Ausnahme',String(e.stack||e).split('\n').slice(0,4).join(' | '))}}
console.log(JSON.stringify(stat));console.log(stat.games+' Partien',bad?bad+' PROBLEME':'ALLE OK')
