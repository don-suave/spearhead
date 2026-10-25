// Battlepack-Umschaltung: tauscht Spielfeldgröße, Taktik-/Wendungskarten und Kartenregeln an Ort und Stelle (reproduzierbar durch setPack am Spielanfang)
import {TAC,TWD} from './data.js';
import {CH,CE,HK} from './cards.js';
import {CMD,CR2,PX} from './rules.js';
import {setBoard} from './geom.js';
import {SB_TAC,SB_TW,CA_TAC,CA_TW} from './packdata.js';
import {SBCH,SBCE,SBCMD,SBCR2,sbAp,sbVP,sbRound,SBOK,terrAbil} from './sb.js';
import {CACH,CACE,CACMD,CACR2,caAp,caVP,caRound,CAOK,caTerrAbil,relErr,caCaltrops,caTurnStart} from './ca.js';
export const PACKN=['Fire and Jade','Sand and Bone','City of Ash'];
export const PACKS=['Grundspiel · Feld 30×22 · Reiche Aqshy / Ghyran','Feld 30×22 · Schlachtfelder Dolorum / Ossia · Knochenmauern, Krypta, Totenikone','Feld 30×22 · Ashen Bastion / Shattered Crossroads · Ruinen, Reliquien, befestigte Ziele'];
const cl=o=>Object.assign({},o),B={tac:TAC.slice(),twd:TWD.slice(),ch:cl(CH),ce:cl(CE),cmd:cl(CMD),cr2:cl(CR2)};
const fill=(t,s)=>{Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,s)};
const ca=S=>S.K.pack==2;
Object.assign(HK,{ap:(G,...a)=>ca(G.S)?caAp(G,...a):sbAp(G,...a),vp:(S,o)=>ca(S)?caVP(S,o):sbVP(S,o),round:G=>ca(G.S)?caRound(G):sbRound(G),ok:(S,s,c)=>ca(S)?CAOK(S,s,c):SBOK(S,s,c),ta:(S,s)=>ca(S)?caTerrAbil(S,s):terrAbil(S,s),ph5:G=>{if(ca(G.S))caCaltrops(G)},ts:S=>{if(ca(S))caTurnStart(S)}});
PX.relic=relErr;
export function setPack(i){const P=[[B.tac,B.twd,B.ch,B.ce,B.cmd,B.cr2],[SB_TAC,SB_TW,SBCH,SBCE,SBCMD,SBCR2],[CA_TAC,CA_TW,CACH,CACE,CACMD,CACR2]][i];
 TAC.length=0;TAC.push(...P[0]);TWD.length=0;TWD.push(...P[1]);fill(CH,P[2]);fill(CE,P[3]);fill(CMD,P[4]);fill(CR2,P[5]);
 setBoard(30,22)}
