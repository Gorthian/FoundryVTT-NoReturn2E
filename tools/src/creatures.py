# -*- coding: utf-8 -*-
"""Kreaturen (Wildlife, S. 24–39) als Actor-Compendium. Werte aus den Wildlife-Tabellen des Corebooks,
Beschreibungen sind eigene Kurzfassungen, keine Buchtexte."""
from .common import p, stable_id

PAGES = "24–39"
ALL_ZONES = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
HEAD = [12]
BODY = [z for z in ALL_ZONES if z != 12]

# Fertigkeiten, die im System als Standardfertigkeit existieren (Schlüssel in NR.skills)
STD = {
    "Ausdauer": "ausdauer", "Ausweichen": "ausweichen", "Klettern": "klettern", "Nahkampf": "nahkampf",
    "Rennen": "rennen", "Heimlichkeit": "heimlichkeit", "Reaktion": "reaktion", "Einschüchtern": "einschuechtern",
    "Schwimmen": "schwimmen", "Springen": "springen", "Stemmen": "stemmen", "Überreden": "ueberreden",
}
# Besondere Fertigkeiten (Item-Typ skill) mit zugehörigem Attribut
SPECIAL = {
    "Riechen": "wa", "Sehen": "wa", "Hören & Sehen": "wa", "Schlängeln": "be", "Spucken": "ge",
    "Fliegen": "be", "Gleiten": "be", "Spinnenseide (Werfen)": "ge", "Spinnenseide (Stabilität)": "st",
}


def creature(name, ge, st, ko, be, wa, instinct, stubborn, tp, adr, skills, armor=None, weapons=None, traits=None,
             note="", ch=None, regen=None, ir=2, pain=5, species="Kreatur"):
    return {"name": name, "attr": {"ge": ge, "st": st, "ko": ko, "be": be, "wa": wa, "ch": ch},
            "instinct": instinct, "stubborn": stubborn, "tp": tp, "adr": adr, "skills": skills,
            "armor": armor or [], "weapons": weapons or [], "traits": traits or [], "note": note,
            "regen": regen, "ir": ir, "pain": pain, "species": species}


def creatures():
    C = []
    C.append(creature(
        "Abomination", 2, 15, 15, 3, 3, 5, 14, 70, 5,
        {"Einschüchtern": 5, "Nahkampf": 6, "Reaktion": 2, "Rennen": 7},
        armor=[("Körperpanzer", 20, "A", ALL_ZONES)], regen=(10, 100),
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Scharfe Zähne (körpereigen)", 30, "stich")],
        traits=[("Thermalsicht", "Sieht Wärmequellen."),
                ("Abnormitäten: ALLES-Fresser, Caecitas, Toxic", "Typische Abnormitäten dieser Kreatur; Kurzbeschreibung siehe Compendium Abnormitäten.")],
        note="Krallen und Zähne treten häufig auf; die Waffen liegen deshalb als körpereigene Angriffe bei."))
    C.append(creature(
        "Aashornbär", 2, 8, 8, 2, 3, 3, 6, 50, 5,
        {"Ausweichen": 2, "Klettern": 3, "Nahkampf": 4, "Rennen": 5, "Riechen": 4},
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Scharfe Zähne (körpereigen)", 30, "stich")],
        traits=[("Nachtsicht", "Sieht auch bei sehr wenig Licht.")],
        note="Klettern erhält einen Bonus von +2 Würfeln."))
    C.append(creature(
        "Beutelsegler", 4, 2, 2, 5, 5, 5, 5, 10, 0,
        {"Ausdauer": 3, "Ausweichen": 1, "Gleiten": 3, "Heimlichkeit": 2, "Klettern": 3, "Nahkampf": 2,
         "Reaktion": 3, "Rennen": 1, "Springen": 3},
        weapons=[("Scharfe Zähne (körpereigen)", 25, "stich"), ("Einziehbare Krallen (körpereigen)", 15, "klinge")],
        traits=[("Nachtsicht", "Sieht auch bei sehr wenig Licht."),
                ("Vierbeiner", "Rennen zählt doppelt für die Geschwindigkeit.")],
        note="Klettern erhält +2 Würfel."))
    C.append(creature(
        "Crawler", 4, 6, 6, 4, 4, 8, 10, 50, 5,
        {"Ausweichen": 6, "Einschüchtern": 4, "Nahkampf": 6, "Rennen": 6, "Überreden": 3}, ch=3, ir=1,
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Zähne (körpereigen)", 30, "stich")],
        traits=[("Nachtsicht", "Sieht auch bei sehr wenig Licht."),
                ("UV-empfindlich", "Reagiert auf UV-Licht wie HMO."),
                ("PSI-Resistenz", "Widersteht PSI-Einflüssen."),
                ("PSI Kat. B: Schleier der Hast, Unaufhaltsamer Schatten", "Beherrscht diese beiden Kräfte der Kategorie B."),
                ("Wunden: Flugnekrose", "Wunden dieser Kreatur übertragen Flugnekrose (Infektionsresistenz gegen 6)."),
                ("Fiktives Charisma", "CH 3 gilt nur für Imitation und Überreden.")],
        note="Ausweichen, Nahkampf und Rennen erhalten +10 Punkte, BE gilt mit +10 Punkten; Rennen zählt doppelt."))
    C.append(creature(
        "Gargoyle (Schlüpfling)", 2, 4, 4, 3, 3, 3, 5, 30, 0,
        {"Ausweichen": 3, "Heimlichkeit": 2, "Klettern": 1, "Nahkampf": 1, "Springen": 1},
        weapons=[("Krallen/Zähne (körpereigen)", 10, "klinge")],
        traits=[("Giftresistenz 3", "Dämpft Gifte um 3 Stufen."), ("Nachtsicht", "Sieht auch bei sehr wenig Licht.")]))
    C.append(creature(
        "Gargoyle (Jüngling)", 2, 6, 6, 4, 4, 5, 9, 50, 0,
        {"Ausweichen": 4, "Gleiten": 2, "Heimlichkeit": 3, "Klettern": 3, "Reaktion": 1, "Nahkampf": 3, "Springen": 3},
        armor=[("Panzerung", 20, "A", ALL_ZONES)],
        weapons=[("Krallen/Zähne (körpereigen)", 20, "klinge")],
        traits=[("Giftresistenz 3", "Dämpft Gifte um 3 Stufen.")]))
    C.append(creature(
        "Gargoyle", 2, 10, 10, 5, 5, 7, 13, 70, 0,
        {"Ausweichen": 4, "Einschüchtern": 1, "Fliegen": 5, "Heimlichkeit": 3, "Klettern": 4, "Reaktion": 2,
         "Nahkampf": 5, "Springen": 3},
        armor=[("Panzerung", 40, "B", ALL_ZONES)],
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Zähne (körpereigen)", 40, "stich")],
        traits=[("Giftresistenz 3", "Dämpft Gifte um 3 Stufen."),
                ("Farbliche und strukturelle Tarnung", "Passt Farbe und Oberfläche der Umgebung an."),
                ("Nachtsicht", "Sieht auch bei sehr wenig Licht."),
                ("Zermalmende Kiefer", "Verstärkt den Biss (bereits im Zahnschaden enthalten)."),
                ("Rüttelflug (Style-Skill)", "Kann in der Luft schweben.")],
        note="Einschüchtern +5 und Heimlichkeit +40 Punkte als Zusatzwerte."))
    C.append(creature(
        "Gremlin", 2, 3, 3, 3, 3, 5, 8, 30, 3,
        {"Ausweichen": 2, "Heimlichkeit": 1, "Nahkampf": 3},
        weapons=[("Krallen (körpereigen)", 20, "klinge")],
        traits=[("Nachtsicht", "Sieht auch bei sehr wenig Licht."), ("Atemratio", "Besonders effiziente Atmung."),
                ("Herdeninstinkt", "In der Gruppe steigen Instinkt auf 10 und Sturheit auf 15."),
                ("Kleine Zielfläche", "Angriffe gelten als Körperhälfte (−1 Würfel).")]))
    C.append(creature(
        "Grollhorn", 2, 10, 10, 2, 4, 4, 4, 50, 0,
        {"Ausdauer": 5, "Einschüchtern": 2, "Nahkampf": 4, "Rennen": 6, "Riechen": 4, "Stemmen": 10},
        armor=[("Körperpanzer", 30, "A", BODY), ("Körperpanzer (Kopf)", 30, "B", HEAD)],
        weapons=[("Hörner (körpereigen)", 20, "stich")],
        traits=[("Roar", "Einschüchterndes Gebrüll."),
                ("Herdeninstinkt", "In der Gruppe steigen Instinkt und Sturheit auf je 9."),
                ("Vierbeiner", "Rennen zählt doppelt für die Geschwindigkeit.")],
        note="Einschüchtern +5 Punkte als Zusatzwert."))
    C.append(creature(
        "Knochenspinne", 3, 5, 3, 5, 5, 7, 10, 20, 0,
        {"Heimlichkeit": 5, "Klettern": 10, "Nahkampf": 3, "Rennen": 9, "Spinnenseide (Werfen)": 3,
         "Spinnenseide (Stabilität)": 2},
        weapons=[("Biss (körpereigen)", 40, "stich"), ("Stachelhaare", 15, "stich")],
        traits=[("Erschütterungssinn", "Nimmt Vibrationen in der Umgebung wahr."),
                ("Giftresistenz 3", "Dämpft Gifte um 3 Stufen."),
                ("Spinnenseide", "Klebriges, reißfestes Netz zum Fangen von Beute."),
                ("Gift", "−5 Würfel auf alle Attribute für 1 Minute (−1 je Giftresistenzstufe); Nemo-Virus. "
                 "Fallen Attribute unter 0, erleidet jede Zone je Würfel 1 Schaden ohne Widerstand."),
                ("Kleine Zielfläche", "Angriffe gegen die Kreatur erhalten −1 Würfel.")],
        note="Die Stachelhaare wirken über KO+15; Rennen zählt doppelt."))
    C.append(creature(
        "Lochdingo", 2, 3, 3, 5, 5, 6, 6, 20, 0,
        {"Ausweichen": 3, "Heimlichkeit": 3, "Klettern": 3, "Nahkampf": 3, "Rennen": 5, "Riechen": 2},
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Zähne (körpereigen)", 30, "stich")],
        traits=[("Kleine Zielfläche", "Angriffe gelten wie auf eine Körperzone.")],
        note="Rennen zählt doppelt (Vierbeiner)."))
    C.append(creature(
        "Nemoratte", 2, 4, 5, 3, 4, 5, 7, 30, 0,
        {"Ausdauer": 3, "Ausweichen": 1, "Heimlichkeit": 1, "Klettern": 1, "Nahkampf": 4, "Reaktion": 3,
         "Rennen": 2, "Riechen": 6},
        armor=[("Körperpanzer", 30, "B", ALL_ZONES)],
        weapons=[("Zähne mit Zermalmenden Kiefern (körpereigen)", 40, "stich"), ("Krallen (körpereigen)", 15, "klinge")],
        traits=[("Nachtsicht", "Sieht auch bei sehr wenig Licht."), ("Nemo-Virus", "Überträgt das Nemo-Virus."),
                ("Herdeninstinkt", "In der Gruppe steigen Instinkt auf 6 und Sturheit auf 10.")],
        note="Klettern +2 Würfel, Rennen zählt doppelt."))
    C.append(creature(
        "Nemotaube", 2, 3, 3, 4, 4, 2, 3, 20, 0,
        {"Ausdauer": 3, "Ausweichen": 2, "Fliegen": 6, "Heimlichkeit": 1, "Nahkampf": 2, "Sehen": 3},
        weapons=[("Krallen (körpereigen)", 15, "klinge"), ("Zähne (körpereigen)", 30, "stich")],
        traits=[("Nachtsicht", "Sieht auch bei sehr wenig Licht."), ("Nemo-Überträger", "Überträgt das Nemo-Virus."),
                ("Kleine Zielfläche", "Angriffe gelten wie auf eine Körperzone.")],
        note="Fliegen zählt doppelt für die Geschwindigkeit."))
    C.append(creature(
        "Oryx", 1, 7, 9, 2, 2, 5, 8, 50, 0,
        {"Ausdauer": 10, "Nahkampf": 4, "Rennen": 2, "Riechen": 5, "Stemmen": 8},
        weapons=[("Hörner (körpereigen)", 40, "stich")],
        traits=[("Hitzeresistenz 3W", "Dämpft Hitze um 3 Würfel.")],
        note="Rennen zählt doppelt."))
    C.append(creature(
        "Pyräne", 3, 8, 6, 4, 3, 7, 5, 50, 3,
        {"Ausweichen": 3, "Einschüchtern": 2, "Heimlichkeit": 3, "Hören & Sehen": 5, "Nahkampf": 4, "Reaktion": 2,
         "Rennen": 5},
        armor=[("Körperpanzer", 15, "A", ALL_ZONES)],
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Zähne (körpereigen)", 30, "stich")],
        traits=[("Elektroresistenz 10W", "Widersteht elektrischem Schaden."), ("Giftresistenz 2", "Dämpft Gifte um 2 Stufen.")],
        note="Rennen zählt doppelt."))
    C.append(creature(
        "Schatten (PSI)", 10, 10, 10, 10, 10, 0, 0, 30, 0, {},
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Zähne (körpereigen)", 30, "stich")], ir=1,
        traits=[("Nachtsicht", "Sieht auch bei sehr wenig Licht."),
                ("Nicht biologisch", "Erleidet durch Licht und Hitze doppelten Schaden.")],
        note="Alle Attribute entsprechen dem doppelten KS des erzeugenden PSI-Anwenders. Die hinterlegten 10 gelten für KS 5; "
             "passe GE, ST, KO, BE und WA an. Der Schatten hat keine Fertigkeiten und erleidet keinen Malus."))
    C.append(creature(
        "Skorpionskrähe", 1, 2, 2, 1, 4, 4, 4, 1, 0,
        {"Ausweichen": 4, "Fliegen": 5, "Nahkampf": 5, "Sehen": 2},
        weapons=[("Krallen (körpereigen)", 20, "klinge"), ("Schnabel (körpereigen)", 30, "stich")],
        traits=[("Giftdrüsen (narkotisch)", "Betäubendes Gift."), ("Rundumsicht", "Sieht auch nach hinten."),
                ("Sechster Sinn", "Spürt Gefahr früh."),
                ("Schwarm", "Im Schwarm steigt die Sturheit auf 8."),
                ("Kleine Zielfläche", "Angriffe gelten wie auf eine Körperzone.")],
        note="Ausweichen und Nahkampf gelten im Flug, ebenso der Schnabelangriff ohne Malus (am Boden −5). "
             "Im Flugangriff sind +5 Schaden enthalten. Sehen +4 bei gedämpftem Licht."))
    C.append(creature(
        "Stein-/Grascobra", 1, 2, 3, 3, 3, 9, 9, 20, 0,
        {"Ausweichen": 5, "Heimlichkeit": 4, "Nahkampf": 9, "Schlängeln": 1, "Schwimmen": 7, "Spucken": 4},
        weapons=[("Zähne (körpereigen)", 20, "stich")],
        traits=[("Giftspucke", "Reichweite 3 m, einmal je Kampfrunde: 5 Runden lang je 9 Schaden am Kopf (Zone 12)."),
                ("Gegengift", "Gegen das Zahngift existiert ein Gegengift.")]))
    return C


def item_doc(pack, actor_id, sort, it):
    _id = stable_id(pack, actor_id, it["name"])
    return _id, {"_id": _id, "_key": f"!actors.items!{actor_id}.{_id}", "name": it["name"], "type": it["type"],
                 "img": it["img"], "system": it["system"], "effects": [], "folder": None, "sort": sort,
                 "ownership": {"default": 0}, "flags": {}}


def creature_items(c):
    items = []
    for name, rw, mk, zones in c["armor"]:
        items.append({"name": name, "type": "armor", "img": "icons/svg/shield.svg",
                      "system": {"rw": rw, "mk": mk, "zones": zones, "equipped": True, "komfort": 0,
                                 "description": p("Körpereigene Panzerung der Kreatur.", PAGES)}})
    for name, pts, dtype in c["weapons"]:
        items.append({"name": name, "type": "weapon", "img": "icons/svg/combat.svg",
                      "system": {"category": "unbewaffnet", "skill": "nahkampf", "damageType": dtype, "equipped": True,
                                 "damage": {"strength": True, "points": pts}, "range": "none",
                                 "description": p("Körpereigener Angriff, Schaden ST+" + str(pts) + " Punkte.", PAGES)}})
    for name, desc in c["traits"]:
        items.append({"name": name, "type": "bioTrait", "img": "icons/svg/pawprint.svg",
                      "system": {"kind": "sichtbar", "gp": 0, "description": p(desc, PAGES)}})
    for sk, value in c["skills"].items():
        if sk in SPECIAL:
            items.append({"name": sk, "type": "skill", "img": "icons/svg/book.svg",
                          "system": {"category": "besondere", "attribute": SPECIAL[sk], "value": value,
                                     "description": p("Besondere Kreaturenfertigkeit.", PAGES)}})
    return items


def actor_system(c):
    system = {"attributes": {}, "skills": {}}
    for key, v in c["attr"].items():
        if v is not None:
            system["attributes"][key] = {"value": v, "bonus": 0, "leiden": 0}
    for sk, value in c["skills"].items():
        if sk in STD:
            system["skills"][STD[sk]] = {"value": value}
    system["special"] = {"adrenalin": {"value": c["adr"], "used": 0}, "schmerztoleranz": {"value": c["pain"]}}
    system["tpBase"] = c["tp"]
    system["infection"] = {"dice": c["ir"], "points": 0, "malus": 0}
    if c["regen"]:
        system["regeneration"] = {"speed": c["regen"][0], "pool": c["regen"][1], "poolUsed": 0}
    system["details"] = {"species": c["species"], "concept": "Wildlife"}
    system["instinct"] = c["instinct"]
    system["stubbornness"] = c["stubborn"]
    bio = p("Kreatur aus dem Wildlife-Kapitel. Schmerztoleranz vereinfacht: Hat eine Zone die Hälfte ihrer TP verloren, "
            "gilt −1 Würfel auf alle Aktionen; bei Konstitution 0 oder weniger ist die Kreatur kampfunfähig.", PAGES)
    if c["note"]:
        bio += p(c["note"])
    system["biography"] = bio
    return system
