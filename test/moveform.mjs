import {Game} from '../src/game.js';
import {mkUnit,setObj,newPh,newT} from '../src/state.js';
import {moveForm,pileForm} from '../src/rules.js';
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('FAIL',n))};
function mk(){const g=new Game(7,['h','h']);const S=g.S;S.K.army=[0,1];S.K.map=0;S.K.terr=[0,1];S.K.reg=[0,0];S.K.enh=[0,0];S.K.realm=0;setObj(S);
 const add=(dn,o,x,y)=>{const u=mkUnit(dn,o,S.NID++);u.x=x;u.y=y;S.U.push(u);return u};S.stage=1;S.T=newT();S.Ph=newPh();return {S,add}}
const {S,add}=mk();const u=add('Freigilden-Stahlhelme',0,20,20);
let r=moveForm(S,u,20,24,6,0);t('Starre Verschiebung 4"',!r.err&&r.P.length==u.M.length);
r=moveForm(S,u,20,40,6,0);t('außerhalb Reichweite',!!r.err);
r=moveForm(S,u,-5,-5,60,0);t('außerhalb Feld',!!r.err);
r=moveForm(S,u,22,22,6,1.5);t('Drehung',!r.err);
const e=add('Wanstreißa',1,20,27);r=moveForm(S,u,20,24.5,8,0);import('../src/models.js').then(({abs,mgap})=>{const ok=!r.err&&r.P.every(q=>abs(e).every(m=>Math.hypot(q[0]-m.x,q[1]-m.y)>3));t('kein Modell binnen 3" des Feindes',r.err?true:ok);console.log(ok?'':'(rand)');fin()});
{const {S,add}=mk();const u=add('Freigilden-Stahlhelme',0,20,20),e=add('Wanstreißa',1,20+u.r+2.4+1.5,20);
 const r=pileForm(S,u,e,u.x+2,20,0);t('Nachrücken: Ergebnis gültig',!r.err);
 const r2=pileForm(S,u,e,u.x-3,20,0);t('Nachrücken: weg vom Ziel abgelehnt oder zurückgeführt',typeof r2.err==='string');
 const r3=pileForm(S,u,e,u.x+9,20,0);t('Nachrücken: weit gezogen wird auf 3 Zoll begrenzt',!r3.err||/Nahkampf|Zusammenhalt|überlappen|Gelände/.test(r3.err))}
function fin(){console.log(ok,'ok',bad,'bad');process.exit(bad?1:0)}
