// Invarianten-Test: KI-gegen-KI-Partien (alle Packs, zufällige Armeen); nach jedem Schritt Zusammenhalt, Überlappung, Spielfeldrand, Gelände, Modellzahl prüfen
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';
import {abs,cohBad,mgap} from '../src/models.js';import {W,H,ptDist,noStand} from '../src/geom.js';
const N=+process.argv[2]||30,from=+process.argv[3]||1;const cnt={},ex={},info={};
const bad=(k,msg)=>{cnt[k]=(cnt[k]||0)+1;if(!ex[k])ex[k]=[];if(ex[k].length<4)ex[k].push(msg)};
for(let seed=from;seed<from+N;seed++){
 let s=seed*7919;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 try{const g=new Game(seed,['ai','ai']).start(flow);let n=0,last='',ev0=0;const seen=new Set();
  while(g.req&&n++<30000){const q=g.req;const a=q.set?[seed%3,1]:aiAnswer(g,q,rnd);last=(q.t+':'+(q.title||q.kind||'')).slice(0,50);const e=g.submit(a);if(e){bad('abgelehnt',`seed ${seed} ${last}: ${e}`);break}
   const S=g.S;if(!S.stage)continue;for(const e of g.events.slice(ev0))if(e.t=='msg'&&/Zusammenhalt nach/.test(e.title))info.meldung=(info.meldung||0)+1;ev0=g.events.length;const mv=q.t=='dest'||q.t=='place'||q.t=='split'||(q.t=='act'&&['move','run','retreat','adj','charge','pile'].includes(a.a));
   for(const u of S.U){if(u.x<0||!u.M)continue;const P=abs(u),tag=`seed ${seed} pack ${S.K.pack} R${S.round} ph${S.ph} ${u.name}(${u.o}) nach ${last}`;const key=u.id+'|'+P.map(m=>m.x.toFixed(2)+m.y.toFixed(2)).join();if(seen.has(key))continue;seen.add(key);
    if(u.n!=P.length)bad('modellzahl',tag+` n=${u.n} M=${P.length}`);
    if(P.length>1){const c=cohBad(P,u.coh||1);if(c.length)bad('zusammenhalt',tag+` ${c.length}/${P.length} Modelle`)}
    for(const m of P){if(m.x<-.05||m.y<-.05||m.x>W+.05||m.y>H+.05)bad('spielfeldrand',tag+` (${m.x.toFixed(1)},${m.y.toFixed(1)})`);
     for(const t of S.ter)if(noStand(t)&&ptDist(t,m.x,m.y)<m.w/2-.05){bad('gelaende',tag+` ${t.k||''}`);break}}
    for(const v of S.U){if(v.x<0||!v.M||v.id<u.id)continue;const Q=v==u?P:abs(v);let ov=false;
     for(let i=0;i<P.length&&!ov;i++)for(let j=(v==u?i+1:0);j<Q.length;j++)if(mgap(P[i],Q[j])<-.1){ov=true;bad(v==u?'ueberlappung-eigene':'ueberlappung-fremde',tag+` mit ${v.name}(${v.o}) gap ${mgap(P[i],Q[j]).toFixed(2)}`);break}}}
  }
  if(g.req&&n>=30000)bad('endlos',`seed ${seed}`);
 }catch(e){bad('ausnahme',`seed ${seed}: `+String(e.stack||e).split('\n').slice(0,3).join(' | '))}}
for(const k in cnt)console.log(k,cnt[k],'\n  '+ex[k].join('\n  '));
console.log('Zusammenhalts-Meldungen:',info.meldung||0);console.log(Object.keys(cnt).length?'ABWEICHUNGEN':'ALLE OK')
