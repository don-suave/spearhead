import fs from 'fs';import {ARMY} from '/home/claude/spearhead/src/data.js';
const txt=fs.readdirSync('/tmp/pdf').filter(x=>x.endsWith('.txt')&&!/quickstart|reference/.test(x)).map(f=>({f:f.slice(0,8),t:fs.readFileSync('/tmp/pdf/'+f,'utf8').replace(/­/g,'').replace(/\s+/g,' ')}));
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let n=0,ok=0,nf=0;const bad=[];
for(const a of ARMY)for(const u of a.units)for(const [kind,list] of [['rw',u.rw||[]],['mw',u.mw||[]]])for(const w of list){
 n++;const nm=w[0].replace(/’/g,"'");
 // Name mit optionalen Trennstrichen/Leerzeichen
 const re=new RegExp(nm.split('').map(c=>/\s/.test(c)?'\\s*':esc(c)+'(?:-\\s)?').join('')+'\\s+((?:\\d+"\\s+)?)(\\d*W?\\d+(?:\\+\\d)?)\\s+(\\d)\\+\\s+(\\d)\\+\\s+(-|−|\\d)\\s+(\\d*W?\\d+(?:\\+\\d)?)','gi');
 const all=[];for(const p of txt){re.lastIndex=0;let m;while((m=re.exec(p.t)))all.push({f:p.f,m})}
 if(!all.length){nf++;(globalThis.NF=globalThis.NF||[]).push(a.n+" / "+u.n+" / "+w[0]);continue}
 const g={att:String(w[2]),hit:String(w[3]),wnd:String(w[4]),rend:String(w[5]),dmg:String(w[6])};let best=null,good=false;
 for(const found of all){const [,rg,att,hit,wnd,rend,dmg]=found.m;const rd=(rend=='-'||rend=='−')?'0':rend,diff=[];
  if(g.att!=att)diff.push(`Attacken ${g.att}≠${att}`);if(g.hit!=hit)diff.push(`Treffen ${g.hit}≠${hit}`);if(g.wnd!=wnd)diff.push(`Verwunden ${g.wnd}≠${wnd}`);if(g.rend!=rd)diff.push(`Wucht ${g.rend}≠${rd}`);if(g.dmg!=dmg)diff.push(`Schaden ${g.dmg}≠${dmg}`);
  if(!diff.length){good=true;break}if(!best||diff.length<best.d.length)best={d:diff,f:found.f}}
 if(good)ok++;else bad.push(`${a.n} / ${u.n} / ${w[0]} (PDF ${best.f}): ${best.d.join(', ')}`)}
console.log("nicht auffindbar:",(globalThis.NF||[]).join("; "));console.log(n,'Waffenzeilen;',ok,'stimmen,',bad.length,'weichen ab,',nf,'im PDF-Text nicht auffindbar');console.log(bad.join('\n'))
