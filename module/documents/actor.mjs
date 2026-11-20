import { NR } from "../config.mjs";
import { rollPool, applyChatMode, buildFormula } from "../dice/pool.mjs";
import { poolDialog } from "../dice/roll-dialog.mjs";

const { renderTemplate } = foundry.applications.handlebars;

export class NRActor extends foundry.documents.Actor {

  /* -------------------------------------------- */
  /*  Datenaufbereitung                            */
  /* -------------------------------------------- */

  /** Biologische Eigenschaften bringen ihre körpereigenen Waffen mit (system.grants). */
  async _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
    await super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
    if (userId !== game.user.id || collection !== "items" || options.nrSkipGrants) return;
    const wanted = new Set();
    for (const d of documents) if (d.type === "bioTrait") for (const n of d.system.grants ?? []) if (n && !this.items.some(i => i.type === "weapon" && i.name === n)) wanted.add(n);
    if (!wanted.size) return;
    // Nur den Index laden und gezielt die benötigten Waffen holen (statt das ganze Pack)
    const pack = game.packs.get("noreturn.waffen");
    if (!pack) return;
    const index = await pack.getIndex();
    const toCreate = [];
    for (const n of wanted) {
      const entry = index.find(w => w.name === n);
      const doc = entry ? await pack.getDocument(entry._id) : null;
      if (doc) {
        const o = doc.toObject();
        delete o._id;
        toCreate.push(o);
      }
    }
    if (toCreate.length) await this.createEmbeddedDocuments("Item", toCreate, { nrSkipGrants: true });
  }

  /**
   * Token-Leisten: Gesundheit und Adrenalin sind abgeleitete Werte ohne Schemafeld und
   * müssen auf echte Felder abgebildet werden.
   * @override
   */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (this.type !== "vehicle" && isBar && attribute === "health") {
      const { value: cur, max } = this.system.health;
      const target = Math.clamp(isDelta ? cur + value : value, 0, max);
      return this._setHealthTotal(target);
    }
    if (this.type !== "vehicle" && isBar && attribute === "adrenalin") {
      const { value: cur, max } = this.system.adrenalin;
      const target = Math.clamp(isDelta ? cur + value : value, 0, max);
      return this.update({ "system.special.adrenalin.used": max - target });
    }
    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  /**
   * Setzt die Summe der verbleibenden Trefferpunkte: Schaden geht auf den Rumpf,
   * Heilung reduziert den Schaden beginnend bei der am schwersten getroffenen Zone.
   * @param {number} target
   */
  async _setHealthTotal(target) {
    let diff = this.system.health.value - target; // > 0: Schaden, < 0: Heilung
    if (!diff) return this;
    if (diff > 0) return this.applyDirectDamage("7", diff);
    const updates = {};
    const zones = Object.entries(this.system.zones).sort(([, a], [, b]) => b.damage - a.damage);
    for (const [key, z] of zones) {
      if (diff >= 0) break;
      const heal = Math.min(z.damage, -diff);
      if (heal <= 0) continue;
      updates[`system.zones.${key}.damage`] = z.damage - heal;
      diff += heal;
    }
    return Object.keys(updates).length ? this.update(updates) : this;
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

  /**
   * Stufe eines Style-Skills (0 = nicht vorhanden). Expertenfähigkeiten haben Stufe 1,
   * Kampfkünste ihre gewählte Stufe.
   * @param {string} key   Schlüssel aus NR.styleSkillKeys
   */
  styleLevel(key) {
    return this.system.styles?.[key] ?? 0;
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
    // Style-Skills mit begrenzten Einsätzen (außer „je Sitzung“) füllen sich bei der Rast wieder auf
    const refill = this.items.filter(i => i.type === "styleSkill" && i.system.uses.max > 0 && i.system.uses.value < i.system.uses.max
      && !/^(sitzung|session)/i.test(i.system.uses.per));
    if (refill.length) await this.updateEmbeddedDocuments("Item", refill.map(i => ({ _id: i.id, "system.uses.value": i.system.uses.max })));
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
    skillValue = null, untrained = false, flags = {}, extraHtml = "", skillKey = null } = {}) {

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
    // Situative Bonuswürfel aus Items: dice.<fertigkeit> bzw. dice.<fertigkeit>.<attribut> (z. B. Krallen, Roar)
    if (skillKey) {
      const m = this.system.mods ?? {};
      const sit = (m[`dice.${skillKey}`] ?? 0) + (attrUsed ? (m[`dice.${skillKey}.${attrUsed}`] ?? 0) : 0);
      if (sit) {
        bonus += sit;
        extraHtml += `<p class="nr-good"><i class="fa-solid fa-paw"></i> ${game.i18n.format("NR.Chat.SituationalDice", { n: sit })}</p>`;
      }
    }
    if (opts.useAdrenalin && await this.spendAdrenalin("adrenalin")) bonus += this.system.adrenalinBonus;
    if (opts.useMeditation && await this.spendAdrenalin("meditation")) bonus += Math.min(5, this.system.meditationMax);

    // Robotik-Overdrive (S. 217): gespeicherte Bonuspunkte auf die nächste Stärke-Aktion
    let overdrive = 0;
    if (attrUsed === "st" && this.system.combat?.overdrive > 0) {
      overdrive = this.system.combat.overdrive;
      opts.points += overdrive;
      await this.update({ "system.combat.overdrive": 0 });
    }
    if (overdrive) extraHtml += `<p class="nr-warn"><i class="fa-solid fa-gears"></i> Overdrive +${overdrive} Stärke</p>`;
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
      skillValue: s.value, untrained: !s.trained, skillKey: key, ...options
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
    if (this.system.awakened) return ui.notifications.info(game.i18n.localize("NR.Awakened.Immune"));
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
    // Ungezielt: W6 = 6 → vitale Stelle; Aim for the Heart: gezielter Treffer auf eine vitale Stelle
    const vital = through > 0 ? (attack.aimVital || (await new Roll("1d6").evaluate()).total === 6) : false;
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
    if (this.system.awakened) return ui.notifications.warn(game.i18n.localize("NR.Awakened.NoHealing"));
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
  /*  Robotik & Erwachte                           */
  /* -------------------------------------------- */

  /**
   * Robotik-Overdrive (S. 217): Stärke eines Robotikteils für eine Aktion erhöhen,
   * jeder Bonuspunkt verursacht einen Schadenspunkt am Teil.
   */
  async overdrive() {
    const sys = this.system;
    const zones = Object.values(sys.zoneData).filter(z => (sys.awakened || z.robotic) && !z.destroyed);
    if (!zones.length) return ui.notifications.warn(game.i18n.localize("NR.Awakened.NoRobotics"));
    const def = zones.find(z => z.key === "5") ?? zones[0];
    const res = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("NR.Awakened.Overdrive"), icon: "fa-solid fa-gears" },
      classes: ["noreturn", "nr-roll-dialog"],
      content: `<p class="nr-hint">${game.i18n.localize("NR.Awakened.OverdriveHint")}</p>
        <div class="form-group"><label>${game.i18n.localize("NR.Zone.Zone")}</label><select name="zone">${zones.map(z => `<option value="${z.key}" ${z.key === def.key ? "selected" : ""}>${z.key}: ${z.label} (${z.remaining}/${z.max} TP)</option>`).join("")}</select></div>
        <div class="form-group"><label>${game.i18n.localize("NR.Awakened.OverdrivePoints")}</label><input type="number" name="points" value="20" min="1"></div>`,
      buttons: [{ action: "ok", label: game.i18n.localize("NR.Awakened.Overdrive"), default: true,
        callback: (e, b) => ({ zone: b.form.elements.zone.value, points: Math.max(1, Number(b.form.elements.points.value) || 0) }) },
      { action: "cancel", label: game.i18n.localize("Cancel") }]
    }).catch(() => null);
    if (!res || res === "cancel") return;
    const z = sys.zoneData[res.zone];
    const points = Math.min(res.points, Math.max(0, z.remaining));
    await this.update({
      [`system.zones.${res.zone}.damage`]: sys.zones[res.zone].damage + points,
      "system.combat.overdrive": (sys.combat.overdrive || 0) + points
    });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="nr-card"><h3><i class="fa-solid fa-gears"></i> ${game.i18n.localize("NR.Awakened.Overdrive")}</h3><p>${game.i18n.format("NR.Awakened.OverdriveChat", { name: this.name, points, zone: z.label })}</p>${this.system.zoneData[res.zone].destroyed ? `<p class="nr-bad">${game.i18n.localize("NR.Zone.Destroyed")}</p>` : ""}</div>` });
  }

  /** EMP/Technokinese gegen Erwachte (S. 147): 2W6 − (Willenskraft + Wissen) KR handlungsunfähig. */
  async empHit() {
    const wk = this.system.skillList.willenskraft.value;
    const wi = this.system.attr.wi.total;
    const roll = await new Roll("2d6").evaluate();
    const rounds = Math.max(0, roll.total - wk - wi);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), rolls: [roll],
      content: `<div class="nr-card"><h3><i class="fa-solid fa-bolt"></i> ${game.i18n.localize("NR.Awakened.Emp")}</h3><p>${game.i18n.format("NR.Awakened.EmpChat", { name: this.name, roll: roll.total, wk, wi, rounds })}</p></div>` });
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
    if (type === "attribute" && this.system.awakened && (key in NR.awakened.physical || key === "wa")) {
      return ui.notifications.warn(game.i18n.localize("NR.Awakened.UpgradeOnly"));
    }
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
    // Bereits gesetzte Token-Konfiguration (Import, Kopie, Compendium-Drop) nicht überschreiben
    const given = foundry.utils.flattenObject(data.prototypeToken ?? {});
    const proto = {};
    if (this.type === "character") Object.assign(proto, { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY, "sight.enabled": true });
    if (this.type === "vehicle") Object.assign(proto, { width: 2, height: 1 });
    Object.assign(proto, { "bar1.attribute": this.type === "vehicle" ? "hp" : "health", "displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER });
    for (const key of Object.keys(proto)) if (key in given) delete proto[key];
    if (!foundry.utils.isEmpty(proto)) this.updateSource({ prototypeToken: foundry.utils.expandObject(proto) });
  }
}
