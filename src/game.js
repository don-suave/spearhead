// Game: führt den Regelablauf als Generator aus. Jede Entscheidung ist eine Anfrage (req),
// jede Antwort wird protokolliert. Seed + Antwort-Log ergeben exakt denselben Spielstand.
import {newState} from './state.js';
import {syncM} from './models.js';
export class Game{
 constructor(seed=(Date.now()>>>0),ctl=['h','ai'],flow=null){
  this.seed=seed;this.S=newState(seed);this.ctl=ctl;this.log=[];this.lk=[];this.events=[];this.req=null;this.gen=null;this.flow=flow}
 start(flow){this.flow=flow||this.flow;this.gen=this.flow(this);this._step(undefined);return this}
 isAI(o){return this.ctl[o]=='ai'}
 emit(e){this.events.push(e)}
 tray(title,blocks){this.emit({t:'tray',title,blocks})}
 // Meldung: Pop-up für den aktiven lokalen Spieler, sonst Einblendung (entscheidet die Ansicht)
 rep(title,blocks,who){this.emit({t:'rep',title,blocks,act:who==null?this.S.act:who})}
 msg(title,blocks){this.emit({t:'msg',title,blocks})}
 note(text){if(this.phEv)this.phEv.push(text);this.emit({t:'note',text})}
 _step(a){const r=this.gen.next(a);this.req=r.done?null:r.value;const S=this.S;S.U.forEach(u=>{if(u.M&&u.x>=0&&u.M.length!=u.n)syncM(S,u,S.U.filter(e=>e.o!=u.o))})}
 check(a){return this.req?(this.req.check?this.req.check(a):''):'Keine offene Anfrage'}
 submit(a){const e=this.check(a);if(e)return e;this.lk.push(this.req?this.req.t+':'+(this.req.kind||(a&&a.a)||''):'');this.log.push(a);this._step(a);return ''}
 // Rückgängig: Logindex, auf den zurückgesetzt wird (-1 = nicht möglich). Aufstellung: ganz von vorne; sonst letzte Bewegung/Anpassung.
 undoIdx(){const q=this.req,L=this.lk;if(!q||this.isAI(q.who))return -1;
  if(q.t=='place'&&q.kind=='dep'){let i=L.length;while(i>0&&L[i-1]=='place:dep')i--;return i<L.length?i:-1}
  if(q.t=='act'){let i=L.length-1;while(i>=0&&!L[i].startsWith('act:'))i--;
   if(i>=0&&/^act:(move|adj|run|retreat|charge|amb|rsv:\d+)$/.test(L[i])&&!L.slice(i+1).some(x=>x.startsWith('act:')))return i}return -1}
 // Spielstand aus Seed und Antworten rekonstruieren
 static replay(seed,ctl,flow,log){const g=new Game(seed,ctl).start(flow);for(const a of log){const e=g.submit(a);if(e)throw new Error('Replay: '+e)}return g}
}
// ---- Anfrage-Helfer (innerhalb von Generatoren) ----
export function* choice(G,who,title,text,opts,x={}){
 return yield {t:'choice',who,title,text,opts,close:false,...x,check:a=>(Number.isInteger(a)&&a>=0&&a<opts.length&&!opts[a].dis)?'':'Ungültige Wahl'}}
export function* ask(G,who,title,list,text=''){
 if(!list.length)return null;const i=yield* choice(G,who,title,text,list.map(c=>({t:c[0]})),{vals:list.map(c=>c[1]&&typeof c[1]=='object'?(c[1].dn?{u:c[1].id}:null):c[1]),tg:list.map(c=>{const v=c[1];if(v&&typeof v=='object'){if(v.dn)return {k:'u',id:v.id};const i=G.S.ter?G.S.ter.indexOf(v):-1;return i>=0?{k:'t',i}:null}return typeof v=='number'?{k:'n',v}:null})});
 if(G.isAI(who))G.note(G.S.P[who].n+' wählt: '+list[i][0]);return list[i][1]}
export function* info(G,who,title,text,btn='Weiter',x={}){
 yield {t:'info',who,title,text,btn,...x,check:a=>a===true?'':'Bestätigen'}}

// Startoptionen auf einen Blick: groups=[{n,opts:[{t,s}],def}], Antwort 0 = Voreinstellungen oder Array der gewählten Indizes
export function* settings(G,title,text,groups){
 const a=yield {t:'choice',who:0,title,text,opts:[{t:'Start'}],set:groups,close:false,check:a=>a===0||(Array.isArray(a)&&a.length==groups.length&&a.every((v,i)=>Number.isInteger(v)&&v>=0&&v<groups[i].opts.length))?'':'Ungültige Wahl'};
 return a===0?groups.map(g=>g.def||0):a}
