/**
 * Prüft, ob die Compendium-Quellen (packs-src/*.json) zu den DataModels des Systems passen
 * (module/data/*.mjs): bekannte Felder, Typen, Wertebereiche (min/max/integer), erlaubte Werte
 * (choices). Fehlende Felder sind erlaubt (Foundry füllt Standardwerte), unbekannte Felder nicht.
 * Außerdem: eindeutige Schlüssel, `_key` passt zu `_id`, Pack-Typ passt zu system.json.
 *
 * Aufruf: npm run validate:packs   (Exit-Code 1 bei Fehlern)
 *
 * Läuft ohne Foundry: tools/foundry-shim.mjs stellt die wenigen benötigten `foundry.*`-Klassen bereit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installShim } from "./foundry-shim.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
installShim();
const ItemModels = await import("../module/data/item-models.mjs");
const { CharacterData, NpcData, VehicleData } = await import("../module/data/actor-models.mjs");

const itemModels = {
  weapon: ItemModels.WeaponData, ammo: ItemModels.AmmoData, armor: ItemModels.ArmorData,
  gear: ItemModels.GearData, skill: ItemModels.SkillData, psiPower: ItemModels.PsiPowerData,
  psiApp: ItemModels.PsiAppData, styleSkill: ItemModels.StyleSkillData, species: ItemModels.SpeciesData,
  abnormality: ItemModels.AbnormalityData, bioTrait: ItemModels.BioTraitData,
  advantage: ItemModels.AdvantageData, trait: ItemModels.TraitData, augment: ItemModels.AugmentData,
  disease: ItemModels.DiseaseData, flora: ItemModels.FloraData
};
const actorModels = { character: CharacterData, npc: NpcData, vehicle: VehicleData };
const sublevels = { Item: "items", Actor: "actors", JournalEntry: "journal", RollTable: "tables", Macro: "macros" };

// Typen aus noreturn.mjs gegenprüfen, damit die Tabelle oben nicht veraltet
const main = fs.readFileSync(path.join(root, "noreturn.mjs"), "utf8");
for (const type of [...main.matchAll(/^\s+(\w+): ItemModels\.\w+/gm)].map(m => m[1])) {
  if (!itemModels[type]) fail(`Item-Typ "${type}" ist in noreturn.mjs registriert, fehlt aber in tools/validate-packs.mjs`);
}

const errors = [];
function fail(msg) { errors.push(msg); }

const system = JSON.parse(fs.readFileSync(path.join(root, "system.json"), "utf8"));
for (const type of Object.keys(itemModels)) {
  if (!system.documentTypes?.Item?.[type]) fail(`Item-Typ "${type}" fehlt in system.json unter documentTypes.Item`);
}
const models = { Item: itemModels, Actor: actorModels };
let total = 0;

for (const pack of system.packs) {
  const file = path.join(root, "packs-src", `${pack.name}.json`);
  if (!fs.existsSync(file)) { fail(`${pack.name}: Quelle packs-src/${pack.name}.json fehlt`); continue; }
  const docs = JSON.parse(fs.readFileSync(file, "utf8"));
  const sublevel = sublevels[pack.type];
  if (!sublevel) { fail(`${pack.name}: unbekannter Pack-Typ ${pack.type}`); continue; }
  const keys = new Set();
  const add = (where, key) => { if (keys.has(key)) fail(`${where}: doppelter Schlüssel ${key}`); keys.add(key); };

  for (const doc of docs) {
    total++;
    const where = `${pack.name}/${doc.name ?? doc._id}`;
    if (doc._key !== `!${sublevel}!${doc._id}`) fail(`${where}: _key "${doc._key}" passt nicht zu _id "${doc._id}" (erwartet !${sublevel}!…)`);
    add(where, doc._key);
    for (const emb of doc._embedded ?? []) {
      total++;
      add(where, emb._key);
      if (!emb._key.startsWith(`!${sublevel}.`) || !emb._key.includes(`!${doc._id}.`)) fail(`${where}: eingebetteter _key "${emb._key}" gehört nicht zu diesem Dokument`);
    }
    const modelSet = models[pack.type];
    if (!modelSet) continue;
    const Model = modelSet[doc.type];
    if (!Model) { fail(`${where}: unbekannter Dokumenttyp "${doc.type}"`); continue; }
    for (const e of Model.validateSource(doc.system ?? {})) fail(`${where} (${doc.type}): ${e}`);
  }
}

if (errors.length) {
  console.error(`${errors.length} Fehler in den Compendium-Quellen:\n` + errors.slice(0, 200).map(e => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`OK: ${total} Dokumente in ${system.packs.length} Packs passen zu den DataModels.`);
