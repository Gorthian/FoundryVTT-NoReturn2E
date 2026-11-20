# Installation

Voraussetzung: Foundry VTT **v13 oder v14** (getestet mit 14.368). Das System selbst enthält keine Regeltexte – für die vollständigen Regeln wird das Corebook 2E benötigt.

> [!WARNING]
> Frühe Beta. Lege vor der Installation und **vor jedem Update ein Backup deiner Welt** an (siehe unten).

## Empfohlen: Manifest-URL

1. Foundry starten, im Reiter **Spielsysteme** auf **Spielsystem installieren** klicken.
2. Unten bei **Manifest-URL** eintragen:

   ```
   https://github.com/Gorthian/FoundryVTT-NoReturn2E/releases/latest/download/system.json
   ```
3. **Installieren** klicken. Foundry legt den Ordner `noreturn` selbst an.
4. Neue Welt mit dem System **NoReturn 2E** anlegen (siehe [Erste Schritte](Erste-Schritte)).

Updates erscheinen danach wie bei jedem Foundry-System im Reiter *Spielsysteme* (**Update**).

## The Forge

Auf The Forge funktioniert die Installation per Manifest-URL genauso: im Bazaar bzw. unter *Game Systems* → *Install Game System* die obige URL einfügen. Die Welt anschließend wie gewohnt über das Forge-Dashboard starten. Hinweis: Als Hosting-Plattform wurde The Forge bisher nicht gezielt getestet. Fehler dort bitte als [Issue](https://github.com/Gorthian/FoundryVTT-NoReturn2E/issues) melden.

## Alternative: Git oder ZIP (für Entwickler)

Foundry erkennt das System nur, wenn der Ordner genau wie die System-ID heißt: **`noreturn`**. Der Repository-Name `FoundryVTT-NoReturn2E` funktioniert nicht als Ordnername.

```
git clone https://github.com/Gorthian/FoundryVTT-NoReturn2E.git "%LOCALAPPDATA%\FoundryVTT\Data\systems\noreturn"
```

Linux: `git clone https://github.com/Gorthian/FoundryVTT-NoReturn2E.git ~/.local/share/FoundryVTT/Data/systems/noreturn`

Bei ZIP-Download (*Code → Download ZIP*) den entpackten Ordner `FoundryVTT-NoReturn2E-main` in `noreturn` umbenennen, bevor er nach `…\FoundryVTT\Data\systems\` kommt. Updates dann mit `git pull`.

Für die Entwicklung gilt: Die gebauten Compendien liegen in `packs/` (LevelDB). Wie sie aus den Quellen neu gebaut werden, steht unter [Mitwirken und Releases](Mitwirken-und-Releases).

## Updates

1. **Welt sichern** (siehe Backup).
2. Foundry schließen bzw. die Welt beenden.
3. Im Reiter *Spielsysteme* aktualisieren (Manifest-Installation) oder `git pull` ausführen.
4. Welt starten und prüfen: Charaktere öffnen, eine Probe würfeln.

Bei jedem Update können sich Datenmodelle ändern. Bestehende Charaktere werden nicht automatisch angepasst; falls etwas fehlt, hilft oft der [Umbau im Charaktergenerator](Charaktergenerator#bestehende-charaktere-umbauen).

## Backup

- **Welt:** Foundry beenden und den Ordner der Welt kopieren: `Data/worlds/<weltname>` (Standardpfad unter Windows `%LOCALAPPDATA%\FoundryVTT\Data\worlds`).
- **Einzelne Charaktere:** Rechtsklick auf den Actor → **Export Data** (JSON) oder als Compendium-Eintrag exportieren.
- Auf The Forge: Welt im Dashboard exportieren bzw. das Forge-Backup nutzen.

Beim Start einer Welt zeigt das System einen Hinweisdialog zu Beta-Status und Rechten; er lässt sich pro Spieler bis zur nächsten Version ausblenden und per Makro `game.noreturn.showNotice()` erneut öffnen (ab dem Release mit PR #92).
