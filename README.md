# NoReturn 2E – Foundry VTT System

Inoffizielles Spielsystem für **NoReturn 2. Edition** (Vario-D6 2.0, Mannifest Games) für Foundry Virtual Tabletop **v13 und v14** (getestet mit 14.368).

> [!WARNING]
> **Bitte vor der Nutzung lesen**
>
> - **KI-generiert:** Dieses System wurde mit Hilfe von KI entwickelt.
> - **Frühe Beta-Phase:** Es fehlen Funktionen, Fehler sind zu erwarten. Getestet mit Foundry 14.368 (kompatibel: v13 und v14).
> - **Nutzung auf eigene Gefahr:** Mit jedem Update können Änderungen kommen, die bestehende Inhalte (Charaktere, Items, Welten) beschädigen. **Lege vor jedem Update ein Backup deiner Welt an.**
> - **Inoffizielles Fan-Projekt** in Rücksprache mit [Mannifest Games](https://www.mannifest-games.de/), aber kein offizielles Produkt von Mannifest Games.
> - **Alle Rechte** an NoReturn, Setting und Regelwerk verbleiben bei Mannifest Games. Die Code-Lizenz (MIT) gilt nur für den Code, nicht für Regelinhalte.
> - **Fehler** bitte als [GitHub-Issue](https://github.com/Gorthian/FoundryVTT-NoReturn2E/issues) melden.
>
> Beim Start einer Welt zeigt das System diesen Hinweis als Dialog (pro Spieler bis zur nächsten Version ausblendbar; erneut per Makro `game.noreturn.showNotice()`).

Die Compendien enthalten Spielwerte und eigene Kurzfassungen mit Seitenverweisen auf das Corebook 2E – für die vollständigen Regeln wird das Buch benötigt.

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

## Charaktergenerator

In der Actor-Seitenleiste gibt es den Button **Charaktergenerator** (oder per Makro: `game.noreturn.characterGenerator()`). Er führt in elf Schritten durch die Erschaffung nach S. 134–136:

Konzept & Powerniveau → Spezies (inkl. Mutanten-Attribute) → Abnormitäten & biologische Eigenschaften (Bio-Budget, Auffälligkeiten) → Attribute → Fertigkeiten & Sprachen → PSI-Kräfte & Apps (Gratis-Kräfte, Hierarchie) → Style-Skills & Kampfkünste → Vor-/Nachteile (Vorteilsmarker) → Ausrüstung kaufen (GP → New Dollar) → Charaktermerkmale & Butterfly Effect → Zusammenfassung.

Die GP-Bilanz wird live angezeigt, Regelverstöße erscheinen als Hinweise am jeweiligen Schritt. Am Ende entsteht ein fertiger Charakter mit allen Items aus den Compendien.

Sonderfälle bei der Erschaffung: **N²** (zwei markierte Fertigkeiten bis 6, +1), **Meisterschaft** (je markierter Fertigkeit +1 und ein Marker), **Mysteriöses Implantat** (zwei Wissens-Fertigkeiten +1), **Meditation** (Stufe 1 im Style-Skill, weitere Stufen 5 GP), **HMO-Kräfte der Kategorie B** (eine frei, weitere 7 GP), **Einziehbar** (+5 GP für sichtbare Eigenschaften bis 15 GP) und variable Vorteilsmarker (z. B. Feind, Verbündete).

Gegen das NoReturn-Charakterkompendium getestet: Elena Rao (Adivasi), Edgar Callen (Zeneritone), Ruth (Blendling/gHMO) und c0-NG (Erwachter) ergeben GP-genau dieselben Werte wie die Bögen im Kompendium.

## Im-/Export für den Verlags-Charaktergenerator

Charaktere aus dem Charaktergenerator des Verlags (JSON-Export, `"format": "mannifest-character"`, Schema 12) lassen sich übernehmen:

- **Neuer Charakter:** Button **JSON-Import** in der Actor-Seitenleiste.
- **Bestehenden Charakter ersetzen:** Kopfzeilen-Menü (⋮) des Charakterbogens → **Import (Verlags-Generator)**.
- **Export:** Kopfzeilen-Menü → **Export (Verlags-Generator)** lädt eine JSON-Datei im selben Format herunter.
- **Makro/API:** `game.noreturn.mannifest.import(json)` bzw. `game.noreturn.mannifest.export(actor)`.

Der Import läuft über den eingebauten Charaktergenerator, es gelten also dieselben Regeln (N², Implantat, Meisterschaft, Einziehbar, Designoptionen, HMO-Kräfte, Ganzkörper-Pakete bzw. Robotik je Zone). Was sich nicht zuordnen lässt, meldet eine Chat-Nachricht. Ausrüstung mit Katalog-IDs des Verlags (z. B. `PK-001`) wird als Platzhalter angelegt. Die Originaldatei bleibt am Actor gespeichert, unbekannte Felder und IDs gehen beim Export nicht verloren.

## Erwachte (S. 145–147)

Spezies mit dem Flag „Erwachter“ erhalten automatisch: Schmerztoleranz 10, kein Adrenalin/Organismus/Infektionsresistenz, 70 TP und 10p. Chassis-Panzerung (MK:A, mit Strukturupgrade MK:B) an jeder Zone, Kapazität 16 je Zone, nur Zonen 12/6/8 letal, Höchstwerte GE 8 · ST 20 · KO 20 · BE 10. GE/ST/KO/BE/WA lassen sich nicht mit EP steigern, sondern nur über **Ganzkörper-Upgrade-Pakete** bzw. Cybersense (Compendium „Augmentierung“). Dort liegen auch die **Designoptionen** (Flugtauglich, Fortbewegung, Fusionsbatterie, Nanitenprototyp, Strukturupgrade). Im Kampf-Reiter gibt es **Robotik-Overdrive** (auch für Robotik-Zonen anderer Spezies) und die **EMP/Technokinese-Reaktion**. Der Charaktergenerator hat einen eigenen Erwachten-Pfad inkl. Robotischer Adaption (bis 80 GP, ohne Auffälligkeiten).

**Im Generator:** Designoptionen und **Robotische Adaption** (S. 147: Robotik-Versionen biologischer Eigenschaften bis 80 GP, ohne Auffälligkeiten; ausgeschlossen sind dicke Haut/Fell, Panzer, Adrenalinkammern, gesteigerte Fertigkeit, Giftresistenz, Regeneration, Schmerzresistenz, sechster Sinn, verbesserte Wahrnehmung, verdichtete Muskulatur) stehen im Schritt „Spezies“; die GP-Leiste fasst beides als „Robotischer Körper“ zusammen. Ganzkörper-Pakete (S. 146) kosten je Stufe unterschiedlich viel Kapazität in jeder Zone: GE und BE 0,5 (11.000 N$), ST und KO 0,25 (5.500 N$) – der Ausrüstungsschritt zeigt die Aufschlüsselung.

## Robotik & Kapazität (S. 218)

Robotikmodelle werden je Körperzone eingebaut (Zone im Itembogen wählen). **Robotik-Upgrades** (GE/ST/KO/BE +1, Panzerung +10) wirken auf die im Item gewählte robotische Zone; die **Anzahl** zählt als Stufen und multipliziert Wert und Kapazität. Die Zonenwerte werden auf GE 8, ST 20, KO 20, BE 10 begrenzt und fließen über den Durchschnitt aller 11 Zonen in die Attribute ein. Upgrades in organischen Zonen bleiben wirkungslos und werden im Zonen-Tooltip markiert. Kapazität ist reiner Einbauplatz – sie verändert keine Werte, eine Überschreitung wird nur angezeigt. Bei Erwachten wirken Einzelzonen-Upgrades auf jede Zone, Ganzkörper-Pakete auf alle Zonen gleichzeitig.

## Style-Skills & Kampfkünste (S. 179–191)

Style-Skills haben einen stabilen Schlüssel (`system.key`, bei älteren Items wird er zur Laufzeit aus dem Namen ergänzt); die Spiellogik fragt `actor.styleLevel("<schlüssel>")` ab. Numerische Effekte stehen als Item-Modifikatoren am Style-Skill (bei Kampfkünsten mit „gilt ab Stufe“), Hinweise und Aktionen am Knopf **Einsetzen** (Chat-Symbol in der Itemzeile).

| Wirkung | Style-Skills |
|---|---|
| **Mehrfachangriff** im Angriffsdialog (je Angriff ein Verteidigungsknopf, eine Defensivaktion deckt mehrere Angriffe ab, wenn der Verteidiger selbst Mehrfachangriffe führen kann) | Akimbo, Quadruple Akimbo, Dual/Multiple Wielding, Fist of Rage, Storm of Fists; Shield Master (Blocken) |
| **Bonuswürfel/Schadenswürfel/Verteidigung/Widerstand** über Modifikatoren (`attack.*`, `damage.*`, `defense.*`, `resist.*`, `dice.<fertigkeit>`) mit Angriffsart (Faust, Tritt, Knie, Kralle …) | Boxen, Capoeira, Jiu Jitsu, Karate, Kenjutsu, Kick-Boxen, Krav Maga, Muay Thai, Sado, Tae-Kwon-Do, ZPC, Ba-Kai-Do, Escrima 3, Gun-Fu 3 |
| **Parade/Block/Fertigkeitswechsel** (Nahkampf-Parade, Blocken mit Nahkampf, Nahkampf ↔ Waffenkampf, Feuerwaffen im Nahkampf, Parade gegen Fernkampf) | Aikido, Jiu Jitsu, Escrima, Gun-Fu, Sado, ZPC, Krav Maga, Blademaster |
| **Konterschaden** nach erfolgreicher Parade, **zwei Treffer an zwei Zonen** | Aikido 3, Kenjutsu 3; Boxen 3, Tae-Kwon-Do 3 |
| **Fahrzeuge** (kein Malus/vitale Stelle bei gezielten Angriffen, Manöverwert −1) | Aim for the Heart, Sollbruchstelle |
| **Proben** (Zusatzfelder, Hinweise, automatischer Erfolg, GP-Bilanz) | Fast Talk, Trusty Engineer, Parkour, Rage of Gods, Linguist; Hinweise: Anonymous, Neo, Crash-Override, CrapGyver, Beastmaster, Pet Pal, Goldene Zunge, Trickster |
| **PSI** | Memorum (Haltung −1), Psionische Vielfältigkeit (zusätzliche Ziele), Metamorphose (umschaltbar, +1 KS, −1W körperlich) |
| **Aktionen** per *Einsetzen* | Der Doktor, Mixology, Sterne-Küche (Bonus-/Maluswürfel auf Ziele, Feld „Temp. Bonuswürfel“), Rüttelflug, Power Nap, Déjà-vu (Einsatzzähler) |
| **Nur Hinweistext** (kein Aktionszähler, keine Sturzschadens-Berechnung) | Billy the Kid, Kenjutsu 1, Ba-Kai-Do 1, Aikido 2, Parkour (Sprungschaden) |
| **Offen** (Designentscheidung) | Split (zweite Persönlichkeit), Ringen (Clinch-Zustand) |

Die Dauer von Bonus-/Maluswürfeln (Doktor, Speisen, Getränke) läuft nicht automatisch ab; der Wert im Reiter Kampf wird von Hand zurückgesetzt. Die Pack-Quelle für diese Daten ist `tools/src/character.py` (`STYLE_KEYS`, `STYLE_EXTRA`).

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

Code: MIT (gilt nur für den Code, nicht für Regelinhalte). NoReturn ist eine eingetragene Marke von Manfred Altenschmidt / Mannifest Games; alle Rechte an Setting und Regelwerk verbleiben dort.
