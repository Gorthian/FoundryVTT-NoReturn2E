/**
 * Socket-Anbindung: Aktionen, für die Spieler keine Rechte haben (z. B. Schaden an fremden
 * Zielen bei Flächenangriffen), werden an eine aktive Spielleitung delegiert.
 */
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
}
