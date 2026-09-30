import { NR } from "../config.mjs";
import { rollPool, applyChatMode, buildFormula } from "../dice/pool.mjs";
import { poolDialog } from "../dice/roll-dialog.mjs";

const { renderTemplate } = foundry.applications.handlebars;

export class NRActor extends Actor {

  /* -------------------------------------------- */
  /*  Datenaufbereitung                            */
  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type === "vehicle") return;
    this._prepareCreature();
  }

  /** Summiere die Modifikatoren aller aktiven Items. */
  _collectModifiers() {
    const mods = {};
    for (const item of this.items) {
      const list = item.system.modifiers;
      if (!Array.isArray(list) || !item.system.modifiersActive) continue;
      const factor = (item.type === "bioTrait" && item.system.perLevel) ? Math.max(1, item.system.level) : 1;
      for (const m of list) {
        if (!m.target) continue;
        mods[m.target] = (mods[m.target] ?? 0) + (Number(m.value) || 0) * factor;
      }
    }
    return mods;
  }

  _prepareCreature() {
    const sys = this.system;
    const mods = this._collectModifiers();
    sys.mods = mods;

    // Robotik je Körperzone
    const robotics = {};
    const augments = this.items.filter(i => i.type === "augment" && i.system.installed);
    for (const a of augments) {
      if (a.system.kind === "robotik" && a.system.zone) robotics[a.system.zone] = a;
    }
    sys.roboticZones = robotics;

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
    sys.zoneAttr = {};
    for (const z of zoneKeys) {
      const r = robotics[z]?.system.robotic;
      sys.zoneAttr[z] = {};
      for (const k of ["ge", "st", "ko", "be", "wa"]) sys.zoneAttr[z][k] = r ? r[k] : sys.attr[k].bio;
    }
    if (roboticCount > 0) {
      for (const k of ["ge", "st", "ko", "be"]) {
        const sum = zoneKeys.reduce((acc, z) => acc + sys.zoneAttr[z][k], 0);
        sys.attr[k].total = Math.round(sum / zoneKeys.length);
      }
      const touch = zoneKeys.reduce((acc, z) => acc + sys.zoneAttr[z].wa, 0) / zoneKeys.length;
      sys.attr.wa.total = Math.round((touch + sys.attr.wa.bio * 4) / 5);
    }

    // Sonderattribute
    const pain = Math.min(10, Math.max(0, sys.special.schmerztoleranz.value + (mods.schmerztoleranz ?? 0)));
    sys.pain = pain;
    sys.adrenalinMax = Math.max(0, sys.special.adrenalin.value + (mods.adrenalin ?? 0));
    sys.adrenalinLeft = Math.max(0, sys.adrenalinMax - sys.special.adrenalin.used);
    sys.adrenalinBonus = Math.min(5, sys.adrenalinMax);
    sys.meditationMax = Math.max(0, sys.special.meditation.value + (mods.meditation ?? 0));
    sys.meditationLeft = Math.max(0, sys.meditationMax - sys.special.meditation.used);
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
    const armors = this.items.filter(i => i.type === "armor" && i.system.equipped);
    const armorAll = mods.armorAll ?? 0;
    sys.zoneData = {};
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
      if (robo && (robo.system.armor > 0 || robo.system.mk)) layers.push({ rw: robo.system.armor, mk: robo.system.mk || "B", name: robo.name, natural: true });
      if (armorAll) layers.push({ rw: armorAll, mk: "A", name: "Bonus", natural: true });
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
      hpSum += Math.max(0, remaining);
      hpMax += max;
      sys.zoneData[z] = {
        key: z, label: NR.zones[z].label, short: NR.zones[z].short, lethal: NR.zones[z].lethal,
        max, damage: zd.damage, chronic: zd.chronic, total: damage, remaining,
        destroyed: zd.destroyed || remaining <= 0, half: remaining <= max / 2,
        threshold, wounded, armor, mk, layers, robotic: !!robo, roboticName: robo?.name ?? "",
        pct: Math.max(0, Math.min(100, Math.round((remaining / max) * 100)))
      };
    }
    sys.health = { value: hpSum, max: hpMax };
    sys.threshold = Math.floor(tpBio * pain * 0.1);

    // Mali (S. 84, 99, 100)
    const woundMalus = woundZones * 2;
    const nlMalus = pain >= 10 ? 0 : Math.floor(sys.nonLethal / 10);
    const holdMalus = this.items.filter(i => i.type === "psiApp" && i.system.held).reduce((acc, i) => acc + i.system.hold, 0);
    const alcMalus = 0;
    sys.malus = {
      wounds: woundMalus,
      nonLethal: nlMalus,
      temp: sys.tempMalus,
      psiCollect: sys.combat.psiCollected,
      hold: holdMalus,
      alcohol: alcMalus,
      physical: woundMalus + nlMalus + Math.max(0, sys.tempMalus),
      total: Math.max(0, woundMalus + nlMalus + sys.tempMalus + sys.combat.psiCollected + holdMalus + alcMalus)
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
    const orgBand = NR.organismThresholds.find(t => orgValue >= t.min && orgValue <= t.max) ?? NR.organismThresholds.at(-1);
    const psyBand = NR.psycheRanges.find(t => psyValue >= t.min && psyValue <= t.max) ?? NR.psycheRanges.at(-1);
    sys.org = { value: orgValue, implantLoss: orgLoss, band: orgBand, pct: Math.max(0, orgValue) };
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
      pool: regPool,
      left: Math.max(0, regPool - sys.regeneration.poolUsed)
    };
    sys.hasRegeneration = sys.reg.speed > 0 && sys.reg.pool > 0;
    sys.bloodMax = sys.blood.max + (mods.bloodMax ?? 0);

    // PSI
    sys.psiPowers = this.items.filter(i => i.type === "psiPower");
    const species = this.items.find(i => i.type === "species");
    sys.speciesItem = species ?? null;

    if (this.type === "character") this._prepareProgress();
  }

  /** GP-Bilanz der Charaktererschaffung (S. 134–136). */
  _prepareProgress() {
    const sys = this.system;
    const p = sys.progress;
    const level = NR.powerLevels[p.powerLevel] ?? NR.powerLevels.standard;
    const gp = { attributes: 0, skills: 0, psi: 0, languages: 0, special: 0, items: 0, money: p.gpMoney };
    for (const key of Object.keys(NR.attributes)) gp.attributes += NR.attributeGpCost(sys.attributes[key].value);
    for (const key of Object.keys(NR.skills)) gp.skills += sys.skills[key].value * 2;
    for (const item of this.items) {
      const s = item.system;
      switch (item.type) {
        case "species":
        case "abnormality":
          gp.items += s.gp; break;
        case "bioTrait":
          if (s.kind !== "auffaelligkeit") gp.items += s.totalGp; break;
        case "styleSkill":
          gp.items += s.kind === "kampfkunst" ? s.gp * Math.max(1, s.level) : s.gp; break;
        case "psiPower":
          gp.psi += Math.max(0, s.value - s.free) * 5; break;
        case "skill":
          if (s.category === "sprache") gp.languages += s.native ? Math.max(0, s.value - 5) * 2 : s.value * 2;
          else if (s.category === "elite") gp.special += s.value * 4;
          else if (s.category === "fertigkeit") gp.special += s.value * 2;
          break;
      }
    }
    const spent = Object.values(gp).reduce((a, b) => a + b, 0);
    const available = level.gp + p.gpExtra;
    const markers = this.items.filter(i => i.type === "advantage").reduce((acc, i) => {
      const m = i.system.markers * (i.system.level || 1);
      return i.system.kind === "vorteil" ? { ...acc, spent: acc.spent + m } : { ...acc, gained: acc.gained + m };
    }, { spent: 0, gained: 0 });
    sys.gp = { ...gp, spent, available, left: available - spent, money: p.gpMoney * level.money, level, markers };
  }

  /** @override */
  getRollData() {
    const data = super.getRollData();
    if (this.type === "vehicle") return data;
    const s = this.system;
    for (const [k, a] of Object.entries(s.attr ?? {})) data[k] = a.total;
    data.skill = Object.fromEntries(Object.entries(s.skillList ?? {}).map(([k, v]) => [k, v.value]));
    data.pain = s.pain;
    data.initiativePool = s.skillList?.reaktion?.pool ?? 1;
    return data;
  }

  /* -------------------------------------------- */
  /*  Hilfsfunktionen                              */
  /* -------------------------------------------- */

  /** Maluswürfel für eine Probe. options.resist → keine Mali (Schadenswiderstand). */
  getMalus({ resist = false, psi = false } = {}) {
    if (resist || this.type === "vehicle") return 0;
    const m = this.system.malus;
    return psi ? m.total - m.psiCollect : m.total;
  }

  /** Verbrauche eine Nutzung Adrenalin (oder Meditation). */
  async spendAdrenalin(kind = "adrenalin") {
    const sys = this.system;
    if (kind === "meditation") {
      if (sys.meditationLeft <= 0) return false;
      await this.update({ "system.special.meditation.used": sys.special.meditation.used + 1 });
      return true;
    }
    if (sys.adrenalinLeft <= 0) return false;
    await this.update({ "system.special.adrenalin.used": sys.special.adrenalin.used + 1 });
    return true;
  }

  /** Stelle Adrenalin, Meditation und Regenerationspool wieder her (Rast: 6 h Schlaf + Nahrung). */
  async rest() {
    await this.update({
      "system.special.adrenalin.used": 0,
      "system.special.meditation.used": 0,
      "system.regeneration.poolUsed": 0,
      "system.combat.defenses": 0,
      "system.combat.psiCollected": 0
    });
    ui.notifications.info(game.i18n.format("NR.Notify.Rested", { name: this.name }));
  }

  /* -------------------------------------------- */
  /*  Proben                                       */
  /* -------------------------------------------- */

  /**
   * Allgemeine Probe mit Dialog.
   * @param {object} cfg
   */
  async rollCheck({ label, dice, attrKey = null, subtitle = "", mw = 10, hazard = true, allowPass = true,
    skipDialog = false, resist = false, psi = false, extraBonus = 0, extraPoints = 0, altAttr = null,
    skillValue = null, untrained = false, flags = {}, extraHtml = "" } = {}) {

    const malus = this.getMalus({ resist, psi });
    let opts = { bonusDice: extraBonus, malusDice: 0, points: extraPoints, mw, pass: false, useAdrenalin: false, useMeditation: false, disadvantages: 0, attr: attrKey };
    if (!skipDialog) {
      opts = await poolDialog({
        title: label, actor: this, dice, woundMalus: malus, mw, allowPass, resist,
        attrKey, altAttr, skillValue, untrained, extraBonus, extraPoints
      });
      if (!opts) return null;
    }

    // Attributwechsel (z. B. Einschüchtern mit ST)
    let attrUsed = attrKey;
    let baseDice = dice;
    if (opts.attr && attrKey && opts.attr !== attrKey && skillValue !== null) {
      attrUsed = opts.attr;
      const a = this.system.attr[attrUsed].total;
      baseDice = untrained ? Math.max(1, a - 2) : a + skillValue;
    }

    let bonus = opts.bonusDice;
    if (opts.useAdrenalin && await this.spendAdrenalin("adrenalin")) bonus += this.system.adrenalinBonus;
    if (opts.useMeditation && await this.spendAdrenalin("meditation")) bonus += Math.min(5, this.system.meditationMax);

    const malusTotal = (resist ? 0 : malus) + opts.malusDice + opts.disadvantages * 2;
    const leiden = attrUsed ? (this.system.attr[attrUsed]?.leiden ?? 0) : 0;
    const sub = subtitle || (attrUsed ? `${this.system.attr[attrUsed].abbr} ${this.system.attr[attrUsed].total}` : "");
    return rollPool({
      actor: this, label, subtitle: sub, dice: baseDice, bonusDice: bonus, malusDice: malusTotal,
      points: opts.points, mw: opts.mw, hazard, pass: opts.pass, leiden, flags, extraHtml,
      rerollData: { actorUuid: this.uuid, label, subtitle: sub, dice: baseDice, bonusDice: bonus, malusDice: malusTotal, points: opts.points, mw: opts.mw, hazard, leiden, flags }
    });
  }

  async rollAttribute(key, options = {}) {
    const a = this.system.attr[key];
    return this.rollCheck({ label: `${a.label}-Probe`, dice: a.total, attrKey: key, subtitle: `${a.abbr} ${a.total}`, ...options });
  }

  async rollSkill(key, options = {}) {
    const s = this.system.skillList[key];
    const a = this.system.attr[s.attr];
    const cfg = NR.skills[key];
    const subtitle = s.trained ? `${a.abbr} ${a.total} + ${s.label} ${s.value}` : `${a.abbr} ${a.total} − 2 (ungeübt)`;
    return this.rollCheck({
      label: s.label, dice: s.pool, attrKey: s.attr, altAttr: cfg.alt ?? null, subtitle,
      skillValue: s.value, untrained: !s.trained, ...options
    });
  }

  async rollCustomSkill(item, options = {}) {
    const s = item.system;
    if (s.value < 1 && s.category !== "fertigkeit") {
      ui.notifications.warn(game.i18n.localize("NR.Notify.SkillNotLearned"));
      return null;
    }
    const a = s.attribute ? this.system.attr[s.attribute] : null;
    const dice = a ? (s.value > 0 ? a.total + s.value : Math.max(1, a.total - 2)) : s.value;
    const subtitle = a ? `${a.abbr} ${a.total} + ${item.name} ${s.value}` : `${item.name} ${s.value}`;
    return this.rollCheck({ label: item.name, dice, attrKey: s.attribute || null, subtitle, skillValue: s.value, ...options });
  }

  /** Infektionsresistenz gegen Intensität (ohne Hazard-Di). */
  async rollInfection() {
    const ir = this.system.ir;
    const intensity = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("NR.Roll.Infection") },
      content: `<div class="form-group"><label>${game.i18n.localize("NR.Roll.Intensity")}</label><input type="number" name="mw" value="6" autofocus></div>`,
      ok: { label: game.i18n.localize("NR.Roll.Roll") }
    }).catch(() => null);
    if (!intensity) return null;
    return rollPool({ actor: this, label: game.i18n.localize("NR.Roll.Infection"), subtitle: ir.label, dice: ir.dice, points: ir.points, hazard: false, oneDieRule: false, mw: Number(intensity.mw) || 0 });
  }

  /** Initiativwurf (Mexican Standoff: Reaktion). */
  async rollInitiativePool() {
    const s = this.system.skillList.reaktion;
    return rollPool({ actor: this, label: "Reaktion (Initiative)", dice: s.pool, malusDice: this.getMalus(), chat: false });
  }

  /* -------------------------------------------- */
  /*  Schaden                                      */
  /* -------------------------------------------- */

  /**
   * Rüstungspunkte einer Zone gegen einen Angriff.
   * @returns {{points: number, mk: string, noEffect: boolean}}
   */
  armorAgainst(zone, { pierce = "", damageType = "", noDamageVs = "", nonLethal = false } = {}) {
    const zd = this.system.zoneData?.[zone];
    if (!zd) return { points: 0, mk: "", noEffect: false, notes: [] };
    const pierceRank = pierce === "all" ? 99 : (NR.mkRank[pierce] ?? 0);
    let points = 0;
    const notes = [];
    for (const l of zd.layers) {
      const rank = NR.mkRank[l.mk] ?? 0;
      if (rank <= pierceRank) { notes.push(`${l.name}: ignoriert`); continue; }
      if (damageType === "wucht" && l.mk === "A") { notes.push(`${l.name}: MK:A schützt nicht vor Wucht`); continue; }
      points += l.rw;
    }
    let noEffect = false;
    if (noDamageVs && NR.mkRank[zd.mk] >= NR.mkRank[noDamageVs]) { noEffect = true; notes.push(`Kein Schaden gegen ${NR.materialCategories[zd.mk]}`); }
    if (nonLethal && (NR.mkRank[zd.mk] >= 2 || this.system.pain >= 10)) { noEffect = true; notes.push("NL-Schaden wirkungslos (MK:B oder Schmerztoleranz 10)"); }
    return { points, mk: zd.mk, noEffect, notes };
  }

  /**
   * Schadenswiderstandsprobe und Anwendung (S. 98–99).
   * @param {object} dmg
   * @param {number} dmg.amount     Schadenswert
   * @param {string[]} dmg.zones    Betroffene Körperzonen
   * @param {object} [dmg.attack]   pierce, damageType, noDamageVs, nonLethal, structure, continuous
   * @param {number} [dmg.resistMalus]  Kumulativer Malus bei andauerndem Schaden
   */
  async resistDamage({ amount, zones = ["7"], attack = {}, resistMalus = 0, label = null, skipDialog = false } = {}) {
    if (this.type === "vehicle") return this.resistVehicleDamage({ amount, attack });
    const ko = this.system.attr.ko;
    const primary = zones[0];
    const armor = this.armorAgainst(primary, attack);
    const structure = !!attack.structure;
    const effAmount = structure ? amount * 250 : amount;

    let bonusDice = 0;
    let usedAdrenalin = false;
    if (!skipDialog) {
      const choice = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("NR.Roll.Resist"), icon: "fa-solid fa-shield-heart" },
        classes: ["noreturn", "nr-roll-dialog"],
        content: `<p>${game.i18n.format("NR.Roll.ResistPrompt", { amount: effAmount, zone: zones.map(z => NR.zones[z].label).join(", "), armor: armor.points })}</p>
          ${armor.notes.length ? `<p class="nr-hint">${armor.notes.join("<br>")}</p>` : ""}
          <div class="form-group"><label>${game.i18n.localize("NR.Roll.BonusDice")}</label><input type="number" name="bonus" value="0"></div>
          ${this.system.adrenalinLeft > 0 ? `<div class="form-group"><label>${game.i18n.format("NR.Roll.UseAdrenalin", { n: this.system.adrenalinBonus, left: this.system.adrenalinLeft })}</label><input type="checkbox" name="adrenalin"></div>` : ""}`,
        buttons: [{
          action: "roll", label: game.i18n.localize("NR.Roll.Roll"), default: true,
          callback: (event, button) => ({ bonus: Number(button.form.elements.bonus.value) || 0, adrenalin: button.form.elements.adrenalin?.checked ?? false })
        }, { action: "cancel", label: game.i18n.localize("Cancel") }]
      }).catch(() => null);
      if (!choice || choice === "cancel") return null;
      bonusDice = choice.bonus;
      if (choice.adrenalin && await this.spendAdrenalin()) { bonusDice += this.system.adrenalinBonus; usedAdrenalin = true; }
    }

    const results = [];
    const { formula } = buildFormula({ dice: ko.total, bonusDice, malusDice: resistMalus, hazard: true });
    const roll = await new Roll(formula).evaluate();
    const updates = {};
    let totalApplied = 0;
    for (const z of zones) {
      const zArmor = this.armorAgainst(z, attack);
      const resist = roll.total + zArmor.points;
      let through = zArmor.noEffect ? 0 : Math.max(0, effAmount - resist);
      results.push({ zone: z, label: NR.zones[z].label, armor: zArmor.points, resist, through, notes: zArmor.notes });
      if (through <= 0) continue;
      totalApplied += through;
      if (attack.nonLethal) continue;
      const cur = updates[`system.zones.${z}.damage`] ?? this.system.zones[z].damage;
      updates[`system.zones.${z}.damage`] = cur + through;
    }
    let nlAdded = 0;
    if (attack.nonLethal) {
      nlAdded = results.reduce((a, r) => Math.max(a, r.through), 0);
      if (nlAdded > 0) updates["system.nonLethal"] = this.system.nonLethal + nlAdded;
    }
    if (Object.keys(updates).length) await this.update(updates);

    // Folgen ermitteln
    const after = results.map(r => {
      const zd = this.system.zoneData[r.zone];
      return { ...r, destroyed: zd.destroyed, lethal: zd.lethal && zd.destroyed, half: zd.half };
    });
    const content = await renderTemplate("systems/noreturn/templates/chat/damage-result.hbs", {
      actor: this, label: label ?? game.i18n.localize("NR.Chat.DamageResistance"), amount: effAmount, structure,
      rollTotal: roll.total, results: after, nonLethal: !!attack.nonLethal, nlAdded, usedAdrenalin,
      unconscious: this.system.unconscious, immobile: this.system.immobile, malus: this.system.malus.physical,
      dead: after.some(r => r.lethal), continuous: !!attack.continuous, resistMalus
    });
    const msgData = { speaker: ChatMessage.getSpeaker({ actor: this }), content, rolls: [roll], sound: CONFIG.sounds.dice };
    applyChatMode(msgData);
    await ChatMessage.create(msgData);
    return { roll, results: after, totalApplied };
  }

  /** Schaden an Fahrzeugen: Stabilität + Panzerung (S. 104). */
  async resistVehicleDamage({ amount, attack = {} }) {
    const s = this.system;
    const pierceRank = attack.pierce === "all" ? 99 : (NR.mkRank[attack.pierce] ?? 0);
    const armor = (NR.mkRank[s.mk] ?? 0) <= pierceRank ? 0 : s.armor;
    const effAmount = attack.structure ? amount * 250 : amount;
    const roll = await new Roll(`${Math.max(0, s.stability - 1)}d6 + 1d6x`).evaluate();
    const resist = roll.total + armor;
    const through = Math.max(0, effAmount - resist);
    if (through > 0) await this.update({ "system.hp.value": Math.max(0, s.hp.value - through) });
    const vital = through > 0 ? (await new Roll("1d6").evaluate()).total === 6 : false;
    const content = `<div class="nr-card"><h3>${game.i18n.localize("NR.Chat.VehicleDamage")}</h3>
      <p>${game.i18n.format("NR.Chat.VehicleDamageText", { amount: effAmount, resist, armor, through })}</p>
      ${vital ? `<p class="nr-bad"><strong>${game.i18n.localize("NR.Chat.VitalHit")}</strong></p>` : ""}
      ${this.system.damaged ? `<p class="nr-warn">${game.i18n.localize("NR.Chat.VehicleCrippled")}</p>` : ""}</div>`;
    const msgData = { speaker: ChatMessage.getSpeaker({ actor: this }), content, rolls: [roll] };
    applyChatMode(msgData);
    await ChatMessage.create(msgData);
    return { roll, through };
  }

  /** Direkter Schaden ohne Widerstand (z. B. Gift, PSI-Fehlschlag). */
  async applyDirectDamage(zone, amount) {
    const cur = this.system.zones[zone].damage;
    await this.update({ [`system.zones.${zone}.damage`]: Math.max(0, cur + amount) });
  }

  /** Heilung (S. 103): natürliche Heilung = KO je Zone, mit Medizin verdoppelt. */
  async healNatural({ doubled = false, days = 1 } = {}) {
    const good = this.items.some(i => i.type === "advantage" && i.name.toLowerCase().includes("heilfleisch"));
    const bad = this.items.some(i => i.type === "advantage" && i.name.toLowerCase().includes("verdorbenes"));
    let perDay = good ? 20 : this.system.attr.ko.total;
    if (doubled && !bad) perDay *= 2;
    const immun = this.items.some(i => i.type === "abnormality" && i.name.toLowerCase().startsWith("immunit"));
    if (immun && !bad) perDay *= 2;
    const heal = perDay * days;
    const updates = {};
    for (const z of Object.keys(NR.zones)) {
      const d = this.system.zones[z].damage;
      if (d > 0) updates[`system.zones.${z}.damage`] = Math.max(0, d - heal);
    }
    updates["system.nonLethal"] = 0;
    await this.update(updates);
    ui.notifications.info(game.i18n.format("NR.Notify.Healed", { name: this.name, heal }));
  }

  /** Regeneration zu Beginn der Kampfrunde (S. 103). */
  async regenerate() {
    const reg = this.system.reg;
    if (!this.system.hasRegeneration || reg.left <= 0) return;
    let budget = Math.min(reg.speed, reg.left);
    let used = 0;
    const updates = {};
    const order = Object.values(this.system.zoneData).filter(z => z.damage > 0).sort((a, b) => (b.lethal - a.lethal) || (b.damage - a.damage));
    for (const z of order) {
      if (budget <= 0) break;
      const h = Math.min(budget, z.damage);
      updates[`system.zones.${z.key}.damage`] = z.damage - h;
      if (z.damage - h < z.max) updates[`system.zones.${z.key}.destroyed`] = false;
      budget -= h;
      used += h;
    }
    if (!used) return;
    updates["system.regeneration.poolUsed"] = this.system.regeneration.poolUsed + used;
    await this.update(updates);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="nr-card"><p>${game.i18n.format("NR.Chat.Regenerated", { name: this.name, n: used })}</p></div>` });
  }

  /* -------------------------------------------- */
  /*  Degeneration                                 */
  /* -------------------------------------------- */

  /** Würfle auf Degenerationstabelle A oder B (S. 115) und wende das Ergebnis an. */
  async rollDegeneration(table = "A") {
    const cfg = table === "A" ? NR.degenerationA : NR.degenerationB;
    const roll = await new Roll("1d6").evaluate();
    let entry = cfg[roll.total];
    const updates = {};
    let note = "";
    if (entry.effect === "leiden") {
      const cur = this.system.attributes[entry.attr].leiden;
      if (cur >= 3) note = game.i18n.localize("NR.Chat.LeidenMax");
      else updates[`system.attributes.${entry.attr}.leiden`] = cur + 1;
    } else if (entry.effect === "irMalus") {
      if (this.system.infection.malus >= 3) note = game.i18n.localize("NR.Chat.LeidenMax");
      else updates["system.infection.malus"] = this.system.infection.malus + 1;
    } else if (entry.effect === "wounds") {
      const z1 = (await new Roll("2d6").evaluate()).total;
      const z2 = (await new Roll("2d6").evaluate()).total;
      updates[`system.zones.${z1}.chronic`] = this.system.zones[z1].chronic + 5;
      updates[`system.zones.${z2}.chronic`] = (updates[`system.zones.${z2}.chronic`] ?? this.system.zones[z2].chronic) + 5;
      note = `${NR.zones[z1].label}, ${NR.zones[z2].label}: +5 dauerhafter Schaden`;
    }
    if (Object.keys(updates).length) await this.update(updates);
    const attrLabel = entry.attr ? NR.attributes[entry.attr].label : "";
    const content = `<div class="nr-card"><h3>${game.i18n.format("NR.Chat.DegenerationTable", { table })}</h3>
      <p><strong>${roll.total}: ${entry.label}</strong>${attrLabel ? ` (${attrLabel}: +1 Stufe Leiden)` : ""}</p>${note ? `<p class="nr-hint">${note}</p>` : ""}</div>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content, rolls: [roll] });
  }

  /* -------------------------------------------- */
  /*  Steigern (S. 129)                            */
  /* -------------------------------------------- */

  /**
   * EP-Kosten für die nächste Stufe.
   * @param {"attribute"|"special"|"skill"|"custom"|"psi"} type
   */
  advancementCost(type, currentValue, { skillKey = null, item = null } = {}) {
    const next = currentValue + 1;
    let factor = NR.xpCosts[type] ?? 2;
    if (type === "custom" && item) factor = item.system.category === "sprache" || item.system.category === "elite" ? 4 : 2;
    if (type === "attribute" && skillKey) {
      // Nachteil „Schwaches Attribut“ verdoppelt, X-trem Gen macht Stärke zur Elite-Fertigkeit
      const weak = this.items.some(i => i.type === "advantage" && i.system.kind === "nachteil" && i.name.toLowerCase().includes("schwaches attribut") && i.name.toLowerCase().includes(NR.attributes[skillKey].label.toLowerCase()));
      if (skillKey === "st" && this.items.some(i => i.type === "abnormality" && i.name.toLowerCase().includes("x-trem"))) factor = 4;
      if (weak) factor *= 2;
    }
    let cost = next * factor;
    if (this.type === "character" && (type === "skill" || type === "custom")) {
      const p = this.system.progress;
      const sets = [p.butterfly, p.butterfly2].filter(Boolean);
      if (skillKey && sets.some(b => NR.butterflyEffects[b]?.skills.includes(skillKey))) cost = Math.ceil(cost / 2);
      if (p.pns) cost = Math.max(1, cost - 2);
    }
    return cost;
  }

  /** Steigere einen Wert gegen EP. */
  async advance(type, key) {
    if (this.type !== "character") return;
    let path, current, label, item = null;
    if (type === "attribute") { path = `system.attributes.${key}.value`; current = this.system.attributes[key].value; label = NR.attributes[key].label; }
    else if (type === "skill") { path = `system.skills.${key}.value`; current = this.system.skills[key].value; label = NR.skills[key].label; }
    else if (type === "special") { path = `system.special.${key}.value`; current = this.system.special[key].value; label = key === "schmerztoleranz" ? "Schmerztoleranz" : key === "adrenalin" ? "Adrenalin" : "Meditation"; }
    else if (type === "custom" || type === "psi") { item = this.items.get(key); path = "system.value"; current = item.system.value; label = item.name; }
    const cost = this.advancementCost(type === "psi" ? "psi" : type, current, { skillKey: type === "attribute" || type === "skill" ? key : null, item });
    const xp = this.system.progress.xp.value;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("NR.Advance.Title") },
      content: `<p>${game.i18n.format("NR.Advance.Prompt", { label, from: current, to: current + 1, cost, xp })}</p>${cost > xp ? `<p class="nr-bad">${game.i18n.localize("NR.Advance.NotEnough")}</p>` : ""}`
    });
    if (!ok) return;
    if (item) await item.update({ [path]: current + 1 });
    else await this.update({ [path]: current + 1 });
    await this.update({ "system.progress.xp.value": xp - cost });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), whisper: ChatMessage.getWhisperRecipients("GM"), content: `<div class="nr-card"><p>${game.i18n.format("NR.Advance.Done", { name: this.name, label, to: current + 1, cost })}</p></div>` });
  }

  /* -------------------------------------------- */
  /*  Lebenszyklus                                 */
  /* -------------------------------------------- */

  /** @override */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    const proto = {};
    if (this.type === "character") Object.assign(proto, { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY, "sight.enabled": true });
    if (this.type === "vehicle") Object.assign(proto, { width: 2, height: 1 });
    Object.assign(proto, { "bar1.attribute": this.type === "vehicle" ? "hp" : "health", "displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER });
    this.updateSource({ prototypeToken: foundry.utils.expandObject(proto) });
  }
}
