# -*- coding: utf-8 -*-
"""Hilfsfunktionen für die Compendium-Quellen."""
import os
import html
import hashlib

FOUNDRY_ICONS = os.environ.get("FOUNDRY_ICONS", r"C:\Program Files\Foundry Virtual Tabletop\resources\app\public\icons")
_cache = {}


def icon(folder, keyword="", fallback="icons/svg/item-bag.svg"):
    """Wähle ein vorhandenes Foundry-Kern-Icon aus einem Ordner, dessen Name das Stichwort enthält."""
    if folder == "svg":
        name = f"{keyword}.svg"
        path = os.path.join(FOUNDRY_ICONS, "svg", name)
        return f"icons/svg/{name}" if os.path.exists(path) else fallback
    key = (folder, keyword)
    if key in _cache:
        return _cache[key]
    d = os.path.join(FOUNDRY_ICONS, *folder.split("/"))
    result = fallback
    if os.path.isdir(d):
        files = sorted(f for f in os.listdir(d) if f.endswith((".webp", ".svg", ".png")))
        match = [f for f in files if keyword.lower() in f.lower()] if keyword else files
        if match:
            result = f"icons/{folder}/{match[0]}"
        elif files:
            result = f"icons/{folder}/{files[0]}"
    _cache[key] = result
    return result


def p(text, page=None):
    """Beschreibung als HTML-Absatz mit Seitenverweis auf das Corebook 2E."""
    if not text:
        return ""
    ref = f' <em class="nr-ref">(NoReturn 2E, S. {page})</em>' if page else ""
    return f"<p>{html.escape(text)}{ref}</p>"


def stable_id(*parts):
    """Deterministische 16-stellige Foundry-ID."""
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    h = hashlib.sha1("::".join(parts).encode("utf-8")).digest()
    n = int.from_bytes(h, "big")
    out = []
    for _ in range(16):
        n, r = divmod(n, len(alphabet))
        out.append(alphabet[r])
    return "".join(out)
