## v121
- Fŷrstahl-Wurfaxt (Fyreslayer): jetzt wie jede Fernkampf-Fähigkeit pro Einheit in der Fernkampfphase einsetzbar (Einheit antippen → Fähigkeit → Ziel auf der Karte antippen, 10", sichtbar, 4+ → W3 tödlicher Schaden); jede berechtigte Einheit einmal je Phase.

## v120
- Symbole: 100 neue, eigens gezeichnete Einheitensymbole (insgesamt 176); jede Einheit hat ein zur Fraktion passendes Motiv (z. B. Zahnrad/Anker/Luftschiff bei Kharadron, Warpstein/Zahnrad bei Skaven, Rippen/Knochenhand bei Ossiarch, Laterne/Kapuze bei Nachtspuk, Muschel/Aal bei Idoneth, Eichel/Eule bei Sylvaneth). 130 verschiedene Symbole im Einsatz (vorher 73).
- Token-Rand: 12 statt 4 Zierrand-Muster, je Fraktion eigenes Muster.
- Armee-Fähigkeiten (z. B. Fŷrstahl-Wurfaxt): sind jetzt im Hinweisbalken als „Fähigkeit“-Knopf erreichbar, wenn sie einsetzbar sind.

## v119
- Armee-Auswahl beim Start: Reihenfolge wie in der Regel-App (Ordnung, Chaos, Tod, Zerstörung; darin nach Fraktion, dann Reihenfolge der Spearheads).
- Auswahl von Einheiten, Zielen und Gelände (Karten, Fähigkeiten u. Ä.): die wählbaren Objekte sind auf der Karte golden umrandet und werden direkt angetippt; übrige Optionen als Knöpfe, „Liste“ öffnet die bisherige Liste.

## v118
- Leiste der 1×-pro-Schlacht-Fähigkeiten: Tippen auf ein Symbol bietet bei einsetzbaren eigenen Fähigkeiten den Knopf „Jetzt einsetzen“ (bisher nur Info; Einsatz nur über das Menü).

## v117
- Leiste der 1×-pro-Schlacht-Fähigkeiten: „Jetzt einsetzbar“ berücksichtigt jetzt die Voraussetzungen (z. B. keine Kavallerie ohne Angriff übrig) und erkennt auch Texte mit „Deine …phase“ (Für Sigmar, zum Angriff!; Avatar der Schatten). Vorher wurden diese immer als einsetzbar gezeigt.

## v116
- Würfel-/Berichts-Popup liegt jetzt unter der „Wer gegen wen“-Anzeige statt dahinter (kein überlagerter, unscharfer Text mehr), höhere Ebene und angepasste Maximalhöhe.

## v115
- Fernkampf ohne einsetzbare Waffe (z. B. Großkanone nach Bewegung: nur Kartätsche 12") wird vorab mit Meldung abgelehnt; sonst klare Meldung statt leerem Bericht ohne Würfel. KI beachtet das ebenfalls.

## v114
- Monument of Living Bone: das Gelände zählt als Ziel mit 3" Reichweite vom Geländerand (abgerundete Ecken) statt von der Mitte; Anzeige auf dem Feld entsprechend.

## v113
- Gelände/Relikte: Antippen dreht in 10 Schritten à 18° bis 180° (danach wieder 0°).
- Einheitensymbole: ~27 neue eigene Glyphen (Helm, Lanze, Muskete, Armbrust, Wolf, Ziege, Käfer, Baum, Pilz, Welle, Fisch, Fledermaus, Kessel, Knochen, Amboss, Turm …) und gezielte, fraktionstypische Zuordnung je Einheit.

# Changelog

## v112
- Gelände/Reliquien: Dreh-Knöpfe ↺ ↻ entfernt. Gedreht wird per Antippen des Stücks (45°) oder mit zwei Fingern; die Treffzone zum Antippen ist größer (mind. 3" um die Mitte), damit auch kleine Stücke auf dem Handy zuverlässig reagieren.

## v111
- Regel-App: Nummerierung der Startseiten-Kacheln korrigiert (Battlepacks 4, Suche 5).

## v110
- Gelände (und Reliquien) platzieren: neue Steuerung. Stück ziehen = verschieben (wird nicht sofort abgelegt), Stück antippen = um 45° drehen (↺ ↻ für Feinschritte, Zwei-Finger-Drehen bleibt), „✓ Fertig“ legt das Stück ab und bringt das nächste.
- Regel-App: Kampfeigenschaften aller Armeen aus den PDFs ergänzt (inkl. Blutdrangjagd, Epikureische Feiernde, Ödschar, Füsilierzug, Felsenwerfer, Traumschnitter, Sternenpanzerheer, Wallbrecher, Eisenkiefa, Blutgeschworene Pilger, Mondsuchtmob).
- Test: ui_smoke.py prüft jetzt den aktuellen Build (vorher fest auf einen alten Ordner verdrahtet) und das neue Gelände-Verhalten.

## v109
- Zufalls-Aufstellung („Aufstellung: Zufällig“ im Startmenü) und der Knopf „Rest automatisch“ sind vorerst abgeschaltet (Schalter AUTODEP in flow.js), da die Funktion noch nicht zuverlässig läuft.
- Regel-App: Kampfeigenschaften für weitere Spearheads ergänzt (Yndrastas Speerspitze, Wachsame Bruderschaft, Verfluchte Fesselhorde, Seuchenzelle, Drakkblud-Clangarde, Magma-Fyrd, Fresshorde-Plünderer, Schlundsucher-Mob, Wächter von Glutwacht, Crixxits Jagdrudel, Helfeuerheer) sowie die der vier neuen Armeen aus dem Spiel. Armeen-Seiten bleiben ohne Scrollen (Texte teils zusammengefasst).
- Noch ohne Kampfeigenschaften (Quelltext fehlt): Blutdrangjagd, Epikureische Feiernde, Ödschar, Füsilierzug, Felsenwerfer, Schauderhafte Traumschnitter, Sternenpanzerheer.

## v108
- Statistik: „Letzte Spiele“ zeigt jetzt auch die gegnerische Armee.
- Rückgängig (↶) gilt nun für alle Bewegungsaktionen der eigenen Phase: Bewegen, Anpassen, Rennen, Rückzug, Angriff, Reserve/Hinterhalt – solange danach keine andere Aktion folgte.
- Aufstellung: neuer Knopf „Rest automatisch“ stellt die verbleibenden Einheiten regelkonform zufällig auf. Behebt außerdem einen Fehler (fehlender Import), durch den die Startoption „Aufstellung: Zufällig“ nicht funktionierte.

## v107
- Vier neue Armeen (alle aktuellen Battleclash-Speerspitzen jetzt komplett): **Khainitischer Schattenzirkel** (Töchter des Khaine: Schlächterkönigin auf Blutkessel, Hexenkönigin, Blutqual-Medusa, 2× Schlächterschwestern, Schattenjäger; Schattenmasken, Tanz des Todes, Schattensprung u. a.), **Hurakan-Speerspitze** (Lumineth: Windmagier, Windreiter, Auralanwächter, Windgeist; leewärtige Schlachtfeldkante mit Im Sog der Winde, Kraft des Sturms, Sprung in den Sturm, Auge des Sturms), **Kastellitenkompanie** (Städte Sigmars: Rittermarschall, 2× Stahlhelme, Ritter, Eisenschmiede-Großkanone; Befehl des Offizars, Das Land weihen, Granatenmunition) und **Tzaangor-Kriegsherde** (Jünger des Tzeentch: Schamane, Erleuchtete aus der Reserve, Omenleser, Tzaangors; Die Zukunft vorhersagen, Das Schicksal betrügen, Mutationsaura, Höllentor).
- Engine: neue Reservezone „1 Zoll vom Rand im eigenen Territorium“, Gegner-Phasen-Fähigkeiten auch zu Beginn der gegnerischen Fernkampfphase, Bewegungs-Einschränkungen (Tosender Gegenwind), Treffer-Hooks vor Attacken (Kraft des Sturms, Schimmerling), Taktikkarten, die nach dem Befehl auf die Hand zurückkehren.
- Vereinfachungen: Mehrere Bewegungs-/Aufstellungsfähigkeiten setzt die KI nicht ein; „näher an der Kante“ misst vom Einheitenmittelpunkt; Schattenmasken, Für Sigmar zum Angriff und Kraft des Sturms wirken nur in der eigenen Angriffsphase bzw. automatisch; Großkanone wählt das Profil automatisch (Kartätsche nach Bewegung oder gegen Horden ≤ 12").

## v106
- Neue Armee: Nachtspuk Sensenheer: Ritter des Grabtuchs, Geisterscharen, 2× Düsterschnitter, 2× Kettengeister; Welle des Schreckens, Körperlos (Schutzwurf-Modifikatoren ignoriert), Regimenter, Verbesserungen (u. a. In Schatten gewandet: nur 1 Angreifer je Phase auf den General).

## v105
- Neue Armee: Kharadron Himmelsschlagverband (Himmelsherrscher der Kharadron): Arkanauten-Admiral, Himmelswächter, zwei Arkanauten-Kompanien, Arkanauten-Fregatte; Durchquert die Himmel (Transport), Angriffsschiff, Lösen, Bombenvorrat, Zeitzünder-Sprengladungen und alle Verbesserungen.

## v104
- Neue Armee: Gebeinwache (Höfe der Leichenfresser): Wahn und Irrsinn (Ritterheer/Festmahl/Wächter/Jäger), Scheußlicher Bluthüter, Königliche Bestienhäuter, Gruftschrecken, Gruftschinder, Regimenter, Verbesserungen und Fähigkeiten.

## v103
- Pop-ups: Button oben rechts (◐) macht das Fenster zu 80 % durchsichtig und wieder normal; Menü- und Info-Button sind immer bedienbar, auch bei offenen Pop-ups (das Menü legt sich über das offene Fenster und gibt es danach zurück).
- Shattered Crossroads: Zielumrisse (Great Wheel, Ghal Maraz, Twin-Tailed Comet, High Star) liegen jetzt auf den Umrissen des Hintergrundbilds.

## v102
- Neue Armee: Aaskreuzzug (Höfe der Leichenfresser): Scheußlicher Erzregent, Gruftgarde, Morbheg-Ritter, Varghulf-Höfling; Edle-Taten-Punkte (★ unter der Lebensleiste), Fressrausch, Treue Diener beschwören, zwei Regimenter, vier Verbesserungen.
- Näherung: Ulguisches Geschmeide wirkt über die allgemeine Sichtbarkeitsprüfung (Fernkampf, Zauber).

## v101
- Regelübersicht: Grand-Alliance-Zuordnung korrigiert (Ossiarch → Tod, Sklaven der Finsternis → Chaos; Sylvaneth und Idoneth ausdrücklich Ordnung).

## v100
- Neue Armee: Eisenkiefa-Moschmob (Orruk-Kriegsclans): Megaboss, Platt’nhelme (2×), Wutprotze, Kraftprotze (Reserve ab Runde 3); Mächtige Zerstörer, Naturgewalt, Ordentlicher Radau, vier Verbesserungen.
- Näherung: „Mächtige Zerstörer“ nur in der eigenen Heldenphase; „keine Ziele beanspruchen“ = zählt nicht für die Zielkontrolle.

## v99
- Angriff per Ziehen deutlich schneller: die Ersatzplanung (Angriffsplan) wird pro Angriff nur einmal berechnet statt bei jeder Mausbewegung.
- Hinweise zum Drehen beim Bewegen/Angriff entfernt.

## v98
- Wendungskarten ohne Außenseiter: Underdog-Effekte entfallen, außer die Karte nennt ausdrücklich eine Ersatzregel. Korrigiert: Survivor's Grief (Würfelduell-Gewinner wählt). Alle übrigen Karten geprüft.

## v97
- Neue Armee: Akhelianer-Flutgarde (Tiefenvolk der Idoneth): Akhelianer-König, Morrsarrgarde, Ishlaengarde, Namarti-Bogenschützen; Königlicher Imperativ, Regimenter, Verbesserungen.
- Drehung beim Bewegen von Einheiten entfernt.
- Gelände aufstellen: Drehen per Zwei-Finger-Geste (Buttons bleiben).

## v96
- Aufstellung von Gelände: Der Links-Drehen-Knopf hat bisher nicht funktioniert (falsches Element), jetzt drehen beide Knöpfe
- Angriff: keine Drehung mehr beim Bewegen der Einheit
- City of Ash (Shattered Crossroads): Hintergrundbild und Junction-Ziel sind deckungsgleich (Bild verschoben, Ziel-Radius 3,7")
- Visionen des Ruhms (Finsterschwur-Zerreißer): Wiederholungswürfel werden wie die Schicksalswürfel angezeigt (Würfel, Verbleibende, Einsatz automatisch/mit Nachfrage/nie)

## v95
- Neue Armee: Tiefenvolk der Idoneth Seelenraubgesellschaft (Tiden des Todes je Schlachtrunde, Ritual des schleichenden Nebels, Biovoltaischer Schlag, Blutrünstige Räuber, vier Verbesserungen)

## v94
- Zusammenhalt: Einheiten müssen jetzt eine zusammenhängende Gruppe bilden (zwei getrennte Paare galten bisher fälschlich als in Ordnung); Verluste und zurückkehrende Modelle erhalten den Zusammenhalt, wo möglich

## v93
- Neue Armee: Sklaven der Finsternis Finsterschwur-Plünderer (Schwüre der Finsternis mit zur Seite gelegten Taktikkarten, Visionen des Ruhms mit Wiederholungen, Arkhars Wut, Furchtlose Invasoren, Glorreicher Tod, vier Verbesserungen)

## v92
- City of Ash: Das Ruined Manor steht immer innerhalb des rechteckigen Ziels (Mauern nach innen, bei Platznot gekürzt), nie außerhalb

## v91
- Neue Armee: Sklaven der Finsternis Bluthauchlegion (Auge der Götter mit dauerhaften Segen, Schreckensbanner, Dunkle Eroberer, vier Malen); neue Fraktion mit Kriegsherr des Chaos, Streitwagen des Chaos, Chaoskriegern und Chaosrittern

## v90
- Geländeaufbau: Gibt es für ein Geländestück keinen Platz mit 6 Zoll Abstand (z. B. Sand and Bone diagonal), wird der Abstand automatisch gelockert
- Kopfjäger blockiert den Kampf nicht mehr, wenn der gewählte Held tot oder außer Reichweite ist; KI-Notausgang bei abgelehnten Antworten
- Regel-App: Schlüsselwörter bei den Einheiten in Spearhead on a Page

## v89
- Regel-App: neuer Bereich „Battlepacks“ (Fire and Jade, Sand and Bone, City of Ash) mit Spielfeldkarten, Zielen, Geländestücken und Reliquien, allen Taktikkarten und Wendungen, deutsch und englisch, durchsuchbar

## v88
- Neue Armee: Ogor-Schlundstämme Tyrannengebrüll (Auf dem Schlundweg, Schmetterwanst, Tyrann ersten Ranges); neues Waffenmerkmal Anti-Monster

## v87
- Option „Schlachtrunden-Infos“ aus dem Startmenü entfernt (im Code erhalten); die Wendungskarte mit Erklärung wird immer angezeigt

## v86
- Neue Armeen: Fyreslayers Sagenträchtige Axtschar (Ur-Gold-Runen), Behemat Wallbrecher (Menschenquetscher-Gargant) und Khorne Reißzähne des Blutgottes (Die Beute)


## v85
- Neue Armeen: Sylvaneth Bitterborkengesträuch (Geländeregeln) und Geisterschwingenschwarm (Beute und Akkorde)

## v84
- Basisgrößen mit den offiziellen Schlachtprofilen (Sept. 2026) abgeglichen: 27 Einheiten korrigiert

## v83
- Neue Armeen: Ossiarch Zwangsvollstrecker-Echelon (mit Ossiarch-Befehlspunkten) und Mortisan-Elite (mit Disziplin-Würfen)

## v82
- Neue Armee: Ossiarch Kavalos-Speerspitze (Knochenlegionen der Ossiarch)
- Einheitenanzeige zeigt Schlüsselwörter; Zusammenhalt beim Entfernen von Modellen nutzt den Einheitenwert
- Grundlage für weitere Armeen (Fähigkeiten-Hooks)

## v81
- Menü: Version und Upload-Zeit; Name wird zusätzlich als Cookie gemerkt
- Statistik: Tabelle wird automatisch angelegt, klare Fehlermeldung wenn die D1-Datenbank „DB“ fehlt

## v80
- Fähigkeiten „1× pro Schlacht“ (unten links): immer sichtbar, leicht ausgegraut; nur in der passenden Phase bzw. zum passenden Zeitpunkt hell und hervorgehoben

## v79
- Ossia: alle vier Ziele 5" (Radius 2,5); Dolorum: Eckziele 5", Mittelziel 7" (Radius 3,5) in Kontrolle, Anspruch und Anzeige
- Neue Mattenbilder für Ossia und Dolorum, Ziele massgenau; Regel-App nennt die Zielgrößen

## v78
- Aqshy: neues Mattenbild (sauberes Produktbild ohne Logos), alle fünf Ziele liegen auf den gemessenen Positionen (Abweichung unter 0,1")
## v77
- Ghyran: neues Mattenbild (sauberes Produktbild, Logos entfernt), so skaliert, dass alle Ziele exakt 6" Durchmesser haben und auf den Mattenmaßen liegen

## v76
- Herkunft jeder Option sichtbar (⟡): Taktikkarte (als Befehl), Einheit, Kampfeigenschaft der Armee, Regimentsfähigkeit, Verbesserung des Generals, Gelände/Reliquie, Wendungskarte – in Einheiten-Menü, Hauptmenü, Reaktionen, Befehlen und Folgefragen

## v75
- Einheiten-Details: Zeile „Fähigkeiten: …“ mit den internen Fähigkeitsnamen entfernt (die Fähigkeitstexte bleiben)

## v74
- Platzieren und Bewegen: ungültige Punkte rasten auf die nächste gültige Position ein (Aufstellen bis 10", Bewegung/Angriff/Nachrücken entlang der Zuglinie und im Umkreis); Vorschau zeigt die eingerastete Position
- Reserven und Hinterhalt: werden am Ende der passenden Phase automatisch angeboten (Abbrechen lässt die Einheit in Reserve)
- KI: wählt Ziele von Fähigkeiten und Wendungskarten gezielt statt zufällig, berücksichtigt die Erfolgschance beim Angriff; Arena gegen v73: etwa +1,5 Siegpunkte pro Spiel

## v73
- Abstände zu Kanten und Feldmitte (Raze, Take the Flanks, Hold the Centre, A Timely Exit) vom Basisrand gemessen
- Staging Posts: beide gewählten Ziele zählen

## v72
- Feld überall 30×22,4; Ziele nach Mattenmaßen (Aqshy, Ghyran, Dolorum, Ossia), alle mit 3" Radius um die Mitte
- Ossia-Korrektur zurückgenommen (Radius wieder 3"); Crypt of Blood in der Feldmitte
- Neues Aqshy-Mattenbild passend zu 30×22,4

## v71
- Ossia: Ziele mit 2,5" Radius wie auf der Matte; Crypt of Blood exakt auf der Diagonalen und kleiner
- Dig Two Graves: Gebiet nach Modellmitte der getöteten Modelle
- Raze: Rand der Basis höchstens 3" von der Kante
- Morbid Consecration: nutzt den korrigierten Zielradius (ganz im eigenen Gebiet = kein Teil im Feindgebiet)

## v70
- Regel-App: Spearhead-Übersicht nach Grand Alliance sortiert (Ordnung, Chaos, Tod, Zerstörung)

## v69
- Regel-App: Spearhead-Seiten mit zwei Tabs (Armee-Regeln / Modelle), ohne Scrollen

## v68
- Regel-App: Einheiten als kompakte Karten (Werte + Waffen in der Kopfzeile, Details per Antippen), Schnellnavigation; Regelübersicht mit „Auf einen Blick“ und gruppiert

## v67
- Neue Regel-App (regeln.html, DE/EN): Spearhead on a Page (31 Armeen), Regelübersicht, Glossar, Suche; „i“-Knopf im Spiel öffnet sie als Overlay

## v66
- Startseite mit Statistik-Übersicht und Knopf „Neues Spiel“
- PWA (Home-Bildschirm), Spielstatistik über Cloudflare D1
- Crypt of Blood nur auf Ossia, Start-Optionen „Schlachtrunden-Infos“ und „zufällig aufstellen“
- City of Ash: Zielflächen nach aufgedruckter Form
