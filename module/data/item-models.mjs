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
      description: html()
    };
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
      actions: int(2, { min: 0 }),
      resist: str(""),
      effect: str(""),
      damageMult: int(0, { min: 0 }),
      allZones: bool(false),
      pierce: str("", { choices: Object.keys(NR.armorPiercing) }),
      description: html()
    };
  }
}

export class StyleSkillData extends NRItemData {
  static defineSchema() {
    return {
      /** Stabiler Schlüssel (siehe NR.styleSkillKeys); die Spiellogik fragt ihn statt des Namens ab. */
      key: str(""),
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
