# Import und Export (Verlags-Generator)

Charaktere aus dem Charaktergenerator des Verlags (JSON-Export mit `"format": "mannifest-character"`, Schema 12) lassen sich in Foundry übernehmen und wieder exportieren.

## Import

- **Neuer Charakter:** Button **JSON-Import** im Actor-Verzeichnis.
- **Bestehenden Charakter ersetzen:** Kopfzeilen-Menü (⋮) des Charakterbogens → **Import (Verlags-Generator)**.

Der Import läuft über den eingebauten [Charaktergenerator](Charaktergenerator), es gelten also dieselben Regeln (N², Implantat, Meisterschaft, Einziehbar, Designoptionen, HMO-Kräfte, Ganzkörper-Pakete bzw. Robotik je Zone). Was sich nicht zuordnen lässt, meldet eine Chat-Nachricht.

Ausrüstung mit Katalog-IDs des Verlags (z. B. `PK-001`) wird als **Platzhalter** angelegt und muss ggf. durch Compendium-Items ersetzt werden.

## Export

Kopfzeilen-Menü (⋮) → **Export (Verlags-Generator)** lädt eine JSON-Datei im selben Format herunter. Die Originaldatei bleibt am Actor gespeichert; unbekannte Felder und IDs gehen beim Export nicht verloren.

## Makro/API

```js
game.noreturn.mannifest.import(json);
game.noreturn.mannifest.export(actor);
```
