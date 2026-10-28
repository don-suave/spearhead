// Regeln: Abfragen, Bewegung, Angriff, Fähigkeiten, Platzierung. Alles arbeitet auf G.S.
import {OR,objD,objR,rectDist,tcorners,W,H,CR,into,onTer,segHits,pathPts,plen,walk,route,tdist,terrErr,ptDist,setFly} from './geom.js';
import {ARMY,HZN,DGN,TERSZ} from './data.js';import {hk,hkMin,hkW,GL} from './hooks.js';
import {d6,d3,dv,add,has} from './util.js';
import {mkUnit} from './state.js';
import {gridPos,radius,wholly,udist,abs,mgap,inRange,inRangePt,cohBad,syncM,removeModels,setAbs,mDistPt} from './models.js';
import {choice,ask} from './game.js';
import {fxL,fxSum,fxMin,addFx,usedKey,useKey} from './fx.js';
import {abList,abGlobals,abCheck,rsvGlobals,AB,runAb,betr} from './abil.js';

// ---------- Abfragen ----------
export const byId=(S,id)=>S.U.find(u=>u.id==id);
export const myU=(S,o)=>S.U.filter(u=>u.o==o&&u.x>=0);
export const foes=(S,u)=>S.U.filter(e=>e.o!=u.o);
export const dist=udist;
export const inCombat=(S,u)=>foes(S,u).some(e=>e.x>=0&&dist(u,e)<=CR);
export const nm=u=>u.n,wnd=u=>u.n*u.wm-u.dmg,mx=u=>u.nmax*u.wm;
export const isHero=u=>/Held/.test(u.kw);
export const ONM=S=>S.on||(S.K.realm?DGN:HZN);
export const RG=(S,o)=>ARMY[S.K.army[o]].reg[S.K.reg[o]][0];
export const EN=(S,o)=>ARMY[S.K.army[o]].enh[S.K.enh[o]][0];
export const wgN=(S,o)=>AN(S,o)=='Epikureische Feiernde'?S.U.filter(u=>u.o==o&&u.x>=0).reduce((t,u)=>t+(u.dn=='Das Zwieträchtige Dreigestirn'?u.n:1),0):0;
export const rl=(S,o)=>Math.min(4,S.round+((S.rev&&S.rev[o]===S.round)?1:0));
export const litIn=(S,u)=>{if(!S.moon||u.o!==S.moon.o||u.x<0||!u.M)return false;const t=S.round<=2?S.moon.t:1-S.moon.t;return abs(u).every(m=>into(S,t,m.x,m.y)>0)};
// Aufstellung: kein Teil einer Base näher als 6 Zoll an der Mittellinie (Rundbasen: Radius, eckige Basen: alle Ecken)
const depBad=(S,o,m)=>Math.abs(m.l-m.w)<1e-6?into(S,o,m.x,m.y)<6+m.l/2-1e-9:tcorners({x:m.x,y:m.y,a:m.a||0,w:m.l,h:m.w}).some(c=>into(S,o,c[0],c[1])<6-1e-9);
export const dk=(S,u)=>{const b=(S.dk&&S.dk[u.id])||0;if(b>0||AN(S,u.o)!='Helfeuerheer'||u.x<0)return b;const d=S.U.find(f=>f.o==u.o&&f.x>=0&&hasAb(f,'hh_dkp')&&((S.dk&&S.dk[f.id])||0)>0);return d&&wholly(u,d,6+3*S.dk[d.id])?1:0};
export const mvOf=(S,u)=>u.mv+fxSum(S,u,'mv')+hk(S,'mv',u)+(hasAb(u,'hh_stark')?dk(S,u):0)+(RGI(S,u.o)=='ss_eifrig'&&S.kes&&!S.kes[u.o]?(()=>{const g=gnl(S,u.o);return g&&u.x>=0&&wholly(u,g,12)?2:0})():0);
export const akOf=u=>u.ak==null?3:u.ak;
export const hasAb=(u,k)=>(u.abs||[]).includes(k)||u.ab===k;
export const RGI=(S,o)=>ARMY[S.K.army[o]].reg[S.K.reg[o]][3];
export const ENI=(S,o)=>ARMY[S.K.army[o]].enh[S.K.enh[o]][3];
export const gnl=(S,o)=>S.U.find(g=>g.o==o&&g.gen&&g.x>=0);
export const AN=(S,o)=>ARMY[S.K.army[o]].n;
export const cycOf=(S,o)=>AN(S,o)=='Seuchenzelle'&&S.cyc?S.cyc[o]:0;
const nearF=(S,u,k)=>S.U.some(e=>e.o!=u.o&&e.x>=0&&hasAb(e,k)&&udist(u,e)<=CR);
// Heilen / Modelle zurückbringen verhindert? (Sensenmegären im Nahkampf; Elendsplage der Seuchenzelle)
export const canHeal=(S,u)=>{if(nearF(S,u,'sense'))return false;const n=1-u.o;return !(cycOf(S,n)==2&&S.U.some(f=>f.o==n&&f.x>=0&&udist(u,f)<=6))};
const clm=(S,u,k)=>S.obj[k]&&u.M&&abs(u).some(m=>objD(S.obj[k],m.x,m.y)-m.l/2<=0);
export const clmAll=(S,u,k)=>S.obj[k]&&u.M&&abs(u).every(m=>objD(S.obj[k],m.x,m.y)-m.l/2<=0);
// Hart wie Stein: -1 Wucht gegen Clanschilde
const hartWie=(S,e,shoot)=>{if(!hasAb(e,'hws'))return false;if((e.gm||0)>0)return abs(e).every(m=>into(S,1-e.o,m.x,m.y)>0);return !shoot&&S.obj.some((p,k)=>S.oc[k]===e.o&&clmAll(S,e,k))};
// Rettungswurf: bester (niedrigster) Wert aus allen Quellen, 9 = keiner
export function wardOf(S,e){const o=e.o,g=gnl(S,o);let w=e.wr||9;const m=v=>{w=Math.min(w,v)};m(hkMin(S,'ward',e));for(const f of GL.ward){const v=f(S,e);if(v>0)m(v)}if(g&&e.gen&&e.x>=0&&S.U.some(x=>x.o==o&&x.x>=0&&hasAb(x,'kb_garde')&&dist(e,x)<=CR))m(5);
 if(e.M&&S.ter.some(t=>t.rel=='Crate of Aqua Ghyranis'&&abs(e).every(m=>ptDist(t,m.x,m.y)+m.l/2<=6)))m(5);
 if(S.TW.id=='ss'&&S.TW.ssU===e.id&&(S.TW.tf||[]).some(i=>S.ter[i]&&tdist(e,S.ter[i])<=3))m(5);
 if(hasAb(e,'fw')&&g&&dist(e,g)<=CR)m(5);
 if(e.gen&&ENI(S,o)=='fz_fest')m(5);
 if(wgN(S,o)==2)m(5);
 if(e.gen&&ENI(S,o)=='fp_tod'&&!S.U.some(f=>f.o==o&&f!==e&&f.x>=0&&dist(e,f)<=3))m(6);
 if(e.gen&&ENI(S,o)=='cj_bloss'&&S.U.some(f=>f.o==o&&f!==e&&f.x>=0&&nm(f)>=3&&wholly(e,f,CR)))m(4);
 if(ENI(S,o)=='ep_hof2'&&g&&((e.gen&&S.U.some(f=>f.o==o&&f.x>=0&&f.dn=='Dämonetten'&&wholly(e,f,CR)))||(e.dn=='Dämonetten'&&wholly(g,e,CR))))m(5);
 if(S.vd&&S.vd[o]>=24)m(5);
 if(fxL(S,null,'consec').some(f=>f.o==o&&S.obj[f.v]&&ct(e,S.obj[f.v])))m(5);
 if(S.ent&&S.ent.some((q,k)=>q===o&&ct(e,S.obj[k])))m(4);
 if(e.gen&&S.U.some(f=>f.o==o&&f!==e&&f.x>=0&&hasAb(f,'fw')&&dist(e,f)<=CR))m(5);
 if(e.gen&&(ENI(S,o)=='mvs'||ENI(S,o)=='hs'))m(5);
 if(e.gen&&ENI(S,o)=='man'&&S.U.some(f=>f.o==o&&f.x>=0&&f.dn=='Clanratten'&&dist(e,f)<=1))m(4);
 if(RGI(S,o)=='erb'&&S.obj.some((p,k)=>S.oc[k]===o&&ct(e,p)))m(6);
 if(e.gen&&ENI(S,o)=='vital')m(4);
 m(fxMin(S,e,'ward'));if(e.crow)m(5);
 if(hasAb(e,'hh_zaeh')){const k=dk(S,e);if(k>=2)m(5);else if(k==1)m(6)}
 if(RGI(S,o)=='bg_rune'&&S.ph==5&&has(S.T.fought,e.id))m(5);
 if(e.gen&&ENI(S,o)=='bg_rue')m(5);
 if(hasAb(e,'rj_boss')&&S.U.some(f=>f.o==o&&f!==e&&f.x>=0&&hasAb(f,'rj_boss')&&dist(e,f)<=CR))m(5);
 if((hasAb(e,'lu_besch')||e.gen&&e.dn=='Scinari-Cathallar')&&AN(S,o)=='Strahlende Phalanx'&&S.U.some(f=>f.o==o&&f!==e&&f.x>=0&&(hasAb(f,'lu_besch')||f.gen&&f.dn=='Scinari-Cathallar')&&dist(e,f)<=CR))m(5);
 if(RGI(S,o)=='sp_tempel'&&e.M&&abs(e).every(q=>into(S,o,q.x,q.y)>0))m(6);
 if(e.gen&&ENI(S,o)=='ms_pilz')m(S.round<=1?4:S.round==2?5:6);
 if(S.ph==3&&g&&fxL(S,null,'kiesel').some(f=>f.o==o)&&wholly(e,g,12))m(5);
 if(w<9&&g&&ENI(S,o)=='logen'&&!/Monster/.test(e.kw)&&wholly(e,g,3))w=Math.max(2,w-1);
 if(w<9&&fxL(S,e,'wardM').some(f=>S.tn>=f.t0+2))w=Math.min(7,w+1);
 return fxL(S,e,'noward').length?9:w}
// Waffenänderungen durch Verbesserungen und Fähigkeiten
export function modW(S,u,w,e,shoot){const o=u.o;let x=hkW(S,u,w,e,shoot);const c=()=>{if(x===w)x=w.slice()};const ha=hk(S,'att',u,w,e,shoot);if(ha&&typeof w[2]=='number'){x=x===w?w.slice():x;x[2]=+x[2]+ha}
 if(u.gen&&ENI(S,o)=='sky'&&w[0]=='Rattlingpistole'){c();x[2]='2W6'}
 if(u.gen&&ENI(S,o)=='mk'&&w[0]=='Gesegnete Großaxt'){c();x[7]=(x[7]||'')+'T'}
 if(u.gen&&ENI(S,o)=='shy'&&w[0]=='Unheilvolle Gruftklinge'){c();x[5]=2}
 if(hasAb(u,'eng')&&u.dmg>0&&w[0]=='Warpgeschmiedete Hellebarde'){c();x[2]=+x[2]+3}
 if(!shoot&&fxSum(S,u,'att')&&typeof w[2]=='number'){c();x[2]=Math.max(1,+x[2]+fxSum(S,u,'att'))}
 if(fxL(S,u,'crit').some(f=>f.v==w[0])){c();x[7]=(x[7]||'')+'T'}
 const dm=fxL(S,u,'dmgw').find(f=>f.v==w[0]);if(dm){c();x[6]=dm.n}
 if(!shoot&&fxSum(S,u,'rend')&&x[5]>0){c();x[5]=Math.max(0,x[5]-fxSum(S,u,'rend'))}
 if(e&&hasAb(u,'bez')&&w[0]=='Celestisches Großschwert'&&nm(e)>=5){c();x[6]=+x[6]+1}
 if(e&&u.gen&&ENI(S,o)=='ober'&&w[0]=='Thengavar'&&/Monster/.test(e.kw)){c();x[6]='2W6'}
 if(!shoot&&u.gen&&ENI(S,o)=='ragn'&&w[0]=='Azangrom'){c();x[2]=+x[2]+2}
 if(fxL(S,u,'schuer').length&&w[0]=='Tosender Fŷratem'){c();x[2]='W3+4'}
 if(hasAb(u,'schwer')&&u.dmg>=10&&w[0]=='Magmadrothmaul'){c();x[2]=4}
 if(hasAb(u,'kd_schwer')&&u.dmg>=10&&w[0]=='Schwere Himmelsharpune'){c();x[2]=1}
 if(!shoot&&fxSum(S,u,'rendP')){c();x[5]=(x[5]||0)+fxSum(S,u,'rendP')}
 if(!shoot&&e&&S.sjt&&S.sjt[o]===e.id&&RGI(S,o)=='sn_jaeger'){c();x[5]=(x[5]||0)+1}
 if(u.gen&&ENI(S,o)=='sn_schnitt'&&w[0]=='Schwert der gestohlenen Stunden'){c();x[7]=(x[7]||'')+'T'}
 if(!shoot&&!(w[7]||'').includes('G')&&(fxSum(S,u,'rendN')||fxSum(S,u,'attN'))){c();x[5]=(x[5]||0)+fxSum(S,u,'rendN');if(typeof w[2]=='number')x[2]=+x[2]+fxSum(S,u,'attN')}
 {const rs=fxL(S,u,'rendWS').filter(f=>f.w==w[0]).reduce((t,f)=>t+f.v,0);if(rs&&shoot){c();x[5]=(x[5]||0)+rs}}
 {const rw=fxL(S,u,'rendW').filter(f=>f.w==w[0]).reduce((t,f)=>t+f.v,0);if(rw&&!shoot){c();x[5]=(x[5]||0)+rw}}
 if(AN(S,o)=='Magma-Fyrd'&&typeof x[2]=='number'&&((/^(Vulkyn|Goldw)/.test(u.dn)&&u.n*2<=u.nmax)||(u.dn=='Goldrunenwerker'&&u.dmg>=3)||(u.gen&&u.dmg>=8))){c();x[2]=+x[2]+1}
 if(hasAb(u,'ep_schlank')&&w[0]=='Durchbohrende Klauen'&&has(S.T.charged,u.id)&&typeof x[2]=='number'){c();x[2]=+x[2]+1}
 if(wgN(S,o)==1&&!shoot&&typeof x[2]=='number'){c();x[2]=+x[2]+2}
 if(!shoot&&fxL(S,u,'critD').length&&!(x[7]||'').includes('D')){c();x[7]=(x[7]||'')+'D'}if(!shoot&&fxL(S,u,'critTA').length&&!(x[7]||'').includes('T')){c();x[7]=(x[7]||'')+'T'}
 {const aw=fxL(S,u,'attW').filter(f=>f.w==w[0]).reduce((t,f)=>t+f.v,0);if(aw&&typeof x[2]=='number'){c();x[2]=+x[2]+aw}}
 if(!shoot&&fxL(S,u,'critA').length){c();if(!(x[7]||'').includes('T'))x[7]=(x[7]||'')+'T'}
 if(!shoot&&S.vd&&S.vd[o]>=18&&!(x[7]||'').includes('T')){c();x[7]=(x[7]||'')+'T'}
 if(!shoot&&fxL(S,u,'attD').length&&x[2]!=null&&!(x[2]===0)){c();x[2]=typeof x[2]=='number'?x[2]*2:'2'+x[2]}
 if(e&&!shoot){const rv=fxL(S,u,'rendV').filter(f=>f.w==e.id).reduce((t,f)=>t+f.v,0);if(rv&&x[5]>0){c();x[5]=Math.max(0,x[5]-rv)}}
 if(hasAb(u,'hh_stark')&&dk(S,u)&&typeof x[2]=='number'){c();x[2]=+x[2]+dk(S,u)}
 if(shoot&&fxL(S,u,'critV').length&&!(x[7]||'').includes('V')){c();x[7]=(x[7]||'')+'V'}
 if(!shoot&&fxL(S,u,'critVM').length&&!(x[7]||'').includes('V')){c();x[7]=(x[7]||'')+'V'}
 if(!shoot&&fxL(S,u,'critD').length&&!(x[7]||'').includes('D')){c();x[7]=(x[7]||'')+'D'}
 if(hasAb(u,'kh_eifer')&&has(S.T.charged,u.id)){c();x[5]=(x[5]||0)+1}
 if(u.gen&&ENI(S,o)=='sp_klinge'&&w[0]=='Reliquien-Celestitwaffe'){c();x[5]=(x[5]||0)+1}
 if(u.gen&&ENI(S,o)=='sp_zorn'&&w[0]=='Sonnenbolzenhandschuh'){c();x[2]=6}
 if(hasAb(u,'sp_schwer')&&u.dmg>=10&&w[0]=='Massige Carnosaurier-Kiefer'){c();x[2]=1}
 if(e&&hasAb(u,'sp_brutal')&&nm(e)>=5&&!(x[7]||'').includes('D')){c();x[7]=(x[7]||'')+'D'}
 if(hasAb(u,'wk_lange')&&!shoot&&u.M&&abs(u).every(q=>into(S,1-o,q.x,q.y)>0)&&!(x[7]||'').includes('D')){c();x[7]=(x[7]||'')+'D'}
 if(shoot&&RGI(S,o)=='wk_feuer'&&u.dn=='Feuerdämonen des Tzeentch'){c();x[5]=(x[5]||0)+1}
 {const g=gnl(S,o);if(!shoot&&g&&ENI(S,o)=='hz_rache'&&u.dn=='Blutpirscherinnen'&&wholly(u,g,12)){c();x[5]=(x[5]||0)+1}}
 return x}
export const cn=(u,p)=>p.length>3?(u.M?abs(u).filter(m=>objD(p,m.x,m.y)-m.l/2<=0).length:(objD(p,u.x,u.y)-u.r<=0?u.n:0)):u.M?inRangePt(u,p[0],p[1],OR(p)):(Math.hypot(u.x-p[0],u.y-p[1])-u.r<=OR(p)?u.n:0);
export const ct=(u,p)=>cn(u,p)>0;
export const cvOf=(S,u,k=0,bi=-1)=>Math.min(hasAb(u,'sp_ako')&&!akOf(u)?1:1e9,fxL(S,u,'ctlmax').length?Math.min(...fxL(S,u,'ctlmax').map(f=>f.v)):1e9,Math.max(0,u.cv*(k||nm(u))+hk(S,'ctl',u,bi)+(RGI(S,u.o)=='fe_diebe'?5:0)+(S.T.cvb[u.id]||0)+fxSum(S,u,'ctl')+GL.ctl.reduce((q,f)=>q+(+f(S,u)||0),0)+(u.gen&&ENI(S,u.o)=='gw_prosp'?2:0)+(u.dn=='Mondclan-Piksa'&&litIn(S,u)?3:0)+(hasAb(u,'sp_besch')?1:0)+(hasAb(u,'sp_ako')?akOf(u):0)+(hasAb(u,'sv')&&bi>=0&&into(S,u.o,S.obj[bi][0],S.obj[bi][1])>=3?3:0)+(RG(S,u.o)=='Wilde Zeloten'&&u.name=='Freigilden-Stahlhelme'?3:0)+(hasAb(u,'ghol')&&has(S.T.charged,u.id)?2:0)+(hasAb(u,'fp_tramp')&&has(S.T.charged,u.id)?2:0)+(wgN(S,u.o)>=5?2:0)+(RGI(S,u.o)=='gw_holt'&&!isHero(u)&&S.U.some(f=>f.o!=u.o&&f.x>=0&&udist(u,f)<=CR&&(nm(f)>=6||f.wm>=3))?5:0)-(cycOf(S,1-u.o)==3&&S.U.some(f=>f.o!=u.o&&f.x>=0&&udist(u,f)<=CR&&AN(S,f.o)=='Seuchenzelle')?3:0)-(nearF(S,u,'vulk')?1:0)));
export const nearest=(u,l)=>{let b=null,d=1e9;l.forEach(e=>{const x=dist(u,e);if(x<d){d=x;b=e}});return b};
export const cnm=(S,o)=>S.obj.map((p,k)=>S.oc[k]===o?ONM(S)[k]:null).filter(Boolean).join(', ');
export const ctrl=(S,o)=>S.oc.filter(x=>x===o).length;
export const terrOwn=(S,t)=>into(S,0,t.x,t.y)>0?0:1;
export const lt=(S,o)=>S.ter.find(t=>t.big&&!t.my&&terrOwn(S,t)==o);
// Modelle in 3" Reichweite des Geländestücks (Messung von allen Rändern, je Modell)
export const mm=(S,o,t)=>myU(S,o).reduce((a,u)=>a+(u.M?abs(u).filter(m=>rectDist({x:m.x,y:m.y,a:m.a,w:m.l,h:m.w},t)<=3).length:(tdist(u,t)<=3?nm(u):0)),0);
export const grd=(S,u)=>isHero(u)&&!/Monster|Kriegsmaschine/.test(u.kw)&&S.U.some(f=>f.o==u.o&&f!=u&&f.x>=0&&!isHero(f)&&dist(u,f)<=CR);
// ---- Sicht und Deckung (Geländeregeln, Stand Core Rules 2026/27) ----
const hasFly=u=>/Fliegen/.test(u.kw||'');
const flyOf=(S,u)=>hasFly(u)||u.pass||(u.gen&&ENI(S,u.o)=='fp_wall')||fxL(S,u,'fly').length>0;
const segPts=(a,e,f)=>{const L=Math.hypot(e.x-a.x,e.y-a.y),n=Math.max(1,Math.ceil(L/.25));for(let i=0;i<=n;i++)if(f(a.x+(e.x-a.x)*i/n,a.y+(e.y-a.y)*i/n))return true;return false};
// Gelände (Core Rules): Large = Deckung, Sichtblocker, instabil; Small = Deckung, instabil.
// „Dahinter“: Ist es unmöglich, eine gerade Linie vom nächsten Punkt der Base des angreifenden Modells zum nächsten Punkt eines Modells der Zieleinheit zu ziehen, ohne dass sie über ein Geländestück läuft.
const mdl=u=>u.M?abs(u):[{x:u.x,y:u.y,l:2*u.r,w:2*u.r,a:0}];
const lnBlk=(t,p,q)=>{const L=Math.hypot(q.x-p.x,q.y-p.y),r1=p.w/2,r2=q.w/2,n=Math.max(1,Math.ceil(L/.2));for(let i=0;i<=n;i++){const d=L*i/n;if(d<r1||L-d<r2)continue;if(ptDist(t,p.x+(q.x-p.x)*i/n,p.y+(q.y-p.y)*i/n)<=0)return true}return false};
const behindT=(S,a,e,ts)=>ts.length>0&&mdl(a).every(p=>mdl(e).every(q=>ts.some(t=>lnBlk(t,p,q))));
const whollyOnT=(e,t)=>mdl(e).every(m=>tcorners({x:m.x,y:m.y,a:m.a||0,w:m.l,h:m.w}).every(c=>ptDist(t,c[0],c[1])<=0));
const onOrBehind=(S,a,e,ts)=>ts.some(t=>whollyOnT(e,t))||behindT(S,a,e,ts);
export const obscured=()=>false;
// Nicht anvisierbar (Fernkampf): Ziel hinter oder ganz auf einem großen Geländestück (Sichtblocker), außer Fliegen
export const hidden=(S,a,e)=>(fxL(S,e,'notgt').some(f=>!f.ex||dist(a,e)>CR)||(e.gen&&ENI(S,e.o)=='fc_geschm'&&dist(a,e)>12)||dist(a,e)>CR&&(e.mud&&dist(a,e)>12||(S.ter.some(t=>t.rel=='Battered Barricade'&&e.M&&abs(e).every(m=>ptDist(t,m.x,m.y)+m.l/2<=3)))))||(!hasFly(e)&&e.x>=0&&onOrBehind(S,a,e,S.ter.filter(t=>t.k=='obsc')));
export const rngOf=(S,u,r)=>{const b=r+(r>0?fxSum(S,u,'rng'):0);return obscured(S,u)?Math.floor(b/2):b};
// Deckung: -1 auf Trefferwürfe gegen Einheiten hinter/auf Gelände (Linie kreuzt es; Teile in der Kampfreichweite des Angreifers zählen nicht), außer sie haben in diesem Zug angegriffen oder fliegen
export const covered=(S,a,e)=>!hasFly(e)&&!has(S.T.charged,e.id)&&(((S.fort||[]).some(k=>clmAll(S,e,k)))||(e.x>=0&&onOrBehind(S,a,e,S.ter.filter(t=>!t.rel))));
export const shB=(S,u,e)=>!!e.gen&&e.x>=0&&u.o!=e.o&&ENI(S,e.o)=='sn_schatten'&&S.Ph.sch!=null&&S.Ph.sch!==u.id;
export const blk=(S,a,e)=>/Infanterie/.test(e.kw)&&grd(S,e)&&dist(a,e)>12;
const fxC=(S,u,k)=>fxL(S,u,k).some(f=>!f.cond||(f.cond=='terr'&&u.M&&abs(u).every(m=>into(S,f.t,m.x,m.y)>=m.l/2))||(f.cond=='rip'&&S.U.some(e=>e.o!=u.o&&e.x>=0&&has(S.T.charged,e.id)&&dist(u,e)<=CR))),sfx=(S,u)=>(has(S.T.SF,u.id)||fxC(S,u,'first')||(u.gen&&ENI(S,u.o)=='wut'&&has(S.T.charged,u.id))||(u.gen&&ENI(S,u.o)=='sd_slaan')||hk(S,'first',u)>0||(hasAb(u,'rj_schimm')&&has(S.T.charged,u.id)))&&!has(S.T.SL,u.id),slx=(S,u)=>(has(S.T.SL,u.id)||fxC(S,u,'last'))&&!has(S.T.SF,u.id);
export const eligF=(S,o)=>S.U.filter(x=>x.o==o&&x.x>=0&&!has(S.T.fought,x.id)&&(inCombat(S,x)||(o==S.act&&has(S.T.charged,x.id))));
export function sfOK(S,u){const all=[...eligF(S,0),...eligF(S,1)];if(all.some(x=>sfx(S,x)))return sfx(S,u);if(slx(S,u)&&all.some(x=>!slx(S,x)))return false;return true}
export const stat=u=>{const FL={T:'Krit. (tödlich)',V:'Krit. (verwundet)',B:'Nahbeschuss',G:'Begleiter',S:'Schockfäuste: Krit. Treffer = W6 Treffer',M:'jeder Treffer = 1 tödlicher Schaden',Q:'+1 Wucht gegen Zauberer/Priester',C:'Angriff (+1 Schaden)',D:'Krit. (2 Treffer)',K:'+1 Wucht gegen Kavallerie',H:'+1 Wucht gegen Helden',O:'+1 Wucht gegen Monster',I:'+1 Wucht gegen Infanterie',N:'Anti-Angriff (+1 Wucht gegen Einheiten, die angegriffen haben)'};
 return `<b>Schlüsselwörter:</b> ${u.kw||"–"}<br>Modelle ${u.n}/${u.nmax} · Schaden ${u.dmg}/${u.wm} · Bewegung ${u.mv} Zoll · Schutz ${u.sv}+${u.wr?' · Rettung '+u.wr+'+':''} · Kontrolle ${u.cv} je Modell<br>`+[...u.rw,...u.mw].map(w=>`${w[0]}: ${w[1]?w[1]+' Zoll, ':''}${w[2]}A ${w[3]}+/${w[4]}+, Wucht ${w[5]||'-'}, Schaden ${w[6]}${w[7]?' ('+[...w[7]].map(c=>FL[c]||c).join(', ')+')':''}${w[8]>1?' ×'+w[8]:''}`).join('<br>')+(u.tx&&u.tx.length?'<br>'+u.tx.map(a=>'<i><b>'+a[0]+':</b> '+a[1]+(a[2]?'':' <span style="opacity:.6">(noch ohne Wirkung)</span>')+'</i>').join('<br>'):'')};
export const ABT={lu_besch:['Schwertmeister',1],sp_ako:['Sonnenakolythen',1],bg_atem:['Keine Atempause',1],hz_krist:['In Kristall verwandelt',1],hz_herz:['Herzsucher',1],ms_boing:['Boing! Boing! Boing!',1],wk_finne:['Messerscharfe Finnen',1],bd_uebertr:['Abscheuliche Übertragung',1],bd_leg:['Skelettlegion',1],bd_reit:['Reitendes Verderben',1],bd_blut:['Blutgeruch',1],ep_hof:['Dreifacher Hof',1],ep_gunst:['Gunstspender',1],ep_duft:['Einlullender Duft',1],ep_schlank:['Schlank und flink',1],ep_wahn:['Wahnsinnig schnell',1],fp_krieg:['Brüllender Kriegsherr',1],fp_mauer:['Mauer aus Fleisch',1],fp_tramp:['Trampelnde Plünderer',1],fp_blut:['Blutiger Schrecken',1],ss_rost:['Rostschlund',1],ss_kessel:['Fleischerkessel',1],ss_metz:['Appetit auf Arkanes',1],ss_fokus:['Fokusse der Wanstmagie',1],ss_wahn:['Wahnsinnig vor Hunger',1],od_zaehl:['Zählt weiter, ich beobachte euch',1],od_zerst:['Zerstörung und Verfall',1],od_unerb:['Unerbittliche Angreifer',1],od_fliegen:['Fliegenwolke',1],fz_mark:['Markiertes Ziel',1],fz_glueh:['Glühende Waffen',1],fz_knappe:['Schwarzpulverknappe',1],fz_fahr:['Erfahrene Fährtenleser',1],fe_wurf:['Fallen lassen, werfen oder rollen',1],fe_kegel:['Umgekegelt',1],fe_auge:['Mach ein Auge zu!',1],tr_vision:['Vision der Verdammnis',1],tr_ugesch:['Unübertroffene Geschwindigkeit',1],tr_toeten:['Töten um jeden Preis',1],tr_leicht:['Leichtfüßige Killer',1],gw_plaenk:['Erfahrene Plänkler',1],gw_thexa:['Herumstreichender Aschepanther',1],gw_land:['Das Land weihen',1],gw_fels:['Felsenfester Wille',1],gw_glut:['Glut und Asche',1],cj_losl:['Los-los, bringt sie zur Strecke',1],cj_schatten:['In Schatten gehüllt',1],cj_att:['Schattenhafte Attentäter',1],cj_spreng:['Sprengratten',1],cj_rauch:['Rauchbomben',1],fw:['Fürstliche Wache',1],rise:['Verflucht, sich wieder zu erheben',1],eng:['In die Enge getrieben',1],kskn:['König schlurfender Knochen',1],legion:['Skelettlegion',1],wille:['Wille der gehörnten Ratte',1],verd:['Verdorren',1],mm:['Immer drei Klauenschritte voraus',1],schwarm:['Wimmelnder Schwarm',1],wut:['Entfesselte Warpwut',1],streit:['Streiterin des Sigmar',1],bez:['Fähigkeit',1],ban:['Banner der Neugeschmiedeten',1],gew:['Gewalt eines Meteors',1],azyr:['Entfesseltes Azyr',1],urt:['Urteil verhängen',1],gep:['Geplanter Angriff',1],uhs:['Unheilige Hexerei spüren',1],rf:['Reinigendes Feuer',1],bot:['Boten der Rechtschaffenheit',1],sv:['Standhafte Verteidiger',1],gse:['Gefangene Seelenenergie',1],nglied:['Noch ein Glied in der Kette',1],schlag:['Verzweifelter Schlaghagel',1],sense:['Grauenvolles Gekreisch',1],gverb:['Geisterhaftes Verblassen',1],fuelle:['Fleischige Fülle',1],nurgl:['Endloser Schwarm',1],aufd:['Aufdringlich',1],stelzen:['Gallwald-Stelzen',1],gf:['Gestrenge Führung',1],hws:['Hart wie Stein',1],ghol:['Gazul-Großhammer (+2 Kontrolle nach Angriff)',1],rhl:['Runenhämmerer-Lehrling',1],schwer:['Schwer angeschlagen',1],vulk:['Vulkanisches Blut',1],rune:['Die Runen erwecken',1],vverd:['Verdammtes Viech',1],lava:['Lavaverkrustet',1]};

// ---------- Zielkontrolle ----------
export function updCtrl(S){const cs=S.obj.map(()=>[0,0]),cu=[],rf=(S.TW.id=='rf'||S.TW.id=='og')&&S.TW.obj;
 S.U.forEach(u=>{if(u.x<0)return;if(u.wm<=2&&S.U.some(e=>e.o!=u.o&&e.x>=0&&hasAb(e,'oz_glotz')&&dist(u,e)<=CR))return;let bi=-1,bd=1e9,bc=0;S.obj.forEach((p,k)=>{if(rf&&rf[0]==k)return;const c=cn(u,p);if(c>0){const d=Math.hypot(u.x-p[0],u.y-p[1]);if(d<bd){bd=d;bi=k;bc=c}}});if(bi>=0){const v=cvOf(S,u,bc,bi);cs[bi][u.o]+=v;(cu[bi]=cu[bi]||[]).push({n:u.name,o:u.o,v})}});if(S.TW.id=='ds'&&S.TW.dk!=null&&cs[S.TW.dk]){cs[S.TW.dk][S.TW.dkO]+=1;(cu[S.TW.dk]=cu[S.TW.dk]||[]).push({n:'Darkened Skies',o:S.TW.dkO,v:1})}S.cs=cs;S.cu=cu;
 S.obj.forEach((p,k)=>{if(rf&&rf[0]==k){S.oc[k]=-1;return}const a=cs[k][0],b=cs[k][1];if(a>b)S.oc[k]=0;else if(b>a)S.oc[k]=1});
 if(S.ent)S.ent.forEach((q,k)=>{if(q!=null&&q>=0&&S.oc[k]===1-q)S.ent[k]=-1})}

// ---------- Schaden ----------
export function hurt(G,u,d){const S=G.S,n0=u.n;if(d>0&&((hasAb(u,'sp_besch')||(u.gen&&ENI(S,u.o)=='hh_obs')||(hasAb(u,'hh_zaeh')&&dk(S,u)>=3)))&&!(S.Ph.ig||[]).includes(u.id)){(S.Ph.ig||(S.Ph.ig=[])).push(u.id);d--}u.dmg+=d;while(u.dmg>=u.wm&&u.n>0){u.dmg-=u.wm;u.n--};if(u.gen&&n0>0&&u.n<=0&&ENI(S,u.o)=='sy_samen'&&!usedKey(S,u.o+':samen','battle')){useKey(S,u.o+':samen','battle');const r=d6(S);if(r>=3){u.n=n0;u.dmg=Math.max(0,u.wm-1);G.note('Samen der Wiedergeburt: '+u.name+' wird nicht zerstört (Wurf '+r+')')}else G.note('Samen der Wiedergeburt: Wurf '+r+' – misslungen')};if(n0>0&&u.n<=0&&hasAb(u,'bw_baum')&&u.x>=0&&!u.bwb){u.bwb=1;let a1,b1;do{a1=d6(S);b1=d6(S)}while(a1==b1);if(a1>b1){const hit=S.U.filter(e=>e.o!=u.o&&e.x>=0&&dist(u,e)<=4);G.note('Baum fällt!: Wurf '+a1+' gegen '+b1+' – '+(hit.length?hit.map(e=>e.name).join(', ')+' erleiden je W3 tödlichen Schaden':'kein Feind getroffen'));hit.forEach(e=>hurt(G,e,d3(S)))}else G.note('Baum fällt!: Wurf '+a1+' gegen '+b1+' – der Gegner wählt einen sicheren Punkt')}if(u.n<n0&&u.x>=0&&(!u.M||u.n<=0))(u.M&&u.M.length?abs(u).map(m=>[m.x,m.y]):Array.from({length:n0-u.n},()=>[u.x,u.y])).forEach(([x,y])=>{S.T.sl[into(S,0,x,y)>0?0:1]++});if(G.phD)G.phD.push({a:G.atk==null?null:G.atk,s:G.src||null,t:u.id,d,l:n0-u.n});
 if(u.n<n0&&fxL(S,u,'ruhm').length){const rs=[];let k=0;for(let i=0;i<n0-u.n;i++){const r=d6(S);rs.push(r);if(r>=4)k++}const t=S.U.filter(e=>e.o!=u.o&&e.x>=0&&dist(u,e)<=CR)[0];G.note('Ruhmreiches Gleißen: '+rs.join(',')+(k&&t?' → '+k+' tödlicher Schaden auf '+t.name:''));if(k&&t)hurt(G,t,k)}
 if(u.n<n0&&hasAb(u,'bg_atem')&&u.x>=0){const t=S.U.filter(e=>e.o!=u.o&&e.x>=0&&dist(u,e)<=CR).sort((a,b)=>dist(u,a)-dist(u,b))[0];if(t){let k=0;const rs=[];for(let i=0;i<n0-u.n;i++){const r=d6(S);rs.push(r);if(r>=4)k++}G.note('Keine Atempause: '+rs.join(',')+(k?' → '+k+' tödlicher Schaden auf '+t.name:' → kein Effekt'));if(k)hurt(G,t,k)}}
 if(u.n<=0&&RGI(S,u.o)=='rj_schimmer'&&/Kriegsmaschine/.test(u.kw)&&u.x>=0){const t=S.U.filter(e=>e.o!=u.o&&e.x>=0&&dist(u,e)<=3).sort((a,b)=>dist(u,a)-dist(u,b))[0];if(t){const r=d3(S);G.note('Schimmerexplosion: W3 = '+r+(r>=2?' → '+r+' tödlicher Schaden auf '+t.name:' → kein Effekt'));if(r>=2)hurt(G,t,r)}}
 if(u.n<n0&&S.ph==5&&u.x>=0&&u.dn=='Kairische Akolythen'&&RGI(S,u.o)=='wk_unst'){let k=0;const rs=[];for(let i=0;i<n0-u.n;i++){const r=d6(S);rs.push(r);if(r>=4)k++}const tz=S.U.filter(f=>f.o==u.o&&f.dn=='Tzaangors'&&f.x>=0&&f.n<f.nmax&&dist(u,f)<=9&&canHeal(S,f)).sort((a,b)=>(b.nmax-b.n)-(a.nmax-a.n))[0];if(k&&tz){const b=Math.min(k,tz.nmax-tz.n);tz.n+=b;G.note('Unstete Gestalt: '+rs.join(',')+' → '+b+' Modell(e) in '+tz.name+' zurück')}}
 if(u.n<n0&&RGI(S,u.o)=='od_wunder'){let k=0;const t=S.U.filter(e=>e.o!=u.o&&e.x>=0&&dist(u,e)<=1).sort((a,b)=>dist(u,a)-dist(u,b))[0];if(t){for(let i=0;i<n0-u.n;i++)if(d6(S)>=4)k++;if(k){G.note('Voller Wunder: '+k+' tödlicher Schaden auf '+t.name);hurt(G,t,k)}}}
 if(u.n>0&&u.M&&u.M.length>u.n)syncM(S,u,foes(S,u));
 if(u.n<=0){u.n=0;u.dmg=0;const i=S.U.indexOf(u);if(i>=0)S.U.splice(i,1);S.D[u.o]++;(S.rd||(S.rd=[0,0]))[u.o]++;[0,1].forEach(q=>{if(AN(S,q)=='Blutgeschworene Pilger')(S.bz||(S.bz=[0,0]))[q]++});if(G.atk!=null){const a=byId(S,G.atk);if(a&&a.o!=u.o&&S.ter.some(t=>t.rel&&tdist(a,t)<=3))(S.T.ptl||(S.T.ptl=[0,0]))[a.o]=1}S.dead.push(u.id);u.dr=S.round;S.GY.push(u);if(u.gen)S.G[u.o]=S.tn;chkWin(G)}}
export function chkWin(G){const S=G.S;[0,1].forEach(o=>{if(!S.over&&!S.U.some(u=>u.o==o)){S.over=true;S.winner=1-o;G.msg('Spielende',[{k:'txt',s:`${S.P[1-o].n} gewinnt – alle Einheiten von ${S.P[o].n} sind vernichtet.`}])}})}

// ---------- Platzierung ----------
// Base (auch eckig/gedreht) vollständig auf dem Spielfeld
const inFld=m=>{const c=Math.abs(Math.cos(m.a||0)),s=Math.abs(Math.sin(m.a||0)),hx=c*m.l/2+s*m.w/2,hy=s*m.l/2+c*m.w/2;return m.x>=hx-1e-9&&m.x<=W-hx+1e-9&&m.y>=hy-1e-9&&m.y<=H-hy+1e-9};
const inField=(x,y,r)=>x>=r&&x<=W-r&&y>=r&&y<=H-r;
// Reserve am Spielfeldrand: Die Einheit wird in Reihen entlang des nächsten Rands aufgestellt, damit alle Modelle in der Randzone stehen
export function rsvForm(u,x,y){if(!(u.rsv=='edge'||u.rsv=='edgeT'||u.rsv=='edge1'||u.rsv=='edgeT1'||u.rsv=='edge6')||!u.M)return null;
 const lim=u.rsv=='edge1'||u.rsv=='edgeT1'?1:u.rsv=='edge6'?6:3,n=u.M.length,bases=u.M.map(m=>({l:m.l,w:m.w})),l=Math.max(...bases.map(b=>b.l)),w=Math.max(...bases.map(b=>b.w)),st=l+.15,dp=w+.15;
 const ed=[x,W-x,y,H-y],k=ed.indexOf(Math.min(...ed));if(ed[k]>lim+3)return null;const span=k>=2?W:H,maxRows=Math.max(1,Math.floor((lim-w)/dp+1e-9)+1);
 let rows=n>=7&&maxRows>=2?2:1;while(rows<maxRows&&Math.ceil(n/rows)*st>span-1)rows++;
 const per=Math.ceil(n/rows),G=gridPos(bases,per,false),half=Math.max(...G.map(m=>Math.abs(m.dx)+m.l/2)),s0=Math.max(half,Math.min(span-half,k>=2?x:y)),minD=Math.min(...G.map(m=>m.dy-m.w/2));
 return G.map(m=>{const s=s0+m.dx,d=m.dy-minD;const [X,Y]=k==2?[s,d]:k==3?[s,H-d]:k==0?[d,s]:[W-d,s];return {x:X,y:Y,a:m.a,l:m.l,w:m.w}})}
export const formU=(u,P)=>{const cx=P.reduce((s,p)=>s+p.x,0)/P.length,cy=P.reduce((s,p)=>s+p.y,0)/P.length,M=u.M.map((m,i)=>({...m,dx:P[i].x-cx,dy:P[i].y-cy,a:P[i].a!=null?P[i].a:m.a}));return {...u,x:cx,y:cy,M,r:radius(M)}};
// Aufstellung auf kleinem Feld: passt die Standardformation nicht in die Zone, wird die Einheit in einer flachen Reihe/Zeile aufgestellt
export function depForm(S,o,u,x,y){if(!u.M)return null;
 const bad=g=>abs(g).some(m=>m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2||depBad(S,o,m));
 if(!bad({...u,x,y}))return null;
 // Zu wenig Platz: Formation neu bilden (Reihenlänge, Quer-/Längsausrichtung, Drehung) – möglichst nah an der gewohnten Form
 const n=u.M.length,bases=u.M.map(m=>({l:m.l,w:m.w})),th=S.K.map?(S.K.dg?1:-1)*Math.atan2(H,W):0,oc=new Set(u.M.map(m=>Math.round(m.dx*4))).size;
 const pers=[...new Set([oc,Math.ceil(Math.sqrt(n)),Math.ceil(n/2),Math.ceil(n/3),n,Math.min(n,Math.floor(16/(Math.max(...bases.map(b=>b.l))+.15))||1),Math.max(1,Math.ceil(n/4))])].filter(k=>k>=1&&k<=n);
 const rots=[0,th,Math.PI/2,th+Math.PI/2].filter((r,i,A)=>A.indexOf(r)==i);let best=null,bs=1e9;
 for(const per of pers)for(const flat of [false,true])for(const rot of rots){
  const sc=Math.abs(per-oc)*.3+(rot?.4:0)+(flat?.2:0);if(sc>=bs)continue;
  const G=gridPos(bases,per,flat),C=Math.cos(rot),Sn=Math.sin(rot),P=G.map(m=>({x:x+m.dx*C-m.dy*Sn,y:y+m.dx*Sn+m.dy*C,a:m.a+rot,l:m.l,w:m.w}));
  if(P.some(m=>m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2||depBad(S,o,m)))continue;
  if(n>1&&cohBad(P,u.coh).length)continue;
  best=P;bs=sc}
 return best}
export const PX={};
export function placeErr(S,kind,o,u,x,y,a){
 if(GL.place[kind])return GL.place[kind](S,o,u,x,y,a);
 if(PX[kind])return PX[kind](S,o,u,x,y,a);
 if(kind=='terr'){const [w,h]=u.w?[u.w,u.h]:TERSZ[u.big?'big':'small'];return terrErr(S,o,{x,y,w,h,a:a||0})}
 if(kind=='icon'){const r={x,y,w:u.w,h:u.h,a:a||0};if(Math.min(x,y,W-x,H-y)<1)return 'Auf dem Spielfeld';if(S.ter.some(t=>rectDist(r,t)<=3))return 'Mehr als 3 Zoll von allem Gelände';if(S.U.some(e=>e.x>=0&&abs(e).some(m=>ptDist(r,m.x,m.y)-m.l/2<=3)))return 'Mehr als 3 Zoll von allen Einheiten';if(S.obj.some(p=>ptDist(r,p[0],p[1])<OR(p)))return 'Nicht auf einem Ziel';return ''}
 let g={...u,x,y};if(kind=='rsv'){const Pf=rsvForm(u,x,y);if(Pf)g=formU(u,Pf)}
 if(kind=='dep'){const Pf=depForm(S,o,u,x,y);if(Pf)g=formU(u,Pf)}
 const P=abs(g),fe=foes(S,u).filter(e=>e.x>=0);
 if(!P.every(m=>inFld(m))&&kind!='amb'&&kind!='rein')return 'Außerhalb des Spielfelds';
 if(kind=='dep'){if(onTerM(S,g)||P.some(m=>depBad(S,o,m))||overlapErr(S,g))return 'Ganz im eigenen Gebiet, mehr als 6 Zoll vom Gegner, nicht auf Einheiten';return ''}
 if(kind=='amb'){const dd=e=>dist(g,e);if(!fe.every(e=>dd(e)>CR)||!fe.some(e=>dd(e)<=6)||onTerM(S,g)||!P.every(m=>inFld(m))||overlapErr(S,g))return '3 bis 6 Zoll vom Gegner, nicht im Nahkampf';return ''}
 if(kind=='repl'){if(onTerM(S,g)||P.some(m=>into(S,o,m.x,m.y)<m.l/2||Math.min(m.x,m.y,W-m.x,H-m.y)+m.l/2>6)||fe.some(e=>dist(g,e)<=CR)||overlapErr(S,g))return 'Ganz im eigenen Gebiet, höchstens 6 Zoll vom Rand, nicht im Nahkampf';return ''}
 if(kind=='rsv'){const t=u.rsv=='edgeT'?'edge':u.rsv=='edgeT1'?'edge1':u.rsv,ok=m=>t=='edge'||t=='edge1'||t=='edge6'?Math.min(m.x,m.y,W-m.x,H-m.y)-m.l/2<=(t=='edge'?3:t=='edge6'?6:1):t=='corner'?[[0,0],[W,0],[0,H],[W,H]].some(c=>Math.hypot(m.x-c[0],m.y-c[1])-m.l/2<=6):true;
  if(onTerM(S,g)||!P.every(ok)||((u.rsv=='edgeT'||u.rsv=='edgeT1')&&P.some(m=>into(S,o,m.x,m.y)<m.l/2))||fe.some(e=>dist(g,e)<=(t=='corner'?9:6))||!P.every(m=>inFld(m))||overlapErr(S,g))return t=='edge1'?'Vollständig bis 1 Zoll vom Rand, mehr als 6 Zoll von Feinden':u.rsv=='edgeT'?'Ganz in deinem Territorium, vollständig bis 3 Zoll vom Rand, mehr als 6 Zoll von Feinden':t=='edge'?'Vollständig bis 3 Zoll vom Rand, mehr als 6 Zoll von Feinden':t=='edge6'?'Vollständig bis 6 Zoll vom Rand, mehr als 6 Zoll von Feinden':t=='corner'?'Vollständig bis 6 Zoll von einer Ecke, mehr als 9 Zoll von Feinden':'Mehr als 6 Zoll von allen Feinden';return ''}
 if(kind=='rep6'){if(onTerM(S,g)||P.some(m=>into(S,o,m.x,m.y)<m.l/2)||fe.some(e=>dist(g,e)<=6)||overlapErr(S,g))return 'Ganz im eigenen Gebiet, mehr als 6 Zoll von allen Feinden, nicht auf Einheiten';return ''}
 if(kind=='shadow'){const t=byId(S,u.sht);if(!t||onTerM(S,g)||!wholly(g,t,6)||overlapErr(S,g)||fe.some(e=>abs(g).some(p=>abs(e).some(q=>mgap(p,q)<0))))return 'Ganz innerhalb von 6 Zoll um die Zieleinheit, nicht auf Modelle, nicht auf Gelände';return ''}
 if(kind=='repl13'){const g0=gnl(S,o);if(onTerM(S,g)||!g0||!wholly(g,g0,13)||fe.some(e=>dist(g,e)<=CR)||overlapErr(S,g))return 'Ganz innerhalb von 13 Zoll um den General, nicht im Nahkampf';return ''}
 if(kind=='rein9'){if(onTerM(S,g)||fe.some(e=>dist(g,e)<=9)||!P.every(m=>inFld(m))||overlapErr(S,g))return 'Mehr als 9 Zoll von allen Gegnern';return ''}
 if(kind=='rein'){if(onTerM(S,g)||fe.some(e=>dist(g,e)<=6)||!P.every(m=>inFld(m))||overlapErr(S,g))return 'Mehr als 6 Zoll von allen Gegnern';return ''}
 if(kind=='kdland'){const F=byId(S,u.kdf);if(!F||F.x<0||onTerM(S,g)||!P.every(m=>inFld(m))||overlapErr(S,g)||!wholly(g,F,CR)||fe.some(e=>dist(g,e)<=CR))return 'Ganz innerhalb der Nahkampfreichweite der Fregatte, nicht im Nahkampf, nicht auf Modellen';return ''}
 return 'Unbekannt'}
export function* place(G,who,kind,u,title,text,x={}){
 return yield {t:'place',who,kind,u,title,text,...x,check:a=>((x.cancel&&a&&a.cancel)||(x.auto&&a&&a.auto))?'':(a&&Number.isFinite(a.x)&&Number.isFinite(a.y))?placeErr(G.S,kind,who,u,a.x,a.y,a.a):'Ungültig'}}

// ---------- Bewegung ----------
export const pr=u=>Math.min(u.r,2); // Wegfindungsradius (Einheit bewegt sich starr; große Formationen werden nicht überschätzt)
const fieldOKm=g=>abs(g).every(m=>inFld(m));
const onTerM=(S,g)=>abs(g).some(m=>onTer(S,m.x,m.y,m.l/2-.02));
export const overlapErr=(S,g)=>{const A=abs(g);return S.U.some(v=>v.id!==g.id&&v.x>=0&&v.M&&Math.hypot(v.x-g.x,v.y-g.y)<v.r+g.r+.2&&abs(v).some(q=>A.some(p=>mgap(p,q)<0)))?'Nicht auf andere Modelle stellen':''};
// Bewegung: die Einheit löst sich während der Bewegung auf, jedes Modell bewegt sich einzeln (Weg um Gelände und Feinde, höchstens rng Zoll).
// Zielpunkt (x,y) = gewünschter Mittelpunkt, rot = Drehung der Formation. Liefert automatisch die passende Endformation.
export function moveForm(S,u,x,y,rng,rot=0,opt=false){setFly(flyOf(S,u));try{const r=moveForm0(S,u,x,y,rng,rot);return opt&&r.P?moveOpt(S,u,r,rng):r}finally{setFly(false)}}
function moveOpt(S,u,r,rng){const A=abs(u),fe=foes(S,u).filter(e=>e.x>=0),E=fe.flatMap(e=>abs(e)),O=S.U.filter(v=>v!==u&&v.x>=0&&v.M).flatMap(v=>abs(v));
 const ok=P=>{const N=P.map((p,i)=>({x:p[0],y:p[1],a:A[i].a,l:A[i].l,w:A[i].w}));
  return N.every((p,i)=>p.x>=p.l/2&&p.x<=W-p.l/2&&p.y>=p.l/2&&p.y<=H-p.l/2&&!onTer(S,p.x,p.y,p.l/2-.02)&&!O.some(q=>mgap(p,q)<0)&&(S.cmb||!E.some(q=>mgap(p,q)<=CR))&&!N.some((q,j)=>j>i&&mgap(p,q)<0))&&!cohBad(N,u.coh).length};
 const Q=optForm(S,u,r.P,rng,ok);if(Q===r.P)return r;
 const ob=obs(S,u);let cost=0;
 for(let i=0;i<Q.length;i++){const L=route(S,A[i].x,A[i].y,Q[i][0],Q[i][1],Math.min(A[i].w/2,1.5),rng,ob);if(L==null)return r;cost=Math.max(cost,L)}
 return {P:Q,cost:Math.max(cost,r.cost),err:''}}
function moveForm0(S,u,x,y,rng,rot=0){
 if(!u.M)return {err:'Keine Modelle'};
 const A=abs(u),n=A.length,c=Math.cos(rot||0),s=Math.sin(rot||0),fe=foes(S,u).filter(e=>e.x>=0),E=fe.flatMap(e=>abs(e)),O=S.U.filter(v=>v!==u&&v.x>=0&&v.M).flatMap(v=>abs(v)),ob=mobs(S,u);
 const wish=u.M.map(m=>({x:x+m.dx*c-m.dy*s,y:y+m.dx*s+m.dy*c,a:m.a+(rot||0),l:m.l,w:m.w}));
 const N=Array(n).fill(null),cost=Array(n).fill(0);let why='';
 const chk=(p,i)=>{if(p.x<p.l/2||p.x>W-p.l/2||p.y<p.l/2||p.y>H-p.l/2)return 'Außerhalb des Spielfelds';
  if(onTer(S,p.x,p.y,p.l/2-.02))return 'Nicht auf Gelände stehen';
  if(O.some(q=>mgap(p,q)<0)||N.some((q,j)=>q&&j!=i&&mgap(p,q)<0))return 'Nicht auf andere Modelle stellen';
  if(!S.cmb&&E.some(q=>mgap(p,q)<=CR))return 'Ziel liegt in Nahkampfreichweite – anderen Punkt wählen';
  if(Math.hypot(p.x-A[i].x,p.y-A[i].y)>rng+1e-6)return 'Zu weit ('+rng.toFixed(1)+' Zoll)';
  const L=route(S,A[i].x,A[i].y,p.x,p.y,Math.min(p.w/2,1.5),rng,ob);if(L==null)return 'Weg durch Gelände/Einheiten blockiert oder zu weit';cost[i]=L;return ''};
 const dirs=[];for(let k=0;k<16;k++)dirs.push(k*Math.PI/8);
 for(let i=0;i<n;i++){let p=wish[i],e=chk(p,i);
  if(e){if(!why)why=e;const base=Math.atan2(y-p.y,x-p.x);let best=null;
   for(const rad of [.3,.6,1,1.5,2,3,4]){const cand=dirs.map(a=>base+a).map(a=>({...p,x:p.x+rad*Math.cos(a),y:p.y+rad*Math.sin(a)})).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
    for(const q of cand){if(!chk(q,i)){best=q;break}}if(best)break}
   if(!best)return {err:why};p=best}
  N[i]=p}
 // Zusammenhalt herstellen: einzelne Ausreißer schrittweise zum Schwerpunkt ziehen
 for(let ps=0;ps<6&&cohBad(N,u.coh).length;ps++){const cx=N.reduce((t,q)=>t+q.x,0)/n,cy=N.reduce((t,q)=>t+q.y,0)/n;
  for(const i of cohBad(N,u.coh)){const q=N[i],d=Math.hypot(cx-q.x,cy-q.y)||1;
   for(const st of [.5,1,1.5]){const t={...q,x:q.x+(cx-q.x)/d*st,y:q.y+(cy-q.y)/d*st},old=N[i];N[i]=null;if(!chk(t,i)){N[i]=t;break}N[i]=old}}}
 if(cohBad(N,u.coh).length)return {err:'Zusammenhalt nicht herstellbar – Ziel näher wählen oder Modelle einzeln bewegen'};
 return {P:N.map(q=>[q.x,q.y]),cost:Math.max(0,...cost),err:''}}

// Automatische Formationsoptimierung (Bewegung / Angriff / Nachrücken): Modelle möglichst auf Zielen, nah am Feind und dicht beieinander.
// ok(P) = Regelprüfung der gesamten Formation (true = erlaubt); lim = maximale Strecke je Modell vom Ausgangspunkt A.
export function optForm(S,u,P0,lim,ok,hot){const A=abs(u),n=A.length;if(n<2&&!hot)return P0;
 const E=foes(S,u).filter(e=>e.x>=0&&Math.hypot(e.x-u.x,e.y-u.y)<lim+u.r+e.r+14).flatMap(e=>abs(e));
 const OB=S.obj.filter(p=>A.some(m=>objD(p,m.x,m.y)<=lim+3));
 const P=P0.map(p=>[p[0],p[1]]),sh=(i,x,y)=>({x,y,a:A[i].a,l:A[i].l,w:A[i].w});
 const sc=(i,x,y)=>{const m=sh(i,x,y);let v=0;
  if(OB.length){const d=Math.min(...OB.map(p=>objD(p,x,y)));v+=d<=3?5:-.25*(d-3)}
  if(E.length){const g=Math.min(...E.map(q=>mgap(m,q)));v+=g<=CR?3:0;v-=(hot?.3:.08)*Math.min(Math.max(0,g),14)}
  let ng=1e9;for(let j=0;j<n;j++)if(j!==i){const g=mgap(m,sh(j,P[j][0],P[j][1]));if(g<ng)ng=g}
  if(n>1)v-=.6*Math.max(0,ng-.1);
  return v};
 for(let ps=0;ps<3;ps++){let imp=false;
  for(let i=0;i<n;i++){const base=sc(i,P[i][0],P[i][1]),C=[];
   for(const st of [1.5,.75,.35,.15])for(let k=0;k<16;k++){const x=P[i][0]+Math.cos(k*Math.PI/8)*st,y=P[i][1]+Math.sin(k*Math.PI/8)*st;
    if(Math.hypot(x-A[i].x,y-A[i].y)>lim+1e-9)continue;const g=sc(i,x,y)-base;if(g>1e-6)C.push([g,x,y])}
   C.sort((a,b)=>b[0]-a[0]);
   for(const [,x,y] of C.slice(0,5)){const old=P[i];P[i]=[x,y];if(ok(P)){imp=true;break}P[i]=old}}
  if(!imp)break}
 return P}
export const moveErr=(S,u,x,y,rng,rot)=>moveForm(S,u,x,y,rng,rot).err||GL.mvChk.reduce((r,f)=>r||f(S,u,x,y),'');
// Bewegung ausführen: Endformation übernehmen, Rückgabe = verbrauchte Strecke (längster Modellweg)
export function applyMove(S,u,a,rng){
 if(a.P){const A=abs(u),L=Math.max(0,...a.P.map((p,i)=>Math.hypot(+p[0]-A[i].x,+p[1]-A[i].y)));setAbs(u,a.P.map(p=>({x:+p[0],y:+p[1]})));return L}
 const r=moveForm(S,u,a.x,a.y,rng,a.rot,true);if(!r.P){u.x=a.x;u.y=a.y;return 0}
 setAbs(u,r.P.map(p=>({x:p[0],y:p[1]})));return r.cost}
export const obs=(S,u)=>foes(S,u).filter(e=>e.x>=0&&!passE(S,u,e)).map(e=>({x:e.x,y:e.y,r:Math.min(e.r,2.5)}));
export const pileR=(S,u)=>3+((S.T.pex||{})[u.id]||0);
export function pileErr(S,u,t,x,y){const g={...u,x,y};
 if(!fieldOKm(g))return 'Außerhalb des Spielfelds';if(onTerM(S,g))return 'Nicht auf Gelände stehen';
 const fs=foes(S,u).filter(e=>e.x>=0);
 if(fs.some(e=>abs(g).some(p=>abs(e).some(q=>mgap(p,q)<0))))return 'Nicht in andere Einheiten hinein';
 const oe=overlapErr(S,g);if(oe)return oe;
 if(fs.filter(e=>dist(u,e)<=CR).some(e=>dist(g,e)>CR))return 'Du musst mit allen bisherigen Gegnern im Nahkampf bleiben';
 if(!has(S.T.charged,u.id)&&dist(g,t)>dist(u,t)+1e-6)return 'Nicht weiter vom Ziel weg (nur nach dem Angriff in jede Richtung)';
 if(route(S,u.x,u.y,x,y,pr(u),pileR(S,u),obs(S,u))==null)return 'Mehr als '+pileR(S,u).toFixed(0)+' Zoll oder Weg blockiert';return ''}
// bester Nachrückpunkt (KI / automatisches Nachrücken): so nah wie möglich ans Ziel
export function pileDest(S,u,t){const L=Math.hypot(t.x-u.x,t.y-u.y)||1,dx=(t.x-u.x)/L,dy=(t.y-u.y)/L;
 for(let s=Math.min(pileR(S,u),Math.max(0,dist(u,t)-.05));s>.05;s-=.25){const x=u.x+dx*s,y=u.y+dy*s;if(!pileErr(S,u,t,x,y))return {x,y,s}}return null}
export function pileIn(S,u,t){const d=pileDest(S,u,t);if(!d)return 0;u.x=d.x;u.y=d.y;return d.s}
// Einzelmodell-Bewegung: jedes Modell höchstens allow Zoll, Zusammenhalt, keine Überlappung
export const adjAllow=(S,u)=>Math.max(0,(S.T.mvt[u.id]!=null?S.T.mvt[u.id]:mvOf(S,u))-(S.T.mvd[u.id]||0));
// restliche Strecke für die starre Bewegung (nach einer Anpassung vor der Bewegung)
export const mvRest=(S,u,extra=0)=>Math.max(0,mvOf(S,u)+extra-(S.T.mvd[u.id]||0));
export function adjErr(S,u,P,allow){const A=abs(u);
 if(!Array.isArray(P)||P.length!=A.length)return 'Ungültig';
 const N=P.map((p,i)=>({x:+p[0],y:+p[1],a:A[i].a,l:A[i].l,w:A[i].w}));
 for(let i=0;i<N.length;i++){const m=N[i];if(!Number.isFinite(m.x)||!Number.isFinite(m.y))return 'Ungültig';
  if(Math.hypot(m.x-A[i].x,m.y-A[i].y)>allow+1e-6)return 'Ein Modell bewegt sich weiter als '+allow.toFixed(1)+' Zoll';
  if(m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2)return 'Außerhalb des Spielfelds';
  if(onTer(S,m.x,m.y,m.l/2-.02))return 'Nicht auf Gelände stehen'}
 for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++)if(mgap(N[i],N[j])<0)return 'Modelle überlappen';
 for(const v of S.U){if(v===u||v.x<0||!v.M)continue;const B=abs(v);if(N.some(p=>B.some(q=>mgap(p,q)<0)))return 'Nicht auf andere Modelle stellen';
  if(v.o!=u.o&&N.some(p=>B.some(q=>mgap(p,q)<=CR)))return 'Nicht in Nahkampfreichweite von Feinden enden'}
 if(cohBad(N,u.coh).length)return 'Zusammenhalt verletzt: jedes Modell braucht '+(N.length>=7?2:1)+' Nachbarn innerhalb '+u.coh+' Zoll';return ''}
// Nachrücken Modell für Modell: jedes bis 3 Zoll, nicht weiter vom Ziel (außer nach Angriff), im Nahkampf mit allen bisherigen Gegnern bleiben
export function pileModelErr(S,u,t,P){const A=abs(u),B=abs(t);
 if(!Array.isArray(P)||P.length!=A.length)return 'Ungültig';
 const N=P.map((p,i)=>({x:+p[0],y:+p[1],a:A[i].a,l:A[i].l,w:A[i].w})),gp=(m,L)=>Math.min(...L.map(q=>mgap(m,q)));
 for(let i=0;i<N.length;i++){const m=N[i];if(!Number.isFinite(m.x)||!Number.isFinite(m.y))return 'Ungültig';
  if(Math.hypot(m.x-A[i].x,m.y-A[i].y)>pileR(S,u)+1e-6)return 'Ein Modell bewegt sich weiter als '+pileR(S,u).toFixed(0)+' Zoll';
  if(m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2)return 'Außerhalb des Spielfelds';
  if(onTer(S,m.x,m.y,m.l/2-.02))return 'Nicht auf Gelände stehen';
  if(!has(S.T.charged,u.id)&&gp(m,B)>gp(A[i],B)+1e-6)return 'Kein Modell darf sich vom Ziel entfernen (nur nach dem Angriff)'}
 for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++)if(mgap(N[i],N[j])<0)return 'Modelle überlappen';
 for(const v of S.U){if(v===u||v.x<0||!v.M)continue;const C=abs(v);if(N.some(p=>C.some(q=>mgap(p,q)<0)))return 'Nicht auf andere Modelle stellen'}
 for(const e of foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR)){const C=abs(e);if(!N.some(p=>C.some(q=>mgap(p,q)<=CR)))return 'Du musst mit allen bisherigen Gegnern im Nahkampf bleiben'}
 if(cohBad(N,u.coh).length)return 'Zusammenhalt verletzt';return ''}
// Nachrücken per Ziehen: Wunschposition je Modell (verschoben+gedreht), fehlerhafte Modelle weichen schrittweise zur Ausgangsposition zurück
export function pileForm(S,u,t,x,y,rot=0){const A=abs(u),B=abs(t),c=Math.cos(rot||0),s=Math.sin(rot||0),ch=has(S.T.charged,u.id);
 const O=S.U.filter(v=>v!==u&&v.x>=0&&v.M).flatMap(v=>abs(v)),gp=(m,L)=>Math.min(...L.map(q=>mgap(m,q)));
 const P=A.map(m=>[m.x,m.y]),N=A.map(m=>({...m}));
 const okM=(m,i)=>!(m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2)&&!onTer(S,m.x,m.y,m.l/2-.02)&&(ch||gp(m,B)<=gp(A[i],B)+1e-6)&&!O.some(q=>mgap(m,q)<0)&&!N.some((q,j)=>j!=i&&mgap(m,q)<0);
 A.forEach((m,i)=>{const dx=m.x-u.x,dy=m.y-u.y,wx=x+dx*c-dy*s,wy=y+dx*s+dy*c;let v=Math.hypot(wx-m.x,wy-m.y);const k0=v>pileR(S,u)?pileR(S,u)/v:1;
  for(let k=k0;k>=-1e-9;k-=.1){const kk=Math.max(0,k),q={...m,x:m.x+(wx-m.x)*kk,y:m.y+(wy-m.y)*kk,a:m.a+(rot||0)*kk};if(okM(q,i)){N[i]=q;P[i]=[q.x,q.y];break}}});
 return {P,err:pileModelErr(S,u,t,P)}}
// Automatisches Nachrücken (Mensch): möglichst viele Modelle in Nahkampfreichweite des Ziels und nah an Zielen, Regeln wie pileModelErr; start = bisherige Wunschpositionen
export function autoPile(S,u,t,start){const A=abs(u),B=abs(t),R=pileR(S,u),ch=has(S.T.charged,u.id);
 const O=S.U.filter(v=>v!==u&&v.x>=0&&v.M).flatMap(v=>abs(v)),gp=(m,L)=>Math.min(...L.map(q=>mgap(m,q)));
 const P=(start&&start.length==A.length?start:A.map(m=>[m.x,m.y])).map(p=>[+p[0],+p[1]]);
 const N=A.map((m,i)=>({...m,x:P[i][0],y:P[i][1]}));
 const old=foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR).map(abs);
 const sc=m=>{const g=gp(m,B);let v=g<=CR?3:0;v-=.12*Math.max(0,g);let bd=1e9;for(const p of S.obj){const d=Math.hypot(m.x-p[0],m.y-p[1]);if(d<bd)bd=d}
  if(bd<=3)v+=4;else if(bd<=R+3+m.l)v-=.05*(bd-3);return v};
 const okM=(m,i)=>!(m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2)&&Math.hypot(m.x-A[i].x,m.y-A[i].y)<=R+1e-6&&!onTer(S,m.x,m.y,m.l/2-.02)&&(ch||gp(m,B)<=gp(A[i],B)+1e-6)&&!O.some(q=>mgap(m,q)<0)&&!N.some((q,j)=>j!=i&&mgap(m,q)<0);
 const order=A.map((m,i)=>i).sort((a,b)=>gp(N[b],B)-gp(N[a],B));
 for(let pass=0;pass<3;pass++){let ch2=false;
  for(const i of order){const m=A[i];let best=N[i],bs=sc(best);const cs=[];
   for(const k of [0,.25,.5,.75,1])for(let d=0;d<16;d++){const a=d*Math.PI/8;cs.push([m.x+Math.cos(a)*R*k,m.y+Math.sin(a)*R*k])}
   const tc=B[0];if(tc){const L=Math.hypot(tc.x-m.x,tc.y-m.y)||1;cs.push([m.x+(tc.x-m.x)/L*R,m.y+(tc.y-m.y)/L*R])}
   for(const p of S.obj){const L=Math.hypot(p[0]-m.x,p[1]-m.y);if(L<=R+3){const k=Math.max(0,L-.5)/(L||1);cs.push([m.x+(p[0]-m.x)*Math.min(1,R/(L||1)),m.y+(p[1]-m.y)*Math.min(1,R/(L||1))]);cs.push([m.x+(p[0]-m.x)*k,m.y+(p[1]-m.y)*k])}}
   for(const [x,y] of cs){const q={...m,x,y};if(!okM(q,i))continue;const v=sc(q);if(v<=bs+1e-6)continue;
    const keep=N[i];N[i]=q;const bad=cohBad(N,u.coh).length>0||old.some(E=>!N.some(p=>E.some(e=>mgap(p,e)<=CR)));N[i]=keep;if(bad)continue;best=q;bs=v}
   if(best!==N[i]){N[i]=best;ch2=true}}
  if(!ch2)break}
 const PP=N.map(m=>[m.x,m.y]);return pileModelErr(S,u,t,PP)?null:PP}
// Angriff per Ziehen: Wunschposition je Modell (verschoben+gedreht, höchstens Wurf Zoll), Modelle stoppen vor Feinden/Hindernissen und weichen schrittweise zurück
export function chargeForm(S,u,x,y,roll,rot=0){const A=abs(u),c=Math.cos(rot||0),s=Math.sin(rot||0);
 const O=S.U.filter(v=>v!==u&&v.x>=0&&v.M).flatMap(v=>abs(v));
 const P=A.map(m=>[m.x,m.y]),N=A.map(m=>({...m}));
 const okM=(m,i)=>!(m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2)&&!onTer(S,m.x,m.y,m.l/2-.02)&&!O.some(q=>mgap(m,q)<0)&&!N.some((q,j)=>j!=i&&mgap(m,q)<0);
 A.forEach((m,i)=>{const dx=m.x-u.x,dy=m.y-u.y,wx=x+dx*c-dy*s,wy=y+dx*s+dy*c;const v=Math.hypot(wx-m.x,wy-m.y),k0=v>roll?roll/v:1,st=v>0?.05/v:1;
  for(let k=k0;k>=-1e-9;k-=st){const kk=Math.max(0,k),q={...m,x:m.x+(wx-m.x)*kk,y:m.y+(wy-m.y)*kk,a:m.a+(rot||0)*kk};if(okM(q,i)){N[i]=q;P[i]=[q.x,q.y];break}}});
 const e0=chargeModelErr(S,u,P,roll);if(e0)return {P,err:e0};
 const Q=optForm(S,u,P,roll,Pq=>!chargeModelErr(S,u,Pq,roll),true);return {P:chargeModelErr(S,u,Q,roll)?P:Q,err:''}}
// Verzweifelter Schlaghagel: Angriff darf nicht innerhalb ½" einer Klingengeist-Einheit auf eigenem Ziel enden, außer unmodifizierter Wurf mindestens 5
const schlagMsg='Verzweifelter Schlaghagel: Angriffsbewegung darf nicht innerhalb ½ Zoll dieser Einheit enden (unmodifizierter Wurf unter 5)';
const schlagBlock=(S,u,near)=>(S.T.cr0[u.id]||0)<5&&near.some(e=>hasAb(e,'schlag')&&S.obj.some((p,k)=>S.oc[k]===e.o&&clm(S,e,k)));
export function chargeErr(S,u,x,y,roll){setFly(flyOf(S,u));try{return chargeErr0(S,u,x,y,roll)}finally{setFly(false)}}
function chargeErr0(S,u,x,y,roll){const g={...u,x,y};
 if(!fieldOKm(g))return 'Außerhalb des Spielfelds';if(onTerM(S,g))return 'Nicht auf Gelände stehen';
 const fs=foes(S,u).filter(e=>e.x>=0);
 if(fs.some(e=>abs(g).some(p=>abs(e).some(q=>mgap(p,q)<0))))return 'Nicht in feindliche Einheiten hinein';
 const oe=overlapErr(S,g);if(oe)return oe;
 if(!fs.some(e=>dist(g,e)<=.5)&&!rflOK(S,u,abs(g)))return 'Du musst mit mindestens einem Modell höchstens ½ Zoll vor einem Feind enden';
 if(schlagBlock(S,u,fs.filter(e=>dist(g,e)<=.5)))return schlagMsg;
 if(route(S,u.x,u.y,x,y,pr(u),roll,obs(S,u))==null)return 'Weg zu weit ('+roll+' Zoll) oder durch Gelände/Einheiten blockiert';return ''}
// Hindernisse für Einzelmodell-Wege: feindliche Modelle als Kreise entlang ihrer Achse
const passE=(S,u,e)=>(hasAb(u,'bd_reit')&&/Infanterie/.test(e.kw))||(u.gen&&ENI(S,u.o)=='cj_akro'&&S.ph==4);
export const mobs=(S,u)=>{const r=[];foes(S,u).filter(e=>e.x>=0&&!passE(S,u,e)).forEach(e=>abs(e).forEach(m=>{const h=(m.l-m.w)/2,c=Math.cos(m.a),s=Math.sin(m.a);[-h,0,h].forEach(k=>{if(k==0&&h<.01)return;r.push({x:m.x+k*c,y:m.y+k*s,r:m.w/2})});if(h<.01)r.push({x:m.x,y:m.y,r:m.w/2})}));return r};
// Angriff Modell für Modell: jedes Modell höchstens Wurf Zoll (Weg um Gelände/Feinde), Zusammenhalt, keine Überlappung, mindestens ein Modell höchstens ½ Zoll vor einem Feind
export function chargeModelErr(S,u,P,roll){setFly(flyOf(S,u));try{return chargeModelErr0(S,u,P,roll)}finally{setFly(false)}}
function chargeModelErr0(S,u,P,roll){const A=abs(u);
 if(!Array.isArray(P)||P.length!=A.length)return 'Ungültig';
 const N=P.map((p,i)=>({x:+p[0],y:+p[1],a:A[i].a,l:A[i].l,w:A[i].w})),fs=foes(S,u).filter(e=>e.x>=0),ob=mobs(S,u);
 for(let i=0;i<N.length;i++){const m=N[i];if(!Number.isFinite(m.x)||!Number.isFinite(m.y))return 'Ungültig';
  if(m.x<m.l/2||m.x>W-m.l/2||m.y<m.l/2||m.y>H-m.l/2)return 'Außerhalb des Spielfelds';
  if(onTer(S,m.x,m.y,m.l/2-.02))return 'Nicht auf Gelände stehen';
  if(Math.hypot(m.x-A[i].x,m.y-A[i].y)>roll+1e-6)return 'Ein Modell bewegt sich weiter als '+roll+' Zoll'}
 for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++)if(mgap(N[i],N[j])<0)return 'Modelle überlappen';
 for(const v of S.U){if(v===u||v.x<0||!v.M)continue;const C=abs(v);if(N.some(p=>C.some(q=>mgap(p,q)<0)))return 'Nicht auf andere Modelle stellen'}
 if(!fs.some(e=>{const C=abs(e);return N.some(p=>C.some(q=>mgap(p,q)<=.5))})&&!rflOK(S,u,N))return 'Mindestens ein Modell höchstens ½ Zoll vor einem Feind'
 if(schlagBlock(S,u,fs.filter(e=>{const C=abs(e);return N.some(p=>C.some(q=>mgap(p,q)<=.5))})))return schlagMsg
 if(cohBad(N,u.coh).length)return 'Zusammenhalt verletzt'
 for(let i=0;i<N.length;i++){const m=N[i];if(Math.hypot(m.x-A[i].x,m.y-A[i].y)<.05)continue;if(route(S,A[i].x,A[i].y,m.x,m.y,Math.min(m.w/2,1.5),roll,ob)==null)return 'Ein Modell kann den Weg nicht in '+roll+' Zoll zurücklegen'}
 return ''}
// Einrasten: ab Zielpunkt (x,y) entlang der Linie zum Feind e bis Kontakt (<= 0,5 Zoll zwischen Modellen)
export function chargeSnap(S,u,e,ang,roll){for(let p=e.r+u.r+1;p>=0;p-=.1){const x=e.x+Math.cos(ang)*p,y=e.y+Math.sin(ang)*p;if(!chargeErr(S,u,x,y,roll))return {x,y}}return null}
// KI: Angriffspunkt am nächsten erreichbaren Feind
export function chargeDest(S,u,roll){const fs=foes(S,u).filter(e=>e.x>=0).sort((a,b)=>dist(u,a)-dist(u,b));
 for(const e of fs){if(dist(u,e)-.5>roll+.01)break;const b=Math.atan2(u.y-e.y,u.x-e.x);
  for(let k=0;k<24;k++){const a=b+(k%2?1:-1)*Math.ceil(k/2)*Math.PI/12,q=chargeSnap(S,u,e,a,roll);if(q)return q}}return null}

// ---------- Angriff ----------
// Modifikatoren auf Trefferwürfe durch Effekte
export function hitMod(S,u,e,shoot){let m=hk(S,'hit',u,e,shoot)+hk(S,'hitT',e,u,shoot);
 if(AN(S,u.o)=='Herzspaltzirkel'&&!shoot&&rl(S,u.o)>=3)m++;
 if(AN(S,e.o)=='Strahlende Phalanx'&&(S.fac||[])[e.o]==1)m--;
 if(AN(S,e.o)=='Grundstok-Wegbereiter'&&/Infanterie/.test(e.kw)&&e.M&&S.U.some(k=>k.o==e.o&&k.dn=='Grundstok-Kanonenboot'&&k.x>=0&&wholly(e,k,6)))m--;
 if(hasAb(u,'wk_wyrd')&&nm(e)>=5)m++;
 if(S.U.some(k=>k.o==e.o&&k.x>=0&&hasAb(k,'hu_auge')&&wholly(e,k,6)))m--;
 if(shoot&&hasAb(u,'hh_flug')&&nm(e)>=5&&dist(u,e)>12)m++;
 if(e.gen&&ENI(S,e.o)=='ms_kutte')m--;
 if(RGI(S,e.o)=='fp_staub'&&has(S.T.arr,e.id))m--;
 if(!shoot){m+=fxSum(S,u,'hit');if(wgN(S,u.o)==4)m++;
  const g=gnl(S,u.o);if(g&&fxL(S,null,'falke').some(f=>f.o==u.o)&&wholly(u,g,12))m++;
  if(fxL(S,null,'gep').some(f=>f.o==u.o&&e.M&&abs(e).some(q=>objD(S.obj[f.v],q.x,q.y)-q.l/2<=0)))m++}
 if(S.TW.id=='cb'&&S.TW.cb&&u.o!=S.TW.cb[1]&&S.obj[S.TW.cb[0]]&&ct(u,S.obj[S.TW.cb[0]]))m--;
 if((S.T.cf||[]).some(f=>f.o==u.o&&S.ter[f.i]&&tdist(u,S.ter[f.i])<=3))m++;
 m+=fxSum(S,u,'hitA')+fxSum(S,e,'hitT')+(!shoot?fxSum(S,e,'hitTm'):0);
 if(shoot){m+=fxSum(S,u,'hitS')+fxSum(S,e,'hitTs');if(hasAb(e,'od_fliegen'))m--;if(inCombat(S,u)&&RGI(S,u.o)=='gw_drill')m--}
 if(cycOf(S,e.o)==1)m--;
 return m}
export function* reactAtk(G,a,e,shoot){const S=G.S,P=S.P[e.o];
 const rue=()=>RGI(S,e.o)=='rue'&&e.dn=='Sturmbestien'&&!usedKey(S,e.o+':rue','battle');
 const doRue=()=>{useKey(S,e.o+':rue','battle');addFx(S,{k:'ward',u:e.id,v:5,exp:'turn'});G.note('Warpsteinbeschlagene Rüstung: '+e.name+' hat Rettung 5+ bis Zugende')};
 if(G.isAI(e.o)){if(rue())doRue();return}
 const L=()=>P.hand.filter(c=>!offBlk(S,e.o,c)&&(CMD[c].r=='atk'||(shoot&&CMD[c].r=='shoot')));let l=L();
 while(l.length||rue()){const ro=rue(),opts=[...l.map(c=>({t:TACN[c-1][2],s:TACN[c-1][3]})),...(ro?[{t:'Warpsteinbeschlagene Rüstung',s:'Rettung 5+ bis Zugende (1× pro Schlacht)'}]:[]),{t:'Keine Reaktion'}];
  const i=yield* choice(G,e.o,'Reaktion?',`${a.name} greift ${e.name} an${shoot?' (Fernkampf)':''}. Möchtest du reagieren?`,opts,{pref:opts.length-1});
  if(i==opts.length-1)break;if(i==l.length&&ro){doRue();l=L();continue}const c=l[i];useCard(S,e.o,c);yield* betr(G,e.o,c);CR2[c](S,e);l=L()}}
export const offBlk=(S,o,c)=>(S.offB||[]).some(f=>f.o==o&&f.c==c&&f.tn==S.tn&&f.ph==S.ph);
export const useCard=(S,o,c)=>{const p=S.P[o];if(S.off&&S.off[o]===c&&p.aside&&p.aside.includes(c)){p.aside.splice(p.aside.indexOf(c),1);S.off[o]=null;(S.offB||(S.offB=[])).push({o,c,tn:S.tn,ph:S.ph});return}(S.dsc||(S.dsc=[0,0]))[o]++;p.hand.splice(p.hand.indexOf(c),1);if(p.aside){const i=p.aside.indexOf(c);if(i>=0)p.aside.splice(i,1)}p.disc.push(c)};
// Wiederholungs-Marker (Visionen des Ruhms): jeder Marker wiederholt automatisch einen misslungenen Treffer-, Verwundungs- oder Schutzwurf der Einheit
export function* rrt(G,S,u,rolls,ok,label){const o=u.o,pol=(S.rrpol||[])[o]==null?1:S.rrpol[o];let n=0;if(!pol)return 0;
 for(;;){const f=fxL(S,u,'rrt').find(x=>x.v>0);if(!f)break;const bad=rolls.map((x,k)=>k).filter(k=>!ok(rolls[k]));if(!bad.length)break;let k=bad[0];
  if(pol==2&&!G.isAI(o)){const bv=[...new Set(bad.map(q=>rolls[q]))].sort((a,b)=>a-b);const c=yield* choice(G,o,'Wiederholungswürfel einsetzen?',label+': '+rolls.join(', ')+' · Verbleibende Wiederholungen ('+u.name+'): '+f.v,[{t:'Keine (weiter)'},...bv.map(v=>({t:'Eine '+v+' wiederholen'}))]);if(!c)break;k=bad.find(q=>rolls[q]==bv[c-1])}
  f.v--;const old=rolls[k];rolls[k]=d6(S);n++;G.note('Wiederholungswürfel ('+label+', '+u.name+'): '+old+' → '+rolls[k])}
 return n}
export const CMD={1:{ph:1,w:'opp'},2:{r:'atk'},3:{ph:2,w:'opp'},4:{r:'atk'},5:{ph:5,w:'any'},6:{ph:4,w:'opp'},7:{r:'chg'},8:{ph:1,w:'any'},9:{r:'shoot'},10:{ph:1,w:'any'},11:{ph:2,w:'any'},12:{r:'ret'}};
import {TAC as TACN} from './data.js';
export const CR2={2:(S,e)=>add(S.Ph.nr,e.id),4:(S,e)=>add(S.Ph.w5,e.id),9:(S,e)=>{add(S.Ph.g2g,e.id);add(S.T.SL,e.id)}};

// City of Ash: Straßen (Shattered Crossroads) und Race for the Loot
const inRect=(t,x,y,mg)=>{const c=Math.cos(t.a||0),s=Math.sin(t.a||0),dx=x-t.x,dy=y-t.y,lx=dx*c+dy*s,ly=-dx*s+dy*c;return Math.abs(lx)<=t.w/2-mg&&Math.abs(ly)<=t.h/2-mg};
export const onRoad=(S,u)=>!!S.roads&&u.M&&abs(u).every(m=>S.roads.some(t=>t.r?Math.hypot(m.x-t.x,m.y-t.y)<=t.r-m.w/2:inRect(t,m.x,m.y,m.w/2)));
const rflOK=(S,u,P)=>(S.T.rfl||[]).some(f=>f.o==u.o&&S.ter[f.i]&&P.some(p=>ptDist(S.ter[f.i],p.x,p.y)-(p.l||1)/2<=.5));
export const nahb=(S,u)=>!!u.knp||RGI(S,u.o)=='gw_drill'||fxL(S,u,'nahb').length>0;
// Schicksalswürfel (Wandelklingenzirkel): S.fd[o] = Liste der Werte, S.fdp[o] = 1 automatisch, 2 nur manuell (Angriffswürfe), 0 nie
export const fdOn=(S,o)=>!!(S.fd&&S.fd[o]&&S.fd[o].length)&&(S.fdp||[0,0])[o]==1;
export const fdTake=(S,o,ok)=>{const a=S.fd[o];let bi=-1;a.forEach((v,i)=>{if(ok(v)&&(bi<0||v<a[bi]))bi=i});return bi<0?0:a.splice(bi,1)[0]};
export function* fdStage(G,o,vals,ok,fc,label,noAsk,noV){
 const S=G.S,pol=(S.fdp||[0,0])[o];let n=0;if(!S.fd||!S.fd[o]||!S.fd[o].length||!fc[o]||!pol)return 0;
 if(pol==1||G.isAI(o)){for(let i=0;i<vals.length&&fc[o]>0;i++)if(!ok(vals[i])){const v=fdTake(S,o,ok);if(v){fc[o]--;n++;G.note('Schicksalswürfel ('+label+'): '+vals[i]+' → '+v);vals[i]=v}}return n}
 if(pol!=2||noAsk)return 0;
 for(;;){const bad=vals.filter(x=>!ok(x)),dice=[...new Set(S.fd[o].filter(ok))].sort((a,b)=>a-b);if(!bad.length||!dice.length||fc[o]<=0)break;
  const bv=[...new Set(bad)].sort((a,b)=>a-b),tx=label+(noV?'':': '+vals.join(', '))+' · Deine Schicksalswürfel: '+S.fd[o].join(', ')+' · noch '+fc[o]+' Ersetzung(en) möglich';
  const c=yield* choice(G,o,'Schicksalswürfel einsetzen?',tx,[{t:'Keinen (weiter)'},...bv.map(v=>({t:'Eine '+v+' ersetzen'}))]);if(!c)break;
  const v0=bv[c-1];let d=dice[dice.length-1];if(dice.length>1){const c2=yield* choice(G,o,'Welcher Schicksalswürfel?','Ersetzt die '+v0+' ('+label+')',dice.map(x=>({t:'Schicksalswürfel '+x})),{pref:dice.length-1});d=dice[c2]}
  const i=vals.findIndex(x=>x==v0&&!ok(x));S.fd[o].splice(S.fd[o].indexOf(d),1);vals[i]=d;fc[o]--;n++;G.note('Schicksalswürfel ('+label+'): '+v0+' → '+d)}
 return n}
export function attack(G,u,e,shoot,sh,pre){const it=attackG(G,u,e,shoot,sh,pre,true);while(!it.next().done);}
export function* attackG(G,u,e,shoot,sh,pre,noAsk){
 const S=G.S,T=S.T,Ph=S.Ph,TW=S.TW,R=[];
 if(shB(S,u,e)){G.note('In Schatten gewandet: '+e.name+' kann in dieser Phase nicht von '+u.name+' angegriffen werden (bereits von einer anderen Einheit gewählt)');return}
 if(e.gen&&u.o!=e.o&&Ph.sch==null&&ENI(S,e.o)=='sn_schatten')Ph.sch=u.id;
 for(const f of GL.pre)f(S,u,e,shoot,G);
 try{if(e.gen&&ENI(S,e.o)=='og_phiole'&&!usedKey(S,e.o+':phi','battle')){useKey(S,e.o+':phi','battle');addFx(S,{k:'ward',u:e.id,v:3,exp:'ph'});G.note('Steinyakblut-Phiole: '+e.name+' hat in dieser Phase Rettung 3+')}}catch(x){}
 let ws=shoot?u.rw:u.mw;if(shoot&&inCombat(S,u)&&!nahb(S,u))ws=ws.filter(w=>(w[7]||'').includes('B'));
 if(shoot&&hasAb(u,'kc_muni')&&ws.length>1){const kar=has(T.moved,u.id)||(dist(u,e)<=12&&nm(e)>=4);ws=ws.filter(w=>(w[0].includes('Kartätsche'))==kar&&dist(u,e)<=w[1])}
 if(shoot&&!ws.length){G.rep('Fernkampf',[{k:'txt',s:u.name+' → '+e.name},{k:'txt',s:'Keine Waffe einsetzbar (Reichweite/Munition) – kein Angriff, keine Würfel.'}],u.o);return}
 let crits=0,ones=0,gdfN=0,fdN=0,ak1=0;const fc=[2,2];const gdf=!shoot&&fxL(S,e,'gdf').length>0;if(!shoot){const mt=T.mt||(T.mt={});mt[e.id]=[...new Set([...(mt[e.id]||[]),u.id])]}const ch=!shoot&&has(T.charged,u.id),fr=e.fp==S.tn+'/'+S.ph&&!isHero(u),nb=nm(e);let dmg=0,mort=0;
 const o0=u.o;for(const [wi,w0] of ws.entries()){const w=modW(S,u,w0,e,shoot);
  let a=w[2],rd=w[5];if(wi==0&&!shoot&&u.gen&&EN(S,u.o)=='Frommer Befehlshaber'){a++;rd++}if(has(Ph.nr,e.id))rd=0;
  const ck=fxL(S,u,'crit5').length||hk(S,'crit5',u,e,shoot,w)>0||(shoot&&hasAb(u,'hz_herz')&&!has(T.moved,u.id))?5:6,fl=w[7]||'',F=c=>fl.includes(c),fy=shoot&&u.gen&&fxL(S,u,'schuer').length>0&&w[0]=='Tosender Fŷratem';const av=u.M?(shoot&&GL.rng.some(f=>f(S,u,e)<=(rngOf(S,u,w[1])||CR))?nm(u):inRange(u,e,shoot?(rngOf(S,u,w[1])||CR):CR)):nm(u),mn=w[8]==null?av:Math.min(w[8],av);let n=a,ar=null;if(typeof a=='string'){const q=/^(\d?)W(\d)(?:\+(\d+))?$/.exec(a),ex=+q[3]||0;let t=0;ar=[];if(pre&&pre[wi]){pre[wi].forEach(x=>{ar.push(x);t+=x})}else for(let k=0;k<(+q[1]||1)*mn;k++){const x=(q[2]=='3'?d3(S):d6(S))+ex;ar.push(x);t+=x}n=t}else n=a*mn;if(sh)n=Math.floor(n*sh[1]+1e-9)-Math.floor(n*sh[0]+1e-9);const hr=[],wr=[],sr=[];if(F('Q')&&/Zauberer|Priester/.test(e.kw))rd++;if(F('I')&&/Infanterie/.test(e.kw))rd++;if(F('K')&&/Kavallerie/.test(e.kw))rd++;if(F('N')&&has(S.T.charged,e.id))rd++;if(F('H')&&isHero(e))rd++;if(F('O')&&/Monster/.test(e.kw))rd++;if(!shoot&&fxSum(S,u,'antichg')&&has(T.charged,e.id))rd++;if(hartWie(S,e,shoot))rd=Math.max(0,rd-1);rd=Math.max(0,rd+hk(S,'rend',u,e,shoot,w)+hk(S,'rendT',e,u,shoot,w));
  const th0=(TW.id=='ws'&&TW.obj&&ct(e,S.obj[TW.obj[0]]))||(shoot&&has(Ph.g2g,e.id))?6:w[3]-Math.max(-1,Math.min(1,(!shoot&&TW.fren==u.id?1:0)+(shoot&&u.ab=='sg'&&!has(T.moved,u.id)?1:0)+hitMod(S,u,e,shoot)+fxL(S,u,'hitW').filter(f=>f.w==w[0]).reduce((t,f)=>t+f.v,0)-(fr?1:0)-(shoot&&grd(S,e)?1:0)-(shoot&&covered(S,u,e)?1:0)));
  const tw=w[4]-(!shoot&&RGI(S,o0)=='uh'&&!isHero(u)&&nm(e)<nm(u)?1:0)+(S.round==1&&RG(S,e.o)=='Krach machen'?1:0)-(TW.id=='tl'&&TW.wu==u.o&&S.ter.some(t=>t.big&&tdist(e,t)<=3)?1:0)-((hasAb(u,'bd_blut')&&e.dmg>0?1:0)+(!shoot&&wgN(S,u.o)==4?1:0)+(shoot?fxSum(S,u,'wndS'):0)+fxSum(S,u,'wnd')+(!shoot&&AN(S,u.o)=='Herzspaltzirkel'&&rl(S,u.o)>=4?1:0)+(!shoot?fxSum(S,u,'wndM'):0)+fxSum(S,e,'wndT')+(!shoot?fxSum(S,e,'wndTm'):0)+hk(S,'wnd',u,e,shoot,w)+hk(S,'wndT',e,u,shoot,w)-(e.gen&&ENI(S,e.o)=='schw'?1:0));
  const aura=shoot&&e.gen&&ENI(S,e.o)=='bd_aura';if(aura)rd=0;
  const gyb=TW.id=='gy'&&S.U.some(f=>f.o==e.o&&f!==e&&f.x>=0&&dist(e,f)<=3)?1:0;const sv0=-gyb+((TW.id=='wn'&&TW.wnU===e.id)?e.sv:e.sv-(aura?Math.max(0,fxSum(S,e,'svP')):fxSum(S,e,'svP'))-(hasAb(e,'fp_mauer')&&!has(T.charged,e.id)?1:0)-hk(S,'svT',e,u,shoot,w)-GL.sv.reduce((q,f)=>q+(+f(S,e)||0),0)-(e.dn=='Felsmagen-Troggoths'&&litIn(S,e)?1:0)-(hasAb(e,'sp_geord')&&S.obj.some((p,k)=>S.oc[k]===e.o&&ct(e,p))?1:0)+(AN(S,e.o)=='Verfluchte Fesselhorde'?0:rd+(TW.rot==e.id?1:0))+(AN(S,e.o)=='Verfluchte Fesselhorde'?0:1)*((()=>{const g=gnl(S,1-e.o);return g&&ENI(S,1-e.o)=='wam'&&dist(g,e)<=CR?1:0})()));const sv=((e.gen&&ENI(S,e.o)=='id_stahl')||AN(S,e.o)=='Sensenheer')?e.sv:sv0;const th=fxL(S,u,'hit6').length?6:th0;let h=0,wn=0,un=0,m=0;
  const hf=[],hx=[];for(let i=0;i<n;i++)hf.push(d6(S));
  if(!shoot&&e.grd===u.o&&/Infanterie/.test(u.kw))for(let i=0;i<hf.length;i++)if(hf[i]==1){hx.push(1);hf[i]=d6(S)}
  yield* rrt(G,S,u,hf,x=>x!=1&&(x>=th||x==6),'Trefferwürfe ('+th+'+)');fdN+=yield* fdStage(G,o0,hf,x=>x!=1&&(x>=th||x==6),fc,'Trefferwürfe ('+th+'+)',noAsk);hr.push(...hf,...hx);if(!shoot&&fxL(S,u,'mutau').length)T.mutN=(T.mutN||0)+hf.filter(x=>x==1).length;
  let nw=0,aw=0;
  for(const r of hf){if(r==1&&fy)ones++;if(r==1||(r<th&&r!=6)||(r<=4&&hasAb(e,'cj_att'))||(r<=3&&has(Ph.tfl,e.id)))continue;h++;if(r>=ck&&(F('D')||(hasAb(u,'ss_metz')&&!shoot&&/Zauberer|Priester/.test(e.kw))))h++;if(r>=ck&&u.gen&&ENI(S,o0)=='glk')crits++;
   if(F('M')){m++;continue}
   if(r>=ck&&F('T')){m+=dv(S,w[6]);continue}
   if(r>=ck&&F('S')){const x=d6(S);h+=x-1;for(let k=0;k<x;k++){const q=d6(S);if(q==6||(q!=1&&q>=tw)){wn++;const s2=d6(S);if(!(s2==1||s2<sv))continue;un++}}continue}
   if(r>=ck&&F('V'))aw++;else nw++}
  const wrr=[];for(let i=0;i<nw;i++)wrr.push(d6(S));const wok=x=>(x==6||(x!=1&&x>=tw))&&!(x<=3&&has(Ph.tfl,e.id));
  yield* rrt(G,S,u,wrr,wok,'Verwundungswürfe ('+tw+'+)');fdN+=yield* fdStage(G,o0,wrr,wok,fc,'Verwundungswürfe ('+tw+'+)',noAsk);wr.push(...wrr);
  const ns=aw+wrr.filter(wok).length;wn+=ns;const srr=[];for(let i=0;i<ns;i++)srr.push(d6(S));const sok=x=>!(x==1||x<sv);
  yield* rrt(G,S,e,srr,sok,'Schutzwürfe ('+sv+'+)');fdN+=yield* fdStage(G,e.o,srr,sok,fc,'Schutzwürfe ('+sv+'+)',noAsk);sr.push(...srr);
  for(const s of srr){if(s==1&&hasAb(e,'sp_ako'))ak1++;if(!shoot&&s>=5&&gdf)gdfN++;if(!sok(s))un++}
  let d=0;for(let i=0;i<un;i++)d+=Math.max(0,dv(S,w[6])+((ch&&TW.spear==u.id)||(ch&&F('C'))?1:0)+hk(S,'dmg',u,e,shoot,w)+hk(S,'dmgT',e,u,shoot,w));
  dmg+=d;mort+=m;
  R.push({k:'txt',s:`<b>${w[0]}</b> (${n} Attacken)`},...(ar?[{k:'row',l:'Attacken ('+a+' je Modell)'+(sh?' – zugeteilt: '+n+' ('+Math.round((sh[1]-sh[0])*100)+' %)':''),v:ar}]:[]),{k:'row',l:`Treffer (${th}+): ${h}`,v:hr,th},{k:'row',l:`Verwundung (${tw}+): ${wn}`,v:wr,th:tw},{k:'row',l:`Schutz (${sv}+): ${wn-un} gerettet`,v:sr,th:sv});
  if(m)R.push({k:'txt',s:`Krit. (tödlich): ${m} tödlicher Schaden`});R.push({k:'txt',s:`Schaden: ${d}`})}
 let tot=dmg+mort;(Ph.alc||(Ph.alc={}))[e.id]=((Ph.alc||{})[e.id]||0)+tot;if(shoot)(T.sh[u.id]||(T.sh[u.id]=[])).push(e.id);const wd=TW.nw==e.id?9:Math.min(wardOf(S,e),TW.wd==e.id?6:9,has(Ph.w5,e.id)?5:9),wrd=[];
 const nwd=!shoot&&fxL(S,u,'nward').length>0,wb=fxSum(S,e,'wardB');if(wd<9&&!nwd)for(let i=0;i<tot;i++)wrd.push(d6(S));const sv2=wrd.filter(x=>x+wb>=wd).length;tot-=sv2;if(e.crow&&wrd.includes(1)){e.crow=0;G.note('Gryphkrähe von '+e.name+' wurde entfernt')}
 add(Ph.used,u.id);if(!shoot)add(T.fought,u.id);const nme=e.name;if(crits&&!shoot){u.dmg=Math.max(0,u.dmg-2*crits);G.note('Geraubte Lebenskraft: '+u.name+' heilt '+2*crits)}if(e.gen&&tot>0&&EN(S,e.o)=='Egomane'){const al=S.U.find(f=>f.o==e.o&&f!==e&&f.x>=0&&dist(e,f)<=CR);if(al){let k=0;const rs=[];for(let i=0;i<tot;i++){const r=d6(S);rs.push(r);if(r>=4)k++}tot-=k;if(k){G.note('Egomane: '+k+' Schadenspunkt(e) auf '+al.name+' umgeleitet (Würfe '+rs.join(',')+')');hurt(G,al,k)}}}
 G.atk=u.id;hurt(G,e,tot);G.atk=null;if(T.mutN){const k=T.mutN;T.mutN=0;if(S.U.includes(u)){G.note('Mutationsaura: '+u.name+' erleidet '+k+' tödlichen Schaden');hurt(G,u,k)}}if(ak1&&S.U.includes(e)&&akOf(e)>0){const k=Math.min(ak1,akOf(e));e.ak=akOf(e)-k;G.note('Sonnenakolythen: '+e.name+' verliert '+k+' Akolythen ('+e.ak+' übrig)')}if(fdN)R.push({k:'txt',s:'Schicksalswürfel eingesetzt: '+fdN});
 if(tot>0)for(const f of GL.dealt)f(G,u,e,tot,shoot);
 {const kk=nb-(S.U.includes(e)?nm(e):0);if(kk>0)add(T.sm||(T.sm=[]),e.id);if(!shoot&&kk>0)for(const f of GL.after)f(G,u,e,kk)}
 if(u.gen&&ENI(S,u.o)=='hz_blut'&&S.U.includes(u)&&nb-(S.U.includes(e)?nm(e):0)>0&&u.dmg>0&&canHeal(S,u)){u.dmg=Math.max(0,u.dmg-(nb-(S.U.includes(e)?nm(e):0)));G.note('In Blut gebadet: '+u.name+' heilt')}if(!shoot){const k2=nb-(S.U.includes(e)?nm(e):0);if(k2>0)add(T.kl||(T.kl=[]),u.id)}if(!S.U.includes(e))add(T.ds||(T.ds=[]),u.id);if(tot>0)add(T.dd||(T.dd=[]),e.id);if(!shoot&&hasAb(u,'ob_ernte')){const kk=nb-(S.U.includes(e)?nm(e):0);if(kk>0)u.kt=Math.min(6,(u.kt||0)+kk)}if(!shoot&&u.gen&&ENI(S,u.o)=='ob_mark'&&tot>0&&u.dmg>0&&S.U.includes(u)){const h0=u.dmg;u.dmg=Math.max(0,u.dmg-tot);G.note('Markpakt: '+u.name+' heilt '+(h0-u.dmg))}if(!shoot&&u.gen&&nb-(S.U.includes(e)?nm(e):0)>0)add(T.gk,u.id);if(shoot&&tot>0)(Ph.shd||(Ph.shd=[])).push(u.id+'>'+e.id);
 if(gdfN&&S.U.includes(u)){G.note('Go Down Fighting: '+gdfN+' tödlicher Schaden auf '+u.name);hurt(G,u,gdfN)}
 if(ones&&S.U.includes(u)){let q=0;for(let i=0;i<ones;i++)q+=d3(S);G.note('Das Feuer schüren: '+u.name+' erleidet '+q+' Schaden (keine Rettung)');hurt(G,u,q)}
 if(wd<9)R.push({k:'row',l:`Ward (${wd}+): ${sv2} verhindert`,v:wrd,th:wd});
 R.push({k:'txt',s:`Gesamtschaden: <b>${tot}</b>`+(wnd(e)<=0?`<br><b>${nme} vernichtet!</b>`:`<br>${nme}: ${wnd(e)}/${mx(e)} (${nm(e)} von ${nb} Modellen)`)});
 G.rep(shoot?'Fernkampf':'Nahkampf',[{k:'txt',s:u.name+' → '+nme},...R],u.o)}

// ---------- Fähigkeiten ----------
export function abilities(S,u){
 const c=inCombat(S,u),dn=has(S.Ph.used,u.id),a=[],ph=S.ph,T=S.T,Ph=S.Ph;
 const nmv=fxL(S,u,'nomove').length>0,mv=mvOf(S,u);
 if(ph==2){a.push({k:'move',t:'Normale Bewegung',s:`bis ${mvRest(S,u).toFixed(mvRest(S,u)%1?1:0)}"`,dis:dn||c||nmv},{k:'run',t:'Rennen',s:`${mv}" + W6`,dis:dn||c||nmv||fxL(S,u,'norun').length>0},{k:'retreat',t:'Rückzug',s:`${RGI(S,u.o)=='zsz'?'kein':'W3'} tödlicher Schaden, bis ${mv}"`,dis:dn||!c||nmv})}
 if(ph==3&&u.rw.length){const rn=has(T.ran,u.id)&&!fxL(S,u,'klaev').length&&!fxL(S,u,'lose').length&&!hasAb(u,'tr_leicht')&&!hasAb(u,'id_lauf')&&!(hk(S,'ranOK',u)>0),cb=c&&!nahb(S,u)&&!u.rw.some(w=>w[7]=='B');a.push({k:'shoot',t:'Fernkampf',s:dn?'Schon eingesetzt in dieser Phase':rn?'Nicht möglich: gerannt oder zurückgezogen':cb?'Nicht möglich: im Nahkampf (nur Waffen mit „Nahkampf-Fernwaffe“)':`Reichweite ${u.rw[0][1]} Zoll`,dis:dn||rn||cb})}
 if(ph==4)a.push({k:'charge',t:'Angriff',s:'2W6',dis:dn||c||fxL(S,u,'nochg').length>0||(has(T.ran,u.id)&&!has(T.FZ,u.id)&&!fxL(S,u,'fz').length&&!(hk(S,'ranOK',u)>0)&&!((AN(S,u.o)=='Rudelfletscha-Jäga'||hk(S,'chgRtr',u)>0)&&has(T.rtr||[],u.id))&&!(S.TW.id=='rm'&&onRoad(S,u))&&!(u.gen&&ENI(S,u.o)=='gw_blut')&&!(S.vd&&S.vd[u.o]>=12))});
 if(ph==2&&RG(S,u.o)=='Inbrünstiger Ansturm')a.push({k:'ia',t:'Inbrünstiger Ansturm',s:'Angriff trotz Rennen (1× pro Zug)',dis:T.ia});
 if(ph==1&&u.ab=='gs')a.push({k:'gs',t:'Gefäß des Sigmar',s:'bis zu 3 Ziele, W3 je Ziel',dis:has(Ph.abu,u.id+'gs')});
 if(ph==5){if(u.ab=='fa')a.push({k:'fa',t:'Fanatische Anhänger',s:'1 getötetes Modell zurückbringen',dis:has(Ph.abu,u.id+'fa')||u.n>=u.nmax});
  if(u.ab=='md')a.push({k:'md',t:'Moordrachenatem',s:'Würfel je Gegner im Nahkampf',dis:has(Ph.abu,u.id+'md')||!c});
  if(u.ab=='am')a.push({k:'am',t:'Angst machen',s:'3+: Treffer −1 gegen diese Einheit',dis:has(Ph.abu,u.id+'am')});
  a.push({k:'fight',t:'Kämpfen',s:'Nahkampfreichweite 3"',dis:!(Ph.fs.on&&Ph.fs.who==u.o&&eligF(S,u.o).filter(x=>sfOK(S,x)).includes(u))})}
 if(ph!=0&&u.o==S.act||ph==5)a.push(...abList(S,u));
 return a}
// Phase ohne mögliche Aktion? Liefert den Grund (Text) oder '' wenn mindestens eine Aktion möglich ist
export function phaseSkip(S){const o=S.act,ph=S.ph;if(ph<1||ph>5)return '';
 const CORE=['move','run','retreat','adj','charge','shoot','fight','ia'];
 const mine=S.U.filter(u=>u.o==o&&u.x>=0),all=S.U.filter(u=>u.x>=0);
 const other=(ph==5?all:mine).some(u=>abilities(S,u).some(a=>!CORE.includes(a.k)&&!a.dis))||globals(S,o).some(g=>!g.dis)||(ph==5&&globals(S,1-o).some(g=>!g.dis));
 if(other)return '';
 if(ph==1)return 'Keine Fähigkeit und kein Zauber ist einsetzbar.';
 if(ph==2){return mine.some(u=>abilities(S,u).some(a=>CORE.includes(a.k)&&!a.dis))?'':'Keine Einheit kann sich bewegen.'}
 if(ph==3){const sh=mine.filter(u=>u.rw.length);if(!sh.length)return 'Keine Einheit besitzt Fernkampfwaffen.';
  const ok=sh.filter(u=>!abilities(S,u).find(a=>a.k=='shoot').dis);
  if(!ok.length)return 'Alle Einheiten mit Fernkampfwaffen sind im Nahkampf oder haben gerannt oder sich zurückgezogen.';
  if(ok.some(u=>foes(S,u).some(e=>e.x>=0&&dist(u,e)<=rngOf(S,u,u.rw[0][1])&&!blk(S,u,e)&&!hidden(S,u,e))))return '';
  return 'Kein Gegner ist in Reichweite und Sichtlinie.'}
 if(ph==4){const ok=mine.filter(u=>!abilities(S,u).find(a=>a.k=='charge').dis);
  if(!ok.length)return 'Keine Einheit kann angreifen (im Nahkampf, gerannt oder schon eingesetzt).';
  if(ok.some(u=>foes(S,u).some(e=>e.x>=0&&dist(u,e)<=12)))return '';
  return 'Kein Gegner ist näher als 12 Zoll.'}
 if(ph==5)return eligF(S,0).length||eligF(S,1).length?'':'Keine Einheit ist im Nahkampf.';
 return ''}
// Globale Aktionen (Menü) für Spieler o
export function globals(S,o){const g=[...abGlobals(S,o),...rsvGlobals(S,o)];
 if(S.ph==2&&S.act==o){
  if(S.round>=2&&S.U.some(u=>u.o==o&&u.amb&&u.x<0))g.push({k:'amb',t:'Flüsterklinge: Plötzlicher Hinterhalt'})}
 return g}

export function* skill(G,u,k){const S=G.S,Ph=S.Ph;
 if(k=='ia'){S.T.ia=true;add(S.T.FZ,u.id);G.note('Inbrünstiger Ansturm: Angriff nach Rennen erlaubt')}
 else if(k=='fa'){add(Ph.abu,u.id+'fa');if(canHeal(S,u))u.n=Math.min(u.nmax,u.n+1);G.note('Fanatische Anhänger: 1 Modell zurück')}
 else if(k=='md'){add(Ph.abu,u.id+'md');const out=[],tx=[];foes(S,u).filter(e=>e.x>=0&&dist(u,e)<=CR).forEach(e=>{const r=d6(S),d=r==1?0:r<6?1:d3(S);out.push(r);tx.push({k:'txt',s:`${e.name}: ${d} tödlicher Schaden`});if(d)hurt(G,e,d)});G.rep('Moordrachenatem',[{k:'row',l:'Würfe',v:out},...tx])}
 else if(k=='am'){add(Ph.abu,u.id+'am');const r=d6(S);if(r>=3)u.fp=S.tn+'/'+S.ph;G.rep('Angst machen',[{k:'row',l:'Wurf (3+)',v:[r],th:3},{k:'txt',s:r>=3?'Treffer −1 gegen diese Einheit in dieser Phase':'Kein Effekt'}])}
 else if(k=='gs'){add(Ph.abu,u.id+'gs');const tg=[];
  while(tg.length<3){const o=S.U.filter(x=>x.x>=0&&!tg.includes(x)&&dist(u,x)<=30).map(x=>[(x.o==u.o?'Eigene: ':'Feind: ')+x.name,x]);o.push(['Fertig',null]);
   const x=yield* ask(G,u.o,'Gefäß des Sigmar: Ziel '+(tg.length+1)+' von 3',o);if(!x)break;tg.push(x)}
  const rs=[],tx=[];tg.forEach(x=>{const r=d3(S);rs.push(r);if(r<2)tx.push({k:'txt',s:x.name+': kein Effekt'});else if(x.o==u.o)tx.push({k:'txt',s:x.name+': Rettung 5+ (noch ohne Wirkung)'});else{tx.push({k:'txt',s:x.name+': '+r+' tödlicher Schaden'});hurt(G,x,r)}});
  G.rep('Gefäß des Sigmar',[{k:'row',l:'Würfe (W3)',v:rs},...tx])}}

// ---------- Prüfung einer Aktion in der Phase ----------
export function actCheck(S,who,a){
 if(!a||!a.a)return 'Ungültig';if(a.a=='next'){if(S.ph==4&&who==S.act){const f=S.U.find(u=>u.o==who&&u.x>=0&&hasAb(u,'ss_wahn')&&!has(S.Ph.used,u.id)&&!inCombat(S,u)&&foes(S,u).some(e=>e.x>=0&&dist(u,e)<=12)&&!abilities(S,u).find(q=>q.k=='charge')?.dis);if(f)return 'Wahnsinnig vor Hunger: '+f.name+' muss angreifen'}return ''}if(a.a=='cmdwin')return '';
 if(a.a.startsWith('ab:')&&!AB[a.a.slice(3)]?.unit)return abCheck(S,who,a);
 if(a.a.startsWith('rsv:'))return globals(S,who).some(g=>g.k==a.a)?'':'Nicht möglich';
 if(a.a=='cr'||a.a=='amb'){return globals(S,who).some(g=>g.k==a.a)?'':'Nicht möglich'}
 const u=byId(S,a.u);if(!u||u.o!=who||u.x<0)return 'Keine eigene Einheit';
 const ab=abilities(S,u).find(x=>x.k==a.a);if(!ab||ab.dis)return 'Fähigkeit jetzt nicht möglich';
 if(a.a=='move')return moveErr(S,u,a.x,a.y,mvRest(S,u),a.rot);
 if(a.a=='adj')return adjErr(S,u,a.P,adjAllow(S,u));
 if(a.a=='shoot'){const t=byId(S,a.t);if(!t||t.o==who)return 'Gegnerische Einheit wählen';if(Math.min(dist(u,t),...GL.rng.map(f=>f(S,u,t)))>rngOf(S,u,u.rw[0][1]))return 'Ziel außerhalb der Reichweite'+(obscured(S,u)?' (Reichweite im Sichtblocker halbiert)':'');if(hasAb(u,'kc_muni')&&u.rw.length>1){const mv=has(S.T.moved,u.id);if(mv&&dist(u,t)>u.rw[1][1])return 'Granatenmunition: Nach einer Bewegung nur Kartätsche ('+u.rw[1][1]+' Zoll) – Ziel zu weit weg'}if(shB(S,u,t))return 'In Schatten gewandet: In dieser Phase hat schon eine andere Einheit den General als Ziel gewählt';if(blk(S,u,t))return 'Geschützter Held: nur Schützen innerhalb von 12 Zoll';if(hidden(S,u,t))return 'Ziel nicht sichtbar: Schusslinie führt durch einen Sichtblocker, das Ziel steht höchstens 1 Zoll daran (gestrichelte Zone) – nur auf höchstens 3 Zoll beschießbar';return ''}
 return ''}
