# Mitwirken und Releases

## Fehler und Wünsche

Bitte als [GitHub-Issue](https://github.com/Gorthian/FoundryVTT-NoReturn2E/issues) melden: Foundry-Version, Systemversion, Schritte zum Nachstellen, ggf. Fehlermeldung aus der Browser-Konsole (F12).

## Aufbau des Repositorys

| Ordner | Inhalt |
|---|---|
| `noreturn.mjs` | Einstiegspunkt (Hooks, Einstellungen, `game.noreturn`) |
| `module/` | Code: `documents/` (Actor, Item), `data/` (DataModels), `sheets/`, `dice/`, `apps/` (Charaktergenerator, Verlags-Import), `combat.mjs`, `psi.mjs`, `config.mjs` |
| `templates/` | Handlebars-Vorlagen (Bögen, Chat-Karten, Dialoge) |
| `lang/` | `de.json`, `en.json` (Deutsch ist Hauptsprache) |
| `styles/` | `noreturn.css` |
| `packs-src/` | Compendium-Quellen als JSON |
| `packs/` | Gebaute LevelDB-Compendien |
| `tools/` | Python-Quellen und Build-Skripte für die Compendien |

## Compendien neu bauen

Die Inhalte liegen als Python-Quellen in `tools/src/`. **Foundry muss dafür geschlossen sein.**

```
tools\build-packs.cmd
```

Das Skript erzeugt `packs-src/*.json` und schreibt daraus die LevelDB-Compendien mit der Node-Laufzeit, die Foundry mitbringt (kein eigenes Node.js nötig). Wer Compendien ändert, ändert die Quelle in `tools/src/`, baut neu und committet `packs-src/` und `packs/` mit.

## Continuous Integration

Bei jedem Push auf `main` und jedem Pull Request prüft `ci.yml`: Pflichtfelder und Verweise in `system.json`, JavaScript-Syntax und ob sich `packs-src` zu LevelDB-Packs bauen lässt.

## Release veröffentlichen

Foundry und The Forge installieren und aktualisieren das System über die Manifest-URL:

```
https://github.com/Gorthian/FoundryVTT-NoReturn2E/releases/latest/download/system.json
```

**Mit dem Release-Workflow (Pull Request #91):**

1. Auf GitHub *Actions → Release → Run workflow*.
2. Versionssprung (patch/minor/major) oder genaue Version wählen.
3. Der Workflow zählt `version` in `system.json` hoch, baut Compendien und `noreturn.zip`, committet nach `main`, setzt den Tag `vX.Y.Z` und legt den Release mit `system.json` und ZIP an.

Alternativ löst auch das Pushen eines Tags `vX.Y.Z` den Build aus. Solange #91 nicht gemergt ist, gilt der bisherige Weg: *Releases → Draft a new release* mit einem Tag wie `v1.0.1` und veröffentlichen; der Workflow setzt dann `version` und `download` in `system.json` und hängt beide Dateien an.

Nach dem Release erscheint in Foundry bzw. The Forge unter *Spielsysteme* ein **Update**-Button.

## Konventionen

- Foundry-Entwicklung nach den offiziellen Richtlinien: [System-Entwicklung](https://foundryvtt.com/article/system-development/), [API](https://foundryvtt.com/api/).
- Neue Texte kommen in beide Sprachdateien, Deutsch zuerst.
- **Keine wörtlichen Regeltexte** aus dem Corebook in Code, Compendien oder Wiki: eigene Kurzfassungen mit Seitenverweis.

## Lizenz

Code: MIT (gilt nur für den Code, nicht für Regelinhalte). NoReturn ist eine eingetragene Marke von Manfred Altenschmidt / Mannifest Games; alle Rechte an Setting und Regelwerk verbleiben dort.
