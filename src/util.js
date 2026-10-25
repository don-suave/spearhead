// Deterministischer Zufall (mulberry32), Zustand liegt in S.rng
export function rand(S){let t=S.rng=(S.rng+0x6D2B79F5)|0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
export const d6=S=>1+Math.floor(rand(S)*6);
export const d3=S=>1+Math.floor(rand(S)*3);
export const dv=(S,s)=>{if(typeof s=='number')return s;const q=/^(\d?)W(\d)(?:\+(\d+))?$/.exec(s);if(!q)return d6(S);let t=+q[3]||0;for(let i=0;i<(+q[1]||1);i++)t+=q[2]=='3'?d3(S):d6(S);return t};
export function shuffle(S,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand(S)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export const range=n=>Array.from({length:n},(_,i)=>i+1);
export const has=(a,x)=>a.includes(x);
export const add=(a,x)=>{if(!a.includes(x))a.push(x)};
