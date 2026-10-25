// Automatisches Nachrücken: regelgerecht, mehr Modelle am Feind und auf dem Ziel als vorher
import assert from 'node:assert/strict';import {Game} from '../src/game.js';import {mkUnit,setObj,newPh,newT} from '../src/state.js';import {autoPile,pileModelErr} from '../src/rules.js';import {abs,mgap,setAbs} from '../src/models.js';
const g=new Game(7,['h','ai']);const S=g.S;S.K.army=[0,1];S.K.map=0;S.K.terr=[0,1];S.K.reg=[0,0];S.K.enh=[0,0];S.K.realm=0;setObj(S);S.stage=1;S.T=newT();S.Ph=newPh();S.ph=5;S.act=0;
const add=(dn,o,x,y)=>{const u=mkUnit(dn,o,S.NID++);u.x=x;u.y=y;S.U.push(u);return u};
const a=add('Freigilden-Stahlhelme',0,20,10),b=add('Wanstreißa',1,20,13.2);S.obj=[[22.5,12]];S.oc=[-1];
const cnt=(P)=>({inr:P.filter(p=>abs(b).some(q=>mgap({x:p[0],y:p[1],a:0,l:1,w:1},q)<=3)).length,obj:P.filter(p=>Math.hypot(p[0]-22.5,p[1]-12)<=3).length});
const P0=abs(a).map(m=>[m.x,m.y]),P=autoPile(S,a,b);assert.ok(P,'Ergebnis');assert.equal(pileModelErr(S,a,b,P),'');
const c0=cnt(P0),c1=cnt(P);console.log('vorher',c0,'nachher',c1);assert.ok(c1.inr>=c0.inr&&c1.obj>=c0.obj&&(c1.inr+c1.obj>c0.inr+c0.obj));
const P2=autoPile(S,a,b,P);assert.ok(P2&&pileModelErr(S,a,b,P2)=='');console.log('autopile ok')
