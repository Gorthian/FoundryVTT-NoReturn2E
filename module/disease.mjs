/**
 * Krankheiten (Kap. 1, S. 40–45): Infektionsprobe, Verlauf und Heilung.
 * Aktive Krankheiten liegen als Item (`disease`, system.active) am Actor; zusätzlich trägt der Actor einen
 * Zustand „Erkrankt“ (ActiveEffect) je Krankheit, der Maluswürfel als temporären Malus liefert.
 */
import { rollPool, rollHitZone } from "./dice/pool.mjs";
import { addTempMalus } from "./status.mjs";

const L = key => game.i18n.localize(key);

/** Krankheits-Effekt am Actor neu aufbauen (oder entfernen, wenn inaktiv). */
async function syncEffect(actor, item) {
  const old = actor.effects.filter(e => e.getFlag("noreturn", "disease") === item.id).map(e => e.id);
  if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
  if (!item.system.active) return;
  const data = (await ActiveEffect.fromStatusEffect("nrDisease")).toObject();
  data.name = `${L("NR.Condition.nrDisease")}: ${item.name}`;
  data.origin = item.uuid;
  foundry.utils.setProperty(data, "flags.noreturn.disease", item.id);
  if (item.system.malusDice) data.changes = [addTempMalus(item.system.malusDice)];
  await actor.createEmbeddedDocuments("ActiveEffect", [data]);
}

/** Krankheit am Actor aktivieren (legt das Item an, falls es aus dem Compendium stammt). */
export async function contract(actor, source) {
  let item = source.parent === actor ? source : actor.items.find(i => i.type === "disease" && i.name === source.name);
  if (!item) {
    const data = source.toObject();
    delete data._id;
    try {
      [item] = await actor.createEmbeddedDocuments("Item", [data]);
    } catch (err) {
      console.error("NoReturn 2E | Krankheit konnte nicht angelegt werden", err);
    }
    if (!item) return null;
  }
  await item.update({ "system.active": true, "system.days": 0 });
  await syncEffect(actor, item);
  return item;
}

/** Infektionsprobe gegen die Intensität der Krankheit; bei Misserfolg erkrankt der Actor. */
export async function infect(actor, source, { skipRoll = false, useAlt = false } = {}) {
  if (!actor || actor.type === "vehicle") return null;
  if (actor.system.awakened) { ui.notifications.info(L("NR.Awakened.Immune")); return null; }
  let infected = skipRoll;
  if (!skipRoll) {
    const ir = actor.system.ir;
    const res = await rollPool({
      actor, label: `${L("NR.Roll.Infection")}: ${source.name}`, subtitle: ir.label, dice: ir.dice, points: ir.points,
      hazard: false, oneDieRule: false, mw: useAlt && source.system.intensityAlt ? source.system.intensityAlt : source.system.intensity
    });
    infected = res.success === false;
  }
  if (!infected) return { infected: false };
  const item = await contract(actor, source);
  if (!item) return { infected: false, failed: true };
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="nr-card"><h3>${source.name}</h3><p class="nr-bad">${game.i18n.format("NR.Disease.Infected", { name: actor.name })}</p><p>${L("NR.Disease.Incubation")}: ${item.system.incubation || "–"}</p></div>`
  });
  return { infected: true, item };
}

/** Wirkung eines Verlaufsschritts anwenden; liefert Textzeilen für die Chatkarte. */
async function applyStep(actor, item) {
  const s = item.system;
  const lines = [];
  const updates = {};
  const evalTotal = async f => (f ? (await new Roll(String(f)).evaluate()).total : 0);
  const org = await evalTotal(s.stepOrganismus);
  if (org) { updates["system.organismus.loss"] = actor.system.organismus.loss + org; lines.push(game.i18n.format("NR.Disease.OrgLoss", { v: org })); }
  const psy = await evalTotal(s.stepPsyche);
  if (psy) { updates["system.psyche.loss"] = actor.system.psyche.loss + psy; lines.push(game.i18n.format("NR.Disease.PsycheLoss", { v: psy })); }
  if (s.stepDamage) {
    const { zone } = await rollHitZone();
    updates[`system.zones.${zone}.damage`] = actor.system.zones[zone].damage + s.stepDamage;
    lines.push(game.i18n.format("NR.Disease.ZoneDamage", { v: s.stepDamage, zone: CONFIG.NR.zones[zone].label }));
  }
  if (Object.keys(updates).length) await actor.update(updates);
  return lines;
}

/**
 * Verlauf einer aktiven Krankheit um `days` Tage vorrücken; fällige Schritte werden angewendet.
 * @returns {Promise<{steps: number, lines: string[]}|null>}
 */
export async function advanceDisease(actor, item, days = 1) {
  const s = item.system;
  if (!s.active || !(days > 0)) return null;
  const stepsAt = d => (s.stepDays > 0 ? Math.floor(Math.max(0, d - s.incubationDays) / s.stepDays) : 0);
  const steps = stepsAt(s.days + days) - stepsAt(s.days);
  await item.update({ "system.days": s.days + days });
  const lines = [];
  for (let i = 0; i < steps; i++) lines.push(...await applyStep(actor, item));
  if (lines.length) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="nr-card"><h3>${item.name}</h3><p>${L("NR.Disease.Progress")}</p><ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul></div>`
    });
  }
  return { steps, lines };
}

/** Krankheit beenden: Item bleibt als Eintrag erhalten, der Zustand verschwindet. */
export async function cure(actor, item) {
  await item.update({ "system.active": false, "system.days": 0 });
  await syncEffect(actor, item);
}

/** SL-Dialog: Krankheit aus dem Compendium auf markierte Tokens übertragen (mit Infektionsprobe). */
export async function infectDialog() {
  if (!game.user.isGM) return ui.notifications.warn(L("NR.Hazard.GMOnly"));
  const actors = [...new Map((canvas.tokens?.controlled ?? []).filter(t => t.actor).map(t => [t.actor.uuid, t.actor])).values()];
  if (!actors.length) return ui.notifications.warn(L("NR.Hazard.NoTokens"));
  const pack = game.packs.get("noreturn.krankheiten");
  const docs = pack ? await pack.getDocuments() : [];
  if (!docs.length) return ui.notifications.warn(L("NR.Disease.NoPack"));
  const opts = docs.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.input({
    window: { title: L("NR.Disease.InfectTitle"), icon: "fa-solid fa-virus" },
    content: `<p>${game.i18n.format("NR.Hazard.Targets", { n: actors.length })}</p>
      <div class="form-group"><label>${L("NR.Disease.Which")}</label><select name="disease">${opts}</select></div>
      <div class="form-group"><label>${L("NR.Disease.UseAlt")}</label><input type="checkbox" name="alt"></div>
      <div class="form-group"><label>${L("NR.Disease.SkipRoll")}</label><input type="checkbox" name="skip"></div>`,
    ok: { label: L("NR.Disease.Infect") }
  }).catch(() => null);
  if (!result) return null;
  const source = docs.find(d => d.id === result.disease);
  for (const actor of actors) await infect(actor, source, { skipRoll: !!result.skip, useAlt: !!result.alt });
  return source;
}
