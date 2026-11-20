import { applyChatMode } from "./dice/pool.mjs";

/**
 * Aktive Style-Skills, die eine Probe mit anschließender Wirkung auf Ziele verbinden
 * (Der Doktor, Mixology, Sterne-Küche, Rüttelflug, Power Nap).
 */

const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);

/** Ziele der Wirkung: markierte Tokens, sonst der Akteur selbst. */
function buffTargets(actor) {
  const targets = Array.from(game.user.targets).filter(t => t.actor);
  if (targets.length) return targets.map(t => ({ uuid: t.actor.uuid, name: t.name }));
  return [{ uuid: actor.uuid, name: actor.name }];
}

/**
 * Chatkarte mit Buttons „Bonus/Malus/Adrenalin auf Ziel anwenden“.
 * Bonus-/Maluswürfel wirken wie Inspirieren: +1 Würfel je 20 Punkte Probenergebnis.
 * @param {Actor} actor
 * @param {object} cfg
 * @param {string} cfg.source           Name des Style-Skills
 * @param {number} cfg.total            Probenergebnis
 * @param {{kind: string, hours: number}[]} cfg.options  kind: bonus | malus | adrenalin
 */
export async function postBuffCard(actor, { source, total, options }) {
  const n = Math.floor(total / 20);
  const t = (key, data) => game.i18n.format(`NR.Style.Buff.${key}`, data);
  const targets = buffTargets(actor);
  const rows = targets.map(tg => {
    const buttons = options.map(o => {
      if (o.kind !== "adrenalin" && n < 1) return "";
      const label = o.kind === "bonus" ? t("Bonus", { n, h: o.hours }) : o.kind === "malus" ? t("Malus", { n, h: o.hours }) : t("Adrenalin", { h: o.hours });
      const icon = o.kind === "bonus" ? "fa-arrow-up" : o.kind === "malus" ? "fa-arrow-down" : "fa-bolt";
      return `<button type="button" data-nr-action="styleBuff" data-target-uuid="${esc(tg.uuid)}" data-kind="${o.kind}" data-n="${n}" data-hours="${o.hours}" data-source="${esc(source)}"><i class="fa-solid ${icon}"></i> ${esc(label)}</button>`;
    }).join("");
    return `<div class="nr-target"><span class="nr-target-name"><i class="fa-solid fa-bullseye"></i> ${esc(tg.name)}</span>${buttons}</div>`;
  }).join("");
  const content = `<div class="nr-card"><header class="nr-card-head"><h3>${esc(source)}</h3><div class="nr-card-sub">${esc(t("Result", { total, n }))}</div></header>
    <p class="nr-hint">${esc(t("Hint"))}</p><div class="nr-targets">${rows}</div></div>`;
  const msgData = { speaker: ChatMessage.getSpeaker({ actor }), content };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/** Der Doktor (S. 181): Behandlung (WI + Medizin) gibt Bonus- (4 h) oder Maluswürfel (12 h) oder füllt Adrenalin auf (≈ 1 h). */
export async function useDoctor(actor) {
  const res = await actor.rollSkill("medizin");
  if (!res || res.auto) return null;
  return postBuffCard(actor, {
    source: game.i18n.localize("NR.Style.Buff.Doctor"), total: res.total,
    options: [{ kind: "bonus", hours: 4 }, { kind: "malus", hours: 12 }, { kind: "adrenalin", hours: 1 }]
  });
}

/**
 * Mixology/Sterne-Küche: Zusatzfertigkeit „Ambrosia“ bzw. „Kochen“ (HA) – wird beim ersten Einsatz aus dem Compendium
 * freigeschaltet. Das Ergebnis gibt Bonuswürfel wie Inspirieren für zwei Stunden.
 */
export async function useCraftedBuff(actor, { skillName, source }) {
  let skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
  if (!skill) {
    const pack = game.packs.get("noreturn.fertigkeiten");
    const doc = (await pack?.getDocuments())?.find(d => d.name === skillName);
    if (!doc) return ui.notifications.warn(game.i18n.format("NR.Style.Buff.SkillMissing", { name: skillName }));
    [skill] = await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc)]);
  }
  const res = await actor.rollCustomSkill(skill);
  if (!res || res.auto) return null;
  return postBuffCard(actor, { source, total: res.total, options: [{ kind: "bonus", hours: 2 }] });
}

/** Rüttelflug (S. 183): Ausdauer-Probe; das Ergebnis entspricht der Dauer in Kampfrunden. */
export async function useHover(actor) {
  const res = await actor.rollSkill("ausdauer");
  if (!res || res.auto) return null;
  const msgData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="nr-card"><p class="nr-result good"><i class="fa-solid fa-feather"></i> ${esc(game.i18n.format("NR.Style.HoverDuration", { n: res.total }))}</p></div>`
  };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/** Power Nap (S. 183): Ein halbstündiges Nickerchen erholt vollständig (höchstens 4 Tage am Stück). */
export async function usePowerNap(actor) {
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("NR.Style.PowerNap") },
    content: `<p>${game.i18n.localize("NR.Style.PowerNapConfirm")}</p>`
  });
  if (!ok) return null;
  await actor.rest();
  const msgData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="nr-card"><p class="nr-result good"><i class="fa-solid fa-bed"></i> ${esc(game.i18n.format("NR.Style.PowerNapDone", { name: actor.name }))}</p></div>`
  };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}
