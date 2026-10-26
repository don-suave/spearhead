// Modellebene: Basen (rund/oval als „Kapsel“), Formationen, Zusammenhalt, Verluste.
// Ein Modell ist {dx,dy,a,l,w}: Offset zum Einheiten-Mittelpunkt (u.x,u.y = Schwerpunkt), Winkel, Länge, Breite (Zoll).
// Dadurch bewegt sich jede Einheit mit u.x/u.y automatisch starr mit all ihren Modellen.
import {into,W,H} from './geom.js';
export const MM=25.4,GAP=.15;
export function parseBase(b){const p=String(b||'25').split('x'),a=parseFloat(p[0])||25,c=parseFloat(p[1]);const bb=isNaN(c)?a:c;return {l:Math.max(a,bb)/MM,w:Math.min(a,bb)/MM}}
// Formation: Raster, letzte Reihe zentriert, erstes Modell (Anführer) vorne links/mitte
// Reihenraster nach echten Basisgrößen: große Basen zuerst, je Reihe `per` Modelle, Reihen zentriert.
// flat: Basen quer (Längsachse entlang y). Liefert Offsets in der Reihenfolge der Eingabe (Index bleibt erhalten).
export function gridPos(bases,per,flat=false){const n=bases.length,id=bases.map((b,i)=>i),sz=b=>flat?b.w:b.l,dp=b=>flat?b.l:b.w;
 const ord=id.slice().sort((i,j)=>(i==0?-1:j==0?1:0)||Math.max(bases[j].l,bases[j].w)-Math.max(bases[i].l,bases[i].w)||i-j);
 const rows=[];for(let k=0;k<n;k+=per)rows.push(ord.slice(k,k+per));
 const dmax=rows.map(r=>Math.max(...r.map(i=>dp(bases[i])))),R=[];let y=0;
 rows.forEach((r,ri)=>{if(ri)y+=(dmax[ri-1]+dmax[ri])/2+GAP;let x=0;const xs=[];r.forEach((i,ci)=>{if(ci)x+=(sz(bases[r[ci-1]])+sz(bases[i]))/2+GAP;xs.push(x)});const mid=(xs[0]+xs[xs.length-1])/2;r.forEach((i,ci)=>{R[i]={dx:xs[ci]-mid,dy:y,a:flat?Math.PI/2:0}})});
 return center(R.map((m,i)=>({...m,l:bases[i].l,w:bases[i].w})))}
export function layout(bases){const n=bases.length;if(n==1)return [{dx:0,dy:0,a:0,...bases[0]}];
 let best=null,bk=1e9;
 for(let cols=1;cols<=n;cols++){const M=gridPos(bases,cols,false),bad=cohBad(M.map(m=>({x:m.dx,y:m.dy,a:m.a,l:m.l,w:m.w})),.5).length,R=radius(M)+(cols<2&&n>1?.5:0)+(cols>n/1.5?.3:0),k=bad*100+R;if(k<bk-1e-6){bk=k;best=M}}
 return best}
export function center(M){const cx=M.reduce((s,m)=>s+m.dx,0)/M.length,cy=M.reduce((s,m)=>s+m.dy,0)/M.length;M.forEach(m=>{m.dx-=cx;m.dy-=cy});return M}
export const radius=M=>Math.max(...M.map(m=>Math.hypot(m.dx,m.dy)+m.l/2));
export function buildM(d,n){const bs=d.bs?d.bs.map(parseBase):Array(n).fill(parseBase(d.b));while(bs.length<n)bs.push(bs[bs.length-1]);return layout(bs.slice(0,n))}
// absolute Modellpositionen
export const abs=u=>u.M.map(m=>({x:u.x+m.dx,y:u.y+m.dy,a:m.a,l:m.l,w:m.w}));
const segD=(ax,ay,bx,by,cx,cy,dx,dy)=>{ // Abstand zweier Strecken
 const pd=(px,py,x1,y1,x2,y2)=>{const vx=x2-x1,vy=y2-y1,L=vx*vx+vy*vy,t=L?Math.max(0,Math.min(1,((px-x1)*vx+(py-y1)*vy)/L)):0;return Math.hypot(px-x1-vx*t,py-y1-vy*t)};
 const cr=(x1,y1,x2,y2,x3,y3,x4,y4)=>{const d=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3);if(!d)return false;const t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/d,s=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/d;return t>=0&&t<=1&&s>=0&&s<=1};
 if(cr(ax,ay,bx,by,cx,cy,dx,dy))return 0;
 return Math.min(pd(ax,ay,cx,cy,dx,dy),pd(bx,by,cx,cy,dx,dy),pd(cx,cy,ax,ay,bx,by),pd(dx,dy,ax,ay,bx,by))};
export function mgap(a,b){const ha=(a.l-a.w)/2,hb=(b.l-b.w)/2,ca=Math.cos(a.a),sa=Math.sin(a.a),cb=Math.cos(b.a),sb=Math.sin(b.a);
 return segD(a.x-ha*ca,a.y-ha*sa,a.x+ha*ca,a.y+ha*sa,b.x-hb*cb,b.y-hb*sb,b.x+hb*cb,b.y+hb*sb)-a.w/2-b.w/2}
// Abstand zweier Einheiten (Rand zu Rand, kürzester Modellabstand); ohne Modelle: Kreise
export function udist(a,b){const c=Math.hypot(a.x-b.x,a.y-b.y)-a.r-b.r;if(!a.M||!b.M||c>12)return c;
 const A=abs(a),B=abs(b);let d=1e9;for(const p of A)for(const q of B){if(Math.hypot(p.x-q.x,p.y-q.y)-p.l/2-q.l/2>d)continue;const g=mgap(p,q);if(g<d)d=g}return d}
// Modelle von u (absolut), die höchstens rg Zoll von der Einheit t entfernt sind
export function inRange(u,t,rg){if(!u.M||!t.M)return u.n;const B=abs(t);return abs(u).filter(p=>B.some(q=>mgap(p,q)<=rg)).length}
// Zusammenhalt: 1–6 Modelle brauchen 1 Nachbarn in 1", ab 7 Modellen 2 Nachbarn
export function cohBad(P,rg=1){const need=P.length>=7?2:1;if(P.length<2)return [];return P.map((p,i)=>P.reduce((s,q,j)=>s+(i!=j&&mgap(p,q)<=rg?1:0),0)<need?i:-1).filter(i=>i>=0)}
export const cohOK=(P,rg=1)=>cohBad(P,rg).length==0;
// u vollständig innerhalb von rg Zoll um die Einheit v (jedes Modell von u nah an irgendeinem Modell von v)
export function wholly(u,v,rg){if(!u.M||!v.M)return Math.hypot(u.x-v.x,u.y-v.y)-v.r<=rg;const B=abs(v);return abs(u).every(p=>B.some(q=>mgap(p,q)<=rg))}
// Modelle bis p von einem Punkt (Ziel) entfernt
export const mDistPt=(m,x,y)=>{const h=(m.l-m.w)/2,ca=Math.cos(m.a),sa=Math.sin(m.a),x1=m.x-h*ca,y1=m.y-h*sa,x2=m.x+h*ca,y2=m.y+h*sa,vx=x2-x1,vy=y2-y1,L=vx*vx+vy*vy,t=L?Math.max(0,Math.min(1,((x-x1)*vx+(y-y1)*vy)/L)):0;return Math.hypot(x-x1-vx*t,y-y1-vy*t)-m.w/2};
// Abstand der Einheit (Rand der nächsten Basis) zu einer Spielfeldkante: e 0 oben, 1 rechts, 2 unten, 3 links
export const edgeD=(u,e)=>{const M=u.M&&u.M.length?abs(u):[{x:u.x,y:u.y,a:0,l:2*u.r,w:2*u.r}];return Math.min(...M.map(m=>{const h=(m.l-m.w)/2,dx=Math.abs(h*Math.cos(m.a)),dy=Math.abs(h*Math.sin(m.a));return e==0?m.y-dy-m.w/2:e==1?W-m.x-dx-m.w/2:e==2?H-m.y-dy-m.w/2:m.x-dx-m.w/2}))};
export const inRangePt=(u,x,y,rg)=>u.M?abs(u).filter(m=>mDistPt(m,x,y)<=rg).length:u.n;
// Schwerpunkt auf Mittelpunkt, Radius neu
function recentre(u,P){ // P: absolute Positionen -> Offsets
 const cx=P.reduce((s,p)=>s+p.x,0)/P.length,cy=P.reduce((s,p)=>s+p.y,0)/P.length;u.x=cx;u.y=cy;P.forEach((p,i)=>{u.M[i].dx=p.x-cx;u.M[i].dy=p.y-cy;if(p.a!=null)u.M[i].a=p.a});u.r=radius(u.M)}
export function setAbs(u,P){recentre(u,P)}
// Verlust: Modelle, die am weitesten vom nächsten Feind entfernt sind, aber Zusammenhalt wahren; Anführer (Index 0) zuletzt
export function removeModels(S,u,k,foes){for(let t=0;t<k&&u.M.length>1;t++){
  const P=abs(u),E=foes.flatMap(e=>e.x>=0&&e.M?abs(e):[]);
  const score=p=>E.length?Math.min(...E.map(q=>mgap(p,q))):0;
  const idx=P.map((p,i)=>i).sort((i,j)=>(j==0)-(i==0)||score(P[j])-score(P[i]));
  let pick=idx.find(i=>cohOK(P.filter((p,j)=>j!=i),u.coh||1));if(pick==null)pick=idx[0];
  if(S.T&&S.T.sl)S.T.sl[into(S,0,P[pick].x,P[pick].y)>0?0:1]++;P.splice(pick,1);u.M.splice(pick,1);recentre(u,P)}
 if(u.M.length==1&&k>0&&u.n<=0)u.M.length=0}
export function addModel(S,u,occupied){ // neues Modell neben vorhandenen platzieren (Rückkehr getöteter Modelle)
 const P=abs(u),base=u._b||{l:P[0].l,w:P[0].w},tpl={l:base.l,w:base.w,a:0};
 let best=null,bs=1e9;
 for(const p of P)for(let k=0;k<16;k++){const a=k*Math.PI/8,d=(p.l+tpl.l)/2+GAP,q={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,...tpl};
  if(occupied.some(o=>mgap(q,o)<0))continue;const sc=Math.hypot(q.x-u.x,q.y-u.y);if(sc<bs){bs=sc;best=q}}
 if(!best)return false;u.M.push({dx:0,dy:0,a:0,l:tpl.l,w:tpl.w});P.push(best);recentre(u,P);return true}
// Modellzahl an u.n angleichen
export function syncM(S,u,foes){if(!u.M||u.x<0)return;
 if(u.M.length>u.n&&u.n>0)removeModels(S,u,u.M.length-u.n,foes);
 if(u.M.length<u.n){const occ=S.U.flatMap(v=>v.x>=0&&v.M&&v!==u?abs(v):[]);while(u.M.length<u.n){if(!addModel(S,u,[...occ,...abs(u)])){u.n=u.M.length;break}}}}
