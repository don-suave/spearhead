// KI: beantwortet Anfragen wie ein Mensch. Rein lesend auf dem Zustand, Zufall injizierbar.
import {W,H,CR,pathPts,plen,walk} from '../src/geom.js';
import {abAI,inRsv} from '../src/abil.js';
import {usedKey} from '../src/fx.js';
import {mvOf,byId,foes,dist,inCombat,nearest,eligF,sfOK,abilities,actCheck,moveErr,blk,hidden,rngOf,pileIn,chargeDest,obs,pr} from '../src/rules.js';
import {has,add} from '../src/util.js';

function aiDest(S,u,rng){const e=nearest(u,foes(S,u).filter(x=>x.x>=0));if(!e)return null;
 const P=pathPts(S,u.x,u.y,e.x,e.y,pr(u),obs(S,u).filter(o=>!(o.x==e.x&&o.y==e.y)),true);if(!P)return null;const tl=plen(P);
 for(let s=Math.min(rng,tl);s>.3;s-=.5){const q=walk(P,s);if(!moveErr(S,u,q[0],q[1],rng))return {x:q[0],y:q[1]}}return null}

function aiAct(G,rnd){const S=G.S,o=S.act,ph=S.ph;
 if(ph==0){const r=inRsv(S,o).find(x=>x.rph===0&&S.round>=x.rr&&!has(S.Ph.aiDone,'r'+x.id));if(r){add(S.Ph.aiDone,'r'+r.id);return {a:'rsv:'+r.id}}}
 if(ph==0||ph==6)return {a:'next'};
 if(ph==1){const ab=abAI(S,o);if(ab&&!has(S.Ph.aiDone,'ab'+JSON.stringify(ab))){add(S.Ph.aiDone,'ab'+JSON.stringify(ab));if(!actCheck(S,o,ab))return ab}return {a:'next'}}
 const ab=abAI(S,o);if(ab&&!has(S.Ph.aiDone,'ab'+JSON.stringify(ab))){add(S.Ph.aiDone,'ab'+JSON.stringify(ab));if(!actCheck(S,o,ab))return ab}
 if(ph==2){const r=inRsv(S,o).find(x=>x.rph!==0&&S.round>=x.rr&&!has(S.Ph.aiDone,'r'+x.id)&&!(x.lim&&usedKey(S,o+':ank','turn')));if(r){add(S.Ph.aiDone,'r'+r.id);return {a:'rsv:'+r.id}}}
 for(const u of S.U.filter(x=>x.o==o&&x.x>=0)){
  if(has(S.Ph.aiDone,u.id))continue;add(S.Ph.aiDone,u.id);
  const c=inCombat(S,u),e=nearest(u,foes(S,u).filter(x=>x.x>=0));if(!e)continue;const d=dist(u,e);let a=null;
  if(ph==5&&u.ab=='md'&&c)a={a:'md',u:u.id};
  else if(ph==5&&u.ab=='fa'&&u.n<u.nmax)a={a:'fa',u:u.id};
  else if(ph==2&&!c&&!(u.rw.length&&d<=u.rw[0][1]-2)){if(d>mvOf(S,u)+3)a={a:'run',u:u.id};else{const q=aiDest(S,u,mvOf(S,u));if(q)a={a:'move',u:u.id,x:q.x,y:q.y}}}
  else if(ph==3&&u.rw.length&&d<=rngOf(S,u,u.rw[0][1])&&!blk(S,u,e)&&!hidden(S,u,e))a={a:'shoot',u:u.id,t:e.id};
  else if(ph==4&&!c&&d<=12)a={a:'charge',u:u.id};
  if(a&&!actCheck(S,o,a))return a}
 return {a:'next'}}

export function aiAnswer(G,req,rnd=Math.random){const S=G.S,pick=n=>Math.floor(rnd()*n);
 switch(req.t){
  case 'info':return true;
  case 'choice':{if(req.pref!=null&&!req.opts[req.pref].dis)return req.pref;const ok=req.opts.map((x,i)=>x.dis?-1:i).filter(i=>i>=0);return ok[pick(ok.length)]}
  case 'place':{for(let k=0;k<6000;k++){let x=1+rnd()*(W-2),y=1+rnd()*(H-2);const md=k%3;if(md==1){const e=pick(4);if(e==0)x=rnd()*4;else if(e==1)x=W-rnd()*4;else if(e==2)y=rnd()*4;else y=H-rnd()*4}else if(md==2){x=rnd()<.5?rnd()*7:W-rnd()*7;y=rnd()<.5?rnd()*7:H-rnd()*7}const a=rnd()*Math.PI,r={x,y,a};if(!req.check(r))return r}return {cancel:true}}
  case 'dest':{const u=byId(S,req.u),q=u&&(req.chg?chargeDest(S,u,req.roll):req.pile?null:aiDest(S,u,req.rng));return q||{stay:true}}
  case 'tgt':{const u=byId(S,req.u),e=nearest(u,foes(S,u).filter(x=>x.x>=0));return e?{t:e.id}:{cancel:true}}
  case 'fight':{const u=eligF(S,req.who).filter(x=>sfOK(S,x))[0];const t=nearest(u,foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR));return {a:'fight',u:u.id,t:t?t.id:null}}
  case 'act':return aiAct(G,rnd)}
 throw new Error('KI: unbekannte Anfrage '+req.t)}
