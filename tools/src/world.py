# -*- coding: utf-8 -*-
"""Krankheiten (S. 40–45) und Flora (S. 20–22) als Compendium-Quellen. Eigene Kurzfassungen, keine Buchtexte."""
from .common import p


def disease(name, page, cls, transmission, vector, incubation, duration, cure, ident, intensity, desc, rules, malus=0,
            inc_days=0, step_days=0, step_org="", step_psy="", step_dmg=0, intensity_alt=0):
    ds = p(desc, page) + (f"<p><strong>Regeln:</strong> {rules}</p>" if rules else "")
    return {"name": name, "type": "disease", "img": "icons/svg/biohazard.svg",
            "system": {"classification": cls, "transmission": transmission, "vector": vector, "incubation": incubation,
                       "duration": duration, "cure": cure, "identification": ident, "intensity": intensity,
                       "intensityAlt": intensity_alt, "malusDice": malus, "incubationDays": inc_days, "stepDays": step_days, "stepOrganismus": step_org,
                       "stepPsyche": step_psy, "stepDamage": step_dmg, "active": False, "days": 0, "description": ds}}


def diseases():
    D = []
    D.append(disease("Fleischrost", 40, "Lebensgefahr", "Luft, kurze Distanz", "infizierte Personen", "ca. 1–2 Stunden", "bis zur Heilung",
                     "Bemustarol (Tablette alle 24 h) und Ergobormin (Salbe)", 10, 4,
                     "Hautkrankheit, die sich über die Atemwege überträgt, durch Verstrahlung und schlechte Hygiene begünstigt wird und sich zonenweise ausbreitet.",
                     "Alle 2 Tage wird eine Körperzone ausgewürfelt und erleidet dauerhaft 9 Schaden. Wird dieselbe Zone ein zweites Mal getroffen, erhält sie dauerhaft 18 Schaden, beim dritten Mal stirbt sie ab (Grad III). An den Zonen 2, 6, 7, 8 und 12 ist Grad III tödlich. Verlauf vorrücken: Schritte alle 2 Tage; die Eskalation (18 Schaden, Abtöten) entsteht automatisch durch wiederholte Treffer derselben Zone und muss von der Spielleitung bewertet werden.",
                     step_days=2, step_dmg=9))
    D.append(disease("Flugnekrose", 41, "Lebensgefahr", "Körperflüssigkeiten", "Erkrankte, körperschädigende Situationen", "1 Tag", "bis zur Behandlung",
                     "Neopenicillin (2 Tabletten täglich, 5 Tage)", 10, 3,
                     "Ein im Körper schlummerndes Virus bricht bei geschwächtem Immunsystem aus und lässt Gewebe absterben. Identifizierung in den ersten 5 Tagen MW 20; Intensität bei Tröpfchen/Schleimhaut 6 (beim Infizieren „Alternative Intensität“ wählen).",
                     "Nach der Inkubationszeit verliert der Körper mit jedem vollen Tag 1W6 Organismus. Neopenicillin (2 Tabletten täglich, 5 Tage lang) stoppt die Ausbreitung.",
                     inc_days=1, step_days=1, step_org="1d6", intensity_alt=6))
    D.append(disease("Grippe", 42, "Lästig bis gefährlich", "Tröpfcheninfektion", "andere Infizierte", "½ bis 2 Tage", "3 Tage bis 3 Wochen",
                     "Vitalaiser", 10, 4, "Gewöhnliche Grippe mit Kopf- und Gliederschmerzen, in schweren Fällen mit hohem Fieber.",
                     "Während der Infektion gilt ein Malus von 2 Würfeln auf alle Aktionen.", malus=2))
    D.append(disease("Nemo-Virus", 42, "Tödlich", "Blut-/Speichelkontakt mit Infizierten", "Ratten, Tauben", "ca. 1–2 Stunden", "24 Stunden bis zum Tod",
                     "kein Heilmittel bekannt", 15, 9,
                     "Tödliches Virus, das Zellmembranen angreift und das Gewebe verflüssigt, beginnend bei der Muskulatur.",
                     "Der Tod tritt nach 24 Stunden ein (inkl. Inkubationszeit); nur eine Person weltweit hat es überlebt."))
    D.append(disease("Pandora-Effekt", 42, "Tödlich", "Blutkontakt mit Infizierten", "Infizierte", "ca. 45 Minuten", "lebenslang",
                     "keines", 10, 7,
                     "Seuchenzustand aus der Sperrzone New York: Infizierte verlieren Schmerzempfinden und Verstand und werden zu zombieähnlichen Kreaturen.",
                     "Ansteckungsgefahr bei Blutkontakt nahezu 100 %, Heilung bisher nahezu ausgeschlossen."))
    D.append(disease("Schneewittchen-Krankheit", 43, "Lästig bis gefährlich", "unbekannt", "unbekannt", "unbekannt", "wenige Stunden bis einige Tage",
                     "keines", 15, 99,
                     "Rätselhafte, kurzzeitige Nervenerkrankung mit unkontrollierten Schlafanfällen. Intensität unbegrenzt.",
                     "Dient der Spielleitung dazu, Charaktere vorübergehend aus dem Spiel zu nehmen; im aktiven Spiel nicht einsetzen."))
    D.append(disease("SMF-V", 43, "Lebensgefahr, Pandemiewarnung", "Einatmen sporenähnlicher Kapseln", "Ausscheidungen Infizierter", "ca. 4–8 Tage", "Lebenszeit",
                     "keines", 20, 10,
                     "Künstlich geschaffener Flechten-Virus: Der Körper verändert sich in einer Metamorphose und lebt nach dem scheinbaren Tod (Cardo) als neues Wesen weiter. Infektionen müssen dem Zentrum gemeldet werden.",
                     "Der Erkrankte hat noch so viele Tage zu leben, wie sein doppelter Konstitutionswert beträgt. Jeder angebrochene Tag gibt eine Stufe SMF-Instinkt und einen festen Punkt Infektionsresistenz, kostet aber 5 Psyche und 5 Organismus. Nach 3 Stunden entsteht „Scharfe Zähne“, nach 6 Stunden „Krallen“. Wer länger als den vierten Tag überlebt (ab dem 5. Tag), verliert 1 Stufe Wissen und Charisma und erhält +2 Stufen Schmerztoleranz. Der Verlust beginnt mit der Infektion; die Inkubationszeit (4–8 Tage) betrifft nur den Verlauf bis zu den sichtbaren Anzeichen.",
                     step_days=1, step_org="5", step_psy="5"))
    D.append(disease("Stumpf", 45, "Lästig", "nicht übertragbar", "–", "0 Tage", "2 Tage",
                     "Bantha Salbe (nach Ausbruch) oder Bantha Zäpfchen (vorher)", 10, 2,
                     "Kurzzeitiges Nerventrauma nach körperlichen Schäden, das eine zufällige Körperzone taub macht.",
                     "Die ausgewürfelte biologische Körperzone erhält für die Dauer eine Schmerztoleranz von 10 und Geschicklichkeit −1 (nur für diese Zone). Es wird nur einmal pro Stunde geprüft, ob Stumpf ausbricht."))
    D.append(disease("Yesterday-Grippe", 45, "Gefährlich", "Einatmen, Tröpfchen", "Erkrankte", "etwa 1 Tag", "etwa 10 Tage",
                     "Zerebrios B6", 15, 3,
                     "Infektiöse Form der sekundären Demenz mit Gedächtnisverlust. Auch Symptomlose können Überträger sein.",
                     "Nach bestandener Infektionsprobe folgt eine weitere Probe gegen Intensität +3; bei Misserfolg ist man 10 Tage unwissentlich Überträger ohne Mali. Bei Infektion ein temporärer Maluswürfel auf Wissen (nur auf dieses Attribut, manuell eintragen); am 5. Tag eine weitere Probe gegen die Intensität, bei Misserfolg 2 Maluswürfel. Sinkt Wissen auf 0, folgt ein katatonischer Zustand bis zum Ende der Krankheit."))
    return D


def flora_item(name, page, region, effect, desc, price=0, unit=""):
    return {"name": name, "type": "flora", "img": "icons/svg/pawprint.svg",
            "system": {"region": region, "price": price, "priceUnit": unit, "effect": effect, "description": p(desc, page)}}


def flora():
    F = []
    F.append(flora_item("Asphaltpilze", 20, "F.A.L., weite Teile Eurasiens", "Ungewaschen verzehrt Überträger von Flugnekrose und Fleischrost.",
                        "Kleine schwarz-graue Pilze, die auf Beton wachsen. In Ruinenstädten beliebte Zutat für Suppen."))
    F.append(flora_item("Bohrkäferpilz", 20, "urbane Gebiete", "Macht Stein und Beton porös; Gebäude nach etwa einem halben Jahr einsturzgefährdet. Fungizide helfen.",
                        "Sporenpilz, der Bausubstanz zersetzt."))
    F.append(flora_item("Eisenrinde", 20, "Götterfall", "Verarbeitet Stabilität 25 MK:B. Mad Suit: 3 kg Eisenrinde, Rüstungsteil 25p MK:B, Komfort 4, 110 N$ je Körperzone.",
                        "Baum mit stahlartig stabiler, nachwachsender Rinde; wird ähnlich wie Metall verarbeitet.", 5, "N$ je kg"))
    F.append(flora_item("Fettalgen", 21, "Küsten toxischer Gewässer", "Fleischfressend: bis zu 2 m lange Fangfäden, ritzen Oberflächen auf und legen sie dem Säurewasser frei.",
                        "Säureresistentes Moos auf und unter Wasser, das Beute fängt."))
    F.append(flora_item("Feuerblatt", 21, "Sand- und Steinwüsten", "Nesselgift. Adivasi (Giftresistenz 1) spüren kaum etwas; sonst Brennen für Stunden ohne Wertänderung, Grollhornmilch lindert.",
                        "Anspruchsloser Wüstenbusch mit Brennnessel-Blättern; Grollhörner werden davon berauscht."))
    F.append(flora_item("Rankenefeu", 21, "Dschungel, Eurasien, S.P.L.", "Reißfestigkeit 40 Punkte MK:A, sonstige Stabilität 25 MK:[A].",
                        "Sehr reißfeste Rankenpflanze, die Eingeborene für Handwerk nutzen."))
    F.append(flora_item("Psynoperus", 21, "Eurasien, Republik 13, teils S.P.L.", "Sporen mit Intensität 7, Reichweite meist unter 4 m; Infizierte suchen dunkle, feuchte Orte und verhungern. Starke Hitze entfernt die Sporen.",
                        "Leuchtender, faustgroßer Porling, dessen Sporen Appetit und Wahrnehmung beeinflussen."))
    F.append(flora_item("Sirkohra-Pflanze", 21, "Götterfall", "Halluzinogen für etwa 1 Stunde je Dosis. Überdosis ab mehr als 30 g in einer Stunde: Organismus −1 je weitere angefangene 10 g.",
                        "Moosartige, weiß beflaumte Pflanze; wird aufgekocht oder geraucht.", 25, "N$ je 10 g"))
    F.append(flora_item("Smródpiz", 22, "südliches Eurasien, Götterfall, Republik 13", "Alkoholreicher Pilz; Verzehr kann zur Alkoholvergiftung führen.",
                        "Stark nach Alkohol riechender brauner Pilz, der Fruchtreste einlagert."))
    F.append(flora_item("Steppengras", 22, "sehr warme oder verstrahlte Regionen, vor allem F.A.L.", "Tiere brechen es auf, um an den nahrhaften Saft zu kommen.",
                        "Trockene, blattlose Buschpflanze mit sehr tiefen Wurzeln."))
    F.append(flora_item("Schattenaegis", 22, "weltweit extrem selten", "Als Tee: +25 Organismus, heilt Vergiftungen, stellt über 3 Stunden alle Trefferpunkte wieder her; Körperteile wachsen nach (robotische Einbauten werden abgestoßen).",
                        "Seltene tiefblaue Sternblume mit starker Heilwirkung; wächst bei etwa 19 °C an frischen Wasserquellen.", 150000, "N$ je Blüte (Schwarzmarkt)"))
    F.append(flora_item("Stinkkaktus", 22, "warme Regionen weltweit", "Stacheln mit Kontaktgift: 3 Giftschaden je Kampfrunde für 2 Kampfrunden (Giftresistenz −1 je Runde). Fleisch nahrhaft, aber übelriechend.",
                        "Bis zu 4 m hoher Kaktus mit essbaren Blüten und saftigem Fleisch."))
    return F
