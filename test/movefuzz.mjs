// Bewegungs-Fuzz: für jede Armee in jedem Pack Spielzustand nach der Aufstellung erzeugen, dann viele zufällige Zielpunkte für moveForm/chargeForm/pileForm prüfen
import {Game} from '../src/game.js';import {flow} from '../src/flow.js';import {aiAnswer} from '../src/ai.js';import {ARMY} from '../src/data.js';
import {abs,cohBad,mgap} from '../src/models.js';import {W,H,onTer} from '../src/geom.js';
import {moveForm,pileForm,chargeForm,mvOf,foes,overlapErr,pileR} from '../src/rules.js';import {setAbs} from '../src/models.js';
const PER=+process.argv[2]||40,packs=process.argv[3]?[+process.argv[3]]:[0,1,2];
const cnt={},ex={};let checks=0;const pc={n:0,ok:0};const bad=(k,m)=>{cnt[k]=(cnt[k]||0)+1;if(!ex[k])ex[k]=[];if(ex[k].length<5)ex[k].push(m)};
let sd=12345;const R=()=>{sd=(sd+0x9E3779B9)|0;let t=Math.imul(sd^sd>>>15,1|sd);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function setup(pack,a,seed){const g=new Game(seed,['ai','ai']).start(flow);let n=0;const rnd=R;
 while(g.req&&n++<5000){const q=g.req;let ans;
  if(q.set)ans=[pack,0];else if(q.t=='choice'&&/^Armee wählen/.test(q.title||''))ans=a;
  else if(q.t=='choice'&&q.title=='Gegnerischer Spearhead')ans=1;
  else if(q.t=='choice'&&q.title=='Gegner-Spearhead wählen')ans=Math.floor(R()*q.opts.length);
  else ans=aiAnswer(g,q,rnd);
  const e=g.submit(ans);if(e)throw new Error('Setup '+e);
  if(g.S.stage&&g.req&&g.req.t=='act'&&g.S.ph==2&&!g.S.U.some(u=>u.x<0&&u.rsv==null))return g}
 return null}
const check=(S,u,P,rng,tag,kind)=>{checks++;const A=abs(u);if(P.length!=A.length){bad('anzahl',tag);return}
 const N=P.map((p,i)=>({x:p[0],y:p[1],a:p[2]!=null?p[2]:A[i].a,l:A[i].l,w:A[i].w}));
 const O=S.U.filter(v=>v!==u&&v.x>=0&&v.M).flatMap(v=>abs(v)),E=foes(S,u).filter(e=>e.x>=0).flatMap(e=>abs(e));
 N.forEach((p,i)=>{if(p.x<p.l/2-1e-6||p.x>W-p.l/2+1e-6||p.y<p.l/2-1e-6||p.y>H-p.l/2+1e-6)bad('rand',tag+' '+kind);
  if(onTer(S,p.x,p.y,p.l/2-.02))bad('gelaende',tag+' '+kind);
  if(O.some(q=>mgap(p,q)<-.001))bad('ueberlappung-fremd',tag+' '+kind);
  if(N.some((q,j)=>j>i&&mgap(p,q)<-.001))bad('ueberlappung-eigen',tag+' '+kind);
  if(kind=='move'&&E.some(q=>mgap(p,q)<=3))bad('nahkampfabstand',tag+' '+kind);
  if(Math.hypot(p.x-A[i].x,p.y-A[i].y)>rng+1e-3)bad('reichweite',tag+` ${kind} ${Math.hypot(p.x-A[i].x,p.y-A[i].y).toFixed(2)}>${rng.toFixed(2)}`)});
 if(N.length>1&&cohBad(N,u.coh).length)bad('zusammenhalt',tag+' '+kind+` ${cohBad(N,u.coh).length}/${N.length}`)};
for(const pack of packs)for(let a=0;a<ARMY.length;a++){
 let g;try{g=setup(pack,a,1000*pack+a+1)}catch(e){bad('setup',`pack ${pack} ${ARMY[a].n}: ${e.message}`);continue}
 if(!g){bad('setup',`pack ${pack} ${ARMY[a].n}: kein Zustand`);continue}
 const S=g.S;S.T.charged=S.T.charged||[];
 for(const u of S.U){if(u.x<0||!u.M)continue;const tag=`pack ${pack} ${ARMY[S.K.army[u.o]].n}/${u.name}`;
  for(let k=0;k<PER;k++){const rng=mvOf(S,u),ang=R()*6.283,d=R()*(rng+4),x=u.x+Math.cos(ang)*d,y=u.y+Math.sin(ang)*d,rot=process.env.ROT?(R()<.5?0:(R()-.5)*3):0;
   try{const r=moveForm(S,u,x,y,rng,rot,k%2==0);if(!r.err&&r.P)check(S,u,r.P,rng,tag,'move')}catch(e){bad('ausnahme',tag+' move '+String(e.stack||e).split('\n').slice(0,2).join('|'))}}
  const fe=foes(S,u).filter(e=>e.x>=0).sort((p,q)=>Math.hypot(p.x-u.x,p.y-u.y)-Math.hypot(q.x-u.x,q.y-u.y))[0];
  if(fe)for(let k=0;k<PER/2;k++){const roll=2+Math.floor(R()*11),ang=R()*6.283,d=R()*(roll+3),x=fe.x+Math.cos(ang)*(fe.r+u.r+1+R()*3),y=fe.y+Math.sin(ang)*(fe.r+u.r+1+R()*3);
   try{const r=chargeForm(S,u,x,y,roll,0);if(r&&!r.err&&r.P){check(S,u,r.P,roll+.5,tag,'charge');
     if(k<6){const sv={x:u.x,y:u.y,M:u.M.map(m=>({...m})),r:u.r},A0=abs(u);setAbs(u,r.P.map(p=>({x:p[0],y:p[1],a:p[2]})));S.T.charged.push(u.id);
      for(let j=0;j<4;j++){const pr=pileForm(S,u,fe,u.x+(R()-.5)*5,u.y+(R()-.5)*5,R()<.5?0:(R()-.5)*2);pc.n++;if(!pr.err){pc.ok++;check(S,u,pr.P,pileR(S,u),tag,'pile')}}
      S.T.charged.pop();Object.assign(u,{x:sv.x,y:sv.y,M:sv.M,r:sv.r})}}}catch(e){bad('ausnahme',tag+' charge '+String(e.stack||e).split('\n').slice(0,2).join('|'))}}}}
console.log(checks,'Prüfungen; Nachrücken gültig',pc.ok+'/'+pc.n);for(const k in cnt)console.log(k,cnt[k],'\n  '+ex[k].join('\n  '));console.log(Object.keys(cnt).length?'ABWEICHUNGEN':'ALLE OK')
