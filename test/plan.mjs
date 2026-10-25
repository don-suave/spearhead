// Test der automatischen Formationen mit zufällig aufgestellten Einheiten
import {Game} from '../src/game.js';
import {mkUnit,setObj,newPh,newT} from '../src/state.js';
import {abs,cohBad} from '../src/models.js';
import {chargeModelErr,pileModelErr,dist} from '../src/rules.js';
import {chargePlan,pileAuto} from '../src/plan.js';
const g=new Game(7,['h','h']),S=g.S;S.K.army=[2,3];S.K.map=0;S.K.terr=[0,1];S.K.reg=[0,0];S.K.enh=[0,0];setObj(S);S.stage=1;S.T=newT();S.Ph=newPh();
const add=(dn,o,x,y)=>{const u=mkUnit(dn,o,S.NID++);u.x=x;u.y=y;S.U.push(u);return u};
import {ARMY} from '../src/data.js';
const nm=i=>ARMY[S.K.army[i]].units.map(d=>d.n);
const names=[nm(0),nm(1)];let n=0,ok={};
for(const a of names[0].filter((x,i)=>i<8))for(const b of names[1].filter((x,i)=>i<8)){
 S.U.length=0;const u=add(a,0,14,12),t=add(b,1,26,12);if(u.n<2)continue;
 for(const k of ['reach','obj','wrap','stretch']){const t0=Date.now(),r=chargePlan(S,u,t,12,k);const st=ok[k]||(ok[k]={ok:0,fail:0,ms:0});st.ms+=Date.now()-t0;
  if(r.P){if(chargeModelErr(S,u,r.P,12)){console.log('UNGÜLTIG',k,a,b,chargeModelErr(S,u,r.P,12));process.exit(1)}st.ok++}else st.fail++}
 u.x=t.x-(u.r+t.r+1);const pa=pileAuto(S,u,t,{tg:1,ob:1,te:1});if(pa&&pileModelErr(S,u,t,pa)){console.log('Nachrücken ungültig',a,b);process.exit(1)}n++}
console.log(n,'Paarungen',JSON.stringify(ok));
