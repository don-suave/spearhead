// POST /api/acct – gerätegebundene Konten und Freundesliste (D1-Binding "DB")
// op: new | rename | invite | accept | friends   ·   GET ?code=… zeigt den Namen des Einladenden
import {fail,NODB} from './_db.js';
let ready=false;
async function tabs(D){if(ready)return;
 await D.prepare('CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, name TEXT NOT NULL, sh TEXT NOT NULL, created INTEGER)').run();
 await D.prepare('CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY, from_id TEXT NOT NULL, created INTEGER, used_by TEXT)').run();
 await D.prepare('CREATE TABLE IF NOT EXISTS friends(a TEXT NOT NULL, b TEXT NOT NULL, created INTEGER, PRIMARY KEY(a,b))').run();ready=true}
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const J=(o,c=200)=>new Response(JSON.stringify(o),{status:c,headers:{'content-type':'application/json','cache-control':'no-store'}});
const nm=v=>String(v==null?'':v).replace(/[<>&"]/g,'').trim().slice(0,20)||'Gast';
const DAY=864e5;
async function auth(D,b){if(!b.id||!b.secret)return null;const r=await D.prepare('SELECT id,name,sh FROM accounts WHERE id=?').bind(String(b.id).slice(0,40)).first();
 return r&&r.sh===await sha(String(b.secret))?r:null}
export async function onRequestGet({request,env}){
 const D=env.DB;if(!D)return fail(NODB);await tabs(D);
 const c=new URL(request.url).searchParams.get('code');if(!c)return new Response('bad',{status:400});
 const r=await D.prepare('SELECT a.name AS name, i.used_by AS used, i.created AS created FROM invites i JOIN accounts a ON a.id=i.from_id WHERE i.code=?').bind(c.slice(0,40)).first();
 if(!r||r.used||r.created<Date.now()-14*DAY)return J({error:'Einladung ungültig oder abgelaufen'},404);return J({name:r.name})}
export async function onRequestPost({request,env}){
 const D=env.DB;if(!D)return fail(NODB);await tabs(D);
 let b;try{b=await request.json()}catch(e){return new Response('bad',{status:400})}
 if(!b)return new Response('bad',{status:400});const now=Date.now();
 if(b.op=='new'){const id=rnd(8),secret=rnd(16);await D.prepare('INSERT INTO accounts(id,name,sh,created) VALUES(?,?,?,?)').bind(id,nm(b.name),await sha(secret),now).run();return J({id,secret,name:nm(b.name)})}
 const me=await auth(D,b);if(!me)return J({error:'Konto unbekannt'},401);
 if(b.op=='rename'){await D.prepare('UPDATE accounts SET name=? WHERE id=?').bind(nm(b.name),me.id).run();return J({name:nm(b.name)})}
 if(b.op=='invite'){const n=await D.prepare('SELECT COUNT(*) AS n FROM invites WHERE from_id=? AND used_by IS NULL AND created>?').bind(me.id,now-14*DAY).first();
  if(n&&n.n>=20)return J({error:'Zu viele offene Einladungen'},429);const code=rnd(6);await D.prepare('INSERT INTO invites(code,from_id,created) VALUES(?,?,?)').bind(code,me.id,now).run();return J({code})}
 if(b.op=='accept'){const c=String(b.code||'').slice(0,40);const i=await D.prepare('SELECT code,from_id,created,used_by FROM invites WHERE code=?').bind(c).first();
  if(!i||i.used_by||i.created<now-14*DAY)return J({error:'Einladung ungültig oder abgelaufen'},404);
  if(i.from_id===me.id)return J({error:'Das ist deine eigene Einladung'},400);
  const [x,y]=[me.id,i.from_id].sort();await D.prepare('INSERT INTO friends(a,b,created) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(x,y,now).run();
  await D.prepare('UPDATE invites SET used_by=? WHERE code=?').bind(me.id,c).run();
  const f=await D.prepare('SELECT id,name FROM accounts WHERE id=?').bind(i.from_id).first();return J({friend:f})}
 if(b.op=='friends'){const r=await D.prepare('SELECT a.id AS id, a.name AS name FROM friends f JOIN accounts a ON a.id=CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE f.a=? OR f.b=? ORDER BY a.name').bind(me.id,me.id,me.id).all();
  return J({me:{id:me.id,name:me.name},friends:(r.results||[]).map(x=>({id:x.id,name:x.name}))})}
 return new Response('bad',{status:400})}
