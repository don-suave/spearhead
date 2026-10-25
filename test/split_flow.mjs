// Angriffsverteilung im Ablauf: erst würfeln (Anfrage 'split' mit Wurfergebnissen), dann verteilen, dann Angriffe mit denselben Würfen
import assert from 'node:assert/strict';import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {eligF,sfOK,foes,dist} from '../src/rules.js';
let ok=0;
for(const seed of [3,4,5]){
 let s=seed;const rnd=()=>{s=(s+0x9E3779B9)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const g=new Game(seed,['ai','ai']).start(flow);let n=0;
 while(g.req&&g.req.t!='fight'&&n++<5000)g.submit(aiAnswer(g,g.req,rnd));
 if(!g.req){console.log('seed',seed,'kein Nahkampf');continue}
 const S=g.S,w=g.req.who,u=eligF(S,w).filter(x=>sfOK(S,x))[0];const fo=S.U.filter(e=>e.o!=w&&e.x>=0);
 u.mw=[['Test',0,'2W3',3,3,0,1,'']];fo[0].x=u.x+u.r+fo[0].r+.3;fo[0].y=u.y;fo[1].x=u.x;fo[1].y=u.y+u.r+fo[1].r+.3;
 const inr=foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=3);if(inr.length<2){console.log('seed',seed,'nur',inr.length,'Ziele');continue}
 assert.ok(!g.submit({a:'fight',u:u.id,t:null,split:1}));
 assert.equal(g.req.t,'split');const r=g.req.rolls;assert.ok(r.length==1&&r[0].v.length>=2,'Würfe vorhanden');
 const tot=r[0].v.reduce((a,b)=>a+b,0),d={};d[g.req.inr[0]]=1;d[g.req.inr[1]]=1;
 const ev0=g.events.length;const e=g.submit({d});assert.ok(!e,'Verteilung gültig '+e);
 let m=0;while(g.req&&g.req.t!='fight'&&m++<20)g.submit(aiAnswer(g,g.req,rnd));
 const tr=g.events.slice(ev0).filter(x=>x.t=='rep'||x.t=='tray');let ax=0;tr.forEach(x=>x.blocks.forEach(b=>{if(b.k=='row'&&/^Attacken/.test(b.l||''))ax+=b.v.reduce((a,c)=>a+c,0)}));
 console.log('seed',seed,'gewürfelt',r[0].v.join(','),'Summe',tot,'Würfe in Angriffen',ax);assert.equal(ax,tot*2,'beide Angriffe zeigen die vorgewürfelten Werte (je Ziel die gleiche Reihe)');ok++}
console.log('split_flow ok',ok)
