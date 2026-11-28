import { NR } from "../config.mjs";
import { rollPool, postPoolMessage, applyChatMode, buildFormula } from "../dice/pool.mjs";
import { poolDialog } from "../dice/roll-dialog.mjs";
import { addTimedEffect } from "../timed.mjs";
import { skillStyleEffects, styleDialogContent, LEG_ZONES } from "../styles.mjs";

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
  getMalus({ resist = false, psi = false, boosted = [] } = {}) {
    if (resist || this.type === "vehicle") return 0;
    const m = this.system.malus;
    const total = psi ? m.total - m.psiCollect : m.total;
    return Math.max(0, total - this.holdExempt(boosted));
  }

  /**
   * Haltungsmalus, der für die genannten Aktionen entfällt: gehaltene PSI-Apps, die genau diese Aktion boosten (S. 193).
   * @param {string[]} tags  Fertigkeitsschlüssel, „attr.<kürzel>“ oder „psi“
   */
  holdExempt(tags = []) {
    if (!tags.length) return 0;
    return this.items.filter(i => i.type === "psiApp" && i.system.held && i.system.boosts?.some(b => tags.includes(b)))
      .reduce((acc, i) => acc + this.system.psiHold(i), 0);
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
   * Verbrauche einen Einsatz des Zeitpools („Zeitloses Wissen“, S. 200). Bei leerem Pool endet die gehaltene App.
   * @returns {Promise<number>} Bonuswürfel dieses Einsatzes (0, wenn der Pool leer ist)
   */
  async spendZeitpool() {
    const left = this.system.combat.zeitpool;
    if (left <= 0) return 0;
    const bonus = this.system.zeitpoolBonus;
    if (left - 1 > 0) {
      await this.update({ "system.combat.zeitpool": left - 1 });
      return bonus;
    }
    // Pool erschöpft: Pool zurücksetzen und die gehaltene App beenden (der Hook in psi.mjs setzt den Pool ebenfalls zurück)
    await this.update({ "system.combat.zeitpool": 0, "system.combat.zeitpoolMax": 0 });
    const held = this.items.filter(i => i.type === "psiApp" && i.system.held && i.name.toLowerCase().startsWith("zeitloses wissen"));
    if (held.length) await this.updateEmbeddedDocuments("Item", held.map(i => ({ _id: i.id, "system.held": false })));
    ui.notifications.info(game.i18n.format("NR.Psi.ZeitpoolEmpty", { name: this.name }));
    return bonus;
  }

  /**
   * Stufe eines Style-Skills (0 = nicht vorhanden). Expertenfähigkeiten haben Stufe 1,
   * Kampfkünste ihre gewählte Stufe.
   * @param {string} key   Schlüssel aus NR.styleSkillKeys
   */
  styleLevel(key) {
    return this.system.styles?.[key] ?? 0;
  }

  /**
   * Split (S. 184): Wechselt die aktive Persönlichkeit. Je Persönlichkeit eigen sind Fertigkeiten, PSI-Kräfte/-Apps,
   * Charaktermerkmale und besondere Fertigkeiten (ohne Sprachen); Körper, Attribute, Inventar, Wunden, Adrenalin und
   * Style-Skills bleiben gemeinsam. Das aktuelle Profil wird im Flag `noreturn.split` gesichert, Zurückwechseln stellt es wieder her.
   * @param {number} target    Index der Ziel-Persönlichkeit (0 = Grundpersönlichkeit)
   * @param {string} [rename]  Neuer Name der Ziel-Persönlichkeit
   * @returns {Promise<number>} Index der aktiven Persönlichkeit
   */
  async switchPersonality(target, rename = "") {
    const count = 1 + this.items.filter(i => i.type === "styleSkill" && i.system.key === "split").length;
    if (target < 0 || target >= count) return this.getFlag("noreturn", "split")?.active ?? 0;
    const data = foundry.utils.deepClone(this.getFlag("noreturn", "split") ?? {});
    data.active ??= 0; data.sets ??= []; data.names ??= [];
    if (rename) data.names[target] = rename;
    if (target !== data.active) {
      const bound = i => ["psiPower", "psiApp", "trait"].includes(i.type) || (i.type === "skill" && i.system.category !== "sprache");
      data.sets[data.active] = { skills: foundry.utils.deepClone(this.system.toObject().skills), items: this.items.filter(bound).map(i => i.toObject()) };
      const next = data.sets[target] ?? { skills: Object.fromEntries(Object.keys(this.system.skills).map(k => [k, { value: 0 }])), items: [] };
      const old = this.items.filter(bound).map(i => i.id);
      if (old.length) await this.deleteEmbeddedDocuments("Item", old);
      await this.update({ "system.skills": next.skills });
      if (next.items.length) await this.createEmbeddedDocuments("Item", next.items.map(i => { const c = foundry.utils.deepClone(i); delete c._id; return c; }));
      data.active = target;
    }
    await this.setFlag("noreturn", "split", data);
    return data.active;
  }

  /** Maluswürfel auf körperliche Aktionen (GE, ST, KO, BE) aus Items, z. B. Metamorphose. */
  physicalMalus(attrKey) {
    return (["ge", "st", "ko", "be"].includes(attrKey) ? (this.system.mods?.["malus.physical"] ?? 0) : 0) + this.clinchMalus();
  }

  /** Ringen: Wer im Clinch gehalten wird, hat Kampfnachteil (−2W auf Proben, Angriff und Verteidigung). */
  clinchMalus() {
    const c = this.getFlag("noreturn", "clinch");
    return c && !c.holder ? 2 : 0;
  }

  /** Stelle Adrenalin, Meditation und Regenerationspool wieder her (Rast: 6 h Schlaf + Nahrung). */
  async rest() {
    await this.update({
      "system.special.adrenalin.used": 0,
      "system.special.meditation.used": 0,
      "system.regeneration.poolUsed": 0,
      "system.combat.defenses": 0,
      "system.combat.psiCollected": 0,
      "system.combat.zeitpool": 0,
      "system.combat.zeitpoolMax": 0
    });
    const timeless = this.items.filter(i => i.type === "psiApp" && i.system.held && i.name.toLowerCase().startsWith("zeitloses wissen"));
    if (timeless.length) await this.updateEmbeddedDocuments("Item", timeless.map(i => ({ _id: i.id, "system.held": false })));
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
    skillValue = null, untrained = false, flags = {}, extraHtml = "", skillKey = null, support = false } = {}) {

    const malus = this.getMalus({ resist, psi, boosted: [skillKey, attrKey && `attr.${attrKey}`].filter(Boolean) });
    const effects = skillStyleEffects(this, skillKey);
    let opts = { bonusDice: extraBonus, malusDice: 0, points: extraPoints, mw, pass: false, useAdrenalin: false, useMeditation: false, useZeitpool: false, disadvantages: 0, attr: attrKey, support, sideTask: false };
    if (!skipDialog) {
      opts = await poolDialog({
        title: label, actor: this, dice, woundMalus: malus, mw, allowPass, resist,
        attrKey, altAttr, skillValue, untrained, extraBonus, extraPoints, extraContent: styleDialogContent(effects), support
      });
      if (!opts) return null;
    }
    const styleFields = opts.styleFields ?? {};
    const styleNotes = [...effects.hints];
    // Fast Talk: +2W je vorbereitender Aktion (bis zu dreimal); Trusty Engineer: Crafting-MW −5 je Engineer
    if (styleFields.fastTalk) {
      opts.bonusDice += 2 * styleFields.fastTalk;
      styleNotes.push(game.i18n.format("NR.Style.Skill.fastTalkApplied", { n: 2 * styleFields.fastTalk }));
    }
    if (styleFields.trusty) {
      opts.mw = Math.max(0, opts.mw - 5 * styleFields.trusty);
      styleNotes.push(game.i18n.format("NR.Style.Skill.trustyApplied", { n: 5 * styleFields.trusty }));
    }

    // Parkour: Klettern/Springen unter MW 30 gelingen automatisch
    if (effects.autoBelow && opts.mw > 0 && opts.mw < effects.autoBelow) {
      const msgData = {
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="nr-card"><header class="nr-card-head"><h3>${label}</h3></header><p class="nr-result good">${game.i18n.format("NR.Style.Skill.parkourAuto", { mw: opts.mw })}</p></div>`
      };
      applyChatMode(msgData);
      await ChatMessage.create(msgData);
      return { total: opts.mw, success: true, auto: true, n: 0, excess: 0 };
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
    if (opts.useAdrenalin && await this.spendAdrenalin("adrenalin")) {
      bonus += this.system.adrenalinBonus;
      // Rage of Gods: Adrenalin auf Stärke(-Fertigkeiten) gibt zusätzlich +3W
      if (this.styleLevel("rageOfGods") && attrUsed === "st") {
        bonus += 3;
        styleNotes.push(game.i18n.localize("NR.Style.Skill.rageApplied"));
      }
    }
    if (opts.useMeditation && await this.spendAdrenalin("meditation")) bonus += Math.min(5, this.system.meditationMax);
    if (opts.useZeitpool) bonus += await this.spendZeitpool();

    // Robotik-Overdrive (S. 217): gespeicherte Bonuspunkte auf die nächste Stärke-Aktion
    let overdrive = 0;
    if (attrUsed === "st" && this.system.combat?.overdrive > 0) {
      overdrive = this.system.combat.overdrive;
      opts.points += overdrive;
      await this.update({ "system.combat.overdrive": 0 });
    }
    if (overdrive) extraHtml += `<p class="nr-warn"><i class="fa-solid fa-gears"></i> Overdrive +${overdrive} Stärke</p>`;
    const physMalus = resist ? 0 : this.physicalMalus(attrUsed);
    if (physMalus) styleNotes.push(game.i18n.format("NR.Style.PhysicalMalus", { n: physMalus }));
    // Temporäre Bonuswürfel (Der Doktor, Mixology, Sterne-Küche, Inspirieren) – nicht auf Schadenswiderstand
    if (!resist && (this.system.bonusDice ?? 0) > 0) {
      bonus += this.system.bonusDice;
      styleNotes.push(game.i18n.format("NR.Style.TempBonus", { n: this.system.bonusDice }));
    }
    for (const n of styleNotes) extraHtml += `<p class="nr-good"><i class="fa-solid fa-star"></i> ${n}</p>`;
    // Zusatztätigkeit neben konzentrationsintensiver Handlung bzw. Rennen + andere Aktion: −2W (S. 88)
    const sideMalus = opts.sideTask && !resist ? 2 : 0;
    if (sideMalus) extraHtml += `<p class="nr-warn"><i class="fa-solid fa-people-carry-box"></i> ${game.i18n.localize("NR.Roll.SideTaskNote")}</p>`;
    // Bei Attributwechsel im Dialog zählt für die Haltungsmalus-Befreiung das tatsächlich verwendete Attribut
    const rollMalus = attrUsed === attrKey ? malus : this.getMalus({ resist, psi, boosted: [skillKey, attrUsed && `attr.${attrUsed}`].filter(Boolean) });
    const malusTotal = (resist ? 0 : rollMalus) + opts.malusDice + opts.disadvantages * 2 + physMalus + sideMalus;
    const leiden = attrUsed ? (this.system.attr[attrUsed]?.leiden ?? 0) : 0;
    const sub = subtitle || (attrUsed ? `${this.system.attr[attrUsed].abbr} ${this.system.attr[attrUsed].total}` : "");

    // Unterstützende Aktion (S. 85): abgerundete Hälfte der Würfel; Ergebnis ≥ 10 wird addiert, darunter abgezogen
    if (opts.support && !resist) {
      const half = Math.max(1, Math.floor(Math.max(1, baseDice + bonus - malusTotal) / 2));
      if (untrained) extraHtml += `<p class="nr-bad"><i class="fa-solid fa-triangle-exclamation"></i> ${game.i18n.localize("NR.Roll.SupportUntrained")}</p>`;
      const res = await rollPool({
        actor: this, label: `${game.i18n.localize("NR.Roll.SupportCard")}: ${label}`, subtitle: sub, dice: half,
        points: opts.points, hazard, leiden, flags, extraHtml, chat: false
      });
      const value = res.total >= 10 ? res.total : -res.total;
      const key = value > 0 ? "NR.Roll.SupportPlus" : "NR.Roll.SupportMinus";
      res.options.extraHtml += `<p class="${value > 0 ? "nr-good" : "nr-bad"}"><i class="fa-solid fa-handshake-angle"></i> ${game.i18n.format(key, { n: Math.abs(value) })}</p>`;
      res.options.flags = foundry.utils.mergeObject(flags, { noreturn: { support: value } }, { inplace: false });
      res.supportValue = value;
      res.message = await postPoolMessage(res);
      return res;
    }
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
    return rollPool({ actor: this, label: "Reaktion (Initiative)", dice: s.pool, malusDice: this.getMalus({ boosted: ["reaktion", this.system.skillList.reaktion?.attr && `attr.${this.system.skillList.reaktion.attr}`].filter(Boolean) }), chat: false });
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
    // Kick-Boxen: Treffer ausschließlich an den Beinen → Bonuswürfel auf den Widerstand (resist.leg)
    const legBonus = zones.length && zones.every(z => LEG_ZONES.includes(String(z))) ? (this.system.mods?.["resist.leg"] ?? 0) : 0;
    bonusDice += legBonus;
    if (!skipDialog) {
      const choice = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("NR.Roll.Resist"), icon: "fa-solid fa-shield-heart" },
        classes: ["noreturn", "nr-roll-dialog"],
        content: `<p>${game.i18n.format("NR.Roll.ResistPrompt", { amount: effAmount, zone: zones.map(z => NR.zones[z].label).join(", "), armor: armor.points })}</p>
          ${armor.notes.length ? `<p class="nr-hint">${armor.notes.join("<br>")}</p>` : ""}
          ${legBonus ? `<p class="nr-hint"><i class="fa-solid fa-star"></i> ${game.i18n.format("NR.Style.LegResist", { n: legBonus })}</p>` : ""}
          <div class="form-group"><label>${game.i18n.localize("NR.Roll.BonusDice")}</label><input type="number" name="bonus" value="0"></div>
          ${this.system.adrenalinLeft > 0 ? `<div class="form-group"><label>${game.i18n.format("NR.Roll.UseAdrenalin", { n: this.system.adrenalinBonus, left: this.system.adrenalinLeft })}</label><input type="checkbox" name="adrenalin"></div>` : ""}`,
        buttons: [{
          action: "roll", label: game.i18n.localize("NR.Roll.Roll"), default: true,
          callback: (event, button) => ({ bonus: Number(button.form.elements.bonus.value) || 0, adrenalin: button.form.elements.adrenalin?.checked ?? false })
        }, { action: "cancel", label: game.i18n.localize("Cancel") }]
      }).catch(() => null);
      if (!choice || choice === "cancel") return null;
      bonusDice = legBonus + choice.bonus;
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
      dead: this.system.lethalDestroyed, continuous: !!attack.continuous, resistMalus
    });
    const msgData = { speaker: ChatMessage.getSpeaker({ actor: this }), content, rolls: [roll], sound: CONFIG.sounds.dice };
    applyChatMode(msgData);
    await ChatMessage.create(msgData);
    // Bewusstlosigkeit (S. 99): bei jedem Schaden, solange der Malus die Konstitution erreicht
    if (totalApplied > 0 && this.system.unconscious && !this.system.lethalDestroyed) await this.fallUnconscious();
    return { roll, results: after, totalApplied };
  }

  /**
   * Bewusstlos für 2W6 Minuten, mit Regeneration 2W6 Kampfrunden (S. 99). Eine laufende Bewusstlosigkeit wird neu ausgewürfelt.
   * Medizin (MW 15) weckt früher: den Effekt am Charakterbogen beenden.
   */
  async fallUnconscious() {
    const roll = await new Roll("2d6").evaluate();
    const rounds = !!this.system.hasRegeneration;
    const old = this.effects.filter(e => e.statuses.has("nrUnconscious")).map(e => e.id);
    if (old.length) await this.deleteEmbeddedDocuments("ActiveEffect", old);
    const name = game.i18n.localize("NR.Damage.UnconsciousName");
    await addTimedEffect(this, {
      name, img: "icons/svg/unconscious.svg", value: roll.total, unit: rounds ? "round" : "minute",
      statuses: ["nrUnconscious"], description: game.i18n.localize("NR.Damage.UnconsciousHint"), source: name
    });
    const unit = game.i18n.localize(rounds ? "NR.Damage.UnconsciousRounds" : "NR.Damage.UnconsciousMin");
    const msgData = {
      speaker: ChatMessage.getSpeaker({ actor: this }), rolls: [roll],
      content: `<div class="nr-card"><p class="nr-alert"><i class="fa-solid fa-bed-pulse"></i> ${game.i18n.format("NR.Damage.UnconsciousText", { name: foundry.utils.escapeHTML(this.name), n: roll.total, unit })}</p><p class="nr-hint">${game.i18n.localize("NR.Damage.UnconsciousHint")}</p></div>`
    };
    applyChatMode(msgData);
    return ChatMessage.create(msgData);
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
    // Sollbruchstelle: Angriff aufs Manöver – keine vitale Stelle, dafür Manöverwert −1 bei Schaden
    const vital = (through > 0 && !attack.sollbruch) ? (attack.aimVital || (await new Roll("1d6").evaluate()).total === 6) : false;
    const maneuverLoss = through > 0 && attack.sollbruch;
    if (maneuverLoss) await this.update({ "system.maneuver": this.system.maneuver - 1 });
    const content = `<div class="nr-card"><h3>${game.i18n.localize("NR.Chat.VehicleDamage")}</h3>
      <p>${game.i18n.format("NR.Chat.VehicleDamageText", { amount: effAmount, resist, armor, through })}</p>
      ${vital ? `<p class="nr-bad"><strong>${game.i18n.localize("NR.Chat.VitalHit")}</strong></p>` : ""}
      ${maneuverLoss ? `<p class="nr-bad"><strong>${game.i18n.localize("NR.Style.ManeuverLoss")}</strong></p>` : ""}
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
  async healNatural({ doubled = false, days = 1, silent = false } = {}) {
    if (this.system.awakened) return silent ? 0 : ui.notifications.warn(game.i18n.localize("NR.Awakened.NoHealing"));
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
    if (!silent) ui.notifications.info(game.i18n.format("NR.Notify.Healed", { name: this.name, heal }));
    return heal;
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
