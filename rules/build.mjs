// Baut dist/regeln.html aus Spiel-Daten (DE) + en.txt + Regeltexten.
import fs from 'fs';
import {collect} from './collect.mjs';
import {RULES} from './rules_all.mjs';
import {GL} from './gloss.mjs';
const here=new URL('.',import.meta.url).pathname;
const EN=new Map(fs.readFileSync(here+'en.txt','utf8').split('\n').filter(l=>l.includes('\t')).map(l=>{const i=l.indexOf('\t');return [l.slice(0,i),l.slice(i+1)]}));
const miss=new Set();
const P=s=>{if(s==null||s==='')return s;if(typeof s!=='string')return s;if(/^[\d\s+\-"]*$/.test(s))return s;const e=EN.get(s);if(e==null)miss.add(s);return [s,e||s]};
const dice=x=>typeof x=='string'?[x,x.replace(/W(\d)/g,'D$1')]:x;
const FL={T:['Krit. (tödlich)','Crit (Mortal)'],V:['Krit. (verwundet)','Crit (Auto-wound)'],B:['Nahbeschuss','Shoot in Combat'],G:['Begleiter','Companion'],
 S:['Schockfäuste: Krit. Treffer = W6 Treffer','Shock Gauntlets: critical hit = D6 hits'],M:['Jeder Treffer = 1 tödlicher Schaden','Each hit = 1 mortal damage'],
 Q:['Anti-Zauberer/Priester (+1 Wucht)','Anti-Wizard/Priest (+1 Rend)'],C:['Angriff (+1 Schaden)','Charge (+1 Damage)'],D:['Krit. (2 Treffer)','Crit (2 Hits)'],
 K:['Anti-Kavallerie (+1 Wucht)','Anti-Cavalry (+1 Rend)'],H:['Anti-Held (+1 Wucht)','Anti-Hero (+1 Rend)'],I:['Anti-Infanterie (+1 Wucht)','Anti-Infantry (+1 Rend)'],N:['Anti-Angriff (+1 Wucht)','Anti-charge (+1 Rend)']};
const dv=v=>{if(typeof v=='string'){return v}return v};
const A=collect().map(a=>({i:a.i,f:P(a.f),n:P(a.n),
 traits:a.traits.map(x=>({n:P(x.n),t:P(x.t)})),reg:a.reg.map(x=>({n:P(x.n),t:P(x.t)})),enh:a.enh.map(x=>({n:P(x.n),t:P(x.t)})),
 units:a.units.map(u=>({n:P(u.n),kw:u.kw.map(P),mv:u.mv,hp:u.hp,m:u.models,sv:u.sv,cv:u.cv,wd:u.ward,b:u.base,g:u.gen?1:0,note:P(u.note)||null,
  rw:u.rw.map(w=>({n:P(w.n),r:w.r,a:dice(w.a),h:w.h,w:w.w,rd:w.rd,d:dice(w.d),f:w.f})),
  mw:u.mw.map(w=>({n:P(w.n),a:dice(w.a),h:w.h,w:w.w,rd:w.rd,d:dice(w.d),f:w.f})),
  ab:u.ab.map(x=>({n:P(x.n),t:P(x.t)}))}))}));
const pr=a=>a; 
const R=RULES.map(r=>({id:r.id,ph:r.ph,t:r.t,s:r.s,d:r.d,sp:r.sp||null}));
const G=GL.map(g=>({id:g[0],k:[g[1].split('|'),g[2].split('|')],t:[g[1].split('|')[0],g[2].split('|')[0]],d:[g[3],g[4]],s:g[5]}));
const data={A,R,G,FL};
const tpl=fs.readFileSync(here+'regeln.template.html','utf8');
const out=tpl.replace('/*__DATA__*/',()=>'const DATA='+JSON.stringify(data)+';');
fs.mkdirSync(here+'../dist',{recursive:true});
fs.writeFileSync(here+'../dist/regeln.html',out);
console.log('regeln.html',(out.length/1024|0)+'KB','missing EN:',miss.size,process.env.ALLMISS?[...miss]:[...miss].slice(0,5));
if(process.argv.includes('--strict')&&(miss.size||A.length<31)){console.error('Übersetzungen fehlen oder Armeezahl falsch');process.exit(1)}
