// Geometrie: Spielfeld, Territorien, gedrehte Geländerechtecke, Wegfindung
export let W=30,H=22.4;export const CR=3;export function setBoard(w,h){W=w;H=h}
// Radius eines Ziels (Zoll): Eintrag [x,y,r]; Standard 3
export const OR=p=>p[2]==null?3:p[2];
// Zielform: Kreis [x,y,r] oder Rechteck [x,y,r,w,h,a]; objD = Abstand eines Punkts zur Zielfläche (0 innen)
export const objR=p=>p.length>3?{x:p[0],y:p[1],w:p[3],h:p[4],a:p[5]||0}:null;
export const objD=(p,x,y)=>p.length>3?ptDist(objR(p),x,y):Math.max(0,Math.hypot(x-p[0],y-p[1])-OR(p));
// Vorzeichenbehafteter Abstand zur Territoriengrenze (Zoll)
const sd=(K,x,y)=>K.map?(K.dg?(y/H-x/W):(x/W+y/H-1))/Math.hypot(1/W,1/H):y-H/2;
// >0: im Gebiet von Spieler o; Wert = Abstand zur Grenze
export const into=(S,o,x,y)=>S.K.terr[o]?sd(S.K,x,y):-sd(S.K,x,y);

// ---- Gelände: Mittelpunkt x,y; Größe w,h; Drehwinkel a (Bogenmaß, frei) ----
export const tcorners=t=>{const c=Math.cos(t.a||0),s=Math.sin(t.a||0),hw=t.w/2,hh=t.h/2;
 return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y])=>[t.x+x*c-y*s,t.y+x*s+y*c])};
// Abstand eines Punkts zum Rechteck (0 innen)
export const ptDist=(t,x,y)=>{const c=Math.cos(t.a||0),s=Math.sin(t.a||0),dx=x-t.x,dy=y-t.y,
 lx=dx*c+dy*s,ly=-dx*s+dy*c;return Math.hypot(Math.max(Math.abs(lx)-t.w/2,0),Math.max(Math.abs(ly)-t.h/2,0))};
const segPt=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],L=vx*vx+vy*vy,k=L?Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/L)):0;return Math.hypot(p[0]-a[0]-vx*k,p[1]-a[1]-vy*k)};
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const segX=(a,b,c,d)=>{const d1=cross(a,b,c),d2=cross(a,b,d),d3=cross(c,d,a),d4=cross(c,d,b);return ((d1>0)!=(d2>0))&&((d3>0)!=(d4>0))};
// Abstand zweier (konvexer) Rechtecke
export function rectDist(r,t){const A=tcorners(r),B=tcorners(t);
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(segX(A[i],A[(i+1)%4],B[j],B[(j+1)%4]))return 0;
 if(ptDist(t,r.x,r.y)==0||ptDist(r,t.x,t.y)==0)return 0;
 let m=1e9;for(const p of A)for(let j=0;j<4;j++)m=Math.min(m,segPt(p,B[j],B[(j+1)%4]));
 for(const p of B)for(let j=0;j<4;j++)m=Math.min(m,segPt(p,A[j],A[(j+1)%4]));return m}
// Gelände-Eigenschaften: k = 'obsc' (Sichtblocker, Deckung, instabil), 'obst' (Hindernis: Deckung, instabil), 'area' (Gebiet: Deckung, begehbar); ht = Höhe in Zoll
export const noStand=t=>t.k!='area'&&(t.ht==null||t.ht>1);
export const onTer=(S,x,y,r)=>S.ter.some(t=>noStand(t)&&ptDist(t,x,y)<r);
// Klettern (Core Rules 15.2): Gelände über 1 Zoll Höhe darf überquert werden, die senkrechte Strecke (hoch + runter) zählt zur Bewegung
let FLY=false;export const setFly=v=>{FLY=!!v};
const climbCost=(S,ax,ay,bx,by,r)=>{if(FLY)return 0;const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.ceil(L/.25));let c=0;const ins=S.ter.map(()=>false);
 for(let i=0;i<=n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;S.ter.forEach((t,k)=>{if(!noStand(t))return;const w=ptDist(t,x,y)<r-.02;if(w&&!ins[k])c+=2*(t.ht==null?9:t.ht);ins[k]=w})}return c};
const obHit=(x,y,r,ob)=>{for(const o of ob)if(Math.hypot(x-o.x,y-o.y)<o.r+r-.02)return true;return false};
// Kosten eines Segments: Länge + Kletterstrecke; Infinity bei Feinden im Weg (oder Gelände, wenn nc=true)
export function segCost(S,ax,ay,bx,by,r,ob=[],nc=false){const L=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.ceil(L/.25));if(ob.length>4){const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;ob=ob.filter(o=>{let t=l2?((o.x-ax)*dx+(o.y-ay)*dy)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(ax+dx*t-o.x,ay+dy*t-o.y)<o.r+r+.1})}for(let i=0;i<=n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(obHit(x,y,r,ob))return Infinity;if(nc&&onTer(S,x,y,r-.02))return Infinity}
 return L+(nc?0:climbCost(S,ax,ay,bx,by,r))}
export const segHits=(S,ax,ay,bx,by,r,ob=[])=>segCost(S,ax,ay,bx,by,r,ob,true)==Infinity;
const wcorners=(S,r,ob=[])=>{const p=[];ob.forEach(o=>{const R=(o.r+r+.05)/.924;for(let k=0;k<8;k++){const a=Math.PI/8+k*Math.PI/4,q=[o.x+Math.cos(a)*R,o.y+Math.sin(a)*R];if(q[0]>=r&&q[0]<=W-r&&q[1]>=r&&q[1]<=H-r&&!onTer(S,q[0],q[1],r-.02)&&!ob.some(z=>Math.hypot(q[0]-z.x,q[1]-z.y)<z.r+r-.02))p.push(q)}});S.ter.filter(noStand).forEach(t=>{tcorners({x:t.x,y:t.y,a:t.a,w:t.w+2*(r+.05),h:t.h+2*(r+.05)}).forEach(q=>{if(q[0]>=r&&q[0]<=W-r&&q[1]>=r&&q[1]<=H-r&&!onTer(S,q[0],q[1],r-.02))p.push(q)})});return p};
export function pathPts(S,ax,ay,bx,by,r,ob=[],nc=false){const c0=segCost(S,ax,ay,bx,by,r,ob,nc);if(c0<Infinity&&c0<=Math.hypot(bx-ax,by-ay)+1e-9){const o=[[ax,ay],[bx,by]];o.cost=c0;return o}
 const mx=(ax+bx)/2,my=(ay+by)/2,hl=Math.hypot(bx-ax,by-ay)/2+r+4,nearOb=ob.filter(o=>Math.hypot(o.x-mx,o.y-my)<=hl+o.r);
 const N=[[ax,ay],[bx,by],...wcorners(S,r,nearOb)],n=N.length,d=Array(n).fill(1e9),pr=Array(n).fill(-1),dn=Array(n).fill(0);d[0]=0;
 for(let it=0;it<n;it++){let i=-1;for(let k=0;k<n;k++)if(!dn[k]&&(i<0||d[k]<d[i]))i=k;if(i<0||d[i]>=1e9)break;dn[i]=1;if(i==1)break;
  for(let k=0;k<n;k++){if(dn[k])continue;const w=segCost(S,N[i][0],N[i][1],N[k][0],N[k][1],r,ob,nc);if(d[i]+w<d[k]){d[k]=d[i]+w;pr[k]=i}}}
 if(pr[1]<0)return null;const out=[];let k=1;while(k>=0){out.unshift(N[k]);k=pr[k]}out.cost=d[1];return out}
export const plen=P=>P.reduce((a,p,i)=>i?a+Math.hypot(p[0]-P[i-1][0],p[1]-P[i-1][1]):0,0);
export function walk(P,s){for(let i=1;i<P.length;i++){const L=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);if(s<=L||i==P.length-1){const f=L?Math.min(1,s/L):1;return [P[i-1][0]+(P[i][0]-P[i-1][0])*f,P[i-1][1]+(P[i][1]-P[i-1][1])*f]}s-=L}return P[P.length-1]}
// Weglänge um Gelände, oder null wenn blockiert/zu weit
export function route(S,ax,ay,bx,by,r,rng,ob=[]){const P=pathPts(S,ax,ay,bx,by,r,ob);if(!P)return null;const L=P.cost;return L<=rng+1e-6?L:null}
export const tdist=(u,t)=>ptDist(t,u.x,u.y)-u.r;

// Geländeplatzierung (Fire and Jade): Rückgabe '' = gültig, sonst Grund
export function terrErr(S,o,r){
 const cs=tcorners(r);
 if(cs.some(c=>into(S,o,c[0],c[1])<3))return 'Ganz im eigenen Gebiet, mehr als 3 Zoll vom Feindgebiet';
 if(cs.some(c=>c[1]<3||c[1]>H-3||c[0]<0||c[0]>W))return 'Mehr als 3 Zoll von den langen Kanten';
 if(S.obj.some(p=>p.length>3?rectDist(r,objR(p))<=0:ptDist(r,p[0],p[1])<OR(p)))return 'Nicht auf einem Ziel';
 if(S.ter.some(t=>rectDist(r,t)<=6))return 'Mehr als 6 Zoll von anderem Gelände';
 return ''}
