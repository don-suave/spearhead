// KI: beantwortet Anfragen wie ein Mensch. Rein lesend auf dem Zustand, Zufall injizierbar.
import {W,H,CR,OR,into,pathPts,plen,walk} from './geom.js';
import {abAI,inRsv} from './abil.js';
import {usedKey,fxL,fxSum} from './fx.js';
import {ONM,hasAb,updCtrl,ctrl,isHero,wnd,mx,nm,ct,wardOf,mvOf,byId,foes,dist,inCombat,nearest,eligF,sfOK,abilities,actCheck,moveErr,blk,shB,hidden,rngOf,placeErr,pileIn,chargeDest,obs,pr,depForm} from './rules.js';
import {setAbs as setAbsM} from './models.js';
import {has,add} from './util.js';
import {CH,twVP} from './cards.js';

// ---------- Bewertung ----------
const avgD=v=>{if(typeof v!='string')return +v||0;const q=/^(\d?)W(\d)(?:\+(\d+))?$/.exec(v);return q?(+q[1]||1)*(+q[2]+1)/2+(+q[3]||0):1};
// erwarteter Schaden (Wunden) von u gegen e mit Fern- oder Nahkampfwaffen
export function evAtk(S,u,e,shoot){const ws=shoot?u.rw:u.mw;let t=0;for(const w of ws){const n=Math.min(w[8]==null?1e9:w[8],nm(u))*avgD(w[2]);
  const ph=Math.min(5/6,Math.max(1/6,(7-w[3])/6)),pw=Math.min(5/6,Math.max(1/6,(7-w[4])/6)),sv=e.sv+(+w[5]||0),ps=sv<=6?Math.min(5/6,(7-sv)/6):0,wd=wardOf(S,e),pwd=wd<=6?(7-wd)/6:0;
  const fl=w[7]||'';let q=n*ph*(fl.includes('M')?1:pw*(1-ps)*(1-pwd));t+=q*avgD(w[6])}
 return t}
const onObj=(S,e)=>S.obj.some(p=>ct(e,p));
export function tgtValue(S,u,e,shoot){const ev=evAtk(S,u,e,shoot),w=wnd(e);return Math.min(ev,w)*(isHero(e)?1.3:1)+(ev>=w*.9?w*.5:0)+(onObj(S,e)?2:0)}
function bestTgt(S,u,l,shoot){let b=null,bv=-1;l.forEach(e=>{const v=tgtValue(S,u,e,shoot);if(v>bv){bv=v;b=e}});return b}
// Siegpunkte, die die aktuelle Aufstellung am Zugende einbrächte (Ziele, Taktikkarten, Wendungskarte)
function vpEst(S,o){const oc0=S.oc.slice(),en0=S.ent?S.ent.slice():null;try{return vpEst2(S,o)}finally{S.oc=oc0;if(en0)S.ent=en0}}
function vpEst2(S,o){updCtrl(S);const a=ctrl(S,o),b=ctrl(S,1-o);let v=(a>=1)+(a>=2)+(a>b);
 (S.P[o].hand||[]).forEach(c=>{try{if(CH[c]&&CH[c](S,o))v++}catch(e){}});try{v+=twVP(S,o)}catch(e){}return v}
function evalPos(S,u,x,y,oc0){const ox=u.x,oy=u.y;u.x=x;u.y=y;S.oc=oc0.slice();const v=vpEst(S,u.o);u.x=ox;u.y=oy;S.oc=oc0.slice();return v}
function cands(S,u,rng){const out=[[u.x,u.y]],add2=(x,y)=>{x=Math.min(W-u.r,Math.max(u.r,x));y=Math.min(H-u.r,Math.max(u.r,y));if(Math.hypot(x-u.x,y-u.y)<=rng+.01)out.push([x,y])};
 for(const k of [1,.75,.5,.25])for(let i=0;i<16;i++){const a=i*Math.PI/8;add2(u.x+Math.cos(a)*rng*k,u.y+Math.sin(a)*rng*k)}
 S.obj.forEach(p=>{const d=Math.hypot(p[0]-u.x,p[1]-u.y);if(d>rng){add2(u.x+(p[0]-u.x)/d*rng,u.y+(p[1]-u.y)/d*rng)}
  else for(const r of [0,1,2,2.8])for(let i=0;i<(r?8:1);i++){const a=i*Math.PI/4;add2(p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r)}});
 foes(S,u).filter(e=>e.x>=0).forEach(e=>{const d=Math.hypot(e.x-u.x,e.y-u.y),m=Math.min(rng,Math.max(0,d-e.r-u.r-.6));add2(u.x+(e.x-u.x)/d*m,u.y+(e.y-u.y)/d*m)});
 for(const [x,y] of [[2.5,u.y],[W-2.5,u.y],[u.x,2.5],[u.x,H-2.5]])add2(x,y);
 return out}
// Plan: bestes Bewegungsziel (Punktzahl, x, y) innerhalb rng; stay=true wenn Stehenbleiben mindestens so gut ist
export function plan(S,u,rng){const oc0=S.oc.slice(),o=u.o,fs=foes(S,u).filter(e=>e.x>=0),unh=S.obj.map((p,k)=>[p,k]).filter(([p,k])=>S.oc[k]!==o);
 const shooter=u.rw.length>0&&!u.rw.every(w=>(w[7]||'').includes('B')&&false);
 const tb=(x,y)=>{const g={...u,x,y};let t=0;const dn=Math.min(...unh.map(([p])=>Math.hypot(p[0]-x,p[1]-y)),99);t-=.03*dn;
  const fd=fs.length?Math.min(...fs.map(e=>dist(g,e))):0;if(shooter){const R=Math.max(...u.rw.filter((w,i)=>!(i==0&&u.rw.length>1&&hasAb(u,'kc_muni')&&has(S.T.moved,u.id))).map(w=>rngOf(S,u,w[1])||0));t-=.03*Math.abs(fd-Math.max(3,R-3))}else t-=.03*fd;
  if(isHero(u)&&!/Monster|Kriegsmaschine/.test(u.kw)){const thr=fs.filter(e=>dist(g,e)<=9&&e.mw.length&&!isHero(e)).length;t-=.15*thr}
  // Gefahr: erwarteter Verlust durch Feinde, die diese Stelle mit Bewegung und Angriff erreichen können
  let dg=0;for(const e of fs){if(!e.mw.length||inCombat(S,e))continue;const d=dist(g,e),reach=mvOf(S,e)+7;if(d>reach)continue;dg+=Math.min(evAtk(S,e,g,false),wnd(u))/Math.max(1,wnd(u))*(d<=reach-3?1:.5)}t-=DANG*dg;return t};
 const C=cands(S,u,rng).map(([x,y])=>({x,y,vp:evalPos(S,u,x,y,oc0)}));S.oc=oc0.slice();
 C.forEach(c=>c.sc=c.vp*10+tb(c.x,c.y));const stay=C[0];C.sort((a,b)=>b.sc-a.sc);
 for(const c of C){if(c.x==u.x&&c.y==u.y)return {sc:c.sc,vp:c.vp,stay:true,base:stay.sc};if(c.sc<=stay.sc+.01)return {sc:stay.sc,vp:stay.vp,stay:true,base:stay.sc};if(!moveErr(S,u,c.x,c.y,rng))return {sc:c.sc,vp:c.vp,x:c.x,y:c.y,base:stay.sc,stay:false}}
 return {sc:stay.sc,vp:stay.vp,stay:true,base:stay.sc}}
const CFG=globalThis.__AI||{};const SMART=CFG.smart??1;export let DANG=CFG.dang??0,ORD=CFG.ord??0;const CN=CFG.cn??0,RUNK=CFG.run??10,SHK=CFG.sh??10;export const setOrd=v=>{ORD=v};export const setDang=v=>{DANG=v};
function aiDest(S,u,rng){const p=plan(S,u,rng);return p.stay?null:{x:p.x,y:p.y}}
// Angriffsziel: wo lohnt sich ein Angriff?
// Wahrscheinlichkeit, mit 2W6 (+Modifikator) mindestens n zu werfen
const P2=[1,1,1,35/36,33/36,30/36,26/36,21/36,15/36,10/36,6/36,3/36,1/36,0];
export const pChg=(n,mod=0)=>{const k=Math.ceil(n-mod-1e-9);return k<=2?1:k>12?0:P2[k]};
function chargeTgt(S,u){const c=foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=12);let b=null,bv=-1e9;const mod=fxSum(S,u,'chg')||0;
 c.forEach(e=>{const mine=evAtk(S,u,e,false),back=evAtk(S,e,u,false),p=pChg(dist(u,e)-.5,mod),gain=Math.min(mine,wnd(e))-.6*Math.min(back,wnd(u))+(onObj(S,e)?2:0)+(mine>=wnd(e)*.9?wnd(e)*.5:0),v=p*gain-(1-p)*.4;if(v>bv){bv=v;b=e}});
 return b?{e:b,v:bv}:null}

function aiAct(G,rnd){const S=G.S,o=S.act,ph=S.ph;
 if(ph==0){const r=inRsv(S,o).find(x=>x.rph===0&&S.round>=x.rr&&!has(S.Ph.aiDone,'r'+x.id));if(r){add(S.Ph.aiDone,'r'+r.id);return {a:'rsv:'+r.id}}}
 if(ph==0||ph==6)return {a:'next'};
 if(ph==1){const ab=abAI(S,o);if(ab&&!has(S.Ph.aiDone,'ab'+JSON.stringify(ab))){add(S.Ph.aiDone,'ab'+JSON.stringify(ab));if(!actCheck(S,o,ab))return ab}return {a:'next'}}
 const ab=abAI(S,o);if(ab&&!has(S.Ph.aiDone,'ab'+JSON.stringify(ab))){add(S.Ph.aiDone,'ab'+JSON.stringify(ab));if(!actCheck(S,o,ab))return ab}
 if(ph==2){const r=inRsv(S,o).find(x=>x.rph!==0&&S.round>=x.rr&&!has(S.Ph.aiDone,'r'+x.id)&&!(x.lim&&usedKey(S,o+':ank','turn')));if(r){add(S.Ph.aiDone,'r'+r.id);return {a:'rsv:'+r.id}}}
 const mine=S.U.filter(x=>x.o==o&&x.x>=0);
 if(ph==4){ // stärkste Angriffsgelegenheit zuerst
  const forced=mine.find(u=>hasAb(u,'ss_wahn')&&!has(S.Ph.used,u.id)&&!inCombat(S,u)&&foes(S,u).some(e=>e.x>=0&&dist(u,e)<=12));
  if(forced){const a2={a:'charge',u:forced.id};if(!actCheck(S,o,a2))return a2}
  let best=null;for(const u of mine){if(has(S.Ph.aiDone,u.id)||inCombat(S,u))continue;const t=chargeTgt(S,u);if(!t)continue;
   const shootier=u.rw.length&&evAtk(S,u,t.e,true)>evAtk(S,u,t.e,false)*1.2&&!(u.mw.length&&evAtk(S,u,t.e,false)>=wnd(t.e)*.5);
   const need=shootier?3:(u.gen||isHero(u)&&u.mw.length&&evAtk(S,u,t.e,false)<wnd(t.e)*.4?1.5:0);
   if(t.v>need+CN&&(!best||t.v>best.v))best={u,v:t.v}}
  for(const u of mine)if(!has(S.Ph.aiDone,u.id)&&!(best&&best.u===u))add(S.Ph.aiDone,u.id);
  if(best){add(S.Ph.aiDone,best.u.id);const a={a:'charge',u:best.u.id};if(!actCheck(S,o,a))return a}
  return {a:'next'}}
 let ord=mine;
 if(ph==2&&ORD){// wer am meisten gewinnt, zieht zuerst
  const sc=new Map();for(const u of mine){if(has(S.Ph.aiDone,u.id)||inCombat(S,u))continue;const p=plan(S,u,mvOf(S,u));sc.set(u,p.stay?-1e9:p.sc-p.base)}
  ord=[...mine].sort((a,b)=>(sc.has(b)?sc.get(b):-2e9)-(sc.has(a)?sc.get(a):-2e9))}
 for(const u of ord){
  if(has(S.Ph.aiDone,u.id))continue;add(S.Ph.aiDone,u.id);
  const c=inCombat(S,u),fl=foes(S,u).filter(x=>x.x>=0),e=nearest(u,fl);if(!e)continue;let a=null;
  if(ph==5&&u.ab=='md'&&c)a={a:'md',u:u.id};
  else if(ph==5&&u.ab=='fa'&&u.n<u.nmax)a={a:'fa',u:u.id};
  else if(ph==2&&!c){
   const mv=mvOf(S,u),pm=plan(S,u,mv),inShoot=u.rw.length&&fl.some(f=>dist(u,f)<=rngOf(S,u,u.rw[0][1])-1&&!blk(S,u,f)&&!hidden(S,u,f));
   const goal=Math.min(...fl.map(f=>dist(u,f)),...S.obj.filter((p,k)=>S.oc[k]!==o).map(p=>Math.hypot(p[0]-u.x,p[1]-u.y)),99);
   if(!u.rw.length||!inShoot){const pr2=plan(S,u,mv+3.5);
    if(pr2.sc>=pm.sc+RUNK&&!u.rw.some(w=>!(w[7]||'').includes('B')&&dist(u,e)<=rngOf(S,u,w[1])+mv)||(!u.rw.length&&goal>mv+4&&!pm.stay&&pr2.sc>=pm.sc-.5))a={a:'run',u:u.id};
    else if(!pm.stay)a={a:'move',u:u.id,x:pm.x,y:pm.y}}
   else if(!pm.stay&&pm.vp*10>pm.base-1&&pm.sc>=pm.base+SHK)a={a:'move',u:u.id,x:pm.x,y:pm.y}}
  else if(ph==3&&u.rw.length){const R=Math.max(...u.rw.filter((w,i)=>!(i==0&&u.rw.length>1&&hasAb(u,'kc_muni')&&has(S.T.moved,u.id))).map(w=>rngOf(S,u,w[1])||0));const tg=fl.filter(f=>dist(u,f)<=R&&!blk(S,u,f)&&!shB(S,u,f)&&!hidden(S,u,f));const t=bestTgt(S,u,tg,true);if(t)a={a:'shoot',u:u.id,t:t.id}}
  if(a&&!actCheck(S,o,a))return a}
 return {a:'next'}}

// Auswahl aus Einheiten oder Zielen (Fähigkeiten, Wendungskarten): sinnvoll statt zufällig
function smartPick(S,req){const V=req.vals;if(!V||!V.length)return null;const who=req.who,N=ONM(S)||[],t=req.title||'';
 const idx=req.opts.map((o,i)=>o.dis?-1:i).filter(i=>i>=0);if(!idx.length)return null;
 const unitOf=i=>{const v=V[i];if(v&&typeof v=='object'&&v.u!=null)return byId(S,v.u);if(typeof v=='number'){const u=byId(S,v);if(u&&String(req.opts[i].t).startsWith(u.name))return u}return null};
 const objOf=i=>{const v=V[i];return typeof v=='number'&&v>=0&&v<S.obj.length&&req.opts[i].t===N[v]?v:null};
 if(idx.every(i=>unitOf(i))){const sc=i=>{const u=unitOf(i);if(u.x<0)return -1;const on=S.obj.some(p=>ct(u,p));
   if(u.o!==who){const mine=S.U.filter(x=>x.o===who&&x.x>=0),dn=mine.length?Math.min(...mine.map(x=>dist(u,x))):99;
    return (on?3:0)+(isHero(u)?1.5:0)+(dn<=12?1.5:0)+Math.min(4,Math.max(0,...mine.map(x=>evAtk(S,u,x,false)))/2)-dn*.03}
   if(/Heil|heil|Jadeschauer/.test(t))return u.dmg;
   const fl=foes(S,u).filter(e=>e.x>=0),dn=fl.length?Math.min(...fl.map(e=>dist(u,e))):99;
   return (inCombat(S,u)?3:0)+(dn<=12?2:0)+(on?1:0)+Math.max(0,...fl.map(e=>evAtk(S,u,e,false)))/3};
  return idx.reduce((b,i)=>sc(i)>sc(b)?i:b,idx[0])}
 if(idx.every(i=>objOf(i)!=null)){const mg=k=>{const p=S.obj[k];let m=0;S.U.forEach(u=>{if(u.x<0)return;const d=Math.max(0,Math.hypot(u.x-p[0],u.y-p[1])-u.r-OR(p));if(d>8)return;m+=(u.o===who?1:-1)*(u.cv||1)*u.n**.5*(d<=0?1.5:1-d/10)});return m};
  const tw=(S.TW||{}).id,neg=/Overpowering|Grief|Bombardment/.test(t)||(/Wendungskarte: Ziel/.test(t)&&tw=='rf');
  return idx.reduce((b,i)=>{const v=neg?-mg(objOf(i)):mg(objOf(i)),w=neg?-mg(objOf(b)):mg(objOf(b));return v>w?i:b},idx[0])}
 return null}
export function aiAnswer(G,req,rnd=Math.random){const S=G.S,pick=n=>Math.floor(rnd()*n);
 switch(req.t){
  case 'info':return true;
  case 'choice':{if(/Regimentsfähigkeit|Verbesserung des Generals/.test(req.title||'')){const ok=req.opts.map((x,i)=>/noch ohne Wirkung/.test(x.s||'')?-1:i).filter(i=>i>=0);if(ok.length)return ok[pick(ok.length)]}if(req.pref!=null&&!req.opts[req.pref].dis)return req.pref;if(SMART){const sp=smartPick(S,req);if(sp!=null)return sp}const ok=req.opts.map((x,i)=>x.dis?-1:i).filter(i=>i>=0);return ok[pick(ok.length)]}
  case 'place':{if(['rsv','amb','repl','rep6','rein','rein9','repl13','shadow'].includes(req.kind)){const o=req.who,un=S.obj.map((p,k)=>[p,k]).filter(([p,k])=>S.oc[k]!==o).map(([p])=>p),tg=un.length?un:S.obj;let best=null,bv=-1e9;
   for(let x=1;x<W;x+=1)for(let y=1;y<H;y+=1){const r={x:x+rnd()*.4-.2,y:y+rnd()*.4-.2,a:0};if(req.check(r))continue;const v=-Math.min(...tg.map(p=>Math.hypot(p[0]-r.x,p[1]-r.y)))+rnd()*.5;if(v>bv){bv=v;best=r}}
   if(best)return best;if(req.cancel)return {cancel:true}}
  if(req.kind=='dep'){const o=req.who,u0=req.u,val=[];for(let x=.5;x<W;x+=.5)for(let y=.5;y<H;y+=.5){const r={x,y,a:0};if(!req.check(r))val.push(r)}
   if(val.length){const cnt=S.obj.map(()=>0);S.U.filter(u=>u.o==o&&u.x>=0).forEach(u=>{let b=0,bd=1e9;S.obj.forEach((p,k)=>{const d=Math.hypot(p[0]-u.x,p[1]-u.y);if(d<bd){bd=d;b=k}});cnt[b]++});
    const rems=S.U.filter(u=>u.o==o&&u.x<0&&!u.rsv&&u!==u0&&u.M).sort((a,b)=>b.M.length*b.M[0].l*b.M[0].w-a.M.length*a.M[0].l*a.M[0].w);
    // bleibt nach der Aufstellung noch Platz für alle übrigen Einheiten (größte zuerst, gierig)?
    const fits=r=>{if(!rems.length)return true;const us=[u0,...rems],sv=us.map(u=>({x:u.x,y:u.y,r:u.r,M:u.M&&u.M.map(m=>({...m}))}));
     const put=(u,x,y)=>{const Pf=depForm(S,o,u,x,y);if(Pf)setAbsM(u,Pf);else{u.x=x;u.y=y}};
     try{put(u0,r.x,r.y);for(const u of rems){let ok=false;for(let x=.5;x<W&&!ok;x+=1)for(let y=.5;y<H&&!ok;y+=1)if(!placeErr(S,'dep',o,u,x,y,0)||!placeErr(S,'dep',o,u,x,y,Math.PI/2)){put(u,x,y);ok=true}if(!ok)return false}return true}
     finally{us.forEach((u,i)=>{u.x=sv[i].x;u.y=sv[i].y;u.r=sv[i].r;if(sv[i].M)u.M=sv[i].M})}};
    const ord=S.obj.map((p,k)=>({k,c:cnt[k]*3+Math.min(...val.map(r=>Math.hypot(p[0]-r.x,p[1]-r.y)))*.5+rnd()*.3})).sort((a,b)=>a.c-b.c);
    for(const {k} of ord.slice(0,3)){const p=S.obj[k],c=val.map(r=>[Math.hypot(p[0]-r.x,p[1]-r.y)+rnd()*.05,r]).sort((a,b)=>a[0]-b[0]);if(fits(c[0][1]))return c[0][1]}
    {const sm=val.map(r=>[rnd(),r]).sort((a,b)=>a[0]-b[0]).slice(0,80);for(const [,r] of sm)if(fits(r))return r}}
   {let best=null,bv=-1e9;const dx=rnd()<.5?1:-1;for(const r of val){const v=into(S,o,r.x,r.y)*10+(dx>0?r.x:W-r.x)*.02+rnd()*.05;if(v>bv){bv=v;best=r}}if(best)return best}}
  if(req.kind=='terr'){const cs=[];for(let k=0;k<6000&&cs.length<70;k++){const r={x:1+rnd()*(W-2),y:1+rnd()*(H-2),a:[0,Math.PI/2,0.6435,-0.6435][k%4]};if(!req.check(r))cs.push(r)}
   let best=null,bv=-1e9;for(const r of cs){const t={x:r.x,y:r.y,w:req.u.w||5,h:req.u.h||1.8,a:r.a,big:!!req.u.big,k:'obst',ht:2};S.ter.push(t);let rem=0;const nx=req.u.big?(req.u.w?{w:4,h:0.8}:{big:false}):null;if(nx)for(let x=1;x<W;x+=1)for(let y=1;y<H;y+=1)for(const aa of [0,Math.PI/2])if(!placeErr(S,'terr',req.who,nx,x,y,aa)){rem++;break}S.ter.pop();const v=rem+rnd()*2;if(v>bv){bv=v;best=r}}
   if(best)return best}
  if(req.kind=='icon'){let best=null,bv=-1e9;for(let k=0;k<2500;k++){const r={x:1+rnd()*(W-2),y:1+rnd()*(H-2),a:0};if(req.check(r))continue;const v=Math.hypot(r.x-W/2,r.y-H/2)+rnd()*.4;if(v>bv){bv=v;best=r}}if(best)return best}
  for(let k=0;k<6000;k++){let x=1+rnd()*(W-2),y=1+rnd()*(H-2);const md=k%3;if(md==1){const e=pick(4);if(e==0)x=rnd()*4;else if(e==1)x=W-rnd()*4;else if(e==2)y=rnd()*4;else y=H-rnd()*4}else if(md==2){x=rnd()<.5?rnd()*7:W-rnd()*7;y=rnd()<.5?rnd()*7:H-rnd()*7}const a=rnd()*Math.PI,r={x,y,a};if(!req.check(r))return r}for(let x=.5;x<W;x+=.5)for(let y=.5;y<H;y+=.5)for(const a of [0,Math.PI/2]){const r={x,y,a};if(!req.check(r))return r}return {cancel:true}}
  case 'dest':{const u=byId(S,req.u),q=u&&(req.chg?chargeDest(S,u,req.roll):req.pile?null:aiDest(S,u,req.rng));return q||{stay:true}}
  case 'tgt':{const u=byId(S,req.u),c=chargeTgt(S,u),e=c?c.e:nearest(u,foes(S,u).filter(x=>x.x>=0));return e?{t:e.id}:{cancel:true}}
  case 'fight':{let bu=null,bt=null,bv=-1e9;for(const u of eligF(S,req.who).filter(x=>sfOK(S,x)&&(!S.Ph.fs.bote||x.dn=='Dämonetten'))){const all0=foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR),all1=all0.filter(e=>!shB(S,u,e)),all=all1.length?all1:all0,only=fxL(S,u,'only').filter(f=>all.some(e=>e.id==f.v)),inr=all.filter(e=>!only.length||e.id==only[0].v),t=bestTgt(S,u,inr,false),v=t?tgtValue(S,u,t,false)-.3*tgtValue(S,t,u,false):-1e8;if(!bu||v>bv){bu=u;bt=t;bv=v}}return {a:'fight',u:bu.id,t:bt?bt.id:null}}
  case 'act':return aiAct(G,rnd)}
 throw new Error('KI: unbekannte Anfrage '+req.t)}

// Notausgang: falls die Antwort der KI abgelehnt wird (Voraussetzungen haben sich unerwartet geändert), werden einfache gültige Antworten durchprobiert,
// damit das Spiel weiterläuft. Liefert eine Liste von Kandidaten.
export function aiFallback(G,q){const S=G.S,L=[];
 if(q.t=='act')L.push({a:'next'});
 else if(q.t=='fight'){for(const u of eligF(S,q.who)){for(const e of foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR))L.push({a:'fight',u:u.id,t:e.id});L.push({a:'fight',u:u.id,t:null})}}
 else if(q.t=='choice'){(q.opts||[]).forEach((o,i)=>{if(!o.dis)L.push(i)});L.push(0)}
 else if(q.t=='info')L.push(true);
 else if(q.t=='dest')L.push({stay:true});
 else if(q.t=='place'||q.t=='tgt'||q.t=='split'){L.push({cancel:true});L.push({stay:true});L.push(null)}
 return L}
