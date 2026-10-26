// GET /api/stats – letzte 3000 Partien als JSON
import {db,fail,NODB} from './_db.js';
export async function onRequestGet({env}){
 let D;try{D=await db(env)}catch(e){return fail('Datenbankfehler: '+String(e&&e.message||e).slice(0,120))}
 if(!D)return fail(NODB);
 const r=await D.prepare('SELECT name,ver,pack,field,map,army,foe,att,started,ended,round,vp_h,vp_c,winner FROM games ORDER BY started DESC LIMIT 3000').all();
 return new Response(JSON.stringify(r.results),{headers:{'content-type':'application/json','cache-control':'no-store'}});
}
