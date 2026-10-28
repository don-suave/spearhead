// Grafik: Brettboden, Gelände, Marker und Modell-Token (rein 2D, Canvas). Kennt keine Regeln.
import {ARMY} from './data.js';import {BOARDIMG} from './boardimg.js';

// ---------- Zufall ----------
const rng=seed=>{let a=seed|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};

// ---------- Symbole (24×24, Mitte 12/12) ----------
// ['f',pfad] gefüllt · ['s',pfad] Linie · ['e',pfad] gefüllt mit Aussparung (evenodd)
export const GLY={
 sword:[['f','M11 1h2l1 14h3v2h-3v6h-4v-6H7v-2h3z']],
 axe:[['f','M10.500 2h2.200v21h-2.200z'],['f','M12.700 3c7.500 0 9.500 4 9.500 7.500s-2.500 6.500-9.500 6.500c3.500-4 3.500-10 0-14z']],
 spear:[['f','M11 9h2v14h-2z'],['f','M12 1l4.5 9h-9z']],
 bow:[['s','M7 2c10 4 10 16 0 20'],['s','M5 12h15'],['f','M19 8l4 4-4 4z']],
 shield:[['e','M12 1l9 3.5v7c0 5.5-4 9.5-9 11.5-5-2-9-6-9-11.5v-7zM12 5.5l5 2v4c0 3.4-2.2 6-5 7.4-2.8-1.400-5-4-5-7.400v-4z']],
 skull:[['e','M12 1C6.500 1 3 5 3 10c0 3.200 1.500 5 3 6v4h3v-2h2v2h2v-2h2v2h3v-4c1.500-1 3-2.800 3-6 0-5-3.500-9-9-9zM8 8.500a2.200 2.200 0 1 0 .01 0zM16 8.500a2.200 2.200 0 1 0 .01 0zM12 12l-1.500 3h3z']],
 ghost:[['e','M12 1a8 8 0 0 0-8 8v14l4-3 4 3 4-3 4 3V9a8 8 0 0 0-8-8zM8.500 8a1.800 2.400 0 1 0 .01 0zM15.500 8a1.800 2.400 0 1 0 .01 0zM12 13a2 2.500 0 1 0 .01 0z']],
 claw:[['s','M5 2c3 7 3 13-1 20'],['s','M12 2c3 7 3 13-1 20'],['s','M19 2c3 7 3 13-1 20']],
 fang:[['f','M3 2c5 3 13 3 18 0-1 9-4 15-9 21C7 17 4 11 3 2z']],
 eye:[['e','M0.500 12C4 6 8 4 12 4s8 2 11.500 8C20 18 16 20 12 20S4 18 0.500 12zM12 7.500a4.500 4.500 0 1 0 .01 0zM12 10a2 2 0 1 1-.01 0z']],
 flame:[['f','M12 1c1.500 5 7 7 7 14a7 7 0 0 1-14 0c0-3 1.500-5 3.500-7 .5 2 1 3 2.500 3.500C11 8 10.500 4.500 12 1z']],
 star:[['f','M12 1l3.100 7.200 7.900.7-6 5.200 1.800 7.700L12 17.700 5.200 21.800 7 14.100 1 8.900l7.900-.7z']],
 hammer:[['f','M2 3h15v8H2z'],['f','M7.500 11h3.500v12H7.500z'],['f','M17 5h4v4h-4z']],
 cannon:[['f','M2 8h14v6H2z'],['f','M16 6.500h5v9h-5z'],['s','M9 17a4 4 0 1 0 .01 0']],
 horseshoe:[['f','M3 22V10a9 9 0 0 1 18 0v12h-5V10a4 4 0 0 0-8 0v12z']],
 wing:[['f','M1 4c8 0 14 3 19 10l-5-1.500 4 5-5-1.500 2 5C8 22 2 15 1 4z']],
 tentacle:[['s','M4 22c0-8 6-6 6-12S6 4 10 2'],['s','M14 22c0-6 6-5 6-10'],['s','M10 12c3 1 4 4 3 8']],
 crown:[['f','M2 19h20v3H2z'],['f','M2 17.500L1 6l5.500 5L12 2l5.500 9L23 6l-1 11.500z']],
 rune:[['s','M12 2v20'],['s','M12 9L5.500 3'],['s','M12 9l6.500-6'],['s','M7 15l5 4 5-4']],
 fist:[['f','M5 10h14v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z'],['f','M5 10V6h3.500v4z'],['f','M8.500 10V3h3.500v7z'],['f','M12 10V3h3.500v7z'],['f','M15.500 10V6H19v4z']],
 cog:[['e','M12 7a5 5 0 1 0 .01 0zM12 10a2 2 0 1 1-.01 0z'],['f','M10.500 1h3v4h-3z'],['f','M10.500 19h3v4h-3z'],['f','M1 10.500h4v3H1z'],['f','M19 10.500h4v3h-4z'],['f','M4.200 3l2.800 2.800-2.100 2.100L2.100 5.100z'],['f','M19.800 3l2.100 2.100-2.800 2.800-2.100-2.100z'],['f','M4.200 21l-2.100-2.100 2.800-2.800L7 18.200z'],['f','M19.800 21L17 18.200l2.100-2.100 2.800 2.800z']],
 scythe:[['s','M20 3C12 2 7 7 7 14'],['s','M7 4v19'],['f','M20 3c-3 5-6 7-10 8 3 .5 7-1 10-8z']],
 flask:[['f','M9 1h6v2h-1v6l6 11a2 2 0 0 1-1.800 3H5.800A2 2 0 0 1 4 20l6-11V3H9z']],
 drop:[['f','M12 1c5.500 6.500 7.500 10 7.500 14a7.500 7.500 0 0 1-15 0c0-4 2-7.500 7.500-14z']],
 trident:[['s','M12 6v17'],['s','M5 2v6a7 7 0 0 0 14 0V2'],['f','M12 1l2.500 4h-5z']],
 mountain:[['f','M1 21L9 5l5 9 3-4 6 11z']],
 lizard:[['f','M2 15c4-7 10-8 14-4l6-4-2 6 2 3-5 1c-4 5-11 4-15-2z'],['f','M18 12.500a1 1 0 1 0 .01 0z']],
 mask:[['e','M2 4c7 2.500 13 2.500 20 0 0 9-3 16-10 18C5 20 2 13 2 4zM6 9.500c2 1 4 1 5 0-1-1.500-4-1.500-5 0zM13 9.500c1 1 3 1 5 0-1-1.500-4-1.500-5 0z']],
 rat:[['f','M2 15c0-5 4-8 9-8h4c4 0 7 3 7 7s-3 7-7 7H8c-3 0-6-2-6-6z'],['f','M6 4a3.500 3.500 0 1 0 .01 0z'],['f','M13 3a3 3 0 1 0 .01 0z'],['s','M21 15c2 0 2-4 1-6']],
 moon:[['f','M16 1a11 11 0 1 0 7 19A9 9 0 0 1 16 1z']],
 gong:[['s','M12 4a8 8 0 1 0 .01 0'],['f','M12 9a3 3 0 1 0 .01 0'],['s','M2 2h20']],
 banner:[['s','M5 1v22'],['f','M5 3h16l-4 5.500 4 5.500H5z']],
 book:[['f','M2 4h9v16H2z'],['f','M13 4h9v16h-9z']],
 crystal:[['f','M12 1l8 8-8 14L4 9z'],['s','M4 9h16']],
 airship:[['f','M1 9a11 6 0 1 0 22 0 11 6 0 1 0-22 0z'],['f','M8.500 17h7v4h-7z']],
 dagger:[['f','M12 1l3.500 12h-2.500v6h-2v-6H8.500z'],['f','M7 19h10v2.500H7z']],
 chain:[['s','M3 8a5 4 0 1 0 .01 0'],['s','M10 10a5 4 0 1 0 .01 0'],['s','M13 15a5 4 0 1 0 .01 0']],
 bomb:[['f','M11 8a7 7 0 1 0 .01 0z'],['s','M16 6l3-3'],['f','M20 1l1 2.500-2.500-1z']],
 paw:[['f','M12 12c4 0 7 3 7 6s-3.500 4-7 4-7-1-7-4 3-6 7-6z'],['f','M4.500 8a2.200 3 0 1 0 .01 0z'],['f','M9.500 3a2.200 3 0 1 0 .01 0z'],['f','M14.500 3a2.200 3 0 1 0 .01 0z'],['f','M19.500 8a2.200 3 0 1 0 .01 0z']],
 tusk:[['f','M3 3c0 10 5 16 13 19-7-6-8-11-6-19z'],['f','M21 3c0 10-5 16-13 19 7-6 8-11 6-19z']],
 sun:[['f','M12 6.500a5.500 5.500 0 1 0 .01 0z'],['s','M12 1v3'],['s','M12 20v3'],['s','M1 12h3'],['s','M20 12h3'],['s','M4.200 4.200l2.100 2.100'],['s','M17.700 17.700l2.100 2.100'],['s','M4.200 19.800l2.100-2.100'],['s','M17.700 6.300l2.100-2.100']],
 snake:[['s','M4 21c-3-6 3-7 5-10s-2-6 2-9'],['s','M13 21c5-2 7-6 5-9s-3-5 0-8'],['f','M19 1.500l3 2.500-3.500 1z']],
 fly:[['f','M12 8a3 5 0 1 0 .01 0z'],['f','M2 5c4-3 8 0 9 5-3 2-8 1-9-5z'],['f','M22 5c-4-3-8 0-9 5 3 2 8 1 9-5z'],['f','M12 14a3 6 0 1 0 .01 0z']],
 maw:[['e','M2 7h20v10c-3 4-6 5-10 5s-7-1-10-5zM5 9v3l2 2 2-3 3 3 3-3 2 3 2-2V9z']],
 wheel:[['s','M12 3a9 9 0 1 0 .01 0'],['s','M12 3v18'],['s','M3 12h18'],['s','M5.600 5.600l12.800 12.800'],['s','M18.400 5.600L5.600 18.400']],
 bolt:[['f','M13 1L4 14h6l-2 9 10-14h-6z']],
 heart:[['f','M12 22C3 15 1 10 1 7a5.500 5.500 0 0 1 11-1 5.500 5.500 0 0 1 11 1c0 3-2 8-11 15z']],
 leaf:[['f','M21 2C8 2 3 9 3 15c0 3 1 5 2 6 1-5 4-9 10-12-5 4-7 8-7 12 8 0 13-6 13-19z']],
 anchor:[['s','M12 6v16'],['s','M5 13c0 5 3 8 7 8s7-3 7-8'],['s','M8 10h8'],['f','M12 1.500a3 3 0 1 0 .01 0z']],

 comet:[['f','M17 2a5 5 0 1 0 .01 0z'],['s','M13 9L2 22'],['s','M10 5L2 13'],['s','M19 11l-8 11']],
 helm:[['e','M4 22V10a8 8 0 0 1 16 0v12h-4v-5H8v5zM8 10.500h8v2.500H8z']],
 lance:[['s','M3 21L19 5'],['f','M21 3l-.5 7-6.500-6.500z'],['f','M5 14l5 5-5 3z']],
 musket:[['f','M1 11h14l2-2h3v4h-3l-2 2H8l-1 7H3l2-7H1z']],
 crossbow:[['s','M3 8c6 4 12 4 18 0'],['s','M12 5v17'],['f','M12 1l3 5h-6z']],
 wolf:[['e','M3 2l6 4h6l6-4-1.500 10-4.500 4v6h-8v-6l-4.500-4zM8 11a1.300 1.300 0 1 0 .01 0zM16 11a1.300 1.300 0 1 0 .01 0z']],
 bird:[['f','M1 5c5 0 9 2 11 6 2-3 5-4 10-4-1 4-3 6-6 7l1 6-5-3-3 4-1-6C5 14 2 11 1 5z']],
 goat:[['e','M5 1c-3 3-3 8 1 10l2 2v7l4 3 4-3v-7l2-2c4-2 4-7 1-10-1 3-3 5-7 5S6 4 5 1zM9 12a1.200 1.200 0 1 0 .01 0zM15 12a1.200 1.200 0 1 0 .01 0z']],
 beetle:[['f','M12 5a6 8 0 1 0 .01 0z'],['s','M6 10L2 8'],['s','M6 14l-4 2'],['s','M18 10l4-2'],['s','M18 14l4 2'],['s','M10 5L8 1'],['s','M14 5l2-4']],
 tree:[['f','M12 1l7 10h-4l5 8H4l5-8H5z'],['f','M10.500 19h3v4h-3z']],
 mushroom:[['f','M2 12a10 9 0 0 1 20 0z'],['f','M9 12h6v10H9z']],
 wave:[['s','M1 9c3-4 5-4 8 0s5 4 8 0 4-3 6-1'],['s','M1 16c3-4 5-4 8 0s5 4 8 0 4-3 6-1']],
 fish:[['f','M2 12c4-7 11-7 15 0-4 7-11 7-15 0z'],['f','M16 12l6-5v10z']],
 tornado:[['s','M3 4h18'],['s','M5 9h14'],['s','M8 14h8'],['s','M11 19h2']],
 bat:[['f','M12 5l2 3 6-3c1 4 2 8 1 12-2-2-4-2-6 0l-3 4-3-4c-2-2-4-2-6 0-1-4 0-8 1-12l6 3z']],
 cauldron:[['f','M3 9h18l-2 10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z'],['s','M6 6c2-3 10-3 12 0'],['s','M1 9h22']],
 bone:[['f','M3 3a2.500 2.500 0 0 1 4 0l1 1 12 12 1 1a2.500 2.500 0 0 1 0 4 2.500 2.500 0 0 1-4 0l-1-1L4 8 3 7a2.500 2.500 0 0 1 0-4z']],
 hourglass:[['f','M6 2h12c0 6-4 8-6 10 2 2 6 4 6 10H6c0-6 4-8 6-10-2-2-6-4-6-10z']],
 horn:[['f','M2 10l11-5v14L2 14z'],['s','M16 8a5 5 0 0 1 0 8'],['s','M19 5a9 9 0 0 1 0 14']],
 anvil:[['f','M2 6h20c0 3-3 5-7 5l1 3h3v5H5v-5h3l1-3C5 11 2 9 2 6z']],
 bull:[['s','M2 4c0 8 4 11 10 11s10-3 10-11'],['f','M8 14h8l-1.500 8h-5z']],
 orb:[['s','M12 3a9 9 0 1 0 .01 0'],['f','M12 8a4 4 0 1 0 .01 0z'],['s','M12 1v2']],
 tower:[['f','M4 22V7h3v2h3V7h4v2h3V7h3v15z']],
 crossed:[['s','M4 4l16 16'],['s','M20 4L4 20'],['f','M2 6l4-4 3 3-4 4z'],['f','M22 6l-4-4-3 3 4 4z']],
 chalice:[['f','M5 2h14c0 7-3 10-7 10S5 9 5 2z'],['s','M12 12v8'],['s','M7 22h10']],
 dice:[['e','M3 3h18v18H3zM8 8a1.600 1.600 0 1 0 .01 0zM16 8a1.600 1.600 0 1 0 .01 0zM12 12a1.600 1.600 0 1 0 .01 0zM8 16a1.600 1.600 0 1 0 .01 0zM16 16a1.600 1.600 0 1 0 .01 0z']],
 whip:[['s','M4 22c5-9 9 0 13-9s2-8 4-11']],
};
import {GLY2} from './glyphs2.js';Object.assign(GLY,GLY2);
const GL_ORDER=['sword','shield','axe','spear','bow','hammer','dagger','star','crown','skull','claw','fang','paw','flame','rune','eye','drop','crystal','cog','banner','moon','sun','wing','horseshoe','snake','book','fist','chain','bomb','tusk','trident','flask','mask','ghost','scythe','mountain','lizard','rat','fly','maw','gong','tentacle','airship','cannon','wheel','bolt','heart','leaf','anchor','comet','helm','lance','musket','crossbow','wolf','bird','goat','beetle','tree','mushroom','wave','fish','tornado','bat','cauldron','bone','hourglass','horn','anvil','bull','orb','tower','crossed','chalice','dice','whip',...Object.keys(GLY2)];
const GP={};
const gpath=k=>GP[k]||(GP[k]=GLY[k].map(([t,d])=>[t,typeof Path2D!='undefined'?new Path2D(d):d]));
export function drawGlyph(cx,k,x,y,s,fill,line=0){
 const g=gpath(k);if(!g||typeof Path2D=='undefined')return;
 cx.save();cx.translate(x,y);cx.scale(s/24,s/24);cx.translate(-12,-12);cx.fillStyle=fill;cx.strokeStyle=fill;cx.lineWidth=2.300;cx.lineCap='round';cx.lineJoin='round';
 g.forEach(([t,p])=>{if(t=='s')cx.stroke(p);else if(t=='e')cx.fill(p,'evenodd');else cx.fill(p)});
 if(line){cx.lineWidth=.8;cx.strokeStyle=line;g.forEach(([t,p])=>{if(t!='s')cx.stroke(p)})}
 cx.restore()}

// ---------- Zuordnung Einheit → Symbol (je Armee eindeutig) ----------
const RULES=[
 [/Kanonenboot|Luftschiff|Endrinenmeister/,['airship']],[/Gholem/,['cog','mountain']],[/Kanone|Bombarde|Bolz|Eidwahrer|Dominator/,['cannon']],[/Wagen|Wag.n|Streitwagen/,['wheel']],
 [/Kriegsmaschine/,['cannon','cog']],
 [/Gongträger/,['gong']],[/Vexillor|Banner/,['banner']],
 [/Yndrasta|Speer/,['spear']],[/Steinkloppa|Hammer|Kloppa|Annihilator|Goldrunenwerker|Mallus/,['hammer']],
 [/Kraken|Takler|Jorvan/,['tentacle']],[/Donnerschütz/,['bolt','bomb']],
 [/Bogen|Schütze|Auralanschütz|Jäger|Gleve|Füsilier|Wilderkorps/,['bow']],[/Grenadier/,['bomb']],
 [/Skelett|Knochen|Grabhügel|Schädelbrecher|Gebein|Fluchfürst|Mordpriester/,['skull']],
 [/Geist|Gespenst|Wiedergänger|Ghaste|Sensenmegär/,['ghost','scythe']],[/Sensen/,['scythe']],
 [/Schreckensreiter/,['horseshoe']],
 [/Prophet|Magister|Hexer|Priester|Pontifex|Zauber|Schamane|Wahnboss|Akolyth|Scharlatan|Magier|Scinari|Cathallar/,['rune','eye']],
 [/Warlock|Techniker|Alchemit|Schmied/,['flask','cog']],
 [/Ratte|Sturmbestie|Clanratte/,['rat']],
 [/Ogor|Hunger|Tyrann|Wanst|Fleischer|Metzger|Gedärm|Schlund|Verschlinger/,['maw','tusk']],
 [/Troggoth|Stein|Fels|Kroxigor/,['mountain','fist']],
 [/Saurus|Terraflügler|Echse|Carnosaurier|Chotec|Huanchi|Sonnenblut/,['lizard','sun']],
 [/Slaanesh|Dämonette|Jägerin|Scheusal|Slaangor|Giftdorn|Dreigestirn|Scherbensprecher|Homunkulus/,['claw','heart']],
 [/Blutkrieger|Blutjäger|Blutritter|Khorne|Blutpirscher/,['axe','drop']],
 [/Hexenkrieger|Melusai|Khaine|Fluchfeuer/,['snake','dagger']],
 [/Assassin|Gossenläufer|Schattenläufer|Crixxit/,['mask','dagger']],
 [/Nurgling|Schleim|Seuchen|Pest|Faul|Fliegen|Fäulnis|Eitrig|Buchhalter/,['fly','drop']],
 [/Goldrunen|Vulkyn|Magma|Feuer|Flammen|Hjulda|Drakkblud|Clanschild|Goldwächter/,['flame']],
 [/Vampir|Vargheister/,['fang']],[/Kettenghast|Fessel/,['chain']],
 [/Mondclan|Squig|Piksa|Mond/,['moon']],[/Fletscha|Wolfsgit|Wolf/,['fang','paw']],
 [/Sonn|Lichtfürst|Vanari|Hysh/,['sun']],
 [/Kohorte|Infernale|Kriegsdespot/,['cog','crown']],
 [/Stahlhelm|Wächter|Schild|Phalanx|Liberator|Grundstok|Prosecutor|Bezwinger|Veteran/,['shield']],
 [/Erzritter|Ritter|Freigilden-Junker|Junker/,['sword']],
 [/Gryph|Greif|Wing|Terra/,['wing']],[/Bestie|Magmadroth|Schnappzahn|Prankenbiest|Gits|Nagbestie/,['paw','fang']],
 [/Marschall|Fürst|General|Despot|Boss|Killaboss|Torfboss/,['crown','star']],
];
const ROLE=(kw)=>/Held/.test(kw)?['crown','star']:/Kavallerie/.test(kw)?['horseshoe']:/Kriegsmaschine/.test(kw)?['cannon','cog']:/Bestie|Monster/.test(kw)?['paw','claw']:['sword','shield'];

// Gezielte Zuordnung Einheit → Symbol (eigene, fraktionstypische Zeichen; Vorrang vor den Regeln, je Armee einmalig)
const OVR={'Freigilden-Marschall':'pennant','Pontifex Zenestra':'halo','Flüsterklinge':'rapier','Erzritter und Gefolge':'lance','Freigilden-Stahlhelme':'helm',
 'Füsiliermajor auf Ogor-Kriegshüne':'blunder','Alchemit-Kriegsschmied':'flask','Freigilden-Füsiliere':'musket','Wilderkorps-Jäger':'longrifle',
 'Jorvan Kreel, Erbe des Kraken':'hook','Mallus-Schmiedepriester':'anvil','Freigilden-Junker':'sword','Freigilden-Grenadiere':'bomb',
 'Freigilden-Rittermarschall':'fleur','Freigilden-Stahlhelme (Kastelliten)':'keep','Freigilden-Ritter':'horseshoe','Eisenschmiede-Großkanone':'cannon',
 'Killaboss auf Großem Schnappzahn':'teeth','Torfboss mit Sumpfgasbanna':'banner','Bolz’nschießa':'crossbow','Wanstreißa':'maw','Bestienkillabogen':'bow',
 'Fluchfürst':'brokencrown','Grabhügelwache':'shield','Grabhügelritter':'lance','Skelette (Knochenhorde)':'skull',
 'Klauenfürst auf Nagbestie':'claw','Grauer Prophet':'warpstone','Warlock-Techniker':'poison','Clanratten':'rat','Rattenogors':'fist','Sturmbestien':'fang','Warpblitzkanone':'warpfire',
 'Yndrasta, der Celestische Speer':'spear','Bezwinger':'sigshield','Ritter Vexillor':'banner','Annihilatoren':'stormhammer','Sturmschlag-Streitwagen':'wheel',
 'Fürst Vigilant auf Schattengryph':'gryph','Fürst Veritant':'halo','Prosecutoren':'wing','Liberatoren':'shield',
 'General Peingespenst':'lantern','Kettenghaste':'chain','Klingengeist-Wiedergänger':'ghost','Sensenmegären':'scythe','Schreckensreiter':'horseshoe',
 'Ritter des Grabtuchs':'coffin','Geisterscharen':'hood','Düsterschnitter':'scythe','Kettengeister':'chain',
 'Fäulnisboten-Hexer':'bell','Nurglinge':'maggot','Schleimbestie':'drop','Krieger des Faulsumpf-Credos':'bubo',
 'Pestpockiger Buchhalter':'scales','Eitriger Fliegenfürst':'fly','Faulige Pestkönige':'cauldron','Seuchenhüter':'maggot',
 'Hjulda Drakkblud':'anvil','Clanschilde':'shield','Gholems des Gazul':'cog','Eidwahrerkanone':'cannon',
 'Goldrunenvater auf Magmadroth':'volcano','Goldrunenwerker':'hammer','Vulkyn-Flammensucher':'flame','Goldwächter':'dwarfhelm',
 'Schlachtenschmied':'ingot','Berserkerwächter':'axes2','Vulkit-Berserker':'axe',
 'Vampirfürst':'fang','Blutritter':'lance','Vargheister':'bat',
 'Das Zwieträchtige Dreigestirn':'lips','Slaaneshbestien':'claw','Dämonetten':'whip','Jägerinnen':'bow',
 'Scherbensprecherin des Slaanesh':'mirror','Silbergleven-Jäger':'spear','Slaangor-Scheusale':'claw','Giftdorn-Schützen (mit Homunkulus)':'lyre','Giftdorn-Schützen':'crossbow',
 'Tyrann':'crown','Hungrige Ogors':'maw','Hungrige Ogors (3 Modelle)':'tusk','Eisenwänste':'belly','Prankenbiestreiter':'paw',
 'Fleischer':'choppa','Metzger':'dagger','Gedärmdeuter':'eye','Verschlinger-Schlundrudel':'fang',
 'Tyrann des Gebrülls':'horn','Eisenspeier':'cannon','Bleispucker':'handgun','Hungrige Ogors (Gebrüll)':'maw','Trauerfangreiter':'paw',
 'Steinkloppa':'club','Steinschmeißer':'boulder','Menschenquetscher-Gargant':'giantfoot','Menschenquetscher-Gargant (Verstärkung)':'fist',
 'Meisterassassine Crixxit':'mask','Meisterassassine':'dagger','Gossenläufer':'bomb','Schattenläufer':'crossed',
 'Kriegsdespot':'bull','Dominator-Maschine':'hellforge','Peinigerbombarde':'mortar','Infernale Kohorte':'tallhat','Infernale Kohorte (Gongträger)':'gong',
 'Sonnenblut-Kohorte':'solar','Saurus-Krieger':'saurusshield','Huanchis Jäger':'bow','Terraflügler':'wing','Chotec-Echse':'snake',
 'Saurus-Hornnackenveteran auf Carnosaurier':'dinohead','Kroxigors':'headdress',
 'Mordpriester':'khrune','Schädelbrecher':'bull','Blutkrieger':'bdaxe','Blutjäger':'drop','Karanak':'collar','Bluthunde':'paw','Karanaks Krallen':'claw',
 'Melusai-Eisenschuppe':'snake','Hexenkriegerinnen':'dagger','Fluchfeuerhexer':'flame','Blutpirscherinnen':'bow',
 'Schlächterkönigin auf Blutkessel':'cauldron','Hexenkönigin':'crown','Blutqual-Medusa':'eye','Schlächterschwestern':'sword','Khainitische Schattenjäger':'mask',
 'Fletschaboss':'wolfhead','Gefolge-Wolfsgits':'paw','Rudelfletscha':'fang','Sonn’nräuber-Kriegswag’n':'wheel',
 'Wahnboss':'mushroom','Mondclan-Piksa':'moonface','Squighoppa':'squig','Felsmagen-Troggoths':'boulder',
 'Endrinenmeister mit Luftschiffrüstung':'goggles','Grundstok-Donnerschützen':'bolt','Grundstok-Kanonenboot':'airship','Endrinentakler':'anchor',
 'Arkanauten-Admiral':'compass','Himmelswächter':'wing','Arkanauten-Kompanie (Himmelspike)':'harpoon','Arkanauten-Kompanie (Salvengewehr)':'musket','Arkanauten-Fregatte':'balloon',
 'Scinari-Cathallar':'crystal','Vanari-Klingenmeister':'sword','Vanari-Auralanschützen':'bow','Vanari-Auralanwächter':'aelfspear',
 'Hurakan-Windmagier':'windswirl','Hurakan-Windreiter':'horseshoe','Vanari-Auralanwächter (Hurakan)':'sun','Hurakan-Windgeist':'tornado',
 'Magister auf Flugdämon des Tzeentch':'bird','Kairische Akolythen':'portal','Kreischer des Tzeentch':'wing','Tzaangors':'goat','Feuerdämonen des Tzeentch':'flame',
 'Tzaangor-Schamane':'chaosstar','Tzaangor-Erleuchtete':'dice','Tzaangor-Omenleser':'eye','Tzaangors (Kriegsherde)':'goat',
 'Kavalos-Fürst':'skullcrown','Kavalos-Todesreiter':'horseshoe','Teratische Kohorte':'bonehand',
 'Mortisan-Seelenernter':'scythe','Mortek-Garde':'shield','Gothizzar-Knochenernter':'skull',
 'Mortisan-Knochenbildner':'ribs','Immortis-Garde':'spear','Nekropolenjäger':'bow','Morghast-Archai':'wing',
 'Zweighexe':'branch','Baumfürst':'tree','Kurnoth-Jäger':'bow','Wehrhafte Waldgeister':'thorns',
 'Höherer Waldgeist':'acorn','Seidenschwingen-Schützen':'butterfly','Drachenkäfer-Lanzenreiter':'beetle','Sucher-Waldgeister':'seedpod',
 'Isharann-Seelenfinder':'pearl','Akhelianer-Morrsarrgarde':'eel','Akhelianer-Allopex':'fish','Namarti-Schwertknechte':'sword',
 'Akhelianer-König':'trident','Akhelianer-Ishlaengarde':'spear','Namarti-Bogenschützen':'bow',
 'Kriegsherr des Chaos':'barbhelm','Streitwagen des Chaos':'wheel','Chaoskrieger':'axe','Chaosritter':'lance',
 'Finsterschwur-Kriegskönigin':'crown','Finsterschwur-Zerreißer':'flail','Finsterschwur-Grauensreiter':'horseshoe','Finsterschwur-Barbaren':'sword',
 'Megaboss':'boar','Platt’nhelme':'helm','Wutprotze':'fist','Kraftprotze':'hammer',
 'Scheußlicher Erzregent':'spikecrown','Gruftgarde':'sword','Morbheg-Ritter':'lance','Varghulf-Höfling':'bat',
 'Scheußlicher Bluthüter':'chalice','Königliche Bestienhäuter':'paw','Gruftschrecken':'claw','Gruftschinder':'bone'};
let ICM=null;
function buildIcons(){ICM={};Object.entries(ARMY).forEach(([ai,a])=>{const used=new Set(),m={};
 // erst klare Treffer, dann Rest, damit Spezialfälle ihr Symbol bekommen
 const order=a.units.map(d=>d.n);const cand=n=>{const d=a.units.find(x=>x.n==n),c=[];RULES.forEach(([re,g])=>{if(re.test(n))c.push(...g)});c.push(...ROLE(d.kw||''),...GL_ORDER);return c};
 order.forEach(n=>{const o=OVR[n];if(o&&GLY[o]&&!used.has(o)){m[n]=o;used.add(o)}});
 order.forEach(n=>{if(m[n])return;const g=cand(n).find(k=>!used.has(k));m[n]=g;used.add(g)});
 ICM[ai]=m})}
export const iconOf=(army,dn)=>{if(!ICM)buildIcons();return(ICM[army]&&ICM[army][dn])||'star'};

// ---------- Fraktionsfarben ----------
const FP={
 'Städte Sigmars':['#3d5f94','#e6c75c','rivet'],'Orruk-Kriegsclans':['#4f7d2a','#e0d6a0','jag'],'Seelenbrand-Grabesfürsten':['#6e2a4e','#d9d2bd','cross'],'Höfe der Leichenfresser':['#8a1f26','#d8c7a1','tri'],
 'Skaven':['#6a5a2c','#8fe35e','spike'],'Sturmgeschmiedete Ewige':['#27508f','#f4cf55','rays'],'Nachtspuk':['#3a7b78','#c8fff6','wave'],
 'Maggotkin des Nurgle':['#6a7a2a','#d4dc78','dots'],'Khazalid':['#a24a1a','#ffcf5a','dash'],'Hedoniten des Slaanesh':['#a02c6c','#f6a9d8','scallop'],
 'Ogor-Schlundstämme':['#8a5a3a','#ecc794','jag'],'Behemats Söhne':['#7b6b52','#d9c9a8','twin'],'Helschmiede des Hashut':['#5e2a22','#e8832e','jag'],
 'Sklaven der Finsternis':['#4a2323','#d8b27a','jag'],'Tiefenvolk der Idoneth':['#1d4e66','#9fe0d8','wave'],'Seraphon':['#1f7c7c','#eac24c','diamond'],'Klingen des Khorne':['#8c1a1a','#e6c783','jag'],'Töchter des Khaine':['#6c1e4c','#ee4a68','chev'],
 'Mondwahn-Gits':['#57724a','#f3e463','dots'],'Himmelsherrscher der Kharadron':['#27496c','#d9a143','twin'],'Lichtfürsten der Lumineth':['#4b7cb4','#f6f0d2','wave'],
 'Jünger des Tzeentch':['#37379e','#43d6e6','wave'],'Knochenlegionen der Ossiarch':['#7a6a42','#efe6c8','chev'],'Sylvaneth':['#2f6b3a','#e3d79a','wave']};
export const palOf=f=>FP[f]||['#5a5a5a','#e0e0e0','ring'];

// ---------- Token ----------
const mix=(h,k)=>{const n=parseInt(h.slice(1),16),r=n>>16&255,g=n>>8&255,b=n&255,f=c=>Math.max(0,Math.min(255,Math.round(k>0?c+(255-c)*k:c*(1+k))));return`rgb(${f(r)},${f(g)},${f(b)})`};
// m: {x,y,a,l,w}; u: Einheit; ring: Spielerfarbe; army: Armeenummer
export function drawToken(cx,m,u,ring,army,hero,ready,t){
 const [bg,ac,pat]=palOf((ARMY[army]||{}).f),rx=m.l/2,ry=m.w/2,g=iconOf(army,u.dn);
 cx.save();cx.translate(m.x,m.y);cx.rotate(m.a||0);
 cx.beginPath();cx.ellipse(.07,.14,rx,ry,0,0,7);cx.fillStyle='#0009';cx.fill();
 cx.beginPath();cx.ellipse(0,0,rx,ry,0,0,7);cx.fillStyle=ring;cx.fill();
 const ins=Math.min(.14,Math.min(rx,ry)*.2),ax=rx-ins,ay=ry-ins,gr=cx.createRadialGradient(-ax*.35,-ay*.4,.05,0,0,Math.max(ax,ay)*1.1);gr.addColorStop(0,mix(bg,.38));gr.addColorStop(.7,bg);gr.addColorStop(1,mix(bg,-.45));
 cx.beginPath();cx.ellipse(0,0,ax,ay,0,0,7);cx.fillStyle=gr;cx.fill();
 // Zierrand je Fraktion
 const R=Math.min(ax,ay);cx.save();cx.beginPath();cx.ellipse(0,0,ax,ay,0,0,7);cx.clip();cx.strokeStyle=ac;cx.fillStyle=ac;cx.globalAlpha=.85;cx.lineWidth=Math.max(.035,R*.07);
 const rr=(f)=>{cx.beginPath();cx.ellipse(0,0,ax*f,ay*f,0,0,7)};
 if(pat=='ring'){rr(.86);cx.stroke()}
 else if(pat=='dots'){const n=Math.max(8,Math.round(R*22));for(let i=0;i<n;i++){const q=i/n*6.2832;cx.beginPath();cx.arc(Math.cos(q)*ax*.86,Math.sin(q)*ay*.86,Math.max(.03,R*.055),0,7);cx.fill()}}
 else if(pat=='jag'){const n=Math.max(8,Math.round(R*20));cx.beginPath();for(let i=0;i<=n*2;i++){const q=i/(n*2)*6.2832,f=i%2?.8:.97;cx.lineTo(Math.cos(q)*ax*f,Math.sin(q)*ay*f)}cx.closePath();cx.stroke()}
 else if(pat=='rivet'){rr(.9);cx.stroke();const n=Math.max(8,Math.round(R*18));for(let i=0;i<n;i++){const q=i/n*6.2832;cx.fillRect(Math.cos(q)*ax*.76-R*.04,Math.sin(q)*ay*.76-R*.04,R*.08,R*.08)}}
 else if(pat=='cross'){rr(.9);cx.stroke();for(let i=0;i<4;i++){const q=i*1.5708;cx.beginPath();cx.moveTo(Math.cos(q)*ax*.62,Math.sin(q)*ay*.62);cx.lineTo(Math.cos(q)*ax*.98,Math.sin(q)*ay*.98);cx.stroke()}}
 else if(pat=='tri'){const n=Math.max(8,Math.round(R*14));for(let i=0;i<n;i++){const q=i/n*6.2832,w=.2;cx.beginPath();cx.moveTo(Math.cos(q-w)*ax*.98,Math.sin(q-w)*ay*.98);cx.lineTo(Math.cos(q+w)*ax*.98,Math.sin(q+w)*ay*.98);cx.lineTo(Math.cos(q)*ax*.74,Math.sin(q)*ay*.74);cx.closePath();cx.fill()}}
 else if(pat=='spike'){rr(.8);cx.stroke();const n=Math.max(8,Math.round(R*14));for(let i=0;i<n;i++){const q=i/n*6.2832;cx.beginPath();cx.moveTo(Math.cos(q)*ax*.8,Math.sin(q)*ay*.8);cx.lineTo(Math.cos(q)*ax*1.04,Math.sin(q)*ay*1.04);cx.stroke()}}
 else if(pat=='rays'){const n=Math.max(10,Math.round(R*20));for(let i=0;i<n;i++){const q=i/n*6.2832;cx.beginPath();cx.moveTo(Math.cos(q)*ax*.7,Math.sin(q)*ay*.7);cx.lineTo(Math.cos(q)*ax*.98,Math.sin(q)*ay*.98);cx.stroke()}}
 else if(pat=='dash'){cx.setLineDash([R*.22,R*.14]);rr(.88);cx.stroke();cx.setLineDash([])}
 else if(pat=='scallop'){const n=Math.max(8,Math.round(R*14));cx.beginPath();for(let i=0;i<=n*10;i++){const q=i/(n*10)*6.2832,f=.8+.12*Math.abs(Math.sin(q*n/2));cx.lineTo(Math.cos(q)*ax*f,Math.sin(q)*ay*f)}cx.closePath();cx.stroke()}
 else if(pat=='twin'){rr(.93);cx.stroke();rr(.78);cx.stroke()}
 else if(pat=='diamond'){const n=Math.max(8,Math.round(R*12));for(let i=0;i<n;i++){const q=i/n*6.2832,x0=Math.cos(q)*ax*.84,y0=Math.sin(q)*ay*.84,d=R*.09;cx.beginPath();cx.moveTo(x0,y0-d);cx.lineTo(x0+d,y0);cx.lineTo(x0,y0+d);cx.lineTo(x0-d,y0);cx.closePath();cx.fill()}}
 else if(pat=='chev'){rr(.9);cx.stroke();const n=Math.max(6,Math.round(R*10));for(let i=0;i<n;i++){const q=i/n*6.2832,r1=.72,r2=.9,w=.12;cx.beginPath();cx.moveTo(Math.cos(q-w)*ax*r1,Math.sin(q-w)*ay*r1);cx.lineTo(Math.cos(q)*ax*r2,Math.sin(q)*ay*r2);cx.lineTo(Math.cos(q+w)*ax*r1,Math.sin(q+w)*ay*r1);cx.stroke()}}
 else{const n=Math.max(8,Math.round(R*16));cx.beginPath();for(let i=0;i<=n*8;i++){const q=i/(n*8)*6.2832,f=.86+.07*Math.sin(q*n);cx.lineTo(Math.cos(q)*ax*f,Math.sin(q)*ay*f)}cx.closePath();cx.stroke()}
 cx.restore();
 if(hero){cx.beginPath();cx.ellipse(0,0,rx,ry,0,0,7);cx.lineWidth=Math.max(.04,R*.06);cx.strokeStyle='#ffd35c';cx.stroke()}
 cx.restore();
 // Symbol stehend (nicht gedreht)
 const gs=Math.min(m.l,m.w)*.6;if(gs>.4)drawGlyph(cx,g,m.x,m.y,gs,ac,mix(bg,-.6));
 if(ready){cx.save();cx.translate(m.x,m.y);cx.rotate(m.a||0);cx.beginPath();cx.ellipse(0,0,rx+.06,ry+.06,0,0,7);cx.lineWidth=.1+.05*Math.sin(t/300);cx.strokeStyle='#ffe27acc';cx.stroke();cx.restore()}}

// ---------- Brettboden ----------
const PAL=[ // Fire and Jade / Sand and Bone / City of Ash (je [Standard, Reich])
 [['#56423a','#35553f'],['#e0662a','#59d49a'],['#2f6a52','#2f6a52']],
 [['#d2b27a','#9c98b0'],['#e6d6a8','#d8d4e6'],['#9a8052','#6a6680']],
 [['#64646a','#6a5648'],['#e8742a','#e8742a'],['#2b2b2e','#2b2220']]];
const cache={};
const PH={};
export const photoOf=K=>K.pack==2?'ca'+(K.realm?1:0):K.pack==1?'sb'+(K.realm?1:0):K.pack==0?'fj'+(K.realm?1:0):null;
export function ground(K,W,H){
 const pk0=photoOf(K);if(pk0&&BOARDIMG[pk0]&&typeof Image!='undefined'){const e=PH[pk0]||(PH[pk0]={ready:false,im:new Image()});if(!e.started){e.started=1;e.im.onload=()=>{e.ready=true};e.im.src=BOARDIMG[pk0]}if(e.ready){const key='ph'+pk0+W+'x'+H;if(!cache[key]){const c=document.createElement('canvas');c.width=e.im.width;c.height=e.im.height;const g2=c.getContext('2d');g2.drawImage(e.im,0,0);if(pk0=='ca1'){const k=c.width/30;g2.drawImage(e.im,-0.30*k,-0.48*k)}cache[key]=c}return cache[key]}}
 const key=[K.pack|0,K.realm?1:0,W,H].join();if(cache[key])return cache[key];
 const P=40,c=document.createElement('canvas');c.width=Math.round(W*P);c.height=Math.round(H*P);const x=c.getContext('2d');x.scale(P,P);
 const pk=K.pack|0,rl=K.realm?1:0,pal=PAL[pk],r=rng(pk*977+rl*131+W*7+H),base=pal[0][rl],acc=pal[1][rl],dk=pal[2][rl];
 x.fillStyle=base;x.fillRect(0,0,W,H);
 // weiche Flecken
 for(let i=0;i<Math.round(W*H/5);i++){const px=r()*W,py=r()*H,rad=.7+r()*2.600,gr=x.createRadialGradient(px,py,0,px,py,rad),dark=r()<.5;gr.addColorStop(0,(dark?'#00000022':'#ffffff1a'));gr.addColorStop(1,'#0000');x.fillStyle=gr;x.fillRect(px-rad,py-rad,rad*2,rad*2)}
 if(pk==0){ // Feuer und Jade: Basalt, glühende Risse, Jadeadern
  x.lineCap='round';
  for(let i=0;i<Math.round(W*H/22);i++){let px=r()*W,py=r()*H,a=r()*6.28;const jade=r()<.45;x.beginPath();x.moveTo(px,py);const n=4+Math.floor(r()*6);for(let k=0;k<n;k++){a+=(r()-.5)*1.200;px+=Math.cos(a)*.5;py+=Math.sin(a)*.5;x.lineTo(px,py)}
   x.strokeStyle=jade?'#3fae8a55':acc+'88';x.lineWidth=.05+r()*.07;x.stroke();x.strokeStyle=jade?'#9ff0d033':'#ffd08a44';x.lineWidth=.02;x.stroke()}
  for(let i=0;i<Math.round(W*H/9);i++){const px=r()*W,py=r()*H,s=.15+r()*.4;x.beginPath();x.moveTo(px,py-s);x.lineTo(px+s*.6,py+s*.5);x.lineTo(px-s*.6,py+s*.5);x.closePath();x.fillStyle=r()<.5?'#2f6a5255':'#0000002a';x.fill()}
 }else if(pk==1){ // Sand und Knochen: Dünen, Risse, Knochen
  x.lineWidth=.05;for(let j=-2;j<H+2;j+=.55){x.beginPath();const ph=r()*6,am=.05+r()*.12;for(let i=0;i<=W;i+=.25){const yy=j+Math.sin(i*.55+ph)*am+Math.sin(i*.17+ph*2)*.2;i?x.lineTo(i,yy):x.moveTo(i,yy)}x.strokeStyle=r()<.5?'#00000014':'#ffffff1c';x.stroke()}
  for(let i=0;i<Math.round(W*H/26);i++){let px=r()*W,py=r()*H,a=r()*6.28;x.beginPath();x.moveTo(px,py);for(let k=0;k<5;k++){a+=(r()-.5)*1.400;px+=Math.cos(a)*.4;py+=Math.sin(a)*.4;x.lineTo(px,py)}x.strokeStyle='#0000002a';x.lineWidth=.04;x.stroke()}
  for(let i=0;i<Math.round(W*H/14);i++){const px=r()*W,py=r()*H,a=r()*6.28,s=.18+r()*.28;x.save();x.translate(px,py);x.rotate(a);x.fillStyle=acc+'dd';x.strokeStyle='#0003';x.lineWidth=.02;
   if(r()<.28){x.beginPath();x.arc(0,0,s*.55,0,7);x.fill();x.fillStyle='#4a3a2088';x.beginPath();x.arc(-s*.2,-.02,s*.12,0,7);x.arc(s*.2,-.02,s*.12,0,7);x.fill()}
   else{x.beginPath();x.roundRect(-s,-s*.12,s*2,s*.24,s*.12);x.fill();x.stroke();x.beginPath();x.arc(-s,0,s*.2,0,7);x.arc(s,0,s*.2,0,7);x.fill()}x.restore()}
 }else{ // City of Ash: Pflaster, Asche, Glut
  const st=.75;for(let j=0;j<H/st+1;j++){const off=j%2?st/2:0;for(let i=-1;i<W/st+1;i++){const px=i*st+off+(r()-.5)*.08,py=j*st+(r()-.5)*.08,sh=r();x.beginPath();x.roundRect(px+.03,py+.03,st-.08,st-.08,.12);x.fillStyle=sh<.33?'#ffffff0b':sh<.66?'#0000000f':'#00000020';x.fill();x.strokeStyle='#0000002e';x.lineWidth=.03;x.stroke()}}
  for(let i=0;i<Math.round(W*H/7);i++){const px=r()*W,py=r()*H,s=.04+r()*.1;x.fillStyle=r()<.2?acc+'cc':'#d8d8d818';x.beginPath();x.arc(px,py,s,0,7);x.fill()}
  for(let i=0;i<Math.round(W*H/38);i++){const px=r()*W,py=r()*H,rad=.6+r()*1.200,gr=x.createRadialGradient(px,py,0,px,py,rad);gr.addColorStop(0,'#00000040');gr.addColorStop(1,'#0000');x.fillStyle=gr;x.fillRect(px-rad,py-rad,rad*2,rad*2)}
 }
 // Spielfeldrand
 x.lineWidth=.35;x.strokeStyle='#00000066';x.strokeRect(0,0,W,H);x.lineWidth=.06;x.strokeStyle='#ffffff30';x.strokeRect(.18,.18,W-.36,H-.36);
 cache[key]=c;return c}

// ---------- Gelände ----------
// r: {x,y,w,h,a,k:'obst'|'obsc'|'area',ht,nm}; Zeichnung in Brettkoordinaten (Zoll)
export function drawTerrain(cx,r,K){
 const pk=K.pack|0,rl=K.realm?1:0,seed=Math.round((r.x*31+r.y*17+r.w*7)*10),q=rng(seed),k=r.k||'obst';
 const SK=[ // [Stein, Kante, Zier]
  [['#3b3330','#6d5c52','#3fae8a'],['#2d3a38','#58706a','#59d49a']],
  [['#b59868','#e2cfa0','#efe6c8'],['#8a8798','#c0bdd0','#e0dceb']],
  [['#4a4a50','#7a7a82','#e8742a'],['#4f423a','#85736a','#e8742a']]][pk][rl];
 cx.save();cx.translate(r.x,r.y);cx.rotate(r.a||0);const w=r.w,h=r.h;
 if(r.my=='crypt'){ // Sarkophag mit Blutschale
  cx.beginPath();cx.roundRect(-w/2+.12,-h/2+.2,w,h,.5);cx.fillStyle='#0008';cx.fill();
  cx.beginPath();cx.roundRect(-w/2,-h/2,w,h,.5);const g=cx.createLinearGradient(0,-h/2,0,h/2);g.addColorStop(0,'#5fb7a0');g.addColorStop(.5,'#3f8d7c');g.addColorStop(1,'#2a5f56');cx.fillStyle=g;cx.fill();cx.lineWidth=.14;cx.strokeStyle='#b9854a';cx.stroke();
  cx.beginPath();cx.roundRect(-w/2+.45,-h/2+.4,w-.9,h-.8,.35);cx.lineWidth=.07;cx.strokeStyle='#c9a05a';cx.stroke();
  cx.strokeStyle='#1c3f39';cx.lineWidth=.05;for(let i=-4;i<=4;i++){cx.beginPath();cx.moveTo(i*.45+.2,-h/2+.65);cx.lineTo(i*.45+.2,h/2-.65);cx.stroke()}
  cx.beginPath();cx.ellipse(-w/2+.15,0,.95,.85,0,0,7);cx.fillStyle='#6b4a2a';cx.fill();cx.lineWidth=.07;cx.strokeStyle='#d9b070';cx.stroke();cx.beginPath();cx.ellipse(-w/2+.15,0,.62,.55,0,0,7);cx.fillStyle='#a0121c';cx.fill();
  cx.restore();return}
 if(k=='area'){ // Gebiet: Bewuchs / Kristall- bzw. Knochenfeld
  cx.beginPath();cx.ellipse(0,0,w/2,h/2,0,0,7);cx.fillStyle=pk==0?'#2a5a4a99':pk==1?'#8f7a4e88':'#3a3a3e99';cx.fill();cx.lineWidth=.07;cx.strokeStyle='#0008';cx.setLineDash([.25,.18]);cx.stroke();cx.setLineDash([]);
  const n=Math.round(w*h*1.100);for(let i=0;i<n;i++){const a=q()*6.28,d=Math.sqrt(q()),px=Math.cos(a)*d*w*.46,py=Math.sin(a)*d*h*.46,s=.22+q()*.3;
   if(pk==0){cx.beginPath();cx.moveTo(px,py-s*1.300);cx.lineTo(px+s*.45,py+s*.4);cx.lineTo(px-s*.45,py+s*.4);cx.closePath();cx.fillStyle=q()<.5?'#3fae8a':'#27826a';cx.fill();cx.strokeStyle='#0006';cx.lineWidth=.03;cx.stroke()}
   else if(pk==1){cx.beginPath();cx.moveTo(px,py);cx.quadraticCurveTo(px+s*.6,py-s*1.200,px+s*.15,py-s*1.800);cx.strokeStyle='#efe6c8';cx.lineWidth=.1;cx.lineCap='round';cx.stroke();cx.strokeStyle='#0003';cx.lineWidth=.025;cx.stroke()}
   else{cx.beginPath();cx.arc(px,py,s*.7,0,7);cx.fillStyle=q()<.3?'#e8742a88':'#222226cc';cx.fill();cx.strokeStyle='#0008';cx.lineWidth=.03;cx.stroke()}}
 }else{
  const hi=k=='obsc'?1.250:1;
  cx.beginPath();cx.roundRect(-w/2+.12,-h/2+.2,w,h,.1);cx.fillStyle='#0007';cx.fill();
  cx.beginPath();cx.roundRect(-w/2,-h/2,w,h,.1);const gr=cx.createLinearGradient(0,-h/2,0,h/2);gr.addColorStop(0,SK[1]);gr.addColorStop(.18,SK[0]);gr.addColorStop(1,SK[0]);cx.fillStyle=gr;cx.fill();
  cx.save();cx.clip();
  // Mauerwerk
  const bh=.42*hi,bw=.9;cx.strokeStyle='#0000004a';cx.lineWidth=.035;for(let j=0;j*bh<h+bh;j++){const y0=-h/2+j*bh;cx.beginPath();cx.moveTo(-w/2,y0);cx.lineTo(w/2,y0);cx.stroke();const off=j%2?bw/2:0;for(let x0=-w/2+off;x0<w/2;x0+=bw){cx.beginPath();cx.moveTo(x0,y0);cx.lineTo(x0,y0+bh);cx.stroke()}}
  for(let i=0;i<Math.round(w*h*.6);i++){cx.fillStyle=q()<.5?'#00000022':'#ffffff14';cx.fillRect((q()-.5)*w,(q()-.5)*h,.12+q()*.2,.08+q()*.14)}
  if(k=='obsc'){ // Sichtblocker: hohe Mauer mit Bogenfenstern
   cx.fillStyle='#0009';const nn=Math.max(1,Math.floor(w/1.600));for(let i=0;i<nn;i++){const px=-w/2+(i+.5)*w/nn;cx.beginPath();cx.moveTo(px-.28,h*.25);cx.lineTo(px-.28,-.05);cx.arc(px,-.05,.28,Math.PI,0);cx.lineTo(px+.28,h*.25);cx.closePath();cx.fill()}}
  cx.restore();
  cx.lineWidth=k=='obsc'?.14:.09;cx.strokeStyle=k=='obsc'?'#d9c7a0cc':'#000a';cx.beginPath();cx.roundRect(-w/2,-h/2,w,h,.1);cx.stroke();
  // Zier je Spielfeld
  for(let i=0;i<Math.round(w*.9);i++){const px=(q()-.5)*w*.9,py=(q()-.5)*h*.8,s=.12+q()*.2;
   if(pk==0){cx.beginPath();cx.moveTo(px,py-s*1.400);cx.lineTo(px+s*.5,py+s*.4);cx.lineTo(px-s*.5,py+s*.4);cx.closePath();cx.fillStyle=SK[2];cx.globalAlpha=.85;cx.fill();cx.globalAlpha=1;cx.strokeStyle='#0007';cx.lineWidth=.025;cx.stroke()}
   else if(pk==1){cx.beginPath();cx.roundRect(px-s,py-s*.1,s*2,s*.22,s*.1);cx.fillStyle=SK[2];cx.fill();cx.strokeStyle='#0005';cx.lineWidth=.02;cx.stroke()}
   else{cx.beginPath();cx.arc(px,py,s*.4,0,7);cx.fillStyle=q()<.4?SK[2]:'#1a1a1c';cx.globalAlpha=.8;cx.fill();cx.globalAlpha=1}}}
 cx.restore()}

// ---------- Zielmarker ----------
export function drawObjective(cx,p,K,col,fort,txt){
 const pk=K.pack|0,x=p[0],y=p[1];
 cx.save();cx.translate(x,y);
 cx.beginPath();cx.arc(.05,.1,.62,0,7);cx.fillStyle='#0008';cx.fill();
 cx.beginPath();cx.arc(0,0,.62,0,7);cx.fillStyle=col;cx.fill();
 cx.beginPath();cx.arc(0,0,.5,0,7);cx.fillStyle=pk==0?'#1f4a3c':pk==1?'#d9c79a':'#34343a';cx.fill();
 cx.lineWidth=.05;cx.strokeStyle=pk==0?'#59d49a':pk==1?'#7a6030':'#e8742a';cx.beginPath();cx.arc(0,0,.5,0,7);cx.stroke();
 cx.restore()}
