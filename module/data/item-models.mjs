import { NR } from "../config.mjs";

const fields = foundry.data.fields;

const int = (initial = 0, opts = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opts });
const num = (initial = 0, opts = {}) => new fields.NumberField({ required: true, nullable: false, initial, ...opts });
const str = (initial = "", opts = {}) => new fields.StringField({ required: true, blank: true, initial, ...opts });
const bool = (initial = false) => new fields.BooleanField({ initial });
const html = () => new fields.HTMLField({ required: true, blank: true });

/** Generische Modifikatoren: {target, value} – siehe NR.modifierTargets. */
const modifiers = () => new fields.ArrayField(new fields.SchemaField({
  target: str(""),
  value: num(0),
  /** Nur bei Kampfkünsten: Modifikator gilt ab dieser Stufe (0 = immer). */
  level: int(0, { min: 0, max: 3 })
}));

/** Gemeinsame Felder physischer Gegenstände. */
const physical = () => ({
  quantity: int(1, { min: 0 }),
  weight: num(0, { min: 0 }),
  ts: int(0, { min: 0, max: 5 }),
  price: num(0, { min: 0 }),
  taped: bool(false),
  equipped: bool(false)
});

class NRItemData extends foundry.abstract.TypeDataModel {
  /** Ob die Modifikatoren dieses Items auf den Besitzer wirken. */
  get modifiersActive() {
    return true;
  }
}

export class WeaponData extends NRItemData {
  static defineSchema() {
    return {
      ...physical(),
      category: str("nahkampf", { choices: Object.keys(NR.weaponCategories) }),
      skill: str(""),
      damageType: str("wucht", { choices: Object.keys(NR.damageTypes) }),
      damage: new fields.SchemaField({
        strength: bool(true),
        points: int(0),
        formula: str(""),
        structure: bool(false),
        nonLethal: bool(false),
        continuous: bool(false),
        area: bool(false),
        pierce: str("", { choices: Object.keys(NR.armorPiercing) })
      }),
      attackDice: int(0),
      parryDice: int(0),
      blockDice: int(0),
      stability: int(0, { min: 0 }),
      mk: str("", { choices: Object.keys(NR.materialCategories) }),
      modes: new fields.ArrayField(str("")),
      rd: int(0),
      rdFolded: int(0),
      ammo: new fields.SchemaField({
        value: int(0, { min: 0 }),
        max: int(0, { min: 0 }),
        container: str("m", { choices: Object.keys(NR.ammoContainers) }),
        type: str("")
      }),
      range: str("none", { choices: Object.keys(NR.ranges) }),
      spray: new fields.SchemaField({ range: int(0, { min: 0 }), diameter: int(0, { min: 0 }) }),
      minStrength: int(0, { min: 0 }),
      twoHanded: bool(false),
      features: str(""),
      description: html()
    };
  }

  get isMelee() {
    return !!NR.weaponCategories[this.category]?.melee;
  }

  get skillKey() {
    return this.skill || NR.weaponCategories[this.category]?.skill || "nahkampf";
  }

  get hasAmmo() {
    return this.ammo.max > 0;
  }

  get damageLabel() {
    const d = this.damage;
    const parts = [];
    if (d.formula) parts.push(d.formula);
    else if (d.strength) parts.push(`ST${d.points ? `+${d.points}p.` : ""}`);
    else parts.push(`${d.points}${d.structure ? " SSP" : "p."}`);
    if (d.nonLethal) parts.unshift("NL");
    if (d.continuous) parts.push("andauernd");
    return parts.join(" ");
  }
}

export class AmmoData extends NRItemData {
  static defineSchema() {
    return {
      ...physical(),
      ammoType: str("patrone", { choices: ["patrone", "projektil", "granate", "rakete", "sprengstoff", "liquid"] }),
      damageBonus: int(0),
      attackDice: int(0),
      recoil: int(0),
      pierce: str("", { choices: Object.keys(NR.armorPiercing) }),
      noDamageVs: str("", { choices: Object.keys(NR.materialCategories) }),
      damage: str(""),
      radius: str(""),
      structure: bool(false),
      continuous: bool(false),
      nonLethal: bool(false),
      description: html()
    };
  }
}

export class ArmorData extends NRItemData {
  static defineSchema() {
    return {
      ...physical(),
      rw: int(0, { min: 0 }),
      mk: str("A", { choices: Object.keys(NR.materialCategories) }),
      komfort: int(1, { min: 0 }),
      zones: new fields.ArrayField(int(0)),
      stealth: int(0, { min: 0 }),
      coldDice: int(0, { min: 0 }),
      heatDice: int(0, { min: 0 }),
      modifiers: modifiers(),
      description: html()
    };
  }

  get modifiersActive() {
    return this.equipped;
  }
}

export class GearData extends NRItemData {
  static defineSchema() {
    return {
      ...physical(),
      uses: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
      alk: int(0, { min: 0 }),
      bonus: str(""),
      toolQuality: int(0, { min: -2, max: 3 }),
      modifiers: modifiers(),
      description: html()
    };
  }

  get modifiersActive() {
    return this.equipped;
  }
}

/** Selbst angelegte Fertigkeit: besondere Fertigkeit, Elite-Fertigkeit oder Sprache. */
export class SkillData extends NRItemData {
  static defineSchema() {
    return {
      category: str("besondere", { choices: Object.keys(NR.customSkillCategories) }),
      attribute: str("", { choices: ["", ...Object.keys(NR.attributes)] }),
      value: int(1, { min: 0 }),
      defensive: bool(false),
      native: bool(false),
      description: html()
    };
  }
}

export class PsiPowerData extends NRItemData {
  static defineSchema() {
    return {
      key: str("telekinese", { choices: Object.keys(NR.psiPowers) }),
      value: int(1, { min: 0 }),
      free: int(0, { min: 0 }),
      show: str(""),
      /** Kategorie B (HMO, S. 215): nach einmaliger Aktivierung dauerhaft wirksam; gleichzeitig aktiv höchstens Wissen */
      active: bool(false),
      /** Passiv-Boni der Kategorie-B-Kraft (wirken, solange sie aktiv ist) */
      modifiers: modifiers(),
      /** Einsatz von Blutpunkten: "heal" = Trefferpunkte wiederherstellen, "pain" = zehn Minuten keinen Schmerz */
      bloodAction: str("", { choices: ["", "heal", "pain"] }),
      bloodCost: int(0, { min: 0 }),
      bloodValue: int(0, { min: 0 }),
      description: html()
    };
  }

  get modifiersActive() {
    return this.key !== "kategorieB" || this.active;
  }

  get tier() {
    return NR.psiPowers[this.key]?.tier ?? 1;
  }
}

export class PsiAppData extends NRItemData {
  static defineSchema() {
    return {
      power: str("telekinese", { choices: Object.keys(NR.psiPowers) }),
      difficulty: str("leicht", { choices: Object.keys(NR.psiDifficulties) }),
      min: int(8),
      max: int(12),
      hold: int(0, { min: 0 }),
      held: bool(false),
      defensive: bool(false),
      /** Art der Defensivaktion bei PSI-Verteidigung: Ausweichen oder Block ("" = keine feste Art) */
      defense: str("", { choices: ["", "dodge", "block"] }),
      /** Zusätzliche Würfel auf die PSI-Verteidigung als Formel mit KS („KS“, „KS*2“) */
      defenseBonus: str(""),
      /** Aktionen, die die App boostet (Fertigkeitsschlüssel, „attr.st“, „psi“): dafür entfällt ihr Haltungsmalus (S. 193) */
      boosts: new fields.ArrayField(str("")),
      actions: int(2, { min: 0 }),
      resist: str(""),
      effect: str(""),
      damageMult: int(0, { min: 0 }),
      allZones: bool(false),
      pierce: str("", { choices: Object.keys(NR.armorPiercing) }),
      /**
       * Waffe(n), die die App beim erfolgreichen Wirken erzeugt (z. B. Knochensporn, Blutwaffe). Die Waffen-Items hängen an
       * der Haltung der App und verschwinden, sobald sie nicht mehr gehalten wird. Formeln dürfen KS enthalten („KS*10“).
       * `count` = 0: die App erzeugt keine Waffe.
       */
      weapon: new fields.SchemaField({
        name: str(""),
        count: int(0, { min: 0 }),
        attackDice: str(""),
        parryDice: str(""),
        strength: bool(true),
        damage: str(""),
        damageType: str("wucht", { choices: Object.keys(NR.damageTypes) }),
        twoHanded: bool(false)
      }),
      /**
       * Zeitlicher Ablauf nach erfolgreichem Wirken: Dauer als Formel mit KS (z. B. „KS*2“) in einer Einheit,
       * betroffen ist die Wirkende selbst oder die markierten Ziele; optional Schaden je Kampfrunde (siehe timed.mjs).
       */
      duration: new fields.SchemaField({
        formula: str(""),
        unit: str("minute", { choices: ["round", "minute", "hour", "day"] }),
        target: str("self", { choices: ["self", "target"] }),
        tick: new fields.SchemaField({
          formula: str(""),
          cumulative: bool(false),
          damageType: str("hitze", { choices: Object.keys(NR.damageTypes) }),
          zones: str("random", { choices: ["random", "all"] }),
          pierce: str("", { choices: Object.keys(NR.armorPiercing) })
        })
      }),
      description: html()
    };
  }
}

export class StyleSkillData extends NRItemData {
  static defineSchema() {
    return {
      /** Stabiler Schlüssel (siehe NR.styleSkillKeys); die Spiellogik fragt ihn statt des Namens ab. */
      key: str(""),
      /** Auswahl bei Style-Skills mit Platzhalter, z. B. PSI-Kraft (Memorum), Element (Metamorphose), Waffenart. */
      variant: str(""),
      /** Umschaltbarer Zustand (z. B. Metamorphose); Modifikatoren wirken nur, solange er aktiv ist. */
      active: bool(false),
      kind: str("expert", { choices: Object.keys(NR.styleSkillKinds) }),
      gp: int(0, { min: 0 }),
      ep: int(0, { min: 0 }),
      level: int(1, { min: 0, max: 3 }),
      prerequisites: str(""),
      levels: new fields.ArrayField(new fields.SchemaField({ prerequisites: str(""), effect: str("") })),
      modifiers: modifiers(),
      /** Hinweistext für „Einsetzen“ (Chatkarte), z. B. für rein erzählerische Effekte. */
      hint: html(),
      /** Begrenzte Einsätze (z. B. Déjà-vu einmal je Sitzung); max 0 = unbegrenzt. */
      uses: new fields.SchemaField({ max: int(0, { min: 0 }), value: int(0, { min: 0 }), per: str("") }),
      description: html()
    };
  }

  /** @override – Bestehende Items ohne Schlüssel anhand des Namens zuordnen (nur zur Laufzeit, nichts wird gespeichert). */
  prepareBaseData() {
    super.prepareBaseData();
    if (!this.key) this.key = NR.styleKeyFromName(this.parent?.name);
    // Auswahl notfalls aus dem Namen lesen: „Memorum [Telekinese]“ / „Waffenspezialisierung (Pistole)“
    if (!this.variant) {
      const m = String(this.parent?.name ?? "").match(/\[([^\]]+)\]|\(([^)]+)\)/);
      const v = (m?.[1] ?? m?.[2] ?? "").trim();
      if (v && !["PSI-Kraft", "Element", "Waffenart"].includes(v)) this.variant = v;
    }
  }

  /** @override – Modifikatoren umschaltbarer Style-Skills wirken nur im aktiven Zustand. */
  get modifiersActive() {
    return this.key === "metamorphose" ? this.active : true;
  }
}

export class SpeciesData extends NRItemData {
  static defineSchema() {
    return {
      gp: int(0, { min: 0 }),
      tp: int(30, { min: 1 }),
      irDice: int(1, { min: 0 }),
      irPoints: int(0),
      adrenalin: int(2, { min: 0 }),
      psyche: int(80),
      organismus: int(100),
      psi: bool(true),
      awakened: bool(false),
      freePsi: int(0, { min: 0 }),
      bioGp: int(0, { min: 0 }),
      identification: str(""),
      special: str(""),
      modifiers: modifiers(),
      description: html()
    };
  }
}

export class AbnormalityData extends NRItemData {
  static defineSchema() {
    return {
      gp: int(0, { min: 0 }),
      variant: str(""),
      heritability: str(""),
      intensity: str(""),
      illegal: bool(false),
      modifiers: modifiers(),
      description: html()
    };
  }
}

export class BioTraitData extends NRItemData {
  static defineSchema() {
    return {
      kind: str("sichtbar", { choices: Object.keys(NR.bioTraitKinds) }),
      gp: int(0, { min: 0 }),
      level: int(1, { min: 0 }),
      maxLevel: int(1, { min: 0 }),
      perLevel: bool(false),
      covers: int(0, { min: 0 }),
      conspicuity: str(""),
      charges: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
      /** Aufladung mit der Weltzeit: eine Ladung je n Stunden (0 = keine automatische Aufladung). */
      recharge: new fields.SchemaField({ hours: num(0, { min: 0 }) }),
      modifiers: modifiers(),
      grants: new fields.ArrayField(str("")),
      description: html()
    };
  }

  get totalGp() {
    return this.perLevel ? this.gp * this.level : this.gp;
  }
}

export class AdvantageData extends NRItemData {
  static defineSchema() {
    return {
      kind: str("vorteil", { choices: Object.keys(NR.advantageKinds) }),
      markers: int(1),
      level: int(1, { min: 1 }),
      modifiers: modifiers(),
      description: html()
    };
  }
}

export class TraitData extends NRItemData {
  static defineSchema() {
    return {
      kind: str("justice", { choices: Object.keys(NR.traitKinds) }),
      psycheRange: str(""),
      bonus: str(""),
      description: html()
    };
  }
}

export class AugmentData extends NRItemData {
  static defineSchema() {
    return {
      ...physical(),
      kind: str("implantat", { choices: Object.keys(NR.augmentKinds) }),
      zone: str(""),
      model: str(""),
      robotic: new fields.SchemaField({
        ge: int(0), st: int(0), ko: int(0), be: int(0), wa: int(0),
        capacity: num(0),
        tp: int(70, { min: 0 })
      }),
      armor: int(0, { min: 0 }),
      mk: str("", { choices: Object.keys(NR.materialCategories) }),
      capacityCost: num(0, { min: 0 }),
      orgLoss: int(0, { min: 0 }),
      psycheLoss: int(0, { min: 0 }),
      installed: bool(true),
      fullBody: bool(false),
      gp: int(0, { min: 0 }),
      modifiers: modifiers(),
      description: html()
    };
  }

  get modifiersActive() {
    return this.installed;
  }
}

/** Krankheit (Kap. 1, S. 40–45). Bei Aktiven zählt `days` den Verlauf; Schritte wirken auf Organismus, Psyche, Schaden. */
export class DiseaseData extends NRItemData {
  static defineSchema() {
    return {
      classification: str(""),
      transmission: str(""),
      vector: str(""),
      incubation: str(""),
      duration: str(""),
      cure: str(""),
      identification: int(10, { min: 0 }),
      intensity: int(0, { min: 0 }),
      /** Temporäre Maluswürfel auf alle Aktionen, solange aktiv. */
      malusDice: int(0, { min: 0 }),
      /** Alternative Intensität bei besonderer Übertragung (z. B. Flugnekrose 6 bei Tröpfchen/Schleimhaut); 0 = keine. */
      intensityAlt: int(0, { min: 0 }),
      /** Inkubationszeit in Tagen (Verlauf beginnt danach). */
      incubationDays: num(0, { min: 0 }),
      /** Abstand der Verlaufsschritte in Tagen (0 = keine automatischen Schritte). */
      stepDays: num(0, { min: 0 }),
      /** Wirkung je Schritt: Würfelformel oder Zahl (leer = keine). */
      stepOrganismus: str(""),
      stepPsyche: str(""),
      /** Dauerhafter Schaden je Schritt auf eine zufällige Körperzone. */
      stepDamage: int(0, { min: 0 }),
      active: bool(false),
      days: num(0, { min: 0 }),
      description: html()
    };
  }
}

/** Flora (Kap. 1, S. 20–22): Pflanzen und Pilze mit Verbreitung, Preis und Wirkung. */
export class FloraData extends NRItemData {
  static defineSchema() {
    return {
      region: str(""),
      price: num(0, { min: 0 }),
      priceUnit: str(""),
      effect: str(""),
      description: html()
    };
  }
}
