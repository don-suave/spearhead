// Sammelt alle Spearhead-Daten (DE) aus dem Spiel in ein neutrales Modell. EN kommt aus en.txt (de<TAB>en).
import {ARMY} from '../src/data.js';
import {AB} from '../src/abil.js';
import fs from 'fs';
export const EXTRA=JSON.parse(fs.readFileSync(new URL('./extra.json',import.meta.url)));
export function collect(){
 return ARMY.map((a,i)=>{
  const traits=[...(EXTRA.traits[i]||[])];
  const units=a.units.map(u=>{
   let ab=[],note=null;
   if(EXTRA.abil[i+':'+u.n]){ab=EXTRA.abil[i+':'+u.n]}
   else if(u.tx&&u.tx.length){
    for(const t of u.tx){
     if(/\(Kampfeigenschaft\)\s*$/.test(t[0])){traits.push({n:t[0].replace(/\s*\(Kampfeigenschaft\)\s*$/,''),t:t[1]});continue}
     if(t[0]=='Modelle'){note=t[1];continue}
     ab.push({n:t[0],t:t[1]});
    }
   } else (u.abs||[]).forEach(id=>{const b=AB[id];if(b)ab.push({n:b.n,t:b.s})});
   return {n:u.n,kw:(u.kw||'').split(', ').filter(Boolean),mv:u.mv,hp:u.wm,models:u.nm,cnt:u.c||1,sv:u.sv,cv:u.cv,ward:u.wr||0,base:u.b,gen:!!u.gen,
    rw:(u.rw||[]).map(w=>({n:w[0],r:w[1],a:w[2],h:w[3],w:w[4],rd:w[5],d:w[6],f:w[7]||''})),
    mw:(u.mw||[]).map(w=>({n:w[0],a:w[2],h:w[3],w:w[4],rd:w[5],d:w[6],f:w[7]||''})),ab,note};
  });
  (a.tr||[]).forEach(k=>{const b=AB[k];if(b&&!traits.some(x=>x.n==b.n))traits.push({n:b.n,t:b.s})});
  return {i,f:a.f,n:a.n,reg:a.reg.map(r=>({n:r[0],t:r[1]})),enh:a.enh.map(r=>({n:r[0],t:r[1]})),traits,units};
 });
}
if(process.argv[1].endsWith('collect.mjs')){
 const A=collect(),S=new Set();
 const add=s=>{if(s&&typeof s=='string'&&!/^[\d\s+\-"]*$/.test(s))S.add(s)};
 A.forEach(a=>{add(a.f);add(a.n);[...a.reg,...a.enh,...a.traits].forEach(x=>{add(x.n);add(x.t)});a.units.forEach(u=>{add(u.n);u.kw.forEach(add);add(u.note);[...u.rw,...u.mw].forEach(w=>add(w.n));u.ab.forEach(x=>{add(x.n);add(x.t)})})});
 const have=new Map(fs.existsSync('en.txt')?fs.readFileSync('en.txt','utf8').split('\n').filter(l=>l.includes('\t')).map(l=>l.split('\t')):[]);
 const miss=[...S].filter(s=>!have.has(s));
 fs.writeFileSync('need.txt',miss.join('\n'));
 console.log('strings',S.size,'missing',miss.length,'chars',miss.join('').length);
}
