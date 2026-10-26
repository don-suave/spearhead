// Hook-System für Passivfähigkeiten der neueren Spearhead-Armeen.
// HK[Schlüssel] = {hit,hitT,wnd,wndT,rend,rendT,svT,dmg,dmgT,att,crit5,ctl,mv,chg,ward,wpn,...}; Quellen einer Einheit: ihre Fähigkeiten (abs), das gewählte Regiment,
// die gewählte Verbesserung (nur General) und die Kampfeigenschaften der Armee (ARMY.tr = Schlüsselliste).
// Aufruf hk(S,name,self,...args) summiert alle Rückgaben (Zahlen); hkMin liefert den kleinsten Wert (für Rettung); hkW wendet Waffen-Änderungen an.
import {ARMY} from './data.js';
export const HK={};
export const GL={ward:[],chg:[],sv:[],place:{},after:[]}; // globale Hooks (wirken auf fremde Einheiten): ward(S,e)→Rettungswert|0, chg(S,u)→Zahl
export function srcKeys(S,u){const k=(u.abs||[]).slice();try{const o=u.o,A=ARMY[S.K.army[o]];if(A.tr)k.push(...A.tr);const r=A.reg[S.K.reg[o]];if(r&&r[3])k.push(r[3]);if(u.gen){const e=A.enh[S.K.enh[o]];if(e&&e[3])k.push(e[3])}}catch(e){}return k}
export function hk(S,name,u,...a){let s=0;if(!S||!S.K||!S.K.army||!u)return 0;for(const k of srcKeys(S,u)){const f=HK[k]&&HK[k][name];if(f)s+=+f(S,u,...a)||0}return s}
export function hkMin(S,name,u,...a){let m=9;if(!S||!S.K||!S.K.army||!u)return m;for(const k of srcKeys(S,u)){const f=HK[k]&&HK[k][name];if(f){const v=f(S,u,...a);if(v>0&&v<m)m=v}}return m}
// Waffen-Änderung: jede Quelle darf eine (kopierte) Waffe zurückgeben
export function hkW(S,u,w,e,shoot){let x=w;if(!S||!S.K||!S.K.army||!u)return x;for(const k of srcKeys(S,u)){const f=HK[k]&&HK[k].wpn;if(f){const y=f(S,u,x,e,shoot);if(y&&y!==x)x=y}}return x}
