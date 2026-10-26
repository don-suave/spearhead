// Zustand: reine, JSON-serialisierbare Daten. Keine Funktionen, keine Sets.
import {SB_OSS,SB_DOL,CA_BAS,CA_CRO,CA_ROADS} from './packdata.js';
import {ARMY,HZ,DG} from './data.js';
import {buildM,radius} from './models.js';
export const UD={};ARMY.forEach(a=>a.units.forEach(d=>UD[d.n]=d));
export function newState(seed){return {seed,rng:seed|0,
 P:[0,1].map(i=>({n:i?'Computer':'Du',cp:0,vp:0,done:0,deck:[],hand:[],disc:[]})),
 K:{terr:[0,1],map:0,reg:[],enh:[],realm:0,att:0,def:1,army:[0,1],twist:[],tw:0},
 kes:[0,0],pp:[0,0],vd:[0,0],ent:[],U:[],GY:[],E:[],Ub:[],ter:[],obj:[],oc:[],ocs:[],round:1,first:0,act:0,ph:0,tn:0,stage:0,over:false,winner:-1,
 TW:{},D:[0,0],G:[null,null],dead:[],NID:100,T:newT(),Ph:newPh()}}
export const newT=()=>({moved:[],mvd:{},mvt:{},adjB:[],adj:[],au:[],dbl:[],cr:{},gk:[],arr:[],ran:[],charged:[],fought:[],SF:[],SL:[],FZ:[],cvb:{},pex:{},cs:{},ia:false,vw:false,cru:false,sh:{},cr0:{},bers:[],sl:[0,0],dm:[],mt:{},ptl:[0,0],rfl:[],cf:[]});
export const newPh=()=>({au:[],used:[],abu:[],nr:[],w5:[],g2g:[],fs:{on:false,done:false,who:0},aiDone:[],tfl:[]});
export function mkUnit(dn,o,id,n){const d=UD[dn],M=buildM(d,n||d.nm);return {id,o,dn,name:d.n,ch:d.l,kw:d.kw,r:radius(M),M,mv:d.mv,wm:d.wm,n:n||d.nm,nmax:n||d.nm,dmg:0,sv:d.sv,cv:d.cv,wr:d.wr||0,rw:d.rw||[],mw:d.mw||[],gen:!!d.gen,amb:!!d.amb,ab:d.ab||'',tx:d.tx||[],abs:(d.abs||[]).slice(),c:d.c||1,coh:d.coh||0.5,crow:d.crow?1:0,x:-99,y:0}}
export function setObj(S){const K=S.K;S.roads=null;S.fort=[];if(K.pack==2){const l=K.realm?CA_CRO:CA_BAS;S.obj=l.map(p=>p.length>4?[p[0],p[1],p[2],p[4],p[5],p[6]]:[p[0],p[1],p[2]]);S.mr={};l.forEach((p,k)=>{if(p.length>4)S.mr[k]=[p[0],p[1],3,p[4],p[5],p[6]]});S.on=l.map(p=>p[3]);if(K.realm)S.roads=CA_ROADS.map(r=>({...r}))}else if(K.pack==1){const l=K.realm?SB_OSS:SB_DOL;S.obj=l.map(p=>[p[0],p[1],p[2]]);S.on=l.map(p=>p[3])}else{S.obj=(K.realm?DG:HZ).map(p=>p.slice());S.on=null}S.oc=S.obj.map(()=>-1)}
export function mkUnits(S){S.U=[];let id=0;[0,1].forEach(o=>ARMY[S.K.army[o]].units.forEach(d=>{for(let c=0;c<(d.c||1);c++){const u=mkUnit(d.n,o,id++);if(d.res||(d.resLast&&c==(d.c||1)-1)){u.rsv=d.res||d.resLast;u.rr=d.rr||3;u.rph=d.rph==null?2:d.rph;u.lim=d.lim||0}if(d.n=='Gossenläufer')u.spr=1;if(d.n=='Freigilden-Füsiliere'&&c==0)u.knp=1;if(d.n=='Jorvan Kreel, Erbe des Kraken')u.thx=1;try{if(u.gen){const A=ARMY[S.K.army[o]],e=A.enh[S.K.enh[o]];if(e&&e[3]=='bw_zaeh')u.wm=15;if(e&&e[3]=='og_sturm')u.mv=8}if(ARMY[S.K.army[o]].reg[S.K.reg[o]][3]=='og_zaeh'&&(u.dn=='Eisenspeier'||u.dn=='Trauerfangreiter'))u.wm++}catch(e){}S.U.push(u)}}))}
