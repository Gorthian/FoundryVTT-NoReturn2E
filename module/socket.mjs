/**
 * Socket-Anbindung: Aktionen, für die Spieler keine Rechte haben (z. B. Schaden an fremden
 * Zielen bei Flächenangriffen), werden an eine aktive Spielleitung delegiert.
 */
import { addTimedEffect, addChange } from "./timed.mjs";

const CHANNEL = "system.noreturn";

export function registerSocket() {
  game.socket.on(CHANNEL, onMessage);
}

/** Die Spielleitung, die Delegationen ausführt (stabil: erste aktive GM-ID). */
function executingGM() {
  return game.users.activeGM ?? null;
}

/**
 * Wendet Schaden auf ein Ziel an – direkt bei ausreichenden Rechten, sonst über die Spielleitung.
 * @param {string} targetUuid  UUID von Actor oder Token
 * @param {object} payload     { amount, zones, attack, label }
 * @returns {Promise<"applied"|"delegated"|"unavailable">}
 */
export async function applyDamageTo(targetUuid, payload) {
  const doc = await fromUuid(targetUuid);
  const actor = doc?.actor ?? doc;
  if (!actor) return "unavailable";
  if (actor.isOwner) {
    await actor.resistDamage({ amount: payload.amount, zones: payload.zones, attack: payload.attack, label: payload.label });
    return "applied";
  }
  const gm = executingGM();
  if (!gm) return "unavailable";
  game.socket.emit(CHANNEL, { type: "applyDamage", gmId: gm.id, userId: game.user.id, targetUuid, payload });
  return "delegated";
}

/**
 * Wendet eine Bonus-/Malus-Wirkung (Der Doktor, Mixology, Sterne-Küche) auf ein Ziel an – direkt oder über die Spielleitung.
 * @param {string} targetUuid  UUID des Actors
 * @param {{kind: string, n: number}} payload  kind: bonus | malus | adrenalin
 * @returns {Promise<"applied"|"delegated"|"unavailable">}
 */
export async function applyBuffTo(targetUuid, payload) {
  const doc = await fromUuid(targetUuid);
  const actor = doc?.actor ?? doc;
  if (!actor) return "unavailable";
  if (actor.isOwner) {
    await applyBuff(actor, payload);
    return "applied";
  }
  const gm = executingGM();
  if (!gm) return "unavailable";
  game.socket.emit(CHANNEL, { type: "applyBuff", gmId: gm.id, userId: game.user.id, targetUuid, payload });
  return "delegated";
}

async function applyBuff(actor, payload) {
  if (payload.kind === "clinch" || payload.kind === "clinchEnd") return applyClinch(actor, payload);
  if (payload.kind === "timed") return addTimedEffect(actor, payload.spec);
  const { kind, n, hours, source } = payload;
  if ((kind === "bonus" || kind === "malus") && hours > 0 && n > 0) {
    // Zeitlich begrenzt (Der Doktor 4 h/12 h, Mixology/Sterne-Küche 2 h): ActiveEffect, der von selbst abläuft
    const field = kind === "bonus" ? "system.timedBonus" : "system.timedMalus";
    return addTimedEffect(actor, {
      name: `${source || game.i18n.localize("NR.Timed.Buff")}: ${kind === "bonus" ? "+" : "−"}${n}W`,
      img: kind === "bonus" ? "icons/svg/upgrade.svg" : "icons/svg/downgrade.svg",
      value: hours, unit: "hour", source, changes: [addChange(field, n)]
    });
  }
  if (kind === "bonus") return actor.update({ "system.tempBonus": actor.system.tempBonus + n });
  if (kind === "malus") return actor.update({ "system.tempMalus": actor.system.tempMalus + n });
  if (kind === "adrenalin") return actor.update({ "system.special.adrenalin.used": 0 });
}

/** Clinch (Ringen): Zustand am Akteur setzen oder beenden. */
async function applyClinch(actor, { kind, partnerUuid, holder }) {
  if (kind === "clinch") return actor.setFlag("noreturn", "clinch", { partnerUuid, holder: !!holder });
  if (kind === "clinchEnd") return actor.unsetFlag("noreturn", "clinch");
}

async function onMessage(msg) {
  if (msg?.gmId !== game.user.id || !game.user.isGM) return;
  if (msg.type === "applyDamage") {
    const doc = await fromUuid(msg.targetUuid);
    const actor = doc?.actor ?? doc;
    if (!actor) return;
    const { amount, zones, attack, label } = msg.payload ?? {};
    // Ohne Dialog, da Spielleitung statt Besitzer*in würfelt
    await actor.resistDamage({ amount, zones, attack, label, skipDialog: true });
  }
  if (msg.type === "applyBuff") {
    const doc = await fromUuid(msg.targetUuid);
    const actor = doc?.actor ?? doc;
    if (actor) await applyBuff(actor, msg.payload ?? {});
  }
}
