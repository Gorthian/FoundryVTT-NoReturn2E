/**
 * Im-/Export im JSON-Format des Verlags-Charaktergenerators („mannifest-character“, Schema 12).
 *
 * Import: Die Datei wird in den Zustand des eigenen Charaktergenerators übersetzt und über
 * dessen createActor() angelegt – so gelten dieselben Regeln (N², Implantat, Meisterschaft,
 * Einziehbar, Designoptionen …). Robotik je Zone, Implantate und nicht zuordenbare
 * Katalog-IDs werden danach ergänzt. Die Originaldatei wird am Actor gespeichert
 * (flags.noreturn.mannifest), damit ein Export unbekannte Felder unverändert zurückgibt.
 */
import { NR } from "../config.mjs";
import { NRCharacterGenerator } from "./character-generator.mjs";

const { DialogV2 } = foundry.applications.api;
const FORMAT = "mannifest-character";

/* -------------------------------------------- */
/*  Namensabgleich                               */
/* -------------------------------------------- */

/** Vereinheitlicht Namen und IDs: Umlaute/ae/oe/ue, Satzzeichen, Groß-/Kleinschreibung. */
export function canon(s) {
  return String(s ?? "").toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
    .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

/** ID im Stil des Verlagsgenerators aus einem Namen. */
export function slug(s) {
  return String(s ?? "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Abweichende Bezeichnungen (Verlags-ID → eigener Name). */
const ALIASES = {
  amnesie_leicht: "Amnesie (Teil)",
  amnesie_schwer: "Amnesie (vollständig)",
  realitaetsbrechend: "Realitätsbrechende Selbstüberzeugung",
  alkoholanfaelligkeit: "Alkoholanfällig",
  schwaches_attribut: "Schwaches Attribut",
  cybersense_ai: "Cybersense All-Inclusive",
  cybersense_cut: "Cybersense Cut",
  cybersense_single: "Cybersense (einzelner Sinn)",
  hmo_g: "HMO (gHMO", ghmo: "HMO (gHMO", hmo_i: "HMO (iHMO", ihmo: "HMO (iHMO"
};
const DESIGNS = { locomotion: "Designoption: Fortbewegung", structure: "Designoption: Strukturupgrade", nanites: "Designoption: Nanitenprototyp",
  flight: "Designoption: Flugtauglich", fusion: "Designoption: Fusionsbatterie" };
const ATTRS = { geschick: "ge", staerke: "st", konstitution: "ko", beweglichkeit: "be", wahrnehmung: "wa", wissen: "wi", charisma: "ch", handwerk: "ha" };
const MODELS = { casual: "Casual", work: "Work", high_tech: "High Tech", hightech: "High Tech", android: "Android", military: "Military" };
const UPGRADE_ATTRS = { geschick: "ge", staerke: "st", konstitution: "ko", beweglichkeit: "be" };
const ZONE_EXTRAS = { abdichtung: "Abdichtung", luxus: "Luxus-Upgrade", isolierte_ki: "Isolierte KI", erwachte_isolierte_ki: "Isolierte KI" };

/** Sucht in einer Item-Liste: Alias → exakter Abgleich → Präfix-Abgleich. */
function findDoc(list, id, name = "") {
  if (!id && !name) return null;
  const alias = ALIASES[id];
  const keys = [alias, name, id].filter(Boolean).map(canon);
  for (const k of keys) {
    const exact = list.find(d => canon(d.name) === k);
    if (exact) return exact;
  }
  for (const k of keys) {
    if (k.length < 4) continue;
    const pre = list.find(d => canon(d.name).startsWith(k)) ?? list.find(d => k.startsWith(canon(d.name)));
    if (pre) return pre;
  }
  return null;
}

/** Fertigkeitsschlüssel des Verlags → eigener Schlüssel. */
function skillKey(id) {
  if (NR.skills[id]) return id;
  const c = canon(id);
  return Object.entries(NR.skills).find(([k, v]) => canon(k) === c || canon(v.label) === c)?.[0] ?? null;
}

/** Eigener Fertigkeitsschlüssel → Verlags-ID (snake_case ohne Umlaute). */
function skillId(key) {
  return slug(NR.skills[key]?.label ?? key);
}

/* -------------------------------------------- */
/*  Import                                       */
/* -------------------------------------------- */

/** Datei wählen und als neuen Actor importieren. */
export async function promptImport(targetActor = null) {
  const file = await new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
    input.click();
  });
  if (!file) return null;
  let json;
  try {
    json = JSON.parse(await file.text());
  } catch (err) {
    ui.notifications.error(game.i18n.localize("NR.Mannifest.InvalidJson"));
    return null;
  }
  if (targetActor) {
    const ok = await DialogV2.confirm({
      window: { title: game.i18n.localize("NR.Mannifest.Import") },
      content: `<p>${game.i18n.format("NR.Mannifest.ReplaceConfirm", { name: targetActor.name })}</p>`
    });
    if (!ok) return null;
  }
  return importMannifest(json, { targetActor });
}

/**
 * Importiert ein Mannifest-Objekt.
 * @param {object} json             Inhalt der Exportdatei
 * @param {object} [opts]
 * @param {Actor} [opts.targetActor] vorhandener Actor, dessen Daten ersetzt werden
 * @returns {Promise<Actor|null>}
 */
export async function importMannifest(json, { targetActor = null } = {}) {
  if (json?.format !== FORMAT || !json.character) {
    ui.notifications.error(game.i18n.localize("NR.Mannifest.WrongFormat"));
    return null;
  }
  const ch = json.character;
  const gen = new NRCharacterGenerator();
  await gen._loadData();
  const d = gen.data;
  const s = gen.gen;
  const report = [];
  const miss = (what, id) => report.push(`${what}: ${id}`);

  // Grunddaten
  s.name = ch.name || "Import";
  s.concept = ch.konzept ?? "";
  s.gender = ch.geschlecht ?? "";
  s.age = ch.alter ?? "";
  s.powerLevel = NR.powerLevels[ch.powerlevel] ? ch.powerlevel : "standard";
  s.biography = [ch.chronik, ch.aussehen && `Aussehen: ${ch.aussehen}`, ch.groesse && `Größe: ${ch.groesse}`, ch.gewicht && `Gewicht: ${ch.gewicht}`, ch.notizen]
    .filter(Boolean).join("\n\n");

  // Spezies
  const sp = findDoc(d.species, ch.species);
  if (sp) s.speciesId = sp.uuid; else miss("Spezies", ch.species);
  const awakened = !!sp?.system.awakened;

  // Attribute (Erwachte: Körperattribute fest, Steigerung über Robotik)
  for (const [id, k] of Object.entries(ATTRS)) {
    const v = Number(ch.attributes?.[id]) || 1;
    s.attributes[k] = v;
  }
  if (awakened) Object.assign(s.attributes, NR.awakened.physical, { wa: NR.awakened.perception });
  s.mutantAttrs = (ch.mutantAttrBonuses ?? []).map(a => ATTRS[a] ?? a).filter(k => NR.attributes[k]);

  // Fertigkeiten & Sprachen
  for (const [id, v] of Object.entries(ch.skills ?? {})) {
    const k = skillKey(id);
    if (k) s.skills[k] = Number(v) || 0; else miss("Fertigkeit", id);
  }
  s.nativeName = ch.motherTongue || "Babel";
  s.languages = Object.entries(ch.languages ?? {}).filter(([n]) => n !== s.nativeName).map(([name, value]) => ({ name, value: Number(value) || 1 }));
  s.n2Skills = (ch.n2SkillTargets ?? []).map(skillKey).filter(Boolean);
  s.implantSkills = (ch.mysteriousImplantSkillTargets ?? []).map(skillKey).filter(Boolean);

  // Abnormitäten
  for (const id of ch.bioAbnormitaeten ?? []) {
    const a = findDoc(d.abnormalities, id);
    if (a) s.abnormalities.push(a.uuid); else miss("Abnormität", id);
  }

  // Biologische Eigenschaften / Robotische Adaption / Auffälligkeiten
  for (const t of [...(ch.bioProperties ?? []), ...(ch.roboticAdaptations ?? []), ...(ch.auffaelligkeiten ?? [])]) {
    const entry = typeof t === "string" ? { catalogId: t } : t;
    const doc = findDoc(d.bioTraits, entry.catalogId ?? entry.id, entry.name);
    if (!doc) { miss("Biologische Eigenschaft", entry.name ?? entry.catalogId); continue; }
    s.bioTraits[doc.uuid] = Number(entry.level ?? entry.details?.level) || 1;
    if (entry.details?.retractable) s.retractable.push(doc.uuid);
  }

  // Designoptionen (Erwachte)
  const augs = d.shop.augmentierung ?? [];
  for (const id of ch.awakenedOptions ?? []) {
    const doc = augs.find(a => a.name.startsWith(DESIGNS[id] ?? "§")) ?? findDoc(augs.filter(a => a.system.kind === "design"), id);
    if (doc) s.designs.push(doc.uuid); else miss("Designoption", id);
  }

  // Style-Skills & Kampfkünste
  for (const id of ch.styleSkills ?? []) {
    const doc = findDoc(d.styleSkills, id);
    if (doc) s.styleSkills[doc.uuid] = 1; else miss("Style-Skill", id);
  }
  for (const [id, lvl] of Object.entries(ch.kampfkuenste ?? {})) {
    const doc = findDoc(d.styleSkills, id);
    if (doc) s.styleSkills[doc.uuid] = Number(lvl) || 1; else miss("Kampfkunst", id);
  }
  const med = ch.specialValuePurchases?.meditation;
  if (med) s.meditation = Math.min(5, 1 + (Number(med) || 0));

  // PSI & HMO
  for (const [id, lvl] of Object.entries(ch.psiKraefte ?? {})) {
    const key = NR.psiPowers[id] ? id : Object.keys(NR.psiPowers).find(k => canon(k) === canon(id));
    if (key) s.psi[key] = Number(lvl) || 0; else miss("PSI-Kraft", id);
  }
  for (const [power, apps] of Object.entries(ch.psiApps ?? {})) {
    const list = Array.isArray(apps) ? apps : Object.keys(apps ?? {});
    for (const id of list) {
      const app = findDoc(d.apps.filter(a => !power || canon(a.system.power) === canon(power)), id) ?? findDoc(d.apps, id);
      if (app) s.psiApps.push(app.uuid); else miss("PSI-App", id);
    }
  }
  for (const id of [...(ch.hmoKraefte ?? []), ch.freeHmoKraft].filter(Boolean)) {
    const doc = findDoc(d.hmo ?? [], id);
    if (doc && !s.hmoPowers.includes(doc.uuid)) s.hmoPowers.push(doc.uuid); else if (!doc) miss("HMO-Kraft", id);
  }

  // Vor- & Nachteile
  for (const a of [...(ch.advantages ?? []), ...(ch.disadvantages ?? [])]) {
    const doc = findDoc(d.advantages, a.id);
    if (!doc) { miss("Vor-/Nachteil", a.id); continue; }
    if (!s.advantages.includes(doc.uuid)) s.advantages.push(doc.uuid);
    const markers = a.gives ?? a.costs ?? a.markers;
    if (markers && markers !== doc.system.markers) s.advMarkers[doc.uuid] = Number(markers);
    if (a.skill && doc.name.startsWith("Meisterschaft")) { const k = skillKey(a.skill); if (k) s.masterySkills.push(k); }
    if (a.attribute && doc.name.startsWith("Schwaches Attribut")) { const k = ATTRS[a.attribute] ?? a.attribute; if (NR.attributes[k]) s.weakAttrs.push(k); }
  }

  // Charaktermerkmale & Butterfly
  for (const n of ch.charaktermerkmale ?? []) {
    const doc = findDoc(d.traits, n, n);
    if (doc) s.traits.push(doc.uuid); else miss("Charaktermerkmal", n);
  }
  const bf = ch.butterflyEffect;
  if (bf) {
    const key = typeof bf === "string" ? bf : bf.choice ?? bf.id;
    if (NR.butterflyEffects[key]) s.butterfly.choice = key;
  }

  // Geld & Ganzkörper-Pakete (Erwachte, in allen Zonen gleiche Upgrades)
  s.moneyGp = Number(ch.resourceGp) || 0;
  const zones = Object.entries(ch.robotik ?? {}).map(([z, v]) => [z.replace("zone_", ""), v]).filter(([z]) => NR.zones[z]);
  const zoneRest = {};
  if (awakened && zones.length) {
    const packs = { ge: "Ganzkörper: Geschick", st: "Ganzkörper: Stärke", ko: "Ganzkörper: Konstitution", be: "Ganzkörper: Beweglichkeit", panzerung: "Ganzkörper: Panzerungs" };
    const all = Object.keys(NR.zones).map(z => ch.robotik[`zone_${z}`]?.upgrades ?? {});
    for (const [id, short] of [...Object.entries(UPGRADE_ATTRS), ["panzerung", "panzerung"]]) {
      const min = Math.min(...all.map(u => Number(u[id]) || 0));
      if (min > 0) {
        const doc = augs.find(a => a.name.startsWith(packs[short]));
        if (doc) s.cart[doc.uuid] = min;
      }
      for (const [z, v] of zones) {
        const rest = (Number(v.upgrades?.[id]) || 0) - Math.max(0, min);
        if (rest > 0) (zoneRest[z] ??= {})[id] = rest;
      }
    }
  }

  // Generator rechnen lassen und Actor anlegen
  const c = gen._compute();
  const actor = await gen.createActor(c);
  if (!actor) return null;
  // Körpereigene Waffen werden asynchron ergänzt (bioTrait.grants) – kurz darauf warten
  const granted = actor.items.filter(i => i.type === "bioTrait").flatMap(i => i.system.grants ?? []);
  for (let t = 0; t < 20 && granted.some(n => !actor.items.some(i => i.name === n)); t++) await new Promise(r => setTimeout(r, 100));

  // Ergänzungen: Robotik je Zone, Implantate, Katalog-IDs
  const extra = [];
  const augDoc = name => augs.find(a => a.name.startsWith(name));
  const addAug = (doc, patch) => { if (!doc) return; const o = doc.toObject(); delete o._id; foundry.utils.mergeObject(o, patch); extra.push(o); };
  const upgradeDoc = { ge: "Robotik-Upgrade: Geschick", st: "Robotik-Upgrade: Stärke", ko: "Robotik-Upgrade: Konstitution", be: "Robotik-Upgrade: Beweglichkeit" };
  for (const [z, v] of zones) {
    const model = MODELS[v.modell] ?? MODELS[slug(v.modell)];
    if (!awakened) {
      if (model) addAug(augDoc(`Robotik-Körperzone: ${model}`), { system: { zone: z, installed: true } });
      else if (v.modell) miss("Robotikmodell", v.modell);
    }
    const ups = awakened ? (zoneRest[z] ?? {}) : (v.upgrades ?? {});
    for (const [id, k] of Object.entries(UPGRADE_ATTRS)) {
      const n = Number(ups[id]) || 0;
      if (n > 0) addAug(augDoc(upgradeDoc[k]), { system: { zone: z, quantity: n, installed: true } });
    }
    const arm = Number(ups.panzerung) || 0;
    if (arm > 0) addAug(augDoc("Robotik-Upgrade: Panzerung"), { system: { zone: z, quantity: arm, installed: true } });
    for (const [id, name] of Object.entries(ZONE_EXTRAS)) {
      const n = Number(v.upgrades?.[id]) || 0;
      if (n > 0) addAug(augDoc(name), { system: { zone: z, installed: true }, flags: { noreturn: { mannifestId: id } } });
    }
  }
  for (const imp of ch.implantate ?? []) {
    const doc = findDoc(augs, imp.id);
    if (doc) addAug(doc, { system: { zone: String(imp.zoneId ?? "").replace("zone_", ""), installed: true }, flags: { noreturn: { mannifestId: imp.id } } });
    else miss("Implantat", imp.id);
  }
  // Ausrüstung: Katalog-IDs des Verlags (z. B. „PK-001“) lassen sich nicht zuordnen → Platzhalter
  const shopAll = Object.values(d.shop).flat();
  for (const e of ch.equipment ?? []) {
    const doc = findDoc(shopAll, e.id, e.name);
    if (doc) {
      const o = doc.toObject(); delete o._id;
      o.system.quantity = Number(e.qty) || 1;
      foundry.utils.setProperty(o, "flags.noreturn.mannifestId", e.id);
      extra.push(o);
    } else {
      extra.push({ name: e.name ?? `Katalogeintrag ${e.id}`, type: "gear", img: "icons/svg/item-bag.svg",
        system: { quantity: Number(e.qty) || 1, description: `<p>${game.i18n.format("NR.Mannifest.Placeholder", { id: e.id })}</p>` },
        flags: { noreturn: { mannifestId: e.id } } });
      miss("Ausrüstung (Katalog-ID)", e.id);
    }
  }
  if (extra.length) await actor.createEmbeddedDocuments("Item", extra);
  await actor.update({
    "system.money": Math.max(0, Number(ch.resources) ? Number(ch.resources) - c.cartCost : actor.system.money),
    "flags.noreturn.mannifest": json
  });

  // In vorhandenen Actor übertragen
  let result = actor;
  if (targetActor) {
    const data = actor.toObject();
    await targetActor.deleteEmbeddedDocuments("Item", targetActor.items.map(i => i.id));
    await targetActor.update({ name: data.name, system: data.system }, { recursive: false, diff: false });
    await targetActor.setFlag("noreturn", "mannifest", json);
    await targetActor.createEmbeddedDocuments("Item", data.items.map(i => { delete i._id; return i; }), { nrSkipGrants: true });
    await actor.delete();
    result = targetActor;
  }

  const msg = report.length
    ? `<p>${game.i18n.format("NR.Mannifest.ImportedWithGaps", { name: result.name, n: report.length })}</p><ul>${report.map(r => `<li>${r}</li>`).join("")}</ul>`
    : `<p>${game.i18n.format("NR.Mannifest.Imported", { name: result.name })}</p>`;
  await ChatMessage.create({ whisper: [game.user.id], speaker: { alias: "Mannifest-Import" }, content: `<div class="nr-card">${msg}</div>` });
  ui.notifications.info(game.i18n.format("NR.Mannifest.Imported", { name: result.name }));
  result.sheet.render(true);
  return result;
}

/* -------------------------------------------- */
/*  Export                                       */
/* -------------------------------------------- */

/** Baut das Mannifest-Objekt aus einem Actor. */
export function exportMannifest(actor) {
  const sys = actor.system;
  const prev = foundry.utils.deepClone(actor.getFlag("noreturn", "mannifest") ?? {});
  const base = prev.character ?? {};
  const items = type => actor.items.filter(i => i.type === type);
  const idOf = (item, fallback) => item.getFlag("noreturn", "mannifestId") ?? fallback ?? slug(item.name);
  const prevIds = (list, key = v => v) => Object.fromEntries((list ?? []).map(v => [canon(ALIASES[key(v)] ?? key(v)), key(v)]));
  const reuse = (map, item) => {
    const c = canon(item.name);
    const hit = Object.entries(map).find(([k]) => c.startsWith(k) || k.startsWith(c));
    return hit?.[1];
  };
  const awakened = !!sys.awakened;
  const species = items("species")[0];

  // Attribute
  const attributes = {};
  for (const [id, k] of Object.entries(ATTRS)) {
    let v = sys.attributes[k].value;
    if (awakened && ["ge", "st", "ko", "be", "wa"].includes(k)) v = base.attributes?.[id] ?? 1;
    attributes[id] = v;
  }
  // Fertigkeiten (Basiswerte)
  const skills = {};
  const prevSkill = Object.fromEntries(Object.keys(base.skills ?? {}).map(id => [skillKey(id), id]));
  for (const [k, v] of Object.entries(sys.skills)) if (v.value > 0) skills[prevSkill[k] ?? (NR.skills[k] ? k : skillId(k))] = v.value;
  const languages = {};
  for (const l of items("skill").filter(i => i.system.category === "sprache")) languages[l.name.replace(/\s*\(Muttersprache\)$/, "")] = l.system.value;
  const motherTongue = items("skill").find(i => i.system.native)?.name.replace(/\s*\(Muttersprache\)$/, "") ?? base.motherTongue ?? "Babel";
  const skillTargets = item => (item?.system.modifiers ?? []).filter(m => m.target?.startsWith("skills.")).map(m => prevSkill[m.target.slice(7)] ?? m.target.slice(7));

  // Abnormitäten, Eigenschaften
  const abn = items("abnormality");
  const prevAbn = prevIds(base.bioAbnormitaeten);
  const bio = items("bioTrait").map(t => {
    const retract = /\(einziehbar\)/i.test(t.name);
    const prevEntry = [...(base.roboticAdaptations ?? []), ...(base.bioProperties ?? [])].find(p => canon(t.name).startsWith(canon(p.name)));
    return {
      // „Einziehbar“ speichert der Verlag als Option: Grundkosten, ursprünglich sichtbar
      name: t.name.replace(/\s*\(einziehbar\)/i, ""), cost: retract ? t.system.gp - 5 : t.system.gp, hidden: retract ? false : t.system.kind === "verborgen",
      uid: prevEntry?.uid ?? foundry.utils.randomID(), catalogId: prevEntry?.catalogId ?? slug(t.name.replace(/\s*\(einziehbar\)/i, "")),
      ...(t.system.perLevel ? { level: t.system.level } : {}),
      ...(retract || prevEntry?.details ? { details: { ...(prevEntry?.details ?? {}), retractable: retract } } : {})
    };
  });
  const conspicuities = bio.filter((b, i) => items("bioTrait")[i].system.kind === "auffaelligkeit");
  const traitsOnly = bio.filter((b, i) => items("bioTrait")[i].system.kind !== "auffaelligkeit");

  // Augmentierung
  const augs = items("augment");
  const designsRev = Object.fromEntries(Object.entries(DESIGNS).map(([k, v]) => [v, k]));
  const awakenedOptions = augs.filter(a => a.system.kind === "design").map(a => Object.entries(designsRev).find(([n]) => a.name.startsWith(n))?.[1] ?? slug(a.name));

  // Robotik je Zone
  const robotik = {};
  const fullBody = { geschick: 0, staerke: 0, konstitution: 0, beweglichkeit: 0, panzerung: 0 };
  const fbMap = { "Ganzkörper: Geschick": "geschick", "Ganzkörper: Stärke": "staerke", "Ganzkörper: Konstitution": "konstitution", "Ganzkörper: Beweglichkeit": "beweglichkeit", "Ganzkörper: Panzerung": "panzerung" };
  for (const a of augs.filter(a => a.system.fullBody)) {
    const id = Object.entries(fbMap).find(([n]) => a.name.startsWith(n))?.[1];
    if (id) fullBody[id] += Math.max(1, a.system.quantity || 1);
  }
  const zoneUp = { "Robotik-Upgrade: Geschick": "geschick", "Robotik-Upgrade: Stärke": "staerke", "Robotik-Upgrade: Konstitution": "konstitution", "Robotik-Upgrade: Beweglichkeit": "beweglichkeit", "Robotik-Upgrade: Panzerung": "panzerung" };
  const extrasRev = { "Abdichtung": "abdichtung", "Luxus-Upgrade": "luxus", "Isolierte KI": "isolierte_ki" };
  for (const z of Object.keys(NR.zones)) {
    const model = augs.find(a => a.system.kind === "robotik" && a.system.zone === z);
    if (!model && !awakened) continue;
    const up = { geschick: 0, staerke: 0, konstitution: 0, beweglichkeit: 0, panzerung: 0, abdichtung: 0, luxus: 0, isolierte_ki: 0, erwachte_isolierte_ki: 0 };
    if (awakened) for (const [k, v] of Object.entries(fullBody)) up[k] += v;
    for (const a of augs.filter(a => a.system.zone === z && !a.system.fullBody)) {
      const q = Math.max(1, a.system.quantity || 1);
      const id = Object.entries(zoneUp).find(([n]) => a.name.startsWith(n))?.[1];
      if (id) up[id] += q;
      const ex = a.getFlag("noreturn", "mannifestId") ?? extrasRev[a.name];
      if (ex && ex in up) up[ex] += 1;
    }
    const modelId = awakened ? "erwachter" : (Object.entries(MODELS).find(([, n]) => model?.name.endsWith(n))?.[0] ?? slug(model?.system.model || model?.name));
    robotik[`zone_${z}`] = { modell: modelId, upgrades: up };
  }
  const implantate = augs.filter(a => a.system.kind === "implantat" && !a.system.fullBody).map(a => {
    const prevImp = (base.implantate ?? []).find(i => i.id === a.getFlag("noreturn", "mannifestId"));
    return { uid: prevImp?.uid ?? `implant-${foundry.utils.randomID()}`, id: idOf(a), zoneId: a.system.zone ? `zone_${a.system.zone}` : null, weaponId: prevImp?.weaponId ?? null, skillId: prevImp?.skillId ?? null };
  });

  // Style-Skills, Kampfkünste, Meditation
  const style = items("styleSkill");
  const prevStyle = prevIds(base.styleSkills);
  const prevArts = prevIds(Object.keys(base.kampfkuenste ?? {}));
  const kampfkuenste = {};
  for (const st of style.filter(x => x.system.kind === "kampfkunst")) kampfkuenste[reuse(prevArts, st) ?? slug(st.name)] = st.system.level;
  const specialValuePurchases = { ...(base.specialValuePurchases ?? {}) };
  if (sys.special.meditation?.value > 0) specialValuePurchases.meditation = sys.special.meditation.value;

  // PSI
  const psiKraefte = {};
  const psiApps = {};
  const hmoKraefte = [];
  for (const p of items("psiPower")) {
    if (p.system.key === "kategorieB") hmoKraefte.push(idOf(p, slug(p.name)));
    else psiKraefte[p.system.key] = p.system.value;
  }
  for (const a of items("psiApp")) (psiApps[a.system.power] ??= []).push(idOf(a));

  // Vor- & Nachteile
  const prevAdv = [...(base.advantages ?? []), ...(base.disadvantages ?? [])];
  const advEntry = item => {
    const old = prevAdv.find(p => canon(item.name).startsWith(canon(ALIASES[p.id] ?? p.id)));
    const e = { id: old?.id ?? slug(item.name), uid: old?.uid ?? foundry.utils.randomID() };
    const mastery = (item.system.modifiers ?? []).find(m => m.target?.startsWith("skills."));
    if (item.name.startsWith("Meisterschaft")) {
      e.id = old?.id ?? "meisterschaft";
      if (mastery) e.skill = prevSkill[mastery.target.slice(7)] ?? mastery.target.slice(7);
    }
    if (item.name.startsWith("Schwaches Attribut")) {
      const k = Object.entries(NR.attributes).find(([, v]) => item.name.endsWith(v.label))?.[0];
      const id = Object.entries(ATTRS).find(([, v]) => v === k)?.[0];
      if (id) { e.id = old?.id ?? "schwaches_attribut"; e.attribute = id; }
    }
    // Marker nur bei variablen Einträgen (im Original vorhanden oder neu angelegt)
    if (item.system.kind === "nachteil" && item.system.markers && (!old || "gives" in old)) e.gives = item.system.markers;
    if (item.system.kind === "vorteil" && old && "costs" in old) e.costs = item.system.markers;
    return e;
  };
  // Reihenfolge des Originals beibehalten
  const order = e => { const i = prevAdv.findIndex(p => p.uid === e.uid); return i < 0 ? 1e6 : i; };
  const byOrder = (a, b) => order(a) - order(b);
  const advItems = items("advantage");

  // Ausrüstung
  const equipment = [];
  for (const i of actor.items.filter(i => ["weapon", "armor", "gear", "ammo"].includes(i.type))) {
    if (i.type === "weapon" && i.system.category === "unbewaffnet" && !i.getFlag("noreturn", "mannifestId")) continue;
    if (["SmartCom", "Set schäbige Kleidung"].includes(i.name)) continue;
    const id = i.getFlag("noreturn", "mannifestId");
    equipment.push(id ? { id, qty: i.system.quantity || 1 } : { id: slug(i.name), name: i.name, qty: i.system.quantity || 1 });
  }

  const character = {
    ...base,
    mode: base.mode ?? "noreturn",
    name: actor.name,
    powerlevel: sys.progress?.powerLevel ?? base.powerlevel ?? "standard",
    konzept: sys.details?.concept ?? base.konzept ?? "",
    geschlecht: sys.details?.gender ?? base.geschlecht ?? "",
    alter: sys.details?.age ?? base.alter ?? "",
    species: species ? (canon(species.name) === canon(base.species) ? base.species : slug(species.name)) : (base.species ?? ""),
    bioAbnormitaeten: abn.map(a => reuse(prevAbn, a) ?? slug(a.name)),
    attributes,
    mutantAttrBonuses: Object.entries(sys.attributes).filter(([, a]) => a.bonus > 0 && !awakened).map(([k]) => Object.entries(ATTRS).find(([, v]) => v === k)?.[0]),
    skills, languages: { ...languages, [motherTongue]: languages[motherTongue] ?? 5 }, motherTongue,
    n2SkillTargets: skillTargets(abn.find(a => a.name === "N²")),
    mysteriousImplantSkillTargets: skillTargets(abn.find(a => a.name.startsWith("Mysteriöses Implantat"))),
    bioProperties: awakened ? [] : traitsOnly,
    roboticAdaptations: awakened ? traitsOnly : [],
    auffaelligkeiten: conspicuities,
    styleSkills: style.filter(x => x.system.kind !== "kampfkunst").map(x => reuse(prevStyle, x) ?? slug(x.name)),
    kampfkuenste, specialValuePurchases,
    advantages: advItems.filter(a => a.system.kind === "vorteil").map(advEntry).sort(byOrder),
    disadvantages: advItems.filter(a => a.system.kind === "nachteil").map(advEntry).sort(byOrder),
    charaktermerkmale: items("trait").map(t => t.name),
    butterflyEffect: sys.progress?.butterfly || base.butterflyEffect || null,
    resourceGp: sys.progress?.gpMoney ?? base.resourceGp ?? 0,
    // Verlag: resources = Gesamtbudget aus GP (nicht das Restguthaben)
    resources: (sys.progress?.gpMoney ?? 0) * (NR.powerLevels[sys.progress?.powerLevel]?.money ?? 1000),
    equipment,
    psiKraefte, psiApps, hmoKraefte,
    robotik,
    awakenedOptions,
    implantate
  };
  return {
    format: FORMAT,
    schemaVersion: prev.schemaVersion ?? 12,
    systemId: prev.systemId ?? "noreturn-2e",
    rulesVersion: prev.rulesVersion ?? "noreturn-2e-corebook-v1.2",
    appVersion: prev.appVersion ?? `foundry-noreturn-${game.system.version}`,
    savedAt: new Date().toISOString(),
    character
  };
}

/** Export als Datei herunterladen. */
export function downloadMannifest(actor) {
  const data = exportMannifest(actor);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const name = `NoReturn2E_${actor.name.replace(/[^\w-]+/g, "_")}_${stamp}.json`;
  foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", name);
  return data;
}
