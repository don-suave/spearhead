// Geländeaufbau (Sand and Bone, alle Varianten): nach jedem Zufallsplatz bleibt für das nächste Stück ein Platz (ggf. mit gelockertem Abstand)
import {Game} from '../src/game.js';import {setBoard,terrErr,terrRoom,W,H} from '../src/geom.js';
import {setObj} from '../src/state.js';import {setPack} from '../src/packs.js';
import {SB_TER,SB_GROUP} from '../src/packdata.js';
setPack(1);
function feasible(S,o,d){const out=[];for(let x=0;x<=30;x+=.5)for(let y=0;y<=22.4;y+=.5)for(let a=0;a<Math.PI;a+=Math.PI/12){if(!terrErr(S,o,{x,y,w:d.w,h:d.h,a}))out.push({x,y,a})}return out}
let bad=0,rnd=1;const R=()=>{rnd=(rnd*16807)%2147483647;return rnd/2147483647};
for(const realm of [0,1])for(const map of [0,1])for(const t of [0,1])for(const gi of [0,1]){
 let fails=0,tot=0;
 for(let trial=0;trial<6;trial++){
  const g=new Game(1,['ai','ai']);const S=g.S;const K=S.K;K.pack=1;K.realm=realm;K.map=map;K.dg=map?1:0;K.terr=[t,1-t];setObj(S);S.ter=[];
  if(realm==1){const c=SB_TER['Crypt of Blood'];S.ter.push({x:15,y:11.2,w:c.w,h:c.h,a:Math.atan2(22.4,30),big:true})}
  const grp=[gi?SB_GROUP.B:SB_GROUP.A,gi?SB_GROUP.A:SB_GROUP.B];
  let ok=true;
  for(const [o,gr,big] of [[1,0,1],[1,0,0],[0,1,1],[0,1,0]]){
   const nm=grp[gr].find(n=>SB_TER[n].big==!!big),d=SB_TER[nm];terrRoom(S,o,d.w,d.h);const f=feasible(S,o,d);tot++;
   if(!f.length){fails++;bad++;console.log('realm',realm,'map',map,'terr',t,'grp',gi,'o',o,nm,'KEIN PLATZ');ok=false;break}
   const p=f[Math.floor(R()*f.length)];S.ter.push({x:p.x,y:p.y,w:d.w,h:d.h,a:p.a,big:!!big})}
 }
}
console.log(bad?'FAIL: Geländeaufbau blockiert':'Geländeaufbau Sand and Bone: immer ein Platz (terrRoom)');process.exit(bad?1:0)
