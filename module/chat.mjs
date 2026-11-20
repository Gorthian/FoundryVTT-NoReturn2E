import { defendAgainst, rollDamage, resistFromMessage } from "./combat.mjs";
import { applyPsiDamage } from "./psi.mjs";
import { rollPool } from "./dice/pool.mjs";
import { NR } from "./config.mjs";
import { applyDamageTo } from "./socket.mjs";

/**
 * Chat-Interaktionen: Buttons in Würfelkarten.
 */
export function registerChatHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const el = html instanceof HTMLElement ? html : html[0];
    if (!el) return;
    prepareButtons(message, el);
    el.querySelectorAll("[data-nr-action]").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        onAction(message, btn);
      });
    });
    // Einklappbare Würfeldetails
    el.querySelectorAll(".nr-dice-toggle").forEach(t => t.addEventListener("click", () => t.closest(".nr-card")?.classList.toggle("nr-show-dice")));
  });
}

/** Buttons verbergen, die der aktuelle Benutzer nicht auslösen darf. */
function prepareButtons(message, el) {
  const f = message.flags?.noreturn ?? {};
  el.querySelectorAll("[data-nr-action]").forEach(btn => {
    const action = btn.dataset.nrAction;
    let allowed = true;
    if (["defend", "noDefense", "resist", "psiDamage"].includes(action)) {
      const uuid = btn.dataset.tokenUuid || btn.dataset.actorUuid;
      const doc = uuid ? fromUuidSync(uuid) : null;
      const actor = doc?.actor ?? doc;
      allowed = game.user.isGM || !!actor?.isOwner;
    } else if (action === "damage") {
      const actor = f.defense?.attack?.actorUuid ? fromUuidSync(f.defense.attack.actorUuid) : null;
      allowed = game.user.isGM || !!actor?.isOwner;
    } else if (action === "reroll") {
      const actor = f.reroll?.actorUuid ? fromUuidSync(f.reroll.actorUuid) : null;
      allowed = !!actor?.isOwner;
    }
    if (!allowed) btn.classList.add("nr-hidden-btn");
  });
}

async function onAction(message, btn) {
  const action = btn.dataset.nrAction;
  const f = message.flags?.noreturn ?? {};
  switch (action) {
    case "defend":
      return defendAgainst(message, btn.dataset.tokenUuid, false, Number(btn.dataset.index) || 1);
    case "noDefense":
      return defendAgainst(message, btn.dataset.tokenUuid, true, Number(btn.dataset.index) || 1);
    case "damage":
      return rollDamage(f.defense);
    case "resist":
      return resistFromMessage(message);
    case "psiDamage":
      return applyPsiDamage(message, btn.dataset.tokenUuid);
    case "reroll":
      return rerollWithAdrenalin(message);
    case "applyTargets": {
      // Schaden an alle markierten Ziele (GM-Hilfe für Flächenangriffe)
      const payload = f.damage;
      if (!payload) return;
      let delegated = 0;
      const missing = [];
      for (const t of game.user.targets) {
        const result = await applyDamageTo(t.actor?.uuid ?? t.document.uuid, {
          amount: payload.amount, zones: payload.zones, attack: payload.attack, label: payload.weaponName
        });
        if (result === "delegated") delegated++;
        else if (result === "unavailable") missing.push(t.name);
      }
      if (delegated) ui.notifications.info(game.i18n.format("NR.Notify.DamageDelegated", { n: delegated }));
      if (missing.length) ui.notifications.warn(game.i18n.format("NR.Notify.DamageSkipped", { names: missing.join(", ") }));
      return;
    }
  }
}

/** Probe mit Adrenalin (oder Meditation) wiederholen (S. 83). */
async function rerollWithAdrenalin(message) {
  const data = message.flags.noreturn?.reroll;
  if (!data) return;
  const actor = await fromUuid(data.actorUuid);
  if (!actor?.isOwner) return;
  let kind = "adrenalin";
  if (actor.system.adrenalinLeft <= 0) {
    if (actor.system.meditationLeft > 0) kind = "meditation";
    else return ui.notifications.warn(game.i18n.localize("NR.Notify.NoAdrenalin"));
  }
  await actor.spendAdrenalin(kind);
  return rollPool({
    actor, label: `${data.label} (${kind === "adrenalin" ? "Adrenalin" : "Meditation"}: Wiederholung)`,
    subtitle: data.subtitle, dice: data.dice, bonusDice: data.bonusDice, malusDice: data.malusDice,
    points: data.points, mw: data.mw, hazard: data.hazard, leiden: data.leiden, flags: data.flags
  });
}
