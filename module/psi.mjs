import { NR } from "./config.mjs";
import { rollPool, applyChatMode, diceSummary, postPoolMessage, rollHitZone } from "./dice/pool.mjs";
import { appTiming, appEffectSpec, durationText, evalFormula, addTimedEffect } from "./timed.mjs";
import { applyBuffTo, applyDamageTo } from "./socket.mjs";

const SYSTEM_ID = "noreturn";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

/** Ersetze KS-Ausdrücke im Effekttext durch berechnete Werte. */
export function resolveKsText(text, ks) {
  if (!text) return "";
  const re = /(\d+)\s*[–−-]\s*KS|KS\s*[x×]\s*(\d+)|KS\s*\/\s*2|KS\s*[–−-]\s*(\d+)|\bKS\b/g;
  return text.replace(re, (m, a, b, c) => {
    let v;
    if (a) v = Number(a) - ks;
    else if (b) v = ks * Number(b);
    else if (m.includes("/")) v = Math.floor(ks / 2);
    else if (c) v = Math.max(0, ks - Number(c));
    else v = ks;
    return `<strong class="nr-ks" data-tooltip="${m}">${v}</strong>`;
  });
}

/** Metamorphose: +1 KS für Apps der Kraft, deren Element der Körper gerade angenommen hat. */
function metamorphoseKs(actor, app) {
  const active = (actor.system.styleVariants?.metamorphose ?? []).some(v => v.active && NR.psiPowerFromText(v.variant) === app.system.power);
  return active ? 1 : 0;
}

function powerFor(actor, app) {
  return actor.items.find(i => i.type === "psiPower" && i.system.key === app.system.power);
}

/**
 * PSI-App wirken (S. 194).
 */
export async function castPsiApp(actor, app) {
  const power = powerFor(actor, app);
  if (!power) return ui.notifications.warn(game.i18n.format("NR.Psi.NoPower", { power: NR.psiPowers[app.system.power]?.label ?? app.system.power }));
  if (actor.items.some(i => i.type === "abnormality" && i.name.toLowerCase().startsWith("psionische abartigkeit"))) {
    return ui.notifications.warn(game.i18n.localize("NR.Psi.Abnormal"));
  }
  if (actor.statuses?.has("nrPsiLock")) return ui.notifications.warn(game.i18n.localize("NR.Psi.Locked"));
  if (actor.statuses?.has("nrIncapacitated") || actor.statuses?.has("nrUnconscious")) return ui.notifications.warn(game.i18n.localize("NR.Psi.Incapacitated"));
  const level = power.system.value;
  const collected = actor.system.combat.psiCollected;
  const s = app.system;

  const content = await renderTemplate("systems/noreturn/templates/dialog/psi-dialog.hbs", {
    app, power, level, collected, min: s.min, max: s.max, diff: NR.psiDifficulties[s.difficulty]?.label,
    adrenalinLeft: actor.system.adrenalinLeft, adrenalinBonus: actor.system.adrenalinBonus,
    meditationLeft: actor.system.meditationLeft, meditationBonus: Math.min(5, actor.system.meditationMax),
    woundMalus: actor.getMalus({ psi: true }),
    defaultKs: collected > 0 ? 0 : 1,
    defaultProbe: Math.min(level, 3),
    boosterKs: 0,
    hold: actor.system.psiHold(app), memorum: actor.system.psiHold(app) < s.hold,
    multiTarget: actor.styleLevel("psionischeVielfaeltigkeit") > 0, metamorphose: metamorphoseKs(actor, app) > 0
  });

  const opts = await DialogV2.wait({
    window: { title: `${game.i18n.localize("NR.Psi.Cast")}: ${app.name}`, icon: "fa-solid fa-brain" },
    classes: ["noreturn", "nr-roll-dialog", "nr-psi-dialog"],
    position: { width: 460 },
    content,
    buttons: [{
      action: "cast", label: game.i18n.localize("NR.Psi.Cast"), icon: "fa-solid fa-brain", default: true,
      callback: (event, button) => {
        const f = button.form.elements;
        return {
          ks: Number(f.ks.value) || 0,
          probe: Number(f.probe.value) || 0,
          booster: Number(f.booster.value) || 0,
          extraTargets: Math.max(0, Number(f.extraTargets?.value) || 0),
          useAdrenalin: f.useAdrenalin?.checked ?? false,
          useMeditation: f.useMeditation?.checked ?? false
        };
      }
    }, { action: "cancel", label: game.i18n.localize("Cancel") }],
    render: (event, dialog) => {
      const el = dialog.element;
      const update = () => {
        const f = el.querySelector("form")?.elements ?? {};
        let pool = level;
        if (f.useAdrenalin?.checked) pool += actor.system.adrenalinBonus;
        if (f.useMeditation?.checked) pool += Math.min(5, actor.system.meditationMax);
        const ks = Number(f.ks?.value) || 0;
        const probe = Number(f.probe?.value) || 0;
        const comp = pool - ks - probe;
        const out = el.querySelector("[data-psi-summary]");
        const finalKs = Math.max(0, ks + collected + (Number(f.booster?.value) || 0) + metamorphoseKs(actor, app) - (Number(f.extraTargets?.value) || 0));
        if (out) {
          out.innerHTML = comp < 0
            ? `<span class="nr-bad">${game.i18n.format("NR.Psi.TooMany", { pool })}</span>`
            : game.i18n.format("NR.Psi.Summary", { pool, ks: finalKs, probe, comp, min: s.min - comp, max: s.max + comp });
        }
        const btn = el.querySelector("button[data-action=cast]");
        if (btn) btn.disabled = comp < 0 || finalKs < 1 || probe < 1;
      };
      el.querySelectorAll("input").forEach(i => i.addEventListener("input", update));
      el.querySelectorAll("input[type=checkbox]").forEach(i => i.addEventListener("change", update));
      update();
    }
  }).then(r => (r === "cancel" ? null : r)).catch(() => null);
  if (!opts) return null;

  let pool = level;
  if (opts.useAdrenalin && await actor.spendAdrenalin()) pool += actor.system.adrenalinBonus;
  if (opts.useMeditation && await actor.spendAdrenalin("meditation")) pool += Math.min(5, actor.system.meditationMax);
  const comp = Math.max(0, pool - opts.ks - opts.probe);
  // Metamorphose: +1 KS für Apps der gewählten Kraft; Psionische Vielfältigkeit: −1 effektive KS je zusätzlichem Ziel
  const meta = metamorphoseKs(actor, app);
  const ks = Math.max(1, opts.ks + collected + opts.booster + meta - opts.extraTargets);

  // Probe: gewählte Würfel, ein Hazard-Di, Mali durch Wunden verringern die Probewürfel (1-Würfel-Regel)
  const malus = actor.getMalus({ psi: true });
  const res = await rollPool({ actor, label: app.name, dice: opts.probe, malusDice: malus, chat: false });
  const total = res.total;
  const lo = s.min - comp;
  const hi = s.max + comp;
  const success = total >= lo && total <= hi;

  const updates = { "system.combat.psiCollected": 0 };
  await actor.update(updates);
  if (success && s.hold > 0) await app.update({ "system.held": true });

  let fail = null;
  const damageForFail = s.damageMult ? {
    amount: ks * s.damageMult, zones: s.allZones ? Object.keys(NR.zones) : null,
    attack: { pierce: s.pierce || "", damageType: "psi", nonLethal: false, structure: false, continuous: false }, weaponName: app.name
  } : null;

  if (!success) {
    fail = await rollPsiFail(ks, { post: false });
    fail.lines = await applyPsiFail(actor, fail, { app, damage: damageForFail });
  }

  let effectHtml = success ? resolveKsText(s.effect || "", ks) : "";
  const timing = success ? appTiming(app, ks) : null;
  if (timing) effectHtml += await applyAppTiming(actor, app, ks, timing);
  if (success) effectHtml += await spawnPsiWeapons(actor, app, ks);
  const damagePayload = success && s.damageMult ? {
    kind: "damage", amount: ks * s.damageMult, zones: s.allZones ? Object.keys(NR.zones) : null,
    attack: { pierce: s.pierce || "", damageType: "psi", nonLethal: false, structure: false, continuous: false },
    weaponName: app.name
  } : null;

  const content2 = await renderTemplate("systems/noreturn/templates/chat/psi-card.hbs", {
    app, power, ks, comp, total, lo, hi, success, probe: opts.probe, malus, pool,
    dice: diceSummary(res.roll), effectHtml, description: s.effect ? "" : await enrich(s.description, app),
    extraTargets: opts.extraTargets, meta,
    fail, held: success && s.hold > 0, hold: actor.system.psiHold(app), targets: Array.from(game.user.targets).map(t => ({ uuid: t.document.uuid, name: t.name })),
    damage: damagePayload
  });
  const msgData = {
    speaker: ChatMessage.getSpeaker({ actor }), content: content2, rolls: [res.roll, ...(fail?.rolls ?? [])],
    flags: { noreturn: { psi: { appId: app.id, power: s.power, ks, success, damage: damagePayload } } }
  };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/**
 * Dauer bzw. Schaden über Zeit einer gewirkten App als zeitlich begrenzten Effekt anlegen (auf die Wirkende selbst
 * oder die markierten Ziele) und eine Zeile für die Chatkarte liefern.
 */
async function applyAppTiming(actor, app, ks, timing) {
  const spec = appEffectSpec(app, ks, timing);
  const targets = timing.target === "self" ? [actor] : Array.from(game.user.targets).map(t => t.actor).filter(Boolean);
  const parts = [];
  if (timing.value != null) parts.push(game.i18n.format("NR.Timed.DurationText", { text: durationText(timing.value, timing.unit) }));
  if (timing.tick) parts.push(game.i18n.format(timing.tick.cumulative ? "NR.Timed.TickCumulative" : "NR.Timed.Tick", { n: timing.tick.amount }));
  let note;
  if (!targets.length) note = game.i18n.localize("NR.Timed.NoTargets");
  else {
    const done = [], failed = [];
    for (const t of targets) {
      const result = await applyBuffTo(t.uuid, { kind: "timed", spec });
      (result === "unavailable" ? failed : done).push(foundry.utils.escapeHTML(t.name));
    }
    const notes = [];
    if (done.length) notes.push(game.i18n.format("NR.Timed.AppliedTo", { names: done.join(", ") }));
    if (failed.length) notes.push(game.i18n.format("NR.Timed.AppUnavailable", { names: failed.join(", ") }));
    note = notes.join("; ");
  }
  return `<p class="nr-hint"><i class="fa-solid fa-hourglass-half"></i> ${parts.join(" · ")} — ${note}</p>`;
}

/** Flag-Schlüssel an erzeugten Waffen-Items: ID der App, an deren Haltung sie hängen. */
const PSI_WEAPON_FLAG = "psiWeapon";

/**
 * Waffe(n) der App (system.weapon) als Items am Actor anlegen. Vorhandene Waffen derselben App werden ersetzt;
 * sie bleiben, solange die App gehalten wird (siehe removePsiWeapons / Hooks in noreturn.mjs).
 * @returns {Promise<string>} Zeile für die Chatkarte (leer, wenn die App keine Waffe erzeugt)
 */
async function spawnPsiWeapons(actor, app, ks) {
  const w = app.system.weapon;
  if (!w?.count) return "";
  await removePsiWeapons(actor, app.id);
  const attackDice = evalFormula(w.attackDice, { ks }) ?? 0;
  const parryDice = evalFormula(w.parryDice, { ks }) ?? 0;
  const points = evalFormula(w.damage, { ks }) ?? 0;
  const name = w.name || app.name;
  const data = Array.from({ length: w.count }, () => ({
    name, type: "weapon", img: app.img,
    system: {
      category: "nahkampf", damageType: w.damageType, attackDice, parryDice, twoHanded: !!w.twoHanded, equipped: true,
      damage: { strength: !!w.strength, points },
      description: `<p>${foundry.utils.escapeHTML(app.name)} (KS ${ks})</p>`
    },
    flags: { [SYSTEM_ID]: { [PSI_WEAPON_FLAG]: app.id, noSync: true } }
  }));
  const created = await actor.createEmbeddedDocuments("Item", data, { nrSkipGrants: true });
  const parts = [`${created.length}× ${foundry.utils.escapeHTML(name)}`];
  if (attackDice) parts.push(game.i18n.format("NR.Psi.WeaponAttack", { n: attackDice }));
  if (parryDice) parts.push(game.i18n.format("NR.Psi.WeaponParry", { n: parryDice }));
  parts.push(created[0]?.system.damageLabel ?? "");
  return `<p class="nr-hint"><i class="fa-solid fa-hand-fist"></i> ${game.i18n.localize("NR.Psi.WeaponCreated")}: ${parts.join(" · ")}</p>`;
}

/** Von einer App erzeugte Waffen vom Actor entfernen (App nicht mehr gehalten oder gelöscht). */
export async function removePsiWeapons(actor, appId) {
  const ids = actor?.items.filter(i => i.type === "weapon" && i.getFlag(SYSTEM_ID, PSI_WEAPON_FLAG) === appId).map(i => i.id) ?? [];
  if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
}

/** Alle gehaltenen PSI-Apps beenden (der Hook „updateItem“ entfernt erzeugte Waffen). */
async function releaseHeldApps(actor) {
  const held = actor.items.filter(i => i.type === "psiApp" && i.system.held);
  if (!held.length) return;
  await actor.updateEmbeddedDocuments("Item", held.map(i => ({ _id: i.id, "system.held": false })));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="nr-card"><p class="nr-hint"><i class="fa-solid fa-hourglass-end"></i> ${game.i18n.format("NR.Psi.HeldEnded", { name: esc(actor.name), apps: held.map(i => esc(i.name)).join(", ") })}</p></div>`
  });
}

/** Erzeugte Waffen verschwinden, wenn die App nicht mehr gehalten oder gelöscht wird. */
export function registerPsiHooks() {
  Hooks.on("updateItem", (item, changed, options, userId) => {
    if (userId !== game.user.id || item.type !== "psiApp" || !item.actor) return;
    if (foundry.utils.getProperty(changed, "system.held") === false) removePsiWeapons(item.actor, item.id).catch(err => console.error("NoReturn 2E | PSI-Waffen:", err));
  });
  // Haltung endet bei Bewusstlosigkeit und PSI-Lähmung (S. 193, 196)
  Hooks.on("createActiveEffect", (effect, options, userId) => {
    const actor = effect.parent;
    if (userId !== game.user.id || actor?.documentName !== "Actor") return;
    if (!effect.statuses.has("nrUnconscious") && !effect.statuses.has("nrPsiLock")) return;
    releaseHeldApps(actor).catch(err => console.error("NoReturn 2E | PSI-Haltung beenden:", err));
  });
  Hooks.on("deleteItem", (item, options, userId) => {
    if (userId !== game.user.id || item.type !== "psiApp" || !item.actor) return;
    removePsiWeapons(item.actor, item.id).catch(err => console.error("NoReturn 2E | PSI-Waffen:", err));
  });
}

async function enrich(html, doc) {
  const TE = foundry.applications.ux.TextEditor.implementation;
  return TE.enrichHTML(html ?? "", { relativeTo: doc, secrets: doc.isOwner });
}

/**
 * Würfle auf der PSI-Fehlschlagtabelle (S. 196).
 * @returns {{results: {roll: number, text: string}[], rolls: Roll[]}}
 */
export async function rollPsiFail(ks, { post = true, actor = null, depth = 0, overload = false } = {}) {
  const rolls = [];
  const results = [];
  let r = await new Roll("2d6").evaluate();
  rolls.push(r);
  // Overload (S. 196): „Der eigene Arsch“ und „Weit gefehlt“ setzen eine App voraus – neu würfeln
  while (overload && (r.total === 3 || r.total === 4)) {
    r = await new Roll("2d6").evaluate();
    rolls.push(r);
  }
  const text = NR.psiFailTable[r.total]
    .replace("{ks2}", ks * 2).replace("{ks5}", ks * 5).replace("{ks10}", ks * 10).replace("{ks30}", ks * 30).replaceAll("{ks}", ks);
  results.push({ roll: r.total, text });
  if (r.total === 2 && depth < 3) {
    for (let i = 0; i < ks; i++) {
      const sub = await rollPsiFail(ks, { post: false, depth: depth + 1, overload });
      rolls.push(...sub.rolls);
      results.push(...sub.results.map(x => ({ ...x, echo: true })));
    }
  }
  const out = { results, rolls, ks };
  if (post) {
    const content = await renderTemplate("systems/noreturn/templates/chat/psi-fail.hbs", out);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls });
  }
  return out;
}

const esc = text => foundry.utils.escapeHTML(String(text ?? ""));

/** Zufällige Auswahl von bis zu n Elementen ohne Zurücklegen. */
function pickRandom(list, n) {
  const pool = [...list];
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/** Tokens der aktuellen Szene mit Kreatur-Actor, außer dem Wirker. */
function otherTokens(actor) {
  return (canvas?.tokens?.placeables ?? []).filter(t => t.actor && t.actor.type !== "vehicle" && t.actor.uuid !== actor.uuid && !t.document.hidden)
    .filter((t, i, all) => all.findIndex(o => o.actor.uuid === t.actor.uuid) === i);
}

/**
 * Folgen der PSI-Fehlschlagtabelle (S. 196) am Wirker (und, wo das Ergebnis es verlangt, an weiteren Tokens) anwenden.
 * Schaden läuft über den normalen Schadenswiderstand ohne Dialog; was sich nicht automatisieren lässt, erscheint als Hinweis.
 * @param {Actor} actor   Wirker
 * @param {{results: {roll: number}[], ks: number}} fail  Ergebnis von rollPsiFail
 * @param {{app?: Item, damage?: object}} [ctx]  gewirkte App und ihr Schaden (für „Der eigene Arsch“/„Weit gefehlt“)
 * @returns {Promise<string[]>} Zeilen (HTML) für die Chatkarte
 */
export async function applyPsiFail(actor, fail, { app = null, damage = null } = {}) {
  if (!actor || !fail?.results?.length) return [];
  const L = key => game.i18n.localize(key);
  const F = (key, data) => game.i18n.format(key, data);
  const lines = [];
  const ks = fail.ks;
  const attack = { pierce: "", damageType: "psi", nonLethal: false, structure: false, continuous: false };
  const allZones = Object.keys(NR.zones);
  const hit = async (target, amount, zones, label, atk = attack) => {
    if (!(amount > 0)) return;
    if (target === actor) await actor.resistDamage({ amount, zones, attack: atk, label, skipDialog: true });
    else await applyDamageTo(target.uuid, { amount, zones, attack: atk, label, skipDialog: true });
  };
  const label = L("NR.Psi.FailTable");

  for (const { roll } of fail.results) {
    try {
      switch (roll) {
        case 3: // Der eigene Arsch
          if (damage) {
            await actor.resistDamage({ amount: damage.amount, zones: damage.zones ?? [(await rollHitZone()).zone], attack: damage.attack, label: damage.weaponName, skipDialog: true });
            lines.push(F("NR.Psi.FailApplied.self", { app: esc(app?.name) }));
          } else lines.push(F("NR.Psi.FailManual.self", { app: esc(app?.name ?? "") }));
          break;
        case 4: { // Weit gefehlt
          const targets = pickRandom(otherTokens(actor), ks);
          if (!targets.length) { lines.push(L("NR.Psi.FailApplied.noTargets")); break; }
          const names = targets.map(t => esc(t.name)).join(", ");
          if (damage) {
            const amount = damage.amount / Math.max(1, ks);
            for (const t of targets) await hit(t.actor, amount, damage.zones ?? [(await rollHitZone()).zone], damage.weaponName, damage.attack);
            lines.push(F("NR.Psi.FailApplied.stray", { names }));
          } else lines.push(F("NR.Psi.FailManual.stray", { names, app: esc(app?.name ?? "") }));
          break;
        }
        case 5:
          await addTimedEffect(actor, { name: L("NR.Psi.FailEffect.dream"), img: "icons/svg/daze.svg", value: ks * 2, unit: "round", statuses: ["nrIncapacitated"], source: label });
          lines.push(F("NR.Psi.FailApplied.incapacitated", { n: ks * 2 }));
          break;
        case 6:
          await addTimedEffect(actor, { name: L("NR.Psi.FailEffect.paralysis"), img: "icons/svg/paralysis.svg", value: ks, unit: "round", statuses: ["nrIncapacitated"], source: label });
          lines.push(F("NR.Psi.FailApplied.aware", { n: ks }));
          break;
        case 7: {
          const zones = pickRandom(allZones, 2);
          await hit(actor, ks * 5, zones, L("NR.Psi.FailEffect.bam"));
          lines.push(F("NR.Psi.FailApplied.bam", { m: ks * 2 }));
          break;
        }
        case 8:
          await addTimedEffect(actor, { name: L("NR.Psi.FailEffect.psiLock"), img: "icons/svg/silenced.svg", value: ks, unit: "round", statuses: ["nrPsiLock"], source: label });
          lines.push(F("NR.Psi.FailApplied.psiLock", { n: ks }));
          break;
        case 9:
          await hit(actor, ks * 10, ["12"], L("NR.Psi.FailEffect.pain"));
          lines.push(L("NR.Psi.FailApplied.pain"));
          break;
        case 10:
          await actor.update({ "system.psyche.loss": actor.system.psyche.loss + ks });
          lines.push(F("NR.Psi.FailApplied.psyche", { n: ks }));
          break;
        case 11:
          await actor.update({ "system.organismus.loss": actor.system.organismus.loss + ks });
          lines.push(F("NR.Psi.FailApplied.organism", { n: ks }));
          break;
        case 12: {
          const radius = ks * 2;
          const caster = actor.getActiveTokens?.()[0];
          const near = caster ? otherTokens(actor).filter(t => {
            try { return canvas.grid.measurePath([caster.center, t.center]).distance <= radius; } catch (err) { return false; }
          }) : [];
          await hit(actor, ks * 30, allZones, L("NR.Psi.FailEffect.whiteLight"));
          for (const t of near) await hit(t.actor, ks * 30, allZones, L("NR.Psi.FailEffect.whiteLight"));
          lines.push(F("NR.Psi.FailApplied.whiteLight", { m: radius, names: near.length ? near.map(t => esc(t.name)).join(", ") : L("NR.Psi.FailApplied.nobody") }));
          break;
        }
        default: break; // 2 (Echo) ist bereits aufgelöst
      }
    } catch (err) {
      console.error("NoReturn 2E | PSI-Fehlschlag anwenden:", err);
    }
  }
  return lines;
}

/**
 * Kraft sammeln (S. 194): Willenskraft gegen MW 20 (+10 je bereits gesammelter KS).
 */
export async function collectPower(actor) {
  if (actor.statuses?.has("nrPsiLock")) return ui.notifications.warn(game.i18n.localize("NR.Psi.Locked"));
  if (actor.statuses?.has("nrIncapacitated") || actor.statuses?.has("nrUnconscious")) return ui.notifications.warn(game.i18n.localize("NR.Psi.Incapacitated"));
  const collected = actor.system.combat.psiCollected;
  const concentration = actor.items.some(i => i.type === "advantage" && i.name.toLowerCase().startsWith("konzentration"));
  const mw = 20 + collected * 10 - (concentration ? 5 : 0);
  const wk = actor.system.skillList.willenskraft;
  const res = await rollPool({
    actor, label: game.i18n.localize("NR.Psi.Collect"), subtitle: `${actor.system.attr.wi.abbr} ${actor.system.attr.wi.total} + Willenskraft ${wk.value}`,
    dice: wk.pool, malusDice: actor.getMalus({ psi: true }), mw, chat: false, leiden: actor.system.attr.wi.leiden
  });
  if (res.success) {
    await actor.update({ "system.combat.psiCollected": collected + 1 });
    res.options.extraHtml = `<p class="nr-good">${game.i18n.format("NR.Psi.Collected", { ks: collected + 1 })}</p>`;
  } else {
    await actor.update({ "system.combat.psiCollected": 0 });
    const fail = collected > 0 ? await rollPsiFail(collected, { post: false, overload: true }) : null;
    if (fail) fail.lines = await applyPsiFail(actor, fail, {});
    res.options.extraHtml = `<p class="nr-bad">${game.i18n.localize("NR.Psi.Overload")}</p>` +
      (fail ? await renderTemplate("systems/noreturn/templates/chat/psi-fail.hbs", fail) : "");
  }
  return postPoolMessage(res);
}

/** Schaden einer PSI-App auf ein Ziel anwenden (Button im Chat). */
export async function applyPsiDamage(message, tokenUuid) {
  const payload = message.flags.noreturn?.psi?.damage;
  if (!payload) return;
  const tokenDoc = await fromUuid(tokenUuid);
  const actor = tokenDoc?.actor;
  if (!actor) return;
  if (!actor.isOwner) return ui.notifications.warn(game.i18n.localize("NR.Notify.NotOwner"));
  let amount = payload.amount;
  // Kat. A (alle Kräfte außer Kategorie B): Psionische Abartigkeit/Transzendenz sind immun, PSI-Resistenz senkt die Kraftstufe um 2 (S. 148–161)
  if (message.flags.noreturn?.psi?.power !== "kategorieB") {
    const has = prefix => actor.items.some(i => i.type === "abnormality" && i.name.toLowerCase().startsWith(prefix));
    if (has("psionische abartigkeit") || has("psionische transzendenz")) {
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p class="nr-hint">${game.i18n.format("NR.Psi.Immune", { name: foundry.utils.escapeHTML(actor.name), app: foundry.utils.escapeHTML(payload.weaponName ?? "") })}</p>` });
      return;
    }
    const ks = message.flags.noreturn?.psi?.ks;
    if (has("psi-resistenz") && ks > 0) {
      amount = Math.round(amount / ks * Math.max(0, ks - 2));
      if (amount <= 0) {
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p class="nr-hint">${game.i18n.format("NR.Psi.Resisted", { name: foundry.utils.escapeHTML(actor.name), app: foundry.utils.escapeHTML(payload.weaponName ?? "") })}</p>` });
        return;
      }
    }
  }
  const zones = payload.zones ?? [(await rollHitZone()).zone];
  return actor.resistDamage({ amount, zones, attack: payload.attack, label: payload.weaponName });
}
