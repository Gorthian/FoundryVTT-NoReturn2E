# NoReturn 2E – Foundry VTT System

Inoffizielles Spielsystem für **NoReturn 2. Edition** (Vario-D6 2.0, Mannifest Games) für Foundry Virtual Tabletop **v13 und v14** (getestet mit 14.368).

> Fan-Projekt ohne Verbindung zu Mannifest Games. Die Compendien enthalten Spielwerte und eigene Kurzfassungen mit Seitenverweisen auf das Corebook 2E – für die vollständigen Regeln wird das Buch benötigt.

## Installation

Foundry erkennt das System nur, wenn sein Ordner genau wie die System-ID heißt: **`noreturn`**. Der Repository-Name `FoundryVTT-NoReturn2E` funktioniert als Ordnername nicht.

**Per Git** (empfohlen, Updates mit `git pull`):

```
git clone https://github.com/Gorthian/FoundryVTT-NoReturn2E.git "%LOCALAPPDATA%\FoundryVTT\Data\systems\noreturn"
```

Linux: `git clone https://github.com/Gorthian/FoundryVTT-NoReturn2E.git ~/.local/share/FoundryVTT/Data/systems/noreturn`

**Als ZIP**: Auf GitHub *Code → Download ZIP* wählen, entpacken und den Ordner `FoundryVTT-NoReturn2E-main` in `noreturn` umbenennen, bevor er nach `%LOCALAPPDATA%\FoundryVTT\Data\systems\` kommt.

Danach Foundry starten und eine neue Welt mit dem System „NoReturn 2E“ anlegen.

## Funktionen

- **Würfelmechanik**: Pool aus Attribut + Fertigkeit, ein explodierender **Hazard-Di** (rot), 1-Würfel-Regel, Nachteil (−2W), Bonuspunkte, Mindestwürfe 5–40, **Passen** (2,5 je Würfel), **Leiden** (W6-Halbierung), Adrenalin/Meditation als Bonuswürfel oder Wiederholung per Chat-Button.
- **Charakterbogen**: 8 Attribute, alle 53 Fertigkeiten mit Pool-Anzeige, Sonderattribute, besondere Fertigkeiten und Sprachen, **11 Körperzonen** mit TP, Rüstung/MK und Schadensschwelle, automatischer Wundmalus, Bewusstlosigkeit, Organismus/Psyche mit Schwellen und Degenerationstabellen, Regeneration, Blutpunkte, EP/JP/CP, Bekanntheit, Butterfly Effect, **GP-Bilanz der Charaktererschaffung**, Steigern gegen EP (inkl. Butterfly-Halbierung und PNS).
- **Kampf im Chat**: Angriff (Feuermodi RM/HM/SM/VM/GM/SP, Rückstoß vs. RD inkl. ST/5, Zielen, Reichweiten-MW aus der Token-Entfernung, Munition & Sondermunition, Auflage) → Verteidigung durch das Ziel (steigender Malus je Defensivaktion, Parade/Blocken/Ausweichen/PSI) → Gute Treffer → Schaden (Trefferzone, Flächenschaden) → Widerstand (KO + Rüstung, panzerbrechend, Wucht vs. MK:A, NL-Schaden, Strukturschaden).
- **PSI**: Würfelpool auf Kraftstufen/Probe/Kompensation verteilen, Zielbereiche, Kraft sammeln & Overload, Haltung als Malus, Fehlschlagtabelle, KS-Werte im Effekttext werden ausgerechnet, Schaden-Buttons für Angriffs-Apps.
- **Fahrzeuge**: Profil (Handling, Geschwindigkeit, Manöver, Stabilität, Panzerung), Steuern/Stunt/Crash mit dem gewählten Fahrer, vitale Stellen, Fahrzeugschaden.
- **Initiative** per Reaktion (Mexican Standoff), Rundenwechsel setzt Defensivaktionen zurück, optionale Auto-Regeneration.
- **Item-Modifikatoren**: Spezies, Abnormitäten, Eigenschaften, Vorteile, Rüstung und Augmentierung verändern Werte automatisch; Robotik-Zonen ersetzen Attribute und TP der Zone.
- **16 Compendien** (751 Einträge): Spezies, 87 Waffen, Munition & Sprengstoffe, Schutzkleidung, Ausrüstung, Augmentierung, 12 PSI-Kräfte, 180 PSI-Apps, Style-Skills & 16 Kampfkünste, Abnormitäten, biologische Eigenschaften, Vor-/Nachteile, 128 Charaktermerkmale, besondere Fertigkeiten, Rolltables (Trefferzonen, PSI-Fehlschlag, Degeneration, Butterfly Effect) und ein Regel-Journal.

## Releases & Manifest

Foundry kann das System über die Manifest-URL installieren und aktualisieren und legt den Ordner `noreturn` dabei selbst an:

```
https://github.com/Gorthian/FoundryVTT-NoReturn2E/releases/latest/download/system.json
```

> Funktioniert erst, wenn das Repository öffentlich ist – Foundry kann private Releases nicht abrufen.

Neue Version veröffentlichen: Auf GitHub unter *Releases → Draft a new release* einen Tag wie `v1.0.1` anlegen und veröffentlichen. Der Workflow `.github/workflows/release.yml` setzt daraufhin `version` und `download` in der `system.json`, baut `noreturn.zip` und hängt beide Dateien an den Release.

## Compendien neu bauen

Die Inhalte liegen als Python-Quellen in `tools/src/`. Foundry muss dafür geschlossen sein.

```
tools\build-packs.cmd
```

Das Skript erzeugt `packs-src/*.json` und schreibt daraus die LevelDB-Compendien mit der Node-Laufzeit, die Foundry mitbringt (kein eigenes Node.js nötig).

## Hinweise zu den Regeln

- Grundlage ist das **2E-Corebook (2024)**. Das „Corebook Revisited“ ist die 1. Edition mit anderem Attributsystem (Schnelligkeit, Logik …) und wurde nur zum Abgleich genutzt.
- Einige Detailregeln bleiben bewusst Spielleiterentscheidung (Sperrfeuer, Crafting-Dauer, Verbluten, Taped-Ware-Defekte, CT-Verwandlung).
- Biologische Eigenschaften mit Zonenpanzerung („Panzer“) werden über den Modifikator „Körperpanzer: Zone“ eingetragen.

## Lizenz

Code: MIT. NoReturn ist eine eingetragene Marke von Manfred Altenschmidt / Mannifest Games; alle Rechte an Setting und Regelwerk verbleiben dort.
