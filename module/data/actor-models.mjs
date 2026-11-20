import { NR } from "../config.mjs";

const fields = foundry.data.fields;

const int = (initial = 0, opts = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opts });
const num = (initial = 0, opts = {}) => new fields.NumberField({ required: true, nullable: false, initial, ...opts });
const str = (initial = "", opts = {}) => new fields.StringField({ required: true, blank: true, initial, ...opts });

/**
 * Gemeinsames Schema für Charaktere und NSC/Kreaturen.
 */
function creatureSchema() {
  const attributes = {};
  for (const key of Object.keys(NR.attributes)) {
    attributes[key] = new fields.SchemaField({
      value: int(1, { min: 0 }),
      bonus: int(0),
      leiden: int(0, { min: 0, max: 3 })
    });
  }

  const skills = {};
  for (const key of Object.keys(NR.skills)) {
    skills[key] = new fields.SchemaField({ value: int(0, { min: 0 }) });
  }

  const zones = {};
  for (const key of Object.keys(NR.zones)) {
    zones[key] = new fields.SchemaField({
      damage: int(0, { min: 0 }),
      chronic: int(0, { min: 0 }),
      destroyed: new fields.BooleanField({ initial: false }),
      robotic: new fields.BooleanField({ initial: false })
    });
  }

  return {
    attributes: new fields.SchemaField(attributes),
    skills: new fields.SchemaField(skills),
    special: new fields.SchemaField({
      adrenalin: new fields.SchemaField({ value: int(2, { min: 0 }), used: int(0, { min: 0 }) }),
      schmerztoleranz: new fields.SchemaField({ value: int(3, { min: 0, max: 10 }) }),
      meditation: new fields.SchemaField({ value: int(0, { min: 0 }), used: int(0, { min: 0 }) })
    }),
    zones: new fields.SchemaField(zones),
    tpBase: int(30, { min: 1 }),
    organismus: new fields.SchemaField({ base: int(100), loss: int(0) }),
    psyche: new fields.SchemaField({ base: int(80), loss: int(0) }),
    infection: new fields.SchemaField({
      dice: int(1, { min: 0 }),
      points: int(0),
      malus: int(0, { min: 0 })
    }),
    regeneration: new fields.SchemaField({
      speed: int(0, { min: 0 }),
      pool: int(0, { min: 0 }),
      poolUsed: int(0, { min: 0 })
    }),
    blood: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
    nonLethal: int(0, { min: 0 }),
    tempMalus: int(0),
    tempBonus: int(0),
    combat: new fields.SchemaField({
      defenses: int(0, { min: 0 }),
      psiCollected: int(0, { min: 0 }),
      overdrive: int(0, { min: 0 })
    }),
    alcohol: int(0, { min: 0 }),
    details: new fields.SchemaField({
      species: str(),
      concept: str(),
      occupation: str(),
      age: str(),
      gender: str(),
      height: str(),
      weight: str(),
      eyes: str(),
      hair: str(),
      origin: str(),
      languages: str()
    }),
    biography: new fields.HTMLField({ required: true, blank: true }),
    notes: new fields.HTMLField({ required: true, blank: true }),
    wanted: new fields.HTMLField({ required: true, blank: true })
  };
}

export class CreatureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return creatureSchema();
  }
}

export class CharacterData extends CreatureData {
  static defineSchema() {
    return {
      ...creatureSchema(),
      progress: new fields.SchemaField({
        xp: new fields.SchemaField({ value: int(0), total: int(0) }),
        jp: new fields.SchemaField({ value: int(0), total: int(0) }),
        cp: new fields.SchemaField({ value: int(0), total: int(0) }),
        reputation: int(1, { min: 1, max: 10 }),
        butterfly: str(""),
        butterfly2: str(""),
        powerLevel: str("standard", { choices: Object.keys(NR.powerLevels) }),
        gpMoney: int(0, { min: 0 }),
        gpExtra: int(0),
        pns: new fields.BooleanField({ initial: false })
      }),
      money: int(0)
    };
  }
}

export class NpcData extends CreatureData {
  static defineSchema() {
    return {
      ...creatureSchema(),
      threat: str(""),
      stubbornness: int(0, { min: 0 }),
      money: int(0)
    };
  }
}

/**
 * Fahrzeugprofil (S. 104).
 */
export class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category: str("boden", { choices: ["boden", "wasser", "luft", "raum"] }),
      handling: int(10),
      speed: int(20),
      maneuver: int(0),
      power: str(""),
      stability: int(3, { min: 0 }),
      armor: int(0, { min: 0 }),
      mk: str("B", { choices: ["", "A", "B", "C"] }),
      hp: new fields.SchemaField({ value: int(100, { min: 0 }), max: int(100, { min: 0 }) }),
      fuel: str(""),
      reach: str(""),
      crew: str(""),
      equipment: str(""),
      vitals: new fields.ArrayField(new fields.SchemaField({
        name: str(""),
        destroyed: new fields.BooleanField({ initial: false }),
        visible: new fields.BooleanField({ initial: true })
      })),
      ts: int(0, { min: 0, max: 5 }),
      price: int(0, { min: 0 }),
      description: new fields.HTMLField({ required: true, blank: true })
    };
  }

  prepareDerivedData() {
    this.damaged = this.hp.max > 0 && this.hp.value <= this.hp.max / 2;
    this.effHandling = this.handling + (this.damaged ? 5 : 0);
    this.effSpeed = this.damaged ? Math.floor(this.speed / 2) : this.speed;
    this.effManeuver = this.maneuver - (this.damaged ? 2 : 0);
    this.health = { value: this.hp.value, max: this.hp.max };
  }
}
