# -*- coding: utf-8 -*-
"""Charakterbausteine – NoReturn 2E Corebook, Kapitel 2–3. Beschreibungen als eigene Kurzfassungen."""
from .common import icon, p


def mod(target, value, level=None):
    """Modifikator; `level` (nur Kampfkünste): gilt ab dieser Stufe."""
    m = {"target": target, "value": value}
    if level:
        m["level"] = level
    return m


def species():
    S = []

    def sp(name, gp, tp, ir, irp, adr, psy, org, psi, free, bio, ident, special, mods, desc, page, awakened=False):
        return {"name": name, "type": "species", "img": icon("svg", "mystery-man" if not awakened else "clockwork"),
                "system": {"gp": gp, "tp": tp, "irDice": ir, "irPoints": irp, "adrenalin": adr, "psyche": psy, "organismus": org,
                           "psi": psi, "awakened": awakened, "freePsi": free, "bioGp": bio, "identification": ident, "special": special,
                           "modifiers": mods, "description": p(desc, page)}}

    S.append(sp("Mensch", 0, 30, 1, 0, 2, 80, 100, True, 0, 0, "Spezieswissen MW 0",
                "Darf PSI-Kräfte der Kategorie A erwerben.", [],
                "Vorherrschende Spezies (ca. 74 % der Weltbevölkerung), beim Zentrum registriert. Schnelle Heilung und erhöhte Strahlungsresistenz; Potenzial zu PSI.", 140))
    S.append(sp("Evo", 10, 30, 2, 0, 2, 80, 100, False, 0, 0, "Spezieswissen MW 10",
                "Konstitution +1, Charisma +1. Nicht PSI-begabt.", [mod("attributes.ko", 1), mod("attributes.ch", 1)],
                "Genetisch optimierte Weiterentwicklung des Menschen, rechtlich gleichgestellt. Robust, makellos, neigen nicht zu Fettleibigkeit.", 140))
    S.append(sp("Adivasi", 40, 30, 2, 0, 2, 100, 100, False, 0, 0, "Spezieswissen MW 10",
                "Beweglichkeit +1; Rennen +6; kostenlos „Common Sense“, Giftresistenz 2 und 360°-Ultraschallsicht (Ohren frei beweglich).",
                [mod("attributes.be", 1), mod("skills.rennen", 6), mod("psyche", 10)],
                "„Ureinwohner“ aus der Region Götterfall. Nicht PSI-begabt. (Psyche +10 durch Common Sense ist bereits als Modifikator enthalten.)", 141))
    S.append(sp("Blendling ®842.74.RD", 30, 30, 2, 0, 2, 90, 100, True, 0, 0, "Spezieswissen MW 15",
                "Beweglichkeit +1; Rennen +4; Giftresistenz 1. Darf PSI der Kategorie A erwerben. Illegal laut Zentrum.",
                [mod("attributes.be", 1), mod("skills.rennen", 4)],
                "Spitzohrige Hybridspezies, gemäß Zentrumsgesetz illegal.", 142))
    S.append(sp("Mutant", 0, 30, 1, 0, 3, 70, 100, False, 0, 120, "Variabel (sichtbare Auffälligkeiten ohne Probe)",
                "Zwei Attribute nach Wahl +1 (als Modifikatoren ergänzen). Bis zu 120 GP in biologische Eigenschaften; bis auf eine müssen alle zum gleichen Tier passen.",
                [], "Nicht PSI-begabt. Mutanten verfügen über vielerlei biologische Eigenschaften.", 143))
    S.append(sp("Zeneritone", 25, 30, 1, -2, 2, 50, 100, True, 7, 0, "Spezieswissen MW 25",
                "Sieben kostenlose PSI-Kräfte auf Stufe 3. Erhält „Schwaches Attribut Stärke“ und „Schwaches Attribut Konstitution“ ohne Vorteilsmarker.",
                [], "Wirken wie Menschenkinder; bei Entdeckung illegal, das Zentrum strebt Gefangenschaft an.", 144))
    S.append(sp("Prodigy", 15, 30, 1, -1, 2, 60, 100, True, 3, 0, "Spezieswissen MW 30",
                "Drei kostenlose PSI-Kräfte auf Stufe 3.", [],
                "Extrem selten, schlank und menschenähnlich – Unterscheidung nur für wahre Experten.", 145))
    S.append(sp("Erwachter", 100, 70, 0, 0, 0, 80, 100, False, 0, 0, "Menschenkenntnis MW 30 oder Robotik MW 25",
                "GE, ST, KO, BE starten mit 2 (nur über Robotik-Upgrades steigerbar), WI/CH/HA mit 1, WA 3 (nur über Cybersense). Schmerztoleranz 10. Infektionsresistenz, Adrenalin und Organismus entfallen. Jede Zone: 70 TP, Kapazität 16, Chassis 10p. MK:A. Nur Zonen 12, 6 und 8 sind lebensnotwendig. Robotik-Overdrive möglich. Keine Abnormitäten (außer Mysteriöses Implantat), immun gegen Gifte, Viren und Drogen, nicht hackbar; EMP/Technokinese: nur 2W6 − (Willenskraft + Wissen) KR handlungsunfähig.",
                [], "Neuralprojektion in einem robotischen Körper – nicht als intelligente Lebensform anerkannt, Kopfgeld 8.000 N$. Designoptionen und Ganzkörper-Upgrades findest du im Compendium „Augmentierung“.", 145, awakened=True))
    return S


def abnormalities():
    A = []

    def ab(name, gp, desc, page, mods=None, her="", intensity="", illegal=False, variant=""):
        return {"name": name, "type": "abnormality", "img": icon("svg", "biohazard"),
                "system": {"gp": gp, "variant": variant, "heritability": her, "intensity": intensity, "illegal": illegal,
                           "modifiers": mods or [], "description": p(desc, page)}}

    A.append(ab("ALLES-Fresser", 20, "Extrem aggressive Magensäure – kann fast alles verdauen, braucht aber weiter ausgewogene Nährstoffe.", 149, her="19 %"))
    A.append(ab("Amphibia Humanis", 10, "Resistenz gegen säurehaltiges Meerwasser: kein Schaden durch toxisches Küstenwasser, kann hindurchtauchen.", 149, her="34 %"))
    A.append(ab("Atem-Ratio", 10, "Luft 15 Minuten anhalten; Ausdauer +3.", 149, [mod("skills.ausdauer", 3)], her="78 %"))
    A.append(ab("Booster-Syndrom", 25, "Aura im 5-m-Radius: PSI-Apps anderer erhalten +2 KS (nur Wirkung, nicht Zielbereich). Wirkt nicht auf sich selbst.", 149, her="47 %"))
    A.append(ab("Caecitas", 10, "Weichteile verhärtet: kein Weichteil-Bonusschaden gegen den Charakter.", 149, her="29 %"))
    A.append(ab("Common Sense", 5, "Psyche +10; für 1 EP 5 Psyche wiederherstellen (max. 100). Gelegentliche Tipps der SL.", 150, [mod("psyche", 10)], her="10 %"))
    for n, gp, reg, inst, mods_txt in [("CT3", 90, 90, 6, "GE −1, ST +6, KO +6, BE +5, WA +1, WI −3, CH −3, HA −2; Schwingen & Gleiten"),
                                        ("CT4", 100, 110, 6, "GE −1, ST +5, KO +5, BE +5, WA +1, WI −2, CH −3, HA −2; Nachtsicht"),
                                        ("CT5", 110, 130, 5, "GE −1, ST +5, KO +5, BE +5, WA +2, WI −2, CH −3, HA −2; Nachtsicht, Schwingen & Gleiten"),
                                        ("CT6", 120, 150, 5, "GE −1, ST +5, KO +6, BE +6, WA +2, WI −2, CH −3, HA −2; Nachtsicht, einziehbare Schwingen & Gleiten")]:
        A.append(ab(f"CT-Virus ({n})", gp,
                    f"Parasitärer Virus: bricht nach dem Tod oder durch Schmerz aus und verwandelt in eine echsenartige Bestie. Allgemein: IR +1W6, Schmerztoleranz +2, „Roh und Blutig“, Organismus −24, Psyche −25. Regeneration 30 / Pool {reg}, Instinkt {inst}. "
                    f"In CT-Form: Krallen, Roar, scharfe Zähne, zermalmender Kiefer, Wechselgänger, animalische Sprache; {mods_txt}. Verwandlung: Willenskraft gegen Instinkt + Adrenalin (siehe Tabelle S. 150). Inhaltswarnung beachten!",
                    150, [mod("irDice", 1), mod("schmerztoleranz", 2), mod("organismus", -24), mod("psyche", -25), mod("regSpeed", 30), mod("regPool", reg)],
                    her="98 %", intensity="6", illegal=True, variant=n))
    A.append(ab("Demigod", 30, "Voraussetzung: drei andere Abnormitäten. Stärke +2, Konstitution +1; öffnet Style-Skills und Eigenschaften (z. B. Rage of Gods). Blutrote Iris, schwarze Lederhaut. Kopfgeld 2.500 N$.",
                153, [mod("attributes.st", 2), mod("attributes.ko", 1)], her="100 %", illegal=True))
    A.append(ab("Diezinsynthese", 15, "Ernährt sich von 3–4 l Diezin täglich; Giftresistenz 1; immun gegen CT und HMO; keine Regeneration. Bei Zerstörung von Zone 7 durch Hitze: Explosion 50 Hitzeschaden auf 1W6 m.", 153, her="91 %"))
    A.append(ab("Flair", 10, "Willenskraft-Probe (1 KR): Ergebnis = Radius in m, in dem PSI-Begabte grob geortet werden.", 153, her="49 %"))
    A.append(ab("HMO (iHMO, infiziert)", 100, "Hämatophager mutagener Organismus („Vampir“): IR +4, scharfe Zähne, Nachtsicht, TP 50, Psyche −10, Organismus −10. Blutpunkte (max. 5): 1 BP = 0,5 l Blut, 1 BP je Sonnenaufgang, +4W auf ein Attribut je BP. UV: 30 andauernder Schaden je KR. PSI Kategorie B: „Unaufhaltsamer Schatten“.",
                154, [mod("irPoints", 4), mod("tp", 20), mod("psyche", -10), mod("organismus", -10), mod("bloodMax", 5)], her="99 %", intensity="8 (3)", variant="iHMO"))
    A.append(ab("HMO (gHMO, geboren)", 140, "Wie iHMO, aber TP 70, max. 10 Blutpunkte und eine frei wählbare PSI-Kraft der Kategorie B (weitere für je 7 GP / 15 EP).",
                154, [mod("irPoints", 4), mod("tp", 40), mod("psyche", -10), mod("organismus", -10), mod("bloodMax", 10)], her="99 %", intensity="8 (3)", variant="gHMO"))
    A.append(ab("Hyperbolismus", 110, "Heilung mit vielfacher Geschwindigkeit: Regeneration 30, Pool 300.", 155, [mod("regSpeed", 30), mod("regPool", 300)], her="24 %"))
    A.append(ab("Hyperdrenalin", 30, "Adrenalin auch außerhalb von Stresssituationen einsetzbar; Adrenalin +2.", 155, [mod("adrenalin", 2)], her="45 %"))
    A.append(ab("Immunität", 30, "+2W auf Infektionsresistenz; Wunden entzünden sich nie und heilen doppelt so schnell.", 155, [mod("irDice", 2)], her="57 %"))
    A.append(ab("Insight", 50, "Willenskraft-Probe: Radius in m, erkennt welche Wesen PSI der Kategorie A besitzen. Mit Berührung prüfbar.", 156, her="9 %"))
    A.append(ab("Kongenitale Analgesie", 60, "Angeborene Schmerzunempfindlichkeit: Schmerztoleranz 10, nicht senkbar.", 156, [mod("schmerztoleranz", 10)], her="29 %"))
    A.append(ab("Kordionisches Manko", 30, "Tagsüber nahezu blind (−3W optisch bei hellem Licht), alle anderen Wahrnehmungsproben +3W; „Sechster Sinn“.", 156, her="19 %"))
    A.append(ab("Memo-Scar", 5, "Voraussetzung Regenerationspool: Narben bleiben sichtbar, Tätowierungen möglich.", 156, her="45 %"))
    A.append(ab("Metamorph", 120, "Gestalt in engem Rahmen wandelbar (±20 cm, ±20 kg Eindruck, Haare). 1 KR, Willenskraft MW 20; währenddessen −1W auf körperliche Aktionen. Intersexuell. Illegal.", 157, her="26 %", illegal=True))
    A.append(ab("Meta-Schwannsche-Zellen", 70, "Eine Aktion mehr pro Runde; alle Mali auf Psyche und Organismus werden verdoppelt.", 157, her="31 %"))
    A.append(ab("Mysteriöses Implantat", 10, "Fremde Erinnerungen: zwei Wissens-Fertigkeiten +1 (über Maximum). Organismus −5, Psyche −5. Auch für Erwachte.", 157, [mod("organismus", -5), mod("psyche", -5)]))
    A.append(ab("N²", 35, "Bei der Erschaffung dürfen zwei Fertigkeiten bis 6 gesteigert werden und erhalten einmalig +1 (bis 7).", 158, her="72 %"))
    A.append(ab("Pheromonia", 60, "Botenstoffe im Radius KO × 5 m: Anziehung, Besänftigung, Furcht, Wut oder Vertrauen. CH + Willenskraft gegen WI + Willenskraft + IR. Immun gegen fremde Pheromonia. Kopfgeld 750 N$.", 158, her="45 %", illegal=True))
    A.append(ab("PSI-Resistenz", 25, "Fremde PSI-Apps der Kategorie A wirken um 2 KS schwächer (nach erfolgreichem Wirken).", 159, her="23 %"))
    A.append(ab("Psionische Abartigkeit", 40, "Kann kein PSI wirken und keine Kategorie-A-Kräfte erwerben; Kategorie-A-Kräfte wirken nicht auf den Charakter.", 159, her="24 %"))
    A.append(ab("Psionische Transzendenz", 60, "Immunität gegen PSI der Kategorie A; mit Adrenalin je 1 Minute aufhebbar. Wird von Flair/Insight nicht erkannt.", 159, her="65 %"))
    A.append(ab("Psionische Maskierung", 25, "Tarnt psionische Begabung (siehe GP-Übersicht S. 136).", 136))
    A.append(ab("Resin-Gen", 10, "Organismus heilbar: 1 EP = 5 Organismus (max. 100); bei Erschaffung 1 GP = 5 Organismus. Hebt Meta-Schwann-Nachteil auf.", 159, her="7 %"))
    A.append(ab("Solaris", 40, "UV-Licht 1 Min.–2 h: +1W, über 2 h: +2W auf GE, ST, KO, BE für die gleiche Dauer. Kein Sonnenbrand.", 160, her="55 %"))
    A.append(ab("Soulmate (AA–ZZ)", 10, "Code-Kombination AA–ZZ: gleiche Soulmates spüren einander auf WI × 100 m, +2W Charisma untereinander. Wirkungslos unter Psyche 25.", 160, her="50/100 %"))
    A.append(ab("Super Charge", 30, "Supraleiter: ernährt sich von Strom. Mittlere Quellen: Sättigung → Adrenalin auffüllen → +4W nächste körperliche Aktion; danach Schaden.", 160, her="81 %"))
    A.append(ab("Tierische Mutation", 6, "Gewährt biologische Eigenschaften im Wert von 5 GP (mehrfach wählbar). Organismus −2 je Auswahl. Mutant zweiter Klasse.", 161, [mod("organismus", -2)], her="61 %"))
    A.append(ab("Toxic", 20, "Ätzendes Blut: 25 andauernder Hitzeschaden bei Kontakt (selbst immun). Keine Robotik/Biomechanik; IR +1W6.", 161, [mod("irDice", 1)], her="30 %"))
    A.append(ab("Verfluchte Bindung", 40, "Psionische Bindung an einen Gegenstand: ohne Kontakt +2W auf alle Attribute, aber −1 Psyche je Stunde. Zerstörung: neue Bindung, Psyche −10.", 161, her="85 %"))
    A.append(ab("X-trem Gen", 30, "Stärke +1; Stärke wird wie eine Elite-Fertigkeit gesteigert (nächste Stufe × 4 EP).", 161, [mod("attributes.st", 1)], her="97 %"))
    return A


def bio_traits():
    B = []

    def bt(name, kind, gp, desc, page, mods=None, per=False, maxl=1, consp="", charges=0, covers=0, grants=None):
        return {"name": name, "type": "bioTrait", "img": icon("svg", "pawprint" if kind != "auffaelligkeit" else "eye"),
                "system": {"kind": kind, "gp": gp, "level": 1, "maxLevel": maxl, "perLevel": per, "covers": covers, "conspicuity": consp,
                           "charges": {"value": charges, "max": charges}, "modifiers": mods or [], "grants": grants or [], "description": p(desc, page)}}

    vis = "sichtbar"
    B.append(bt("Amphibie", vis, 5, "Kiemen – atmet unter Wasser.", 162, consp="Offensichtliche Kiemen"))
    B.append(bt("Cuteness overload", vis, 5, "Charisma +2; eigene Einschüchtern-Proben werden halbiert.", 162, [mod("attributes.ch", 2)], consp="Unerträglich süß"))
    B.append(bt("Dicke Haut / dickes Fell", vis, 5, "Je Stufe +1W gegen Kälte (Fell) bzw. Hitze (Haut). Max. 5.", 162, per=True, maxl=5, consp="20 % Körperbedeckung je Stufe"))
    B.append(bt("Flügel", vis, 20, "Fertigkeit „Fliegen“ (BE) Stufe 1, MW 5; Geschwindigkeit = Wurf × 2. Schweben nur mit Rüttelflug.", 162, consp="Offensichtliche Flügel"))
    B.append(bt("Flughäute oder Schwingen", vis, 10, "Gleitflug: besondere Fertigkeit „Gleiten“ (BE) 1, MW 5, Wurf × 2 m/KR; verdoppelt Springen.", 162, consp="Flughäute"))
    B.append(bt("Gifthaut (toxisch)", vis, 30, "Nässende Giftschicht wirkt bei Berührung ohne Kleidung/Rüstung wie Giftdrüsen (toxisch).", 163, consp="Feuchter Film (Wahrnehmung 15)"))
    B.append(bt("Gifthaut (narkotisch)", vis, 40, "Wie oben mit narkotischem Gift.", 163, consp="Feuchter Film (Wahrnehmung 15)"))
    B.append(bt("Horn, Hörner oder Stoßzähne", vis, 10, "Schaden ST+30p., durch Anlauf (Rennen) erhöht. Bringt die Waffe „Hornstoß (körpereigen)“ mit.", 163, consp="Offensichtlich", grants=["Hornstoß (körpereigen)"]))
    B.append(bt("Krallen, Klauen oder scharfe Nägel", vis, 10, "Klettern +1W (automatisch); Nahkampf +1W und Schaden ST+20p. über die Waffe „Krallen (körpereigen)“, die automatisch hinzugefügt wird.", 163,
                [mod("dice.klettern", 1)], consp="1–2 cm Krallen", grants=["Krallen (körpereigen)"]))
    B.append(bt("Mehrgliedrig", vis, 10, "Je Stufe ein zusätzliches Paar Arme (+4W Stärke wenn alle beteiligt) oder Beine (+4W Rennen). Max. 2.", 163, per=True, maxl=2, consp="Zusätzliche Gliedmaßen"))
    B.append(bt("Panzer (flexibel)", vis, 5, "Je Stufe drei Zonen mit 20p. MK:A (Modifikator „Körperpanzer“ je Zone setzen). Weichteile ungeschützt.", 163, per=True, maxl=4, consp="Horn-/Knochenschicht"))
    B.append(bt("Panzer (massiv)", vis, 5, "Je Stufe zwei Zonen mit 30p. MK:B (Modifikator „Körperpanzer“ je Zone). Weichteile ungeschützt.", 163, per=True, maxl=5, consp="Chitin-/Knochenplatten"))
    B.append(bt("Rundumsicht", vis, 15, "Augen seitlich – sieht auch hinter sich. Ultraschall-Rundumsicht: 25 GP.", 163, consp="Seitliche Augen / große Ohren"))
    B.append(bt("Scharfe Zähne oder Schnabel", vis, 10, "Biss ST+30p. (mit zermalmendem Kiefer ST+40p.).", 164, consp="Offensichtlich", grants=["Biss (körpereigen)"]))
    B.append(bt("Schwimmflossen oder Schwimmhäute", vis, 5, "Je Stufe +10 Punkte auf Schwimmen.", 164, per=True, maxl=3, consp="Häute/Flossen"))
    B.append(bt("Selektive Entwicklung", vis, 5, "Nur Demigod: je 5 GP fünf Stufen ST/KO/BE frei auf Körperzonen verteilen. Max. 4×.", 164, per=True, maxl=4, consp="Unproportionierte Muskeln"))
    B.append(bt("Stachel(n)", vis, 10, "Verteidigend: Trifft dich ein waffenloser/körpereigener Nahkampfangriff, erleidet der Angreifer KO+15p. Schaden (Schadenskarte erscheint automatisch). Alternativ ein einzelner großer Stachel ST+30p.: dann die Waffe „Großer Stachel (körpereigen)“ aus dem Compendium Waffen hinzufügen – der Rückschaden entfällt.", 164, consp="Schwer zu verbergen"))
    B.append(bt("Zehengänger", vis, 10, "Rennen +4.", 164, [mod("skills.rennen", 4)], consp="Deformierte Unterschenkel"))
    hid = "verborgen"
    B.append(bt("Adrenalinkammern", hid, 10, "Je Stufe Adrenalin +1. Max. 2.", 165, [mod("adrenalin", 1)], per=True, maxl=2))
    B.append(bt("Einziehbar", hid, 5, "+5 GP auf eine sichtbare Eigenschaft bis 15 GP – wird dadurch verborgen.", 165))
    B.append(bt("Elektroschock", hid, 20, "Einmal je KR ohne Aktion per Berührung: Hitzeschaden = besondere Fertigkeit „Elektroschock (Schaden)“ (Start 2). 20 Ladungen (+5 je 5 GP). Nicht mit Super Charge.", 165, charges=20))
    B.append(bt("Erschütterungssinn", hid, 10, "Ortet alles mit Bodenkontakt in Wahrnehmung × 2 m; Heimlichkeit dagegen halbiert, optische Tarnung wirkungslos.", 166))
    B.append(bt("Farbliche & Struktur-Tarnung", hid, 20, "Stufe 1: +20 Heimlichkeit (optisch), −2 je verdeckte Zone. Stufe 2: +40, −4 je Zone.", 166, per=True, maxl=2))
    B.append(bt("Geräusch-Mimikry", hid, 15, "+2W auf Einschüchtern, Inspirieren, Schauspiel (für sich oder andere).", 166))
    B.append(bt("Gesteigerte Fertigkeit", hid, 5, "Je Stufe +2 auf Heimlichkeit, Klettern, Rennen, Schwimmen, Springen oder Stemmen (Modifikator anpassen).", 166, per=True, maxl=5))
    B.append(bt("Giftdrüsen (narkotisch)", hid, 20, "Kontakt: −3W auf alle Attribute für 20 KR (Giftresistenz je Stufe −1W); KO ≤ 0 → bewusstlos.", 166))
    B.append(bt("Giftdrüsen (toxisch)", hid, 15, "Kontakt: 3 KR je 6 Schaden am Herzen oder Kopf ohne Widerstand (Giftresistenz −2 je Stufe).", 167))
    B.append(bt("Giftresistenz", hid, 5, "Je Stufe Resistenz gegen Gifte; +2W gegen Alkohol je Stufe. Max. 3.", 167, per=True, maxl=3))
    B.append(bt("Hauttaschen", hid, 5, "Bis zu drei Liter Stauraum.", 167))
    B.append(bt("Nachtsicht", hid, 10, "Keine Erschwernis bei optischer Wahrnehmung im Dunkeln.", 167))
    B.append(bt("Regeneration", hid, 30, "Regenerationsgeschwindigkeit 10, Pool 100.", 167, [mod("regSpeed", 10), mod("regPool", 100)]))
    B.append(bt("Roar", hid, 10, "+5W auf Einschüchtern, wenn mit Stärke statt Charisma gewürfelt wird (automatisch bei Attributwahl ST).", 167, [mod("dice.einschuechtern.st", 5)]))
    B.append(bt("Roh und Blutig", hid, 5, "Verdaut rohe Nahrung; +1 auf Infektionsresistenz.", 167, [mod("irPoints", 1)]))
    B.append(bt("Odemwaffe", hid, 20, "Feuer- oder Säurestoß SP 6/6 alle 6 h; Fertigkeit „Odemwaffe“ (GE) 1; Schaden = doppelter Stärkewurf, andauernd 1W6 KR. +5 GP je Ladung (max. 5).", 167, charges=1))
    B.append(bt("Schmerzresistenz", hid, 15, "Je Stufe Schmerztoleranz +2. Max. 2.", 168, [mod("schmerztoleranz", 2)], per=True, maxl=2))
    B.append(bt("Sechster Sinn", hid, 20, "Darf immer eine Defensivaktion durchführen, auch gegen nicht wahrnehmbare Angriffe.", 168))
    B.append(bt("Spinnenseide", hid, 20, "Netz oder Seil bis 30 m. Fertigkeiten „Spinnenseide (Werfen)“ (GE) und „(Stabilität)“ (ST) je 1. 20 Ladungen.", 168, charges=20))
    B.append(bt("Stachelgeschosse", hid, 20, "Bis 50 m, Angriff mit Projektilwaffen, Schaden = besondere Fertigkeit „Körpergeschosse“ (2). 20 Ladungen.", 168, charges=20))
    B.append(bt("Superschallschrei", hid, 30, "Druckwelle SP 10/20, 20 Schaden (+10 je weiterem Adrenalin), kostet 1 Adrenalin; Opfer mit Gehör: je 10 Punkte der Hörprobe −1W für 10 KR. Kopfgeld +500 N$.", 169))
    B.append(bt("Thermalsicht", hid, 10, "Sieht Wärme, auch durch dünne Wände (ersetzt keine Nachtsicht).", 169))
    B.append(bt("Toxische Anpassung", hid, 5, "Immun gegen toxische Gewässer.", 170))
    B.append(bt("Ultraschallortung", hid, 20, "Biosonar: farbloses Abbild, unbeeinträchtigt von Licht, Rauch oder Tarnung.", 170))
    B.append(bt("Verbesserte Wahrnehmung", hid, 5, "Je Stufe +2W für einen Sinn (Sehen, Riechen, Schmecken, Hören oder Tasten). Max. 3 je Sinn.", 170, per=True, maxl=3))
    B.append(bt("Verdichtete Muskulatur", hid, 20, "Je Stufe Stärke +1 und Konstitution +1. Max. 3.", 170, [mod("attributes.st", 1), mod("attributes.ko", 1)], per=True, maxl=3))
    B.append(bt("Wechselgänger", hid, 15, "Auf vier Beinen: Rennen-Ergebnis × 2.", 170))
    B.append(bt("Zermalmender Kiefer", hid, 10, "Biss ST+30p. (mit scharfen Zähnen ST+40p.).", 170))
    au = "auffaelligkeit"
    for n, c, ds in [("Animalische Sprache", 50, "Veränderte Stimmbänder – keine menschliche Sprache."),
                     ("Animalische Augen (Farbe/Iris)", 5, "Unnatürliche Farbe oder verformte Iris."),
                     ("Animalische Augen (Form/Anzahl)", 10, "Form, Position oder Anzahl weicht ab."),
                     ("Animalische Geschlechtsmerkmale (sekundär)", 20, "Sekundäre Merkmale."),
                     ("Animalische Geschlechtsmerkmale (primär)", 30, "Primäre Merkmale."),
                     ("Animalische Hände/Füße (je Paar)", 25, "Tierische Extremitäten."),
                     ("Animalischer Kopf (mit Mimik)", 30, "Tierschädel, der menschliche Mimik zulässt."),
                     ("Animalischer Kopf (gänzlich)", 40, "Völlig tierischer Kopf."),
                     ("Animalische Ohren", 5, "Spitz, behaart, zu groß/klein."),
                     ("Animalische Ohren (überdimensioniert)", 10, "Wie Fledermaus- oder Hasenohren.")]:
        B.append(bt(n, au, 0, ds + f" Deckt {c} GP verborgener Eigenschaften.", 170, covers=c))
    return B


def advantages():
    V = []

    def adv(name, kind, markers, desc, page, mods=None):
        return {"name": name, "type": "advantage", "img": icon("svg", "upgrade" if kind == "vorteil" else "downgrade"),
                "system": {"kind": kind, "markers": markers, "level": 1, "modifiers": mods or [], "description": p(desc, page)}}

    for n, m, ds, mods in [("Alkoholresistenz", 1, "Alkohol zählt 5 ALK weniger.", None),
                           ("Angespannt", 2, "Adrenalin +1.", [mod("adrenalin", 1)]),
                           ("Aus gutem Hause", 2, "Einmal im Zonat Zugriff auf Ressourcen im Wert von 10.000 N$ – pflegen!", None),
                           ("Berühmt", 1, "Startet mit Bekanntheit Meilenstein 6 (MW 20).", None),
                           ("Extrem talentiert", 1, "Würfelt zweimal den Butterfly Effect – zwei Begabungen.", None),
                           ("Fahrzeugempathie", 1, "Handling von gesteuerten Fahrzeugen −10. Nicht mit Fahrzeugantipathie.", None),
                           ("Frühaufsteher", 1, "Nach vier Stunden Schlaf erholt.", None),
                           ("Gutes Heilfleisch", 1, "Natürliche Heilung 20 Punkte je Tag statt KO. Nicht mit Verdorbenes Fleisch.", None),
                           ("Kontakte zu Hightech", 1, "Zugang zu sämtlicher Hightech-Ausrüstung zu normalen Preisen.", None),
                           ("Konzentration [PSI]", 1, "Kraftsammeln um 5 Punkte erleichtert.", None),
                           ("Meisterschaft (Fertigkeit)", 1, "Eine Fertigkeit +1 (auch über Maximum); einmal je Fertigkeit. Modifikator setzen.", None),
                           ("Mutagen", 1, "Nur für Spezies mit biologischen Eigenschaften: fortschreitende Entwicklung trotz fremder Regeneration.", None),
                           ("Jane/John Doe", 1, "So unauffällig, dass man sich kaum erinnert; wird zuletzt ausgewählt.", None),
                           ("Realitätsbrechende Selbstüberzeugung", 3, "Einmal je Spielsitzung einen Würfelwurf neu werfen.", None),
                           ("Unterschlupf", 2, "Sicherer 40-m²-Rückzugsort mit Wasser und Strom.", None),
                           ("Schmerzresistent", 2, "Schmerztoleranz +2. Nicht mit Schmerzempfindlichkeit.", [mod("schmerztoleranz", 2)]),
                           ("Schneller Lerner", 3, "+1 EP je Spielrunde. Nicht mit Begriffsstutzig.", None),
                           ("Tausendsassa", 3, "+20 GP bei der Charaktererschaffung (GP-Extra im Bio-Reiter eintragen).", None),
                           ("Verbündete", 2, "Ein treuer NSC-Verbündeter; je weiterem Marker eine Person mehr.", None)]:
        V.append(adv(n, "vorteil", m, ds, 174, mods))
    for n, m, ds, mods in [("Abgestumpft", 2, "Erhält stets einen CP und einen JP weniger.", None),
                           ("Alkoholanfällig", 1, "Alkohol zählt mit doppeltem ALK-Wert.", None),
                           ("Allergie (selten)", 2, "Kontakt: −2W auf alle Aktionen (inkl. Widerstand), −1 Organismus je Minute.", None),
                           ("Allergie (häufig)", 4, "Wie oben mit häufigem Auslöser (Kunststoffe, Metalle, UV, Insekten, Staub).", None),
                           ("Amnesie (Teil)", 1, "Erinnert sich nicht an Identität, Aspekte der Vergangenheit oder ein Trauma.", None),
                           ("Amnesie (vollständig)", 3, "Die SL konzipiert den Charakter; Werte werden im Spiel entdeckt.", None),
                           ("Analphabet", 2, "Startsprache nur Stufe 2; keine Sprachen per GP.", None),
                           ("Außer Form", 3, "ST, KO und BE bei der Erschaffung maximal 2.", None),
                           ("Begriffsstutzig", 3, "−1 EP je Spielrunde. Nicht mit Schneller Lerner.", None),
                           ("Chronische Erkrankung", 2, "Ohne tägliche Versorgung −1 Organismus je Tag (Langzeit-Medikation 100 N$ / 20 Dosen).", None),
                           ("Eingeschränkte Ausrüstung", 1, "Zu Spielbeginn nur TS I–II; New Dollar aus GP halbiert.", None),
                           ("Empfindlicher Magen", 1, "Infektionsresistenz −1.", [mod("irPoints", -1)]),
                           ("Fahrzeugantipathie", 1, "Handling gesteuerter Fahrzeuge +10.", None),
                           ("Feind", 3, "Ein Kopfgeld und ein mächtiger Gegner – regelmäßige Konfrontationen.", None),
                           ("Geschunden", 1, "Organismus −15.", [mod("organismus", -15)]),
                           ("Gremlins", 1, "Technische Geräte fallen in seinen Händen gern aus (SL).", None),
                           ("Hörschwäche", 1, "−2W auf akustische Wahrnehmung ohne Hörhilfe.", None),
                           ("Job", 1, "5–10 h täglich gebunden, 50 N$/h.", None),
                           ("Phobie (selten)", 1, "Angesichts des Auslösers −2W auf alle Aktionen außer Widerstand.", None),
                           ("Phobie (häufig)", 3, "Wie oben mit häufigem Auslöser (Klaustrophobie, Dunkelheit …).", None),
                           ("Querschnittsgelähmt", 6, "Untere Körperhälfte weder beweglich noch schmerzempfindlich.", None),
                           ("Sehschwäche", 1, "−2W auf optische Wahrnehmung ohne Sehhilfe.", None),
                           ("Schlimme Vergangenheit", 1, "Psyche −20.", [mod("psyche", -20)]),
                           ("Schmerzempfindlichkeit", 2, "Schmerztoleranz −2.", [mod("schmerztoleranz", -2)]),
                           ("Schlafmütze", 1, "Unter acht Stunden Schlaf keine Erholung von Adrenalin/Regeneration.", None),
                           ("Schwaches Attribut (…)", 2, "Attribut bei Erschaffung max. 2 (kostet 20 GP), Steigern doppelte EP. Attribut im Namen angeben, z. B. „Schwaches Attribut Stärke“. Max. 3×.", None),
                           ("Signatur", 1, "Markenzeichen/Angewohnheit; Psyche −5.", [mod("psyche", -5)]),
                           ("Verdorbenes Fleisch", 2, "Regenerationspool nie über 0; Heilung max. KO je Tag, Medizin wirkungslos (nur PSI hilft).", None),
                           ("Verpflichtung", 2, "Täglich ca. 5 h gebunden; drei Versäumnisse haben schwere Folgen.", None)]:
        V.append(adv(n, "nachteil", m, ds, 176, mods))
    return V


JUSTICE = ["Abenteuerlustig", "Adrett", "Akribisch", "Aktiv", "Albern", "Analytisch", "Anhänglich", "Anpassungsfähig", "Aufmerksam", "Bedacht",
           "Besonnen", "Charmant", "Devot", "Edelmütig", "Ehrlich", "Einfühlsam", "Entschlossen", "Experimentierfreudig", "Familiär", "Freizügig",
           "Furchtlos", "Genügsam", "Gesetzestreu", "Gnädig", "Harmoniebedürftig", "Hedonistisch", "Hilfsbereit", "Idealistisch", "Impulsiv",
           "Introvertiert", "Keck", "Kommunikativ", "Kreativ", "Loyal", "Misstrauisch", "Mutig", "Naiv", "Nett", "Neugierig", "Optimistisch",
           "Ordnungsliebend", "Organisiert", "Pazifistisch", "Perfektionistisch", "Pragmatisch", "Prinzipientreu", "Reizvoll", "Schlagfertig",
           "Schrill", "Selbstbewusst", "Sensibel", "Seriös", "Solidarisch", "Sozial", "Teamfähig", "Temperamentvoll", "Theatralisch", "Tolerant",
           "Vielschichtig", "Wankelmütig", "Wissenshungrig", "Weltgewandt", "Zäh", "Zerstreut"]
CHAOS = ["Angeberisch", "Ängstlich", "Arrogant", "Asozial", "Autoritär", "Besserwisserisch", "Bieder", "Boshaft", "Brutal", "Chaotisch",
         "Dogmatisch", "Dominant", "Dumm", "Egoistisch", "Eifersüchtig", "Eitel", "Extrovertiert", "Fanatisch", "Faul", "Feige", "Geizig",
         "Gewalttätig", "Gierig", "Gnadenlos", "Größenwahnsinnig", "Hektisch", "Herzlos", "Hinterhältig", "Intolerant", "Kleptomanisch",
         "Konfliktsuchend", "Kühl", "Kompromisslos", "Lasziv", "Launisch", "Makaber", "Masochistisch", "Materialistisch", "Militant",
         "Mordlustig", "Nachtragend", "Neidisch", "Nekrophil/Technophil", "Nervös", "Obszön", "Paranoid", "Prokrastinierend",
         "Psychopathisch", "Rachsüchtig", "Sadistisch", "Salzig", "Sexistisch", "Skrupellos", "Stur", "Tollkühn", "Ungeduldig",
         "Unsicher", "Verfressen", "Verlogen", "Verrückt", "Versoffen", "Wahnsinnig", "Willig", "Xenophob"]

PSYCHE_MAP = {}
for rng, names in [("100–81", "besonnen edelmütig einfühlsam genügsam hilfsbereit loyal mutig optimistisch sozial tolerant"),
                   ("80–61", "adrett akribisch bedacht charmant ehrlich gnädig idealistisch konfliktsuchend materialistisch prinzipientreu"),
                   ("60–41", "analytisch autoritär entschlossen faul furchtlos gierig harmoniebedürftig militant misstrauisch salzig"),
                   ("40–21", "asozial dogmatisch feige gewalttätig nachtragend masochistisch prokrastinierend rachsüchtig versoffen zäh"),
                   ("20–1", "boshaft brutal fanatisch gnadenlos mordlustig nekrophil/technophil paranoid psychopathisch wahnsinnig zerstreut")]:
    for n in names.split():
        PSYCHE_MAP[n] = rng


def traits():
    T = []
    for kind, names in [("justice", JUSTICE), ("chaos", CHAOS)]:
        for n in names:
            bonus = "+1W auf Kunst (temporär)" if n == "Kreativ" else ""
            rng = PSYCHE_MAP.get(n.lower(), "")
            desc = f"{'Justice' if kind == 'justice' else 'Chaos'}-Charaktermerkmal. Wird ausgespielt (+1 EP je Spielrunde, in der es gezeigt wird)."
            if rng:
                desc += f" Typisch für den Psyche-Bereich {rng}."
            T.append({"name": n, "type": "trait", "img": icon("svg", "heal" if kind == "justice" else "skull"),
                      "system": {"kind": kind, "psycheRange": rng, "bonus": bonus, "description": p(desc, 118)}})
    return T


# Stabile Schlüssel (system.key) – muss mit NR.styleSkillKeys in module/config.mjs übereinstimmen.
STYLE_KEYS = {
    "Aim for the Heart": "aimForTheHeart", "Akimbo": "akimbo", "Anonymous": "anonymous", "Beastmaster": "beastmaster",
    "Billy the Kid": "billyTheKid", "Blademaster": "blademaster", "CrapGyver": "crapGyver", "Crash-Override": "crashOverride",
    "Déjà-vu": "dejaVu", "Der Doktor": "derDoktor", "Drift King": "driftKing", "Dual Wielding": "dualWielding",
    "Fast Talk": "fastTalk", "Fist of Rage": "fistOfRage", "Goldene Zunge": "goldeneZunge", "Linguist": "linguist",
    "Meditation": "meditation", "Memorum [PSI-Kraft]": "memorum", "Metamorphose [Element]": "metamorphose",
    "Mixology": "mixology", "Multiple Wielding": "multipleWielding", "Neo": "neo", "Pet Pal": "petPal",
    "Power Nap": "powerNap", "Parkour": "parkour", "Psionische Vielfältigkeit": "psionischeVielfaeltigkeit",
    "Quadruple Akimbo": "quadrupleAkimbo", "Rage of Gods": "rageOfGods", "Recoil Mastery": "recoilMastery",
    "Rüttelflug": "ruettelflug", "Shield Master": "shieldMaster", "Sollbruchstelle": "sollbruchstelle", "Split": "split",
    "Sterne-Küche": "sterneKueche", "Storm of Fists": "stormOfFists", "Trickster": "trickster",
    "Trigger Finger": "triggerFinger", "Trusty Engineer": "trustyEngineer",
    "Waffenspezialisierung (Waffenart)": "waffenspezialisierung",
    "Aikido": "aikido", "Ba-Kai-Do": "baKaiDo", "Boxen": "boxen", "Capoeira": "capoeira", "Escrima": "escrima",
    "Gun-Fu": "gunFu", "Jiu Jitsu": "jiuJitsu", "Karate": "karate", "Kenjutsu": "kenjutsu", "Kick-Boxen": "kickBoxen",
    "Krav Maga": "kravMaga", "Muay Thai": "muayThai", "Ringen": "ringen", "Sado": "sado", "Tae-Kwon-Do": "taeKwonDo",
    "ZPC (Zentrum Power Combat)": "zpc",
}


# Mechanische Ergänzungen je Style-Skill: mods (Item-Modifikatoren, Kampfkünste mit Stufe), hint (Hinweistext der
# „Einsetzen“-Chatkarte), uses ((Anzahl, Zeitraum) für begrenzte Einsätze). Details siehe module/styles.mjs/combat.mjs.
STYLE_EXTRA = {

    "Aim for the Heart": {"hint": "Gezielte Angriffe auf Fahrzeuge erhalten keinen −2W-Malus und dürfen auch nicht sichtbare vitale Stellen treffen: Bei Schaden am Fahrzeug gilt der gezielte Treffer dann als vitale Stelle (wird im Angriffsdialog/Schadenswurf automatisch berücksichtigt)."},
    "Akimbo": {"hint": "Mehrfachangriff mit zwei Fernkampfwaffen in einem Wurf: im Angriffsdialog „Mehrfachangriff“ auf 2 setzen. Es gelten der jeweils höchste Malus/niedrigste Wert; kein Adrenalin/Meditation; jedes Ziel muss sich gegen jeden Angriff verteidigen, Schaden je Treffer."},
    "Dual Wielding": {"hint": "Mehrfachangriff mit zwei Nahkampfwaffen in einem Wurf: im Angriffsdialog „Mehrfachangriff“ auf 2 setzen. Kein Adrenalin/Meditation; jedes Ziel verteidigt gegen jeden Angriff einzeln."},
    "Fist of Rage": {"hint": "Mehrfachangriff mit zwei waffenlosen Extremitäten: bei waffenlosen Angriffen im Angriffsdialog „Mehrfachangriff“ auf 2 setzen (Angriffsart je Extremität wählbar)."},
    "Multiple Wielding": {"hint": "Erweitert Dual Wielding auf vier Nahkampfwaffen: im Angriffsdialog „Mehrfachangriff“ bis 4. Voraussetzung Mehrgliedrig (Arme) bleibt Sache der Charaktererschaffung."},
    # (Ende STYLE_EXTRA)
}


def style_skills():
    X = []

    def ss(name, gp, ep, pre, desc, page, mods=None):
        return {"name": name, "type": "styleSkill", "img": icon("svg", "combat"),
                "system": {"key": STYLE_KEYS[name], "kind": "expert", "gp": gp, "ep": ep, "level": 1, "prerequisites": pre, "levels": [], "modifiers": mods or [], "description": p(desc, page)}}

    data = [
        ("Aim for the Heart", 7, 15, "Fahrzeug-Fertigkeit 4; WA 3", "Gezielte Angriffe dürfen auch nicht sichtbare vitale Stellen treffen; der −2W-Malus für gezielte Fahrzeugangriffe entfällt.", 179),
        ("Akimbo", 7, 15, "Schießen 5; WA 3", "Mehrfachangriff mit zwei Fernkampfwaffen in einem Angriffswurf.", 179),
        ("Anonymous", 7, 15, "Computer 4; HA 4, WI 5", "Computeraktionen sind nicht zurückverfolgbar; Seiteneffekte ohne Probe vermieden (Sicherheitsbarrieren weiterhin).", 179),
        ("Beastmaster", 5, 10, "Dressieren 3; CH 4", "Kreaturen greifen zuletzt an; zwei Dressieren-Proben weniger nötig. Unkontrollierte CTs reagieren positiv.", 180),
        ("Billy the Kid", 5, 10, "Schießen 4; GE 4", "Einhändige Feuerwaffen in einer Aktion ziehen und abfeuern.", 180),
        ("Blademaster", 7, 15, "Reaktion 6, Waffenkampf 6; GE, BE, WA 4", "Parade gegen Fernkampf mit Klingenwaffe ≥ 30 cm (mit Nachteil −2W).", 180),
        ("CrapGyver", 7, 15, "3 Handwerk-Fertigkeiten auf 4", "Crafting-Dauer −50 % (außer Computer).", 180),
        ("Crash-Override", 5, 10, "Computer 5; HA 4", "Hacken/Programmieren als Crafting mit −50 % Dauer.", 180),
        ("Déjà-vu", 7, 15, "PSI-begabt, Willenskraft 5; WA 5", "Einmal je Sitzung ein Hinweis der SL auf kommende Ereignisse.", 181),
        ("Der Doktor", 7, 15, "Medizin 4; HA 4, WI 4", "Behandlung (WI + Medizin) gibt temporäre Bonus- (4 h) oder Maluswürfel (12 h) wie Inspirieren, alternativ Adrenalin auffüllen (ca. 1 h).", 181),
        ("Drift King", 5, 10, "Bodenfahrzeuge 4; GE 4", "Stuntproben +10 Punkte.", 181),
        ("Dual Wielding", 7, 15, "Waffenkampf 5; WA 3", "Mehrfachangriff mit zwei Nahkampfwaffen in einem Angriffswurf.", 181),
        ("Fast Talk", 7, 15, "Überreden 5; CH 5", "Je Aktion +2W auf die folgende Sozialfertigkeit, bis zu dreimal kumulativ.", 181),
        ("Fist of Rage", 7, 15, "Nahkampf 4; BE 4, WA 4", "Mehrfachangriff mit zwei waffenlosen Extremitäten.", 181),
        ("Goldene Zunge", 7, 15, "Inspirieren 4, Überreden 4; CH 5", "Soziale Proben auch in unpassenden Situationen; das angesprochene Ziel muss die Interaktion zulassen.", 181),
        ("Linguist", 7, 15, "WI 4; drei Sprachen auf 4", "Drei zusätzliche Sprachen auf Stufe 3 kostenlos.", 181),
        ("Meditation", 5, 10, "Willenskraft 6; WI 4", "Sonderattribut Meditation (Stufe 1, bei Erschaffung 5 GP je Stufe bis 5): wie Adrenalin, auch außerhalb von Stress; nicht kombinierbar.", 182, [mod("meditation", 1)]),
        ("Memorum [PSI-Kraft]", 7, 15, "PSI-Kraft 6; Willenskraft 5", "Haltungskosten aller Apps der gewählten Kraft −1 (min. 0). Je Kraft einmal.", 182),
        ("Metamorphose [Element]", 7, 15, "Pyro-, Cryo- oder Elektrokinese 6; Willenskraft 6; WI 4", "Als Aktion Körper mit dem Element überziehen: 5 Schaden bei Berührung, immun gegen das Element, −1W körperlich, +1 KS für passende Apps.", 182),
        ("Mixology", 7, 15, "GE 4, HA 4, WI 3", "Fertigkeit „Ambrosia“ (HA): Getränke mit Inspirieren-Bonus für zwei Stunden.", 182),
        ("Multiple Wielding", 7, 15, "Dual Wielding; Mehrgliedrig (Arme)", "Mehrfachangriff mit vier Nahkampfwaffen.", 182),
        ("Neo", 5, 10, "Computer 5; HA 3, WI 4", "Erfährt vor Computerproben Risiken und Mindestwurf und kann sich entscheiden.", 182),
        ("Pet Pal", 7, 15, "Dressieren 3, Menschenkenntnis 2, Naturkunde 4; WI 4", "Versteht animalische Sprache in Grenzen.", 182),
        ("Power Nap", 5, 10, "Ausdauer 3, Willenskraft 3; KO 3", "Halbstündiges Nickerchen erholt vollständig (max. 4 Tage am Stück); füllt den Regenerationspool mit Nahrung.", 183),
        ("Parkour", 7, 15, "Akrobatik 3, Klettern 3, Springen 3; BE 3", "Klettern- und Springen-Proben unter MW 30 gelingen automatisch; beim Sprungschaden Springen addieren.", 183),
        ("Psionische Vielfältigkeit", 7, 15, "3 PSI-Kräfte auf 3", "Weitere Ziele einer App möglich, je Ziel −1 effektive KS.", 183),
        ("Quadruple Akimbo", 7, 15, "Akimbo; Mehrgliedrig (Arme)", "Mehrfachangriff mit vier Fernkampfwaffen.", 183),
        ("Rage of Gods", 5, 10, "Adrenalin 3; Demigod", "Adrenalin auf Stärke(-Fertigkeiten) gibt zusätzlich +3W.", 183),
        ("Recoil Mastery", 5, 10, "Schießen 4; GE 4, ST 4", "Rückstoßdämpfung +2 (wird automatisch berücksichtigt).", 183),
        ("Rüttelflug", 5, 10, "Flügel; Ausdauer 4", "Fliegen auf der Stelle; Ausdauer-Probe = Dauer in KR.", 183),
        ("Shield Master", 7, 15, "Blocken 4; BE 3, WA 3", "Mehrfachangriffe mit einer Defensivaktion blocken (ohne Adrenalin).", 183),
        ("Sollbruchstelle", 5, 10, "Bodenfahrzeuge 4; WI 3", "Schaden am Fahrzeug senkt dessen Manöverwert um 1 ohne vitalen Treffer.", 183),
        ("Split", 10, 20, "Passend zum Hintergrund", "Weitere Persönlichkeit mit eigenen Fertigkeiten, PSI und Merkmalen (mehrfach wählbar).", 184),
        ("Sterne-Küche", 7, 15, "GE 4, HA 4, WI 3", "Fertigkeit „Kochen“ (HA): Speisen mit Inspirieren-Bonus für zwei Stunden.", 185),
        ("Storm of Fists", 7, 15, "Fist of Rage; Mehrgliedrig (Arme)", "Mehrfachangriff mit vier waffenlosen Extremitäten.", 185),
        ("Trickster", 5, 10, "Taschendiebstahl 3, Heimlichkeit 3; GE 4, WA 3", "Taschenspielertricks (MW 15); Entfesseln, Verstecken oder Taschendiebstahl einmal je KR ohne Aktion.", 185),
        ("Trigger Finger", 5, 10, "Schießen 3; GE 3", "Im HM-Modus einen Schuss mehr: +2W Angriff, +2 Rückstoß (Option im Angriffsdialog).", 185),
        ("Trusty Engineer", 5, 10, "HA 3, WI 3", "Crafting-Mindestwurf −5 (max. zwei Engineers).", 185),
        ("Waffenspezialisierung (Waffenart)", 5, 10, "GE 3, BE 3", "+1W auf alle Proben mit der Waffenart (auch Schaden). Waffenart im Namen in Klammern angeben, z. B. „Waffenspezialisierung (Pistole)“.", 185),
    ]
    for d in data:
        X.append(ss(*d))

    arts = {
        "Aikido": ("Defensive japanische Kampfkunst.", [("Nahkampf 2, Reaktion 4", "Paraden mit Nahkampf."), ("Ausweichen 4; BE 4", "Immer abrollen: Sturzschaden −20."), ("Nahkampf 5; ST 3", "Erfolgreiche Parade: ST+10 an zufälliger Zone des Angreifers.")]),
        "Ba-Kai-Do": ("Tierreich-Kampfkunst.", [("Nahkampf 4; BE 3", "Beißen ohne Kampfnachteil."), ("ST 5, KO 5", "Krallenangriffe +3W."), ("ST 7, KO 7", "Nahkampfschaden +5W.")]),
        "Boxen": ("Klassischer Faustkampf.", [("Nahkampf 2, Ausdauer 3; ST 3", "Faustschaden +3W."), ("Ausdauer 4, Nahkampf 3; BE 3", "Waffenlos Blocken +3W."), ("Nahkampf 4; BE 4, ST 4", "Faust-Treffer = zwei Treffer an zwei Zonen.")]),
        "Capoeira": ("Brasilianischer Kampftanz.", [("Akrobatik 3; BE 3", "Ausweichen im Nahkampf +3W."), ("Akrobatik 4, Nahkampf 3; ST 3", "Beinschaden +3W."), ("Akrobatik 5, Nahkampf 4; ST 3", "Beinangriffe +3W.")]),
        "Escrima": ("Philippinische Stock- und waffenlose Kunst.", [("Nahkampf 2, Waffenkampf 2; BE 3, WA 3", "Paraden mit Nahkampf oder Waffenkampf."), ("Nahkampf/Waffenkampf 3, Reaktion 4", "Nahkampf und Waffenkampf austauschbar."), ("Nahkampf/Waffenkampf 5", "Mehrfachangriffe +3W Angriff und Schaden.")]),
        "Gun-Fu": ("Feuerwaffen als Verlängerung der Arme.", [("Nahkampf 3, Schießen 3; WA 4", "Parade mit Nahkampf auch mit Feuerwaffen."), ("Nahkampf oder Schießen 4; BE 3", "Einhändige Waffen im Nahkampf mit Nahkampf (nur HM), kein Nachteil."), ("Nahkampf oder Schießen 6", "Mehrfachangriffe im Nahkampf +3W; kompatibel mit Akimbo.")]),
        "Jiu Jitsu": ("Fließende waffenlose Kunst der Samurai.", [("Nahkampf 2; BE 3, WA 3", "Paraden mit Nahkampf."), ("Nahkampf 3; BE 4", "Nahkampf +2W."), ("Nahkampf 4; ST 4", "Waffenloser Schaden +2W.")]),
        "Karate": ("Traditioneller unbewaffneter Kampf.", [("Blocken 2; KO 3", "Waffenlos Blocken +2W."), ("Nahkampf 3; KO 4", "Nahkampf +2W."), ("Nahkampf 5; ST 4", "Waffenloser Schaden +4W.")]),
        "Kenjutsu": ("Japanische Schwertkunst.", [("Waffenkampf 3; BE 4", "Schwert ziehen und in derselben Aktion angreifen."), ("Reaktion 4; WA 3", "Angriffe und Paraden mit Klingen +2W."), ("Waffenkampf 5", "Erfolgreiche Parade verursacht Klingenschaden am Angreifer.")]),
        "Kick-Boxen": ("Schläge und Tritte.", [("Ausdauer 2, Nahkampf 2; ST 3", "Treffer an den Beinen: +3W Widerstand."), ("Nahkampf 3; KO 4", "Faust-/Beinangriffe +2W Schaden."), ("Nahkampf 4; Schmerztoleranz 5", "Waffenlos Blocken +3W.")]),
        "Krav Maga": ("Schnell und tödlich.", [("Blocken 2, Nahkampf 2; ST 3", "Nahkampf statt Blocken."), ("Nahkampf 3; WA 3", "Knieangriffe +2W Angriff und Schaden."), ("Nahkampf 3; BE 3", "Nahkampf +2W.")]),
        "Muay Thai": ("Fäuste, Ellenbogen, Knie, Schienbeine.", [("Nahkampf 3; KO 4", "Blocken im Nahkampf +3W."), ("Akrobatik 2; BE 3, ST 3", "Ellenbogen/Knie/Schienbein-Schaden +3W."), ("Akrobatik 4, Nahkampf 5, Springen 4", "Diese Angriffe +3W.")]),
        "Ringen": ("Körperkontakt und Hebel.", [("Nahkampf 3; ST 3", "Clinch statt Schaden: Ziel im Nachteil, Befreiung per ST-Vergleich (Aktion)."), ("Nahkampf 4; BE 3", "Im Clinch +3W Stärke, selbst unbehindert."), ("Nahkampf 5; BE 4, ST 4", "Im Clinch +2W Nahkampf und Schaden.")]),
        "Sado": ("Kampfkunst der „Zeugen“.", [("Nahkampf 5; BE 4; Zeugen", "Gute Treffer bereits je 5 Punkte Überschuss (automatisch)."), ("Nahkampf 6, Reaktion 5", "Nahkampf +3W."), ("BE 5, ST 5", "Parade mit Nahkampf; Nahkampfwaffen mit Nahkampf führen.")]),
        "Tae-Kwon-Do": ("Koreanische Tritttechniken.", [("Akrobatik 2, Nahkampf 3; BE 3", "Beinangriffe +3W."), ("Akrobatik 3, Nahkampf 5", "Beinschaden +3W."), ("Akrobatik 4; ST 4, BE 4", "Bein-Treffer = zwei Treffer an zwei Zonen.")]),
        "ZPC (Zentrum Power Combat)": ("Militärische Kampfkunst des Zentrums.", [("Nahkampf 2; ST 4 (Arm & Bein)", "Nahkampf mit linkem Arm/Bein +3W."), ("Nahkampf 4; BE 4 (Arm & Bein)", "Schaden mit linkem Arm/Bein +3W."), ("Reaktion 3; WA 4", "Paraden mit Nahkampf.")]),
    }
    for name, (desc, levels) in arts.items():
        X.append({"name": name, "type": "styleSkill", "img": icon("weapons/fist", "boxing") if name == "Boxen" else icon("svg", "combat"),
                  "system": {"key": STYLE_KEYS[name], "kind": "kampfkunst", "gp": 5, "ep": 10, "level": 1, "prerequisites": levels[0][0],
                             "levels": [{"prerequisites": pr, "effect": ef} for pr, ef in levels], "modifiers": [],
                             "description": p(desc + " Jede Stufe kostet 5 GP / 10 EP; Stufe im Itembogen setzen.", 186)}})
    for x in X:
        ex = STYLE_EXTRA.get(x["name"])
        if not ex:
            continue
        sysd = x["system"]
        if "mods" in ex:
            sysd["modifiers"] = ex["mods"]
        if "hint" in ex:
            sysd["hint"] = p(ex["hint"])
        if "uses" in ex:
            sysd["uses"] = {"max": ex["uses"][0], "value": ex["uses"][0], "per": ex["uses"][1]}
    return X


def special_skills():
    K = []

    def sk(name, cat, attr, value, desc, page, defensive=False, native=False):
        return {"name": name, "type": "skill", "img": icon("svg", "book" if cat != "sprache" else "sound"),
                "system": {"category": cat, "attribute": attr, "value": value, "defensive": defensive, "native": native, "description": p(desc, page)}}

    K.append(sk("Babel (Muttersprache)", "sprache", "", 5, "Weltweite Verkehrssprache des Zentrums. Muttersprache kostenlos auf Stufe 5 (bei WI 1 nur Stufe 2).", 112, native=True))
    K.append(sk("Verbotene Sprache", "sprache", "", 1, "Vom Zentrum verbotene, in Familien überlieferte Sprache (in Absprache mit der SL). 2 GP je Stufe.", 112))
    K.append(sk("Fliegen", "besondere", "be", 1, "Durch Flügel. MW 5 zum Fliegen, Geschwindigkeit = Wurf × 2 m/KR.", 162))
    K.append(sk("Gleiten", "besondere", "be", 1, "Durch Flughäute/Schwingen. MW 5, Wurf × 2 m/KR.", 163))
    K.append(sk("Instinkt", "besondere", "", 6, "CT-Virus: Instinkt der Bestie (CT3/4: 6, CT5/6: 5).", 151))
    K.append(sk("Elektroschock (Schaden)", "besondere", "", 2, "Schadenswert des Elektroschocks (ohne Attribut).", 165))
    K.append(sk("Spinnenseide (Werfen)", "besondere", "ge", 1, "Angriffswurf mit Spinnenseide wie Schießen, bis 30 m.", 168))
    K.append(sk("Spinnenseide (Stabilität)", "besondere", "st", 1, "Klebekraft und Reißfestigkeit.", 168))
    K.append(sk("Körpergeschosse", "besondere", "", 2, "Schaden der Stachelgeschosse (ohne Attribut, je Treffer neu).", 169))
    K.append(sk("Odemwaffe (Feuer)", "besondere", "ge", 1, "Angriffswurf mit der Odemwaffe wie Sprühwaffen (SP 6/6).", 168))
    K.append(sk("Odemwaffe (Säure)", "besondere", "ge", 1, "Angriffswurf mit der Odemwaffe wie Sprühwaffen (SP 6/6).", 168))
    K.append(sk("Ambrosia", "fertigkeit", "ha", 1, "Durch Mixology: Getränke mit Inspirieren-Bonus.", 182))
    K.append(sk("Kochen", "fertigkeit", "ha", 1, "Durch Sterne-Küche: Speisen mit Inspirieren-Bonus.", 185))
    return K
