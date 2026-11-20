import { NR } from "./config.mjs";
import { rollPool, rollHitZone, buildFormula, applyChatMode, postPoolMessage, diceSummary } from "./dice/pool.mjs";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

/* -------------------------------------------- */
/*  Hilfsfunktionen                              */
/* -------------------------------------------- */

/** Konvertiere deutsche Würfelnotation (2W6+180) in Foundry-Notation. */
export function toFormula(str) {
  return String(str ?? "").replace(/(\d*)\s*[Ww](\d+)/g, (m, n, f) => `${n || 1}d${f}`);
}

/** Entfernung zwischen zwei Tokens in Szeneneinheiten (Meter). */
function tokenDistance(a, b) {
  try {
    if (!canvas?.ready || !a || !b) return null;
    const res = canvas.grid.measurePath([a.center, b.center]);
    return Math.round(res.distance ?? res.cost ?? 0);
  } catch (e) {
    return null;
  }
}

/** Ermittle Reichweitenband (S. 94). */
export function rangeBand(weapon, distance, strength = 3) {
  const cfg = NR.ranges[weapon.system.range];
  if (!cfg?.steps || distance === null || distance === undefined) return null;
  if (distance <= 1) return { key: "nah", label: "≤ 1 m", mw: 0 };
  const steps = cfg.perST ? cfg.steps.map(s => s * strength) : cfg.steps;
  for (let i = 0; i < steps.length; i++) {
    if (distance <= steps[i]) return { ...NR.rangeBands[i], max: steps[i] };
  }
  return { key: "out", label: game.i18n.localize("NR.Combat.OutOfRange"), mw: 999 };
}

/** Gewählte Waffenspezialisierung? (+1W auf alle Proben mit der Waffe) */
function specializationBonus(actor, weapon) {
  const specs = actor.items.filter(i => i.type === "styleSkill" && i.system.key === "waffenspezialisierung");
  const wn = weapon.name.toLowerCase();
  return specs.some(s => {
    const m = s.name.match(/\(([^)]+)\)|\[([^\]]+)\]|:\s*(.+)$/);
    const kind = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").toLowerCase().trim();
    return kind && (wn.includes(kind) || (weapon.system.features ?? "").toLowerCase().includes(kind));
  }) ? 1 : 0;
}

/** Tokens → UUIDs */
function targetList() {
  return Array.from(game.user.targets).map(t => ({ uuid: t.document.uuid, name: t.name, actorUuid: t.actor?.uuid, token: t }));
}

/* -------------------------------------------- */
/*  Angriff                                      */
/* -------------------------------------------- */

/**
 * Führe einen Angriff mit einer Waffe durch (S. 92).
 * @param {Actor} actor
 * @param {Item} weapon
 */
export async function attackWithWeapon(actor, weapon) {
  const sys = weapon.system;
  const cat = NR.weaponCategories[sys.category] ?? {};
  const melee = !!cat.melee;
  const skillKey = sys.skillKey;
  const skill = actor.system.skillList[skillKey];
  const attr = actor.system.attr[skill?.attr ?? "ge"];
  const targets = targetList();
  const source = actor.getActiveTokens()[0];
  const distance = targets.length && source ? tokenDistance(source, targets[0].token) : null;
  const band = !melee ? rangeBand(weapon, distance, actor.system.attr.st.total) : null;
  const modes = sys.modes.length ? sys.modes : (melee ? [] : ["HM"]);
  const heavy = ["schwer", "geschuetz"].includes(sys.category);
  const ammoKinds = heavy ? ["granate", "rakete"] : sys.category === "projektil" ? ["projektil"] : sys.category === "spruehwaffe" ? ["liquid"] : ["patrone"];
  const ammoItems = actor.items.filter(i => i.type === "ammo" && i.system.quantity > 0 && ammoKinds.includes(i.system.ammoType));

  const content = await renderTemplate("systems/noreturn/templates/dialog/attack-dialog.hbs", {
    weapon, melee, skill, attr, modes: modes.map(m => ({ key: m, label: NR.fireModes[m]?.label ?? m })),
    aiming: NR.aiming, zones: NR.zones, targets, distance, band, rangeBands: NR.rangeBands,
    hasRange: !melee && sys.range !== "none", ammoItems, hasAmmo: sys.hasAmmo, ammo: sys.ammo,
    woundMalus: actor.getMalus(), adrenalinLeft: actor.system.adrenalinLeft, adrenalinBonus: actor.system.adrenalinBonus,
    meditationLeft: actor.system.meditationLeft, recoilMastery: actor.styleLevel("recoilMastery") > 0, triggerFinger: actor.styleLevel("triggerFinger") > 0
  });

  const opts = await DialogV2.wait({
    window: { title: `${game.i18n.localize("NR.Combat.Attack")}: ${weapon.name}`, icon: "fa-solid fa-crosshairs" },
    classes: ["noreturn", "nr-roll-dialog"],
    position: { width: 460 },
    content,
    buttons: [{
      action: "attack", label: game.i18n.localize("NR.Combat.Attack"), icon: "fa-solid fa-crosshairs", default: true,
      callback: (event, button) => {
        const f = button.form.elements;
        return {
          mode: f.mode?.value ?? null,
          aim: f.aim.value,
          zone: f.zone?.value ?? "7",
          half: f.half?.value ?? "oben",
          rangeMw: f.rangeMw ? Number(f.rangeMw.value) : 0,
          bonusDice: Number(f.bonusDice.value) || 0,
          malusDice: Number(f.malusDice.value) || 0,
          disadvantages: Number(f.disadvantages.value) || 0,
          points: Number(f.points.value) || 0,
          useAdrenalin: f.useAdrenalin?.checked ?? false,
          useMeditation: f.useMeditation?.checked ?? false,
          ammoId: f.ammoId?.value ?? "",
          triggerFinger: f.triggerFinger?.checked ?? false,
          braced: Number(f.braced?.value) || 0,
          multi: Math.max(1, Number(f.multi?.value) || 1)
        };
      }
    }, { action: "cancel", label: game.i18n.localize("Cancel") }]
  }).then(r => (r === "cancel" ? null : r)).catch(() => null);
  if (!opts) return null;

  const mode = opts.mode ? NR.fireModes[opts.mode] : null;
  const ammoItem = opts.ammoId ? actor.items.get(opts.ammoId) : null;
  const ammoSys = ammoItem?.system;

  // Munition prüfen
  let shots = mode?.ammo ?? 1;
  if (opts.triggerFinger && opts.mode === "HM") shots += 1;
  if (sys.hasAmmo) {
    if (sys.ammo.value < shots) {
      ui.notifications.warn(game.i18n.format("NR.Combat.NoAmmo", { name: weapon.name }));
      return null;
    }
    await weapon.update({ "system.ammo.value": sys.ammo.value - shots });
  }
  if (ammoItem && (heavy || !sys.hasAmmo)) await ammoItem.update({ "system.quantity": Math.max(0, ammoItem.system.quantity - 1) });

  // Würfelpool zusammensetzen
  let bonus = opts.bonusDice + sys.attackDice + (mode?.attackDice ?? 0) + (ammoSys?.attackDice ?? 0) + specializationBonus(actor, weapon);
  if (opts.triggerFinger && opts.mode === "HM") bonus += 2;
  if (opts.useAdrenalin && opts.multi === 1 && await actor.spendAdrenalin()) bonus += actor.system.adrenalinBonus;
  if (opts.useMeditation && opts.multi === 1 && await actor.spendAdrenalin("meditation")) bonus += Math.min(5, actor.system.meditationMax);

  let aimMalus = 0;
  if (!mode?.noAim) aimMalus = melee ? NR.aiming[opts.aim].melee : NR.aiming[opts.aim].ranged;
  const aim = mode?.noAim ? "random" : opts.aim;

  let recoilMalus = 0;
  let recoilInfo = "";
  if (!melee && mode) {
    let recoil = mode.recoil + (ammoSys?.recoil ?? 0) + (opts.triggerFinger && opts.mode === "HM" ? 2 : 0);
    const rd = (opts.braced ? sys.rd + opts.braced : sys.rd) + Math.floor(actor.system.attr.st.total / 5) + (actor.styleLevel("recoilMastery") ? 2 : 0);
    recoilMalus = Math.max(0, recoil - rd);
    recoilInfo = `Rückstoß ${recoil} − RD ${rd}`;
  }

  // Minimalstärke bei Bögen
  let strengthMalusDice = 0;
  let strengthMalusPoints = 0;
  if (sys.minStrength > 0 && actor.system.attr.st.total < sys.minStrength) {
    const diff = sys.minStrength - actor.system.attr.st.total;
    strengthMalusDice = diff * 2;
    strengthMalusPoints = diff * 10;
  }

  const malus = actor.getMalus() + opts.malusDice + opts.disadvantages * 2 + aimMalus + recoilMalus + strengthMalusDice;
  const dice = skill.pool;
  const subtitle = `${attr.abbr} ${attr.total}${skill.trained ? ` + ${skill.label} ${skill.value}` : " − 2 (ungeübt)"}`;

  // Schadensprofil
  const dmg = {
    strength: sys.damage.strength,
    points: sys.damage.points + (ammoSys?.damageBonus ?? 0) + (mode?.damagePoints ?? 0) - strengthMalusPoints + (aim === "exact" ? 10 : 0),
    formula: sys.damage.formula || ammoSys?.damage || "",
    pierce: pierceMax(sys.damage.pierce, ammoSys?.pierce, mode?.pierce),
    damageType: sys.damageType,
    nonLethal: sys.damage.nonLethal || !!ammoSys?.nonLethal,
    continuous: sys.damage.continuous || !!ammoSys?.continuous,
    structure: sys.damage.structure || !!ammoSys?.structure,
    noDamageVs: ammoSys?.noDamageVs ?? ""
  };

  const area = sys.damage.area || !!ammoSys?.radius;
  const zonesMode = area ? "all" : (mode?.zones ?? (sys.category === "spruehwaffe" ? "all" : "single"));
  const attackData = {
    kind: "attack",
    actorUuid: actor.uuid,
    weaponId: weapon.id,
    weaponName: weapon.name,
    category: sys.category,
    tokenUuid: actor.token?.uuid ?? actor.getActiveTokens()[0]?.document.uuid ?? null,
    melee,
    mode: opts.mode,
    aim, zone: opts.zone, half: opts.half,
    rangeMw: melee ? 0 : opts.rangeMw,
    dmg,
    goodHitStep: actor.styleLevel("sado") > 0 && melee ? 5 : (mode?.goodHitStep ?? 10),
    noGoodHits: !!mode?.noGoodHits || zonesMode === "all",
    zonesMode,
    multi: opts.multi,
    targets: targets.map(t => ({ uuid: t.uuid, name: t.name, actorUuid: t.actorUuid }))
  };

  const extra = await renderTemplate("systems/noreturn/templates/chat/attack-extra.hbs", {
    weapon, attackData, mode: mode?.label, aimLabel: NR.aiming[aim]?.label,
    zoneLabel: aim === "zone" || aim === "exact" ? NR.zones[opts.zone]?.label : null,
    halfLabel: aim === "half" ? opts.half : null, recoilInfo, recoilMalus, aimMalus, shots: sys.hasAmmo ? shots : 0,
    ammoLeft: sys.hasAmmo ? sys.ammo.value - shots : null, ammoName: ammoItem?.name, damageLabel: describeDamage(dmg),
    distance, targets: attackData.targets
  });

  const result = await rollPool({
    actor, label: `${game.i18n.localize("NR.Combat.Attack")}: ${weapon.name}`, subtitle,
    dice, bonusDice: bonus, malusDice: malus, points: opts.points, mw: attackData.rangeMw || null,
    leiden: actor.system.attr[skill.attr]?.leiden ?? 0, chat: false
  });

  // Reichweite: Mindestwurf verfehlt → automatischer Fehlschlag
  const rangeFail = !melee && attackData.rangeMw > 0 && result.total < attackData.rangeMw;
  const explosiveNear = rangeFail && result.total === attackData.rangeMw - 1 && (dmg.damageType === "explosiv");
  attackData.total = result.total;
  attackData.rangeFail = rangeFail && !explosiveNear;
  attackData.explosiveNear = explosiveNear;

  result.options.extraHtml = extra + (rangeFail ? `<p class="nr-bad">${game.i18n.localize(explosiveNear ? "NR.Combat.ExplosiveNear" : "NR.Combat.RangeFail")}</p>` : "");
  result.options.flags = { noreturn: { attack: attackData } };
  result.message = await postPoolMessage(result, { template: "systems/noreturn/templates/chat/roll-card.hbs" });
  return result;
}

function pierceMax(...values) {
  const rank = v => v === "all" ? 99 : (NR.mkRank[v] ?? 0);
  return values.filter(Boolean).reduce((best, v) => rank(v) > rank(best) ? v : best, "");
}

export function describeDamage(dmg) {
  const parts = [];
  if (dmg.nonLethal) parts.push("NL");
  if (dmg.formula) parts.push(dmg.formula);
  else if (dmg.strength) parts.push(`ST${dmg.points ? (dmg.points > 0 ? `+${dmg.points}` : dmg.points) + "p." : ""}`);
  else parts.push(`${dmg.points}${dmg.structure ? " SSP" : "p."}`);
  if (dmg.formula && dmg.points) parts.push(`${dmg.points > 0 ? "+" : ""}${dmg.points}p.`);
  if (dmg.pierce) parts.push(`(${NR.armorPiercing[dmg.pierce]})`);
  if (dmg.continuous) parts.push("andauernd");
  return parts.join(" ");
}

/* -------------------------------------------- */
/*  Verteidigung                                 */
/* -------------------------------------------- */

/**
 * Defensivaktion gegen einen Angriff (S. 89).
 * @param {ChatMessage} message   Angriffsnachricht
 * @param {string} tokenUuid      Verteidigendes Token
 * @param {boolean} none          Keine Verteidigung (Wurf = 0)
 */
export async function defendAgainst(message, tokenUuid, none = false) {
  const attack = message.flags.noreturn?.attack;
  if (!attack) return;
  const tokenDoc = await fromUuid(tokenUuid);
  const actor = tokenDoc?.actor;
  if (!actor) return;
  if (!actor.isOwner) return ui.notifications.warn(game.i18n.localize("NR.Notify.NotOwner"));

  let defTotal = 0;
  let defLabel = game.i18n.localize("NR.Combat.NoDefense");
  let defRoll = null;
  let blocked = false;
  let skillKey = null;

  if (!none && !attack.rangeFail) {
    const count = actor.system.combat.defenses;
    const skills = Object.values(actor.system.skillList).filter(s => s.defensive);
    const custom = actor.items.filter(i => i.type === "skill" && i.system.defensive);
    const psiApps = actor.items.filter(i => i.type === "psiApp" && i.system.defensive);
    const gear = actor.items.filter(i => i.type === "weapon" && i.system.equipped && (i.system.parryDice || i.system.blockDice));
    const content = await renderTemplate("systems/noreturn/templates/dialog/defense-dialog.hbs", {
      actor, attack, skills, custom, psiApps, gear, count, defenseMalus: count,
      woundMalus: actor.getMalus(), adrenalinLeft: actor.system.adrenalinLeft, adrenalinBonus: actor.system.adrenalinBonus,
      suggested: attack.melee ? "ausweichen" : "ausweichen"
    });
    const opts = await DialogV2.wait({
      window: { title: `${game.i18n.localize("NR.Combat.Defend")}: ${actor.name}`, icon: "fa-solid fa-shield-halved" },
      classes: ["noreturn", "nr-roll-dialog"],
      position: { width: 440 },
      content,
      buttons: [{
        action: "defend", label: game.i18n.localize("NR.Combat.Defend"), icon: "fa-solid fa-shield-halved", default: true,
        callback: (event, button) => {
          const f = button.form.elements;
          return {
            choice: f.choice.value, gearId: f.gearId?.value ?? "",
            bonusDice: Number(f.bonusDice.value) || 0, malusDice: Number(f.malusDice.value) || 0,
            useAdrenalin: f.useAdrenalin?.checked ?? false
          };
        }
      }, { action: "cancel", label: game.i18n.localize("Cancel") }]
    }).then(r => (r === "cancel" ? null : r)).catch(() => null);
    if (!opts) return;

    let dice = 0;
    let bonus = opts.bonusDice;
    const [type, key] = opts.choice.split(":");
    if (type === "skill") {
      const s = actor.system.skillList[key];
      dice = s.pool; defLabel = s.label; skillKey = key;
    } else if (type === "custom") {
      const it = actor.items.get(key);
      const a = it.system.attribute ? actor.system.attr[it.system.attribute].total : 0;
      dice = a + it.system.value; defLabel = it.name;
    } else if (type === "psi") {
      const app = actor.items.get(key);
      const power = actor.items.find(i => i.type === "psiPower" && i.system.key === app.system.power);
      dice = (power?.system.value ?? 0) + actor.system.skillList.reaktion.value;
      defLabel = `${app.name} (PSI + Reaktion)`;
    }
    const g = opts.gearId ? actor.items.get(opts.gearId) : null;
    if (g) bonus += (skillKey === "blocken" ? g.system.blockDice : g.system.parryDice) || 0;
    if (opts.useAdrenalin && attack.multi === 1 && await actor.spendAdrenalin()) bonus += actor.system.adrenalinBonus;

    // Steigender Malus je weiterer Defensivaktion – ohne 1-Würfel-Regel
    const malus = actor.getMalus() + opts.malusDice + count;
    const effective = dice + bonus - malus;
    await actor.update({ "system.combat.defenses": count + 1 });
    if (effective < 1) {
      defTotal = 0;
      defLabel += ` – ${game.i18n.localize("NR.Combat.NoDiceLeft")}`;
    } else {
      const res = await rollPool({ actor, label: defLabel, dice, bonusDice: bonus, malusDice: malus, chat: false, oneDieRule: false });
      defTotal = res.total;
      defRoll = res.roll;
    }
    blocked = skillKey === "blocken";
  }

  const hit = !attack.rangeFail && attack.total > defTotal;
  const diff = attack.total - defTotal;
  let goodHits = 0;
  if (hit && !attack.noGoodHits && !blocked) goodHits = Math.floor(diff / (attack.goodHitStep || 10));
  let blockNote = "";
  let blockedAll = false;
  if (blocked && !hit) {
    blockedAll = defTotal >= attack.total + 20;
    blockNote = blockedAll ? game.i18n.localize("NR.Combat.BlockPerfect") : game.i18n.localize("NR.Combat.BlockHit");
  }
  const damageAllowed = hit || (blocked && !blockedAll && !attack.rangeFail);

  const outcome = {
    kind: "defense",
    attackMessageId: message.id,
    attack,
    defender: { tokenUuid, actorUuid: actor.uuid, name: tokenDoc.name },
    defTotal, defLabel, hit, diff, goodHits, blocked: blocked && !hit, blockedAll, damageAllowed
  };
  const content = await renderTemplate("systems/noreturn/templates/chat/defense-card.hbs", {
    ...outcome, blockNote, attackTotal: attack.total, weaponName: attack.weaponName,
    dice: defRoll ? diceSummary(defRoll) : []
  });
  const msgData = { speaker: ChatMessage.getSpeaker({ actor }), content, flags: { noreturn: { defense: outcome } } };
  if (defRoll) msgData.rolls = [defRoll];
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/* -------------------------------------------- */
/*  Schaden                                      */
/* -------------------------------------------- */

/**
 * Schadensprobe nach erfolgreichem Treffer (S. 92).
 */
export async function rollDamage(defense) {
  const attack = defense.attack;
  const attacker = await fromUuid(attack.actorUuid);
  if (!attacker) return;
  if (!attacker.isOwner) return ui.notifications.warn(game.i18n.localize("NR.Notify.NotOwner"));
  const dmg = attack.dmg;
  const extraDice = defense.blocked ? 0 : defense.goodHits;

  let roll;
  let label;
  if (dmg.formula) {
    const f = `${toFormula(dmg.formula)}${extraDice ? ` + ${extraDice}d6[bonus]` : ""}${dmg.points ? ` + ${dmg.points}` : ""}`;
    roll = await new Roll(f.replace(/\+ -/g, "- ")).evaluate();
    label = dmg.formula;
  } else if (dmg.strength) {
    const st = attacker.system.attr.st.total;
    const overdrive = attacker.system.combat?.overdrive ?? 0;
    const { formula } = buildFormula({ dice: st, extraDice, points: dmg.points + overdrive, hazard: true });
    roll = await new Roll(formula).evaluate();
    label = `ST ${st}${dmg.points ? ` + ${dmg.points}p.` : ""}${overdrive ? ` + Overdrive ${overdrive}` : ""}`;
    if (overdrive) await attacker.update({ "system.combat.overdrive": 0 });
  } else {
    const { formula } = buildFormula({ dice: 0, extraDice, points: dmg.points, hazard: false, oneDieRule: false });
    roll = await new Roll(formula).evaluate();
    label = `${dmg.points}p.`;
  }
  if (extraDice) label += ` + ${extraDice}W (Gute Treffer)`;

  // Trefferzonen
  let zones = [];
  if (defense.blocked) zones = ["9"];
  else if (attack.zonesMode === "all") zones = Object.keys(NR.zones);
  else if (attack.zonesMode === "twoRandom") zones = [(await rollHitZone()).zone, (await rollHitZone()).zone];
  else if (attack.aim === "zone" || attack.aim === "exact") zones = [attack.zone];
  else if (attack.aim === "half") zones = [(await rollHitZone(attack.half)).zone];
  else zones = [(await rollHitZone()).zone];
  zones = [...new Set(zones)];

  const payload = {
    kind: "damage", amount: roll.total, zones, attack: {
      pierce: dmg.pierce, damageType: dmg.damageType, noDamageVs: dmg.noDamageVs,
      nonLethal: dmg.nonLethal, structure: dmg.structure, continuous: dmg.continuous
    },
    target: defense.defender, weaponName: attack.weaponName, blocked: defense.blocked
  };
  const content = await renderTemplate("systems/noreturn/templates/chat/damage-card.hbs", {
    ...payload, label, zoneLabels: zones.map(z => NR.zones[z].label).join(", "),
    dice: diceSummary(roll), describe: describeDamage(dmg)
  });
  const msgData = { speaker: ChatMessage.getSpeaker({ actor: attacker }), content, rolls: [roll], flags: { noreturn: { damage: payload } } };
  applyChatMode(msgData);
  const msg = await ChatMessage.create(msgData);
  await spikeRetaliation(defense, attacker);
  return msg;
}

/**
 * Stacheln (S. 164): Ein waffenloser/körpereigener Nahkampfangriff auf einen Träger
 * defensiver Stacheln fügt dem Angreifer KO + 15 Punkte Schaden zu.
 */
async function spikeRetaliation(defense, attacker) {
  const attack = defense.attack;
  if (!attack.melee || attack.category !== "unbewaffnet") return;
  const defTok = defense.defender.tokenUuid ? await fromUuid(defense.defender.tokenUuid) : null;
  const defender = defTok?.actor ?? await fromUuid(defense.defender.actorUuid);
  if (!defender) return;
  const spikes = defender.items.find(i => i.type === "bioTrait" && i.name.startsWith("Stachel(n)"));
  if (!spikes || defender.items.some(i => i.type === "weapon" && i.name.startsWith("Großer Stachel"))) return;
  const ko = defender.system.attr?.ko?.total ?? 1;
  const { formula } = buildFormula({ dice: ko, points: 15, hazard: true });
  const roll = await new Roll(formula).evaluate();
  const zones = [(await rollHitZone()).zone];
  const payload = {
    kind: "damage", amount: roll.total, zones,
    attack: { pierce: "", damageType: "stich", noDamageVs: "", nonLethal: false, structure: false, continuous: false },
    target: { tokenUuid: attack.tokenUuid, actorUuid: attacker.uuid, name: attacker.name },
    weaponName: `${spikes.name} (${game.i18n.localize("NR.Combat.Retaliation")})`, blocked: false
  };
  const content = await renderTemplate("systems/noreturn/templates/chat/damage-card.hbs", {
    ...payload, label: `KO ${ko} + 15p.`, zoneLabels: zones.map(z => NR.zones[z].label).join(", "),
    dice: diceSummary(roll), describe: ""
  });
  const msgData = { speaker: ChatMessage.getSpeaker({ actor: defender }), content, rolls: [roll], flags: { noreturn: { damage: payload } } };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/** Widerstand + Anwendung durch den Verteidiger. */
export async function resistFromMessage(message, zoneOverride = null) {
  const payload = message.flags.noreturn?.damage;
  if (!payload) return;
  const actor = (await fromUuid(payload.target.actorUuid)) ?? (await fromUuid(payload.target.tokenUuid))?.actor;
  // Bei unverlinkten Tokens den Token-Actor verwenden
  const tokenDoc = payload.target.tokenUuid ? await fromUuid(payload.target.tokenUuid) : null;
  const target = tokenDoc?.actor ?? actor;
  if (!target) return;
  if (!target.isOwner) return ui.notifications.warn(game.i18n.localize("NR.Notify.NotOwner"));
  return target.resistDamage({
    amount: payload.amount, zones: zoneOverride ? [zoneOverride] : payload.zones, attack: payload.attack,
    label: `${game.i18n.localize("NR.Chat.DamageResistance")}: ${payload.weaponName}`
  });
}

/** Manuelle Schadenseingabe (Aufprall, Sturz, Umgebung …). */
export async function manualDamageDialog(actor) {
  const content = await renderTemplate("systems/noreturn/templates/dialog/damage-dialog.hbs", {
    zones: NR.zones, pierce: NR.armorPiercing, types: NR.damageTypes
  });
  const res = await DialogV2.wait({
    window: { title: game.i18n.localize("NR.Damage.Manual"), icon: "fa-solid fa-heart-crack" },
    classes: ["noreturn", "nr-roll-dialog"],
    content,
    buttons: [{
      action: "apply", label: game.i18n.localize("NR.Damage.Resist"), default: true,
      callback: (event, button) => {
        const f = button.form.elements;
        const zoneMode = f.zoneMode.value;
        return {
          amount: Number(f.amount.value) || 0, zoneMode, zone: f.zone.value,
          damageType: f.damageType.value, pierce: f.pierce.value, nonLethal: f.nonLethal.checked,
          structure: f.structure.checked, direct: f.direct.checked, resistMalus: Number(f.resistMalus.value) || 0
        };
      }
    }, { action: "cancel", label: game.i18n.localize("Cancel") }]
  }).then(r => (r === "cancel" ? null : r)).catch(() => null);
  if (!res || res.amount <= 0) return;
  let zones;
  if (res.zoneMode === "all") zones = Object.keys(NR.zones);
  else if (res.zoneMode === "random") zones = [(await rollHitZone()).zone];
  else zones = [res.zone];
  if (res.direct) {
    for (const z of zones) await actor.applyDirectDamage(z, res.amount);
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="nr-card"><p>${game.i18n.format("NR.Chat.DirectDamage", { name: actor.name, amount: res.amount, zones: zones.map(z => NR.zones[z].label).join(", ") })}</p></div>` });
  }
  return actor.resistDamage({
    amount: res.amount, zones, resistMalus: res.resistMalus, skipDialog: false,
    attack: { damageType: res.damageType, pierce: res.pierce, nonLethal: res.nonLethal, structure: res.structure }
  });
}

/* -------------------------------------------- */
/*  Initiative & Rundenwechsel                   */
/* -------------------------------------------- */

export class NRCombatant extends Combatant {
  /** @override – Mexican Standoff: Reaktion (S. 88). */
  getInitiativeRoll(formula) {
    const actor = this.actor;
    if (!actor || actor.type === "vehicle" || !actor.system.skillList) return super.getInitiativeRoll(formula);
    const pool = actor.system.skillList.reaktion.pool;
    const f = buildFormula({ dice: pool, malusDice: actor.getMalus() }).formula;
    return new Roll(f);
  }
}

/** Setze Defensivaktionen zu Beginn jeder Runde zurück, Regeneration zu Beginn des eigenen Zugs. */
export function registerCombatHooks() {
  Hooks.on("updateCombat", async (combat, changed) => {
    if (!game.user.isGM) return;
    if ("round" in changed) {
      for (const c of combat.combatants) {
        const a = c.actor;
        if (a && a.type !== "vehicle" && (a.system.combat.defenses || a.system.combat.psiCollected)) {
          await a.update({ "system.combat.defenses": 0 });
        }
      }
    }
    if ("turn" in changed || "round" in changed) {
      const a = combat.combatant?.actor;
      if (a && a.type !== "vehicle" && a.system.hasRegeneration && game.settings.get("noreturn", "autoRegeneration")) await a.regenerate();
    }
  });
}
