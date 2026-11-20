import { NR } from "./config.mjs";

/**
 * Hilfsfunktionen für die Wirkung von Style-Skills und Kampfkünsten (Corebook S. 179–191).
 * Numerische Effekte laufen über Item-Modifikatoren (siehe NR.modifierTargets: attack.*, damage.*,
 * defense.*, resist.*), die hier abhängig vom Angriffskontext ausgewertet werden. Alles Übrige
 * (Mehrfachangriff, Parade-Erlaubnis, Fertigkeitstausch) wird über `actor.styleLevel(key)` abgefragt.
 */

/** Waffenlose bzw. körpereigene Angriffe. */
export const UNARMED_CATEGORIES = ["unbewaffnet", "faustkampf"];

/** Trefferzonen der Beine (Becken zählt nicht). */
export const LEG_ZONES = ["3", "4", "10", "11"];

export const isUnarmed = weapon => UNARMED_CATEGORIES.includes(weapon.system.category);
export const isMeleeWeapon = weapon => !!NR.weaponCategories[weapon.system.category]?.melee;
export const isBlade = weapon => isMeleeWeapon(weapon) && !isUnarmed(weapon) && weapon.system.damageType === "klinge";

/** Vorbelegung der Angriffsart (Gliedmaße) eines waffenlosen Angriffs anhand des Waffennamens. */
export function defaultLimb(weapon) {
  const n = weapon.name.toLowerCase();
  if (n.includes("kralle")) return "claw";
  if (n.includes("biss")) return "bite";
  if (n.includes("horn") || n.includes("kopf")) return "head";
  if (n.includes("knie")) return "knee";
  if (n.includes("tritt") || n.includes("fuß") || n.includes("fuss")) return "leg";
  return "fist";
}

/**
 * Gruppen, für die Angriffs- bzw. Schadensmodifikatoren (`attack.<gruppe>` / `damage.<gruppe>`) gelten.
 * @param {Item} weapon
 * @param {object} ctx
 * @param {string} [ctx.limb]        Angriffsart bei waffenlosen Angriffen (NR.strikeLimbs)
 * @param {boolean} [ctx.zpc]        Angriff mit dem linken Arm/Bein (ZPC)
 * @param {number} [ctx.multi]       Anzahl der Angriffe
 * @param {boolean} [ctx.gunFuMelee] Feuerwaffe im Nahkampf (Gun-Fu)
 * @returns {Set<string>}
 */
export function strikeGroups(weapon, { limb = "fist", zpc = false, multi = 1, gunFuMelee = false } = {}) {
  const groups = new Set();
  const melee = isMeleeWeapon(weapon) || gunFuMelee;
  if (isUnarmed(weapon)) {
    groups.add("unarmed");
    for (const g of NR.strikeLimbs[limb]?.groups ?? []) groups.add(g);
  }
  if (isBlade(weapon)) groups.add("blade");
  if (melee) groups.add("melee");
  if (zpc) groups.add("zpc");
  if (multi > 1 && melee) groups.add("multi");
  return groups;
}

/** Summe der Modifikatoren `<kind>.<gruppe>` (kind: attack | damage) für die gegebenen Gruppen. */
export function styleDice(actor, kind, groups) {
  const mods = actor.system.mods ?? {};
  let n = 0;
  for (const g of groups) n += mods[`${kind}.${g}`] ?? 0;
  return n;
}

/**
 * Wie viele Angriffe darf der Akteur mit dieser Waffe in einem Wurf ausführen (Mehrfachangriff, S. 89)?
 * Ohne passenden Style-Skill 1.
 */
export function maxMultiAttacks(actor, weapon, { gunFuMelee = false } = {}) {
  const L = key => actor.styleLevel(key);
  if (isUnarmed(weapon)) return L("stormOfFists") ? 4 : L("fistOfRage") ? 2 : 1;
  if (isMeleeWeapon(weapon)) return L("multipleWielding") ? 4 : L("dualWielding") ? 2 : 1;
  let n = L("quadrupleAkimbo") ? 4 : L("akimbo") ? 2 : 1;
  if (gunFuMelee && L("gunFu") >= 3) n = Math.max(n, 2);
  return n;
}

/**
 * Fertigkeiten, mit denen die Waffe geführt werden darf (erste = Standard).
 *  - Escrima 2: Nahkampf und Waffenkampf sind austauschbar
 *  - Sado 3: Nahkampfwaffen mit Nahkampf statt Waffenkampf
 *  - Gun-Fu 2: einhändige Feuerwaffen im Nahkampf mit Nahkampf (nur HM, in Nahkampfreichweite)
 * @returns {{key: string, gunFu?: boolean, via?: string}[]}
 */
export function attackSkillOptions(actor, weapon) {
  const base = weapon.system.skillKey;
  const opts = [{ key: base }];
  const add = (key, extra = {}) => { if (!opts.some(o => o.key === key)) opts.push({ key, ...extra }); };
  const cat = weapon.system.category;
  if (cat === "nahkampf") {
    if (actor.styleLevel("escrima") >= 2) add(base === "nahkampf" ? "waffenkampf" : "nahkampf", { via: "escrima" });
    if (actor.styleLevel("sado") >= 3) add("nahkampf", { via: "sado" });
  }
  if (cat === "unbewaffnet" || cat === "faustkampf") {
    if (actor.styleLevel("escrima") >= 2) add("waffenkampf", { via: "escrima" });
  }
  if (cat === "faustfeuer" && actor.styleLevel("gunFu") >= 2 && !weapon.system.twoHanded) add("nahkampf", { gunFu: true, via: "gunFu" });
  return opts;
}

/** Hinweise zur Parade: Welche Stile erlauben eine Parade mit Nahkampf bzw. gegen Fernkampf? */
export function nahkampfParryVia(actor) {
  const via = [];
  const L = key => actor.styleLevel(key);
  if (L("aikido") >= 1) via.push("Aikido");
  if (L("jiuJitsu") >= 1) via.push("Jiu Jitsu");
  if (L("escrima") >= 1) via.push("Escrima");
  if (L("gunFu") >= 1) via.push("Gun-Fu");
  if (L("sado") >= 3) via.push("Sado");
  if (L("zpc") >= 3) via.push("ZPC");
  return via;
}
