# Charaktergenerator

Der Generator bildet die Charaktererschaffung des Corebooks (Kapitel 3, S. 134–136) nach. Start über den Button **Charaktergenerator** im Actor-Verzeichnis oder per Makro:

```js
game.noreturn.characterGenerator();
```

## Die elf Schritte

1. **Konzept & Powerniveau**
2. **Spezies** (inkl. Mutanten-Attribute, bei Erwachten Designoptionen und Robotische Adaption)
3. **Abnormitäten & biologische Eigenschaften** (Bio-Budget, Auffälligkeiten)
4. **Attribute**
5. **Fertigkeiten & Sprachen**
6. **PSI-Kräfte & Apps** (Gratis-Kräfte, Hierarchie)
7. **Style-Skills & Kampfkünste**
8. **Vor-/Nachteile** (Vorteilsmarker)
9. **Ausrüstung kaufen** (GP → New Dollar)
10. **Charaktermerkmale & Butterfly Effect**
11. **Zusammenfassung**

Die **GP-Bilanz** wird live angezeigt. Regelverstöße erscheinen als Hinweise am jeweiligen Schritt. Am Ende entsteht ein Charakter mit allen gewählten Items aus den Compendien.

## Sonderfälle

Der Generator berücksichtigt unter anderem: **N²** (zwei markierte Fertigkeiten, +1), **Meisterschaft**, **Mysteriöses Implantat**, **Meditation** (Stufen im Style-Skill), **HMO-Kräfte der Kategorie B**, **Einziehbar** sowie variable Vorteilsmarker (z. B. Feind, Verbündete). Welche Werte im Einzelnen gelten, steht im Corebook.

Gegen die Beispielcharaktere des NoReturn-Charakterkompendiums geprüft (Elena Rao, Edgar Callen, Ruth, c0-NG): Die GP-Werte stimmen überein.

## Bestehende Charaktere umbauen

Im Kopfzeilen-Menü (⋮) des Charakterbogens gibt es **Im Charaktergenerator umbauen**. Der Generator öffnet sich dann im Umbau-Modus, vorbelegt mit den Werten des Charakters.

Beim Übernehmen werden angepasst:

- Attribute, Fertigkeiten und Sprachen,
- vom Generator verwaltete Katalog-Items: Abnormitäten, Eigenschaften, Style-Skills, Vor-/Nachteile, Merkmale, PSI.

**Unverändert bleiben:** Ausrüstung, eigene Items, Schaden und Fortschritt (EP/JP/CP). Einkäufe im Warenkorb werden zusätzlich angelegt und vom vorhandenen Geld abgezogen. Items, die der Generator nicht kennt, werden aufgelistet und nicht angetastet.

Bei gesteigerten Charakteren zeigt die GP-Bilanz den Ist-Stand; Überschreitungen sind dort normal. Es gibt eine Rückfrage, wenn noch offene Punkte bestehen. Zum Umbau ist Bearbeitungsberechtigung am Charakter nötig.

## Verwandt

- [Import und Export](Import-und-Export) für den Verlags-Generator
- [Erwachte und Robotik](Erwachte-und-Robotik) für den Erwachten-Pfad
