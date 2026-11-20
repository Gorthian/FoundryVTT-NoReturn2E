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

/* -------------------------------------------- */
/*  Fertigkeitsproben                            */
/* -------------------------------------------- */

const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);

/**
 * Wirkung von Style-Skills auf eine Fertigkeitsprobe (Probendialog).
 * @param {Actor} actor
 * @param {string|null} skillKey  Schlüssel aus NR.skills (null bei Sonderfertigkeiten)
 * @returns {{hints: string[], fields: {name: string, label: string, value: number, min: number, max: number}[], autoBelow: number|null, crafting: boolean}}
 */
export function skillStyleEffects(actor, skillKey) {
  const out = { hints: [], fields: [], autoBelow: null, crafting: false };
  if (!skillKey || !actor?.styleLevel) return out;
  const L = key => actor.styleLevel(key);
  const t = key => game.i18n.localize(`NR.Style.Skill.${key}`);
  const cfg = NR.skills[skillKey];
  const social = cfg?.attr === "ch";
  const crafting = cfg?.attr === "ha";
  out.crafting = crafting;

  if (skillKey === "computer") {
    if (L("anonymous")) out.hints.push(t("anonymous"));
    if (L("neo")) out.hints.push(t("neo"));
    if (L("crashOverride")) out.hints.push(t("crashOverride"));
  }
  if (skillKey === "dressieren") {
    if (L("beastmaster")) out.hints.push(t("beastmaster"));
    if (L("petPal")) out.hints.push(t("petPal"));
  }
  if (crafting) {
    if (L("crapGyver")) out.hints.push(t("crapGyver"));
    if (L("trustyEngineer")) out.fields.push({ name: "trusty", label: t("trustyLabel"), value: 1, min: 0, max: 2 });
  }
  if (social) {
    if (L("fastTalk")) out.fields.push({ name: "fastTalk", label: t("fastTalkLabel"), value: 0, min: 0, max: 3 });
    if (L("goldeneZunge")) out.hints.push(t("goldeneZunge"));
  }
  if (["taschendiebstahl", "heimlichkeit"].includes(skillKey) && L("trickster")) out.hints.push(t("trickster"));
  if (["klettern", "springen"].includes(skillKey) && L("parkour")) {
    out.autoBelow = 30;
    out.hints.push(t("parkour"));
  }
  return out;
}

/** HTML-Block (Hinweise und Zusatzfelder) für den Probendialog. */
export function styleDialogContent(effects) {
  let html = "";
  for (const h of effects.hints) html += `<p class="nr-hint"><i class="fa-solid fa-star"></i> ${esc(h)}</p>`;
  for (const f of effects.fields) {
    html += `<div class="form-group"><label>${esc(f.label)}</label><input type="number" name="${f.name}" data-style-field value="${f.value}" min="${f.min}" max="${f.max}"></div>`;
  }
  return html;
}
