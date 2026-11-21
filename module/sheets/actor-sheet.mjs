import { NR } from "../config.mjs";
import { manualDamageDialog } from "../combat.mjs";
import { collectPower, rollPsiFail } from "../psi.mjs";
import { rollHitZone } from "../dice/pool.mjs";
import { downloadMannifest, promptImport } from "../apps/mannifest.mjs";
import { openCharacterGenerator } from "../apps/character-generator.mjs";
import { timedEffects, endTimedEffect } from "../timed.mjs";
import { openCompendiumSync } from "../sync.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TE = () => foundry.applications.ux.TextEditor.implementation;

/**
 * Charakterbogen für Charaktere und NSC/Kreaturen.
 */
export class NRActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["noreturn", "sheet", "actor"],
    position: { width: 900, height: 820 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollAttribute: NRActorSheet.#onRollAttribute,
      mannifestExport: NRActorSheet.#onMannifestExport,
      mannifestImport: NRActorSheet.#onMannifestImport,
      openGenerator: NRActorSheet.#onOpenGenerator,
      syncCompendium: NRActorSheet.#onSyncCompendium,
      rollSkill: NRActorSheet.#onRollSkill,
      useItem: NRActorSheet.#onUseItem,
      editItem: NRActorSheet.#onEditItem,
      deleteItem: NRActorSheet.#onDeleteItem,
      createItem: NRActorSheet.#onCreateItem,
      toggleEquip: NRActorSheet.#onToggleEquip,
      toggleHeld: NRActorSheet.#onToggleHeld,
      toggleDescription: NRActorSheet.#onToggleDescription,
      adrenalin: NRActorSheet.#onAdrenalin,
      rest: NRActorSheet.#onRest,
      collectPower: NRActorSheet.#onCollectPower,
      psiFail: NRActorSheet.#onPsiFail,
      manualDamage: NRActorSheet.#onManualDamage,
      heal: NRActorSheet.#onHeal,
      regenerate: NRActorSheet.#onRegenerate,
      rollInfection: NRActorSheet.#onRollInfection,
      diseaseAdvance: NRActorSheet.#onDiseaseAdvance,
      diseaseCure: NRActorSheet.#onDiseaseCure,
      degeneration: NRActorSheet.#onDegeneration,
      advance: NRActorSheet.#onAdvance,
      reload: NRActorSheet.#onReload,
      resetDefenses: NRActorSheet.#onResetDefenses,
      hitZone: NRActorSheet.#onHitZone,
      itemQuantity: NRActorSheet.#onItemQuantity,
      itemValue: NRActorSheet.#onItemValue,
      overdrive: NRActorSheet.#onOverdrive,
      empHit: NRActorSheet.#onEmpHit,
      switchPersonality: NRActorSheet.#onSwitchPersonality,
      breakClinch: NRActorSheet.#onBreakClinch,
      endTimed: NRActorSheet.#onEndTimed
    }
  };

  static PARTS = {
    header: { template: "systems/noreturn/templates/actor/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    stats: { template: "systems/noreturn/templates/actor/tab-stats.hbs", scrollable: [""] },
    combat: { template: "systems/noreturn/templates/actor/tab-combat.hbs", scrollable: [""] },
    psi: { template: "systems/noreturn/templates/actor/tab-psi.hbs", scrollable: [""] },
    traits: { template: "systems/noreturn/templates/actor/tab-traits.hbs", scrollable: [""] },
    inventory: { template: "systems/noreturn/templates/actor/tab-inventory.hbs", scrollable: [""] },
    bio: { template: "systems/noreturn/templates/actor/tab-bio.hbs", scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "stats", icon: "fa-solid fa-dice-six" },
        { id: "combat", icon: "fa-solid fa-crosshairs" },
        { id: "psi", icon: "fa-solid fa-brain" },
        { id: "traits", icon: "fa-solid fa-dna" },
        { id: "inventory", icon: "fa-solid fa-suitcase" },
        { id: "bio", icon: "fa-solid fa-address-card" }
      ],
      initial: "stats",
      labelPrefix: "NR.Tab"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const sys = actor.system;
    const items = actor.items.contents.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const byType = type => items.filter(i => i.type === type);
    const rows = (type, filter = () => true) => byType(type).filter(filter).map(item => ({ item, stats: item.chatStats() }));

    // Fertigkeiten nach Attribut gruppieren
    const skillGroups = Object.entries(NR.attributes).map(([key, a]) => ({
      key, label: a.label, abbr: a.abbr, attr: sys.attr[key],
      skills: Object.values(sys.skillList).filter(s => s.attr === key).map(s => ({
        ...s, cost: actor.type === "character" ? actor.advancementCost("skill", sys.skills[s.key].value, { skillKey: s.key }) : null
      }))
    }));

    const customSkills = byType("skill").map(i => {
      const a = i.system.attribute ? sys.attr[i.system.attribute] : null;
      return { item: i, attrAbbr: a?.abbr ?? "–", pool: a ? a.total + i.system.value : i.system.value, category: NR.customSkillCategories[i.system.category],
        cost: actor.type === "character" ? actor.advancementCost("custom", i.system.value, { item: i }) : null };
    });

    const weapons = byType("weapon").map(i => ({
      item: i, skill: sys.skillList[i.system.skillKey], damage: i.system.damageLabel,
      category: NR.weaponCategories[i.system.category]?.label, modes: i.system.modes.join(", ")
    }));
    const armor = byType("armor").map(i => ({ item: i, mk: NR.materialCategories[i.system.mk], zones: i.system.zones.join(", ") }));
    const komfort = byType("armor").filter(i => i.system.equipped).reduce((a, i) => a + i.system.komfort, 0);

    // PSI
    const powers = byType("psiPower").map(p => ({
      item: p, label: NR.psiPowers[p.system.key]?.label, tier: p.system.tier,
      cost: actor.type === "character" ? actor.advancementCost("psi", p.system.value) : null,
      apps: items.filter(i => i.type === "psiApp" && i.system.power === p.system.key).map(a => ({
        item: a, diff: NR.psiDifficulties[a.system.difficulty]?.label, hold: sys.psiHold(a)
      }))
    }));
    const knownKeys = new Set(powers.map(p => p.item.system.key));
    const orphanApps = byType("psiApp").filter(a => !knownKeys.has(a.system.power)).map(a => ({ item: a, diff: NR.psiDifficulties[a.system.difficulty]?.label, power: NR.psiPowers[a.system.power]?.label }));
    const heldApps = byType("psiApp").filter(a => a.system.held);

    // Körperzonen-Layout (Sicht von vorne)
    const z = sys.zoneData;
    const body = {
      head: z["12"], armR: z["5"], torsoR: z["6"], torsoL: z["8"], armL: z["9"], belly: z["7"], pelvis: z["2"],
      thighR: z["4"], thighL: z["10"], legR: z["3"], legL: z["11"]
    };

    const enrich = async html => TE().enrichHTML(html ?? "", { relativeTo: actor, secrets: actor.isOwner });

    Object.assign(context, {
      actor, system: sys, source: actor.system._source ?? actor._source.system, config: NR,
      isCharacter: actor.type === "character", isNpc: actor.type === "npc",
      editable: this.isEditable, owner: actor.isOwner, gm: game.user.isGM,
      awakened: sys.awakened, upgradeOnly: sys.awakened ? { ge: true, st: true, ko: true, be: true, wa: true } : {},
      skillGroups, customSkills, weapons, armor, komfort, komfortMalus: Math.max(0, komfort - sys.attr.ko.total),
      body, zones: Object.values(z),
      powers, orphanApps, heldApps, psiAllowed: sys.speciesItem ? sys.speciesItem.system.psi : true,
      species: byType("species")[0] ?? null,
      abnormalities: rows("abnormality"), bioTraits: rows("bioTrait"),
      advantages: rows("advantage", i => i.system.kind === "vorteil"),
      disadvantages: rows("advantage", i => i.system.kind === "nachteil"),
      traitsJustice: rows("trait", i => i.system.kind === "justice"),
      traitsChaos: rows("trait", i => i.system.kind === "chaos"),
      hasSplit: actor.styleLevel("split") > 0, clinch: actor.getFlag("noreturn", "clinch") ?? null, styleSkills: rows("styleSkill"), augments: rows("augment"), diseases: rows("disease"),
      gear: rows("gear"), ammo: rows("ammo"), timedEffects: timedEffects(actor),
      adrenalinPips: Array.from({ length: sys.adrenalinMax }, (_, i) => ({ used: i >= sys.adrenalinLeft })),
      meditationPips: Array.from({ length: sys.meditationMax }, (_, i) => ({ used: i >= sys.meditationLeft })),
      enrichedBiography: await enrich(sys.biography),
      enrichedNotes: await enrich(sys.notes),
      enrichedWanted: await enrich(sys.wanted),
      fields: actor.system.schema.fields,
      powerLevels: Object.fromEntries(Object.entries(NR.powerLevels).map(([k, v]) => [k, `${v.label} (${v.gp} GP, 1 GP = ${v.money} N$)`])),
      butterflyOptions: Object.fromEntries(Object.entries(NR.butterflyEffects).map(([k, v]) => [k, v.label])),
      reputationOptions: NR.reputation,
      leidenOptions: { 0: "–", 1: "L1", 2: "L2", 3: "L3" },
      attrCosts: Object.fromEntries(Object.keys(NR.attributes).map(k => [k, actor.type === "character" ? actor.advancementCost("attribute", sys.attributes[k].value, { skillKey: k }) : null])),
      specialCosts: actor.type === "character" ? {
        adrenalin: actor.advancementCost("special", sys.special.adrenalin.value),
        schmerztoleranz: actor.advancementCost("special", sys.special.schmerztoleranz.value),
        meditation: actor.advancementCost("special", sys.special.meditation.value)
      } : {}
    });
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }

  /** @override – Tab-Navigation mit Icons */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (this.actor.type === "npc" && tabs.inventory) tabs.inventory.label = "NR.Tab.inventory";
    return tabs;
  }

  /* -------------------------------------------- */
  /*  Aktionen                                     */
  /* -------------------------------------------- */

  /** Kopfzeilen-Menü: Im-/Export im Format des Verlags-Charaktergenerators. */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    if (this.document.type !== "character") return controls;
    controls.push(
      { icon: "fa-solid fa-user-pen", label: "NR.Gen.Edit", action: "openGenerator", visible: () => this.document.isOwner },
      { icon: "fa-solid fa-arrows-rotate", label: "NR.Sync.Open", action: "syncCompendium", visible: () => this.document.isOwner },
      { icon: "fa-solid fa-file-export", label: "NR.Mannifest.Export", action: "mannifestExport" },
      { icon: "fa-solid fa-file-import", label: "NR.Mannifest.Import", action: "mannifestImport", visible: () => this.document.isOwner }
    );
    return controls;
  }

  static #onMannifestExport() {
    downloadMannifest(this.document);
  }

  /** Charaktergenerator mit den Werten dieses Actors öffnen (Umbau). */
  static async #onOpenGenerator() {
    await openCharacterGenerator(this.document);
  }

  /** Items dieses Actors mit dem Kompendium abgleichen (Vorschau). */
  static #onSyncCompendium() {
    return openCompendiumSync(this.document);
  }

  static async #onMannifestImport() {
    await promptImport(this.document);
  }

  static async #onRollAttribute(event, target) {
    return this.actor.rollAttribute(target.dataset.attr);
  }

  static async #onRollSkill(event, target) {
    return this.actor.rollSkill(target.dataset.skill);
  }

  _getItem(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return this.actor.items.get(id);
  }

  static async #onBreakClinch() {
    const { breakClinch } = await import("../style-actions.mjs");
    return breakClinch(this.actor);
  }

  static async #onSwitchPersonality() {
    const { useSplit } = await import("../style-actions.mjs");
    return useSplit(this.actor);
  }

  static async #onUseItem(event, target) {
    return this._getItem(target)?.use();
  }

  static async #onDiseaseAdvance(event, target) {
    const item = this._getItem(target);
    if (item) return game.noreturn.advanceDisease(this.actor, item, Number(target.dataset.days) || 1);
  }

  static async #onDiseaseCure(event, target) {
    const item = this._getItem(target);
    if (item) return game.noreturn.cure(this.actor, item);
  }

  static async #onEditItem(event, target) {
    return this._getItem(target)?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("NR.Sheet.DeleteTitle") },
      content: `<p>${game.i18n.format("NR.Sheet.DeleteConfirm", { name: item.name })}</p>`
    });
    if (ok) return item.delete();
  }

  static async #onCreateItem(event, target) {
    const type = target.dataset.type;
    const data = { name: game.i18n.format("NR.Sheet.NewItem", { type: game.i18n.localize(`TYPES.Item.${type}`) }), type, system: {} };
    if (target.dataset.kind) data.system.kind = target.dataset.kind;
    if (target.dataset.category) data.system.category = target.dataset.category;
    if (target.dataset.power) data.system.power = target.dataset.power;
    const [item] = await this.actor.createEmbeddedDocuments("Item", [data]);
    item?.sheet.render(true);
  }

  static async #onToggleEquip(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const path = item.type === "augment" ? "system.installed" : "system.equipped";
    return item.update({ [path]: !foundry.utils.getProperty(item, path) });
  }

  static async #onToggleHeld(event, target) {
    const item = this._getItem(target);
    return item?.update({ "system.held": !item.system.held });
  }

  static #onToggleDescription(event, target) {
    target.closest(".nr-item-row")?.classList.toggle("expanded");
  }

  static async #onAdrenalin(event, target) {
    const kind = target.dataset.kind ?? "adrenalin";
    const delta = Number(target.dataset.delta) || 0;
    const path = `system.special.${kind}.used`;
    const cur = foundry.utils.getProperty(this.actor, path);
    const max = kind === "adrenalin" ? this.actor.system.adrenalinMax : this.actor.system.meditationMax;
    return this.actor.update({ [path]: Math.max(0, Math.min(max, cur + delta)) });
  }

  static async #onRest() {
    return this.actor.rest();
  }

  static async #onCollectPower() {
    return collectPower(this.actor);
  }

  static async #onPsiFail() {
    const ks = Math.max(1, this.actor.system.combat.psiCollected || 1);
    return rollPsiFail(ks, { actor: this.actor });
  }

  static async #onManualDamage() {
    return manualDamageDialog(this.actor);
  }

  static async #onHeal() {
    const res = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("NR.Heal.Title"), icon: "fa-solid fa-kit-medical" },
      content: `<div class="form-group"><label>${game.i18n.localize("NR.Heal.Days")}</label><input type="number" name="days" value="1" min="1"></div>
        <div class="form-group"><label>${game.i18n.localize("NR.Heal.Medical")}</label><input type="checkbox" name="doubled"></div>
        <p class="nr-hint">${game.i18n.localize("NR.Heal.Hint")}</p>`,
      buttons: [{ action: "ok", label: game.i18n.localize("NR.Heal.Apply"), default: true, callback: (e, b) => ({ days: Number(b.form.elements.days.value) || 1, doubled: b.form.elements.doubled.checked }) },
        { action: "cancel", label: game.i18n.localize("Cancel") }]
    }).catch(() => null);
    if (!res || res === "cancel") return;
    return this.actor.healNatural(res);
  }

  static async #onEndTimed(event, target) {
    return endTimedEffect(this.actor, target.dataset.effectId);
  }

  static async #onRegenerate() {
    return this.actor.regenerate();
  }

  static async #onRollInfection() {
    return this.actor.rollInfection();
  }

  static async #onDegeneration(event, target) {
    return this.actor.rollDegeneration(target.dataset.table);
  }

  static async #onAdvance(event, target) {
    return this.actor.advance(target.dataset.type, target.dataset.key ?? this._getItem(target)?.id);
  }

  static async #onReload(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    return item.update({ "system.ammo.value": item.system.ammo.max });
  }

  static async #onResetDefenses() {
    return this.actor.update({ "system.combat.defenses": 0, "system.combat.psiCollected": 0 });
  }

  static async #onHitZone() {
    const { zone, roll } = await rollHitZone();
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }), rolls: roll ? [roll] : [],
      content: `<div class="nr-card"><h3>${game.i18n.localize("NR.Combat.HitZone")}</h3><p class="nr-big">${zone}: ${NR.zones[zone].label}${NR.zones[zone].lethal ? " ☠" : ""}</p></div>`
    });
  }

  static async #onItemQuantity(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const delta = Number(target.dataset.delta) || 0;
    return item.update({ "system.quantity": Math.max(0, item.system.quantity + delta) });
  }

  static async #onOverdrive() {
    return this.actor.overdrive();
  }

  static async #onEmpHit() {
    return this.actor.empHit();
  }

  static async #onItemValue(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const delta = Number(target.dataset.delta) || 0;
    const path = target.dataset.path ?? "system.value";
    return item.update({ [path]: Math.max(0, foundry.utils.getProperty(item, path) + delta) });
  }

  /* -------------------------------------------- */
  /*  Eingaben in eingebetteten Items             */
  /* -------------------------------------------- */

  /** @override */
  _onChangeForm(formConfig, event) {
    const input = event.target;
    if (input?.dataset?.itemField) {
      event.stopPropagation();
      const item = this._getItem(input);
      if (!item) return;
      let value = input.type === "checkbox" ? input.checked : input.value;
      if (input.type === "number") value = Number(value);
      item.update({ [input.dataset.itemField]: value });
      return;
    }
    return super._onChangeForm(formConfig, event);
  }

  /** @override – Item-Felder nicht in das Actor-Update aufnehmen. */
  _prepareSubmitData(event, form, formData, updateData) {
    for (const key of Object.keys(formData.object)) {
      if (key.startsWith("items.")) delete formData.object[key];
    }
    return super._prepareSubmitData(event, form, formData, updateData);
  }
}
