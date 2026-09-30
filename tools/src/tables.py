# -*- coding: utf-8 -*-
"""Rolltables und Regel-Journal (eigene Zusammenfassungen der NoReturn-2E-Regeln)."""

ZONES = {12: "Kopf", 11: "Bein unten links", 10: "Oberschenkel links", 9: "Arm links", 8: "Torso links", 7: "Rumpf",
         6: "Torso rechts", 5: "Arm rechts", 4: "Oberschenkel rechts", 3: "Bein unten rechts", 2: "Becken"}

PSI_FAIL = {
    2: "Echo: KS-mal erneut auf dieser Tabelle würfeln, alle Ergebnisse gelten nacheinander.",
    3: "Der eigene Arsch: Der Charakter wird selbst Ziel der App (bei Overload neu würfeln).",
    4: "Weit gefehlt: KS zufällige andere Ziele werden auf KS 1 betroffen (bei Overload neu würfeln).",
    5: "Fremde Welt: KS×2 KR Tagtraum, handlungsunfähig. Die App wirkt nicht.",
    6: "Lähmende Gedanken: KS Runden handlungsunfähig, nimmt aber alles wahr. Die App wirkt nicht.",
    7: "BÄM: KS×2 m geschleudert, KS×5 Schaden an zwei zufälligen Zonen. Die App wirkt nicht.",
    8: "Psionische Lähmung: KS Runden keine PSI, gehaltene Apps enden. Die App wirkt nicht.",
    9: "Schmerz: KS×10 Schaden am Kopf. Die App wirkt nicht.",
    10: "Seelische Narbe: −KS Psyche. Die App wirkt nicht.",
    11: "Bleibende Schäden: −KS Organismus. Die App wirkt nicht.",
    12: "Weißes Licht: Charakter und alles im Radius KS×2 m erleidet KS×30 Schaden an allen Zonen. Die App wirkt nicht."
}


def result(text, lo, hi, weight=1):
    return {"type": "text", "name": text.split(":")[0], "description": text, "weight": weight, "range": [lo, hi], "drawn": False}


def rolltables():
    T = []
    T.append({"name": "Trefferzonen (2W6)", "img": "icons/svg/target.svg", "formula": "2d6",
              "description": "<p>Zufällige Körperzone (S. 90–91). Letal: 12, 8, 7, 6, 2.</p>",
              "results": [result(f"{k}: {v}" + (" (letal)" if k in (12, 8, 7, 6, 2) else ""), k, k) for k, v in sorted(ZONES.items())]})
    T.append({"name": "PSI-Fehlschlag (2W6)", "img": "icons/svg/explosion.svg", "formula": "2d6",
              "description": "<p>Psionischer Fehlschlag (S. 196). KS = gesammelte bzw. gewirkte Kraftstufe.</p>",
              "results": [result(f"{k} – {v}", k, k) for k, v in PSI_FAIL.items()]})
    T.append({"name": "Degeneration – Tabelle A (W6)", "img": "icons/svg/degen.svg", "formula": "1d6",
              "description": "<p>Organismus-Schwellen (S. 115).</p>",
              "results": [result("Immunsystemschwäche: −2 Infektionsresistenz (max. 3×)", 1, 2),
                          result("Entstellt: Charisma +1 Stufe Leiden (max. 3×)", 3, 4),
                          result("Chronische Wunden: zwei zufällige Zonen erhalten 5 dauerhaften Schaden", 5, 6)]})
    T.append({"name": "Degeneration – Tabelle B (W6)", "img": "icons/svg/degen.svg", "formula": "1d6",
              "description": "<p>Organismus-Schwellen (S. 115).</p>",
              "results": [result("Erschöpfung: Konstitution +1 Stufe Leiden", 1, 1), result("Zittern und Krämpfe: Geschick +1 Stufe Leiden", 2, 2),
                          result("Wahrnehmungsstörung: Wahrnehmung +1 Stufe Leiden", 3, 3), result("Lähmung: Beweglichkeit +1 Stufe Leiden", 4, 4),
                          result("Muskelschwäche: Stärke +1 Stufe Leiden", 5, 5), result("Demenz: Wissen +1 Stufe Leiden", 6, 6)]})
    T.append({"name": "Butterfly Effect – roter W6", "img": "icons/svg/wing.svg", "formula": "1d6",
              "description": "<p>Begabung (S. 130). Pasch 1–4: alternativ Copy Cat; Pasch 5–6: Skill Master.</p>",
              "results": [result(t, i, i) for i, t in enumerate(["Artisan: Basteln, Schauspiel, Kunst", "Athlete: Akrobatik, Klettern, Rennen, Springen, Stemmen",
                                                                  "Craftsman: Feuerwaffenbau, Mechanik, Rüstungsbau, Waffenbau", "Leader: Ausdauer, Einschüchtern, Inspirieren, Willenskraft",
                                                                  "Marksman: Projektilwaffen, Schießen, Wurfwaffen", "Medic: Medizin, Naturkunde, Spezies"], 1)]})
    T.append({"name": "Butterfly Effect – weißer W6", "img": "icons/svg/wing.svg", "formula": "1d6",
              "description": "<p>Begabung (S. 130).</p>",
              "results": [result(t, i, i) for i, t in enumerate(["Operator: Bodenfahrzeuge, Fluggeräte, Reiten, Wasserfahrzeuge", "Rogue: Gassenwissen, Saufen, Taschendiebstahl",
                                                                  "Scholar: Astronomie, Chemie, Schätzen, Sagen & Mythen", "Scout: Heimlichkeit, Nachforschen, Orientierung",
                                                                  "Trickster: Menschenkenntnis, Überreden, Verhandeln", "Warrior: Ausweichen, Blocken, Nahkampf, Waffenkampf"], 1)]})
    return T


def ul(*items):
    return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def table(rows, head=None):
    h = "<tr>" + "".join(f"<th>{c}</th>" for c in head) + "</tr>" if head else ""
    return "<table>" + h + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</table>"


def journal():
    pages = []
    pages.append(("Das System benutzen", f"""
<h2>NoReturn 2E in Foundry</h2>
<p>Dieses System setzt die Vario-D6-2.0-Regeln um. Es ist ein inoffizielles Fan-Werkzeug und ersetzt nicht das Corebook von Mannifest Games – die Compendien enthalten Werte und Kurzfassungen mit Seitenverweisen.</p>
<h3>Charakterbogen</h3>
{ul("<strong>Werte</strong>: Attribute (Klick = Probe), Leiden-Stufen, Sonderattribute, alle Fertigkeiten mit Würfelpool, besondere Fertigkeiten und Sprachen. Der grüne Pfeil steigert gegen EP (Butterfly Effect und PNS werden eingerechnet).",
    "<strong>Kampf</strong>: Körperzonen-Grafik mit Schaden je Zone, Rüstung und Schadensschwelle, Waffen (Klick = Angriff), Schutzkleidung, Mali-Übersicht.",
    "<strong>PSI</strong>: Kräfte mit Stufe und zugehörigen Apps, Kraft sammeln, Haltung an/aus, Fehlschlagtabelle.",
    "<strong>Eigenschaften</strong>: Spezies, Organismus & Psyche mit Degenerationstabellen, Augmentierung, Abnormitäten, biologische Eigenschaften, Style-Skills, Vor-/Nachteile, Charaktermerkmale.",
    "<strong>Bio</strong>: Persönliche Daten, EP/JP/CP, Bekanntheit, Butterfly Effect, GP-Bilanz der Erschaffung, Hintergrund und Steckbrief.")}
<h3>Kampfablauf im Chat</h3>
{ul("Ziel(e) markieren (T), Waffe im Bogen anklicken → Angriffsdialog (Feuermodus, Zielen, Reichweite wird aus der Token-Entfernung vorgeschlagen, Munition, Auflage).",
    "Auf der Angriffskarte klickt die Besitzerin des Ziels <em>Verteidigen</em> (Ausweichen, Blocken, Parade, Akrobatik, PSI …) oder <em>Keine Verteidigung</em>. Der Malus für weitere Defensivaktionen wird automatisch gezählt und zu Rundenbeginn zurückgesetzt.",
    "Bei Treffer würfelt die Angreiferin <em>Schaden</em> (Gute Treffer als Bonuswürfel, Trefferzone automatisch).",
    "Das Ziel klickt <em>Widerstand</em>: Konstitutionsprobe + Rüstung der Zone (MK, panzerbrechend, Wucht gegen MK:A berücksichtigt), Schaden wird eingetragen.")}
<h3>Item-Modifikatoren</h3>
<p>Spezies, Abnormitäten, Eigenschaften, Vorteile, Ausrüstung und Augmentierung können unter „Modifikatoren“ Attribute, Fertigkeiten, TP, Adrenalin, Schmerztoleranz, Organismus, Psyche usw. verändern. Sie wirken automatisch (Ausrüstung nur ausgerüstet, Augmentierung nur eingebaut).</p>
<h3>Makros</h3><p>Items eines Charakters lassen sich auf die Makroleiste ziehen. Skript-API: <code>game.noreturn.rollPool({{dice: 5, mw: 15, label: "Test"}})</code>.</p>
"""))
    pages.append(("Proben & Würfel", f"""
<h2>Die Probe (S. 84–87)</h2>
{ul("Würfelanzahl = Attribut + Fertigkeit (W6 addiert). Ungeübt: nur Attribut −2W. Besondere Fertigkeiten nur ab Stufe 1.",
    "<strong>Hazard-Di</strong>: Ein Würfel jeder Probe mit Attribut/Fertigkeit ist ein Hazard-Di – eine 6 wird erneut geworfen und addiert (auch mehrfach).",
    "<strong>1-Würfel-Regel</strong>: Mali können eine Probe nie verhindern, man würfelt mindestens 1 Würfel (Ausnahme: weitere Defensivaktionen).",
    "<strong>Nachteil</strong>: je einschränkendem Umstand −2W (nie auf Schadenswiderstand).",
    "<strong>Passen</strong>: ab 6 Würfeln 2,5 Punkte je Würfel ansetzen (nicht bei PSI, SL darf ablehnen).",
    "<strong>Unterstützung</strong>: Helfer würfelt mit halbem Pool; ab 10 wird das Ergebnis addiert, darunter abgezogen.",
    "<strong>Leiden</strong> (Degeneration): separater W6 – Stufe 1 bei 1–2, Stufe 2 bei 1–4, Stufe 3 immer: Ergebnis halbiert.",
    "<strong>Adrenalin</strong>: vor der Probe Bonuswürfel in Höhe der Stufe (max. 5) oder nach der Probe Wiederholung – nie beides. Stufe = Nutzungen bis zur Rast.")}
{table([("Routiniert", 5), ("Normal", 10), ("Anspruchsvoll", 15), ("Schwer", 20), ("Sehr schwer", 25), ("Episch", 30), ("Legendär", 40)], ["Schwierigkeit", "MW"])}
"""))
    pages.append(("Kampf", f"""
<h2>Kampfrunde (S. 88–97)</h2>
{ul("Eine Kampfrunde = 3 Sekunden: zwei Aktionen plus Bewegung (BE + Rennen in m). Rennen-Probe = Meter, andere Aktionen −2W.",
    "Initiative: Wer angreift, beginnt; beim Mexican Standoff Reaktion-Proben (Foundry-Initiative nutzt den Reaktion-Pool).",
    "Defensivaktionen sind unbegrenzt, jede weitere −1W kumulativ (ohne 1-Würfel-Regel). Gleichstand gewinnt der Verteidiger.",
    "<strong>Gute Treffer</strong>: je 10 Punkte Überschuss +1 Schadenswürfel (kein Hazard-Di); Salvenmodus je 5 Punkte.",
    "Zielen (Nah/Fern): exakte Stelle −4W/−3W (Weichteile +10 Schaden), Körperzone −2W/−1W, Körperhälfte −1W/0.",
    "Fernkampf-Reichweite: Kurz MW 10, Mittel 20, Weit 30, Extrem 40 – wird der MW verfehlt, schlägt der Angriff automatisch fehl.",
    "Rückstoß − Rückstoßdämpfung (RD, +1 je 5 ST) = Maluswürfel.")}
{table([("RM", "1 Schuss, Vorbereiten kostet eine Aktion", "1"), ("HM", "1 Schuss", "1"), ("SM", "3 Schuss, +2W, Gute Treffer je 5", "3"),
        ("VM", "10 Schuss, 2 Aktionen, +2W, +30 Schaden an zwei zufälligen Zonen, kein Zielen/Gute Treffer", "10"),
        ("GM", "150 Schuss, Warmlaufen + 2 Aktionen, +2W, alle Zonen, ignoriert MK:A", "20"),
        ("SP", "Sprühen: Kegel, alle Zonen, Ziel im Nachteil beim Ausweichen", "1")], ["Modus", "Wirkung", "Rückstoß"])}
<p><strong>Parade</strong> mit Nahkampfwaffe (Waffenkampf) oder Kampfkunst (Nahkampf). <strong>Blocken</strong>: bei Erfolg trifft der Schaden das blockende Teil, ab 20 Punkten Überschuss kein Schaden; Fernkampf nur mit Schild.</p>
"""))
    pages.append(("Schaden & Heilung", f"""
<h2>Was einen nicht umbringt (S. 98–103)</h2>
{ul("Schadenswiderstand: Konstitution + Rüstungspunkte der Zone gegen den Schaden; die Differenz wird von den TP der Zone abgezogen. Nie Maluswürfel.",
    "Mensch: 30 TP je Zone; Robotik 70. Zone auf 0 → unbrauchbar. Letale Zonen (12, 8, 7, 6, 2) → meist Tod.",
    "Schadensschwelle = Schmerztoleranz × 10 % der TP: Schaden darüber gibt −2W je Zone auf alles (außer Widerstand).",
    "Erreicht der Malus Konstitution → bewusstlos (2W6 Minuten, mit Regeneration 2W6 KR); erreicht er Beweglichkeit → kann nicht gehen.",
    "Materialkategorien: MK:A (Stoff, Körper – schützt nicht gegen Wucht), MK:B (Rüstung, Fahrzeuge, Robotik), MK:C (Speziallegierungen, Militär).",
    "Nicht-letaler Schaden: je 10 durchgekommene Punkte −1W für 20 KR; MK:B oder Schmerztoleranz 10 verhindern NL.",
    "Flächeneffekte treffen alle Zonen mit einer Widerstandsprobe; Springen/Akrobatik als Defensivaktion (MW 10 je Meter).",
    "Andauernder Schaden (Feuer, Säure): zu Beginn jeder eigenen Runde erneut widerstehen, kumulativ −1W.",
    "Aufprall: 1 Schaden je m/KR; Sturz: 10 je Meter (Akrobatik reduziert).",
    "Verbluten (optional): Zone über halbe TP verloren → KO in Minuten bis zum Tod, Medizin MW 15 stoppt.",
    "Heilung: täglich KO-Stufe je Zone, mit gelungener Medizin-Probe (MW = höchster Zonenschaden) doppelt.",
    "Regeneration: Geschwindigkeit je KR aus dem Pool; Pool füllt sich nach Schlaf und zwei Mahlzeiten.",
    "Alkohol: Saufen gegen ALK-Summe (−10/Stunde); Misserfolg −1W für eine Stunde, 10 darunter ohnmächtig 2W6 h.")}
"""))
    pages.append(("PSI", f"""
<h2>PSI wirken (S. 193–196)</h2>
{ul("Die Stufe der PSI-Kraft ist ein Würfelpool (erhöhbar durch Adrenalin/Meditation/Zeitpool). Wirken kostet zwei Aktionen.",
    "Verteile den Pool: Würfel → Kraftstufen (KS), Würfel → Probe (inkl. Hazard-Di), Rest → Kompensation.",
    "Die Probe muss im Zielbereich der Schwierigkeit liegen: leicht 8–12, mittel 11–15, schwer 15–19, sehr schwer 19–22, ultimativ 23–25. Jeder Kompensationspunkt erweitert den Bereich um 1 in beide Richtungen.",
    "Kraft sammeln: Willenskraft gegen MW 20 (+10 je gesammelter KS) als Aktion; gesammelte KS gelten nur bis zur nächsten Runde und geben Maluswürfel. Misslingt es: Overload → Fehlschlag.",
    "Haltung: gehaltene Apps geben Maluswürfel in Höhe des Haltungswerts (nicht auf Widerstand).",
    "PSI-Defensivaktion: PSI-Kraft + Reaktion gegen den Angriff.",
    "Hierarchie: für eine Kraft der Ebene 2 bzw. 3 braucht man mindestens ebenso viele Kräfte auf den darunterliegenden Ebenen.")}
"""))
    pages.append(("Degeneration & Moral", f"""
<h2>Organismus & Psyche (S. 115–116)</h2>
{table([("100–76", "gesund"), ("75–66", "1× A"), ("65–36", "1× B je Schwelle"), ("35–16", "1× A und 1× B je Schwelle"), ("15–1", "2× A und 2× B je Schwelle"), ("≤ 0", "Tod")], ["Organismus", "Beim Unterschreiten würfeln"])}
{table([("100–81", "Optimale Psyche"), ("80–61", "Gesunde Psyche"), ("60–41", "Belastete Psyche"), ("40–21", "Gefährdete Psyche"), ("20–1", "Katastrophale Psyche")], ["Psyche", "Bereich"])}
<p>Beim Wechsel des Psyche-Bereichs wird ein Charaktermerkmal gegen eines des neuen Bereichs getauscht.</p>
<h2>Chaos- & Justicepoints (S. 117–118)</h2>
{ul("Die SL vergibt je Sitzung 0–3 JP (moralisch positiv) und CP (fragwürdig).", "Ein Charaktermerkmal kostet 15 Punkte; ab 30 angesammelten Punkten muss investiert werden. Maximal sechs Merkmale.", "Bei der Erschaffung drei Merkmale frei wählbar.")}
"""))
    pages.append(("Erschaffung & Steigern", f"""
<h2>Charaktererschaffung (S. 134–136)</h2>
{table([("Survival", "300 GP", "100 N$ je GP"), ("Standard", "450 GP", "1.000 N$ je GP"), ("Superior", "600 GP", "5.000 N$ je GP")], ["Powerniveau", "GP", "Ressourcen"])}
{ul("Attribute starten auf 1; Stufe 2 und 3 je 10 GP, jede weitere 20 GP. Schmerztoleranz startet mit 3.",
    "Fertigkeiten 2 GP je Stufe (max. 4); Elite-Fertigkeiten/PSI 4 bzw. 5 GP je Stufe (PSI max. 6).",
    "Muttersprache Stufe 5 gratis, weitere Sprachen 2 GP je Stufe.",
    "Vor- und Nachteile gleichen sich über Vorteilsmarker aus (max. vier Nachteile).",
    "Zum Schluss: drei Charaktermerkmale und den Butterfly Effect auswürfeln.")}
<h2>Steigern (S. 129)</h2>
{table([("Attribute", "nächste Stufe × 10 EP"), ("Sonderattribute", "× 6"), ("Elite-Fertigkeiten, PSI, Sprachen", "× 4"), ("Fertigkeiten, besondere Fertigkeiten", "× 2"), ("Style-Skills", "laut Beschreibung")], ["Wert", "Kosten"])}
<p>EP: +1 je zwei Stunden Spielzeit, +1 je ausgespieltem Merkmal, +1 je besonderem Erlebnis. Nur trainierte Werte steigern, maximal eine Stufe je Sitzung. Butterfly-Effect-Sets kosten die Hälfte.</p>
"""))
    pages.append(("Fahrzeuge", f"""
<h2>Fahrzeugregeln (S. 104–106)</h2>
{ul("Handling = Mindestwurf zum Steuern; wird er unterwürfelt → Crash oder Kontrollverlust.",
    "Manöver wird als Würfelmodifikator auf die Fahrprobe gerechnet; Geschwindigkeit in m/KR.",
    "Unter 50 % TP: Handling +5, Geschwindigkeit halbiert, Manöver −2.",
    "Crash: erst Reaktion, dann Fahrzeugfertigkeit + Manöver; Schaden nach Aufprallregeln.",
    "Stunt: Fahrzeugfertigkeit ab MW 20, Vorteil oder +2W auf die nächste Aktion.",
    "Fahrzeugkampf: −2W für jede nicht erfüllte Ausgangsposition; Ausweichen mit Fahrzeugfertigkeit + Manöver.",
    "Ungezielter Treffer: W6 = 6 → vitale Stelle. Gezielte Angriffe auf sichtbare Komponenten −2W.")}
"""))
    return {"name": "NoReturn 2E – Regelübersicht", "pages": pages}
