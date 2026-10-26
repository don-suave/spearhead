// Gemeinsame Datenbank-Hilfe: legt die Tabelle beim ersten Aufruf selbst an (nur das D1-Binding "DB" muss existieren)
let ready=false;
export async function db(env){
 if(!env.DB)return null;
 if(!ready){
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS games(pid TEXT NOT NULL, seed INTEGER NOT NULL, name TEXT, ver TEXT, pack INTEGER, field TEXT, map TEXT, army TEXT, foe TEXT, att INTEGER, started INTEGER, ended INTEGER, round INTEGER, vp_h INTEGER, vp_c INTEGER, winner INTEGER, opts TEXT, PRIMARY KEY(pid,seed))').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS games_started ON games(started)').run();
  ready=true}
 return env.DB}
export const fail=(msg,code=503)=>new Response(JSON.stringify({error:msg}),{status:code,headers:{'content-type':'application/json','cache-control':'no-store'}});
export const NODB='Datenbank nicht verbunden: In Cloudflare unter Settings > Bindings eine D1-Datenbank mit dem Namen DB hinzufügen';
