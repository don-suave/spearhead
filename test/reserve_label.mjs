import {Game} from '../src/game.js';import {mkUnits,setObj,newPh,newT} from '../src/state.js';import {ARMY} from '../src/data.js';import {globals} from '../src/rules.js';
const a=ARMY.findIndex(x=>x.n=='Blutdrangjagd');const g=new Game(7,['h','ai']);const S=g.S;S.K.army=[a,0];S.K.map=0;S.K.terr=[0,1];S.K.reg=[0,0];S.K.enh=[0,0];S.K.realm=0;setObj(S);mkUnits(S);
S.stage=1;S.T=newT();S.Ph=newPh();S.round=3;S.tn=5;S.act=0;S.ph=2;
console.log(S.U.filter(u=>u.o==0).map(u=>[u.name,u.x,u.rsv,u.rr,u.rph,u.lim].join('|')));
console.log(globals(S,0).map(x=>x.k+' '+x.t));
import assert from 'node:assert/strict';assert.ok(globals(S,0).some(g=>/^Sturzflug: Vargheister/.test(g.t)));console.log('Reserve-Beschriftung ok')
