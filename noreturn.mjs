/**
 * NoReturn 2E – Foundry VTT System
 * Inoffizielle Umsetzung des Vario-D6-2.0-Regelwerks (NoReturn 2. Edition, Mannifest Games).
 */
import { NR, localizeConfig } from "./module/config.mjs";
import { CharacterData, NpcData, VehicleData } from "./module/data/actor-models.mjs";
import * as ItemModels from "./module/data/item-models.mjs";
import { NRActor } from "./module/documents/actor.mjs";
import { NRItem } from "./module/documents/item.mjs";
import { NRActorSheet } from "./module/sheets/actor-sheet.mjs";
import { NRVehicleSheet } from "./module/sheets/vehicle-sheet.mjs";
import { NRItemSheet } from "./module/sheets/item-sheet.mjs";
import { NRCombatant, registerCombatHooks, attackWithWeapon, manualDamageDialog } from "./module/combat.mjs";
import { registerChatHooks } from "./module/chat.mjs";
import { registerSocket } from "./module/socket.mjs";
import { registerStatusEffects, hazardDialog, applyHazard, setStatus } from "./module/status.mjs";
import { infect, advanceDisease, cure, infectDialog } from "./module/disease.mjs";
import { applyElapsed, elapsedDialog, registerElapsedHook } from "./module/elapsed.mjs";
import { rollPool, rollHitZone } from "./module/dice/pool.mjs";
import { castPsiApp, collectPower, rollPsiFail } from "./module/psi.mjs";
import { NRCharacterGenerator, openCharacterGenerator } from "./module/apps/character-generator.mjs";
import { registerNoticeSettings, showStartupNotice } from "./module/notice.mjs";
import { registerSyncSettings, checkSyncAfterUpdate, openCompendiumSync } from "./module/sync.mjs";
import { importMannifest, exportMannifest, promptImport } from "./module/apps/mannifest.mjs";

Hooks.once("init", () => {
  console.log("NoReturn 2E | Initialisiere System");

  CONFIG.NR = NR;
  game.noreturn = {
    config: NR, rollPool, rollHitZone, attackWithWeapon, manualDamageDialog, castPsiApp, collectPower, rollPsiFail,
    useItem: useItemMacro, characterGenerator: openCharacterGenerator, NRCharacterGenerator,
    mannifest: { import: importMannifest, export: exportMannifest, promptImport },
    hazard: hazardDialog, applyHazard, setStatus,
    infect, advanceDisease, cure, infectDialog, applyElapsed, elapsedDialog,
    syncCompendium: openCompendiumSync,
    showNotice: () => showStartupNotice({ force: true })
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
    augment: ItemModels.AugmentData,
    disease: ItemModels.DiseaseData,
    flora: ItemModels.FloraData
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
  DSC.registerSheet(foundry.documents.Actor, "noreturn", NRActorSheet, { types: ["character", "npc"], makeDefault: true, label: "NR.Sheet.Character" });
  DSC.registerSheet(foundry.documents.Actor, "noreturn", NRVehicleSheet, { types: ["vehicle"], makeDefault: true, label: "NR.Sheet.Vehicle" });
  DSC.registerSheet(foundry.documents.Item, "noreturn", NRItemSheet, { makeDefault: true, label: "NR.Sheet.Item" });

  registerStatusEffects();
  registerElapsedHook();
  registerHandlebarsHelpers();
  registerSettings();
  registerNoticeSettings();
  registerSyncSettings();
  registerChatHooks();
  registerCombatHooks();
});

/** Konfigurationstexte (Attribute, Fertigkeiten, Zonen …) in die gewählte Sprache übersetzen. */
Hooks.once("i18nInit", () => localizeConfig());

/** Alle Templates des Systems (Partials und Chat-/Dialog-Vorlagen) vorladen. */
const TEMPLATES = [
    "systems/noreturn/templates/actor/header.hbs",
    "systems/noreturn/templates/actor/parts/item-row.hbs",
    "systems/noreturn/templates/actor/parts/zone.hbs",
    "systems/noreturn/templates/actor/parts/regeneration.hbs",
    "systems/noreturn/templates/actor/tab-bio.hbs",
    "systems/noreturn/templates/actor/tab-combat.hbs",
    "systems/noreturn/templates/actor/tab-inventory.hbs",
    "systems/noreturn/templates/actor/tab-psi.hbs",
    "systems/noreturn/templates/actor/tab-stats.hbs",
    "systems/noreturn/templates/actor/tab-traits.hbs",
    "systems/noreturn/templates/actor/vehicle-sheet.hbs",
    "systems/noreturn/templates/apps/character-generator.hbs",
    "systems/noreturn/templates/apps/compendium-sync.hbs",
    "systems/noreturn/templates/chat/attack-extra.hbs",
    "systems/noreturn/templates/chat/damage-card.hbs",
    "systems/noreturn/templates/chat/damage-result.hbs",
    "systems/noreturn/templates/chat/defense-card.hbs",
    "systems/noreturn/templates/chat/item-card.hbs",
    "systems/noreturn/templates/chat/psi-card.hbs",
    "systems/noreturn/templates/chat/psi-fail.hbs",
    "systems/noreturn/templates/chat/roll-card.hbs",
    "systems/noreturn/templates/dialog/attack-dialog.hbs",
    "systems/noreturn/templates/dialog/damage-dialog.hbs",
    "systems/noreturn/templates/dialog/defense-dialog.hbs",
    "systems/noreturn/templates/dialog/psi-dialog.hbs",
    "systems/noreturn/templates/dialog/roll-dialog.hbs",
    "systems/noreturn/templates/item/description.hbs",
    "systems/noreturn/templates/item/details.hbs",
    "systems/noreturn/templates/item/header.hbs",
    "systems/noreturn/templates/item/modifiers.hbs"
];

/** Neue Szenen starten mit 1 m Rasterdistanz (früher system.json "grid"). */
Hooks.on("preCreateScene", (scene, data) => {
  const update = {};
  if (data.grid?.distance === undefined) update["grid.distance"] = 1;
  if (data.grid?.units === undefined) update["grid.units"] = "m";
  scene.updateSource(update);
});

/** Button „Charaktergenerator“ in der Actor-Seitenleiste. */
Hooks.on("renderActorDirectory", (app, html) => {
  const el = html instanceof HTMLElement ? html : html[0];
  if (!el || !game.user.can("ACTOR_CREATE") || el.querySelector(".nr-gen-open")) return;
  const target = el.querySelector(".header-actions") ?? el.querySelector(".directory-header");
  if (!target) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nr-gen-open";
  btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${game.i18n.localize("NR.Gen.Title")}`;
  btn.addEventListener("click", ev => { ev.preventDefault(); openCharacterGenerator(); });
  const imp = document.createElement("button");
  imp.type = "button";
  imp.className = "nr-mannifest-import";
  imp.innerHTML = `<i class="fa-solid fa-file-import"></i> ${game.i18n.localize("NR.Mannifest.ImportNew")}`;
  imp.addEventListener("click", ev => { ev.preventDefault(); promptImport(); });
  target.append(btn, imp);
  if (game.user.isGM) {
    const sync = document.createElement("button");
    sync.type = "button";
    sync.className = "nr-sync-open";
    sync.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> ${game.i18n.localize("NR.Sync.OpenWorld")}`;
    sync.addEventListener("click", ev => { ev.preventDefault(); openCompendiumSync(); });
    target.append(sync);
  }
});

Hooks.once("ready", async () => {
  registerSocket();
  await foundry.applications.handlebars.loadTemplates(TEMPLATES);
  document.body.classList.toggle("nr-hide-dice", !game.settings.get("noreturn", "showDice"));
  // Makros per Drag & Drop auf die Hotbar
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type !== "Item" || !data.uuid) return;
    // Nur Items an einem Actor (eingebettete UUID) werden zu Makros; andere Drops bleiben Foundry überlassen
    if (!foundry.utils.parseUuid(data.uuid).embedded?.length) return;
    createItemMacro(data, slot);
    return false;
  });
  showStartupNotice();
  checkSyncAfterUpdate().catch(err => console.error("NoReturn 2E | Kompendium-Abgleich", err));
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
  // Name als Fallback, Item-ID als bevorzugter Schlüssel (eindeutig bei doppelten Namen)
  const command = `game.noreturn.useItem(${JSON.stringify(item.name)}, ${JSON.stringify(item.id)});`;
  let macro = game.macros.find(m => m.command === command);
  if (!macro) {
    macro = await foundry.documents.Macro.create({ name: item.name, type: "script", img: item.img, command, flags: { "noreturn.itemMacro": true } });
  }
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Löst das Item des aktiven Akteurs auf und verwendet es.
 * Bevorzugt die Item-ID; fällt auf den Namen zurück (z. B. bei anderem Akteur oder alten Makros).
 * @param {string} name  Itemname (Fallback)
 * @param {string} [id]  Item-ID
 */
function useItemMacro(name, id) {
  const speaker = ChatMessage.getSpeaker();
  const actor = (speaker.token ? game.actors.tokens[speaker.token] : null) ?? game.actors.get(speaker.actor) ?? game.user.character;
  const item = (id ? actor?.items.get(id) : null) ?? actor?.items.find(i => i.name === name);
  if (!item) return ui.notifications.warn(game.i18n.format("NR.Notify.ItemMissing", { name }));
  return item.use();
}
