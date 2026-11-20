/**
 * Zentrale Regelkonstanten für NoReturn 2E (Vario-D6 2.0).
 * Seitenangaben beziehen sich auf das NoReturn 2E Corebook (2024).
 */
export const NR = {};

/** Die acht Attribute (S. 81–83). */
NR.attributes = {
  ge: { label: "Geschick", abbr: "GE", physical: true },
  st: { label: "Stärke", abbr: "ST", physical: true },
  ko: { label: "Konstitution", abbr: "KO", physical: true },
  be: { label: "Beweglichkeit", abbr: "BE", physical: true },
  wa: { label: "Wahrnehmung", abbr: "WA", physical: true },
  wi: { label: "Wissen", abbr: "WI", physical: false },
  ch: { label: "Charisma", abbr: "CH", physical: false },
  ha: { label: "Handwerk", abbr: "HA", physical: false }
};

/**
 * Fertigkeiten (S. 107–112). defensive = als Defensivaktion nutzbar.
 * alt = alternatives Attribut, das laut Regeln statt des Standards gewählt werden darf.
 */
NR.skills = {
  // Geschick
  bodenfahrzeuge: { label: "Bodenfahrzeuge", attr: "ge" },
  fluggeraete: { label: "Fluggeräte", attr: "ge" },
  geschuetze: { label: "Geschütze", attr: "ge" },
  projektilwaffen: { label: "Projektilwaffen", attr: "ge" },
  raumjaeger: { label: "Raumjäger", attr: "ge" },
  raumschiff: { label: "Raumschiff", attr: "ge" },
  schiessen: { label: "Schießen", attr: "ge" },
  schwereWaffen: { label: "Schwere Waffen", attr: "ge" },
  spruehwaffen: { label: "Sprühwaffen", attr: "ge" },
  taschendiebstahl: { label: "Taschendiebstahl", attr: "ge" },
  wasserfahrzeuge: { label: "Wasserfahrzeuge", attr: "ge" },
  wurfwaffen: { label: "Wurfwaffen", attr: "ge" },
  // Stärke
  stemmen: { label: "Stemmen", attr: "st" },
  // Konstitution
  ausdauer: { label: "Ausdauer", attr: "ko" },
  blocken: { label: "Blocken", attr: "ko", defensive: true },
  saufen: { label: "Saufen", attr: "ko" },
  // Beweglichkeit
  akrobatik: { label: "Akrobatik", attr: "be", defensive: true },
  ausweichen: { label: "Ausweichen", attr: "be", defensive: true },
  klettern: { label: "Klettern", attr: "be" },
  nahkampf: { label: "Nahkampf", attr: "be", defensive: true },
  reiten: { label: "Reiten", attr: "be" },
  rennen: { label: "Rennen", attr: "be" },
  schwimmen: { label: "Schwimmen", attr: "be" },
  springen: { label: "Springen", attr: "be", defensive: true },
  waffenkampf: { label: "Waffenkampf", attr: "be", defensive: true },
  zeroG: { label: "Zero-G", attr: "be" },
  // Wahrnehmung
  heimlichkeit: { label: "Heimlichkeit", attr: "wa" },
  nachforschen: { label: "Nachforschen", attr: "wa" },
  orientierung: { label: "Orientierung", attr: "wa" },
  reaktion: { label: "Reaktion", attr: "wa" },
  schaetzen: { label: "Schätzen", attr: "wa" },
  // Wissen
  astronomie: { label: "Astronomie", attr: "wi" },
  chemie: { label: "Chemie", attr: "wi" },
  computer: { label: "Computer", attr: "wi" },
  gassenwissen: { label: "Gassenwissen", attr: "wi" },
  grossraumschiff: { label: "Großraumschiff", attr: "wi" },
  medizin: { label: "Medizin", attr: "wi" },
  naturkunde: { label: "Naturkunde", attr: "wi" },
  sagenMythen: { label: "Sagen & Mythen", attr: "wi" },
  spezies: { label: "Spezies", attr: "wi" },
  willenskraft: { label: "Willenskraft", attr: "wi", alt: "st" },
  // Charisma
  dressieren: { label: "Dressieren", attr: "ch" },
  einschuechtern: { label: "Einschüchtern", attr: "ch", alt: "st" },
  inspirieren: { label: "Inspirieren", attr: "ch" },
  menschenkenntnis: { label: "Menschenkenntnis", attr: "ch" },
  schauspiel: { label: "Schauspiel", attr: "ch" },
  ueberreden: { label: "Überreden", attr: "ch" },
  verhandeln: { label: "Verhandeln", attr: "ch" },
  // Handwerk
  basteln: { label: "Basteln", attr: "ha" },
  elektronik: { label: "Elektronik", attr: "ha" },
  feuerwaffenbau: { label: "Feuerwaffenbau", attr: "ha" },
  kunst: { label: "Kunst", attr: "ha" },
  mechanik: { label: "Mechanik", attr: "ha" },
  robotik: { label: "Robotik", attr: "ha" },
  ruestungsbau: { label: "Rüstungsbau", attr: "ha" },
  sicherheitstechnik: { label: "Sicherheitstechnik", attr: "ha" },
  waffenbau: { label: "Waffenbau", attr: "ha" }
};

/** Mindestwürfe (S. 85). */
NR.difficulties = {
  0: "Keine (offen)",
  5: "Routiniert (5)",
  10: "Normal (10)",
  15: "Anspruchsvoll (15)",
  20: "Schwer (20)",
  25: "Sehr schwer (25)",
  30: "Episch (30)",
  40: "Legendär (40)"
};

/** Körperzonen 2W6 (S. 91). lethal = letale Zone (S. 98). half = Körperhälfte. */
NR.zones = {
  12: { label: "Kopf", short: "Kopf", lethal: true, halves: ["oben"] },
  11: { label: "Bein unten links", short: "U.-Bein li.", lethal: false, halves: ["unten", "links"] },
  10: { label: "Oberschenkel links", short: "O.-Schenkel li.", lethal: false, halves: ["unten", "links"] },
  9: { label: "Arm links", short: "Arm li.", lethal: false, halves: ["oben", "links"] },
  8: { label: "Torso links", short: "Torso li.", lethal: true, halves: ["oben", "links"] },
  7: { label: "Rumpf", short: "Rumpf", lethal: true, halves: ["oben"] },
  6: { label: "Torso rechts", short: "Torso re.", lethal: true, halves: ["oben", "rechts"] },
  5: { label: "Arm rechts", short: "Arm re.", lethal: false, halves: ["oben", "rechts"] },
  4: { label: "Oberschenkel rechts", short: "O.-Schenkel re.", lethal: false, halves: ["unten", "rechts"] },
  3: { label: "Bein unten rechts", short: "U.-Bein re.", lethal: false, halves: ["unten", "rechts"] },
  2: { label: "Becken", short: "Becken", lethal: true, halves: ["unten"] }
};
NR.zoneKeys = ["12", "9", "8", "7", "6", "5", "2", "10", "4", "11", "3"];

/** Zielen (S. 90): Malus-Würfel Nah/Fern. */
NR.aiming = {
  random: { label: "Zufälliges Ziel (ganzer Körper)", melee: 0, ranged: 0 },
  half: { label: "Zufällige Körperhälfte", melee: 1, ranged: 0 },
  zone: { label: "Bestimmte Körperzone", melee: 2, ranged: 1 },
  exact: { label: "Exakte Stelle (Weichteile +10p.)", melee: 4, ranged: 3 }
};

/** Materialkategorien (S. 99). */
NR.materialCategories = { "": "–", A: "MK:A", B: "MK:B", C: "MK:C" };
NR.mkRank = { "": 0, A: 1, B: 2, C: 3 };

/** Welche Rüstung eine Waffe ignoriert. */
NR.armorPiercing = {
  "": "Keine",
  A: "Ignoriert MK:A",
  B: "Ignoriert bis MK:B",
  C: "Ignoriert bis MK:C",
  all: "Ignoriert jede Rüstung"
};

NR.damageTypes = {
  klinge: "Klinge",
  stich: "Stich/Spitz",
  wucht: "Wucht",
  scharf: "Scharf (Wurf)",
  projektil: "Projektil",
  explosiv: "Explosiv",
  hitze: "Hitze/Feuer",
  kaelte: "Kälte",
  elektro: "Elektrizität",
  saeure: "Säure",
  psi: "Psionisch",
  gift: "Gift"
};

/** Waffenkategorien → Standardfertigkeit & Reichweitenprofil (S. 93–97, 226–238). */
NR.weaponCategories = {
  unbewaffnet: { label: "Waffenlos/körpereigen", skill: "nahkampf", melee: true },
  faustkampf: { label: "Faustkampfwaffe", skill: "nahkampf", melee: true },
  nahkampf: { label: "Nahkampfwaffe", skill: "waffenkampf", melee: true, parry: true },
  schild: { label: "Schild", skill: "blocken", melee: true, shield: true },
  wurf: { label: "Wurfwaffe", skill: "wurfwaffen", range: "wurf" },
  faustfeuer: { label: "Faustfeuerwaffe", skill: "schiessen", range: "pistole" },
  gewehr: { label: "Gewehr", skill: "schiessen", range: "sturmgewehr" },
  schnellfeuer: { label: "Schnellfeuerwaffe", skill: "schiessen", range: "sturmgewehr" },
  gatling: { label: "Gatling-Waffe", skill: "schiessen", range: "gatling" },
  schwer: { label: "Schwere Waffe", skill: "schwereWaffen", range: "granatwerfer" },
  spruehwaffe: { label: "Sprühwaffe", skill: "spruehwaffen", range: "variabel" },
  projektil: { label: "Projektilwaffe (Bogen/Armbrust)", skill: "projektilwaffen", range: "armbrust" },
  geschuetz: { label: "Geschütz", skill: "geschuetze", range: "geschuetz" }
};

/** Reichweiten bis Kurz/Mittel/Weit/Extrem in Metern (S. 94). MW 10/20/30/40. */
NR.ranges = {
  none: { label: "Nahkampf / keine", steps: null },
  pistole: { label: "Pistole / Revolver / MP", steps: [15, 30, 100, 250] },
  shotgun: { label: "Shotgun / Pumpgun", steps: [15, 30, 250, 600] },
  sturmgewehr: { label: "Sturmgewehr / MG", steps: [150, 400, 1000, 2800] },
  scharfschuetze: { label: "Scharfschützengewehr", steps: [600, 1200, 1800, 2800] },
  granatwerfer: { label: "Granatwerfer", steps: [15, 40, 150, 350] },
  gatling: { label: "Gatlingwaffen", steps: [100, 300, 1500, 4700] },
  recurve: { label: "Recurvebogen", steps: [10, 25, 70, 350] },
  langbogen: { label: "Langbogen", steps: [10, 25, 90, 300] },
  compound: { label: "Compoundbogen", steps: [15, 35, 150, 400] },
  handarmbrust: { label: "Handarmbrust", steps: [15, 30, 70, 150] },
  armbrust: { label: "Armbrust", steps: [15, 30, 100, 250] },
  wurf: { label: "Wurfwaffen (× ST)", steps: [2, 3, 7, 12], perST: true },
  geschuetz: { label: "Geschütz", steps: [500, 1500, 2500, 3500] },
  variabel: { label: "Variabel (siehe Waffe)", steps: null }
};
NR.rangeBands = [
  { key: "kurz", label: "Kurz", mw: 10 },
  { key: "mittel", label: "Mittel", mw: 20 },
  { key: "weit", label: "Weit", mw: 30 },
  { key: "extrem", label: "Extrem", mw: 40 }
];

/** Feuermodi (S. 96–97). */
NR.fireModes = {
  RM: { label: "Repetiermodus (RM)", recoil: 1, ammo: 1, attackDice: 0, goodHitStep: 10, actions: 1 },
  HM: { label: "Halbautomatisch (HM)", recoil: 1, ammo: 1, attackDice: 0, goodHitStep: 10, actions: 1 },
  SM: { label: "Salvenmodus (SM)", recoil: 3, ammo: 3, attackDice: 2, goodHitStep: 5, actions: 1 },
  VM: { label: "Vollautomatisch (VM)", recoil: 10, ammo: 10, attackDice: 2, damagePoints: 30, zones: "twoRandom", noAim: true, noGoodHits: true, actions: 2 },
  GM: { label: "Gatling-Modus (GM)", recoil: 20, ammo: 150, attackDice: 2, zones: "all", noAim: true, noGoodHits: true, pierce: "A", actions: 2 },
  SP: { label: "Sprühen (SP)", recoil: 1, ammo: 1, attackDice: 0, zones: "all", noGoodHits: true, actions: 1 }
};

/** Munitionsbehälter (S. 231). */
NR.ammoContainers = { m: "Magazin", t: "Trommel", k: "Kette", i: "intern", a: "aufgelegt", l: "Liquid" };

/** Technologiestufen (S. 225). */
NR.techLevels = { 0: "–", 1: "TS I", 2: "TS II", 3: "TS III", 4: "TS IV", 5: "TS V" };

/** Powerniveaus (S. 134). */
NR.powerLevels = {
  survival: { label: "Survival", gp: 300, money: 100 },
  standard: { label: "Standard", gp: 450, money: 1000 },
  superior: { label: "Superior", gp: 600, money: 5000 }
};

/** Butterfly Effect / Begabungen (S. 130). */
NR.butterflyEffects = {
  "": { label: "–", skills: [] },
  artisan: { label: "Artisan", skills: ["basteln", "schauspiel", "kunst"] },
  athlete: { label: "Athlete", skills: ["akrobatik", "klettern", "rennen", "springen", "stemmen"] },
  craftsman: { label: "Craftsman", skills: ["feuerwaffenbau", "mechanik", "ruestungsbau", "waffenbau"] },
  leader: { label: "Leader", skills: ["ausdauer", "einschuechtern", "inspirieren", "willenskraft"] },
  marksman: { label: "Marksman", skills: ["projektilwaffen", "schiessen", "wurfwaffen"] },
  medic: { label: "Medic", skills: ["medizin", "naturkunde", "spezies"] },
  operator: { label: "Operator", skills: ["bodenfahrzeuge", "fluggeraete", "reiten", "wasserfahrzeuge"] },
  rogue: { label: "Rogue", skills: ["gassenwissen", "saufen", "taschendiebstahl"] },
  scholar: { label: "Scholar", skills: ["astronomie", "chemie", "schaetzen", "sagenMythen"] },
  scout: { label: "Scout", skills: ["heimlichkeit", "nachforschen", "orientierung"] },
  trickster: { label: "Trickster", skills: ["menschenkenntnis", "ueberreden", "verhandeln"] },
  warrior: { label: "Warrior", skills: ["ausweichen", "blocken", "nahkampf", "waffenkampf"] },
  copycat: { label: "Copy Cat (−2 EP je Steigerung nach Beobachtung)", skills: [] },
  skillmaster: { label: "Skill Master (−2 EP, kann lehren)", skills: [] }
};

/** PSI (S. 193–196). */
NR.psiDifficulties = {
  leicht: { label: "Leicht", min: 8, max: 12 },
  mittel: { label: "Mittel", min: 11, max: 15 },
  schwer: { label: "Schwer", min: 15, max: 19 },
  sehrSchwer: { label: "Sehr schwer", min: 19, max: 22 },
  ultimativ: { label: "Ultimativ", min: 23, max: 25 }
};
NR.psiPowers = {
  animakinese: { label: "Animakinese", tier: 2 },
  biokinese: { label: "Biokinese", tier: 2 },
  chronokinese: { label: "Chronokinese", tier: 3 },
  cryokinese: { label: "Cryokinese", tier: 1 },
  elektrokinese: { label: "Elektrokinese", tier: 1 },
  haimakinese: { label: "Haimakinese", tier: 1 },
  morphokinese: { label: "Morphokinese", tier: 3 },
  photokinese: { label: "Photokinese", tier: 2 },
  psychokinese: { label: "Psychokinese", tier: 2 },
  pyrokinese: { label: "Pyrokinese", tier: 1 },
  technokinese: { label: "Technokinese", tier: 3 },
  telekinese: { label: "Telekinese", tier: 1 },
  kategorieB: { label: "Kategorie B (HMO)", tier: 0 }
};

/** PSI-Fehlschlagtabelle 2W6 (S. 196). {ks} wird durch die Kraftstufe ersetzt. */
NR.psiFailTable = {
  2: "Echo: Würfle {ks}× auf dieser Tabelle, alle Ergebnisse gelten nacheinander.",
  3: "Der eigene Arsch: Der Charakter wird selbst Ziel der PSI-App (bei Overload neu würfeln).",
  4: "Weit gefehlt: {ks} zufällige andere Ziele werden auf Kraftstufe 1 betroffen (bei Overload neu würfeln).",
  5: "Fremde Welt: Tagtraum für {ks2} Kampfrunden, handlungsunfähig. Die App wirkt nicht.",
  6: "Lähmende Gedanken: {ks} Runden handlungsunfähig, nimmt aber alles wahr. Die App wirkt nicht.",
  7: "BÄM: {ks2} m weit geschleudert, {ks5} Schadenspunkte an zwei zufälligen Körperzonen. Die App wirkt nicht.",
  8: "Psionische Lähmung: {ks} Runden keine PSI-Kräfte, gehaltene Apps enden. Die App wirkt nicht.",
  9: "Schmerz: {ks10} Schadenspunkte am Kopf. Die App wirkt nicht.",
  10: "Seelische Narbe: Verlust von {ks} Punkten Psyche. Die App wirkt nicht.",
  11: "Bleibende Schäden: Verlust von {ks} Punkten Organismus. Die App wirkt nicht.",
  12: "Weißes Licht: Der Charakter und alles im Radius von {ks2} m erleidet {ks30} Schadenspunkte an allen Körperzonen. Die App wirkt nicht."
};

/** Organismus-Schwellenwerte & Degenerationstabellen (S. 115). */
NR.organismThresholds = [
  { min: 76, max: 100, label: "Gesund", a: 0, b: 0 },
  { min: 66, max: 75, label: "1× Tabelle A", a: 1, b: 0 },
  { min: 56, max: 65, label: "1× Tabelle B", a: 0, b: 1 },
  { min: 46, max: 55, label: "1× Tabelle B", a: 0, b: 1 },
  { min: 36, max: 45, label: "1× Tabelle B", a: 0, b: 1 },
  { min: 26, max: 35, label: "1× A & 1× B", a: 1, b: 1 },
  { min: 21, max: 25, label: "1× A & 1× B", a: 1, b: 1 },
  { min: 16, max: 20, label: "1× A & 1× B", a: 1, b: 1 },
  { min: 11, max: 15, label: "2× A & 2× B", a: 2, b: 2 },
  { min: 6, max: 10, label: "2× A & 2× B", a: 2, b: 2 },
  { min: 1, max: 5, label: "2× A & 2× B", a: 2, b: 2 },
  { min: -999, max: 0, label: "Tod", a: 0, b: 0 }
];
NR.degenerationA = {
  1: { label: "Immunsystemschwäche", effect: "irMalus" },
  2: { label: "Immunsystemschwäche", effect: "irMalus" },
  3: { label: "Entstellt", effect: "leiden", attr: "ch" },
  4: { label: "Entstellt", effect: "leiden", attr: "ch" },
  5: { label: "Chronische Wunden", effect: "wounds" },
  6: { label: "Chronische Wunden", effect: "wounds" }
};
NR.degenerationB = {
  1: { label: "Erschöpfung", effect: "leiden", attr: "ko" },
  2: { label: "Zittern und Krämpfe", effect: "leiden", attr: "ge" },
  3: { label: "Wahrnehmungsstörung", effect: "leiden", attr: "wa" },
  4: { label: "Lähmung", effect: "leiden", attr: "be" },
  5: { label: "Muskelschwäche", effect: "leiden", attr: "st" },
  6: { label: "Demenz", effect: "leiden", attr: "wi" }
};

/** Psyche-Bereiche (S. 116). */
NR.psycheRanges = [
  { min: 81, max: 100, label: "Optimale Psyche", traits: "besonnen, edelmütig, einfühlsam, genügsam, hilfsbereit, loyal, mutig, optimistisch, sozial, tolerant" },
  { min: 61, max: 80, label: "Gesunde Psyche", traits: "adrett, akribisch, bedacht, charmant, ehrlich, gnädig, idealistisch, konfliktsuchend, materialistisch, prinzipientreu" },
  { min: 41, max: 60, label: "Belastete Psyche", traits: "analytisch, autoritär, entschlossen, faul, furchtlos, gierig, harmoniebedürftig, militant, misstrauisch, salzig" },
  { min: 21, max: 40, label: "Gefährdete Psyche", traits: "asozial, dogmatisch, feige, gewalttätig, nachtragend, masochistisch, prokrastinierend, rachsüchtig, versoffen, zäh" },
  { min: -999, max: 20, label: "Katastrophale Psyche", traits: "boshaft, brutal, fanatisch, gnadenlos, mordlustig, nekro-/technophil, paranoid, psychopathisch, wahnsinnig, zerstreut" }
];

/** Bekanntheit / Steckbrief-Meilensteine (S. 131). */
NR.reputation = {
  1: "1 – Absolut unbekannt (–)",
  2: "2 – Lokal bekannt (MW 40)",
  3: "3 – Regional bekannt (MW 35)",
  4: "4 – National bekannt (MW 30)",
  5: "5 – International bekannt (MW 25)",
  6: "6 – Berühmt (MW 20)",
  7: "7 – Prominent (MW 15)",
  8: "8 – Weltweit bekannt (MW 10)",
  9: "9 – Ikone (MW 5)",
  10: "10 – Legendär (kein Wurf)"
};

/** Sprachstufen (S. 112). */
NR.languageLevels = { 1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1", 6: "C2" };

/** Kategorien selbst angelegter Fertigkeiten. */
NR.customSkillCategories = {
  besondere: "Besondere Fertigkeit",
  elite: "Elite-Fertigkeit",
  sprache: "Sprache",
  fertigkeit: "Zusätzliche Fertigkeit"
};

/** Steigerungskosten in EP (S. 129). */
NR.xpCosts = {
  attribute: 10,
  special: 6,
  elite: 4,
  skill: 2,
  besondere: 2,
  sprache: 4,
  psi: 4
};

/** Werkzeugqualität (S. 114). */
NR.toolQuality = { "-2": "−2W (miserabel)", "-1": "−1W (schlecht)", 0: "±0 (durchschnittlich)", 1: "+1W (gut)", 2: "+2W (Hightech)", 3: "+3W (herausragend)" };

NR.traitKinds = { justice: "Justice", chaos: "Chaos" };
NR.advantageKinds = { vorteil: "Vorteil", nachteil: "Nachteil" };
NR.augmentKinds = { implantat: "Implantat", robotik: "Robotik (Körperzone)", biomechanik: "Biomechanik", upgrade: "Robotik-Upgrade", design: "Erwachten-Designoption" };
NR.bioTraitKinds = { sichtbar: "Sichtbar", verborgen: "Verborgen", auffaelligkeit: "Auffälligkeit" };
/** Erwachte (S. 145–147). */
NR.awakened = {
  physical: { ge: 2, st: 2, ko: 2, be: 2 },
  perception: 3,
  mental: 1,
  tp: 70,
  pain: 10,
  capacity: 16,
  chassisArmor: 10,
  lethalZones: ["12", "6", "8"],
  maxima: { ge: 8, st: 20, ko: 20, be: 10 },
  adaptionMax: 80,
  excludedTraits: ["Dicke Haut", "Panzer", "Adrenalinkammern", "Gesteigerte Fertigkeit", "Giftresistenz", "Regeneration",
    "Schmerzresistenz", "Sechster Sinn", "Verbesserte Wahrnehmung", "Verdichtete Muskulatur"]
};

NR.styleSkillKinds = { expert: "Expertenfähigkeit", kampfkunst: "Kampfkunst" };

/**
 * Stabile Schlüssel der Style-Skills (`system.key`). Wert = Namensanfang (kleingeschrieben), über den
 * bestehende Items ohne Schlüssel einmalig zugeordnet werden (siehe StyleSkillData#migrateData).
 * Muss mit tools/src/character.py (STYLE_KEYS) übereinstimmen.
 */
NR.styleSkillKeys = {
  aimForTheHeart: "aim for the heart", akimbo: "akimbo", anonymous: "anonymous", beastmaster: "beastmaster",
  billyTheKid: "billy the kid", blademaster: "blademaster", crapGyver: "crapgyver", crashOverride: "crash-override",
  dejaVu: "déjà-vu", derDoktor: "der doktor", driftKing: "drift king", dualWielding: "dual wielding",
  fastTalk: "fast talk", fistOfRage: "fist of rage", goldeneZunge: "goldene zunge", linguist: "linguist",
  meditation: "meditation", memorum: "memorum", metamorphose: "metamorphose", mixology: "mixology",
  multipleWielding: "multiple wielding", neo: "neo", petPal: "pet pal", powerNap: "power nap", parkour: "parkour",
  psionischeVielfaeltigkeit: "psionische vielfältigkeit", quadrupleAkimbo: "quadruple akimbo", rageOfGods: "rage of gods",
  recoilMastery: "recoil mastery", ruettelflug: "rüttelflug", shieldMaster: "shield master", sollbruchstelle: "sollbruchstelle",
  split: "split", sterneKueche: "sterne-küche", stormOfFists: "storm of fists", trickster: "trickster",
  triggerFinger: "trigger finger", trustyEngineer: "trusty engineer", waffenspezialisierung: "waffenspezialisierung",
  aikido: "aikido", baKaiDo: "ba-kai-do", boxen: "boxen", capoeira: "capoeira", escrima: "escrima", gunFu: "gun-fu",
  jiuJitsu: "jiu jitsu", karate: "karate", kenjutsu: "kenjutsu", kickBoxen: "kick-boxen", kravMaga: "krav maga",
  muayThai: "muay thai", ringen: "ringen", sado: "sado", taeKwonDo: "tae-kwon-do", zpc: "zpc"
};

/** Ordne einen Style-Skill-Namen seinem stabilen Schlüssel zu ("" wenn unbekannt). */
NR.styleKeyFromName = name => {
  const n = String(name ?? "").toLowerCase().trim();
  return Object.entries(NR.styleSkillKeys).find(([, prefix]) => n.startsWith(prefix))?.[0] ?? "";
};

/**
 * Körperteil/Angriffsart waffenloser Angriffe. `groups` sind die Modifikator-Gruppen (attack.<g>/damage.<g>),
 * die für diese Angriffsart gelten.
 */
NR.strikeLimbs = {
  fist: { label: "Faust", groups: ["fist"] },
  elbow: { label: "Ellenbogen", groups: ["elbow", "emk"] },
  knee: { label: "Knie", groups: ["knee", "emk", "leg"] },
  shin: { label: "Schienbein", groups: ["shin", "emk", "leg"] },
  leg: { label: "Tritt (Fuß/Bein)", groups: ["leg"] },
  claw: { label: "Krallen", groups: ["claw"] },
  bite: { label: "Biss", groups: ["bite"] },
  head: { label: "Kopf/Horn", groups: ["head"] }
};

/**
 * Ziele für Item-Modifikatoren. Diese werden in Actor#prepareDerivedData angewendet,
 * damit Spezies, Abnormitäten, Vorteile und Implantate ihre Werte automatisch einbringen.
 */
NR.modifierTargets = {
  "dice.klettern": "Bonuswürfel: Klettern",
  "dice.nahkampf": "Bonuswürfel: Nahkampf",
  "dice.einschuechtern.st": "Bonuswürfel: Einschüchtern mit Stärke",
  // Kampf (Style-Skills/Kampfkünste): Bonuswürfel auf den Angriff bzw. Schadenswürfel
  "attack.fist": "Angriff: Faustschläge (Bonuswürfel)",
  "attack.leg": "Angriff: Beinangriffe (Bonuswürfel)",
  "attack.emk": "Angriff: Ellenbogen/Knie/Schienbein (Bonuswürfel)",
  "attack.knee": "Angriff: Knieangriffe (Bonuswürfel)",
  "attack.claw": "Angriff: Krallen (Bonuswürfel)",
  "attack.blade": "Angriff: Klingenwaffen (Bonuswürfel)",
  "attack.multi": "Angriff: Mehrfachangriff (Bonuswürfel)",
  "attack.zpc": "Angriff: linker Arm/Bein, ZPC (Bonuswürfel)",
  "damage.melee": "Schaden: alle Nahkampfangriffe (Würfel)",
  "damage.unarmed": "Schaden: waffenlos (Würfel)",
  "damage.fist": "Schaden: Faustschläge (Würfel)",
  "damage.leg": "Schaden: Beinangriffe (Würfel)",
  "damage.emk": "Schaden: Ellenbogen/Knie/Schienbein (Würfel)",
  "damage.knee": "Schaden: Knieangriffe (Würfel)",
  "damage.multi": "Schaden: Mehrfachangriff (Würfel)",
  "damage.zpc": "Schaden: linker Arm/Bein, ZPC (Würfel)",
  "damage.blade": "Schaden: Klingenwaffen (Würfel)",
  "defense.blockUnarmed": "Verteidigung: waffenlos Blocken (Bonuswürfel)",
  "defense.blockMelee": "Verteidigung: Blocken gegen Nahkampf (Bonuswürfel)",
  "defense.dodgeMelee": "Verteidigung: Ausweichen gegen Nahkampf (Bonuswürfel)",
  "defense.parryBlade": "Verteidigung: Parade mit Klingenwaffe (Bonuswürfel)",
  "resist.leg": "Schadenswiderstand: Treffer an den Beinen (Bonuswürfel)",
  "attributes.ge": "Attribut: Geschick",
  "attributes.st": "Attribut: Stärke",
  "attributes.ko": "Attribut: Konstitution",
  "attributes.be": "Attribut: Beweglichkeit",
  "attributes.wa": "Attribut: Wahrnehmung",
  "attributes.wi": "Attribut: Wissen",
  "attributes.ch": "Attribut: Charisma",
  "attributes.ha": "Attribut: Handwerk",
  adrenalin: "Adrenalin (Stufe)",
  schmerztoleranz: "Schmerztoleranz (Stufe)",
  meditation: "Meditation (Stufe)",
  tp: "Trefferpunkte je Körperzone",
  organismus: "Organismus (max./Verlust)",
  psyche: "Psyche (max./Verlust)",
  irDice: "Infektionsresistenz (Würfel)",
  irPoints: "Infektionsresistenz (Punkte)",
  regSpeed: "Regenerationsgeschwindigkeit",
  regPool: "Regenerationspool",
  movement: "Bewegungsreichweite (m)",
  bloodMax: "Blutpunkte (max.)",
  armorAll: "Rüstung an allen Zonen (Punkte)",
  chassisArmor: "Erwachte: Chassis-Panzerung (Punkte)",
  chassisMk: "Erwachte: Chassis MK:B (Wert 1)",
  capacity: "Erwachte: Kapazität je Zone",
  ...Object.fromEntries(Object.entries(NR.skills).map(([k, s]) => [`skills.${k}`, `Fertigkeit: ${s.label}`]))
};

/** Attribut-Steigerungskosten bei der Erschaffung in GP (S. 135). */
NR.attributeGpCost = level => {
  if (level <= 1) return 0;
  if (level <= 3) return (level - 1) * 10;
  return 20 + (level - 3) * 20;
};

/* -------------------------------------------- */
/*  Lokalisierung                                */
/* -------------------------------------------- */

/** Konstanten-Maps, deren Stringwerte direkt Anzeigetexte sind. */
const STRING_MAPS = [
  "difficulties", "armorPiercing", "damageTypes", "ammoContainers", "customSkillCategories", "toolQuality",
  "advantageKinds", "augmentKinds", "bioTraitKinds", "styleSkillKinds", "modifierTargets", "reputation"
];

/**
 * Ersetzt die deutschen Standardtexte der Konfiguration (label/short sowie die Werte der
 * STRING_MAPS) durch die Übersetzung aus `lang/*.json` (Schlüssel `NR.Cfg.<Pfad>`).
 * Der ursprüngliche (deutsche) Text bleibt als `labelDe` erhalten, z. B. für den Mannifest-Import.
 * Fehlt ein Schlüssel, bleibt der Standardtext bestehen.
 */
export function localizeConfig() {
  const i18n = game.i18n;
  const tr = (path, fallback) => {
    const key = `NR.Cfg.${path.map(p => p === "" ? "none" : p).join(".")}`;
    return i18n.has(key) ? i18n.localize(key) : fallback;
  };
  const walk = (obj, path) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === "object") walk(v, [...path, Array.isArray(obj) && v.key ? v.key : k]);
      else if (typeof v === "string" && (k === "label" || k === "short")) {
        if (k === "label") obj.labelDe ??= v;
        obj[k] = tr([...path, k], obj[`${k}De`] ?? v);
      }
    }
  };
  for (const [root, value] of Object.entries(NR)) {
    if (!value || typeof value !== "object") continue;
    if (STRING_MAPS.includes(root)) {
      NR.__de ??= {};
      NR.__de[root] ??= { ...value };
      for (const k of Object.keys(value)) value[k] = tr([root, k], NR.__de[root][k]);
    } else walk(value, [root]);
  }
}
