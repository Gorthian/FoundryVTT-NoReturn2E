# -*- coding: utf-8 -*-
"""Arsenal & Ausrüstung – NoReturn 2E Corebook, Kapitel 6–7 und 5.
Werte aus den Waffen- und Rüstungsprofilen, Beschreibungen als Kurzfassung."""
from .common import icon, p

S = 226  # Seitenanker

def weapon(name, cat, *, st=False, pts=0, formula="", atk=0, parry=0, block=0, modes=(), rd=0, rdf=0,
           ammo=0, cont="m", rng=None, ts=1, price=0, weight=0.0, dtype="wucht", pierce="", features="",
           desc="", img=None, nl=False, cont_dmg=False, area=False, spray=(0, 0), minst=0, stability=0, mk="",
           skill="", structure=False, page=None, equipped=False):
    system = {
        "category": cat, "skill": skill, "damageType": dtype,
        "damage": {"strength": st, "points": pts, "formula": formula, "structure": structure,
                   "nonLethal": nl, "continuous": cont_dmg, "area": area, "pierce": pierce},
        "attackDice": atk, "parryDice": parry, "blockDice": block, "stability": stability, "mk": mk,
        "modes": list(modes), "rd": rd, "rdFolded": rdf,
        "ammo": {"value": ammo, "max": ammo, "container": cont, "type": ""},
        "range": rng or {"faustfeuer": "pistole", "gewehr": "sturmgewehr", "schnellfeuer": "sturmgewehr", "gatling": "gatling",
                         "schwer": "granatwerfer", "wurf": "wurf", "projektil": "armbrust", "geschuetz": "geschuetz",
                         "spruehwaffe": "variabel"}.get(cat, "none"),
        "spray": {"range": spray[0], "diameter": spray[1]}, "minStrength": minst, "features": features,
        "quantity": 1, "weight": weight, "ts": ts, "price": price, "equipped": equipped,
        "description": p(desc, page)
    }
    return {"name": name, "type": "weapon", "img": img or icon("svg", "sword"), "system": system}


def weapons():
    W = []
    # ---- Waffenlos
    W.append(weapon("Waffenloser Angriff", "unbewaffnet", st=True, pts=0, dtype="wucht", ts=0,
                    img=icon("weapons/fist", "boxing"), equipped=True,
                    desc="Faust, Tritt oder Kopfstoß. Schaden ist eine reine Stärke-Probe. Körpereigene Waffen (Biss, Krallen) erhalten +10 Punkte (S. 101).", page=93))
    # ---- Körpereigene Waffen aus biologischen Eigenschaften / Robotischer Adaption (S. 163–164)
    for n, pts, atk, dt, ik, ds in [("Krallen (körpereigen)", 20, 1, "klinge", "claw", "Krallen, Klauen oder scharfe Nägel: Nahkampf +1W, Schaden ST+20p. (S. 163)."),
                                    ("Biss (körpereigen)", 30, 0, "stich", "fangs", "Scharfe Zähne oder Schnabel: Biss ST+30p. (mit zermalmendem Kiefer ST+40p. – Punkte anpassen) (S. 164)."),
                                    ("Hornstoß (körpereigen)", 30, 0, "stich", "horn", "Horn, Hörner oder Stoßzähne: ST+30p., durch Anlauf erhöht (S. 163)."),
                                    ("Großer Stachel (körpereigen)", 30, 0, "stich", "spike", "Einzelner großer Stachel: ST+30p. offensiv (S. 164). Ersetzt den defensiven Rückschaden der Stacheln.")]:
        W.append(weapon(n, "unbewaffnet", st=True, pts=pts, atk=atk, dtype=dt, ts=0, equipped=True,
                        img=icon("weapons/fist", "boxing"), desc=ds + " Gilt auch als robotische Version für Erwachte.", page=163))
    # ---- Faustkampfwaffen (S. 226)
    fk = [("Klingeneinsatz", 1, 35, 0.3, 3, 2500, "klinge", "dagger", "Ausklappbare Klinge in Handschuh oder Stiefel, bis 30 cm, per Muskelkontraktion ausgelöst."),
          ("Messer", 1, 15, 0.2, 1, 60, "klinge", "dagger", "Schlichtes Klapp- oder feststehendes Messer."),
          ("Sai-Gabeln", 1, 30, 0.5, 2, 470, "stich", "dagger", "Seltene Kampfkunstwaffe."),
          ("Schlagring", 0, 20, 0.1, 1, 90, "wucht", "brass", "Schlagring oder Nietenhandschuh."),
          ("Überlebensmesser", 2, 25, 0.5, 2, 200, "klinge", "dagger", "25 cm Kampf- und Überlebensmesser mit Sägerücken und Glasbrecher.")]
    for n, a, d, w, t, pr, dt, ik, ds in fk:
        W.append(weapon(n, "faustkampf", st=True, pts=d, atk=a, weight=w, ts=t, price=pr, dtype=dt,
                        img=icon("weapons/fist" if ik == "brass" else "weapons/daggers", ik), desc=ds + " Wird mit Nahkampf geführt, geworfen mit Wurfwaffen.", page=226))
    # ---- Nahkampfwaffen (S. 226–227)
    nk = [("Baseballschläger", 1, 1, 20, 1.0, 1, 100, "wucht", "", ("weapons/clubs", "baseball"), "Auch Knüppel und Kampfstöcke."),
          ("Eispickel", 1, 0, 35, 0.7, 1, 500, "wucht", "", ("weapons/axes", "pick"), "Wie eine Hacke eingesetzt."),
          ("Feuerwehraxt", 1, 1, 40, 2.9, 2, 500, "wucht", "", ("weapons/axes", "axe"), "Findet sich in verlassenen öffentlichen Gebäuden."),
          ("Katana", 2, 2, 40, 1.1, 2, 1000, "klinge", "", ("weapons/swords", "katana"), "Katana oder Langschwert – schnell und vorteilhaft."),
          ("Kette", 1, 0, 20, 2.0, 1, 100, "wucht", "", ("weapons/maces", "flail"), "Kette oder Stahlseil."),
          ("Kriegshammer", 1, 1, 30, 2.5, 2, 750, "wucht", "A", ("weapons/hammers", "hammer"), "Brachial, einhändig. Ignoriert Rüstung MK:A."),
          ("Kurzschwert", 1, 1, 30, 0.9, 2, 600, "klinge", "", ("weapons/swords", "short"), "Auch Florett oder Rapier."),
          ("Metallstange", 1, 1, 25, 1.5, 1, 100, "wucht", "", ("weapons/clubs", "club"), "Günstigste effektive Nahkampfwaffe."),
          ("Monofilamentschwert", 2, 2, 55, 1.5, 5, 15000, "klinge", "", ("weapons/swords", "sword"), "Zentrums-Hightech. Jede Waffenkampf-Probe unter 15 verletzt den Nutzer selbst."),
          ("Morgenstern", 2, 0, 35, 3.6, 2, 700, "wucht", "", ("weapons/maces", "morning"), "Stachelkugel an einer Kette."),
          ("Peitsche", 0, 0, 10, 0.8, 2, 120, "wucht", "", ("weapons/misc", "whip"), "Geflochtenes Leder."),
          ("Schwert", 2, 2, 35, 1.2, 2, 900, "klinge", "", ("weapons/swords", "sword"), "Der Allrounder für den Alltag."),
          ("Speer", 2, 2, 30, 2.2, 1, 500, "stich", "", ("weapons/polearms", "spear"), "1,5–2 m mit Metallspitze."),
          ("Stockdegen", 1, 1, 30, 1.0, 3, 1500, "stich", "", ("weapons/swords", "rapier"), "Edel, nobel, schweineteuer."),
          ("Streitkolben", 1, 1, 35, 2.3, 2, 650, "wucht", "", ("weapons/maces", "mace"), "Stachelbewehrte Keule."),
          ("Zweihänder", 2, 2, 45, 3.5, 2, 1500, "klinge", "", ("weapons/swords", "greatsword"), "Extreme Reichweite, zerschmetternder Schaden.")]
    for n, a, pa, d, w, t, pr, dt, pc, ik, ds in nk:
        W.append(weapon(n, "nahkampf", st=True, pts=d, atk=a, parry=pa, weight=w, ts=t, price=pr, dtype=dt, pierce=pc,
                        img=icon(*ik), desc=ds + (" Angriffs-/Paradebonus." if pa else ""), page=226))
    W.append(weapon("Kettensäge", "nahkampf", st=True, pts=60, atk=-2, weight=6.9, ts=3, price=1200, dtype="klinge",
                    img=icon("tools/hand", "saw"), features="Diezin, 0,01 l je KR, 1 l Tank",
                    desc="40 cm Schwert. Schwer und für den bewaffneten Nahkampf schlecht geeignet (−2W auf Angriffe).", page=265))
    W.append(weapon("Bajonett", "nahkampf", st=True, pts=20, weight=0.3, ts=2, price=100, dtype="stich", img=icon("weapons/daggers", "dagger"),
                    desc="Messeraufsatz für Gewehre mit Klickdrehverschluss.", page=242))
    # ---- Schilde (S. 229)
    for n, b, stab, mk, w, t, pr, ds in [("Junk Shield", 2, 40, "B", 4, 1, 150, "Aus Müll gebaut, ca. 40 cm."),
                                          ("Rundschild", 2, 50, "B", 2, 1, 650, "Holz mit Grollhornleder-Riemen, ca. 50 cm."),
                                          ("Ballistisches Schild", 3, 60, "B", 10, 3, 2400, "Kevlar-Turmschild 1,2 m × 50 cm, schwer."),
                                          ("TC Sturmschild", 3, 60, "C", 5, 4, 6500, "Klappbares Hightech-Schild der Zentrumstruppen; Aus-/Einklappen kostet eine Aktion.")]:
        W.append(weapon(n, "schild", block=b, stability=stab, mk=mk, weight=w, ts=t, price=pr, img=icon("equipment/shield", "buckler" if w < 5 else "scutum"),
                        desc=ds + " Bonus auf Blocken; ohne 20 Punkte Überschuss leidet die Stabilität, überschüssiger Schaden trifft den Schildarm. Körperliche Aktionen mit Schild: Kampfnachteil.", page=229))
    # ---- Wurfwaffen (S. 229–230)
    for n, d, w, t, pr, dt, ik, ds in [("Bola", 20, 1.5, 1, 200, "wucht", "bolas", "Umwickelt die Beine und bringt das Ziel zu Fall."),
                                        ("Bumerang", 15, 0.8, 1, 300, "wucht", "boomerang", "Zurückkehrend (Kampfnachteil) oder Jagdversion (Reichweite ST×4/8/11/16 m)."),
                                        ("Klingen-Bumerang", 30, 1.2, 2, 400, "klinge", "boomerang", "Bumerang mit Klingen."),
                                        ("Shuriken", 15, 0.1, 2, 100, "scharf", "shuriken", "Mit Kampfnachteil zwei auf dasselbe Ziel: ein Angriffswurf, Schaden zweimal."),
                                        ("Wurfaxt", 25, 1.0, 1, 100, "wucht", "axe", "Kopflastig, schnelle Rotation."),
                                        ("Wurfmesser", 15, 0.2, 1, 50, "scharf", "dagger", "Auch im Nahkampf einsetzbar."),
                                        ("Wurfspeer", 20, 0.5, 1, 80, "stich", "javelin", "Köcher für 10 Speere 50 N$."),
                                        ("Kreissägenblätter", 20, 0.2, 2, 50, "scharf", "disc", "Wurfwaffen-Probe unter 15: 20 Schaden an der eigenen Handfläche."),
                                        ("Mauerstein", 20, 1.5, 1, 0, "wucht", "stone", "Ca. 1,5 kg. Einzeln geschenkt.")]:
        W.append(weapon(n, "wurf", st=True, pts=d, weight=w, ts=t, price=pr, dtype=dt, img=icon("weapons/thrown", ik), desc=ds, page=229))
    # ---- Handgranaten als Wurfwaffen (S. 242)
    for n, d, rad, t, pr, dt, extra in [("Sprenggranate", 100, "1W6+3 m", 2, 50, "explosiv", ""),
                                        ("Splittergranate", 60, "3W6 m", 2, 50, "explosiv", ""),
                                        ("Mikrowellengranate", 50, "2W6+10 m", 4, 250, "explosiv", "Ignoriert Rüstung."),
                                        ("Giftgasgranate", 35, "5W6+10 m", 3, 60, "gift", "Schädigt Zonen 6, 8, 12 ohne Helm/Atemschutz."),
                                        ("Thermorauchgranate", 0, "5W6+10 m", 2, 30, "explosiv", "Geruch und optische Wahrnehmung −4W im Rauch.")]:
        W.append(weapon(n, "wurf", pts=d, ts=t, price=pr, dtype=dt, area=d > 0, pierce="all" if "Mikrowellen" in n else "",
                        features=f"Radius {rad}; Aufprall- oder Zeitzünder (3-Sek.-Stufen)", weight=0.4,
                        img=icon("weapons/thrown", "grenade"), desc=f"Wurfgranate. Detonationsradius {rad}. {extra} Schaden trifft alle Körperzonen (Flächeneffekt, Springen/Akrobatik als Defensivaktion).", page=242))
    # ---- Faustfeuerwaffen (S. 231–233)
    ff = [("Barret 90B", "Pistole", 24, "HM", 3, 0, 15, 0.6, 2, 600, "", "Evergreen der Kleinkaliber."),
          ("Kraft P14", "Pistole", 30, "HM", 1, 0, 18, 0.7, 2, 400, "", "Nachfolger der P11 mit mehr Durchschlagskraft."),
          ("Trueshot F2", "Pistole", 24, "HM", 3, 0, 18, 0.8, 2, 600, "Laufintegrierter Laserpointer", "Präzision mit Laser-Zielmarkierer."),
          ("Walter Combat Pistol", "Pistole", 30, "HM,SM", 2, 0, 12, 1.0, 3, 750, "Laserpointer, Schalldämpfer", "Verdeckte Operationen, einzigartiger Feuerstoßmodus."),
          ("Outback Eagle", "Schwere Pistole", 35, "HM", 2, 0, 16, 1.2, 3, 990, "", "11-mm-Wüstenadler an der Spitze der Top-10."),
          ("Vulture X", "Schwere Pistole", 36, "HM", 2, 0, 14, 1.3, 3, 940, "", "Verchromte Neuauflage, höchste Durchschlagskraft."),
          ("Widowmaker 13", "Schwere Pistole", 33, "HM", 2, 0, 13, 0.9, 3, 700, "Säureresistent, wasserdicht", "Rarität in Gold oder Silber."),
          ("Kraft R11", "Revolver", 30, "HM", 2, 0, 6, 0.5, 2, 560, "", "Klassischer Sechs-Schuss-Trommelrevolver."),
          ("Peacemaker", "Revolver", 34, "HM", 1, 0, 6, 0.7, 2, 610, "", "Beendet Diskussionen mit einem Knall."),
          ("New Magnum V8", "Revolver", 40, "HM", 2, 0, 8, 1.0, 2, 1050, "", "Der dickste Revolver des Marktes, 11 mm."),
          ("TC Vario", "Schwere Pistole", 40, "HM", 3, 0, 15, 1.3, 4, 5300, "Säureresistent, wasserdicht, Schalldämpfer, Helm-Zieloptik, 2 Magazine mit Munitionswahl", "Einsatzpistole des Zentrums (Ladung 2× 15)."),
          ("Coilgun G7", "Gauss-Pistole", 25, "SM", 6, 0, 30, 1.2, 3, 1200, "Helm-Zieloptik (Rotpunkt)", "Gauss-Präzisionspistole, 4,6 mm, hohe Kadenz.")]
    for n, kind, d, m, rd, rdf, am, w, t, pr, feat, ds in ff:
        W.append(weapon(n, "faustfeuer", pts=d, modes=m.split(","), rd=rd, ammo=am, cont="t" if kind == "Revolver" else "m", weight=w, ts=t, price=pr,
                        dtype="projektil", features=feat, img=icon("weapons/guns", "pistol"), desc=f"{kind}. {ds}", page=231))
    mp = [("HK J4", "Leichte MP", 27, "HM,SM", 3, 4, 30, 0.9, 3, 550, "Laserpointer, ausklappbarer Unterlaufgriff", "Dezent mit enormer Feuerrate; 15-Schuss-Magazin möglich (0,7 kg)."),
          ("Furioso 9SSA", "MP", 30, "HM,SM,VM", 3, 0, 40, 3.1, 2, 510, "", "MP der ersten Generation, massiv und effektiv."),
          ("Mikata 9000", "MP", 26, "HM,SM", 3, 4, 50, 3.3, 2, 900, "Vorderlaufgriff; nie Nachteile von Taped Ware", "Äußerst robust, beliebt bei Söldnern."),
          ("HMP 25", "Schwere MP", 35, "SM,VM", 3, 5, 25, 3.6, 3, 1100, "Vorderlaufgriff, ausklappbare Schulterstütze", "Gigantisches Kaliber, klingt wie Donner.")]
    for n, kind, d, m, rd, rdf, am, w, t, pr, feat, ds in mp:
        W.append(weapon(n, "faustfeuer", pts=d, modes=m.split(","), rd=rd, rdf=rdf, ammo=am, weight=w, ts=t, price=pr, dtype="projektil",
                        features=feat, img=icon("weapons/guns", "gun"), desc=f"{kind}. {ds}", page=233))
    W.append(weapon("Robin 17", "projektil", pts=25, modes=["HM"], rd=1, ammo=3, rng="handarmbrust", weight=0.6, ts=2, price=900, dtype="stich",
                    features="Vorderlaufgriff, ausklappbare Schulterstütze, Schnelllademagazin", img=icon("weapons/crossbows", "crossbow"),
                    desc="Handarmbrust mit Schnellladermagazin, lautlos über weite Distanzen.", page=233))
    # ---- Gewehre (S. 234–235)
    gw = [("Maneater AX", "shotgun", 48, "HM", 1, 2, 8, 3.6, 2, 900, "Ausklappbare Schulterstütze; darf Schrot als Erstbestückung wählen", "Shotgun für wenig erfahrene Schützen."),
          ("Granit M12", "shotgun", 52, "HM", 2, 0, 8, 4.0, 2, 1000, "Rotpunktvisier, Unterlaufgriff", "Kurz geschnittene, brachiale Shotgun."),
          ("Shotgunaxt „Five“", "shotgun", 54, "HM", 1, 0, 6, 5.8, 3, 1300, "Axt-Funktion: Angriff +1W, Schaden ST+40p. (Wechsel ohne Aktion)", "Schrotflinten-Axt. Brutal."),
          ("Remington AS 5400", "shotgun", 55, "SM", 3, 0, 18, 4.5, 3, 1200, "Unterlaufgriff, Schulterstütze", "Sturmschrotflinte – ein Schlachtschiff."),
          ("Bowser B17", "scharfschuetze", 65, "HM", 2, 0, 10, 11.5, 3, 950, "Schulterstütze, Zielfernrohr", "Manuell nachgeladenes Unikat-Scharfschützengewehr."),
          ("Sieg SSG 3000", "scharfschuetze", 60, "HM", 2, 3, 12, 12.9, 2, 1000, "Schulterstütze, Schalldämpfer, Zielfernrohr, Zweibein, demontierbar", "Militärisches Scharfschützengewehr."),
          ("TC Sanctum (SSG)", "scharfschuetze", 70, "SM", 2, 3, 30, 13.5, 4, 15000, "Zielerfassung (+2W bereits enthalten), 20× Zoom, Nacht-/Thermalsicht, Zweibein, 2 Magazine", "Hightech-Scharfschützengewehr von TC (Ladung 2× 15).")]
    for n, rng, d, m, rd, rdf, am, w, t, pr, feat, ds in gw:
        W.append(weapon(n, "gewehr", pts=d, modes=m.split(","), rd=rd, rdf=rdf, ammo=am, rng=rng, weight=w, ts=t, price=pr, dtype="projektil",
                        atk=2 if "Sanctum" in n else 0, features=feat, img=icon("weapons/guns", "rifle" if rng != "shotgun" else "double"),
                        desc=ds, page=234))
    W.append(weapon("Black.Long.Snake", "gewehr", pts=0, formula="1d2", structure=True, modes=["HM"], rd=2, ammo=5, rng="scharfschuetze",
                    atk=2, weight=15.5, ts=5, price=27900, dtype="explosiv", features="Zielerfassung (+2W), Zielfernrohr, als Rucksack faltbar (2 KR); Munition ARES",
                    img=icon("weapons/guns", "heavy"), desc="Tragbares Panzerabwehrgewehr (Infantry Anti-Tank Rifle). Schaden 1W2 Strukturschaden (1–3 = 1, 4–6 = 2).", page=235))
    sf = [("Carbine F22", 40, "HM,SM", 4, 0, 90, 4.0, 3, 950, "Rotpunktvisier, Schulterstütze", "Hochwertiges Sturmgewehr für verdeckte Operationen."),
          ("Kalaschnistuff KA17", 37, "HM,SM", 2, 0, 60, 3.9, 2, 810, "Schulterstütze; nie Nachteile von Taped Ware", "Billig und unkaputtbar."),
          ("Military Combat", 40, "HM,SM,VM", 2, 0, 60, 4.8, 3, 1200, "Rotpunktvisier, Schulterstütze, Unterlaufgranatwerfer (HM, RD 1, 2 Granaten)", "Das Must-have für Söldner."),
          ("TC-Storm", 45, "HM,SM,VM", 2, 6, 60, 5.3, 4, 8000, "Rotpunkt, Schalldämpfer, Schulterstütze, Unterlaufgriff, Unterlaufgranatwerfer (4 Granaten); nie Taped-Nachteile", "Ehemaliges Standard-Kombigewehr der Zentrumsstreitkräfte."),
          ("HKL 45B", 40, "SM,VM", 3, 4, 200, 10.5, 2, 1100, "Schulterstütze/Hüftpolster, Zweibein; Kette", "Leichtes Maschinengewehr, Feuer aus der Hüfte."),
          ("Frontier B2", 45, "VM", 3, 5, 200, 13.6, 2, 2500, "Hüftpolster, Zweibein; Kettenmunition", "Schweres MG, nur vollautomatisch.")]
    for n, d, m, rd, rdf, am, w, t, pr, feat, ds in sf:
        W.append(weapon(n, "schnellfeuer", pts=d, modes=m.split(","), rd=rd, rdf=rdf, ammo=am, cont="k" if am >= 200 else "m", weight=w, ts=t, price=pr,
                        dtype="projektil", features=feat, img=icon("weapons/guns", "gun"), desc=ds, page=235))
    W.append(weapon("Buster Gatling Gun", "gatling", pts=45, modes=["GM"], rd=7, rdf=10, ammo=900, cont="k", weight=17, ts=3, price=11800, dtype="projektil",
                    features="Hüftpolster, Haltegriff, Mündungsdämpfer, Dreibein", img=icon("weapons/guns", "gatling"),
                    desc="Mini-Gun. Eine Aktion zum Warmlaufen, dann zwei Aktionen zum Feuern. Ignoriert MK:A, trifft alle Körperzonen.", page=236))
    # ---- Schwere Waffen
    for n, m, rd, am, cont, w, t, pr, rng, feat, ds in [
            ("G15", "HM", 2, 10, "t", 7.2, 2, 1450, "granatwerfer", "Schulterstütze", "Granatwerfer von Wesker mit Trommel für zehn Granaten."),
            ("G8 „Hardy“", "HM", 1, 2, "i", 1.1, 2, 850, "granatwerfer", "Schulterstütze, Knicklader", "Pistolengroßer Granatwerfer."),
            ("Rocky B52", "HM", 2, 2, "i", 2.3, 3, 1300, "variabel", "", "Raketenwerfer im Faustfeuerwaffen-Format."),
            ("MARS R2", "HM", 3, 10, "m", 6.6, 3, 8500, "variabel", "Zielerfassung (Zoom 20×), 2 Magazine à 5", "Eine der schwersten Bewaffnungen der Straße.")]:
        W.append(weapon(n, "schwer", modes=[m], rd=rd, ammo=am, cont=cont, rng=rng, weight=w, ts=t, price=pr, dtype="explosiv", area=True,
                        features=feat + "; Schaden gemäß Granate/Rakete", img=icon("weapons/artillery", "cannon"),
                        desc=ds + " Beim Angriff die Granate bzw. Rakete aus dem Inventar wählen – deren Schaden gilt.", page=236))
    # ---- Sprühwaffen (S. 237)
    W.append(weapon("Pfefferspray", "spruehwaffe", pts=15, modes=["SP"], rd=1, ammo=10, cont="i", spray=(4, 1), weight=0.1, ts=2, price=100, dtype="saeure",
                    img=icon("weapons/guns", "sprayer"), desc="Treffer in die Augen: zusätzlich 3W6 KR −4W auf optische Wahrnehmung. Weichteilbonus enthalten.", page=237))
    W.append(weapon("Burn Barry Flammenwerfer", "spruehwaffe", pts=20, modes=["SP"], rd=1, ammo=50, cont="l", spray=(10, 4), weight=3.6, ts=2, price=1500,
                    dtype="hitze", cont_dmg=True, img=icon("weapons/guns", "flamethrower"), desc="Tragbarer Flammenwerfer, kurze Feuerstöße, 10 m.", page=237))
    W.append(weapon("Phönix 46", "spruehwaffe", pts=40, modes=["SP"], rd=1, ammo=25, cont="l", spray=(30, 10), weight=29.1, ts=2, price=9200,
                    dtype="hitze", cont_dmg=True, img=icon("weapons/guns", "flamethrower"), desc="Schwerer Flammenwerfer mit 25-Liter-Rucksacktank, bis 30 m.", page=237))
    # ---- Bögen (S. 237–238)
    for n, base, rng, w, t, pr, ds in [("Langbogen", 10, "langbogen", 2.5, 1, 400, "Schaden = Mindeststärke × 5 + 10."),
                                        ("Recurvebogen", 5, "recurve", 1.2, 2, 450, "Schaden = Mindeststärke × 5 + 5."),
                                        ("Compoundbogen", 20, "compound", 0.8, 3, 900, "Schaden = Mindeststärke × 5 + 20; Mindeststärke nachträglich anpassbar.")]:
        W.append(weapon(n, "projektil", pts=3 * 5 + base, modes=["HM"], rd=1, ammo=1, cont="a", rng=rng, minst=3, weight=w, ts=t, price=pr, dtype="stich",
                        img=icon("weapons/bows", "longbow" if "Lang" in n else "bow"), features="Mindeststärke 3 (Schaden bei anderer Mindeststärke anpassen)",
                        desc=ds + " Unterschreitet die Stärke die Mindeststärke: je Punkt −10 Schaden und −2W Angriff.", page=237))
    W.append(weapon("Armbrust", "projektil", pts=30, modes=["RM"], rd=1, ammo=1, cont="a", rng="armbrust", weight=3, ts=1, price=500, dtype="stich",
                    img=icon("weapons/crossbows", "crossbow"), desc="Klassische Armbrust (Werte als Richtwert, siehe Reichweitentabelle S. 94).", page=94))
    # ---- Geschütze (S. 238)
    W.append(weapon("MGW 5 „Tombstone“", "geschuetz", modes=["SM"], rd=3, rdf=7, ammo=36, cont="k", weight=35, ts=4, price=69000, dtype="explosiv", area=True,
                    features="Zielerfassung (Nacht, Thermal, 10× Zoom), Dreibein 15 kg; 40-mm-AF-Granaten", img=icon("weapons/artillery", "cannon"),
                    desc="Maschinengranatwerfer, ursprünglich fahrzeugmontiert.", page=238))
    W.append(weapon("K30 CMG", "geschuetz", modes=["HM"], rd=1, ammo=1, cont="i", weight=16.5, ts=3, price=12900, dtype="explosiv", area=True,
                    features="Zielerfassung; K2-Granaten; Reichweite 10× Granatwerfer; getragen +6 Rückstoß", img=icon("weapons/artillery", "cannon"),
                    desc="Kompakter Mörser. Montage/Demontage je 2 KR. Angriffe mit Kampfnachteil. Militärische Ausrüstung.", page=238))
    return W


def ammo_item(name, kind, *, bonus=0, atk=0, recoil=0, pierce="", nodmg="", dmg="", radius="", structure=False,
              cont=False, nl=False, ts=2, price=0, qty=10, desc="", page=239, img=None):
    return {"name": name, "type": "ammo", "img": img or icon("weapons/ammunition", "clip" if kind == "patrone" else "arrow" if kind == "projektil" else "bullet"),
            "system": {"ammoType": kind, "damageBonus": bonus, "attackDice": atk, "recoil": recoil, "pierce": pierce, "noDamageVs": nodmg,
                       "damage": dmg, "radius": radius, "structure": structure, "continuous": cont, "nonLethal": nl,
                       "quantity": qty, "ts": ts, "price": price, "description": p(desc, page)}}


def ammunition():
    A = []
    A.append(ammo_item("Vollmantelgeschosse (FM)", "patrone", ts=2, price=10, desc="Klassische Every-Day-Munition. Schachtel à 10."))
    A.append(ammo_item("Hülsenlose Munition", "patrone", ts=3, price=20, desc="Hülsenlose Vollmantel-Variante."))
    A.append(ammo_item("Schrot-/Splitterprojektile (SP)", "patrone", bonus=-10, atk=2, price=20, desc="Schaden −10, dafür +2W Angriff durch Streuung."))
    A.append(ammo_item("Gelprojektile (GP)", "patrone", nl=True, price=20, desc="Kein körperlicher Schaden; nur um zu ermitteln, ob das Ziel durch Schmerz bewusstlos wird (als NL behandelt)."))
    A.append(ammo_item("Hohlspitzgeschosse (HS)", "patrone", bonus=10, nodmg="B", price=20, desc="+10 Schaden, aber kein Schaden gegen MK:B und höher."))
    A.append(ammo_item("Brandprojektile (BP)", "patrone", cont=True, ts=3, price=30, desc="Kein Bonusschaden. Entzündet Ziele bis MK:A: 5W andauernder Hitzeschaden."))
    A.append(ammo_item("Armor Piercing Capped (APC)", "patrone", pierce="A", ts=3, price=50, desc="Ignoriert Rüstung MK:A."))
    A.append(ammo_item("High Explosive (HE)", "patrone", bonus=20, ts=4, price=180, desc="+20 Schaden, detoniert im Radius von ca. 30 cm."))
    A.append(ammo_item("Armor Piercing Discarding Sabot (APDS)", "patrone", bonus=5, recoil=2, pierce="B", ts=4, price=190, desc="+5 Schaden, +2 Rückstoß, ignoriert MK:B."))
    A.append(ammo_item("TC HEAT-Geschoss", "patrone", bonus=30, recoil=5, pierce="C", ts=5, price=1000, desc="+30 Schaden, +5 Rückstoß, ignoriert MK:C. Dem Zentrumsmilitär vorbehalten."))
    A.append(ammo_item("APUV-Projektile", "patrone", pierce="A", ts=5, price=100, desc="Ignoriert MK:A; +40 UV-Schaden gegen HMO-Träger."))
    A.append(ammo_item("ARES", "patrone", ts=5, price=300, qty=5, desc="Augmented Railgun Explosiv Sabot für die Black.Long.Snake, einzeln verkauft."))
    A.append(ammo_item("Flammenwerfer-Liquid (1 l)", "liquid", cont=True, ts=2, price=100, qty=1, page=240, desc="Entzündet Ziele mit MK:A, Waffenschaden als andauernder Schaden."))
    # Pfeile & Bolzen (S. 240)
    for n, b, t, pr, ds, extra in [("Sportpfeil", 0, 1, 2, "Einfache Spitze.", {}),
                                   ("Blattspitzpfeil", 10, 1, 5, "Zwei Klingen, +10 Schaden.", {}),
                                   ("Jagdpfeil", 20, 2, 10, "Drei Klingen, +20 Schaden.", {}),
                                   ("Sprengpfeil", 0, 3, 40, "Explosiv 100 Schaden, Radius 1W6+1 m; Bogenschaden entfällt.", {"dmg": "100", "radius": "1W6+1 m"}),
                                   ("Stahlspitzenbolzen", 5, 2, 2, "+5 Schaden.", {}),
                                   ("Splitterbolzen", 10, 2, 2, "+10 Schaden gegen MK:A, sonst kein Bonus.", {}),
                                   ("Sprengbolzen", 50, 3, 10, "+50 Schaden, Detonationsradius 1W3 m.", {"radius": "1W3 m"})]:
        A.append(ammo_item(n, "projektil", bonus=b, ts=t, price=pr, qty=10, page=240, desc=ds + " Stückpreis.", img=icon("weapons/ammunition", "arrow"), **extra))
    # Schwere Munition (S. 241)
    for n, kind, dmg, rad, atk, pierce, st, t, pr in [("Spreng-Rakete", "rakete", "2W6+180", "1W3+5 m", 0, "", False, 3, 250),
                                                       ("Splitter-Rakete", "rakete", "2W6+130", "2W6+20 m", 0, "", False, 3, 250),
                                                       ("Optische Zielerfassungsrakete (OZ)", "rakete", "2W6+150", "1W6+5 m", 3, "", False, 5, 480),
                                                       ("Spreng-Granate", "granate", "90", "1W6+1 m", 0, "", False, 2, 30),
                                                       ("Splitter-Granate", "granate", "50", "2W6+10 m", 0, "", False, 2, 30),
                                                       ("AF-Granate", "granate", "100", "1 m", 0, "B", False, 3, 30),
                                                       ("K2 Spreng-Granate", "granate", "1", "1W3+4 m", 0, "", True, 2, 150),
                                                       ("K2 Splitter-Granate", "granate", "100", "2W6+15 m", 0, "", False, 2, 150),
                                                       ("K2 AF-Granate", "granate", "1", "3 m", 0, "C", True, 3, 310)]:
        A.append(ammo_item(n, kind, dmg=dmg, radius=rad, atk=atk, pierce=pierce, structure=st, ts=t, price=pr, qty=1, page=241,
                           img=icon("weapons/thrown", "grenade" if kind == "granate" else "rocket"),
                           desc=f"Schaden {dmg}{' Strukturschaden' if st else ''}, Radius {rad}. Preis je Geschoss."))
    # Sprengstoffe (S. 241–242)
    for n, dmg, rad, st, w, t, pr, ds in [("Dynamit", "1", "5 m", True, 0.1, 2, 300, "Stange mit Zündschnur."),
                                          ("TNT", "2", "10 m", True, 0.4, 2, 900, "Feststoff mit Zündschnur."),
                                          ("Komponentensprengstoff", "1", "10 m", True, 0.1, 3, 500, "Flüssig bis fest mit Zünder."),
                                          ("C4-Plastiksprengstoff", "3W6+150", "2 m", False, 0.1, 3, 200, "Verformbar mit Zünder."),
                                          ("C12-Plastiksprengstoff", "2", "20 m", True, 0.1, 3, 2500, "Verformbar mit Zünder."),
                                          ("Schneidladung", "1", "0,5 m", True, 0.5, 3, 100, "Zielgerichtete Ladung mit Zünder."),
                                          ("Mikrowellenbombe", "1", "500 m", True, 5.5, 4, 14000, "Durchdringt Panzerung ohne spezielle Isolierung."),
                                          ("Gravitationsbombe Stufe 1", "4", "100 m", True, 0.5, 5, 12000, "Temporäre Anziehung wie ein Schwarzes Loch; zurück bleibt ein Krater."),
                                          ("Gravitationsbombe Stufe 2", "12", "1 km", True, 1, 5, 54000, "Volumen ca. 150 l."),
                                          ("Gravitationsbombe Stufe 3", "36", "10 km", True, 25, 5, 129000, "Volumen ca. ½ m³."),
                                          ("Gravitationsbombe Stufe 4", "80", "50 km", True, 50, 5, 580000, "Volumen ca. 1 m³.")]:
        a = ammo_item(n, "sprengstoff", dmg=dmg, radius=rad, structure=st, ts=t, price=pr, qty=1, page=241,
                      img=icon("weapons/thrown", "bomb"), desc=f"{ds} Schaden {dmg}{' SSP' if st else ''}, Radius {rad}.")
        a["system"]["weight"] = w
        A.append(a)
    return A


def armor_item(name, rw, mk, komfort, zones, ts, price, desc, page=262, img=None, stealth=0, cold=0):
    return {"name": name, "type": "armor", "img": img or icon("equipment/chest", "breastplate"),
            "system": {"rw": rw, "mk": mk, "komfort": komfort, "zones": zones, "stealth": stealth, "coldDice": cold,
                       "ts": ts, "price": price, "quantity": 1, "equipped": False, "description": p(desc, page)}}


def armors():
    R = []
    torso = [6, 7, 8]
    R.append(armor_item("Bristol-Schutzweste (leicht)", 30, "B", 2, torso, 3, 1000, "Leichte Weste mit harten Kevlarplatten, beliebt bei Straßenpunks."))
    R.append(armor_item("Bristol-Schutzweste (schwer)", 45, "B", 4, torso, 3, 1500, "Schwere Version, 15 kg – Schutz gegen große Kaliber."))
    R.append(armor_item("Kevlargewebe-Schutzweste (leicht)", 15, "A", 1, torso, 2, 400, "Weich, gegen Splitter und kleine Projektile."))
    R.append(armor_item("Kevlargewebe-Schutzweste (schwer)", 25, "A", 2, torso, 2, 700, "Durchschnittlicher Schutz, unter Kleidung tragbar."))
    R.append(armor_item("Panzerjacke", 25, "A", 2, [5, 6, 7, 8, 9], 3, 950, "Gesamter Oberkörper ohne Kopf. Als gepanzert erkennbar mit Wahrnehmung MW 15.", stealth=15))
    R.append(armor_item("Ballistischer Mantel", 20, "A", 2, [2, 4, 5, 6, 7, 8, 9, 10], 3, 1100, "Langer Mantel aus gepanzertem Stoff (MW 15 zum Erkennen).", stealth=15))
    R.append(armor_item("Gefütterter Mantel", 25, "A", 2, [2, 4, 5, 6, 7, 8, 9, 10], 2, 1200, "Wetterschutz mit 2 Stufen (2W) Kälteschutz.", cold=2))
    R.append(armor_item("Ballistische Kleidung", 20, "A", 2, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 3, 1500, "Komplettes Outfit aus kugelsicherem Stoff (MW 15 zum Erkennen).", stealth=15))
    R.append(armor_item("Partielle Panzerungsglieder (je Zone)", 35, "B", 3, [7], 2, 600, "Verstärkte Metall- oder Kevlarplatte für eine Körperzone. Zone im Itembogen wählen; Preis je Zone."))
    R.append(armor_item("Panzerrüstung", 40, "B", 4, list(range(2, 13)), 4, 8900, "Krone der zivilen Sicherheit, mit MP-Helm in Rüstungsoptik, ohne Energiezellen.", page=263))
    R.append(armor_item("Ritterrüstung (je Zone)", 35, "B", 5, [7], 2, 400, "Imposantes Symbol vergangener Zeiten; Preis je Körperzone, inkl. Helm möglich.", page=263))
    R.append(armor_item("Sicherheitshelm", 35, "B", 2, [12], 2, 800, "Schützt den Kopf bis auf das Gesicht; Visier +200 N$.", page=263, img=icon("equipment/head", "helm")))
    R.append(armor_item("Multipurpose-Helm", 40, "B", 3, [12], 4, 3500, "Halsring wird zum Helm: Lichtkompensation, Nacht-/Thermalsicht, Zoom 300 m, SmartCom-HUD, Atemfilter.", page=263, img=icon("equipment/head", "helm")))
    R.append(armor_item("Mad Suit (je Zone, MK:A)", 20, "A", 3, [7], 1, 100, "Ödland-Stil: einzelne Stücke je Körperzone, alternativ 10p. MK:B.", page=264))
    R.append(armor_item("LK Jack", 35, "A", 1, torso, 4, 1400, "Liquidkevlar-Shirt. Verliert den Rüstungswert unter anderer Kleidung mit Rüstungswert. UV-dicht.", page=264))
    R.append(armor_item("LK Skin", 35, "A", 1, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 4, 5000, "Hautenger Liquidkevlar-Bodysuit. Nicht unter/über anderer Rüstung.", page=264))
    R.append(armor_item("LK Face", 35, "A", 1, [12], 4, 1500, "Sturmhaube mit Mikrokameras: reguläre, Nacht- und Thermalsicht.", page=264, img=icon("equipment/head", "hood")))
    return R


def gear_item(name, ts, price, desc, page=None, weight=0.0, bonus="", img=None, mods=None, uses=0, tq=0, qty=1, alk=0):
    return {"name": name, "type": "gear", "img": img or icon("svg", "item-bag"),
            "system": {"ts": ts, "price": price, "weight": weight, "bonus": bonus, "quantity": qty, "toolQuality": tq, "alk": alk,
                       "uses": {"value": uses, "max": uses}, "modifiers": mods or [], "description": p(desc, page)}}


def gear():
    G = []
    G.append(gear_item("SmartCom", 3, 0, "Standardausrüstung jedes Charakters zu Spielbeginn: Kommunikation, Kamera, Irisscan.", 135, img=icon("commodities/tech", "")))
    G.append(gear_item("Set schäbige Kleidung", 1, 0, "Startbesitz jedes Charakters.", 135))
    for n, ts, pr, ds, bonus in [("Dreibein", 2, 310, "Erhöht die Rückstoßdämpfung einer Waffe um 3.", "+3 RD"),
                                 ("Zweibein", 2, 180, "Erhöht die Rückstoßdämpfung um 2.", "+2 RD"),
                                 ("Unterlaufgriff", 2, 50, "Erhöht die Rückstoßdämpfung um 1.", "+1 RD"),
                                 ("Zielfernrohr", 3, 150, "18-fache Vergrößerung: Distanz für Reichweiten-MW durch 18 teilen.", "Distanz ÷ 18"),
                                 ("Lasermarkierer / Rotpunktvisier", 3, 50, "Reduziert den Zielen-Malus um einen Würfel.", "Zielen −1W Malus"),
                                 ("Schalldämpfer", 2, 200, "Für den diskreten Einsatz.", ""),
                                 ("Holster", 1, 20, "Nylon-Holster mit Klettverschluss.", ""),
                                 ("Tarnholster", 3, 100, "Unsichtbar unter der Kleidung (Wahrnehmung MW 20).", "Entdecken MW 20"),
                                 ("Köcher", 1, 100, "20 Pfeile oder 30 Bolzen.", ""),
                                 ("Lampe", 2, 50, "Montierbar an Körperpanzer und Handfeuerwaffen.", ""),
                                 ("Ersatzmagazin", 2, 10, "Vorsorge ist besser als Nachsicht.", ""),
                                 ("Schnelllader für Revolver", 2, 100, "Lädt eine komplette Trommel auf einmal.", "")]:
        G.append(gear_item(n, ts, pr, ds + " (Waffen-Add-On)", 242, bonus=bonus, img=icon("weapons/ammunition", "clip") if "magazin" in n.lower() else None))
    for n, ts, pr, w, ds, bonus, mods, tq in [
            ("Bewegungsmelder", 3, 450, 0.25, "25 m Reichweite im 160°-Winkel, zeigt Bewegung und Größe; 24 h mit zwei Micro-ZEUS.", "", None, 0),
            ("Datenwanze (10er Pack)", 3, 500, 0, "Knopfgroße Audio-/Videoübertragung, selbstversorgend, störanfällig (DN 2).", "", None, 0),
            ("Dietrich-Set", 2, 100, 0.1, "Feinwerkzeug zum Schlossknacken, kein Bonus. Bei Sicherheitstechnik-Ergebnis < 5 zerbricht es.", "", None, 0),
            ("Dietrich (automatisch) Stufe 1", 4, 1000, 0.25, "Stufe = Bonuswürfel auf Sicherheitstechnik gegen mechanische Schlösser. Stufe 1–5: Stufe × 1.000 N$, militärisch 6–10: Stufe × 10.000 N$.", "+1W Sicherheitstechnik", None, 0),
            ("Fallschirm", 3, 1000, 7.9, "Farbwechselnder Fallschirm, wickelt sich selbst ein. Nutzung MW 20+ mit Akrobatik, Fluggeräte oder Zero-G.", "", None, 0),
            ("Geigerzähler", 3, 250, 0.1, "Armband, erkennt erhöhte Strahlung im 25-m-Radius.", "", None, 0),
            ("Handschellen", 2, 150, 0.2, "Stabilität 50 MK:B, mit Werkzeug MW 25 zu knacken.", "", None, 0),
            ("Kletterausrüstung", 2, 350, 1.5, "Gurt, Helm, Karabiner, 50 m Seil, Kalk. +3W auf Klettern.", "+3W Klettern", [{"target": "skills.klettern", "value": 3}], 0),
            ("Kletterhandschuhe", 2, 100, 0.2, "+1W auf Klettern.", "+1W Klettern", [{"target": "skills.klettern", "value": 1}], 0),
            ("Krasse Kleidung", 3, 2000, 0, "High-Society-Marken (Faenasana, Armisticia, Gymnica, Crocodile, De Pura Raza, Chenchen).", "", None, 0),
            ("Werkzeugkiste (durchschnittlich)", 2, 500, 5, "Normale Qualität: weder Bonus noch Malus auf Crafting-Proben.", "±0W Crafting", None, 0),
            ("Hightech-Werkstatt", 4, 50000, 0, "Gewährt +2 Bonuswürfel auf Crafting-Proben im Bereich Handwerk.", "+2W Crafting", None, 2),
            ("Verdreckte Laborantenkiste", 1, 50, 3, "Schlechte Ausrüstung: −1W auf Crafting-Proben.", "−1W Crafting", None, -1)]:
        G.append(gear_item(n, ts, pr, ds, 265 if "Werk" not in n and "Labor" not in n else 114, weight=w, bonus=bonus, mods=mods, tq=tq))
    G.append(gear_item("Langzeit-Medikation (20 Dosen)", 2, 100, "Tägliche Einnahme hält eine chronische Erkrankung unter Kontrolle.", 176, qty=20, uses=20,
                       img=icon("consumables/potions", "bottle")))
    return G


def augment(name, kind, *, ts=4, price=0, org=0, psy=0, cap=0.0, desc="", page=221, zone="", robotic=None, armor=0, mk="", model="", mods=None, img=None, gp=0, full_body=False):
    sysd = {"kind": kind, "zone": zone, "model": model, "armor": armor, "mk": mk, "capacityCost": cap, "orgLoss": org, "psycheLoss": psy,
            "gp": gp, "fullBody": full_body,
            "installed": True, "ts": ts, "price": price, "quantity": 1, "modifiers": mods or [], "description": p(desc, page)}
    if robotic:
        sysd["robotic"] = robotic
    return {"name": name, "type": "augment", "img": img or icon("svg", "clockwork"), "system": sysd}


def augments():
    A = []
    for n, ge, st, ko, be, wa, cap, arm, mk, org, ds in [("Casual", 1, 2, 2, 1, 0, 10, 20, "B", 8, "schlicht, einfach, Standard"),
                                                        ("Work", 1, 8, 8, 1, 0, 16, 30, "B", 14, "grob, offen, massiv, schwer"),
                                                        ("High Tech", 2, 2, 2, 2, 0, 8, 20, "B", 4, "elegant, futuristisch, detailliert"),
                                                        ("Android", 2, 2, 2, 2, 0, 6, 0, "A", 2, "menschlich, biologisch, weich"),
                                                        ("Military", 3, 6, 6, 3, 1, 12, 40, "B", 6, "pragmatisch, solide, hochwertig")]:
        A.append(augment(f"Robotik-Körperzone: {n}", "robotik", model=n, org=org, armor=arm, mk=mk, ts=4, page=218,
                         robotic={"ge": ge, "st": st, "ko": ko, "be": be, "wa": wa, "capacity": cap, "tp": 70},
                         desc=f"Robotikmodell {n} ({ds}) für eine Körperzone – Zone im Itembogen wählen. GE {ge}, ST {st}, KO {ko}, BE {be}, WA {wa}, Kapazität {cap}, Panzerung {arm}p. MK:{mk}, Organismus −{org}. 70 TP. Implantation: Robotik-Crafting MW 45 (letal MW 50), 4 h (7 h). Nicht mit Regeneration kompatibel. Robotik-Overdrive: +X Stärke für eine Aktion kostet X Schaden am Teil."))
    for n, cap, pr, key, ds in [("Robotik-Upgrade: Geschick +1", 0.5, 1000, "ge", "Max. GE 8. Full Body 11.000 N$."),
                                ("Robotik-Upgrade: Stärke +1", 0.25, 500, "st", "Max. ST 20. Full Body 5.500 N$."),
                                ("Robotik-Upgrade: Konstitution +1", 0.25, 500, "ko", "Max. KO 20. Full Body 5.500 N$."),
                                ("Robotik-Upgrade: Beweglichkeit +1", 0.5, 1000, "be", "Max. BE 10. Full Body 11.000 N$."),
                                ("Robotik-Upgrade: Panzerung +10", 0.5, 500, "armor", "Erhöht nur die Rüstungspunkte, nicht die MK. Full Body 5.500 N$.")]:
        robo = {"ge": 0, "st": 0, "ko": 0, "be": 0, "wa": 0, "capacity": 0, "tp": 70}
        if key != "armor":
            robo[key] = 1
        A.append(augment(n, "upgrade", cap=cap, price=pr, ts=4, page=218, robotic=robo, armor=10 if key == "armor" else 0,
                         desc=ds + " Im Itembogen die robotische Zone wählen; die Anzahl zählt als Stufen (Kapazität und Wert je Stufe)."))
    # Erwachte: Ganzkörper-Upgrade-Pakete (S. 146)
    for n, attr, pr, cap in [("Geschick-Upgrade-Pack", "ge", 11000, 0.5), ("Stärke-Upgrade-Pack", "st", 5500, 0.25),
                             ("Konstitutions-Upgrade-Pack", "ko", 5500, 0.25), ("Beweglichkeits-Upgrade-Pack", "be", 11000, 0.5)]:
        A.append(augment(f"Ganzkörper: {n} (+1)", "upgrade", price=pr, cap=cap, full_body=True, ts=4, page=146,
                         mods=[{"target": f"attributes.{attr}", "value": 1}],
                         desc=f"Hebt {attr.upper()} des gesamten robotischen Körpers um eine Stufe und verbraucht {cap} Kapazität in jeder Körperzone. Mehrfach kaufbar (Anzahl erhöhen bzw. weiteres Paket). Höchstwerte: GE 8, ST 20, KO 20, BE 10."))
    A.append(augment("Ganzkörper: Panzerungs-Upgrade (+10)", "upgrade", price=5500, cap=0.5, full_body=True, ts=4, page=218,
                     mods=[{"target": "chassisArmor", "value": 10}], desc="+10 Punkte Chassis-Panzerung an allen Zonen (MK bleibt)."))
    # Erwachte: Designoptionen (S. 146–147, GP-Kosten)
    for n, gp, mods, ds in [("Flugtauglich", 35, [], "Schubdüsen, Antigravitation oder Rotoren: besondere Fertigkeit „Fliegen“ (BE) auf Stufe 3, Rüttelflug integriert."),
                            ("Fortbewegung (Räder/Ketten)", 20, [], "Rollen, Räder oder Kettenantrieb nach den Regeln von „Wechselgänger“ (Rennen-Ergebnis ×2) ohne auf alle Viere zu gehen."),
                            ("Fusionsbatterie", 40, [], "Energie statt Ernährung: Ausdauerproben gelingen automatisch, kein Schlaf nötig (4 h Trance zum Sortieren der Gedanken)."),
                            ("Nanitenprototyp", 40, [{"target": "regSpeed", "value": 5}, {"target": "regPool", "value": 80}], "Reparaturnaniten: Regeneration 5, Pool 80 (füllt sich in der Trance)."),
                            ("Strukturupgrade", 15, [{"target": "chassisMk", "value": 1}], "Die Chassis-Panzerung des Erwachten zählt als MK:B statt MK:A.")]:
        A.append(augment(f"Designoption: {n}", "design", gp=gp, ts=0, page=146, mods=mods, desc=ds + f" Kosten {gp} GP (nur Erwachte)."))
    A.append(augment("Abdichtung", "upgrade", ts=2, price=1000, page=219, desc="Robotisches Körperteil gegen Feuchtigkeit und toxisches Meerwasser abgedichtet. Preis je Zone."))
    A.append(augment("Isolierte KI", "upgrade", ts=4, price=10000, cap=1, page=219, desc="KI steuert die Zone autonom, auch bei Bewusstlosigkeit, mit den Grundattributen des Teils. Je Zone."))
    A.append(augment("Luxus-Upgrade", "upgrade", ts=3, price=2000, page=219, desc="Edelsteine und Edelmetallapplikationen – reines Statussymbol."))
    A.append(augment("Alpha-Biomechanik", "biomechanik", ts=4, price=37000, org=8, psy=2, page=217,
                     desc="Alle Würfel des gewählten Attributs werden zu Hazard-Di (nicht für robotische Körperteile). Meldepflichtig."))
    A.append(augment("Beta-Biomechanik", "biomechanik", ts=4, price=13000, org=4, psy=2, page=217,
                     desc="Alle Würfel der gewählten Fertigkeit werden zu Hazard-Di (nicht für besondere/Elite-Fertigkeiten)."))
    A.append(augment("Cybersense (einzelner Sinn)", "implantat", ts=4, price=5000, org=2, cap=1, zone="12", page=221,
                     desc="Oculus, Auris, Odoratus, Gustatus oder Smart-Skin: +5 Stufen Wahrnehmung für diesen Sinn."))
    A.append(augment("Cybersense Cut (Stufe 1)", "implantat", ts=3, price=2000, org=1, cap=0.5, zone="12", page=221,
                     desc="+2 Stufen für einen Sinn je Cut-Stufe (max. 2). Preis Stufe × 2.000 N$."))
    A.append(augment("Cybersense All-Inclusive (Stufe 1)", "implantat", ts=4, price=10000, org=1, cap=0.5, zone="12", page=221,
                     desc="Je Stufe +2 Wahrnehmung für Fertigkeitsproben (max. Stufe 3 = +6); zählt nicht beim Steigern von WA."))
    A.append(augment("Vision-Upgrade", "implantat", ts=3, price=10000, page=221, desc="Nur mit Cybersense Oculus: Nachtsicht und Thermalsicht."))
    A.append(augment("Damage Control", "implantat", ts=4, price=20000, org=9, psy=4, cap=1, zone="12", page=221,
                     mods=[{"target": "schmerztoleranz", "value": 3}], desc="Schmerztoleranz +3 (max. 10)."))
    A.append(augment("Energiespeicherpack", "implantat", ts=4, price=2500, org=4, psy=1, cap=1.5, page=221,
                     desc="+2 temporäre Bonuswürfel auf Ausdauer je Pack."))
    A.append(augment("Enterhaken", "implantat", ts=3, price=8200, org=8, psy=1, cap=2, page=222,
                     desc="Stahlhaken bis 50 m, zieht bis 500 kg. Einschlag 50 Schaden (Einzelfeuer)."))
    A.append(augment("Integriertes SmartCom", "implantat", ts=4, price=3000, org=2, psy=1, cap=0.5, page=222,
                     desc="Gedankengesteuertes SmartCom; Sensoren nur mit Wahrnehmung MW 20 erkennbar."))
    A.append(augment("Integriertes Waffensystem", "implantat", ts=4, price=0, page=222,
                     desc="Nahkampf- oder tragbare Fernkampfwaffe in Robotik eingebaut (nicht biologisch). Gekennzeichnet legal, getarnt illegal."))
    A.append(augment("Lungenfiltersystem", "implantat", ts=4, price=7000, org=4, psy=2, cap=1, page=222,
                     desc="+2W6 Infektionsresistenz gegen Übertragung durch die Luft, immun gegen eingeatmete Gifte."))
    A.append(augment("Neuronaler Überbrücker", "implantat", ts=4, price=5000, org=3, psy=1, cap=0.5, zone="12", page=222,
                     desc="Erhöht dauerhaft eine programmierte Fertigkeit um 1 (ignoriert Erschaffungsmaximum). Modifikator im Item setzen."))
    A.append(augment("PNS – Primär-Neural-Supporter", "implantat", ts=4, price=20000, org=10, psy=3, cap=0.5, zone="12", page=222,
                     desc="Nahezu eidetisches Gedächtnis: Fertigkeiten und besondere Fertigkeiten kosten 2 EP weniger (Häkchen „PNS“ im Bio-Reiter setzen)."))
    A.append(augment("Rückstoßkompensator", "implantat", ts=3, price=3000, org=2, psy=1, cap=1, page=223,
                     desc="+2 Rückstoßdämpfung für Handfeuerwaffen in der waffenführenden Zone (beim Angriff als Auflage wählen oder RD der Waffe erhöhen)."))
    A.append(augment("Schocker", "implantat", ts=3, price=1800, org=2, psy=1, cap=1, page=223,
                     desc="Elektroschock bei Berührung: leicht NL 30, mittel NL 50 (1 Eigenschaden), schwer 30 Schaden (2 Eigenschaden)."))
    A.append(augment("Stauraum (je Liter)", "implantat", ts=2, price=1000, org=4, psy=2, cap=2, page=223, desc="Eingebautes Fach, auch auf mehrere kleine verteilbar."))
    A.append(augment("Universalübersetzer", "implantat", ts=5, price=38000, org=13, cap=2, zone="12", page=223,
                     desc="Analysiert Sprachen in 3 Minuten; Direkt-Link-Version (55.000 N$, Organismus −18, nicht in Robotik) in 3 Sekunden. Illegal."))
    A.append(augment("Werkzeug- oder Laborantenset (implantiert)", "implantat", ts=4, price=0, page=223,
                     desc="Implantiertes Äquivalent zur Werkzeug- bzw. Laborantenkiste; Qualität wie Werkzeuge (−2W bis +3W)."))
    return A
