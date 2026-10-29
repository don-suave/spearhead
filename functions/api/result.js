// POST /api/result – speichert Start/Ende einer Partie (D1-Binding "DB")
const s=(v,n)=>String(v==null?'':v).slice(0,n),i=v=>Number.isFinite(+v)?Math.trunc(+v):null;
import {db,fail,NODB} from './_db.js';
export async function onRequestPost({request,env}){
 let D;try{D=await db(env)}catch(e){return fail('Datenbankfehler',500)}
 if(!D)return fail(NODB);
 let b;try{b=await request.json()}catch(e){return new Response('bad',{status:400})}
 if(!b||!b.pid||b.seed==null||!['start','end'].includes(b.ev))return new Response('bad',{status:400});
 const now=Date.now(),tt=v=>Number.isFinite(+v)&&+v>now-90*864e5&&+v<=now+6e4?Math.trunc(+v):now,t1=tt(b.t),t0=tt(b.t0||b.t),vp=Array.isArray(b.vp)?b.vp:[0,0];
 const base=[s(b.pid,64),i(b.seed),s(b.name,20),s(b.v,12),i(b.pack),s(b.field,40),s(b.map,12),s(b.army,60),s(b.foe,60),i(b.att),s(JSON.stringify(b.opts||{}),200)];
 if(b.ev=='start')await D.prepare('INSERT INTO games(pid,seed,name,ver,pack,field,map,army,foe,att,opts,started,round,vp_h,vp_c) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,0,0) ON CONFLICT(pid,seed) DO NOTHING').bind(...base,t0).run();
 else await D.prepare('INSERT INTO games(pid,seed,name,ver,pack,field,map,army,foe,att,opts,started,ended,round,vp_h,vp_c,winner) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(pid,seed) DO UPDATE SET ended=excluded.ended,round=excluded.round,vp_h=excluded.vp_h,vp_c=excluded.vp_c,winner=excluded.winner,name=excluded.name').bind(...base,t0,t1,i(b.round),i(vp[0]),i(vp[1]),i(b.winner)).run();
 return new Response('ok');
}
