/**
 * Zeitabhängige Effekte: zeitlich begrenzte ActiveEffects (Dauer in Kampfrunden, Minuten, Stunden, Tagen),
 * Schaden über Zeit je Kampfrunde sowie Abläufe, die mit der Weltzeit (Zeitsteuerung, Hook `noreturn.timeAdvanced`) mitlaufen:
 * natürliche Heilung, Langzeit-Medikation, Blutpunkte bei Sonnenaufgang, Aufladung von Bio-Eigenschaften, Rast.
 *
 * Ablauf: Jeder Effekt trägt im Flag `noreturn.timed` seinen Ablaufzeitpunkt in Weltzeit (`expiresAt`). Ist der automatische
 * Zeitverlauf aus, zählen Rundeneffekte stattdessen mit dem Kampf-Tracker herunter (`roundsLeft`). Zusätzlich wird die
 * Foundry-Dauer gesetzt, damit die Restzeit im Token-HUD und am Effekt sichtbar ist.
 */
import { NR } from "./config.mjs";
import { TIME, getDate, advance } from "./time.mjs";
import { rollHitZone } from "./dice/pool.mjs";

const SYSTEM_ID = "noreturn";
const L = key => game.i18n.localize(key);
const F = (key, data) => game.i18n.format(key, data);
const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);

/** Einheiten der Dauer in Sekunden. */
export const UNIT_SECONDS = { round: TIME.roundSeconds, minute: 60, hour: 3600, day: 86400 };

/* -------------------------------------------- */
/*  Hilfsfunktionen                              */
/* -------------------------------------------- */

/** Änderung „addiere n auf <key>“ (v13: mode, v14: type). */
export function addChange(key, n) {
  const base = { key, value: String(n) };
  return game.release?.generation >= 14 ? { ...base, type: "add" } : { ...base, mode: CONST.ACTIVE_EFFECT_MODES.ADD };
}

/**
 * Wertet eine einfache Formel mit KS aus („KS*2“, „30-KS“, „10-KS“, „5“). Ergebnis ganzzahlig und nie negativ.
 * @returns {number|null}  null bei leerer oder ungültiger Formel
 */
export function evalFormula(formula, { ks = 0 } = {}) {
  const text = String(formula ?? "").trim();
  if (!text) return null;
  const expr = text.replace(/\bKS\b/g, String(ks)).replace(/[x×]/g, "*");
  if (!/^[\d+\-*/().\s]+$/.test(expr)) return null;
  try {
    const total = new Roll(expr).evaluateSync().total;
    return Number.isFinite(total) ? Math.max(0, Math.floor(total)) : null;
  } catch (err) {
    return null;
  }
}

/** Dauer als lesbarer Text, z. B. „3 Minuten“. */
export function durationText(value, unit) {
  return F(`NR.Timed.Unit.${unit}`, { n: value });
}

/** Restzeit in Sekunden in kompakter Schreibweise („2 h 30 min“, „4 KR“). */
export function remainingText(seconds) {
  if (seconds <= 0) return "0";
  if (seconds < 60) return F("NR.Timed.Short.rounds", { n: Math.ceil(seconds / TIME.roundSeconds) });
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(F("NR.Timed.Short.days", { n: d }));
  if (h) parts.push(F("NR.Timed.Short.hours", { n: h }));
  if (m && !d) parts.push(F("NR.Timed.Short.minutes", { n: m }));
  return parts.join(" ") || F("NR.Timed.Short.minutes", { n: 1 });
}

/** Alle Actors, die betroffen sein können: Welt-Actors plus Token-Actors der aktuellen Szene (ohne Verknüpfung). */
export function allActors() {
  const set = new Set(game.actors.contents);
  for (const t of canvas?.scene?.tokens ?? []) if (t.actor && !t.actorLink) set.add(t.actor);
  return [...set];
}

const isCreature = actor => actor && actor.type !== "vehicle";
const gmOnly = () => game.user.isGM && game.users.activeGM?.id === game.user.id;

function gmWhisper(content, { actors = [] } = {}) {
  const ids = new Set(game.users.filter(u => u.isGM).map(u => u.id));
  for (const a of actors) for (const u of game.users) if (a.testUserPermission(u, "OWNER")) ids.add(u.id);
  return ChatMessage.create({ content, whisper: [...ids] });
}

/* -------------------------------------------- */
/*  Zeitlich begrenzte Effekte                   */
/* -------------------------------------------- */

/**
 * Legt einen zeitlich begrenzten ActiveEffect am Actor an (nur Spielleitung oder Besitzer).
 * @param {Actor} actor
 * @param {object} spec
 * @param {string} spec.name
 * @param {string} [spec.img]
 * @param {number|null} [spec.value]   Dauer; null = unbegrenzt (nur Schaden über Zeit o. Ä., wird von Hand beendet)
 * @param {"round"|"minute"|"hour"|"day"} [spec.unit]
 * @param {object[]} [spec.changes]    ActiveEffect-Änderungen
 * @param {{amount:number, cumulative?:boolean, damageType?:string, zones?:string, pierce?:string}} [spec.tick]  Schaden je Kampfrunde
 * @param {string} [spec.description]
 * @param {string} [spec.source]       Herkunft (Name der App, des Style-Skills …)
 * @returns {Promise<ActiveEffect|null>}
 */
export async function addTimedEffect(actor, spec) {
  if (!actor) return null;
  const { value = null, unit = "minute" } = spec;
  const seconds = value == null ? null : value * (UNIT_SECONDS[unit] ?? 60);
  const timed = {
    unit, value, seconds,
    expiresAt: seconds == null ? null : game.time.worldTime + seconds,
    rounds: unit === "round" && value != null ? value : null,
    roundsLeft: unit === "round" && value != null ? value : null,
    tick: spec.tick ?? null, ticks: 0,
    source: spec.source ?? spec.name
  };
  const data = {
    name: spec.name, img: spec.img ?? "icons/svg/clockwork.svg", description: spec.description ?? "",
    changes: spec.changes ?? [], flags: { [SYSTEM_ID]: { timed } }
  };
  const v14 = game.release?.generation >= 14;
  const withDuration = seconds == null ? data : { ...data, duration: v14 ? { value: seconds, units: "seconds" } : { seconds } };
  try {
    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [withDuration]);
    return effect ?? null;
  } catch (err) {
    // Notfalls ohne Foundry-Dauer anlegen; der Ablauf läuft ohnehin über das Flag.
    console.warn("NoReturn 2E | Effekt mit Dauer abgelehnt, lege ihn ohne Foundry-Dauer an:", err);
    const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return effect ?? null;
  }
}

/** Zeitlich begrenzte Effekte eines Actors (mit Restzeit) für Charakterbogen und Chat. */
export function timedEffects(actor) {
  const now = game.time.worldTime;
  const auto = game.settings.get(SYSTEM_ID, "timeAuto");
  return actor.effects.filter(e => e.getFlag(SYSTEM_ID, "timed")).map(e => {
    const t = e.getFlag(SYSTEM_ID, "timed");
    let remaining = null;
    if (t.rounds != null && !auto) remaining = F("NR.Timed.Short.rounds", { n: Math.max(0, t.roundsLeft ?? 0) });
    else if (t.expiresAt != null) remaining = remainingText(t.expiresAt - now);
    return { id: e.id, name: e.name, img: e.img, remaining: remaining ?? L("NR.Timed.Open"), tick: !!t.tick };
  });
}

/** Zeitlich begrenzten Effekt von Hand beenden. */
export async function endTimedEffect(actor, effectId) {
  const effect = actor.effects.get(effectId);
  if (effect) await effect.delete();
}

/** Abgelaufene Effekte entfernen und melden. */
async function removeExpired(list) {
  const byActor = new Map();
  for (const { actor, effect } of list) {
    if (!actor.effects.has(effect.id)) continue;
    await effect.delete();
    if (!byActor.has(actor)) byActor.set(actor, []);
    byActor.get(actor).push(effect.name);
  }
  if (!byActor.size) return;
  const rows = [...byActor].map(([actor, names]) => `<li><strong>${esc(actor.name)}</strong>: ${names.map(esc).join(", ")}</li>`).join("");
  await gmWhisper(`<div class="nr-card"><h3><i class="fa-solid fa-hourglass-end"></i> ${esc(L("NR.Timed.Expired"))}</h3><ul>${rows}</ul></div>`, { actors: [...byActor.keys()] });
}

/** Weltzeit hat sich bewegt: abgelaufene Effekte entfernen. */
async function expireByTime(now) {
  const auto = game.settings.get(SYSTEM_ID, "timeAuto");
  const due = [];
  for (const actor of allActors()) {
    for (const effect of actor.effects) {
      const t = effect.getFlag(SYSTEM_ID, "timed");
      if (!t || t.expiresAt == null) continue;
      if (t.rounds != null && !auto) continue; // zählt mit dem Kampf-Tracker
      if (t.expiresAt <= now) due.push({ actor, effect });
    }
  }
  await removeExpired(due);
}

/* -------------------------------------------- */
/*  Kampfrunden                                  */
/* -------------------------------------------- */

/** Schaden über Zeit eines Effekts anwenden. */
async function applyTick(actor, effect) {
  const t = effect.getFlag(SYSTEM_ID, "timed");
  const tick = t?.tick;
  if (!tick?.amount) return;
  const ticks = (t.ticks ?? 0) + 1;
  const amount = tick.cumulative ? tick.amount * ticks : tick.amount;
  const zones = tick.zones === "all" ? Object.keys(NR.zones) : [(await rollHitZone()).zone];
  await effect.setFlag(SYSTEM_ID, "timed.ticks", ticks);
  await actor.resistDamage({
    amount, zones, label: F("NR.Timed.TickLabel", { name: effect.name }), skipDialog: true,
    attack: { pierce: tick.pierce ?? "", damageType: tick.damageType ?? "hitze", nonLethal: false, structure: false, continuous: false }
  });
}

/** Neue Kampfrunde: Schaden über Zeit anwenden, bei ausgeschaltetem Zeitverlauf Rundeneffekte herunterzählen. */
async function onCombatRound(combat, delta) {
  const auto = game.settings.get(SYSTEM_ID, "timeAuto");
  const damage = game.settings.get(SYSTEM_ID, "timedDamage");
  const due = [];
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!isCreature(actor)) continue;
    for (const effect of [...actor.effects]) {
      const t = effect.getFlag(SYSTEM_ID, "timed");
      if (!t) continue;
      if (damage && t.tick) await applyTick(actor, effect);
      if (!auto && t.rounds != null) {
        const left = (t.roundsLeft ?? t.rounds) - delta;
        if (left <= 0) due.push({ actor, effect });
        else await effect.setFlag(SYSTEM_ID, "timed.roundsLeft", left);
      }
    }
  }
  await removeExpired(due);
}

/* -------------------------------------------- */
/*  Weltzeit: Abläufe                            */
/* -------------------------------------------- */

/** Wie oft wurde die Uhrzeit `hour` (Stunden, dezimal) zwischen zwei Weltzeiten überschritten? */
export function crossedDaily(from, to, hour) {
  const off = hour * 3600;
  return Math.floor((to - off) / TIME.secondsPerDay) - Math.floor((from - off) / TIME.secondsPerDay);
}

const nameHas = (item, ...parts) => parts.some(p => item.name.toLowerCase().includes(p));

/** Ruhezeit in Stunden, die ein Actor für eine Rast braucht (Frühaufsteher 4 h, Schlafmütze 8 h, sonst 6 h). */
export function restHours(actor) {
  const adv = actor.items.filter(i => i.type === "advantage");
  if (adv.some(i => nameHas(i, "schlafmütze"))) return 8;
  if (adv.some(i => nameHas(i, "frühaufsteher"))) return 4;
  return 6;
}

/** Natürliche Heilung je 24 Stunden verstrichener Zeit. */
async function naturalHealing(days) {
  const lines = [];
  const touched = [];
  for (const actor of allActors().filter(a => isCreature(a) && !a.system.awakened)) {
    const s = actor.system;
    const damaged = Object.keys(NR.zones).some(z => s.zones[z].damage > 0) || s.nonLethal > 0;
    if (!damaged) continue;
    const heal = await actor.healNatural({ days, silent: true });
    if (heal) { lines.push(F("NR.Timed.Healed", { name: actor.name, n: heal })); touched.push(actor); }
  }
  if (lines.length) await gmWhisper(`<div class="nr-card"><h3><i class="fa-solid fa-bandage"></i> ${esc(L("NR.Timed.NaturalHealing"))}</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`, { actors: touched });
}

/** Chronische Erkrankung: je Tag eine Dosis Langzeit-Medikation (20 Dosen je Packung), sonst −1 Organismus. */
async function chronicIllness(days) {
  const lines = [];
  for (const actor of allActors().filter(isCreature)) {
    if (!actor.items.some(i => i.type === "advantage" && i.name.toLowerCase().startsWith("chronische erkrankung"))) continue;
    const pack = actor.items.find(i => nameHas(i, "langzeit-medikation") && i.system.quantity > 0);
    const perPack = 20;
    const left = pack ? (pack.getFlag(SYSTEM_ID, "doses") ?? pack.system.quantity * perPack) : 0;
    const used = Math.min(days, left);
    const missed = days - used;
    if (pack && used > 0) {
      const rest = left - used;
      await pack.update({ "system.quantity": Math.ceil(rest / perPack), [`flags.${SYSTEM_ID}.doses`]: rest });
    }
    if (missed > 0) await actor.update({ "system.organismus.loss": actor.system.organismus.loss + missed });
    lines.push(F(missed > 0 ? "NR.Timed.ChronicMissed" : "NR.Timed.ChronicOk", { name: actor.name, used, missed }));
  }
  if (lines.length) await gmWhisper(`<div class="nr-card"><h3><i class="fa-solid fa-pills"></i> ${esc(L("NR.Timed.Chronic"))}</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`);
}

/** iHMO: 1 Blutpunkt je Sonnenaufgang (bis zum Maximum). */
async function sunriseBlood(sunrises) {
  const lines = [];
  for (const actor of allActors().filter(isCreature)) {
    if (!actor.items.some(i => i.type === "abnormality" && /ihmo/i.test(i.name))) continue;
    const max = actor.system.bloodMax;
    if (!(max > 0)) continue;
    const cur = actor.system.blood.value;
    const next = Math.min(max, cur + sunrises);
    if (next === cur) continue;
    await actor.update({ "system.blood.value": next });
    lines.push(F("NR.Timed.BloodGain", { name: actor.name, n: next - cur, value: next, max }));
  }
  if (lines.length) await gmWhisper(`<div class="nr-card"><h3><i class="fa-solid fa-droplet"></i> ${esc(L("NR.Timed.Blood"))}</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`);
}

/** Bio-Eigenschaften mit Ladungen (Odemwaffe: alle 6 h eine Ladung) laden sich mit der Zeit auf. */
async function rechargeBio(seconds) {
  const lines = [];
  for (const actor of allActors().filter(isCreature)) {
    for (const item of actor.items.filter(i => i.type === "bioTrait" && i.system.recharge?.hours > 0 && i.system.charges.value < i.system.charges.max)) {
      const period = item.system.recharge.hours * 3600;
      const progress = (item.getFlag(SYSTEM_ID, "rechargeProgress") ?? 0) + seconds;
      const gain = Math.min(Math.floor(progress / period), item.system.charges.max - item.system.charges.value);
      const full = item.system.charges.value + gain >= item.system.charges.max;
      await item.update({
        "system.charges.value": item.system.charges.value + gain,
        [`flags.${SYSTEM_ID}.rechargeProgress`]: full ? 0 : progress - gain * period
      });
      if (gain) lines.push(F("NR.Timed.Recharged", { name: actor.name, item: item.name, n: gain, value: item.system.charges.value + gain, max: item.system.charges.max }));
    }
  }
  if (lines.length) await gmWhisper(`<div class="nr-card"><h3><i class="fa-solid fa-battery-half"></i> ${esc(L("NR.Timed.Recharge"))}</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`);
}

let queue = Promise.resolve();

/** Reaktion auf `noreturn.timeAdvanced` (läuft nur auf dem aktiven GM-Client). Vorwärtssprünge werden nacheinander abgearbeitet. */
async function onTimeAdvanced(info) {
  if (!gmOnly()) return;
  const { from, to, delta } = info;
  await expireByTime(to);
  if (delta <= 0 || !game.settings.get(SYSTEM_ID, "timedAutomation")) return;
  // Zeit seit dem letzten vollen Tag sammeln (Rückwärtssprünge zählen nicht)
  const accum = (game.settings.get(SYSTEM_ID, "timeAccum") ?? 0) + delta;
  const days = Math.floor(accum / TIME.secondsPerDay);
  await game.settings.set(SYSTEM_ID, "timeAccum", accum - days * TIME.secondsPerDay);
  await rechargeBio(delta);
  const sunrises = crossedDaily(from, to, TIME.sunrise);
  if (sunrises > 0) await sunriseBlood(sunrises);
  if (days > 0) {
    if (game.settings.get(SYSTEM_ID, "naturalHealing")) await naturalHealing(days);
    await chronicIllness(days);
  }
}

/* -------------------------------------------- */
/*  Rast                                         */
/* -------------------------------------------- */

/**
 * Rast: Zeit vorspulen und die Actors rasten lassen, die lang genug schlafen konnten.
 * @param {number} [hours=8]
 * @param {Actor[]} [actors]  Standard: Actors der markierten Tokens
 */
export async function restParty(hours = 8, actors = null) {
  if (!game.user.isGM) return ui.notifications.warn(L("NR.Time.GmOnly"));
  actors ??= [...new Map((canvas.tokens?.controlled ?? []).filter(t => isCreature(t.actor)).map(t => [t.actor.uuid, t.actor])).values()];
  if (!actors.length) return ui.notifications.warn(L("NR.Timed.RestNoTokens"));
  await advance({ hours });
  const ok = [], short = [];
  for (const actor of actors) {
    const need = restHours(actor);
    if (need <= hours) { await actor.rest(); ok.push(actor.name); } else short.push(`${actor.name} (${need} h)`);
  }
  const lines = [];
  if (ok.length) lines.push(`<li><i class="fa-solid fa-bed"></i> ${esc(F("NR.Timed.RestDone", { n: hours, names: ok.join(", ") }))}</li>`);
  if (short.length) lines.push(`<li class="nr-bad"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(F("NR.Timed.RestShort", { names: short.join(", ") }))}</li>`);
  await ChatMessage.create({ content: `<div class="nr-card"><h3>${esc(L("NR.Timed.Rest"))}</h3><ul>${lines.join("")}</ul></div>` });
  return { ok, short };
}

/* -------------------------------------------- */
/*  PSI-Apps                                     */
/* -------------------------------------------- */

/**
 * Dauer und Schaden über Zeit einer erfolgreich gewirkten PSI-App berechnen.
 * @returns {{value:number|null, unit:string, tick:object|null, target:string}|null}
 */
export function appTiming(app, ks) {
  const d = app.system.duration;
  if (!d || (!d.formula && !d.tick?.formula)) return null;
  const value = evalFormula(d.formula, { ks });
  const amount = evalFormula(d.tick?.formula, { ks });
  return {
    value, unit: d.unit, target: d.target,
    tick: amount ? { amount, cumulative: d.tick.cumulative, damageType: d.tick.damageType, zones: d.tick.zones, pierce: d.tick.pierce } : null
  };
}

/** Marker-/Schadenseffekt für eine PSI-App (als einfache Daten, damit er auch über die Spielleitung angelegt werden kann). */
export function appEffectSpec(app, ks, timing) {
  return {
    name: F("NR.Timed.AppEffect", { name: app.name, ks }), img: app.img, source: app.name,
    value: timing.value, unit: timing.unit, tick: timing.tick,
    description: `<p>${esc(app.name)} (KS ${ks})</p>`
  };
}

/* -------------------------------------------- */
/*  Registrierung                                */
/* -------------------------------------------- */

export function registerTimedSettings() {
  game.settings.register(SYSTEM_ID, "timedAutomation", {
    name: "NR.Settings.TimedAutomation", hint: "NR.Settings.TimedAutomationHint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "naturalHealing", {
    name: "NR.Settings.NaturalHealing", hint: "NR.Settings.NaturalHealingHint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "timedDamage", {
    name: "NR.Settings.TimedDamage", hint: "NR.Settings.TimedDamageHint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "timeAccum", { scope: "world", config: false, type: Number, default: 0 });
}

export function registerTimedHooks() {
  Hooks.on("noreturn.timeAdvanced", info => { queue = queue.then(() => onTimeAdvanced(info)).catch(err => console.error("NoReturn 2E | Zeitabläufe:", err)); });
  // Restzeit auf offenen Charakterbögen mitlaufen lassen
  Hooks.on("updateWorldTime", () => {
    for (const app of foundry.applications.instances.values()) {
      const doc = app.document;
      if (app.rendered && doc?.documentName === "Actor" && doc.effects?.some(e => e.getFlag(SYSTEM_ID, "timed"))) app.render();
    }
  });
  Hooks.on("updateCombat", (combat, changed, options) => {
    if (!gmOnly() || !("round" in changed)) return;
    if (options?.direction === -1 || !(changed.round > 0)) return; // zurückgeblättert oder Kampf noch nicht gestartet
    queue = queue.then(() => onCombatRound(combat, 1)).catch(err => console.error("NoReturn 2E | Kampfrunde:", err));
  });
}

/** Öffentliche API: `game.noreturn.timed`. */
export function timedApi() {
  return { addTimedEffect, timedEffects, endTimedEffect, evalFormula, restParty, restHours, crossedDaily, units: UNIT_SECONDS };
}
