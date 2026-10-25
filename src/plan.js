// Automatische Formationen: Nachrücken-Optionen und Angriffsformationen. Reine Funktionen auf dem Zustand;
// jedes Ergebnis wird mit den Regelprüfungen (pileModelErr / chargeModelErr) bestätigt, sonst null.
import {abs,mgap,mDistPt} from './models.js';
import {ptDist,W,H,noStand} from './geom.js';
import {foes,pileErr,pileModelErr,chargeModelErr,chargeSnap,overlapErr} from './rules.js';

const D=Math.PI/180;
const gapB=(m,B)=>{let g=1e9;for(const q of B){const v=mgap(m,q);if(v<g)g=v}return g};
const cp=P=>P.map(p=>[p[0],p[1]]);
const toP=A=>A.map(m=>[m.x,m.y]);
const shape=(m,x,y)=>({x,y,a:m.a,l:m.l,w:m.w});

// nächstes Missionsziel zu einem Punkt
export const nearObj=(S,x,y,maxD=1e9)=>{let b=null,bd=maxD;S.obj.forEach((p,k)=>{const d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;b=p}});return b};
// Geländekante nächste zu einem Modell (Abstand der Basis)
const terD=(S,m)=>{let d=6;for(const t of S.ter){const v=ptDist(t,m.x,m.y)-m.w/2;if(v<d)d=Math.max(0,v)}return d};

// Einzelmodell-Wertung je Option: tg = Gegner, ob = Missionsziel, te = Gelände
function scorer(S,B,o,opt){
 return (m)=>{let s=0;
  if(opt.tg){const g=B?gapB(m,B):0;s+=(g<=3?3:0)-.3*Math.max(0,g)}
  if(opt.ob&&o){const d=mDistPt(m,o[0],o[1]);s+=(d<=3?3:0)-.3*Math.max(0,d)}
  if(opt.te)s-=.5*terD(S,m);
  return s}}

// Koordinatenaufstieg: jedes Modell einzeln verbessern, solange die Regelprüfung ok ist
function climb(P0,A,fm,ok,lim,steps=[2,1,.5,.25],passes=3){
 let P=cp(P0);const n=P.length,sh=i=>shape(A[i],P[i][0],P[i][1]);
 for(let ps=0;ps<passes;ps++){let imp=false;
  for(let i=0;i<n;i++){const base=fm(sh(i)),C=[];
   for(const s of steps)for(let k=0;k<16;k++){const x=P[i][0]+Math.cos(k*22.5*D)*s,y=P[i][1]+Math.sin(k*22.5*D)*s;
    if(Math.hypot(x-A[i].x,y-A[i].y)>lim+1e-9)continue;
    const g=fm(shape(A[i],x,y))-base;if(g>1e-6)C.push([g,x,y])}
   C.sort((a,b)=>b[0]-a[0]);
   for(const [g,x,y] of C.slice(0,6)){const Q=cp(P);Q[i]=[x,y];if(ok(Q)){P=Q;imp=true;break}}}
  if(!imp)break}
 return P}

// ---------- Nachrücken ----------
// opt: {tg,ob,te}. Ergebnis: Positionen je Modell oder null
export function pileAuto(S,u,t,opt){
 if(!opt.tg&&!opt.ob&&!opt.te)opt={tg:1};
 const A=abs(u),B=abs(t),o=opt.ob?nearObj(S,u.x,u.y,16):null,fm=scorer(S,B,o,opt),ok=P=>!pileModelErr(S,u,t,P);
 const tot=P=>P.reduce((s,p,i)=>s+fm(shape(A[i],p[0],p[1])),0);
 let best=toP(A),bs=tot(best),found=false;
 // starre Verschiebungen als Startpunkte
 for(let dx=-3;dx<=3.001;dx+=.5)for(let dy=-3;dy<=3.001;dy+=.5){if(Math.hypot(dx,dy)>3)continue;
  const P=A.map(m=>[m.x+dx,m.y+dy]),sc=tot(P);if(found&&sc<=bs)continue;
  if(!pileErr(S,u,t,u.x+dx,u.y+dy)&&ok(P)){best=P;bs=sc;found=true}}
 const P=climb(best,A,fm,ok,3);
 const fin=ok(P)?P:(found?best:null);
 if(!fin)return null;
 const moved=fin.some((p,i)=>Math.hypot(p[0]-A[i].x,p[1]-A[i].y)>.05);
 return moved?fin:null}

// ---------- Angriff ----------
const slotOK=(S,u,m)=>{if(m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2)return false;
 if(S.ter.some(t=>noStand(t)&&ptDist(t,m.x,m.y)<m.l/2-.02))return false;
 for(const v of S.U){if(v===u||v.x<0||!v.M)continue;if(Math.hypot(v.x-m.x,v.y-m.y)>v.r+m.l/2+.5)continue;if(abs(v).some(q=>mgap(m,q)<0))return false}return true};

// Ring um den Feind: Punkte, an denen ein Modell mit Abstand off zum Feind steht
function ring(S,u,B,tc,off,mw,r0){const out=[];
 for(let k=0;k<72;k++){const a=k*5*D;let hit=null;
  for(let rho=r0+mw.l+3;rho>=0;rho-=.1){const m=shape(mw,tc.x+Math.cos(a)*rho,tc.y+Math.sin(a)*rho),g=gapB(m,B);if(g<off){break}hit=[m.x,m.y]}
  if(hit){const m=shape(mw,hit[0],hit[1]);if(slotOK(S,u,m))out.push({a,x:hit[0],y:hit[1]})}}
 return out}
const thin=(sl,sp)=>{const o=[];for(const s of sl){if(o.every(q=>Math.hypot(q.x-s.x,q.y-s.y)>=sp))o.push(s)}return o};

// Zuordnung Modell -> Platz, nächstgelegene zuerst; übrige Modelle werden dicht an bereits gesetzten Modellen platziert
function assign(S,u,A,B,slots,roll){const used=new Set(),P=Array(A.length).fill(null);
 const order=slots.map((s,k)=>[Math.min(...A.map(m=>Math.hypot(m.x-s.x,m.y-s.y))),k]).sort((a,b)=>a[0]-b[0]);
 for(const [,k] of order){const s=slots[k];let bi=-1,bd=1e9;A.forEach((m,i)=>{if(used.has(i))return;const d=Math.hypot(m.x-s.x,m.y-s.y);if(d<bd&&d<=roll){bd=d;bi=i}});if(bi>=0){used.add(bi);P[bi]=[s.x,s.y]}}
 const left=A.map((m,i)=>i).filter(i=>!P[i]).sort((a,b)=>gapB(A[a],B)-gapB(A[b],B));
 for(const i of left){const placed=P.map((p,j)=>p&&shape(A[j],p[0],p[1])).filter(Boolean);if(!placed.length)return null;let best=null,bg=1e9;
  for(const q of placed)for(let k=0;k<24;k++){const d=A[i].w/2+q.w/2+.06,x=q.x+Math.cos(k*15*D)*d,y=q.y+Math.sin(k*15*D)*d,m=shape(A[i],x,y);
   if(Math.hypot(x-A[i].x,y-A[i].y)>roll||!slotOK(S,u,m)||placed.some(p=>mgap(m,p)<0)||B.some(e=>mgap(m,e)<0))continue;
   const g=gapB(m,B);if(g<bg){bg=g;best=[x,y]}}
  if(!best)return null;P[i]=best}
 return P}

function planWrap(S,u,t,roll,A,B){
 const mw=A[0],r=Math.max(...A.map(m=>Math.max(m.w,m.l||m.w)/2)),tc={x:t.x,y:t.y},reach=s=>A.some(m=>Math.hypot(m.x-s.x,m.y-s.y)<=roll*.98);
 const r1=thin(ring(S,u,B,tc,.02,mw,t.r),2*r+.04).filter(reach).map(s=>({...s,ang:Math.atan2(s.y-tc.y,s.x-tc.x)})).sort((a,b)=>a.ang-b.ang),m=r1.length;
 if(!m)return null;
 let s0=0,bd=1e9;r1.forEach((s,i)=>{const d=Math.hypot(s.x-u.x,s.y-u.y);if(d<bd){bd=d;s0=i}});
 // zusammenhängender Bogen: abwechselnd links und rechts vom nächsten Platz
 const slots=[],seen=new Set();for(let k=0;slots.length<Math.min(A.length,m)&&k<2*m;k++){const i=((s0+(k%2?-Math.ceil(k/2):Math.ceil(k/2)))%m+m)%m;if(!seen.has(i)){seen.add(i);slots.push(r1[i])}}
 if(slots.length<A.length){const ex=thin(ring(S,u,B,tc,2*r+.08,mw,t.r),2*r+.04).filter(s=>reach(s)&&slots.every(q=>Math.hypot(q.x-s.x,q.y-s.y)>=2*r+.04)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y));
  slots.push(...ex.slice(0,A.length-slots.length))}
 if(!slots.length)return null;
 return assign(S,u,A,B,slots,roll)}

function planStretch(S,u,t,roll,A,B,o){
 const r=Math.max(...A.map(m=>m.w/2)),n=A.length,coh=u.coh||1,two=n>=7;let best=null,bs=-1e9;
 const anchors=ring(S,u,B,{x:t.x,y:t.y},.02,A[0],t.r).filter(s=>A.some(m=>Math.hypot(m.x-s.x,m.y-s.y)<=roll));
 for(const an of anchors){
  for(let th=0;th<360;th+=15){const dir=[Math.cos(th*D),Math.sin(th*D)],nor=[-dir[1],dir[0]];
   for(let sp=2*r+.9*coh;sp>=2*r+.1;sp-=.3){
    const slots=[];for(let j=0;slots.length<n;j++){slots.push({x:an.x+dir[0]*j*sp,y:an.y+dir[1]*j*sp});if(two&&slots.length<n)slots.push({x:an.x+dir[0]*j*sp+nor[0]*sp,y:an.y+dir[1]*j*sp+nor[1]*sp})}
    if(!slots.every(s=>slotOK(S,u,shape(A[0],s.x,s.y))))continue;
    const ps=A.map(m=>m);const sorted=slots.slice();
    // Modelle nach Lage entlang der Richtung sortieren und den Plätzen in dieser Reihenfolge zuordnen
    const idx=A.map((m,i)=>i).sort((a,b)=>(A[a].x*dir[0]+A[a].y*dir[1])-(A[b].x*dir[0]+A[b].y*dir[1]));
    const P=Array(n);idx.forEach((i,k)=>{P[i]=[sorted[k].x,sorted[k].y]});
    if(chargeModelErr(S,u,P,roll))continue;
    const reach=P.filter((p,i)=>gapB(shape(A[i],p[0],p[1]),B)<=3).length,len=sp*Math.ceil(n/(two?2:1));
    const ob=o?Math.min(...P.map((p,i)=>mDistPt(shape(A[i],p[0],p[1]),o[0],o[1]))):0;
    const sc=reach*10+len-(o?ob*.3:0);if(sc>bs){bs=sc;best=P}
    break}}}
 return best}

// kind: 'reach' | 'obj' | 'wrap' | 'stretch'. Ergebnis {P} oder {err}
export function chargePlan(S,u,t,roll,kind){
 const A=abs(u),B=abs(t);
 const o=kind=='obj'?(nearObj(S,t.x,t.y,t.r+roll+6)||nearObj(S,u.x,u.y,roll+u.r+8)):nearObj(S,t.x,t.y,t.r+roll+6);
 let P=null;
 if(kind=='wrap')P=planWrap(S,u,t,roll,A,B);
 else if(kind=='stretch')P=planStretch(S,u,t,roll,A,B,o);
 else{
  const opt=kind=='obj'?{tg:1,ob:1}:{tg:1},fm=kind=='obj'?((m)=>{const d=o?mDistPt(m,o[0],o[1]):9,g=gapB(m,B);return (d<=3?4:0)-.4*Math.max(0,d)+(g<=3?1:0)-.05*Math.max(0,g)}):scorer(S,B,o,opt);
  if(kind=='obj'&&!o)return {err:'Kein Missionsziel in Reichweite'};
  const tot=Q=>Q.reduce((s,p,i)=>s+fm(shape(A[i],p[0],p[1])),0);
  const starts=[];
  for(let k=0;k<24;k++){const q=chargeSnap(S,u,t,k*15*D,roll);if(!q)continue;const Pq=A.map(m=>[m.x+(q.x-u.x),m.y+(q.y-u.y)]);if(!chargeModelErr(S,u,Pq,roll))starts.push([tot(Pq),Pq])}
  starts.sort((a,b)=>b[0]-a[0]);
  let bestS=-1e9;
  for(const [,P0] of starts.slice(0,3)){const Q=climb(P0,A,fm,Pq=>!chargeModelErr(S,u,Pq,roll),roll),sc=tot(Q);if(!chargeModelErr(S,u,Q,roll)&&sc>bestS){bestS=sc;P=Q}}
 }
 if(P&&chargeModelErr(S,u,P,roll)&&(kind=='wrap'||kind=='stretch'))P=null;
 if(!P&&(kind=='wrap'||kind=='stretch')){const r=chargePlan(S,u,t,roll,'reach');if(r.P)return {P:r.P,note:(kind=='wrap'?'Rund um den Feind':'In die Länge ziehen')+' ist hier nicht regelkonform möglich – stattdessen maximale Reichweite'}}
 if(!P)return {err:kind=='wrap'?'Rund um den Feind ist nicht genug Platz oder er ist zu weit weg':kind=='stretch'?'In die Länge ziehen ist hier nicht möglich':'Dieser Gegner ist mit dem Wurf nicht erreichbar'};
 if(chargeModelErr(S,u,P,roll))return {err:'Formation nicht erlaubt: '+chargeModelErr(S,u,P,roll)};
 return {P}}
