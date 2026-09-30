/**
 * NoReturn 2E – Foundry VTT System
 * Inoffizielle Umsetzung des Vario-D6-2.0-Regelwerks (NoReturn 2. Edition, Mannifest Games).
 */
import { NR } from "./module/config.mjs";
import { CharacterData, NpcData, VehicleData } from "./module/data/actor-models.mjs";
import * as ItemModels from "./module/data/item-models.mjs";
import { NRActor } from "./module/documents/actor.mjs";
import { NRItem } from "./module/documents/item.mjs";
import { NRActorSheet } from "./module/sheets/actor-sheet.mjs";
import { NRVehicleSheet } from "./module/sheets/vehicle-sheet.mjs";
import { NRItemSheet } from "./module/sheets/item-sheet.mjs";
import { NRCombatant, registerCombatHooks, attackWithWeapon, manualDamageDialog } from "./module/combat.mjs";
import { registerChatHooks } from "./module/chat.mjs";
import { rollPool, rollHitZone } from "./module/dice/pool.mjs";
import { castPsiApp, collectPower, rollPsiFail } from "./module/psi.mjs";

Hooks.once("init", () => {
  console.log("NoReturn 2E | Initialisiere System");

  CONFIG.NR = NR;
  game.noreturn = {
    config: NR, rollPool, rollHitZone, attackWithWeapon, manualDamageDialog, castPsiApp, collectPower, rollPsiFail,
    useItem: useItemMacro
  };

  // Dokumentklassen
  CONFIG.Actor.documentClass = NRActor;
  CONFIG.Item.documentClass = NRItem;
  CONFIG.Combatant.documentClass = NRCombatant;

  // Datenmodelle
  CONFIG.Actor.dataModels = { character: CharacterData, npc: NpcData, vehicle: VehicleData };
  CONFIG.Item.dataModels = {
    weapon: ItemModels.WeaponData,
    ammo: ItemModels.AmmoData,
    armor: ItemModels.ArmorData,
    gear: ItemModels.GearData,
    skill: ItemModels.SkillData,
    psiPower: ItemModels.PsiPowerData,
    psiApp: ItemModels.PsiAppData,
    styleSkill: ItemModels.StyleSkillData,
    species: ItemModels.SpeciesData,
    abnormality: ItemModels.AbnormalityData,
    bioTrait: ItemModels.BioTraitData,
    advantage: ItemModels.AdvantageData,
    trait: ItemModels.TraitData,
    augment: ItemModels.AugmentData
  };

  // Token-Leisten
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["health", "adrenalin"], value: ["movement", "pain"] },
    npc: { bar: ["health", "adrenalin"], value: ["movement", "pain"] },
    vehicle: { bar: ["hp"], value: ["speed", "armor"] }
  };

  // Initiative: Mexican Standoff mit Reaktion
  CONFIG.Combat.initiative = { formula: "1d6", decimals: 0 };

  // Bögen
  const DSC = foundry.applications.apps.DocumentSheetConfig;
  DSC.registerSheet(Actor, "noreturn", NRActorSheet, { types: ["character", "npc"], makeDefault: true, label: "NR.Sheet.Character" });
  DSC.registerSheet(Actor, "noreturn", NRVehicleSheet, { types: ["vehicle"], makeDefault: true, label: "NR.Sheet.Vehicle" });
  DSC.registerSheet(Item, "noreturn", NRItemSheet, { makeDefault: true, label: "NR.Sheet.Item" });

  registerHandlebarsHelpers();
  registerSettings();
  registerChatHooks();
  registerCombatHooks();

  return foundry.applications.handlebars.loadTemplates([
    "systems/noreturn/templates/actor/parts/item-row.hbs",
    "systems/noreturn/templates/actor/parts/zone.hbs",
    "systems/noreturn/templates/chat/roll-card.hbs"
  ]);
});

Hooks.once("ready", () => {
  document.body.classList.toggle("nr-hide-dice", !game.settings.get("noreturn", "showDice"));
  // Makros per Drag & Drop auf die Hotbar
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type !== "Item") return;
    createItemMacro(data, slot);
    return false;
  });
  console.log("NoReturn 2E | Bereit. Nicht umdrehen – es gibt kein Zurück.");
});

function registerSettings() {
  game.settings.register("noreturn", "autoRegeneration", {
    name: "NR.Settings.AutoRegen",
    hint: "NR.Settings.AutoRegenHint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register("noreturn", "showDice", {
    name: "NR.Settings.ShowDice",
    hint: "NR.Settings.ShowDiceHint",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: v => document.body.classList.toggle("nr-hide-dice", !v)
  });
}

function registerHandlebarsHelpers() {
  Handlebars.registerHelper("nrAdd", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("nrSigned", v => (Number(v) > 0 ? `+${v}` : `${v}`));
  Handlebars.registerHelper("nrTimes", (n, block) => {
    let out = "";
    for (let i = 0; i < n; i++) out += block.fn(i);
    return out;
  });
  Handlebars.registerHelper("nrZone", z => NR.zones[z]?.label ?? z);
  Handlebars.registerHelper("nrMoney", v => `${Number(v || 0).toLocaleString("de-DE")} N$`);
  Handlebars.registerHelper("nrTs", v => NR.techLevels[v] ?? "");
  Handlebars.registerHelper("nrIncludes", (arr, v) => Array.isArray(arr) && arr.includes(v));
  Handlebars.registerHelper("nrPct", (a, b) => (b ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0));
  Handlebars.registerHelper("nrLookup", (obj, key, prop) => {
    const v = obj?.[key];
    return typeof prop === "string" ? v?.[prop] : v;
  });
  Handlebars.registerHelper("nrJoin", (arr, sep) => (Array.isArray(arr) ? arr.join(typeof sep === "string" ? sep : ", ") : ""));
}

/* -------------------------------------------- */
/*  Hotbar-Makros                                */
/* -------------------------------------------- */

async function createItemMacro(data, slot) {
  const item = await fromUuid(data.uuid);
  if (!item?.parent) return ui.notifications.warn(game.i18n.localize("NR.Notify.MacroOwned"));
  const command = `game.noreturn.useItem(${JSON.stringify(item.name)});`;
  let macro = game.macros.find(m => m.name === item.name && m.command === command);
  if (!macro) {
    macro = await Macro.create({ name: item.name, type: "script", img: item.img, command, flags: { "noreturn.itemMacro": true } });
  }
  game.user.assignHotbarMacro(macro, slot);
}

function useItemMacro(name) {
  const speaker = ChatMessage.getSpeaker();
  const actor = (speaker.token ? game.actors.tokens[speaker.token] : null) ?? game.actors.get(speaker.actor) ?? game.user.character;
  const item = actor?.items.find(i => i.name === name);
  if (!item) return ui.notifications.warn(game.i18n.format("NR.Notify.ItemMissing", { name }));
  return item.use();
}
