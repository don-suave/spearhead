// Battlepack-Daten für die Regel-App: Karten, Wendungen, Ziele, Gelände (aus dem Spiel gelesen, DE aus packs_de.txt, EN = Originaltext)
import fs from 'fs';
import {TAC,TWD,HZ,HZN,DG,DGN,TERSZ,TERK} from '../src/data.js';
import {SB_DOL,SB_OSS,SB_TER,SB_GROUP,SB_TW,SB_TAC,CA_BAS,CA_CRO,CA_ROADS,CA_RS,CA_MANOR,CA_TW,CA_TAC,CA_REL,CA_START} from '../src/packdata.js';
const here=new URL('.',import.meta.url).pathname;
// Reihenfolge der Textsammlung muss mit packs_de.txt übereinstimmen
const S=[];const idx=s=>{let i=S.indexOf(s);if(i<0){S.push(s);i=S.length-1}return i};
const DE=new Map(fs.readFileSync(here+'packs_de.txt','utf8').split('\n').filter(l=>l.includes('\t')).map(l=>{const i=l.indexOf('\t');return [+l.slice(0,i),l.slice(i+1)]}));
const T=s=>s;                       // Platzhalter (Sammelphase)
const reg=[];                      // zuerst alle Texte in Dump-Reihenfolge registrieren
for(const t of TAC){idx(t[1]);idx(t[3])}
for(const r of TWD)for(const t of r)idx(t[2]);
for(const t of SB_TAC){idx(t[1]);idx(t[3])}
for(const r of SB_TW)for(const t of r)idx(t[2]);
for(const t of CA_TAC){idx(t[1]);idx(t[3])}
for(const r of CA_TW)for(const t of r)idx(t[2]);
Object.values(CA_REL).forEach(idx);
export const missingDE=[];
const X=s=>{const i=S.indexOf(s);const d=DE.get(i);if(d==null){missingDE.push(i+': '+s.slice(0,50));return [s,s]}return [d,s]};
const tac=a=>a.map(t=>({n:t[0],c:X(t[1]),k:t[2],t:X(t[3])}));
const tw=a=>a.map(t=>({n:t[1],t:X(t[2])}));
const ob=(l,names)=>l.map((p,i)=>({n:names?names[i]:p[3],x:p[0],y:p[1],r:p[2]||3,w:p[4]||null,h:p[5]||null,a:p[6]||0}));
const B=(de,en)=>[de,en];
const TK={obsc:B('Sichtblocker: Deckung, blockiert die Sicht, instabil','Obscuring: cover, blocks visibility, unstable'),obst:B('Hindernis: Deckung, instabil','Obstacle: cover, unstable')};
const setupCommon=[
 B('Würfelduell: Der Gewinner wird Angreifer oder Verteidiger.','Roll-off: the winner chooses to be attacker or defender.'),
 B('Beide Spieler wählen Regimentsfähigkeit und Verbesserung.','Both players pick a regiment ability and an enhancement.'),
 B('Der Verteidiger wählt das Schlachtfeld (Seite der Matte).','The defender picks the battlefield (side of the mat).'),
 B('Der Verteidiger wählt die Aufstellungskarte (horizontal oder diagonal) und sein Gebiet.','The defender picks the deployment map (horizontal or diagonal) and their territory.'),
 B('Gelände wird aufgestellt (siehe unten).','Terrain is set up (see below).'),
 B('Aufstellung: Der Angreifer beginnt, dann der Verteidiger – ganz im eigenen Gebiet, mehr als 6 Zoll vom Feindgebiet.','Deployment: the attacker goes first, then the defender – wholly in own territory, more than 6" from enemy territory.')];
export const PK=[
 {id:'fj',n:B('Fire and Jade','Fire and Jade'),sub:B('Grundspiel · Reiche Aqshy und Ghyran','Core set · Realms of Aqshy and Ghyran'),
  intro:B('Das Battlepack aus dem Grundspiel. Zwei Reiche mit je 5 Zielen, jede Seite stellt 1 großes und 1 kleines Geländestück auf.','The battlepack from the core set. Two realms with 5 objectives each; each side sets up 1 large and 1 small terrain feature.'),
  setup:[...setupCommon],
  maps:[B('Horizontal: Das Feld wird an der Mittellinie der langen Kante geteilt; jede Seite hat die Hälfte als Gebiet.','Horizontal: the board is split along the middle line; each side has one half as territory.'),B('Diagonal: Die Teilung verläuft von Ecke zu Ecke; jede Seite hat ein Dreieck als Gebiet.','Diagonal: the split runs corner to corner; each side has a triangle as territory.')],
  bf:[{n:B('Aqshy (Reich des Feuers)','Aqshy (Realm of Fire)'),obj:ob(HZ,HZN)},{n:B('Ghyran (Reich des Lebens)','Ghyran (Realm of Life)'),obj:ob(DG,DGN)}],
  objNote:B('Alle Ziele haben 6 Zoll Durchmesser. Für die Ziel-Taktikkarten (Podeste) zählt der Name des Ziels.','All objectives are 6" across. The names matter for the dais battle tactic cards.'),
  terr:[{n:B('Großes Geländestück','Large terrain feature'),d:B(`${TERSZ.big[0]}" × ${TERSZ.big[1]}"`.replace('.',','),`${TERSZ.big[0]}" × ${TERSZ.big[1]}"`),k:TK[TERK.big.k],t:B('Jeder Spieler stellt 1 auf.','Each player sets up 1.')},
        {n:B('Kleines Geländestück','Small terrain feature'),d:B(`${TERSZ.small[0]}" × ${TERSZ.small[1]}"`.replace('.',','),`${TERSZ.small[0]}" × ${TERSZ.small[1]}"`),k:TK[TERK.small.k],t:B('Jeder Spieler stellt 1 auf.','Each player sets up 1.')}],
  terrNote:B('Abwechselnd, der Verteidiger beginnt (groß, klein), dann der Angreifer: ganz im eigenen Gebiet, mehr als 6 Zoll von anderem Gelände, mehr als 3 Zoll von den langen Kanten und vom Feindgebiet, nicht auf Zielen. Gelände darf frei gedreht werden. Maße und Art sind im Spiel angenommen.','Alternating, defender first (large, small), then the attacker: wholly in own territory, more than 6" from other terrain, more than 3" from the long edges and enemy territory, not on objectives. Terrain can be rotated freely. Sizes and type are assumed in the game.'),
  tac:tac(TAC),tw:[{n:B('Aqshy','Aqshy'),l:tw(TWD[0])},{n:B('Ghyran','Ghyran'),l:tw(TWD[1])}]},
 {id:'sb',n:B('Sand and Bone','Sand and Bone'),sub:B('Schlachtfelder Dolorum und Ossia','Battlefields Dolorum and Ossia'),
  intro:B('Ein Schlachtfeld aus Knochenmauern und Gräbern: Mauern und Zäune bilden das Gelände, auf Ossia kommt die Crypt of Blood in die Mitte, und manche Wendungen bringen die Ikone der Nulahmia ins Spiel.','A battlefield of bone walls and graves: walls and fences form the terrain, Ossia adds the Crypt of Blood in the centre, and some twists bring in the Icon of Nulahmia.'),
  setup:[...setupCommon],
  maps:[B('Horizontal: Teilung an der Mittellinie der langen Kante.','Horizontal: split along the middle line.'),B('Diagonal: Teilung von Ecke zu Ecke (Gebiet A oben rechts, Gebiet B unten links).','Diagonal: split corner to corner (territory A top right, B bottom left).')],
  bf:[{n:B('Dolorum','Dolorum'),obj:ob(SB_DOL)},{n:B('Ossia','Ossia'),obj:ob(SB_OSS),my:'crypt'}],
  objNote:B('Dolorum: Mitte 7" Durchmesser, Ecken 5". Ossia: alle Ziele 5" Durchmesser. Die Namen zählen für die Podest-Taktikkarten (Blood, Necropolis).','Dolorum: centre 7" across, corners 5". Ossia: all objectives 5" across. The names matter for the dais battle tactic cards (Blood, Necropolis).'),
  terr:[...Object.entries(SB_TER).filter(([n])=>!SB_TER[n].my).map(([n,d])=>({n:[n,n],d:B(`${d.w}" × ${d.h}" · Höhe ${d.ht}"`,`${d.w}" × ${d.h}" · height ${d.ht}"`),k:TK[d.k],t:B(d.big?'Großes Geländestück':'Kleines Geländestück',d.big?'Large terrain feature':'Small terrain feature')})),
   {n:['Crypt of Blood','Crypt of Blood'],d:B(`${SB_TER['Crypt of Blood'].w}" × ${SB_TER['Crypt of Blood'].h}" · Höhe ${SB_TER['Crypt of Blood'].ht}"`,`${SB_TER['Crypt of Blood'].w}" × ${SB_TER['Crypt of Blood'].h}" · height ${SB_TER['Crypt of Blood'].ht}"`),k:TK.obst,t:B('Nur auf Ossia: steht in der Mitte des Schlachtfelds, diagonal zur Feldrichtung. Fähigkeit – Unholy Draught (deine Nahkampfphase, 1× pro Zug): Wähle eine befreundete Einheit innerhalb von 6 Zoll um die Krypta und wirf einen W6 (+1 als Außenseiter): Bei 4+ addiert sie bis Zugende 1 auf Trefferwürfe im Nahkampf, sonst erleidet sie W3 tödlichen Schaden.','Ossia only: stands in the centre of the battlefield, along the diagonal. Ability – Unholy Draught (your Combat phase, once per turn): pick a friendly unit within 6" of the crypt and roll a D6 (+1 for the underdog): on a 4+ it adds 1 to melee hit rolls until end of turn, otherwise it suffers D3 mortal damage.')},
   {n:['Icon of Nulahmia','Icon of Nulahmia'],d:B(`${SB_TER['Icon of Nulahmia'].w}" × ${SB_TER['Icon of Nulahmia'].h}" · Höhe ${SB_TER['Icon of Nulahmia'].ht}"`,`${SB_TER['Icon of Nulahmia'].w}" × ${SB_TER['Icon of Nulahmia'].h}" · height ${SB_TER['Icon of Nulahmia'].ht}"`),k:TK.obst,t:B('Wird nur durch die Wendung Haunted Locus aufgestellt und bleibt bis zum Rundenende. Fähigkeit – Veiled Promises (Ende deines Zugs, 1× pro Zug): Wähle eine befreundete Einheit innerhalb von 6 Zoll und wirf einen W6 (+1 als Außenseiter): Bei 4+ erhält sie bis Zugende +3 Kontrolle, sonst −3.','Only set up by the twist Haunted Locus and stays until the end of the round. Ability – Veiled Promises (end of your turn, once per turn): pick a friendly unit within 6" and roll a D6 (+1 for the underdog): on a 4+ it gets +3 Control until end of turn, otherwise −3.')}],
  groups:[{n:B('Gruppe A','Group A'),l:SB_GROUP.A},{n:B('Gruppe B','Group B'),l:SB_GROUP.B}],
  terrNote:B('Der Verteidiger wählt eine Geländegruppe, der Angreifer erhält die andere. Danach abwechselnd: Je 1 großes und 1 kleines Geländestück ganz im eigenen Gebiet, mehr als 6 Zoll von anderem Gelände, mehr als 3 Zoll von den langen Kanten und vom Feindgebiet, nicht auf Zielen. Auf Ossia steht zuerst die Crypt of Blood in der Mitte. Geländemaße sind nach Modellfotos geschätzt.','The defender picks a terrain group, the attacker takes the other. Then alternating: 1 large and 1 small feature each, wholly in own territory, more than 6" from other terrain, more than 3" from the long edges and enemy territory, not on objectives. On Ossia the Crypt of Blood stands in the centre first. Terrain sizes are estimated from model photos.'),
  tac:tac(SB_TAC),tw:[{n:B('Dolorum','Dolorum'),l:tw(SB_TW[0])},{n:B('Ossia','Ossia'),l:tw(SB_TW[1])}]},
 {id:'ca',n:B('City of Ash','City of Ash'),sub:B('Schlachtfelder Ashen Bastion und Shattered Crossroads','Battlefields Ashen Bastion and Shattered Crossroads'),
  intro:B('Ein zerstörtes Stadtviertel: Reliquien, die man kontrollieren und verteidigen muss, Ruined Manors auf befestigten Zielen und – auf den Shattered Crossroads – Straßen.','A ruined city district: relics to control and defend, Ruined Manors on fortified objectives and – on Shattered Crossroads – roads.'),
  setup:[...setupCommon.slice(0,5),B('Start-Reliquien: Der Verteidiger wählt eine der zwei Start-Reliquien des Schlachtfelds, der Angreifer erhält die andere. Beide stellen sie ganz im eigenen Gebiet auf.','Starting relics: the defender picks one of the two starting relics of the battlefield, the attacker takes the other. Both set them up wholly in own territory.'),setupCommon[5]],
  maps:[B('Horizontal: Teilung an der Mittellinie der langen Kante.','Horizontal: split along the middle line.'),B('Diagonal: Teilung von Ecke zu Ecke.','Diagonal: split corner to corner.')],
  bf:[{n:B('Ashen Bastion','Ashen Bastion'),obj:ob(CA_BAS),start:CA_START['Ashen Bastion']},{n:B('Shattered Crossroads','Shattered Crossroads'),obj:ob(CA_CRO),roads:CA_ROADS,start:CA_START['Shattered Crossroads']}],
  objNote:B('Ziele mit Gelände darauf sind befestigt: Einheiten, deren Modelle alle auf einem solchen Ziel stehen, haben Deckung. Rechteckige Ziele (z. B. The Ruin) tragen ein Ruined Manor.','Objectives with terrain on them are fortified: units whose models are all on such an objective have cover. Rectangular objectives (e.g. The Ruin) carry a Ruined Manor.'),
  terr:[{n:['Ruined Manor','Ruined Manor'],d:B(`L-Form · 2 × ${CA_MANOR.len}" · Höhe ${CA_MANOR.ht}"`,`L-shape · 2 × ${CA_MANOR.len}" · height ${CA_MANOR.ht}"`),k:B('Großes Geländestück: Deckung, instabil','Large terrain feature: cover, unstable'),t:B('Jeder Spieler stellt 1 ganz im eigenen Gebiet auf eine Ecke eines rechteckigen Ziels (Verteidiger zuerst).','Each player sets up 1 wholly in own territory on a corner of a rectangular objective (defender first).')},
   ...Object.entries(CA_RS).map(([n,s])=>({n:[n,n],d:B(`${s[0]}" × ${s[1]}"`.replace(/\./g,','),`${s[0]}" × ${s[1]}"`),k:B('Reliquie','Relic'),t:X(CA_REL[n])}))],
  terrNote:B('Reliquien werden im Lauf der Schlacht durch Wendungen und Taktikkarten aufgestellt (mehr als 3 Zoll von Feinden, mehr als 6 Zoll von anderen Reliquien). Wer eine Reliquie kontrolliert, nutzt ihre Fähigkeit. Manor-Grundriss und Reliquienmaße sind nach Fotos geschätzt.','Relics are set up during the battle by twists and tactic cards (more than 3" from enemies, more than 6" from other relics). Whoever controls a relic uses its ability. The manor layout and relic sizes are estimated from photos.'),
  tac:tac(CA_TAC),tw:[{n:B('Ashen Bastion','Ashen Bastion'),l:tw(CA_TW[0])},{n:B('Shattered Crossroads','Shattered Crossroads'),l:tw(CA_TW[1])}]}
];
