// Taktikkarten, Befehle, Wendungskarten, Punkte
import {W,H,CR,into,onTer,route,tdist,pathPts,tcorners} from './geom.js';
import {TAC,TWD} from './data.js';
import {d6,d3,add,has} from './util.js';
import {fxL,fxSum,addFx,usedKey,useKey} from './fx.js';
import {mkUnit} from './state.js';
import {setAbs,wholly,abs} from './models.js';
import {choice,ask,info} from './game.js';
import {fdStage,rl,litIn,wgN,gnl,EN,ENI,byId,myU,foes,dist,inCombat,nm,wnd,mx,isHero,ONM,RG,ct,cvOf,lt,mm,ctrl,hurt,useCard,CMD,place,moveErr,cnm,chargeErr,RGI,hasAb,mvOf,mvRest,pr,obs,chargeModelErr,AN,cycOf,canHeal,applyMove,updCtrl} from './rules.js';

export const HK={};
// Eine Einheit liegt vollständig (alle Ecken aller Basen) im Territorium von Spieler t
export const whollyT=(S,t,u)=>u.M?abs(u).every(m=>tcorners({x:m.x,y:m.y,a:m.a,w:m.l,h:m.w}).every(c=>into(S,t,c[0],c[1])>=0)):into(S,t,u.x,u.y)>=u.r;
// Raze: nur die lange Spielfeldkante, die im gegnerischen Territorium liegt
export const razeOK=(S,o)=>{const top=into(S,1-o,W/2,0)>0;return myU(S,o).some(u=>into(S,1-o,u.x,u.y)>=0&&(top?u.y-u.r<=3:H-u.y-u.r<=3))};
const FW=(S,P,c)=>!S.K.pack&&P.hand.includes(c);
export const CH={
 1:(S,o)=>S.D[1-o]>0&&S.D[1-o]>S.D[o],
 2:(S,o)=>myU(S,o).some(u=>whollyT(S,1-o,u)&&!inCombat(S,u)),
 3:(S,o)=>myU(S,o).some(u=>u.x-u.r<=3)&&myU(S,o).some(u=>W-u.x-u.r<=3),
 4:(S,o)=>S.obj.some((p,k)=>S.ocs[k]===1-o&&S.oc[k]===o&&!S.U.some(u=>ct(u,p)&&has(S.T.fought,u.id))),
 5:(S,o)=>{const t=lt(S,o);return !!t&&mm(S,o,t)>mm(S,1-o,t)},
 6:(S,o)=>S.G[1-o]===S.tn||(S.G[1-o]!=null&&S.G[1-o]<S.tn&&S.D[1-o]>0),
 7:(S,o)=>S.oc[ONM(S).indexOf('Ignax')]===o,
 8:(S,o)=>S.oc[ONM(S).indexOf('Behemat')]===o,
 9:(S,o)=>S.oc[ONM(S).indexOf('Dracothion')]===o,
 10:(S,o)=>razeOK(S,o),
 11:(S,o)=>S.obj.filter((p,k)=>S.ocs[k]===1-o&&S.oc[k]===o).length>=2,
 12:(S,o)=>myU(S,o).some(u=>has(S.T.fought,u.id))&&S.D[o]==0};
export function endTac(S,o){const p=S.P[o],r=[];p.hand.slice().forEach(c=>{if(CH[c]&&CH[c](S,o)){p.hand.splice(p.hand.indexOf(c),1);p.disc.push(c);r.push(TAC[c-1][0])}});return r}

// ---------- Würfelduell ----------
export function rolloff(G){const S=G.S;let a,b;do{a=d6(S);b=d6(S)}while(a==b);G.rep('Würfelduell (Wendungskarte)',[{k:'txt',s:'Du'},{k:'row',l:'',v:[a]},{k:'txt',s:'Computer'},{k:'row',l:'',v:[b]},{k:'txt',s:'<b>'+(a>b?'Du entscheidest':'Computer entscheidet')+'</b>'}],0);S.TW=S.TW||{};S.TW.rl=[a,b];return a>b?0:1}

// ---------- Wendungskarten ----------
export function* applyTw(G,u){
 const S=G.S,K=S.K,key=TWD[K.realm][K.tw-1][0];S.TW={id:key,ud:u};const TW=S.TW,act=S.act;
 const ob=ex=>S.obj.map((p,k)=>[ONM(S)[k],k]).filter(o=>o[1]!==ex),un=o=>S.U.filter(x=>x.o==o&&x.x>=0).map(x=>[x.name+' ('+wnd(x)+'/'+mx(x)+')',x.id]);
 const lg=[],A=function*(G,w,t,o){const v=yield* ask(G,w,t,o);const f=o.find(x=>x[1]===v);lg.push((w?'Computer':'Du')+' – '+t+': <b>'+(f?f[0]:v)+'</b>');return v};
 const who=()=>{if(u>=0)return u;const r=rolloff(G);lg.push('Würfelduell: '+S.TW.rl[0]+' (du) gegen '+S.TW.rl[1]+' (Computer) → '+(r?'Computer':'Du')+' entscheidet');return r};
 if(key=='rf'||key=='ws'||key=='ls'){const k=yield* A(G,who(),'Wendungskarte: Ziel wählen',ob());TW.obj=[k]}
 else if(key=='rc'){
  if(u>=0){const k=yield* A(G,u,'Ziel 1 von 2',ob());TW.obj=[k];TW.obj.push(yield* A(G,u,'Ziel 2 von 2',ob(k)))}
  else{const k=yield* A(G,act,'Dein Ziel wählen',ob());TW.obj=[k];TW.obj.push(yield* A(G,1-act,'Dein Ziel wählen',ob(k)))}}
 else if(key=='ma'&&u>=0)TW.spear=yield* A(G,u,'Speerspitze wählen',un(u));
 else if(key=='bl'&&u>=0)TW.fren=yield* A(G,u,'Rasende Einheit wählen',un(u));
 else if(key=='bm'){TW.bm=[null,null];
  if(u>=0){TW.bm[1]=yield* A(G,u,'Blutmarkiert: Einheit der Armee „Du“',un(0));TW.bm[0]=yield* A(G,u,'Blutmarkiert: Einheit der Armee „Computer“',un(1))}
  else{TW.bm[act]=yield* A(G,act,'Gegnerische Einheit markieren',un(1-act));TW.bm[1-act]=yield* A(G,1-act,'Gegnerische Einheit markieren',un(act))}}
 else if(key=='ab'){const p=who(),e=yield* A(G,p,'Alarielles Segen',[['Dornenschild (Ward 6+)',0],['Jadeschauer (Heilen W3)',1]]);
  if(e){const ch=[],rs=[];for(let n=0;n<3;n++){const l=S.U.filter(x=>x.o==p&&x.x>=0&&x.dmg>0&&canHeal(S,x)&&!ch.includes(x));if(!l.length)break;
    const x=yield* ask(G,p,'Jadeschauer: Einheit '+(n+1)+' von 3 (Heilen W3)',l.map(x=>[x.name+' ('+x.dmg+' Schaden)',x]));if(!x)break;const r=d3(S);x.dmg=Math.max(0,x.dmg-r);ch.push(x);rs.push(r)}
   if(ch.length){G.rep('Jadeschauer: Heilen (W3) je Einheit',ch.map((x,i)=>({k:'row',l:x.name,v:[rs[i]]})),0);lg.push('Jadeschauer heilt: '+ch.map((x,i)=>x.name+' +'+rs[i]).join(', '))}}
  else TW.wd=yield* A(G,p,'Dornenschild: Einheit wählen',un(p))}
 else if(key=='tl')TW.wu=u;
 else if(key=='gv'){const p=who();TW.ens=yield* A(G,p,'Fesselnde Ranken: Gegner wählen',un(1-p));const e=byId(S,TW.ens);if(e){e.mv0=e.mv;e.mv/=2}}
 else if(key=='gb'){const p=who(),e=yield* A(G,p,'Segen des Großvaters',[['Nurgles Fäule (Schutzwürfe −1)',0],['Zersetzender Dunst (kein Ward)',1]]);
  const id=yield* A(G,p,'Gegner wählen',un(1-p));if(e)TW.nw=id;else TW.rot=id}
 if(HK.ap&&K.pack>=1)yield* HK.ap(G,u,key,{A,who,un,ob,lg});
 if(key=='rf'||key=='og')updCtrl(S);
 if(lg.length)yield* info(G,0,'Wendungskarte: '+TWD[K.realm][K.tw-1][1],lg.join('<br>'),'Weiter')}
export function twVP(S,o){const k=S.TW.id,ob=S.TW.obj||[];
 if(S.K.pack>=1&&HK.vp)return HK.vp(S,o);
 if(k=='bl')return S.D[1-o];
 if(k=='rc')return ob.filter(i=>S.oc[i]===o).length;
 if(k=='ma')return S.obj.filter((p,i)=>S.oc[i]===o&&S.ocs[i]===1-o).length;
 if(k=='ls')return S.oc[ob[0]]===o?1:0;
 if(k=='tl'){const t=lt(S,1-o);return t&&mm(S,o,t)>mm(S,1-o,t)?1:0}
 return 0}
export function twAfter(G){const S=G.S,k=S.TW.id,i=(S.TW.obj||[])[0];if(i==null||S.K.pack>=1)return;const p=S.obj[i];
 if(k=='rf')S.U.filter(u=>u.x>=0&&Math.hypot(u.x-p[0],u.y-p[1])-u.r<=3).forEach(u=>{const d=d3(S);G.rep('Feuerring: W3 tödlicher Schaden auf '+u.name,[{k:'row',l:'',v:[d]}],0);hurt(G,u,d)});
 if(k=='ls')S.U.filter(u=>u.x>=0&&ct(u,p)).forEach(u=>{if(canHeal(S,u)&&u.dmg>0){u.dmg=Math.max(0,u.dmg-1);G.note('Heilung am Ziel: '+u.name+' heilt 1')}})}
export function twRound(G){const S=G.S,TW=S.TW;if(S.K.pack>=1&&HK.round)HK.round(G);if(TW.id=='bm'&&TW.bm)[0,1].forEach(o=>{if(TW.bm[o]!=null&&has(S.dead,TW.bm[o])){S.P[o].vp++;G.note(S.P[o].n+': Blutmarkierte Einheit zerstört (+1 SP)')}});
 if(TW.ens!=null){const e=byId(S,TW.ens);if(e)e.mv=e.mv0}S.TW={}}

// ---------- Bewegung/Angriff als Teilabläufe (auch für Befehle genutzt) ----------
export function* destReq(G,u,rng,x={}){return yield {t:'dest',who:u.o,u:u.id,rng,...x,check:a=>a&&a.stay?'':(a&&Number.isFinite(a.x)&&Number.isFinite(a.y)?moveErr(G.S,u,a.x,a.y,rng,a.rot):'Ungültig')}}
function* tisch(G,u){const S=G.S,o=1-u.o,g=gnl(S,o);if(ENI(S,o)!='ss_tisch'||usedKey(S,o+':tisch','battle')||!g||dist(g,u)>12)return 0;
 const full=!!S.kes[o];let i;
 if(G.isAI(o))i=full?1:0;else i=yield* choice(G,o,'Reaktion: Widerliche Tischmanieren',u.name+' sagt Angriff an. Vom Angriffswurf abziehen:',[{t:'W3 abziehen'},...(full?[{t:'3 abziehen',s:'Der Kessel wird danach leer'}]:[]),{t:'Nicht einsetzen'}],{pref:0});
 if(i>=(full?2:1))return 0;useKey(S,o+':tisch','battle');if(i==1&&full){S.kes[o]=0;G.note('Widerliche Tischmanieren: −3 auf den Angriffswurf, der Kessel wird leer');return 3}const d=d3(S);G.note('Widerliche Tischmanieren: −'+d+' auf den Angriffswurf');return d}
export function* doCharge(G,u){const S=G.S,P=S.P[u.o];const tp=yield* tisch(G,u);S.T.cs[u.id]=[u.x,u.y];
 const dice=()=>{const a=[d6(S),S.TW.ens==u.id?0:d6(S)];if(a[1]&&fxL(S,u,'cdlow').length){const m=Math.min(a[0],a[1]);a[0]=a[1]=m}if(hasAb(u,'bot'))a.push(d6(S));for(let k=fxSum(S,u,'cdie');k>0&&a.length>1;k--)a.pop();return a};
 const mod=()=>-(cycOf(S,1-u.o)==4?1:0)+(u.gen&&ENI(S,u.o)=='fe_schritte'?1:0)+fxSum(S,u,'chg')+(wgN(S,u.o)==3?1:0)+(AN(S,u.o)=='Herzspaltzirkel'&&rl(S,u.o)>=2?1:0)-(AN(S,1-u.o)=='Grundstok-Wegbereiter'&&RGI(S,1-u.o)=='gw_prop'&&S.U.some(k=>k.o==1-u.o&&k.dn=='Grundstok-Kanonenboot'&&k.x>=0&&dist(u,k)<=9)?1:0)-tp;
 let rr=(fxL(S,u,'rrc').length>0||hasAb(u,'tr_ugesch'))&&!usedKey(S,u.id+':rrc','turn');
 let ds=dice();add(S.Ph.used,u.id);
 const sum=()=>ds.reduce((x,y)=>x+y,0),blk=()=>[{k:'row',l:hasAb(u,'bot')?'Angriffswurf (2W6 + 1 Würfel)':'Angriffswurf (2W6)',v:ds},{k:'txt',s:`Summe <b>${sum()}</b>${mod()?' ('+(mod()>0?'+':'')+mod()+' Modifikator)':''}`}];
 if(!G.isAI(u.o)){
  for(let k=0;k<4;k++){const o1=[{t:'Ziel wählen'}],ks=['go'],fdv=(S.fd&&S.fd[u.o]||[]).slice().sort((x,y)=>y-x);if(FW(S,P,7)){o1.push({t:'Vorwärts zum Sieg: neu würfeln',s:'Karte wird abgelegt'});ks.push('fw')}if(rr){o1.push({t:hasAb(u,'tr_ugesch')?'Unübertroffene Geschwindigkeit: neu würfeln':'Angetrieben von Hass: neu würfeln',s:'Einmal je Angriff'});ks.push('rr')}if(fdv.length&&(S.fdp||[0,0])[u.o]&&ds.length>1&&Math.min(...ds)<fdv[0]){o1.push({t:'Schicksalswürfel einsetzen',s:'Ersetzt den niedrigsten Würfel durch einen Schicksalswürfel ('+fdv.join(', ')+')'});ks.push('fd')}
   const i=yield* choice(G,u.o,k?'Angriff (wiederholt)':'Angriff','Angriffswurf',o1,{blocks:blk()}),key=ks[i];if(key=='go')break;
   if(key=='fw'){useCard(S,u.o,7);ds=dice()}else if(key=='rr'){useKey(S,u.id+':rrc','turn');rr=false;ds=dice()}else if(key=='fd'){const li=ds.indexOf(Math.min(...ds));const v=S.fd[u.o].splice(S.fd[u.o].indexOf(Math.max(...S.fd[u.o])),1)[0];G.note('Schicksalswürfel: '+ds[li]+' → '+v);ds[li]=v}}}
 else{if(rr&&sum()<8){useKey(S,u.id+':rrc','turn');ds=dice()}while(S.fd&&S.fd[u.o]&&S.fd[u.o].length&&S.fdp[u.o]==1&&ds.length>1&&sum()+mod()<8&&Math.max(...S.fd[u.o])>Math.min(...ds)){const li=ds.indexOf(Math.min(...ds));const v=S.fd[u.o].splice(S.fd[u.o].indexOf(Math.max(...S.fd[u.o])),1)[0];G.note('Schicksalswürfel (Angriff): '+ds[li]+' → '+v);ds[li]=v}G.tray(`Computer: ${u.name} würfelt Angriff`,[{k:'row',l:'Angriffswurf',v:ds},{k:'txt',s:`Summe ${sum()}`}])}
 if(AN(S,u.o)=='Magma-Fyrd'&&!usedKey(S,u.o+':bers','turn')){const y=G.isAI(u.o)?(sum()+mod()<8?0:1):yield* choice(G,u.o,'Berserker-Angriff','Angriffswurf wiederholen? Bei Erfolg kämpft die Einheit bis zu deinem nächsten Zug zuerst. (1× pro Zug)',[{t:'Wiederholen'},{t:'Nicht wiederholen'}],{pref:1,blocks:blk()});
  if(y==0){useKey(S,u.o+':bers','turn');ds=dice();add(S.T.bers,u.id);G.tray('Berserker-Angriff: neu gewürfelt',[{k:'row',l:'Angriffswurf',v:ds}])}}
 const roll=Math.max(0,sum()+mod());S.T.cr[u.id]=roll;S.T.cr0[u.id]=sum();
 const ans=yield {t:'dest',who:u.o,u:u.id,rng:roll,chg:1,roll,text:'Angriffswurf '+roll,check:x=>x&&x.stay?'':(x&&x.P?chargeModelErr(S,u,x.P,roll):(x&&Number.isFinite(x.x)&&Number.isFinite(x.y)?chargeErr(S,u,x.x,x.y,roll):'Ungültig'))};
 if(ans.stay){G.rep('Angriff gescheitert',[{k:'txt',s:`${u.name} bleibt stehen (Wurf ${roll}").`}]);return}
 if(ans.P)setAbs(u,ans.P.map(p=>({x:+p[0],y:+p[1]})));else{u.x=ans.x;u.y=ans.y}add(S.T.charged,u.id);if(has(S.T.bers,u.id))addFx(S,{k:'first',u:u.id,exp:'own'});G.rep('Angriff erfolgreich',[{k:'txt',s:`${u.name} hat mit Wurf ${roll}" einen Feind erreicht.`}])}
export function* doRun(G,u){const S=G.S;
 let vf=EN(S,u.o)=='Vorwärts!'&&!S.T.vw&&!isHero(u)&&S.U.some(g=>g.o==u.o&&g.gen&&g.x>=0&&dist(u,g)<=12),r=vf?6:(()=>{let q=d6(S);if(q<=3){const g=gnl(S,u.o);if(hasAb(u,'ep_wahn')||(ENI(S,u.o)=='fp_lunge'&&g&&u.x>=0&&wholly(u,g,9)))q=4}return Math.max(0,q+fxSum(S,u,'run')+(wgN(S,u.o)==3?1:0)+(AN(S,u.o)=='Herzspaltzirkel'?1:0))})();
 if(vf){S.T.vw=true;G.note('Vorwärts!: +6 Zoll statt Rennenwurf')}
 else if(S.fd&&S.fd[u.o]&&S.fd[u.o].length&&r<=3){const vs=[r],r0=r;yield* fdStage(G,u.o,vs,x=>x>r0+1,[1,1],'Rennenwurf: '+r0,false,true);r=vs[0]}
 add(S.Ph.used,u.id);add(S.T.ran,u.id);
 G.rep(G.isAI(u.o)?`Computer: ${u.name} rennt`:'Rennen',[{k:'row',l:'Rennenwurf',v:[r]},{k:'txt',s:`Bewegung bis ${mvOf(S,u)+r} Zoll`}]);
 S.T.mvt[u.id]=mvOf(S,u)+r;const a=yield* destReq(G,u,mvRest(S,u,r),{run:1});if(!a.stay){const L=applyMove(S,u,a,mvRest(S,u,r));add(S.T.moved,u.id);S.T.mvd[u.id]=(S.T.mvd[u.id]||0)+L}}
export function* doRetreat(G,u,opt={}){const S=G.S,P=S.P[u.o];add(S.Ph.used,u.id);add(S.T.ran,u.id);add(S.T.rtr||(S.T.rtr=[]),u.id);S.T.mvt[u.id]=0;let am=false;
 if(!opt.free&&RGI(S,u.o)=='am'&&!usedKey(S,u.o+':am','battle')){const y=G.isAI(u.o)?(inCombat(S,u)?0:1):yield* choice(G,u.o,'Reaktion: Am richtigen Ort zuschlagen','Kein tödlicher Schaden; die Einheit darf danach noch angreifen. (1× pro Schlacht)',[{t:'Einsetzen'},{t:'Nicht einsetzen'}],{pref:1});if(y==0){useKey(S,u.o+':am','battle');am=true;add(S.T.FZ,u.id);G.note('Am richtigen Ort zuschlagen: kein tödlicher Schaden, Angriff danach erlaubt')}}
 if(!opt.free&&!G.isAI(u.o)&&FW(S,P,12)&&u.n<u.nmax&&canHeal(S,u)){
  const i=yield* choice(G,u.o,'Rückzug','Möchtest du Fall Back and Rally einsetzen? (Karte wird abgelegt)',[{t:'Ja'},{t:'Nein'}],{pref:1});
  if(i==0){useCard(S,u.o,12);const s=canHeal(S,u)?u.nmax-u.n:0,rs=[];for(let k=0;k<s;k++)rs.push(d6(S));const b=rs.filter(x=>x>=5).length;u.n=Math.min(u.nmax,u.n+b);G.tray('Fall Back and Rally',[{k:'row',l:b+' Modelle zurück (5+)',v:rs,th:5}]);
   const a=yield* destReq(G,u,mvOf(S,u),{ret:1,text:'Kein tödlicher Schaden'});if(!a.stay){applyMove(S,u,a,mvOf(S,u));add(S.T.moved,u.id)}return}}
 const kl=fxL(S,u,'klaev').length>0;if(kl)add(S.T.FZ,u.id);const nod=opt.free||am||kl||RGI(S,u.o)=='zsz'||AN(S,u.o)=='Rudelfletscha-Jäga'||hasAb(u,'stelzen')||(u.dn=='Squighoppa'&&litIn(S,u))||(u.gen&&ENI(S,u.o)=='gw_blut');const d=nod?0:Math.max(0,d3(S)-(u.gen&&ENI(S,u.o)=='gw_rueck'?1:0));if(nod&&!am&&!opt.free)G.note('Zu schnell zum Treffen-Treffen: kein tödlicher Schaden');else{G.tray(G.isAI(u.o)?'Computer: Rückzug':'Rückzug: W3 tödlicher Schaden',[{k:'row',l:'',v:[d]}]);hurt(G,u,d)}
 if(u.n>0&&S.U.includes(u)){const a=yield* destReq(G,u,mvOf(S,u),{ret:1,text:`${d} tödlicher Schaden`});if(!a.stay){applyMove(S,u,a,mvOf(S,u));add(S.T.moved,u.id)}}}

// ---------- Befehle ----------
const pickU=(G,s,t,l)=>ask(G,s,t,l.map(x=>[x.name+' ('+wnd(x)+'/'+mx(x)+')',x]));
export const CE={
 1:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Stand Guard: Einheit wählen',myU(S,s));if(x){add(S.T.SF,x.id);G.note('Kämpft zuerst in diesem Zug: '+x.name)}},
 3:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Redeploy: Einheit wählen',myU(S,s).filter(x=>!inCombat(S,x)));if(!x)return;const r=d6(S);G.tray('Redeploy',[{k:'row',l:'',v:[r]}]);
  const a=yield* destReq(G,x,r);if(!a.stay){applyMove(S,x,a,r);add(S.T.moved,x.id)}},
 5:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Rise to the Challenge: Held wählen',myU(S,s).filter(x=>isHero(x)&&canHeal(S,x)));if(x){const r=d6(S);x.dmg=Math.max(0,x.dmg-r);G.tray('Rise to the Challenge: Heilen (W6)',[{k:'row',l:'',v:[r]}])}},
 6:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Counter-Charge: Einheit wählen',myU(S,s).filter(x=>!inCombat(S,x)));if(x)yield* doCharge(G,x)},
 8:function*(G,s){const S=G.S,h=yield* pickU(G,s,'Scroll of Arcane Bolt: Held wählen',myU(S,s).filter(isHero));if(!h)return;
  const e=yield* ask(G,s,'Ziel wählen (12 Zoll)',foes(S,h).filter(e=>e.x>=0&&dist(h,e)<=12).map(e=>[e.name,e]));if(!e)return;
  const r=d6(S),d=r>=2?d3(S):0;G.tray('Scroll of Arcane Bolt',[{k:'row',l:'',v:[r],th:2},{k:'txt',s:d?d+' tödlicher Schaden':'Kein Effekt'}]);if(d)hurt(G,e,d)},
 10:function*(G,s){const S=G.S,x=yield* pickU(G,s,'Inspiring Presence: Held wählen',myU(S,s).filter(isHero));if(x){const r=d6(S);S.T.cvb[x.id]=r;G.tray('Inspiring Presence',[{k:'row',l:'',v:[r]},{k:'txt',s:'Kontrollwert +'+r+' bis Zugende'}])}},
 11:function*(G,s){const S=G.S,l=S.GY.filter(g=>g.o==s&&/Infanterie|Kavallerie/.test(g.kw)&&g.nmax>=5&&!g.rp);
  const g=yield* ask(G,s,'Call Reinforcements: Einheit wählen',l.map(g=>[g.name,g]));if(!g)return;g.rp=1;const k=d3(S);
  G.tray('Call Reinforcements',[{k:'row',l:k+' Modelle',v:[k]}]);const q=Object.assign(mkUnit(g.dn,s,S.NID++,k),{rp:1});
  const a=yield* place(G,s,'rein',q,'Call Reinforcements','Aufstellen: mehr als 6 Zoll von allen Gegnern');q.x=a.x;q.y=a.y;S.U.push(q)}};
// Ein Befehl wird nur angeboten, wenn er überhaupt einen Effekt haben kann
export function cmdOk(S,s,c){const my=myU(S,s).filter(x=>x.x>=0);
 switch(c){
  case 1:return my.length>0;
  case 3:return my.some(x=>!inCombat(S,x));
  case 5:return my.some(x=>isHero(x)&&canHeal(S,x)&&x.dmg>0);
  case 6:return my.some(x=>!inCombat(S,x)&&foes(S,x).some(e=>e.x>=0&&dist(x,e)<=12+3));
  case 8:return my.some(x=>isHero(x)&&foes(S,x).some(e=>e.x>=0&&dist(x,e)<=12));
  case 10:return my.some(isHero);
  case 11:return S.GY.some(g=>g.o==s&&/Infanterie|Kavallerie/.test(g.kw)&&g.nmax>=5&&!g.rp);
  case 12:return true;
  default:return true}}
export function* cmdWindow(G){const S=G.S;
 for(const s of [0,1]){if(G.isAI(s))continue;
  while(!S.over){const mineT=S.act==s;const h=S.P[s].hand.filter(c=>{const m=CMD[c];return m.ph==S.ph&&(m.w=='any'||(m.w=='opp'&&!mineT)||(m.w=='own'&&mineT))&&(S.K.pack>=1?HK.ok(S,s,c):cmdOk(S,s,c))}),tb=S.K.pack>=1&&HK.ta?HK.ta(S,s):[];if(!h.length&&!tb.length)break;
   const i=yield* choice(G,s,'Befehle – '+['Beginn','Heldenphase','Bewegungsphase','Fernkampfphase','Angriffsphase','Nahkampfphase','Ende'][S.ph],mineT?'Deine Phase: Möchtest du einen Befehl einsetzen? (Karte wird abgelegt)':'Gegnerische Phase: Möchtest du reagieren? (Karte wird abgelegt)',[...h.map(c=>({t:TAC[c-1][2],s:TAC[c-1][3]})),...tb.map(x=>({t:x.t,s:x.s})),{t:'Keinen Befehl'}],{pref:h.length+tb.length});
   if(i==h.length+tb.length)break;if(i>=h.length){yield* tb[i-h.length].run(G);continue}const c=h[i];useCard(S,s,c);yield* CE[c](G,s)}}}
