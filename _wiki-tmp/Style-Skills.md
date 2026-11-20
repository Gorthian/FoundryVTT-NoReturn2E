# Style-Skills und Kampfkünste

Umsetzung der Style-Skills und Kampfkünste (Corebook S. 173–191). Alle 55 Style-Skills inklusive 16 Kampfkünste liegen im Compendium *Style-Skills* (Werte, Voraussetzungen, Kurzbeschreibung, Seitenverweis). Die Wirkung im Detail steht im Buch.

## Wie die Automatik funktioniert

- Jeder Style-Skill hat einen stabilen Schlüssel (`system.key`); die Spiellogik fragt `actor.styleLevel("<schlüssel>")` ab.
- **Numerische Effekte** stehen als Item-Modifikatoren am Style-Skill (bei Kampfkünsten mit „gilt ab Stufe“).
- **Hinweise und Aktionen** laufen über den Knopf **Einsetzen** (Chat-Symbol in der Itemzeile).

| Wirkung | Style-Skills |
|---|---|
| **Mehrfachangriff** im Angriffsdialog (je Angriff ein Verteidigungsknopf) | Akimbo, Quadruple Akimbo, Dual/Multiple Wielding, Fist of Rage, Storm of Fists; Shield Master (Blocken) |
| **Bonuswürfel/Schaden/Verteidigung/Widerstand** über Modifikatoren, teils je Angriffsart | Boxen, Capoeira, Jiu Jitsu, Karate, Kenjutsu, Kick-Boxen, Krav Maga, Muay Thai, Sado, Tae-Kwon-Do, ZPC, Ba-Kai-Do, Escrima, Gun-Fu |
| **Parade/Block/Fertigkeitswechsel** | Aikido, Jiu Jitsu, Escrima, Gun-Fu, Sado, ZPC, Krav Maga, Blademaster |
| **Konterschaden** nach Parade, **zwei Treffer an zwei Zonen** | Aikido 3, Kenjutsu 3; Boxen 3, Tae-Kwon-Do 3 |
| **Fahrzeuge** | Aim for the Heart, Sollbruchstelle |
| **Proben** (Zusatzfelder, Hinweise, Auto-Erfolg) | Fast Talk, Trusty Engineer, Parkour, Rage of Gods, Linguist u. a. |
| **PSI** | Memorum, Psionische Vielfältigkeit, Metamorphose |
| **Aktionen** per *Einsetzen* | Der Doktor, Mixology, Sterne-Küche, Rüttelflug, Power Nap, Déjà-vu |
| **Nur Hinweistext** | Billy the Kid, Kenjutsu 1, Ba-Kai-Do 1, Aikido 2, Parkour (Sprungschaden) u. a. |

Die Dauer von Bonus-/Maluswürfeln (Doktor, Speisen, Getränke) läuft nicht automatisch ab; der Wert im Kampf-Reiter wird von Hand zurückgesetzt.

## Split (zweite Persönlichkeit)

Jeder Split-Skill schaltet eine weitere **Persönlichkeit** frei. Umschalten über **Einsetzen** am Item oder das Masken-Symbol im Style-Skill-Abschnitt; der Profilname ist editierbar, im Chat erscheint ein Hinweis.

- **Wird je Persönlichkeit getauscht:** Fertigkeiten, PSI-Kräfte/-Apps, Charaktermerkmale, besondere Fertigkeiten (keine Sprachen).
- **Bleibt gemeinsam:** Körper, Attribute, Inventar, Wunden, Adrenalin, Style-Skills.
- Das Profil liegt im Flag `noreturn.split`; Zurückwechseln stellt es wieder her.

## Ringen und Clinch

Beim Angriff gibt es den Button **Clinch ansetzen** (statt Schaden).

- Der Gehaltene hat −2W auf alle Proben, Angriff und Verteidigung (nicht auf den Schadenswiderstand).
- **Befreien** per konkurrierender ST-Probe (Symbol im Style-Skill-Abschnitt); der Halter kann den Clinch auflösen.
- **Stufe 2:** Halter +3W beim Halten. **Stufe 3:** +2W auf Angriff und Schaden gegen den Clinch-Partner.
- Der Clinch endet bei Befreiung, Auflösen oder wenn ein Beteiligter ausscheidet. Ein Clinch je Ringer; Angriffe auf andere Ziele sind erlaubt (Hinweis im Chat).

Der Clinch ist ein Flag am Actor (kein Token-Symbol).

## Offen

Stufenwirkungen einzelner Kampfkünste (z. B. Aikido, Parkour) und weitere Style-Skills sind in den Issues erfasst, siehe [Bekannte Lücken](Bekannte-Luecken).
