# Proben und Würfelpool

Alle Proben laufen über den Probendialog des Systems (Vario-D6 2.0). Die Regeln stehen im Corebook (Kapitel 2); hier steht, wie das System sie abbildet.

## Pool

Der Pool setzt sich aus **Attribut + Fertigkeit** zusammen. Der Bogen zeigt die Pool-Größe an jeder Fertigkeit. Dazu kommen:

- **Hazard-Di** (roter, explodierender Würfel),
- die **1-Würfel-Regel**,
- **Nachteile** (−2W je Nachteil, per Feld im Dialog),
- **Bonuswürfel** (temporär, aus Items oder von Hand),
- **Ungeübt-Regel** für Fertigkeiten ohne Stufe,
- Wund- und sonstige Mali aus dem Charakterzustand.

## Dialog-Optionen

- **Mindestwurf** 5–40,
- **Bonuspunkte**,
- **Passen** (feste Augenzahl je Würfel statt Würfeln),
- **Leiden** (Halbierung der Würfel über W6),
- **Adrenalin / Meditation** als Bonuswürfel oder Wiederholung (per Chat-Button, auch nachträglich).

## Chat-Karte

Die Probenkarte zeigt Ergebnis, Mindestwurf und – wenn aktiviert (*Würfel anzeigen*) – die einzelnen Würfel. Adrenalin-/Meditations-Wiederholungen hängen als Buttons an der Karte.

## Makros

Für alltägliche Proben reicht der Klick auf Attribut oder Fertigkeit im Charakterbogen. Items eines Charakters lassen sich auf die Makroleiste ziehen. Für Fortgeschrittene stehen Funktionen unter `game.noreturn` bereit (u. a. `rollPool`, `rollHitZone`, `attackWithWeapon`, `castPsiApp`).

## Grenzen

Fertigkeitsspezifische Sonderregeln (Anlauf, Zero-G, Springen, Inspirieren u. a.) laufen als normale Proben ohne Folgelogik. Siehe [Bekannte Lücken](Bekannte-Luecken).
