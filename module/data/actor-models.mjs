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
    /** Zeitlich begrenzte Bonus-/Maluswürfel aus ActiveEffects (siehe timed.mjs); nie von Hand befüllt, damit das Blatt sie nicht festschreibt. */
    timedBonus: int(0),
    timedMalus: int(0),
    combat: new fields.SchemaField({
      defenses: int(0, { min: 0 }),
      psiCollected: int(0, { min: 0 }),
      /** Zeitpool aus „Zeitloses Wissen“ (S. 200): verbleibende Einsätze und Anfangsgröße (= KS), wie Meditation */
      zeitpool: int(0, { min: 0 }),
      zeitpoolMax: int(0, { min: 0 }),
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

  /**
   * Abgeleitete Werte (Attribute, Fertigkeiten, Zonen, Mali, …). Die Items des Actors sind zu diesem
   * Zeitpunkt bereits aufbereitet (Zugriff über this.parent).
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.parent?.items) this._prepareCreature();
  }

  /** Effektive Haltungskosten einer PSI-App (Memorum: −1, mindestens 0). */
  psiHold(app) {
    const base = app.system.hold;
    return this.memorumPowers?.has(app.system.power) ? Math.max(0, base - 1) : base;
  }

  /** Summiere die Modifikatoren aller aktiven Items. */
  _collectModifiers() {
    const mods = {};
    for (const item of this.parent.items) {
      const list = item.system.modifiers;
      if (!Array.isArray(list) || !item.system.modifiersActive) continue;
      // Stufen: Bio-Eigenschaften je Level, Ganzkörper-Pakete je Anzahl
      const factor = (item.type === "bioTrait" && item.system.perLevel) ? Math.max(1, item.system.level)
        : (item.type === "augment" && item.system.fullBody) ? Math.max(1, item.system.quantity || 1) : 1;
      for (const m of list) {
        if (!m.target) continue;
        // Kampfkünste: Stufen-Modifikatoren wirken erst ab der gewählten Stufe
        if (item.type === "styleSkill" && m.level > 0 && item.system.level < m.level) continue;
        mods[m.target] = (mods[m.target] ?? 0) + (Number(m.value) || 0) * factor;
      }
    }
    return mods;
  }

  _prepareCreature() {
    const sys = this;
    const actor = this.parent;
    const mods = this._collectModifiers();
    sys.mods = mods;

    // Style-Skills: Schlüssel → Stufe (Expertenfähigkeiten 1, Kampfkünste 1–3)
    sys.styles = {};
    sys.styleVariants = {};
    for (const item of actor.items) {
      if (item.type !== "styleSkill" || !item.system.key) continue;
      const lvl = item.system.kind === "kampfkunst" ? item.system.level : 1;
      sys.styles[item.system.key] = Math.max(sys.styles[item.system.key] ?? 0, lvl);
      // Mehrfach wählbare Style-Skills (Memorum, Metamorphose, Waffenspezialisierung): gewählte Varianten sammeln
      (sys.styleVariants[item.system.key] ??= []).push({ variant: item.system.variant, active: item.system.active, item });
    }
    // Memorum: Haltungskosten der Apps der gewählten PSI-Kräfte −1
    sys.memorumPowers = new Set((sys.styleVariants.memorum ?? []).map(v => NR.psiPowerFromText(v.variant)).filter(Boolean));

    // Robotik je Körperzone
    const robotics = {};
    const augments = actor.items.filter(i => i.type === "augment" && i.system.installed);
    for (const a of augments) {
      if (a.system.kind === "robotik" && a.system.zone) robotics[a.system.zone] = a;
    }
    sys.roboticZones = robotics;

    // Einzelzonen-Upgrades (S. 218): Steigerung je Stufe in system.robotic / system.armor, Stufen = Anzahl
    const zoneUpgrades = {};
    for (const a of augments) {
      if (a.system.kind !== "upgrade" || a.system.fullBody || !a.system.zone) continue;
      const q = Math.max(1, a.system.quantity || 1);
      const u = zoneUpgrades[a.system.zone] ??= { ge: 0, st: 0, ko: 0, be: 0, wa: 0, armor: 0, items: [] };
      for (const k of ["ge", "st", "ko", "be", "wa"]) u[k] += (a.system.robotic?.[k] || 0) * q;
      u.armor += (a.system.armor || 0) * q;
      u.items.push(a.name);
    }
    sys.zoneUpgrades = zoneUpgrades;

    // Erwachte (S. 145–147)
    const speciesItem = actor.items.find(i => i.type === "species");
    const awakened = !!speciesItem?.system.awakened;
    sys.awakened = awakened;

    // Attribute (biologischer Wert)
    sys.attr = {};
    for (const [key, cfg] of Object.entries(NR.attributes)) {
      const a = sys.attributes[key];
      const bio = Math.max(0, a.value + a.bonus + (mods[`attributes.${key}`] ?? 0));
      sys.attr[key] = { key, label: cfg.label, abbr: cfg.abbr, base: a.value, bonus: a.bonus + (mods[`attributes.${key}`] ?? 0), bio, total: bio, leiden: a.leiden };
    }

    // Robotik-Durchschnitt (S. 82): GE, ST, KO, BE über 11 Zonen, WA über Tastsinn
    const zoneKeys = Object.keys(NR.zones);
    const roboticCount = Object.keys(robotics).length;
    const roboMax = NR.awakened.maxima;
    sys.zoneAttr = {};
    let zoneUpgraded = false;
    for (const z of zoneKeys) {
      const r = robotics[z]?.system.robotic;
      // Upgrades wirken nur auf robotische Zonen (bei Erwachten: jede Zone)
      const up = (r || awakened) ? zoneUpgrades[z] : null;
      if (up) zoneUpgraded = true;
      sys.zoneAttr[z] = {};
      for (const k of ["ge", "st", "ko", "be", "wa"]) {
        let v = r ? r[k] : sys.attr[k].bio;
        if (up) v += up[k];
        if ((r || awakened) && roboMax[k]) v = Math.min(roboMax[k], v);
        sys.zoneAttr[z][k] = v;
      }
    }
    if (roboticCount > 0 || zoneUpgraded) {
      for (const k of ["ge", "st", "ko", "be"]) {
        const sum = zoneKeys.reduce((acc, z) => acc + sys.zoneAttr[z][k], 0);
        sys.attr[k].total = Math.round(sum / zoneKeys.length);
      }
      const touch = zoneKeys.reduce((acc, z) => acc + sys.zoneAttr[z].wa, 0) / zoneKeys.length;
      sys.attr.wa.total = Math.round((touch + sys.attr.wa.bio * 4) / 5);
    }
    if (awakened) {
      // Technische Höchstwerte der Robotik (S. 218)
      for (const [k, max] of Object.entries(NR.awakened.maxima)) sys.attr[k].total = Math.min(max, sys.attr[k].total);
    }

    // Sonderattribute
    const pain = awakened ? NR.awakened.pain : Math.min(10, Math.max(0, sys.special.schmerztoleranz.value + (mods.schmerztoleranz ?? 0)));
    sys.pain = pain;
    sys.adrenalinMax = awakened ? 0 : Math.max(0, sys.special.adrenalin.value + (mods.adrenalin ?? 0));
    sys.adrenalinLeft = Math.max(0, sys.adrenalinMax - sys.special.adrenalin.used);
    sys.adrenalinBonus = Math.min(5, sys.adrenalinMax);
    sys.meditationMax = Math.max(0, sys.special.meditation.value + (mods.meditation ?? 0));
    sys.meditationLeft = Math.max(0, sys.meditationMax - sys.special.meditation.used);
    sys.zeitpoolBonus = Math.min(5, sys.combat.zeitpoolMax);
    sys.adrenalin = { value: sys.adrenalinLeft, max: sys.adrenalinMax };

    // Fertigkeiten
    sys.skillList = {};
    for (const [key, cfg] of Object.entries(NR.skills)) {
      const value = Math.max(0, sys.skills[key].value + (mods[`skills.${key}`] ?? 0));
      const attr = sys.attr[cfg.attr];
      const trained = value > 0;
      sys.skillList[key] = {
        key, label: cfg.label, attr: cfg.attr, attrAbbr: attr.abbr, base: sys.skills[key].value,
        value, trained, defensive: !!cfg.defensive,
        pool: trained ? attr.total + value : Math.max(1, attr.total - 2)
      };
    }

    // Körperzonen: Trefferpunkte, Rüstung, Schwellenwert
    const tpBio = Math.max(1, sys.tpBase + (mods.tp ?? 0));
    const armors = actor.items.filter(i => i.type === "armor" && i.system.equipped);
    const armorAll = mods.armorAll ?? 0;
    sys.zoneData = {};
    const capacityMax = NR.awakened.capacity + (mods.capacity ?? 0);
    const fullBodyCap = augments.filter(a => a.system.fullBody).reduce((acc, a) => acc + (a.system.capacityCost || 0) * (a.system.quantity || 1), 0);
    let woundZones = 0;
    let hpSum = 0;
    let hpMax = 0;
    for (const z of zoneKeys) {
      const zd = sys.zones[z];
      const robo = robotics[z];
      const max = robo ? (robo.system.robotic.tp || 70) : tpBio;
      const layers = [];
      for (const a of armors) {
        if (a.system.zones.includes(Number(z))) layers.push({ rw: a.system.rw, mk: a.system.mk, name: a.name });
      }
      const up = (robo || awakened) ? zoneUpgrades[z] : null;
      if (robo && (robo.system.armor > 0 || robo.system.mk)) layers.push({ rw: robo.system.armor + (up?.armor ?? 0), mk: robo.system.mk || "B", name: robo.name, natural: true });
      if (armorAll) layers.push({ rw: armorAll, mk: "A", name: "Bonus", natural: true });
      if (awakened && !robo) layers.push({ rw: NR.awakened.chassisArmor + (mods.chassisArmor ?? 0) + (up?.armor ?? 0), mk: (mods.chassisMk ?? 0) > 0 ? "B" : "A", name: "Chassis", natural: true });
      // Körpereigene Panzerung aus biologischen Eigenschaften mit Zonenangabe (modifier target "armor.<zone>")
      const zoneArmorMod = mods[`armor.${z}`] ?? 0;
      if (zoneArmorMod) layers.push({ rw: zoneArmorMod, mk: "A", name: "Körperpanzer", natural: true });
      const armor = layers.reduce((acc, l) => acc + l.rw, 0);
      const mk = layers.reduce((best, l) => NR.mkRank[l.mk] > NR.mkRank[best] ? l.mk : best, "");
      const threshold = Math.floor(max * pain * 0.1);
      const damage = zd.damage + zd.chronic;
      const wounded = damage > threshold;
      if (wounded) woundZones++;
      const remaining = max - damage;
      const lethal = awakened ? NR.awakened.lethalZones.includes(z) : NR.zones[z].lethal;
      const capUsed = (awakened || robo) ? fullBodyCap * (awakened ? 1 : 0) + augments.filter(a => !a.system.fullBody && a.system.zone === z && a.system.kind !== "robotik").reduce((acc, a) => acc + (a.system.capacityCost || 0) * Math.max(1, a.system.quantity || 1), 0) : 0;
      const capMax = awakened ? capacityMax : (robo?.system.robotic.capacity ?? 0);
      hpSum += Math.max(0, remaining);
      hpMax += max;
      sys.zoneData[z] = {
        key: z, label: NR.zones[z].label, short: NR.zones[z].short, lethal,
        capacity: (awakened || robo) ? { used: capUsed, max: capMax, over: capUsed > capMax } : null,
        max, damage: zd.damage, chronic: zd.chronic, total: damage, remaining,
        destroyed: zd.destroyed || remaining <= 0, half: remaining <= max / 2,
        threshold, wounded, armor, mk, layers, robotic: !!robo, roboticName: robo?.name ?? "",
        roboticAttrs: (robo || (awakened && zoneUpgrades[z])) ? ["ge", "st", "ko", "be"].map(k => `${NR.attributes[k].abbr} ${sys.zoneAttr[z][k]}`).join(" · ") : "",
        strayUpgrades: !robo && !awakened && zoneUpgrades[z] ? zoneUpgrades[z].items.join(", ") : "",
        pct: Math.max(0, Math.min(100, Math.round((remaining / max) * 100)))
      };
    }
    sys.health = { value: hpSum, max: hpMax };
    sys.threshold = Math.floor(tpBio * pain * 0.1);

    // Mali (S. 84, 99, 100)
    const woundMalus = woundZones * 2;
    const nlMalus = pain >= 10 ? 0 : Math.floor(sys.nonLethal / 10);
    const holdMalus = actor.items.filter(i => i.type === "psiApp" && i.system.held).reduce((acc, i) => acc + sys.psiHold(i), 0);
    const alcMalus = 0;
    sys.bonusDice = Math.max(0, sys.tempBonus) + Math.max(0, sys.timedBonus);
    const tempMalus = sys.tempMalus + sys.timedMalus;
    sys.malus = {
      wounds: woundMalus,
      nonLethal: nlMalus,
      temp: tempMalus,
      psiCollect: sys.combat.psiCollected,
      hold: holdMalus,
      alcohol: alcMalus,
      physical: woundMalus + nlMalus + Math.max(0, tempMalus),
      total: Math.max(0, woundMalus + nlMalus + tempMalus + sys.combat.psiCollected + holdMalus + alcMalus)
    };
    sys.unconscious = sys.malus.physical > 0 && sys.malus.physical >= sys.attr.ko.total;
    sys.immobile = sys.malus.physical > 0 && sys.malus.physical >= sys.attr.be.total;
    sys.lethalDestroyed = zoneKeys.some(z => sys.zoneData[z].lethal && sys.zoneData[z].destroyed);

    // Bewegung (S. 88)
    sys.movement = Math.max(0, sys.attr.be.total + sys.skillList.rennen.value + (mods.movement ?? 0));

    // Organismus & Psyche (S. 115–116)
    const orgLoss = augments.reduce((acc, a) => acc + (a.system.orgLoss || 0), 0);
    const psyLoss = augments.reduce((acc, a) => acc + (a.system.psycheLoss || 0), 0);
    const orgValue = Math.min(100, sys.organismus.base + (mods.organismus ?? 0) - orgLoss - sys.organismus.loss);
    const psyValue = Math.min(100, sys.psyche.base + (mods.psyche ?? 0) - psyLoss - sys.psyche.loss);
    const orgBand = awakened ? { label: "entfällt (Erwachter)", a: 0, b: 0 } : (NR.organismThresholds.find(t => orgValue >= t.min && orgValue <= t.max) ?? NR.organismThresholds.at(-1));
    const psyBand = NR.psycheRanges.find(t => psyValue >= t.min && psyValue <= t.max) ?? NR.psycheRanges.at(-1);
    sys.org = { value: awakened ? 100 : orgValue, implantLoss: orgLoss, band: orgBand, pct: Math.max(0, orgValue) };
    sys.psy = { value: psyValue, implantLoss: psyLoss, band: psyBand, pct: Math.max(0, psyValue) };

    // Infektionsresistenz (S. 103)
    sys.ir = {
      dice: Math.max(0, sys.infection.dice + (mods.irDice ?? 0)),
      points: sys.infection.points + (mods.irPoints ?? 0) - 2 * sys.infection.malus
    };
    sys.ir.label = `${sys.ir.dice}W6${sys.ir.points ? (sys.ir.points > 0 ? `+${sys.ir.points}` : sys.ir.points) : ""}`;

    // Regeneration (S. 103)
    const regPool = sys.regeneration.pool + (mods.regPool ?? 0);
    sys.reg = {
      speed: sys.regeneration.speed + (mods.regSpeed ?? 0),
      modSpeed: mods.regSpeed ?? 0,
      modPool: mods.regPool ?? 0,
      pool: regPool,
      left: Math.max(0, regPool - sys.regeneration.poolUsed)
    };
    sys.hasRegeneration = sys.reg.speed > 0 && sys.reg.pool > 0;
    sys.bloodMax = sys.blood.max + (mods.bloodMax ?? 0);

    // PSI
    sys.psiPowers = actor.items.filter(i => i.type === "psiPower");
    sys.speciesItem = speciesItem ?? null;
    sys.capacityOver = Object.values(sys.zoneData).some(z => z.capacity?.over);
    sys.hasRobotics = awakened || roboticCount > 0;

    if (actor.type === "character") this._prepareProgress();
  }

  /** GP-Bilanz der Charaktererschaffung (S. 134–136). */
  _prepareProgress() {
    const sys = this;
    const actor = this.parent;
    const p = sys.progress;
    const level = NR.powerLevels[p.powerLevel] ?? NR.powerLevels.standard;
    const gp = { attributes: 0, skills: 0, psi: 0, languages: 0, special: 0, items: 0, money: p.gpMoney };
    const foreignLanguages = [];
    for (const key of Object.keys(NR.attributes)) {
      // Erwachte: Körperattribute (GE, ST, KO, BE, WA) werden nur über Upgrades gesteigert
      if (sys.awakened && (key in NR.awakened.physical || key === "wa")) continue;
      gp.attributes += NR.attributeGpCost(sys.attributes[key].value);
    }
    for (const key of Object.keys(NR.skills)) gp.skills += sys.skills[key].value * 2;
    for (const item of actor.items) {
      const s = item.system;
      switch (item.type) {
        case "species":
        case "abnormality":
          gp.items += s.gp; break;
        case "augment":
          gp.items += s.gp || 0; break;
        case "bioTrait":
          if (s.kind !== "auffaelligkeit") gp.items += s.totalGp; break;
        case "styleSkill":
          gp.items += s.kind === "kampfkunst" ? s.gp * Math.max(1, s.level) : s.gp; break;
        case "psiPower":
          // Kategorie B (HMO): 7 GP je Kraft, eine davon frei (S. 154)
          if (s.key === "kategorieB") gp.psi += 7;
          else gp.psi += Math.max(0, s.value - s.free) * 5;
          break;
        case "skill":
          if (s.category === "sprache") {
            gp.languages += s.native ? Math.max(0, s.value - 5) * 2 : s.value * 2;
            if (!s.native) foreignLanguages.push(s.value);
          }
          else if (s.category === "elite") gp.special += s.value * 4;
          else if (s.category === "fertigkeit") gp.special += s.value * 2;
          break;
      }
    }
    // Linguist: drei Fremdsprachen bis Stufe 3 kostenlos
    if (sys.styles.linguist) gp.languages = Math.max(0, gp.languages - NR.linguistSavings(foreignLanguages));
    if (actor.items.some(i => i.type === "abnormality" && i.name.startsWith("HMO")) && actor.items.some(i => i.type === "psiPower" && i.system.key === "kategorieB")) gp.psi -= 7;
    // Meditation: Stufe 1 liefert der Style-Skill (Modifikator), jede Basisstufe darüber 5 GP (S. 182)
    gp.special += Math.max(0, sys.special.meditation?.value ?? 0) * 5;
    const spent = Object.values(gp).reduce((a, b) => a + b, 0);
    const available = level.gp + p.gpExtra;
    const markers = actor.items.filter(i => i.type === "advantage").reduce((acc, i) => {
      const m = i.system.markers * (i.system.level || 1);
      return i.system.kind === "vorteil" ? { ...acc, spent: acc.spent + m } : { ...acc, gained: acc.gained + m };
    }, { spent: 0, gained: 0 });
    sys.gp = { ...gp, spent, available, left: available - spent, money: p.gpMoney * level.money, level, markers };
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
      /** Kreaturen: Komplexität instinktiven Verhaltens (Wildlife, S. 24). */
      instinct: int(0, { min: 0 }),
      /** Kreaturen: Gegenpart zu Willenskraft/Dressieren (Anzahl erfolgreicher Dressieren-Proben). */
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
