// GET /api/stats – letzte 3000 Partien als JSON
export async function onRequestGet({env}){
 const r=await env.DB.prepare('SELECT name,ver,pack,field,map,army,foe,att,started,ended,round,vp_h,vp_c,winner FROM games ORDER BY started DESC LIMIT 3000').all();
 return new Response(JSON.stringify(r.results),{headers:{'content-type':'application/json','cache-control':'no-store'}});
}
