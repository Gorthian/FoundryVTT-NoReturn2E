# Erste Schritte

## 1. Welt anlegen

Nach der [Installation](Installation): *Spielwelten → Welt erstellen*, als Spielsystem **NoReturn 2E** wählen. Neu angelegte Szenen bekommen automatisch das Raster **1 Feld = 1 m**, damit Reichweiten im Kampf aus der Token-Entfernung berechnet werden können.

## 2. Einstellungen

Unter *Einstellungen → Systemeinstellungen*:

- **Automatische Regeneration** (Welt): Kämpfer mit Regeneration regenerieren zu Beginn ihres Zuges.
- **Würfel anzeigen** (pro Spieler): zeigt die einzelnen Würfel in Probenkarten.

## 3. Ersten Charakter erstellen

Im Actor-Verzeichnis (Seitenleiste) gibt es den Button **Charaktergenerator**. Er führt in elf Schritten durch die Erschaffung und legt am Ende einen fertigen Charakter mit allen Items aus den Compendien an. Details: [Charaktergenerator](Charaktergenerator).

Alternativ: Charakter von Hand anlegen (*Actor erstellen → Charakter*) und Items aus den [Kompendien](Kompendien) per Drag & Drop auf den Bogen ziehen. Charaktere aus dem Verlags-Generator lassen sich per [JSON-Import](Import-und-Export) übernehmen.

## 4. Erste Probe

Auf dem Charakterbogen im Reiter *Werte* auf ein Attribut oder eine Fertigkeit klicken. Es öffnet sich der Probendialog (Pool aus Attribut + Fertigkeit, Mindestwurf, Nachteile, Bonuspunkte). Mehr dazu unter [Proben und Würfelpool](Proben-und-Wuerfelpool).

## 5. Erster Kampf

1. Tokens der Kämpfer auf die Szene ziehen, Kampf starten.
2. Waffe im Reiter *Kampf* per Chat-Symbol einsetzen, Ziel mit **T** anvisieren, Angriffsdialog ausfüllen.
3. Das Ziel verteidigt über den Knopf in der Angriffskarte, danach folgen Schaden und Widerstand per Chat-Buttons.

Ablauf im Detail: [Kampf und Schaden](Kampf-und-Schaden).

## Makros

Items eines Charakters lassen sich auf die Makroleiste ziehen und lösen dann direkt Probe, Angriff oder PSI-Wurf aus. Für Fortgeschrittene stehen unter `game.noreturn` mehrere Funktionen bereit (z. B. `game.noreturn.characterGenerator()`).
