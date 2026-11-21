/**
 * Zustände (Status-Effekte) und Umweltgefahren (Issue #39).
 * Die Effekte erscheinen im Token-HUD; „Gefahr auslösen“ ist ein SL-Dialog für markierte Tokens.
 * Zeiträume des Regelwerks (alle 10 min, je Stunde, je Tag) werden nur als Hinweis ausgegeben.
 */

const ICON = "icons/svg/";

/** Änderung „addiere n auf system.tempMalus“ (v13: mode, v14: type). */
function addTempMalus(n) {
  const base = { key: "system.tempMalus", value: String(n) };
  return game.release?.generation >= 14 ? { ...base, type: "add" } : { ...base, mode: CONST.ACTIVE_EFFECT_MODES.ADD };
}

/** Definition der Systemzustände. Namen kommen aus NR.Condition.<id>. */
const STATUS_DEFS = [
  { id: "nrTemp1", img: `${ICON}frozen.svg`, malus: 1 },
  { id: "nrTemp2", img: `${ICON}frozen.svg`, malus: 2 },
  { id: "nrTemp3", img: `${ICON}fire.svg`, malus: 3 },
  { id: "nrRadiation", img: `${ICON}radiation.svg` },
  { id: "nrDisease", img: `${ICON}biohazard.svg` },
  { id: "nrContinuous", img: `${ICON}acid.svg` }
];

/** Eigene Zustände zu CONFIG.statusEffects hinzufügen (im init-Hook, Namen zur Anzeige übersetzt). */
export function registerStatusEffects() {
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
  temperature: { cat: [1, 2, 3], status: cat => `nrTemp${cat}` },
  acidRain: { damage: () => 1, organismLoss: 1 },
  sandstorm: { cat: [1, 2, 3, 4, 5], damage: cat => 10 * cat },
  deathFog: { damage: () => 20, continuous: true, status: () => "nrContinuous" },
  toxicWater: { damage: () => 60, continuous: true, status: () => "nrContinuous" },
  radiation: {
    cat: [1, 2, 3, 4, 5, 6, 7, 8, 9], status: () => "nrRadiation",
    damage: cat => (cat >= 7 ? 70 + 10 * (cat - 7) : 0), continuous: true
  }
};

const TEMP_IDS = ["nrTemp1", "nrTemp2", "nrTemp3"];

/** Zustand am Actor setzen; ersetzt einen vorhandenen gleichen Zustand (bei Temperatur jede Stufe). */
export async function setStatus(actor, statusId, { category = null } = {}) {
  const remove = (TEMP_IDS.includes(statusId) ? TEMP_IDS : [statusId]);
  const old = actor.effects.filter(e => remove.some(s => e.statuses.has(s))).map(e => e.id);
  if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
  const effect = await ActiveEffect.fromStatusEffect(statusId);
  const data = effect.toObject();
  if (category) {
    data.name = `${game.i18n.localize(`NR.Condition.${statusId}`)} ${category}`;
    foundry.utils.setProperty(data, "flags.noreturn.category", category);
  }
  await actor.createEmbeddedDocuments("ActiveEffect", [data]);
}

/** Gefahr auf einen Actor anwenden (Zustand + Schaden/Organismusverlust). */
export async function applyHazard(actor, hazardId, category = 1) {
  const h = HAZARDS[hazardId];
  if (!h || actor.type === "vehicle") return;
  const label = game.i18n.localize(`NR.Hazard.${hazardId}.name`);
  if (h.status) await setStatus(actor, h.status(category), { category: hazardId === "radiation" ? category : null });
  if (h.organismLoss && actor.system.organismus) {
    await actor.update({ "system.organismus.loss": actor.system.organismus.loss + h.organismLoss });
  }
  const amount = h.damage?.(category) ?? 0;
  if (amount > 0) {
    await actor.resistDamage({ amount, zones: ["7"], attack: { continuous: !!h.continuous }, label, skipDialog: true });
  }
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
      <div class="form-group"><label>${game.i18n.localize("NR.Hazard.Category")}</label><input type="number" name="cat" value="1" min="1" max="9"></div>`,
    ok: { label: game.i18n.localize("NR.Hazard.Apply") }
  }).catch(() => null);
  if (!result) return null;

  const h = HAZARDS[result.hazard];
  const cat = h.cat ? Math.min(Math.max(Number(result.cat) || 1, h.cat[0]), h.cat.at(-1)) : 1;
  for (const actor of actors) await applyHazard(actor, result.hazard, cat);

  const name = game.i18n.localize(`NR.Hazard.${result.hazard}.name`) + (h.cat ? ` (${game.i18n.localize("NR.Hazard.CategoryShort")} ${cat})` : "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("NR.Hazard.Title") }),
    content: `<div class="nr-card"><h3>${name}</h3><p>${game.i18n.localize(`NR.Hazard.${result.hazard}.hint`)}</p>
      <p>${actors.map(a => a.name).join(", ")}</p></div>`
  });
  return { hazard: result.hazard, category: cat, actors };
}
