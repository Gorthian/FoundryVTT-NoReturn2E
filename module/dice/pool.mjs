import { NR } from "../config.mjs";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * Vario-D6-Probe (S. 84–87).
 *
 * @typedef {object} PoolOptions
 * @property {Actor}   [actor]
 * @property {string}  label             Titel der Probe
 * @property {string}  [subtitle]        Zusammensetzung (z. B. "GE 3 + Schießen 4")
 * @property {number}  dice              Grundwürfel (Attribut + Fertigkeit)
 * @property {number}  [bonusDice]       Bonuswürfel (Adrenalin, Ausrüstung …)
 * @property {number}  [malusDice]       Maluswürfel (Nachteil, Wunden …)
 * @property {number}  [extraDice]       Zusätzliche Würfel ohne Hazard-Di (z. B. „Gute Treffer“)
 * @property {number}  [points]          Bonus-/Maluspunkte nach dem Wurf
 * @property {boolean} [hazard=true]     Enthält die Probe einen Hazard-Di?
 * @property {boolean} [oneDieRule=true] 1-Würfel-Regel anwenden
 * @property {number}  [mw]              Mindestwurf
 * @property {number}  [leiden]          Leidensstufe des Attributs (0–3)
 * @property {boolean} [pass]            Passen (2,5 Punkte je Würfel, ab 6 Würfeln)
 * @property {number}  [multiplier]      Ergebnis-Multiplikator (z. B. Odemwaffe ×2)
 * @property {object}  [flags]           Zusätzliche Message-Flags
 * @property {string}  [extraHtml]       Zusätzlicher HTML-Inhalt für die Karte
 * @property {boolean} [chat=true]       Chatnachricht erstellen
 * @property {object}  [rerollData]      Daten für einen Adrenalin-Wiederholungswurf
 */

/**
 * Baue die Würfelformel für einen Pool.
 * @returns {{formula: string, n: number}}
 */
export function buildFormula({ dice = 0, bonusDice = 0, malusDice = 0, extraDice = 0, points = 0, hazard = true, oneDieRule = true }) {
  let n = dice + bonusDice - malusDice;
  if (n < 1) n = oneDieRule ? 1 : 0;
  const parts = [];
  if (n > 0) {
    if (hazard) {
      if (n > 1) parts.push(`${n - 1}d6[normal]`);
      parts.push("1d6x[hazard]");
    } else parts.push(`${n}d6[normal]`);
  }
  if (extraDice > 0) parts.push(`${extraDice}d6[bonus]`);
  if (points) parts.push(`${points}`);
  if (!parts.length) parts.push("0");
  return { formula: parts.join(" + ").replace(/\+ -/g, "- "), n };
}

/**
 * Würfle eine Probe und poste sie optional in den Chat.
 * @param {PoolOptions} options
 */
export async function rollPool(options) {
  const o = foundry.utils.mergeObject({
    bonusDice: 0, malusDice: 0, extraDice: 0, points: 0, hazard: true, oneDieRule: true,
    mw: null, leiden: 0, pass: false, multiplier: 1, chat: true, flags: {}, extraHtml: ""
  }, options, { inplace: false });

  const { formula, n } = buildFormula(o);
  let roll;
  let passed = false;
  if (o.pass && n >= 6) {
    passed = true;
    const passValue = Math.floor(n * 2.5);
    const extra = o.extraDice > 0 ? ` + ${o.extraDice}d6[bonus]` : "";
    const pts = o.points ? ` + ${o.points}` : "";
    roll = new Roll(`${passValue}${extra}${pts}`.replace(/\+ -/g, "- "));
  } else {
    roll = new Roll(formula);
  }
  await roll.evaluate();

  let total = roll.total;
  if (o.multiplier !== 1) total = Math.floor(total * o.multiplier);

  // Leiden (S. 115): separater W6
  let leidenRoll = null;
  let leidenTriggered = false;
  if (o.leiden > 0) {
    leidenRoll = await new Roll("1d6").evaluate();
    const r = leidenRoll.total;
    leidenTriggered = o.leiden >= 3 || (o.leiden === 2 && r <= 4) || (o.leiden === 1 && r <= 2);
    if (leidenTriggered) total = Math.floor(total / 2);
  }

  const hasMw = Number.isFinite(o.mw) && o.mw > 0;
  const success = hasMw ? total >= o.mw : null;
  const excess = hasMw ? total - o.mw : null;

  const result = { roll, total, n, passed, success, excess, leidenRoll, leidenTriggered, options: o };
  if (o.chat) result.message = await postPoolMessage(result);
  return result;
}

/** Extrahiere Würfelergebnisse für die Darstellung (Hazard-Kette hervorgehoben). */
export function diceSummary(roll) {
  const dice = [];
  for (const term of roll.dice) {
    const kind = term.flavor || "normal";
    let chain = [];
    for (const r of term.results) {
      if (!r.active && !r.exploded) continue;
      if (kind === "hazard") {
        chain.push(r.result);
        if (!r.exploded) {
          dice.push({ kind, value: chain.reduce((a, b) => a + b, 0), chain: chain.length > 1 ? chain.join("+") : null, max: chain.length > 1 });
          chain = [];
        }
      } else dice.push({ kind, value: r.result, max: r.result === 6, min: r.result === 1 });
    }
    if (chain.length) dice.push({ kind, value: chain.reduce((a, b) => a + b, 0), chain: chain.join("+"), max: true });
  }
  return dice;
}

export async function postPoolMessage(result, { template = "systems/noreturn/templates/chat/roll-card.hbs", speakerActor } = {}) {
  const o = result.options;
  const actor = speakerActor ?? o.actor;
  const data = {
    label: o.label,
    subtitle: o.subtitle,
    total: result.total,
    n: result.n,
    passed: result.passed,
    dice: result.passed ? [] : diceSummary(result.roll),
    extraDice: result.passed ? diceSummary(result.roll) : [],
    points: o.points,
    mw: o.mw,
    success: result.success,
    excess: result.excess,
    leiden: o.leiden,
    leidenValue: result.leidenRoll?.total,
    leidenTriggered: result.leidenTriggered,
    multiplier: o.multiplier !== 1 ? o.multiplier : null,
    bonusDice: o.bonusDice,
    malusDice: o.malusDice,
    extraHtml: o.extraHtml,
    canReroll: !!o.rerollData && actor && (actor.system.adrenalinLeft > 0 || actor.system.meditationLeft > 0),
    reroll: !!o.rerollData
  };
  const content = await renderTemplate(template, data);
  const flags = foundry.utils.mergeObject({ noreturn: { total: result.total, success: result.success, excess: result.excess } }, o.flags ?? {});
  if (o.rerollData) flags.noreturn.reroll = o.rerollData;
  const msgData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [result.roll],
    flags,
    sound: CONFIG.sounds.dice
  };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/** Sichtbarkeitsmodus anwenden – v14 nutzt applyMode/messageMode, v13 applyRollMode/rollMode. */
export function applyChatMode(msgData) {
  const cls = ChatMessage.implementation ?? ChatMessage;
  if (typeof cls.applyMode === "function") cls.applyMode(msgData);
  else cls.applyRollMode(msgData, game.settings.get("core", "rollMode"));
  return msgData;
}

/**
 * Einfache Würfelprobe ohne Pool (z. B. 2W6 Trefferzone).
 */
export async function simpleRoll(formula) {
  return new Roll(formula).evaluate();
}

/** Würfle eine Trefferzone (2W6, S. 90). Optional auf eine Körperhälfte eingeschränkt. */
export async function rollHitZone(half = null) {
  for (let i = 0; i < 50; i++) {
    const r = await new Roll("2d6").evaluate();
    const zone = String(r.total);
    if (!half || NR.zones[zone].halves.includes(half)) return { zone, roll: r };
  }
  return { zone: "7", roll: null };
}
