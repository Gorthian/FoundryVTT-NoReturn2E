import { NR } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Gemeinsamer Itembogen für alle NoReturn-Itemtypen.
 */
export class NRItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["noreturn", "sheet", "item"],
    position: { width: 580, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      addModifier: NRItemSheet.#onAddModifier,
      removeModifier: NRItemSheet.#onRemoveModifier,
      addLevel: NRItemSheet.#onAddLevel,
      removeLevel: NRItemSheet.#onRemoveLevel,
      toChat: NRItemSheet.#onToChat
    }
  };

  static PARTS = {
    header: { template: "systems/noreturn/templates/item/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: { template: "systems/noreturn/templates/item/details.hbs", scrollable: [""] },
    description: { template: "systems/noreturn/templates/item/description.hbs", scrollable: [""] },
    modifiers: { template: "systems/noreturn/templates/item/modifiers.hbs", scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "details", icon: "fa-solid fa-sliders" },
        { id: "description", icon: "fa-solid fa-book-open" },
        { id: "modifiers", icon: "fa-solid fa-plus-minus" }
      ],
      initial: "details",
      labelPrefix: "NR.Tab"
    }
  };

  /** Typen mit Modifikator-Reiter. */
  static MODIFIER_TYPES = ["armor", "gear", "styleSkill", "species", "abnormality", "bioTrait", "advantage", "augment"];

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (!NRItemSheet.MODIFIER_TYPES.includes(this.item.type)) delete parts.modifiers;
    return parts;
  }

  /** @override */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (!NRItemSheet.MODIFIER_TYPES.includes(this.item.type)) delete tabs.modifiers;
    return tabs;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    const s = item.system;
    const TE = foundry.applications.ux.TextEditor.implementation;
    const L = key => game.i18n.localize(`NR.Txt.Opt.${key}`);
    const opts = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === "string" ? v : v.label]));
    Object.assign(context, {
      item, system: s, source: item._source.system, config: NR, editable: this.isEditable,
      fields: s.schema.fields, isType: Object.fromEntries([[item.type, true]]),
      typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
      enrichedDescription: await TE.enrichHTML(s.description ?? "", { relativeTo: item, secrets: item.isOwner }),
      options: {
        attributes: opts(NR.attributes),
        attributesOptional: { "": L("NoAttribute"), ...opts(NR.attributes) },
        skills: { "": L("DefaultSkill"), ...opts(NR.skills) },
        weaponCategories: opts(NR.weaponCategories),
        damageTypes: NR.damageTypes,
        pierce: NR.armorPiercing,
        mk: NR.materialCategories,
        ranges: opts(NR.ranges),
        containers: NR.ammoContainers,
        ts: NR.techLevels,
        psiPowers: opts(NR.psiPowers),
        psiDifficulties: Object.fromEntries(Object.entries(NR.psiDifficulties).map(([k, v]) => [k, `${v.label} (${v.min}–${v.max})`])),
        customSkillCategories: NR.customSkillCategories,
        traitKinds: NR.traitKinds,
        advantageKinds: NR.advantageKinds,
        augmentKinds: NR.augmentKinds,
        bioTraitKinds: NR.bioTraitKinds,
        styleSkillKinds: NR.styleSkillKinds,
        zones: { "": "–", ...Object.fromEntries(Object.entries(NR.zones).map(([k, v]) => [k, `${k}: ${v.label}`])) },
        modifierTargets: { "": L("PickTarget"), ...NR.modifierTargets, ...Object.fromEntries(Object.entries(NR.zones).map(([k, v]) => [`armor.${k}`, game.i18n.format("NR.Txt.Opt.BodyArmor", { zone: v.label })])) },
        ammoTypes: { patrone: L("AmmoCartridge"), projektil: L("AmmoProjectile"), granate: L("AmmoGrenade"), rakete: L("AmmoRocket"), sprengstoff: L("AmmoExplosive"), liquid: L("AmmoLiquid") },
        toolQuality: NR.toolQuality
      },
      fireModes: Object.entries(NR.fireModes).map(([k, v]) => ({ key: k, label: v.label, checked: s.modes?.includes(k) })),
      armorZones: Object.entries(NR.zones).map(([k, v]) => ({ key: k, label: v.label, checked: s.zones?.includes(Number(k)) })),
      stats: item.chatStats()
    });
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }

  /** @override – Checkbox-Gruppen (Feuermodi, Zonen) zu Arrays umwandeln. */
  _prepareSubmitData(event, form, formData, updateData) {
    const data = formData.object;
    const modes = [];
    const zones = [];
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith("mode.")) { if (v) modes.push(k.slice(5)); delete data[k]; }
      if (k.startsWith("zone.")) { if (v) zones.push(Number(k.slice(5))); delete data[k]; }
    }
    if (this.item.type === "weapon") data["system.modes"] = modes;
    if (this.item.type === "armor") data["system.zones"] = zones;
    return super._prepareSubmitData(event, form, formData, updateData);
  }

  static async #onAddModifier() {
    const mods = [...(this.item.system.modifiers ?? []), { target: "", value: 1 }];
    return this.item.update({ "system.modifiers": mods });
  }

  static async #onRemoveModifier(event, target) {
    const idx = Number(target.dataset.index);
    const mods = this.item.system.modifiers.filter((m, i) => i !== idx);
    return this.item.update({ "system.modifiers": mods });
  }

  static async #onAddLevel() {
    const levels = [...(this.item.system.levels ?? []), { prerequisites: "", effect: "" }];
    return this.item.update({ "system.levels": levels });
  }

  static async #onRemoveLevel(event, target) {
    const idx = Number(target.dataset.index);
    return this.item.update({ "system.levels": this.item.system.levels.filter((m, i) => i !== idx) });
  }

  static async #onToChat() {
    return this.item.toChat();
  }
}
