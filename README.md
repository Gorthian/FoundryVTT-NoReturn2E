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

## Was kann das System?

Charakterbogen mit 11 Körperzonen, Würfelpool mit Hazard-Di, Kampf im Chat (Angriff, Verteidigung, Schaden, Widerstand), PSI, Fahrzeuge, ein Charaktergenerator in elf Schritten (inkl. Umbau bestehender Charaktere und Import aus dem Verlags-Generator), Style-Skills und Kampfkünste sowie 16 Compendien mit über 750 Einträgen.

## Installation

In Foundry unter *Spielsysteme → Spielsystem installieren* diese **Manifest-URL** eintragen:

```
https://github.com/Gorthian/FoundryVTT-NoReturn2E/releases/latest/download/system.json
```

Das funktioniert auch auf The Forge. Updates erscheinen danach im Reiter *Spielsysteme*. **Lege vor jedem Update ein Backup deiner Welt an.** Die Compendien sind nur im Release enthalten (sie werden dort aus `packs-src` gebaut); bei einer Installation direkt aus dem Git-Repository fehlen sie, siehe [Entwicklung](#entwicklung-compendien-bauen). Details (Git/ZIP, Updates, Backup): [Wiki → Installation](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Installation).

## Dokumentation

Die ausführliche Dokumentation steht im **[Wiki](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki)**:

- [Erste Schritte](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Erste-Schritte) · [FAQ](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/FAQ)
- [Charaktergenerator](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Charaktergenerator) · [Import und Export](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Import-und-Export) · [Charakterbogen](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Charakterbogen) · [Erwachte und Robotik](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Erwachte-und-Robotik)
- [Proben und Würfelpool](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Proben-und-Wuerfelpool) · [Kampf und Schaden](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Kampf-und-Schaden) · [PSI](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/PSI) · [Style-Skills](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Style-Skills) · [Fahrzeuge](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Fahrzeuge)
- [Kompendien](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Kompendien) · [Bekannte Lücken](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Bekannte-Luecken)
- [Mitwirken und Releases](https://github.com/Gorthian/FoundryVTT-NoReturn2E/wiki/Mitwirken-und-Releases) (Compendien bauen, Release veröffentlichen)

## Entwicklung: Compendien bauen

Im Repository liegen nur die Quellen der Compendien (`packs-src/*.json`). Die LevelDB-Packs in `packs/` sind ein Build-Artefakt (stehen in `.gitignore`) und werden vom Release-Workflow gebaut und ins Release-ZIP gelegt. Eine reine Git-Installation (ohne Release) enthält deshalb **keine** Compendien – dafür das Manifest bzw. das Release-ZIP verwenden oder lokal bauen:

```
npm install          # einmalig (Node.js 20+), holt @foundryvtt/foundryvtt-cli
npm run validate:packs   # prüft packs-src gegen die DataModels (module/data)
npm run build:packs      # schreibt packs/<name> (LevelDB)
npm run build            # beides nacheinander
```

Unter Windows genügt `tools\build-packs.cmd`. Foundry sollte beim Bauen geschlossen sein, falls das System dort installiert ist. CI (`.github/workflows/ci.yml`) führt Prüfung und Build bei jedem Push/PR aus. Bearbeitet werden nur die JSON-Dateien in `packs-src/`; `tools/build_sources.py` kann sie optional aus den Python-Quelldaten in `tools/src` neu erzeugen.

## Fehler melden

Fehler und Wünsche bitte als [GitHub-Issue](https://github.com/Gorthian/FoundryVTT-NoReturn2E/issues) melden.

## Lizenz

Code: MIT (gilt nur für den Code, nicht für Regelinhalte). NoReturn ist eine eingetragene Marke von Manfred Altenschmidt / Mannifest Games; alle Rechte an Setting und Regelwerk verbleiben dort.
