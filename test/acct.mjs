// Konto-/Freunde-API gegen eine SQLite-Attrappe des D1-Bindings
import {DatabaseSync} from 'node:sqlite';import {onRequestPost,onRequestGet} from '../functions/api/acct.js';
const sq=new DatabaseSync(':memory:');
const stmt=q=>{const s=sq.prepare(q);let a=[];const o={bind:(...x)=>{a=x;return o},run:async()=>{s.run(...a)},first:async()=>s.get(...a)||null,all:async()=>({results:s.all(...a)})};return o};
const env={DB:{prepare:stmt}};
const post=async b=>{const r=await onRequestPost({request:new Request('http://x/api/acct',{method:'POST',body:JSON.stringify(b)}),env});return [r.status,await r.json()]};
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('FAIL',n))};
const [,A]=await post({op:'new',name:'Alex'}),[,B]=await post({op:'new',name:'Bo<b>'});
T('konto',A.id&&A.secret&&B.name=='Bob');
T('falsches geheimnis',(await post({op:'friends',id:A.id,secret:'x'}))[0]==401);
const [,I]=await post({op:'invite',id:A.id,secret:A.secret});T('invite',I.code);
const g=await onRequestGet({request:new Request('http://x/api/acct?code='+I.code),env});T('preview',(await g.json()).name=='Alex');
T('eigene einladung',(await post({op:'accept',id:A.id,secret:A.secret,code:I.code}))[0]==400);
const [s2,F]=await post({op:'accept',id:B.id,secret:B.secret,code:I.code});T('accept',s2==200&&F.friend.name=='Alex');
T('einmalig',(await post({op:'accept',id:B.id,secret:B.secret,code:I.code}))[0]==404);
const [,LA]=await post({op:'friends',id:A.id,secret:A.secret}),[,LB]=await post({op:'friends',id:B.id,secret:B.secret});
T('liste A',LA.friends.length==1&&LA.friends[0].name=='Bob');T('liste B',LB.friends.length==1&&LB.friends[0].name=='Alex');
console.log(ok+' bestanden, '+bad+' fehlgeschlagen');process.exit(bad?1:0);
