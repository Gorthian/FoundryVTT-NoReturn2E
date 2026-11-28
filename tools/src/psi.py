# -*- coding: utf-8 -*-
"""PSI-Kräfte und PSI-Apps (NoReturn 2E, Kapitel 4). Parameter aus dem Regelwerk, Effekte als Kurzfassung.
„KS“-Ausdrücke werden beim Wirken im Chat ausgerechnet."""
import json
import os
from .common import icon, p

POWER_KEYS = {
    "Animakinese": "animakinese", "Biokinese": "biokinese", "Chronokinese": "chronokinese", "Cryokinese": "cryokinese",
    "Elektrokinese": "elektrokinese", "Haimakinese": "haimakinese", "Morphokinese": "morphokinese", "Photokinese": "photokinese",
    "Psychokinese": "psychokinese", "Pyrokinese": "pyrokinese", "Technokinese": "technokinese", "Telekinese": "telekinese"
}
POWERS = {
    "animakinese": ("Animakinese", 2, "Manipulation der Psyche und Restprojektionen Verstorbener (Neuralprojektion).", "Objekte verschwimmen geisterhaft.", 197, "magic/death"),
    "biokinese": ("Biokinese", 2, "Manipulation biologischen Gewebes.", "Kleine Hautstelle ändert kurz Farbe/Struktur.", 198, "magic/life"),
    "chronokinese": ("Chronokinese", 3, "Manipulation der Zeit.", "Zeit läuft für ein Objekt kurz rückwärts.", 200, "magic/time"),
    "cryokinese": ("Cryokinese", 1, "Temperatur ins Negative, Kontrolle über Wassermoleküle.", "Reif und Eiskristalle.", 201, "magic/water"),
    "elektrokinese": ("Elektrokinese", 1, "Manipulation elektrischer Ströme, Erzeugen von Elektrizität.", "Leuchtmittel flackern, kleine Blitze.", 203, "magic/lightning"),
    "haimakinese": ("Haimakinese", 1, "Manipulation von Blut. Setzt die Abnormität „Demigod“ voraus.", "Sichtbares Blut bewegt sich, kristallisiert oder brodelt.", 204, "magic/unholy"),
    "morphokinese": ("Morphokinese", 3, "Manipulation von Masse in Größe und Konsistenz.", "Kleines ruhendes Objekt ändert kurz die Größe.", 206, "magic/earth"),
    "photokinese": ("Photokinese", 2, "Manipulation von Licht.", "Licht wird heller/dunkler, Schatten verformen sich.", 208, "magic/light"),
    "psychokinese": ("Psychokinese", 2, "Manipulation von Verstand und Gedanken.", "Wirre Stimmen in Köpfen.", 209, "magic/perception"),
    "pyrokinese": ("Pyrokinese", 1, "Temperatur ins Positive, Kontrolle von Feuer.", "Etwas brennt ohne zu verbrennen.", 211, "magic/fire"),
    "technokinese": ("Technokinese", 3, "Manipulation von Signalen, Daten und Geräten ohne Eingabegeräte.", "Elektronik in der Nähe wird gestört.", 212, "magic/control"),
    "telekinese": ("Telekinese", 1, "Manipulation kinetischer Kräfte und Masse über Distanz.", "Kleine Objekte schweben.", 213, "magic/air"),
}

# name: (Effekt-Kurzfassung, Extras)
E = {
    # Animakinese
    "Aegis": ("Aura KS×3 m: alle Ziele mit Neuralprojektion (inkl. selbst) erhalten +KS×10 Punkte auf Widerstandsproben (Schaden, PSI, Manipulation).", {}),
    "Dreamcatcher": ("Hält eine körperlose Neuralprojektion (max. KS×2 KR verlassen) fünf Minuten fest. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Equilibrium": ("Meditativer Zustand: +KS×2 W auf PSI-Defensivaktionen und „Sechster Sinn“, solange gehalten.", {}),
    "Good Guess": ("Wissen Verstorbener: nächste Wissen-Probe innerhalb 5 Min. +KS W (nicht Willenskraft).", {}),
    "Jenseitsbrücke": ("Eine körperlose Neuralprojektion spricht KS Minuten durch den Charakter. Abbruch: −10 Psyche.", {}),
    "Kick": ("Reißt die Neuralprojektion aus dem Ziel (leere Hülle), hält sie KS Minuten. Danach 10−KS Psyche und Organismus Verlust. Widerstand: Willenskraft gegen KS×15.", {"resist": "Willenskraft gegen KS×15"}),
    "Körpertausch": ("Tauscht für KS×2 KR die Körper mit dem Ziel; Abbruch −2 Psyche; stirbt ein Körper, kein Rücktausch. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Orakel": ("Nimmt in KS×5 m Blickrichtung die Konturen aller Körper mit Neuralprojektion wahr.", {}),
    "PSI-Sicht": ("KS×2 Ziele im 5-m-Umfeld als drehbare 3D-Bilder vor dem inneren Auge.", {}),
    "PSI-Proxy": ("Lagert eine gehaltene App an ein anderes Wesen aus, das die Haltungskosten trägt. Widerstand: Willenskraft gegen KS×5.", {"resist": "Willenskraft gegen KS×5"}),
    "Sinnesbrücke": ("Nimmt KS beliebige Sinne des Ziels unbemerkt mit wahr.", {}),
    "Seelenfeuer": ("Ziel erleidet KS×10 Schaden; jede Neuralprojektion im 5-m-Umkreis verliert 1 Psyche, je entzogenem Punkt +20 Schaden.", {"damageMult": 10}),
    "Seeleninfusion": ("Transferiert eine Neuralprojektion in einen lebenden Körper ohne Projektion. Kostet 10−KS Psyche.", {}),
    "Spiritwalk": ("Löst die Neuralprojektion für KS×2 Spielrunden (KS×20 m je Runde) vom Körper; angreifbar durch Dreamcatcher/Suche/Jenseitsbrücke.", {}),
    "Suche": ("Spürt eine bestimmte körperlose Neuralprojektion auf und hält sie KS Minuten. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    # Biokinese
    "Antibakteriell": ("Infektionsresistenz +KS W; ab KS 3 werden ALK-Reste entfernt (Ohnmacht bleibt).", {}),
    "Diagnose": ("KS Informationsbereiche über den Organismus (ALK, Abnormitäten, Eigenschaften, Implantate, Krankheiten, Schaden); ab KS 6 Genstruktur. Folge-Biokinese auf das Ziel +KS−1.", {}),
    "Disguise": ("Nimmt die Gestalt einer anderen Person an (gleiche Masse); je KS +2W auf Schauspiel.", {}),
    "Froschhaut": ("Ätzender Schleim: KS×5 Schaden bei Berührung, ignoriert MK:A.", {"damageMult": 5, "pierce": "A"}),
    "Gen-code": ("+KS×2 W auf Chemie und Medizin.", {}),
    "Heilung": ("Berührtes Ziel heilt KS×5 Schadenspunkte, Körperteile wachsen nach (keine Robotik). Ab KS 3 auf Sicht.", {}),
    "Knochensporn": ("KS Körperzonen formen Knochenwaffen: Angriff/Parade +2W, Schaden ST+KS×10 (Waffenkampf).",
                     {"weapon": {"name": "Knochensporn", "count": 1, "attackDice": "2", "parryDice": "2", "strength": True, "damage": "KS*10", "damageType": "stich"}}),
    "Kompostierung": ("Ziel verjüngt oder altert um KS Monate; ab KS 6 alternativ KS−5 Jahre.", {}),
    "Lähmung": ("Ziel muss KO-Probe gegen KS×5 bestehen, sonst völlig bewegungsunfähig; jede weitere Befreiungsprobe kostet eine Aktion.", {"resist": "Konstitution gegen KS×5"}),
    "PH0": ("Ätzende Flüssigkeit: Angriffswurf KS×15, Schaden KS×20, ignoriert Rüstung bis MK:B.", {"damageMult": 20, "pierce": "B"}),
    "Tod": ("Ziel stirbt sofort, Regeneration wird ignoriert. Kostet 10−KS Psyche und Organismus. Widerstand: Ausdauer gegen KS×15.", {"resist": "Ausdauer gegen KS×15"}),
    "Toxische Aura": ("Grüner Nebel KS×2 m um den Charakter: organische Ziele erleiden KS×5 Schaden, Atmen unmöglich.", {"damageMult": 5, "allZones": True}),
    "Transmutation": ("Verteilt körperliche Attribute neu; je verschobenem Punkt 10−KS Organismus. Dauer 30−KS Minuten.", {}),
    "Verformung": ("Verändert das Aussehen des Ziels dauerhaft (100 Min., −KS×10 Min.); ab KS 7 Zellstruktur mit Speichermedium.", {}),
    "Zellregeneration": ("Für 2 EP werden KS Punkte Organismus wiederhergestellt; ab KS 2 auch bei willigem Ziel.", {}),
    # Chronokinese
    "Blur": ("+KS W auf Nahkampf, Rennen und Waffenkampf durch unnatürliche Geschwindigkeit.", {}),
    "Double Tap": ("Ab nächster KR KS/2 zusätzliche Aktionen, solange gehalten.", {}),
    "Langstrecken-Teleportation": ("Teleport an einen beliebigen Ort in KS×50 km Entfernung.", {}),
    "Persönliche Zeit": ("Versetzt ein Ziel (max. Würfel KS×0,5 m) in einen früheren Zustand; gegen Wesen mit Projektion 20−KS Psyche und Organismus Verlust.", {}),
    "Relax": ("Simuliert KS×2 Stunden Schlaf in zwei Aktionen – vollständig ausgeruht; gehaltene Apps enden.", {}),
    "Slow down": ("Alles verlangsamt: +KS W auf Geschütze, Projektilwaffen und Schießen.", {}),
    "Teleport": ("Teleport im Wahrnehmungsbereich innerhalb KS×10 m. Nur eine Aktion. Defensivaktion (Ausweichen).", {}),
    "Timefreeze": ("Hält die Zeit an. Danach altert der Charakter 6−KS Jahre und verliert dauerhaft 6−KS Psyche je gehaltener KR (min. je 1).", {}),
    "Time Dodge": ("+KS W auf Ausweichen und Reaktion.", {}),
    "Timer": ("Nächste App erhält bis KS×2 Spielrunden Verzögerung – Effekte können gleichzeitig auslösen.", {}),
    "Vergangene Weihnacht": ("Beobachtet bis KS×100 Tage in der Vergangenheit, KS Stunden handlungsunfähig.", {}),
    "What if": ("SL beschreibt wahrscheinliche Reaktionen auf eine fiktive Aktion für KS KR. Kostet 1 EP (ohne EP: Fehlschlag).", {}),
    "Yesterday": ("Beobachtet bis KS×10 Stunden in der Vergangenheit, KS Minuten handlungsunfähig.", {}),
    "Zeitloses Wissen": ("Zeitpool in Höhe von KS (wie Meditation) und „Sechster Sinn“; endet, wenn der Pool leer ist.", {}),
    "Zweite Chance": ("Misslungene Probe wiederholen mit +KS×5 Punkten; kostet 1 Psyche, keine Aktion. Nur bei Bewusstsein.", {}),
    # Cryokinese
    "Abkühlen": ("Hebt im Radius KS×2 m alle Hitze- und Feuereffekte auf.", {}),
    "Blizzard": ("Eissturm KS×10 m Radius im Sichtfeld: jede KR KS×100 Kälteschaden an allen Zonen und Unterkühlung (KS×5/KR, wirkt 5 KR nach) – insgesamt KS×105 je KR.", {"damageMult": 105, "allZones": True}),
    "Bridge": ("Gefriert Flüssigkeit KS×2 m breit, KS×10 m lang, trägt KS×500 kg.", {}),
    "Eisbarriere": ("Eisschicht verschließt einen Durchgang oder stabilisiert eine Fläche: Stabilität KS×20 MK:B. Defensivaktion (Block).", {}),
    "Eisnadeln": ("Eisnadeln: Angriffswurf KS×10, Treffer KS×15 Kälteschaden.", {"damageMult": 15}),
    "Eisplatten": ("Eisplatten verstärken die Ausrüstung um KS×5 MK:B.", {}),
    "Frostblick": ("Augen des Ziels gefrieren: Schaden WA(Sehen)+KS×5 an der Zone der Augen; solange gehalten −KS W auf optische Wahrnehmung.", {}),
    "Frostgeschoss": ("Fernkampfangriffe verursachen zusätzlich KS×10 Kälteschaden.", {}),
    "Frostgriff": ("Fäuste oder Nahkampfwaffe verursachen zusätzlich KS×20 Kälteschaden.", {}),
    "Glatteis": ("Eisschicht KS×2 m Radius: wer nicht BE+Akrobatik gegen KS×10 schafft, stürzt und bleibt liegen.", {"resist": "BE + Akrobatik gegen KS×10"}),
    "Kühlschrank": ("Kühlt ein Objekt für KS×12 Stunden (Konservierung).", {}),
    "Linderung": ("Blutungen stoppen, Schmerzen gelindert: Wundmali −KS×2 W; kann nicht verbluten.", {}),
    "Nebel": ("Kalter Nebel KS×10 m Radius: optische Wahrnehmung ohne Thermalsicht −KS W.", {}),
    "Schockfrost": ("Unterkühlung: KS×5 Kälteschaden je KR an allen Zonen, weitere Unterkühlungen addieren sich.", {"damageMult": 5, "allZones": True}),
    "Sub Zero": ("Schockgefrieren: KS×5 Kälteschaden, jede KR addiert sich der Schaden der Vorrunde (steigt unbegrenzt).", {"damageMult": 5}),
    # Elektrokinese
    "Aufladen": ("Lädt kleine Geräte mit KS Micro-ZEUS je Spielrunde (ab KS 5: KS−4 ZEUS). Kostet 1 Adrenalin.", {}),
    "EMP": ("Impuls im Radius KS×2 m: KS EMP-Schaden, ungeschützte Geräte werden zerstört.", {}),
    "Energie kontrollieren": ("Kontrolliert Ströme im Radius KS×2 m: unterbrechen, umleiten, verstärken.", {}),
    "Energiegespür": ("Nimmt Ströme und Magnetfelder im Radius KS×2 m wahr.", {}),
    "Flashlight": ("Greller Blitz: Schaden WA(Sehen)+KS×10 an der Augen-Zone aller im Sichtfeld.", {}),
    "Kettenblitz": ("KS×10 Schaden an allen Zonen, springt auf KS weitere Ziele (max. 10 m). Ignoriert Rüstung.", {"damageMult": 10, "allZones": True, "pierce": "all"}),
    "Lightning Web": ("Blitznetz KS×2 m um den Zielort: bewegungsunfähig ohne KO gegen KS×10; Befreiung kostet eine Aktion.", {"resist": "Konstitution gegen KS×10"}),
    "Nova": ("Welle KS×10 m um den Charakter: KS×80 Schaden an allen Zonen und KS×2 EMP. Ignoriert Rüstung.", {"damageMult": 80, "allZones": True, "pierce": "all"}),
    "Plasmapeitsche": ("KS m lange Plasmapeitsche (Nahkampfwaffe): +KS W Angriff, Schaden ST+KS×5 Hitze.",
                      {"weapon": {"name": "Plasmapeitsche", "count": 1, "attackDice": "KS", "parryDice": "", "strength": True, "damage": "KS*5", "damageType": "hitze"}}),
    "Plasmaschneider": ("Kleine Plasmaflamme bei direktem Kontakt: KS×5 Hitze, addiert sich jede KR.", {"damageMult": 5}),
    "Schockberührung": ("+KS×5 Schaden im Nahkampf oder mit Nahkampfwaffen.", {}),
    "Stun": ("Ziel KS KR handlungsunfähig. Widerstand: Willenskraft gegen KS×15.", {"resist": "Willenskraft gegen KS×15"}),
    "Supraleiter": ("Ziel erleidet bei jedem Elektroschaden zusätzlich KS×10.", {}),
    "Überlastung": ("Ziel erleidet KS×2 EMP-Schaden.", {}),
    "Unwetter": ("Gewitter: ab nächster KR jede KR KS Blitze à KS×15 Schaden (ignoriert Rüstung), frei verteilbar.", {"damageMult": 15, "pierce": "all"}),
    # Haimakinese
    "Adamant": ("Aus KS×10 l sichtbarem Blut entsteht KS l Adamant (Stabilität 50 MK:C).", {}),
    "Abschirmung": ("Haimakinese-Apps bis KS wirken nicht auf den Charakter.", {}),
    "Aderlass": ("Zieht Blut: KS×5 Schaden, ignoriert Rüstung (versiegelte Rüstung hält das Blut). Blut steht für andere Apps bereit.", {"damageMult": 5, "pierce": "all"}),
    "Blutheilung": ("Überträgt KS×15 Schaden vom berührten Ziel auf sich (heilt dieses, Körperteile wachsen aus Blut nach).", {}),
    "Blutkristalle": ("Sichtbares Blut wird zu Geschossen: Angriffswurf KS×5, Schaden KS×10.", {"damageMult": 10}),
    "Blutschweiß": ("Blut tritt aus allen Poren: KS×120 Schaden an allen Zonen, gegen den keine Rüstung hilft.", {"damageMult": 120, "allZones": True, "pierce": "all"}),
    "Blutfilter": ("Blut filtert die Atemluft des Ziels: Infektionsresistenz +KS W.", {}),
    "Blutwaffe": ("Bis zu zwei 1-m-Waffen aus Blut (Waffenkampf): +2W Angriff und Parade, Schaden ST+KS×15.",
                  {"weapon": {"name": "Blutwaffe", "count": 2, "attackDice": "2", "parryDice": "2", "strength": True, "damage": "KS*15", "damageType": "klinge"}}),
    "Kontrolle": ("Steuert blutgefüllte Körperteile wie eine Marionette (Attribute des Ziels, Fertigkeiten des Wirkers). Widerstand: KO gegen KS×5, jede Runde erneut.", {"resist": "Konstitution gegen KS×5"}),
    "Modellierung": ("Feine Adamant-Strukturen (KS×0,1 l aus KS l Blut, Stabilität 25 MK:C), per Kunst +KS W geformt; +KS W auf Crafting.", {}),
    "Restore": ("Stellt KS Nutzungen Adrenalin wieder her.", {}),
    "Siedepunkt": ("Blut erhitzt sich: KS×5 Schaden an allen Zonen, addiert sich jede KR, ignoriert Rüstung.", {"damageMult": 5, "allZones": True, "pierce": "all"}),
    "Sudden Death": ("Herzstillstand: jede KR −1W auf alles; KO ≤ 0 → ohnmächtig, nach 2 Min. −20 Organismus je Minute. Widerstand: KO gegen KS×10.", {"resist": "Konstitution gegen KS×10"}),
    "Überdruck": ("Bluthochdruck: alle Sinne außer Tasten −KS W.", {}),
    "Verhärtung": ("Blut verhärtet bei Treffern: +KS W auf Schadenswiderstand (nicht gegen Hitze/Kälte).", {}),
    # Morphokinese
    "Analyse": ("Analysiert ein nicht-biologisches Ziel (max. Würfel KS m), speichert es im Unterbewusstsein; 10−KS KR handlungsunfähig mit Kontakt.", {}),
    "Balance": ("Nahkampfwaffe wird handlicher: +KS W Angriff und Parade.", {}),
    "Desintegration": ("Löst das Ziel auf: KS×10 Schaden an allen Zonen (analysiert: KS×15).", {"damageMult": 10, "allZones": True}),
    "Entwaffnen": ("Waffen im Radius KS×5 m werden extrem schwer: Stemmen gegen KS×10, um sie zu nutzen.", {"resist": "Stemmen gegen KS×10"}),
    "Exiguus": ("Analysiertes Ziel schrumpft auf Hosentaschengröße; beim Beenden dehnt es sich mit KS×50 Stärke aus.", {}),
    "Gulliver": ("Analysiertes Ziel wächst auf das KS×2-fache; Ausdehnung mit KS×50 Stärke.", {}),
    "Marry Bag": ("Gegenstand fasst KS mit Exiguus verkleinerte Objekte und hält Exiguus aufrecht.", {}),
    "Morphen": ("Verformt Objekte (max. Würfel KS m) beliebig bei gleicher Dichte; +KS W auf Crafting mit dem Material.", {}),
    "Phasenverschiebung": ("Tunnelt mit Ausrüstung durch Masse; Bewegung WI×KS m/KR; gehalten unsichtbar. Defensivaktion (Ausweichen).", {}),
    "Schwerpunkt": ("Nahkampfwaffe mit mehr Wucht: +KS×10 Bonusschaden (analysiert: KS×15).", {}),
    "Sticky": ("Verklebt zwei nicht-biologische Oberflächen mit KS×5 Stärke (analysiert ×10, beide ×20).", {}),
    "Superposition": ("Verschwindet und erscheint an einem Ort in KS m; gehalten unsichtbar, voll wahrnehmend. Defensivaktion (Ausweichen).", {}),
    "Transformation": ("Wandelt ein analysiertes Objekt in ein anderes (max. KS l, Analysen max. KS Min. alt); KS Psyche Verlust, KS Minuten handlungsunfähig.", {}),
    "Verdichtung": ("Rüstung des Ziels +KS×5 MK:B (analysiert: KS×10).", {}),
    "Wuchtgeschoss": ("Geschosse einer Feuerwaffe verursachen +KS×10 Bonusschaden, solange gehalten.", {}),
    # Photokinese
    "Abbild": ("Erzeugt KS steuerbare optische Kopien eines Ziels.", {}),
    "Angel Face": ("+KS×2 W auf Inspirieren.", {}),
    "Blenden": ("Lichtblitz vor den Augen: blind für WA-Stufe KR (Blitzkompensation halbiert). Widerstand: KO gegen KS×10.", {"resist": "Konstitution gegen KS×10"}),
    "Darkness": ("Erzeugt einen humanoiden Schatten mit Attributen KS×2, Nachtsicht, Krallen, scharfen Zähnen (doppelter Licht-/Hitzeschaden). KS Psyche Verlust.", {}),
    "Devil Face": ("+KS×2 W auf Einschüchtern.", {}),
    "Endoskopal-Sicht": ("Sieht im Radius KS×2 m um Objekte herum (Schlüssellöcher, Ecken).", {}),
    "Filter": ("Im Radius KS×5 m werden Photokinese-Effekte verhindert, Schatten verdrängt; UV wirkt nicht.", {}),
    "Laser": ("Laserstrahl: KS×15 Hitzeschaden.", {"damageMult": 15}),
    "Leuchten": ("Bewegliche Lichtkugel mit KS×2 m Radius (oder der eigene Körper leuchtet).", {}),
    "Lichtscherben": ("Lichtscherben: Angriffswurf KS×10, Treffer KS×10 Schaden, ignoriert MK:A.", {"damageMult": 10, "pierce": "A"}),
    "Lichtsalve": ("Lichtsalve: Angriffswurf KS×15, Schaden KS×100 an drei Zonen; ab KS 5 alternativ KS−3 SSP an allen Zonen.", {"damageMult": 100}),
    "Lichtwaffe": ("Zweihändige Lichtwaffe (Waffenkampf): +4W Angriff und Parade, Schaden KS×30.",
                   {"weapon": {"name": "Lichtwaffe", "count": 1, "attackDice": "4", "parryDice": "4", "strength": False, "damage": "KS*30", "damageType": "hitze", "twoHanded": True}}),
    "Redshift": ("KS Ziele erhalten Nachtsicht und Thermalsicht.", {}),
    "Unsichtbarkeit": ("Unsichtbar für optische Wahrnehmung; Spuren nur mit Wahrnehmung (Sehen) über KS×10. Lichtschaden halbiert.", {}),
    "Parallaxenfehler": ("Ziel verschwimmt: optisch gezielte Angriffe dagegen −KS W. Defensivaktion (Ausweichen).", {}),
    # Psychokinese
    "Dominanz": ("Zwingt das Ziel zu einer Handlung (ab KS 5 auch selbstschädigend). Widerstand: Willenskraft gegen KS×10, gehalten jede Runde.", {"resist": "Willenskraft gegen KS×10"}),
    "Gedankenschlag": ("KS×5 Schaden am Kopf, ignoriert Rüstung.", {"damageMult": 5, "pierce": "all"}),
    "Gehirnwäsche": ("Verändert Erinnerungen dauerhaft (nur Rekonfiguration hilft; KS notieren). Widerstand: Willenskraft gegen KS×15.", {"resist": "Willenskraft gegen KS×15"}),
    "Genesung": ("Für 2 EP werden KS Punkte Psyche wiederhergestellt; ab KS 4 auch bei willigem Ziel.", {}),
    "Hirnsturz": ("Alle im Radius KS×10 m werden KS Minuten ohnmächtig. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Illusion": ("Multisensorische Illusion für das Ziel, solange gehalten. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Kerker": ("Ziel wird für KS×2 Stunden eine willenlose Hülle. Widerstand: Willenskraft gegen KS×15.", {"resist": "Willenskraft gegen KS×15"}),
    "Langstrecken-Telepathie": ("Telepathie mit bekannter Person in KS×10 km: Gedanken lesen und senden. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Mentale Imprägnierung": ("Ziel ist immun gegen Psychokinese bis zur gleichen KS, solange gehalten.", {}),
    "Orgasmus": ("Glücksgefühle: −KS W auf alle Aktionen; erreicht der Malus WI, handlungsunfähig. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Rekonfiguration": ("Erkennt Gehirnwäschen (KS 1) und behebt sie mit mindestens gleicher KS.", {}),
    "Schmerzresistenz": ("Ziel erhält +KS Stufen Schmerztoleranz, solange gehalten.", {}),
    "Telepathie": ("Gedanken des Ziels lesen und eigene senden. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Versklaven": ("Permanente Dominanz (ab KS 4 selbstschädigend möglich); Wirker verliert 5 Psyche. Widerstand: Willenskraft gegen KS×15.", {"resist": "Willenskraft gegen KS×15"}),
    "Willen brechen": ("Schmerzen ohne Spuren: Ziel mit Schmerztoleranz ≤ KS×2 beantwortet jede Frage wahrheitsgemäß (5 Minuten).", {}),
    # Pyrokinese
    "Absorption": ("Schöpft Kraft aus nahem Feuer: nächste Pyrokinese-App +KS KS (max. KS Stunden gespeichert).", {}),
    "Aufkochen": ("Ziel wird aufgeheizt: jede KR KS×5 Hitzeschaden an allen Zonen, ignoriert Rüstung.", {"damageMult": 5, "allZones": True, "pierce": "all"}),
    "Brandgeschoss": ("Fernkampfangriffe des Ziels verursachen zusätzlich KS×10 Hitzeschaden.", {}),
    "Entzünden": ("Setzt das Ziel in Brand: KS×5 Hitzeschaden je KR (MK:A ab KS 1, MK:B ab KS 4, MK:C ab KS 8).", {"damageMult": 5}),
    "Explosion": ("Explosion am Zielort, Radius KS m: KS×5 Hitzeschaden an allen Zonen.", {"damageMult": 5, "allZones": True}),
    "Feuerwalze": ("Feuerwalze KS×2 m breit, KS×10 m weit: KS×20 Hitzeschaden und Brand (KS×5/KR).", {"damageMult": 20, "allZones": True}),
    "Flammenbändiger": ("Kontrolliert Flammen im Radius KS×5 m; ein bestehendes Feuer einmalig +KS×5 Schaden.", {}),
    "Flammenhand": ("Hände, Fäuste oder Nahkampfwaffen brennen: +KS×5 Hitzeschaden.", {}),
    "Hitzeschock": ("Ziel erleidet bei jedem Schaden zusätzlich KS×5 Hitzeschaden.", {}),
    "Inferno": ("Feuersturm KS×10 m Radius: jede KR KS×100 Hitzeschaden plus Brand (KS×5) – insgesamt KS×105 je KR.", {"damageMult": 105, "allZones": True}),
    "Kauterisieren": ("Kauterisiert eine frische Wunde (2 KR): KS Hitzeschaden ohne Widerstand, dafür +KS W auf Infektionsresistenz dieser Wunde.", {}),
    "Lavafalle": ("Lavafläche KS m Radius: KS×15 Hitzeschaden, BE −3W (≤ 0: bewegungsunfähig).", {"damageMult": 15, "allZones": True}),
    "Rauchbombe": ("Thermischer Rauch KS×5 m: optische Wahrnehmung −KS×2 W.", {}),
    "Schmelzen": ("Ziel schmilzt: KS×10 Hitzeschaden, addiert sich jede KR.", {"damageMult": 10}),
    "Wärmeausgleich": ("Hebt im Radius KS×5 m alle Kälteeffekte auf.", {}),
    # Technokinese
    "Absturz": ("Berührtes Gerät schaltet ab (ab KS 3 auf Sicht); Computer fahren nach Ende wieder hoch. Nicht TS V/KI.", {}),
    "Blueprint": ("Zerlegt ein Gerät gedanklich: +KS×2 W auf eine Crafting-Probe zum Nachbau (24 h).", {}),
    "Befehl": ("Zwingt ein Gerät ohne Projektion zu einer Handlung: KS 1 Spielzeug, 2 Fahrzeug, 3 Drohne/SmartCom, 4 Robotik, 5 gesichert, 6 KI/Kampfroboter.", {}),
    "DarkNet": ("Verschlüsselt eigene Übertragungen: Computer-Probe +KS×2 W.", {}),
    "Decoder": ("Entschlüsselt Daten: Computer gegen Verschlüsselung +KS×2 W.", {}),
    "Exuvien": ("Transferiert eine Neuralprojektion in einen Computer/robotischen Körper ohne Projektion; kostet 10−KS Psyche.", {}),
    "Hacken": ("Bedient ein Gerät mit Computer ohne Eingabe; Computer-Proben +KS.", {}),
    "Highjack": ("Übernimmt robotische Implantate/Teile in KS Zonen des Ziels (Attribute des Ziels, Fertigkeiten des Wirkers).", {}),
    "Quellcode": ("Kopiert eine Neuralprojektion als Quellcode auf ein Medium; kostet 5−KS Psyche.", {}),
    "Memory": ("Speichert Daten KS Tage im Unterbewusstsein.", {}),
    "Reciever": ("Empfängt Datenübertragungen bis Datenniveau KS.", {}),
    "Störsignal": ("Störsender mit Abschirmniveau KS im Radius KS×25 m.", {}),
    "Techzombie": ("Nicht-biologisches Ziel erhält tierische Intelligenz und Attribute KS+2; danach KS Minuten handlungsunfähig.", {}),
    "Troubleshooter": ("Erkennt Defekte an Geräten bis Technologiestufe KS.", {}),
    "YouNet": ("Sendet Datenübertragungen (DN KS) im Radius KS×10 km, auch Livestream der Sinne.", {}),
    # Telekinese
    "Anheben": ("Lässt ein Ziel bis KS×100 kg schweben. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Druckwelle": ("Alles im Radius KS×10 m erleidet KS×5 Schaden.", {"damageMult": 5, "allZones": True}),
    "Erweitertes Anheben": ("Lässt ein Ziel bis KS×5 Tonnen schweben. Widerstand: Willenskraft gegen KS×10.", {"resist": "Willenskraft gegen KS×10"}),
    "Fixierung": ("Hält ein Ziel mit KS×10 Stärke fest; Befreiung per Stärke (weitere Versuche kosten Aktionen).", {"resist": "Stärke gegen KS×10"}),
    "Geisterhände": ("Unsichtbare Hände mit Attributen KS, eine kostenlose Aktion je KR.", {}),
    "Geschmeidiges Exoskelett": ("+KS W auf Beweglichkeit.", {}),
    "Kinetischer Sturm": ("Wirbelnde Objekte im Radius KS×5 m: KS×30 Schaden jede KR, solange gehalten.", {"damageMult": 30, "allZones": True}),
    "Power Exoskelett": ("+KS W auf Stärke.", {}),
    "Rüstung": ("Unsichtbare Rüstung mit KS×5 Punkten MK:A.", {}),
    "Schlag": ("Wuchtschlag: KS×10 Schaden, ignoriert MK:A.", {"damageMult": 10, "pierce": "A"}),
    "Schleudern": ("Schleudert ein menschengroßes Ziel auf ein anderes: je KS×10 Schaden, Angriffswurf KS×10.", {"damageMult": 10, "resist": "Willenskraft gegen KS×10"}),
    "Schockwelle": ("90°-Kegel KS×5 m: KS×10 Schaden.", {"damageMult": 10, "allZones": True}),
    "Schutzschild": ("Unsichtbarer Schild mit KS×20 MK:C. Defensivaktion (Block).", {"hold": 3}),
    "Stop": ("Hält ein Ziel (max. Würfel KS m) augenblicklich an; Aufprallschaden für alles, was dagegen prallt. Defensivaktion (Block).", {}),
    "Zerquetschen": ("KS×100 Schaden an allen Zonen; ab KS 5 alternativ KS−3 SSP.", {"damageMult": 100, "allZones": True}),
}

DIFF_KEYS = {"leicht": "leicht", "mittel": "mittel", "schwer": "schwer", "sehr schwer": "sehrSchwer", "ultimativ": "ultimativ"}


HMO_POWERS = [
    ("Bloodwalker", "Voraussetzung: Abnormität „Demigod“. Blut perlt auf Wunsch von Körper und Kleidung ab; über nicht getrocknetes Blut kann man gehen, ohne einzusinken."),
    ("Blutlust", "Der Charakter kann fünf Blutpunkte aufnehmen bzw. sein Maximum an Blutpunkten steigt um fünf."),
    ("Brutale Ignoranz", "1 Blutpunkt: zehn Minuten keinen Schmerz – Schmerztoleranz zählt als Stufe 10."),
    ("Charme", "Charisma temporär +2 Stufen."),
    ("Dunkler Balsam", "1 Blutpunkt (max. einer je KR, keine Aktion): sofort 30 TP regeneriert, Brüche heilen, Gliedmaßen wachsen nach. Verdrängt Robotik der betroffenen Zone."),
    ("Gabe der Gewalt", "Stärke temporär +2 Stufen."),
    ("Maskerade", "Wirkt harmlos und vertraut; als bestimmte Person ausgeben: Schauspiel gegen Willenskraft des Ziels. Mit Mentale Sklaverei kombinierbar."),
    ("Mentale Sklaverei", "Ziele haben −3W auf Willenskraft, wenn sie sich dem Wirker widersetzen (z. B. gegen Einschüchtern oder Überreden)."),
    ("Schleier der Hast", "Beweglichkeit temporär +2 Stufen."),
    ("Schwarzes Orakel", "Wahrnehmung temporär +2 Stufen."),
    ("Unaufhaltsamer Schatten", "Haftet an allen Oberflächen (kein Klettern nötig, Rennen −2W für die Geschwindigkeit); Sturzhöhe für Schaden −50 m × Wissen."),
    ("Unheilige Beständigkeit", "Trefferpunkte jeder Körperzone +20 (Robotik ausgenommen)."),
]


def powers():
    out = []
    for key, (name, tier, desc, show, page, folder) in POWERS.items():
        out.append({"name": name, "type": "psiPower", "img": icon(folder, ""),
                    "system": {"key": key, "value": 1, "free": 0, "show": show,
                               "description": p(f"{desc} Hierarchieebene {tier}. Show-Effekt: {show} Erschaffung 5 GP je Stufe (max. 6), Steigern: neue Stufe × 4 EP. Je Stufe eine App.", page)}})
    for name, desc in HMO_POWERS:
        out.append({"name": name, "type": "psiPower", "img": icon("magic/unholy", ""),
                    "system": {"key": "kategorieB", "value": 1, "free": 0, "show": "",
                               "description": p(f"PSI-Kraft der Kategorie B (HMO). {desc} Kräfte dieser Kategorie wirken nach einmaliger Aktivierung automatisch (auch im Schlaf); gleichzeitig aktiv: Stufe in Wissen. iHMO erhalten „Unaufhaltsamer Schatten“, gHMO wählen eine Kraft frei; weitere 7 GP bei Erschaffung bzw. 15 EP.", 215)}})
    return out


def apps(parsed_path):
    data = json.load(open(parsed_path, encoding="utf-8"))
    out = []
    seen = set()
    for a in data:
        name = a["name"]
        if name in seen or name not in E:
            continue
        seen.add(name)
        eff, extra = E[name]
        key = POWER_KEYS[a["power"]]
        diff = DIFF_KEYS[a["diff"]]
        hold = extra.get("hold", a["hold"])
        defensive = a.get("defensive") or "Defensivaktion" in eff
        folder = POWERS[key][5]
        out.append({"name": name, "type": "psiApp", "img": icon(folder, ""),
                    "system": {"power": key, "difficulty": diff, "min": a["min"], "max": a["max"], "hold": hold, "held": False,
                               "defensive": bool(defensive), "actions": 1 if name in ("Teleport", "Zweite Chance") else 2,
                               "resist": extra.get("resist", ""), "effect": eff,
                               "weapon": {"name": "", "count": 0, "attackDice": "", "parryDice": "", "strength": True, "damage": "", "damageType": "wucht", "twoHanded": False, **extra.get("weapon", {})},
                               "damageMult": extra.get("damageMult", 0), "allZones": extra.get("allZones", False), "pierce": extra.get("pierce", ""),
                               "description": p(f"{POWERS[key][0]} · {a['diff']} ({a['min']}–{a['max']})" + (f" · Haltung {hold}" if hold else ""), POWERS[key][4])}})
    missing = sorted(set(E) - seen)
    return out, missing
