// Effekte mit Ablauf und Nutzungszähler (einmal pro Phase / Zug / Schlacht). Reiner, serialisierbarer Zustand in S.E / S.Ub.
// exp: 'ph' = bis Ende dieser Phase, 'turn' = bis Ende dieses Zugs, 'own' = bis Beginn des nächsten eigenen Zugs
export function addFx(S,e){S.E.push({t0:S.tn,p0:S.ph,exp:'turn',...e});return e}
export function alive(S,e){return e.exp=='ph'?(S.tn==e.t0&&S.ph==e.p0):e.exp=='turn'?S.tn==e.t0:e.exp=='own'?S.tn<e.t0+2:e.exp=='rnd'?S.round==e.r0:true}
export function fxL(S,u,k){return S.E.filter(e=>e.k==k&&(u==null||e.u==(u&&u.id!=null?u.id:u))&&alive(S,e))}
export const fxSum=(S,u,k)=>fxL(S,u,k).reduce((s,e)=>s+(e.v||0),0);
export const fxMin=(S,u,k,d=9)=>fxL(S,u,k).reduce((s,e)=>Math.min(s,e.v),d);
// Nutzung: unit-bezogen (key=u.id:id) oder Armee (key=o:id)
export function usedKey(S,key,freq){return freq=='battle'?S.Ub.includes(key):freq=='turn'?S.T.au.includes(key):freq=='phase'?S.Ph.au.includes(key):false}
export function useKey(S,key,freq){const a=freq=='battle'?S.Ub:freq=='turn'?S.T.au:S.Ph.au;if(!a.includes(key))a.push(key)}
