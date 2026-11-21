# -*- coding: utf-8 -*-
"""Erzeugt packs-src/<pack>.json aus den Python-Quelldaten.
Aufruf:  python tools/build_sources.py   (aus dem Systemordner)
Danach:  npm run build   bzw. tools/build-packs.cmd  (prüft die Quellen und baut die LevelDB-Compendien)"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from src.common import stable_id, FOUNDRY_ICONS  # noqa: E402
from src import arsenal, character, psi, tables, world  # noqa: E402

SYSTEM_VERSION = json.load(open(os.path.join(ROOT, "system.json"), encoding="utf-8"))["version"]
NOW = int(time.time() * 1000)
OUT = os.path.join(ROOT, "packs-src")


def stats():
    return {"coreVersion": "14.368", "systemId": "noreturn", "systemVersion": SYSTEM_VERSION, "createdTime": NOW,
            "modifiedTime": NOW, "lastModifiedBy": None, "compendiumSource": None, "duplicateSource": None, "exportSource": None}


def check_img(path):
    if not path or path.startswith("systems/"):
        return path
    rel = path[len("icons/"):] if path.startswith("icons/") else path
    full = os.path.join(FOUNDRY_ICONS, *rel.split("/"))
    return path if os.path.exists(full) else "icons/svg/item-bag.svg"


def item_docs(pack, items):
    docs = []
    names = set()
    for i, it in enumerate(items):
        name = it["name"]
        if name in names:
            raise SystemExit(f"Doppelter Name in {pack}: {name}")
        names.add(name)
        _id = stable_id(pack, name)
        docs.append({"_id": _id, "_key": f"!items!{_id}", "name": name, "type": it["type"], "img": check_img(it["img"]),
                     "system": it["system"], "effects": [], "folder": None, "sort": (i + 1) * 1000,
                     "ownership": {"default": 0}, "flags": {}, "_stats": stats()})
    return docs


def table_docs(tabs):
    docs = []
    for i, t in enumerate(tabs):
        tid = stable_id("tabellen", t["name"])
        results = []
        for j, r in enumerate(t["results"]):
            rid = stable_id("tabellen", t["name"], str(j))
            results.append({"_id": rid, "_key": f"!tables.results!{tid}.{rid}", "type": "text", "name": r["name"],
                            "img": None, "description": r["description"], "weight": r["weight"], "range": r["range"],
                            "drawn": False, "flags": {}, "_stats": stats()})
        docs.append({"_id": tid, "_key": f"!tables!{tid}", "name": t["name"], "img": check_img(t["img"]),
                     "description": t["description"], "results": [r["_id"] for r in results], "formula": t["formula"],
                     "replacement": True, "displayRoll": True, "folder": None, "sort": (i + 1) * 1000,
                     "ownership": {"default": 0}, "flags": {}, "_stats": stats(), "_embedded": results})
    return docs


def journal_docs(j):
    jid = stable_id("regeln", j["name"])
    pages = []
    for k, (title, content) in enumerate(j["pages"]):
        pid = stable_id("regeln", j["name"], title)
        pages.append({"_id": pid, "_key": f"!journal.pages!{jid}.{pid}", "name": title, "type": "text",
                      "title": {"show": True, "level": 1}, "image": {}, "text": {"content": content.strip(), "format": 1},
                      "video": {"controls": True, "volume": 0.5}, "src": None, "system": {}, "sort": (k + 1) * 1000,
                      "ownership": {"default": -1}, "flags": {}, "_stats": stats(), "category": None})
    return [{"_id": jid, "_key": f"!journal!{jid}", "name": j["name"], "pages": [p["_id"] for p in pages],
             "categories": [], "folder": None, "sort": 1000, "ownership": {"default": 0}, "flags": {}, "_stats": stats(),
             "_embedded": pages}]


def macro_docs():
    """SL-Makros (Compendium „Makros“)."""
    macros = [
        {"name": "Gefahr auslösen", "img": "icons/svg/biohazard.svg", "command": "game.noreturn.hazard();"},
        {"name": "Krankheit übertragen", "img": "icons/svg/poison.svg", "command": "game.noreturn.infectDialog();"},
        {"name": "Zeit vergeht (Strahlung, Krankheiten)", "img": "icons/svg/clockwork.svg", "command": "game.noreturn.elapsedDialog();"},
    ]
    docs = []
    for i, m in enumerate(macros):
        _id = stable_id("makros", m["name"])
        docs.append({"_id": _id, "_key": f"!macros!{_id}", "name": m["name"], "type": "script", "img": m["img"],
                     "scope": "global", "command": m["command"], "author": None, "folder": None, "sort": (i + 1) * 1000,
                     "ownership": {"default": 0}, "flags": {}, "_stats": stats()})
    return docs


def main():
    os.makedirs(OUT, exist_ok=True)
    psi_apps, missing = psi.apps(os.path.join(HERE, "data", "psi_params.json"))
    if missing:
        print("WARNUNG – PSI-Apps ohne Parameter:", missing)
    packs = {
        "spezies": item_docs("spezies", character.species()),
        "waffen": item_docs("waffen", arsenal.weapons()),
        "munition": item_docs("munition", arsenal.ammunition()),
        "ruestungen": item_docs("ruestungen", arsenal.armors()),
        "ausruestung": item_docs("ausruestung", arsenal.gear()),
        "augmentierung": item_docs("augmentierung", arsenal.augments()),
        "psi-kraefte": item_docs("psi-kraefte", psi.powers()),
        "psi-apps": item_docs("psi-apps", psi_apps),
        "style-skills": item_docs("style-skills", character.style_skills()),
        "abnormitaeten": item_docs("abnormitaeten", character.abnormalities()),
        "bio-eigenschaften": item_docs("bio-eigenschaften", character.bio_traits()),
        "vor-nachteile": item_docs("vor-nachteile", character.advantages()),
        "merkmale": item_docs("merkmale", character.traits()),
        "fertigkeiten": item_docs("fertigkeiten", character.special_skills()),
        "tabellen": table_docs(tables.rolltables()),
        "regeln": journal_docs(tables.journal()),
        "makros": macro_docs(),
        "krankheiten": item_docs("krankheiten", world.diseases()),
        "flora": item_docs("flora", world.flora()),
    }
    total = 0
    for name, docs in packs.items():
        with open(os.path.join(OUT, f"{name}.json"), "w", encoding="utf-8") as f:
            json.dump(docs, f, ensure_ascii=False, indent=1)
        print(f"{name:20s} {len(docs):4d} Dokumente")
        total += len(docs)
    print(f"Gesamt: {total}")


if __name__ == "__main__":
    main()
