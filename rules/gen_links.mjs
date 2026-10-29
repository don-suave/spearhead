// Erzeugt src/linkidx.js: Begriff → Regel-App-Ziel (für unterstrichene Links in den Spieltexten).
// Aufruf: node rules/gen_links.mjs  (läuft auch im Release; Schlüssel wie in rules/regeln.template.html)
import fs from 'fs';
import {collect} from './collect.mjs';
import {GL} from './gloss.mjs';
import {RULES} from './rules_all.mjs';
import {PK} from './packs.mjs';
const here=new URL('.',import.meta.url).pathname;
const L=[];const seen=new Set();
const add=(lab,href,ai=-1,pr=0,pk=-1)=>{if(!lab||typeof lab!='string')return;lab=lab.trim();if(lab.length<4&&!/^[A-ZÄÖÜ]{2,3}$/.test(lab))return;const k=lab.toLowerCase()+'|'+href;if(seen.has(k))return;seen.add(k);L.push([lab,href,ai,pr,pk])};
collect().forEach(a=>{
 const ai=a.i;
 [['t',a.traits],['r',a.reg],['e',a.enh]].forEach(([p,arr])=>arr.forEach((x,j)=>add(x.n,`#/sp/${ai}/${p}${j}`,ai,3)));
 a.units.forEach((u,k)=>{add(u.n,`#/sp/${ai}/u${k}`,ai,2);u.ab.forEach((x,j)=>add(x.n,`#/sp/${ai}/u${k}a${j}`,ai,3))});
});
const nm=n=>Array.isArray(n)?n[0]:n;
PK.forEach((k,pi)=>{
 k.tac.forEach((c,j)=>{add(c.n,`#/packs/${pi}/tac${j}`,-1,2,pi);add(c.k,`#/packs/${pi}/tac${j}`,-1,2,pi)});
 k.tw.forEach((b,bi)=>b.l.forEach((w,j)=>add(nm(w.n),`#/packs/${pi}/tw${bi}_${j}`,-1,2,pi)));
 k.terr.forEach((w,j)=>add(nm(w.n),`#/packs/${pi}/terr${j}`,-1,2,pi));
});
RULES.forEach(r=>{if(r.t[0].length>=8)add(r.t[0],`#/rules/${r.id}`,-1,1)});
GL.forEach(g=>g[1].split('|').forEach(l=>add(l,`#/gloss/${g[0]}`,-1,0)));
fs.writeFileSync(here+'../src/linkidx.js','// GENERIERT von rules/gen_links.mjs – nicht von Hand ändern\nexport const LK='+JSON.stringify(L)+';\n');
console.log('linkidx',L.length,'Einträge');
