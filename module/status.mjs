/**
 * Zustände (Status-Effekte) und Umweltgefahren (Issue #39).
 * Die Effekte erscheinen im Token-HUD; „Gefahr auslösen“ ist ein SL-Dialog für markierte Tokens.
 * Zeiträume des Regelwerks (alle 10 min, je Stunde, je Tag) werden nur als Hinweis ausgegeben.
 */

const ICON = "icons/svg/";

/** Änderung „addiere n auf system.tempMalus“ (v13: mode, v14: type). */
export function addTempMalus(n) {
  const base = { key: "system.tempMalus", value: String(n) };
  return game.release?.generation >= 14 ? { ...base, type: "add" } : { ...base, mode: CONST.ACTIVE_EFFECT_MODES.ADD };
}

/** Definition der Systemzustände. Namen kommen aus NR.Condition.<id>. */
const STATUS_DEFS = [
  { id: "nrTemp1", img: `${ICON}frozen.svg`, malus: 1 },
  { id: "nrTemp2", img: `${ICON}frozen.svg`, malus: 2 },
  { id: "nrTemp3", img: `${ICON}fire.svg`, malus: 3 },
  { id: "nrTemp4", img: `${ICON}fire.svg`, malus: 4 },
  { id: "nrTemp5", img: `${ICON}fire.svg`, malus: 5 },
  { id: "nrTemp6", img: `${ICON}fire.svg`, malus: 6 },
  { id: "nrRadiation", img: `${ICON}radiation.svg` },
  { id: "nrDisease", img: `${ICON}biohazard.svg` },
  { id: "nrContinuous", img: `${ICON}acid.svg` },
  { id: "nrUnconscious", img: `${ICON}unconscious.svg` }
];

/**
 * CONFIG.statusEffects durch die NoReturn-Zustände ersetzen (im init-Hook). Foundry-Standards wie
 * „Magisches Schild“ entfallen; nur „Besiegt“ (CONFIG.specialStatusEffects.DEFEATED, vom Kampf-Tracker
 * genutzt) bleibt erhalten.
 */
export function registerStatusEffects() {
  game.settings.register("noreturn", "timeEffects", {
    name: "NR.Settings.TimeEffects",
    hint: "NR.Settings.TimeEffectsHint",
    scope: "world", config: true, type: Boolean, default: true
  });
  const defeatedId = CONFIG.specialStatusEffects?.DEFEATED ?? "dead";
  const defeated = CONFIG.statusEffects.find(e => e.id === defeatedId)
    ?? { id: defeatedId, name: "EFFECT.StatusDead", img: `${ICON}skull.svg` };
  CONFIG.statusEffects = [defeated];
  for (const def of STATUS_DEFS) {
    CONFIG.statusEffects.push({
      id: def.id,
      _id: def.id.padEnd(16, "0").slice(0, 16),
      name: `NR.Condition.${def.id}`,
      img: def.img,
      ...(def.malus ? { changes: [addTempMalus(def.malus)] } : {})
    });
  }
}

/**
 * Umweltgefahren (Kap. 1). cat: Kategorie-Auswahl; damage: Schaden je Kategorie; continuous: andauernder Schaden.
 * Werte aus dem Regelwerk; Zeiträume erscheinen nur als Hinweis (NR.Hazard.<id>.hint).
 */
export const HAZARDS = {
  temperature: { cat: [1, 2, 3, 4, 5, 6], status: cat => `nrTemp${cat}` },
  acidRain: { damage: () => 1, organismLoss: 1 },
  sandstorm: { cat: [1, 2, 3, 4, 5], damage: cat => 10 * cat },
  deathFog: { damage: () => 20, continuous: true, status: () => "nrContinuous" },
  toxicWater: { damage: () => 60, continuous: true, status: () => "nrContinuous" },
  radiation: {
    cat: [1, 2, 3, 4, 5, 6, 7, 8, 9], status: () => "nrRadiation",
    damage: cat => (cat >= 7 ? 70 + 10 * (cat - 7) : 0), continuous: true, protectable: true
  },
  radiationLeave: { leave: true }
};

const TEMP_IDS = ["nrTemp1", "nrTemp2", "nrTemp3", "nrTemp4", "nrTemp5", "nrTemp6"];

/** Zustand am Actor setzen; ersetzt einen vorhandenen gleichen Zustand (bei Temperatur jede Stufe). */
export async function setStatus(actor, statusId, { category = null, flags = {}, nameSuffix = "" } = {}) {
  const remove = (TEMP_IDS.includes(statusId) ? TEMP_IDS : [statusId]);
  const old = actor.effects.filter(e => remove.some(s => e.statuses.has(s))).map(e => e.id);
  if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
  const effect = await ActiveEffect.fromStatusEffect(statusId);
  const data = effect.toObject();
  if (category) {
    data.name = `${game.i18n.localize(`NR.Condition.${statusId}`)} ${category}`;
    foundry.utils.setProperty(data, "flags.noreturn.category", category);
  }
  if (nameSuffix) data.name += ` ${nameSuffix}`;
  for (const [k, v] of Object.entries(flags)) foundry.utils.setProperty(data, `flags.noreturn.${k}`, v);
  await actor.createEmbeddedDocuments("ActiveEffect", [data]);
}

/** Der Zustand „Verstrahlt“ eines Actors (oder undefined). */
export function radiationEffect(actor) {
  return actor.effects.find(e => e.statuses.has("nrRadiation"));
}

/** Summe der Stufen aller Items eines Typs, deren Name mit einem der Präfixe beginnt. */
function traitLevel(actor, type, prefixes) {
  return actor.items.filter(i => i.type === type && prefixes.some(p => i.name.startsWith(p)))
    .reduce((sum, i) => sum + (i.system.level ?? 1), 0);
}

/** Immun gegen Fress-Regen: Wassertauglichkeit, Toxische Anpassung oder Amphibia Humanis (S. 17). */
function immuneToAcidRain(actor) {
  return actor.items.some(i => ["Wassertauglichkeit", "Toxische Anpassung", "Amphibia Humanis"].some(n => i.name.startsWith(n)));
}

/**
 * Gefahr auf einen Actor anwenden (Zustand + Schaden/Organismusverlust).
 * @returns {Promise<string[]>} Hinweiszeilen zum Actor (Resistenzen, Immunität, Folgen) für die Chatkarte
 */
export async function applyHazard(actor, hazardId, category = 1, { protectedGear = false } = {}) {
  const h = HAZARDS[hazardId];
  const notes = [];
  if (!h || actor.type === "vehicle") return notes;
  const label = game.i18n.localize(`NR.Hazard.${hazardId}.name`);
  if (h.leave) {
    const eff = radiationEffect(actor);
    if (eff) await eff.setFlag("noreturn", "exposed", false);
    return notes;
  }
  if (hazardId === "acidRain") {
    if (immuneToAcidRain(actor)) return [game.i18n.localize("NR.Hazard.acidRainImmune")];
    if (traitLevel(actor, "bioTrait", ["Dicke Haut", "Panzer"])) notes.push(game.i18n.localize("NR.Hazard.acidRainSlow"));
  }
  if (hazardId === "temperature") {
    // Hitze-/Kälteresistenz (Dicke Haut / dickes Fell) mindert den Malus um die Stufen (S. 16).
    const resist = traitLevel(actor, "bioTrait", ["Dicke Haut"]);
    const effective = Math.min(TEMP_IDS.length, Math.max(0, category - resist));
    if (resist) notes.push(game.i18n.format("NR.Hazard.TempResist", { resist, malus: effective }));
    if (effective > 0) {
      // setStatus ersetzt vorhandene Temperaturzustände selbst
      await setStatus(actor, `nrTemp${effective}`, { nameSuffix: resist ? game.i18n.format("NR.Hazard.TempResistShort", { resist }) : "" });
    } else {
      const old = actor.effects.filter(e => TEMP_IDS.some(id => e.statuses.has(id))).map(e => e.id);
      if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
    }
    return notes;
  }
  if (h.status) {
    let flags = {};
    if (hazardId === "radiation") {
      const old = radiationEffect(actor)?.flags?.noreturn ?? {};
      flags = { exposed: true, protected: !!protectedGear, aftermath: !!old.aftermath || (category >= 7 && !protectedGear), zonatProgress: old.zonatProgress ?? 0 };
    }
    await setStatus(actor, h.status(category), { category: hazardId === "radiation" ? category : null, flags });
  }
  if (h.organismLoss && actor.system.organismus) {
    await actor.update({ "system.organismus.loss": actor.system.organismus.loss + h.organismLoss });
  }
  const amount = (h.protectable && protectedGear) ? 0 : (h.damage?.(category) ?? 0);
  if (amount > 0) {
    const result = await actor.resistDamage({ amount, zones: ["7"], attack: { continuous: !!h.continuous }, label, skipDialog: true });
    // Wunden im Sandsturm in verstrahlten Gebieten: −3 Organismus je Verwundung (S. 18)
    const rad = radiationEffect(actor);
    if (hazardId === "sandstorm" && result?.totalApplied > 0 && actor.system.organismus && rad && rad.flags?.noreturn?.exposed !== false) {
      await actor.update({ "system.organismus.loss": actor.system.organismus.loss + 3 });
      notes.push(game.i18n.localize("NR.Hazard.SandstormRadiation"));
    }
  }
  return notes;
}

/** SL-Dialog: Gefahr wählen, auf markierte Tokens anwenden und Zeitraum-Hinweis im Chat ausgeben. */
export async function hazardDialog() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("NR.Hazard.GMOnly"));
  const tokens = canvas.tokens?.controlled ?? [];
  const actors = [...new Map(tokens.filter(t => t.actor).map(t => [t.actor.uuid, t.actor])).values()];
  if (!actors.length) return ui.notifications.warn(game.i18n.localize("NR.Hazard.NoTokens"));

  const opts = Object.keys(HAZARDS).map(id => `<option value="${id}">${game.i18n.localize(`NR.Hazard.${id}.name`)}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("NR.Hazard.Title"), icon: "fa-solid fa-biohazard" },
    content: `<p>${game.i18n.format("NR.Hazard.Targets", { n: actors.length })}</p>
      <div class="form-group"><label>${game.i18n.localize("NR.Hazard.Type")}</label><select name="hazard">${opts}</select></div>
      <div class="form-group"><label>${game.i18n.localize("NR.Hazard.Category")}</label><input type="number" name="cat" value="1" min="1" max="9"></div>
      <div class="form-group"><label>${game.i18n.localize("NR.Hazard.Protected")}</label><input type="checkbox" name="protected"></div>`,
    ok: { label: game.i18n.localize("NR.Hazard.Apply") }
  }).catch(() => null);
  if (!result) return null;

  const h = HAZARDS[result.hazard];
  const cat = h.cat ? Math.min(Math.max(Number(result.cat) || 1, h.cat[0]), h.cat.at(-1)) : 1;
  const lines = [];
  for (const actor of actors) {
    const notes = await applyHazard(actor, result.hazard, cat, { protectedGear: !!result.protected });
    lines.push(notes.length ? `${actor.name} (${notes.join("; ")})` : actor.name);
  }

  const name = game.i18n.localize(`NR.Hazard.${result.hazard}.name`) + (h.cat ? ` (${game.i18n.localize("NR.Hazard.CategoryShort")} ${cat})` : "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("NR.Hazard.Title") }),
    content: `<div class="nr-card"><h3>${name}</h3><p>${game.i18n.localize(`NR.Hazard.${result.hazard}.hint`)}</p>
      <p>${lines.join(", ")}</p></div>`
  });
  return { hazard: result.hazard, category: cat, actors };
}
