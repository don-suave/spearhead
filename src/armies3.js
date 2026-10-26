// Dritte Armeenwelle (Spearhead-PDFs). Waffen: [Name, Reichweite, Attacken, Treffen, Verwunden, Wucht, Schaden, Flags]. Hooks: siehe hooks.js / abil3.js.
export const ARMY3=[
{f:'Knochenlegionen der Ossiarch',n:'Kavalos-Speerspitze',tr:['kv_finte','kv_lanze'],
 reg:[['Scheinrückzug','Einmal pro Schlacht, deine Bewegungsphase: Befreundete Einheiten dürfen in diesem Zug auch nach einem Rückzug Angriff-Fähigkeiten einsetzen.',1,'kv_schein'],['Verstärkte Konstrukte','Einmal pro Schlacht, beliebige Nahkampfphase: Befreundete Einheit hat bis Zugende Rettung 5+.',1,'kv_konstr']],
 enh:[['Mächtiger Archaeossianer','Passiv: Der General hat Rettung 5+.',1,'kv_arch'],['Mörderische Klinge','Passiv: Die Klinge des Befehlshabers des Generals hat Krit. (2 Treffer).',1,'kv_klinge'],['Herrischer Befehlshaber','Deine Bewegungsphase: Sichtbare befreundete Einheit ganz innerhalb 12 Zoll um den General: 3+ → +2 Zoll Bewegung bis Zugende.',1,'kv_herr'],['Kalte Grausamkeit','Beliebige Nahkampfphase: Hat der General in diesem Zug nicht angegriffen und ist im Nahkampf: Sichtbare befreundete Einheit ganz innerhalb 12 Zoll: 3+ → +1 Wucht auf Nahkampfwaffen bis Zugende.',1,'kv_kalt']],
 units:[
 {n:'Kavalos-Fürst',abs:['kv_signal'],l:'K',kw:'Held, Kavallerie',mv:10,wm:7,nm:1,sv:3,cv:2,wr:6,r:1.4,b:'90x52',gen:1,mw:[['Klinge des Befehlshabers',0,5,3,4,1,2,'C'],['Hufe, Zähne und Stachelschwänze des Kavalos-Rosses',0,4,5,3,0,1,'G']],
  tx:[['Ausgeklügelte Finte (Kampfeigenschaft)','Passiv: Befreundete Kavallerie-Einheiten erleiden durch Rückzug-Fähigkeiten keinen tödlichen Schaden.',1],['Kavalos-Lanze (Kampfeigenschaft)','Einmal pro Zug (Armee), deine Heldenphase: Befreundete Einheit darf sich bis Zugende durch feindliche Modelle bewegen, als hätte sie Fliegen.',1],['Signal zum Angriff','Heldenphase: Sichtbare befreundete Einheit ganz innerhalb 12 Zoll: 3+ → +1 auf Angriffswürfe bis Zugende.',1]]},
 {n:'Kavalos-Todesreiter',abs:['kv_kehrt'],l:'T',kw:'Kavallerie',mv:10,wm:3,nm:5,sv:4,cv:1,wr:6,r:2,b:'75x42',c:2,mw:[['Kavalos-Klinge',0,3,3,4,1,1,''],['Hufe und Zähne',0,2,5,3,0,1,'G']],
  tx:[['Kehrtwende','Nahkampfphase: Hat die Einheit in diesem Zug angegriffen: 3+ → sie bewegt sich bis zu ihrer Bewegung (auch durch feindliche Nahkampfreichweite), darf aber nicht im Nahkampf enden.',1]]},
 {n:'Teratische Kohorte',abs:['kv_wild'],l:'H',kw:'Bestie, Verstärkung',mv:7,wm:1,nm:8,sv:5,cv:1,wr:6,r:2,b:'40',mw:[['Kohortenwaffen',0,2,3,4,1,1,'']],
  tx:[['Wild bis in die Knochen','Bewegungsphase: Die Einheit darf sich 3 Zoll bewegen, auch in den Nahkampf.',1]]}
 ]}
];
