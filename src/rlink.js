// Verknüpfung Spiel → Regel-App: Begriffe in Detailtexten werden unterstrichen und öffnen die exakte Stelle in der Regel-App.
import {LK} from './linkidx.js';
let RE=null,MAP=null,KEY='';
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// ais: Armee-Indizes der laufenden Partie (deren Fähigkeiten/Einheiten haben Vorrang)
function build(ais,pack=-1){
 const key=ais.join(',')+'|'+pack;if(RE&&key==KEY)return;KEY=key;
 const best=new Map();
 for(const [lab,href,ai,pr,pk] of LK){
  const k=lab.toLowerCase();const mine=(ai<0||ais.includes(ai))&&(pk<0||pack<0||pk==pack);if(!mine)continue;
  const cur=best.get(k);const sc=pr*10+(ai>=0?5:0);
  if(!cur||sc>cur.sc)best.set(k,{lab,href,sc})}
 MAP=best;
 const labs=[...best.values()].map(v=>v.lab).sort((a,b)=>b.length-a.length);
 RE=new RegExp('(^|[^\\p{L}\\p{N}])('+labs.map(esc).join('|')+')(?![\\p{L}\\p{N}])','giu')}
const SKIP='A,BUTTON,INPUT,SELECT,TEXTAREA,CANVAS,SCRIPT,STYLE,SVG,.rl,#pgh';
function okNode(n,root){
 for(let e=n.parentElement;e&&e!==root.parentElement;e=e.parentElement){
  if(e.classList&&e.classList.contains('rl'))return false;
  const t=e.tagName;if(t=='A'||t=='INPUT'||t=='SELECT'||t=='TEXTAREA'||t=='CANVAS'||t=='SCRIPT'||t=='STYLE'||t=='svg')return false;
  if(t=='BUTTON'){ // in Knöpfen nur die Beschreibung (small) verlinken, nie die Beschriftung der Aktion
   let s=n.parentElement;while(s&&s!==e&&s.tagName!='SMALL')s=s.parentElement;if(!s||s===e)return false}}
 return true}
export function linkify(root,ctx={ais:[],pack:-1}){
 if(!root||!LK.length)return;build(ctx.ais||[],ctx.pack==null?-1:ctx.pack);
 const seen=new Set();const nodes=[];
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))if(n.nodeValue.trim().length>=4&&okNode(n,root))nodes.push(n);
 // bereits verlinkte Begriffe dieses Fensters nicht erneut unterstreichen
 root.querySelectorAll('.rl').forEach(a=>seen.add(a.dataset.rh));
 for(const t of nodes){
  const txt=t.nodeValue;RE.lastIndex=0;let m,last=0,frag=null;
  while((m=RE.exec(txt))){
   const at=m.index+m[1].length,lab=m[2],it=MAP.get(lab.toLowerCase());if(!it)continue;
   if(lab.length<=3&&lab!==it.lab)continue;
   if(seen.has(it.href))continue;seen.add(it.href);
   if(!frag)frag=document.createDocumentFragment();
   if(at>last)frag.appendChild(document.createTextNode(txt.slice(last,at)));
   const a=document.createElement('span');a.className='rl';a.dataset.rh=it.href;a.setAttribute('role','link');a.title='In der Regel-App öffnen';a.textContent=lab;frag.appendChild(a);last=at+lab.length}
  if(frag){if(last<txt.length)frag.appendChild(document.createTextNode(txt.slice(last)));t.parentNode.replaceChild(frag,t)}}}
// Beobachtet Container; verlinkt neuen Inhalt (Popups, Karten, Einmal-Leiste)
export function watch(ids,getAis,open){
 let busy=false;
 const run=el=>{if(busy)return;busy=true;try{linkify(el,getAis())}catch(e){}finally{busy=false}};
 ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;
  let q=0;new MutationObserver(()=>{if(busy||q)return;q=requestAnimationFrame(()=>{q=0;run(el)})}).observe(el,{childList:true,subtree:true,characterData:true})});
 // Klick im Capture-Phase, damit Knöpfe um den Link nicht auslösen
 const hit=e=>{const a=e.target.closest&&e.target.closest('.rl');if(!a)return false;e.preventDefault();e.stopPropagation();return true};
 document.addEventListener('click',e=>{if(hit(e))open(e.target.closest('.rl').dataset.rh)},true);
 for(const ev of ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend'])document.addEventListener(ev,e=>{if(e.target.closest&&e.target.closest('.rl'))e.stopPropagation()},true)}
