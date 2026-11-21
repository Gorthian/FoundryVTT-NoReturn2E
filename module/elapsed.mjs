/**
 * Verstrichene Zeit (Tage, Zonate): Verlauf von Krankheiten und Strahlungswirkung (Kap. 1).
 * Wird vom Hook `noreturn.timeAdvanced` (SL-Zeitsteuerung) oder vom Makro „Zeit vergeht“ ausgelöst.
 * Strahlung (S. 19): Kat. 1–3 je 6 Zonate Organismusverlust = Kategorie; Kat. 4–6 jeden Tag Verlust = Kategorie
 * (jeweils nur im Strahlungsgebiet und ohne dichte Schutzkleidung); nach erstem Strahlungsschaden −1 Organismus je Zonat.
 */
import { advanceDisease } from "./disease.mjs";
import { radiationEffect } from "./status.mjs";

const DAYS_PER_ZONAT = 20;
const L = key => game.i18n.localize(key);

/** Alle Actors, die betroffen sein können: Welt-Actors plus Token-Actors der aktuellen Szene. */
function allActors() {
  const set = new Set(game.actors.contents);
  for (const t of canvas.scene?.tokens ?? []) if (t.actor && !t.actorLink) set.add(t.actor);
  return [...set];
}

/** Strahlungswirkung für einen Actor; liefert Textzeilen. */
async function applyRadiation(actor, { days, zonats }) {
  const eff = radiationEffect(actor);
  if (!eff || actor.type === "vehicle") return [];
  const f = eff.flags?.noreturn ?? {};
  const cat = Number(f.category) || 1;
  let loss = 0;
  let aftermath = !!f.aftermath;
  let progress = f.zonatProgress ?? 0;
  const lines = [];
  // Nachwirkung (nur wenn schon Strahlungsschaden erlitten wurde)
  if (aftermath && zonats > 0) { loss += zonats; lines.push(game.i18n.format("NR.Radiation.Aftermath", { v: zonats })); }
  if (f.exposed !== false && !f.protected) {
    if (cat <= 3 && zonats > 0) {
      progress += zonats;
      const n = Math.floor(progress / 6);
      progress %= 6;
      if (n > 0) { loss += n * cat; aftermath = true; lines.push(game.i18n.format("NR.Radiation.Exposure", { v: n * cat })); }
    } else if (cat >= 4 && cat <= 6 && days > 0) {
      loss += days * cat;
      aftermath = true;
      lines.push(game.i18n.format("NR.Radiation.Exposure", { v: days * cat }));
    }
  }
  if (loss) await actor.update({ "system.organismus.loss": actor.system.organismus.loss + loss });
  await eff.update({ "flags.noreturn.aftermath": aftermath, "flags.noreturn.zonatProgress": progress });
  return lines;
}

/**
 * Zeit auf Actors anwenden.
 * @param {Actor[]} actors
 * @param {{days: number, zonats: number}} elapsed  `days` zählt alle Tage (auch die der Zonate)
 */
export async function applyElapsed(actors, { days = 0, zonats = 0 } = {}) {
  if (days <= 0 && zonats <= 0) return;
  for (const actor of actors) {
    const lines = await applyRadiation(actor, { days, zonats });
    if (lines.length) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="nr-card"><h3>${L("NR.Radiation.Title")}</h3><ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul></div>`
      });
    }
    for (const item of actor.items.filter(i => i.type === "disease" && i.system.active)) await advanceDisease(actor, item, days);
  }
}

/** Auf die SL-Zeitsteuerung (Hook `noreturn.timeAdvanced`) reagieren, sofern der Hook vorhanden ist. */
export function registerElapsedHook() {
  Hooks.on("noreturn.timeAdvanced", info => {
    if (!game.settings.get("noreturn", "timeEffects")) return;
    const days = Math.max(0, info?.crossed?.days ?? 0);
    const zonats = Math.max(0, info?.crossed?.zonats ?? 0);
    if (days > 0 || zonats > 0) applyElapsed(allActors(), { days, zonats });
  });
}

/** Makro „Zeit vergeht“: Tage/Zonate direkt auf markierte Tokens anwenden (unabhängig von der Weltzeit). */
export async function elapsedDialog() {
  if (!game.user.isGM) return ui.notifications.warn(L("NR.Hazard.GMOnly"));
  const actors = [...new Map((canvas.tokens?.controlled ?? []).filter(t => t.actor).map(t => [t.actor.uuid, t.actor])).values()];
  if (!actors.length) return ui.notifications.warn(L("NR.Hazard.NoTokens"));
  const result = await foundry.applications.api.DialogV2.input({
    window: { title: L("NR.Elapsed.Title"), icon: "fa-solid fa-hourglass-half" },
    content: `<p>${game.i18n.format("NR.Hazard.Targets", { n: actors.length })}</p>
      <div class="form-group"><label>${L("NR.Elapsed.Days")}</label><input type="number" name="days" value="1" min="0"></div>
      <div class="form-group"><label>${L("NR.Elapsed.Zonats")}</label><input type="number" name="zonats" value="0" min="0"></div>
      <p class="nr-hint">${L("NR.Elapsed.Hint")}</p>`,
    ok: { label: L("NR.Elapsed.Apply") }
  }).catch(() => null);
  if (!result) return null;
  const zonats = Math.max(0, Number(result.zonats) || 0);
  const days = Math.max(0, Number(result.days) || 0) + zonats * DAYS_PER_ZONAT;
  await applyElapsed(actors, { days, zonats });
  return { days, zonats, actors };
}
