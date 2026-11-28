import { NR } from "./config.mjs";
import { rollPool, rollHitZone, buildFormula, applyChatMode, postPoolMessage, diceSummary } from "./dice/pool.mjs";
import {
  isUnarmed, isMeleeWeapon, defaultLimb, strikeGroups, styleDice, maxMultiAttacks, attackSkillOptions,
  nahkampfParryVia
} from "./styles.mjs";
import { resolveKsText } from "./psi.mjs";
import { evalFormula } from "./timed.mjs";

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
    const kind = (s.system.variant || (m?.[1] ?? m?.[2] ?? m?.[3] ?? "")).toLowerCase().trim();
    return kind && (wn.includes(kind) || (weapon.system.features ?? "").toLowerCase().includes(kind));
  }) ? 1 : 0;
}

/** Hinweise zu Style-Skills, die im Angriffsdialog angezeigt werden (rein informative Effekte). */
function styleAttackHints(actor, weapon) {
  const hints = [];
  const ranged = !isMeleeWeapon(weapon);
  // Billy the Kid: einhändige Feuerwaffen in einer Aktion ziehen und abfeuern
  if (ranged && !weapon.system.twoHanded && ["faustfeuer", "schnellfeuer"].includes(weapon.system.category) && actor.styleLevel("billyTheKid")) {
    hints.push(game.i18n.localize("NR.Style.BillyHint"));
  }
  // Ba-Kai-Do 1: Beißen im Nahkampf ohne Kampfnachteil; Kenjutsu 1: Schwert ziehen und in derselben Aktion angreifen
  if (isUnarmed(weapon) && actor.styleLevel("baKaiDo") >= 1) hints.push(game.i18n.localize("NR.Style.BaKaiDoBite"));
  if (weapon.system.category === "nahkampf" && weapon.system.damageType === "klinge" && actor.styleLevel("kenjutsu") >= 1) {
    hints.push(game.i18n.localize("NR.Style.KenjutsuDraw"));
  }
  return hints;
}

/** Caecitas (S. 148): gehärtete Weichteile – ohne Weichteil-Schwachstellen kein +10-Schaden bei „Exakte Stelle“. Gilt nur, wenn alle Ziele Caecitas haben. */
function softSpotsHardened(targets) {
  return targets.length > 0 && targets.every(t => {
    const actor = t.actorUuid ? fromUuidSync(t.actorUuid) : null;
    return actor?.items?.some(i => i.type === "abnormality" && i.name.toLowerCase().startsWith("caecitas"));
  });
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
  const skillOptions = attackSkillOptions(actor, weapon);
  const unarmed = isUnarmed(weapon);
  const zpcAvailable = actor.styleLevel("zpc") >= 1 && melee;
  const targets = targetList();
  const source = actor.getActiveTokens()[0];
  const distance = targets.length && source ? tokenDistance(source, targets[0].token) : null;
  const band = !melee ? rangeBand(weapon, distance, actor.system.attr.st.total) : null;
  const modes = sys.modes.length ? sys.modes : (melee ? [] : ["HM"]);
  const heavy = ["schwer", "geschuetz"].includes(sys.category);
  const ammoKinds = heavy ? ["granate", "rakete"] : sys.category === "projektil" ? ["projektil"] : sys.category === "spruehwaffe" ? ["liquid"] : ["patrone"];
  const ammoItems = actor.items.filter(i => i.type === "ammo" && i.system.quantity > 0 && ammoKinds.includes(i.system.ammoType));

  const content = await renderTemplate("systems/noreturn/templates/dialog/attack-dialog.hbs", {
    weapon, melee, skill: actor.system.skillList[skillOptions[0].key], modes: modes.map(m => ({ key: m, label: NR.fireModes[m]?.label ?? m })),
    aiming: NR.aiming, zones: NR.zones, targets, distance, band, rangeBands: NR.rangeBands,
    hasRange: !melee && sys.range !== "none", ammoItems, hasAmmo: sys.hasAmmo, ammo: sys.ammo,
    woundMalus: actor.getMalus(), adrenalinLeft: actor.system.adrenalinLeft, adrenalinBonus: actor.system.adrenalinBonus,
    meditationLeft: actor.system.meditationLeft, zeitpoolLeft: actor.system.combat.zeitpool, zeitpoolBonus: actor.system.zeitpoolBonus, recoilMastery: actor.styleLevel("recoilMastery") > 0, triggerFinger: actor.styleLevel("triggerFinger") > 0,
    skillOptions: skillOptions.map(o => ({ key: o.key, label: `${actor.system.skillList[o.key].label} (${actor.system.skillList[o.key].pool}W)${o.via ? ` – ${game.i18n.localize(`NR.Style.Via.${o.via}`)}` : ""}` })),
    skillChoice: skillOptions.length > 1, bestSkill: skillOptions.reduce((b, o) => actor.system.skillList[o.key].pool > actor.system.skillList[b.key].pool ? o : b, skillOptions[0]).key,
    limbs: unarmed ? Object.entries(NR.strikeLimbs).map(([key, l]) => ({ key, label: l.label, selected: key === defaultLimb(weapon) })) : null,
    zpcAvailable, sollbruchAvailable: actor.styleLevel("sollbruchstelle") > 0 && targets.some(t => t.token?.actor?.type === "vehicle"),
    maxMulti: maxMultiAttacks(actor, weapon, { gunFuMelee: actor.styleLevel("gunFu") >= 2 }),
    styleHints: styleAttackHints(actor, weapon)
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
          useZeitpool: f.useZeitpool?.checked ?? false,
          ammoId: f.ammoId?.value ?? "",
          triggerFinger: f.triggerFinger?.checked ?? false,
          braced: Number(f.braced?.value) || 0,
          multi: Math.max(1, Number(f.multi?.value) || 1),
          skillKey: f.skillKey?.value ?? "",
          limb: f.limb?.value ?? "fist",
          zpc: f.zpc?.checked ?? false,
          sollbruch: f.sollbruch?.checked ?? false,
          sideTask: f.sideTask?.checked ?? false,
          coup: f.coup?.checked ?? false
        };
      }
    }, { action: "cancel", label: game.i18n.localize("Cancel") }]
  }).then(r => (r === "cancel" ? null : r)).catch(() => null);
  if (!opts) return null;
  if (opts.coup) return coupDeGrace(actor, weapon, targets);

  // Fertigkeit (Escrima/Sado/Gun-Fu können sie austauschen) und Angriffskontext
  const skillKey = skillOptions.some(o => o.key === opts.skillKey) ? opts.skillKey : skillOptions[0].key;
  const gunFuMelee = !!skillOptions.find(o => o.key === skillKey)?.gunFu;
  if (gunFuMelee) opts.mode = "HM";
  const skill = actor.system.skillList[skillKey];
  const attr = actor.system.attr[skill?.attr ?? "ge"];
  const groups = strikeGroups(weapon, { limb: opts.limb, zpc: opts.zpc, multi: opts.multi, gunFuMelee });
  const maxMulti = maxMultiAttacks(actor, weapon, { gunFuMelee });
  const styleNotes = [];
  let skillBonusExtra = 0;
  if (opts.multi > maxMulti) styleNotes.push(game.i18n.format("NR.Style.MultiExceeded", { n: maxMulti }));

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
  // Situative Bonuswürfel auf die Fertigkeit (z. B. Nahkampf +2W) und Style-/Kampfkunst-Boni auf den Angriff
  const skillSit = actor.system.mods?.[`dice.${skillKey}`] ?? 0;
  const styleAttack = styleDice(actor, "attack", groups);
  const tempBonus = actor.system.bonusDice ?? 0;
  bonus += skillSit + styleAttack + tempBonus;
  if (tempBonus) styleNotes.push(game.i18n.format("NR.Style.TempBonus", { n: tempBonus }));
  if (skillSit + styleAttack) styleNotes.push(game.i18n.format("NR.Style.AttackBonus", { n: skillSit + styleAttack }));
  if (opts.triggerFinger && opts.mode === "HM") bonus += 2;
  if (opts.useAdrenalin && opts.multi === 1 && await actor.spendAdrenalin()) bonus += actor.system.adrenalinBonus;
  if (opts.useMeditation && opts.multi === 1 && await actor.spendAdrenalin("meditation")) bonus += Math.min(5, actor.system.meditationMax);
  if (opts.useZeitpool && opts.multi === 1) bonus += await actor.spendZeitpool();

  let aimMalus = 0;
  if (!mode?.noAim) aimMalus = melee ? NR.aiming[opts.aim].melee : NR.aiming[opts.aim].ranged;
  const aim = mode?.noAim ? "random" : opts.aim;

  // Gezielte Angriffe auf Fahrzeuge: pauschal −2W statt der Körperzonen-Mali (sichtbare Komponenten, S. 105). Aim for the Heart hebt den Malus auf
  // und erlaubt auch nicht sichtbare vitale Stellen.
  const vehicleTarget = targets[0]?.token?.actor?.type === "vehicle";
  let aimVital = false;
  const sollbruch = vehicleTarget && !!opts.sollbruch && actor.styleLevel("sollbruchstelle") > 0;
  if (sollbruch) styleNotes.push(game.i18n.localize("NR.Style.SollbruchNote"));
  if (vehicleTarget && aim !== "random") {
    if (actor.styleLevel("aimForTheHeart")) {
      aimVital = true;
      aimMalus = 0;
      styleNotes.push(game.i18n.localize("NR.Style.AimForTheHeartNote"));
    } else aimMalus = 2;
  }

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

  const physMalus = actor.physicalMalus(skill.attr);
  if (physMalus) styleNotes.push(game.i18n.format("NR.Style.PhysicalMalus", { n: physMalus }));
  // Zusatztätigkeit neben konzentrationsintensiver Handlung bzw. Rennen + andere Aktion: −2W (S. 88)
  const sideMalus = opts.sideTask ? 2 : 0;
  if (sideMalus) styleNotes.push(game.i18n.localize("NR.Roll.SideTaskNote"));
  const malus = actor.getMalus({ boosted: [skillKey, skill?.attr && `attr.${skill.attr}`].filter(Boolean) }) + opts.malusDice + opts.disadvantages * 2 + sideMalus + aimMalus + recoilMalus + strengthMalusDice + physMalus - skillBonusExtra;
  // Schadenswürfel aus Style-Skills (Bonuswürfel auf die Schadensprobe, nie Hazard-Di)
  let styleDamageDice = styleDice(actor, "damage", groups);
  // Ringen 3: Im Clinch +2W auf Nahkampf und Schaden gegen den Clinch-Partner
  const clinch = actor.getFlag("noreturn", "clinch");
  if (clinch?.holder && targets.length && !targets.some(t => t.actorUuid === clinch.partnerUuid)) styleNotes.push(game.i18n.localize("NR.Style.ClinchOtherTarget"));
  if (clinch?.holder && actor.styleLevel("ringen") >= 3 && melee && targets.some(t => t.actorUuid === clinch.partnerUuid)) {
    styleDamageDice += 2;
    skillBonusExtra = 2;
    styleNotes.push(game.i18n.localize("NR.Style.ClinchBonus"));
  }
  if (styleDamageDice) styleNotes.push(game.i18n.format("NR.Style.DamageBonus", { n: styleDamageDice }));
  const dice = skill.pool;
  const subtitle = `${attr.abbr} ${attr.total}${skill.trained ? ` + ${skill.label} ${skill.value}` : " − 2 (ungeübt)"}`;

  // Schadensprofil
  const dmg = {
    strength: sys.damage.strength,
    points: sys.damage.points + (ammoSys?.damageBonus ?? 0) + (mode?.damagePoints ?? 0) - strengthMalusPoints + (aim === "exact" && !softSpotsHardened(targets) ? 10 : 0),
    formula: sys.damage.formula || ammoSys?.damage || "",
    pierce: pierceMax(sys.damage.pierce, ammoSys?.pierce, mode?.pierce),
    damageType: sys.damageType,
    nonLethal: sys.damage.nonLethal || !!ammoSys?.nonLethal,
    continuous: sys.damage.continuous || !!ammoSys?.continuous,
    structure: sys.damage.structure || !!ammoSys?.structure,
    noDamageVs: ammoSys?.noDamageVs ?? "",
    bonusDice: styleDamageDice
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
    melee: melee || gunFuMelee,
    mode: opts.mode,
    aim, zone: opts.zone, half: opts.half,
    rangeMw: (melee || gunFuMelee) ? 0 : opts.rangeMw,
    dmg,
    goodHitStep: actor.styleLevel("sado") > 0 && melee ? 5 : (mode?.goodHitStep ?? 10),
    noGoodHits: !!mode?.noGoodHits || zonesMode === "all",
    zonesMode,
    multi: opts.multi,
    groups: [...groups],
    aimVital, sollbruch,
    twoHits: isUnarmed(weapon) && ((actor.styleLevel("boxen") >= 3 && groups.has("fist")) || (actor.styleLevel("taeKwonDo") >= 3 && groups.has("leg"))),
    limb: isUnarmed(weapon) ? opts.limb : null,
    targets: targets.map(t => ({ uuid: t.uuid, name: t.name, actorUuid: t.actorUuid }))
  };

  if (attackData.twoHits) styleNotes.push(game.i18n.localize("NR.Style.TwoHits"));
  const extra = await renderTemplate("systems/noreturn/templates/chat/attack-extra.hbs", {
    weapon, attackData, mode: mode?.label, aimLabel: NR.aiming[aim]?.label,
    zoneLabel: aim === "zone" || aim === "exact" ? NR.zones[opts.zone]?.label : null,
    halfLabel: aim === "half" ? opts.half : null, styleNotes, recoilInfo, recoilMalus, aimMalus, shots: sys.hasAmmo ? shots : 0,
    ammoLeft: sys.hasAmmo ? sys.ammo.value - shots : null, ammoName: ammoItem?.name, damageLabel: describeDamage(dmg),
    distance, targets: attackData.targets, attackIndices: Array.from({ length: opts.multi }, (_, i) => i + 1)
  });

  const result = await rollPool({
    actor, label: `${game.i18n.localize("NR.Combat.Attack")}: ${weapon.name}`, subtitle,
    dice, bonusDice: bonus, malusDice: malus, points: opts.points, mw: attackData.rangeMw || null,
    leiden: actor.system.attr[skill.attr]?.leiden ?? 0, chat: false
  });

  // Reichweite: Mindestwurf verfehlt → automatischer Fehlschlag
  const rangeFail = !melee && !gunFuMelee && attackData.rangeMw > 0 && result.total < attackData.rangeMw;
  const explosiveNear = rangeFail && result.total === attackData.rangeMw - 1 && (dmg.damageType === "explosiv");
  attackData.total = result.total;
  attackData.rangeFail = rangeFail && !explosiveNear;
  attackData.explosiveNear = explosiveNear;

  result.options.extraHtml = extra + (rangeFail ? `<p class="nr-bad">${game.i18n.localize(explosiveNear ? "NR.Combat.ExplosiveNear" : "NR.Combat.RangeFail")}</p>` : "");
  result.options.flags = { noreturn: { attack: attackData } };
  result.message = await postPoolMessage(result, { template: "systems/noreturn/templates/chat/roll-card.hbs" });
  return result;
}

/**
 * Coup de Grace (S. 90): Ein offensichtlich wehrloses Ziel wird ohne Probe ausgeschaltet.
 * Die SL entscheidet, ob es zutrifft (Regeneration/Sonderfähigkeiten) und wie viele Chaospoints entstehen.
 */
async function coupDeGrace(actor, weapon, targets) {
  if (!targets.length) {
    ui.notifications.warn(game.i18n.localize("NR.Combat.CoupNoTarget"));
    return null;
  }
  const sys = weapon.system;
  if (sys.hasAmmo) {
    if (sys.ammo.value < 1) {
      ui.notifications.warn(game.i18n.format("NR.Combat.NoAmmo", { name: weapon.name }));
      return null;
    }
    await weapon.update({ "system.ammo.value": sys.ammo.value - 1 });
  }
  const t = s => foundry.utils.escapeHTML(String(s));
  const rows = targets.map(tg => `<div class="nr-target"><span class="nr-target-name"><i class="fa-solid fa-skull"></i> ${t(game.i18n.format("NR.Combat.CoupText", { name: tg.name }))}</span>`
    + `<button type="button" data-nr-action="coup" data-token-uuid="${t(tg.uuid)}"><i class="fa-solid fa-skull-crossbones"></i> ${game.i18n.localize("NR.Combat.CoupApply")}</button></div>`).join("");
  const msgData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="nr-card"><header class="nr-card-head"><h3>${game.i18n.localize("NR.Combat.CoupTitle")}: ${t(weapon.name)}</h3></header>`
      + `<div class="nr-targets">${rows}</div><p class="nr-warn"><i class="fa-solid fa-biohazard"></i> ${game.i18n.localize("NR.Combat.CoupChaos")}</p></div>`,
    flags: { noreturn: { coup: true } }
  };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/** Ziel nach einem Coup de Grace ausschalten (nur SL, vom Chat-Button aufgerufen). */
export async function applyCoupDeGrace(tokenUuid) {
  const doc = await fromUuid(tokenUuid);
  const actor = doc?.actor ?? doc;
  if (!actor || !game.user.isGM) return;
  await actor.toggleStatusEffect(CONFIG.specialStatusEffects?.DEFEATED ?? "dead", { active: true, overlay: true });
  ui.notifications.info(game.i18n.format("NR.Combat.CoupApplied", { name: actor.name }));
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
export async function defendAgainst(message, tokenUuid, none = false, index = 1) {
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
  let parryGear = null;
  const styleNotes = [];

  if (!none && !attack.rangeFail) {
    const count = actor.system.combat.defenses;
    const skills = Object.values(actor.system.skillList).filter(s => s.defensive);
    const custom = actor.items.filter(i => i.type === "skill" && i.system.defensive);
    const psiApps = actor.items.filter(i => i.type === "psiApp" && i.system.defensive);
    // Gun-Fu 1: Feuerwaffen in den Händen dürfen zum Parieren dienen
    const gunFuParry = actor.styleLevel("gunFu") >= 1;
    const gear = actor.items.filter(i => i.type === "weapon" && i.system.equipped
      && (i.system.parryDice || i.system.blockDice || (gunFuParry && !isMeleeWeapon(i))));
    const blockAsNahkampf = actor.styleLevel("kravMaga") >= 1;
    const parryVia = nahkampfParryVia(actor);
    const tally = actor.getFlag("noreturn", "defTally");
    const content = await renderTemplate("systems/noreturn/templates/dialog/defense-dialog.hbs", {
      actor, attack, skills, custom, psiApps, gear, count, defenseMalus: count, blockAsNahkampf,
      woundMalus: actor.getMalus(), adrenalinLeft: actor.system.adrenalinLeft, adrenalinBonus: actor.system.adrenalinBonus,
      suggested: attack.melee ? "ausweichen" : "ausweichen",
      multiInfo: attack.multi > 1 ? game.i18n.format("NR.Style.DefendMulti", { i: index, n: attack.multi }) : null,
      parryVia: parryVia.join(", "), nahkampfNeedsStyle: !parryVia.length
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
    let isBlock = false;
    const [type, key] = opts.choice.split(":");
    const mods = actor.system.mods ?? {};
    if (type === "skill") {
      const s = actor.system.skillList[key];
      dice = s.pool; defLabel = s.label; skillKey = key;
      isBlock = key === "blocken";
      // Escrima 2: Nahkampf und Waffenkampf sind austauschbar – der bessere Wert zählt
      if (actor.styleLevel("escrima") >= 2 && ["nahkampf", "waffenkampf"].includes(key)) {
        const other = actor.system.skillList[key === "nahkampf" ? "waffenkampf" : "nahkampf"];
        if (other.pool > dice) { dice = other.pool; styleNotes.push(game.i18n.format("NR.Style.EscrimaSwap", { skill: other.label })); }
      }
    } else if (type === "block") {
      // Krav Maga 1: Nahkampf statt Blocken
      const s = actor.system.skillList[key];
      dice = s.pool; defLabel = `${game.i18n.localize("NR.Combat.Block")} (${s.label})`; skillKey = key; isBlock = true;
    } else if (type === "custom") {
      const it = actor.items.get(key);
      const a = it.system.attribute ? actor.system.attr[it.system.attribute].total : 0;
      dice = a + it.system.value; defLabel = it.name;
    } else if (type === "psi") {
      const app = actor.items.get(key);
      const power = actor.items.find(i => i.type === "psiPower" && i.system.key === app.system.power);
      dice = (power?.system.value ?? 0) + actor.system.skillList.reaktion.value;
      defLabel = `${app.name} (PSI + Reaktion)`;
      // Wirkung der App: KS der letzten Wirkung (mind. 1), Bonuswürfel der App und gehaltener Verstärker (z. B. Equilibrium),
      // Art der Defensivaktion (Ausweichen/Block) und Stärke einer Barriere
      const appKs = Math.max(1, app.getFlag("noreturn", "psiKs") ?? 1);
      let appBonus = evalFormula(app.system.defenseBonus, { ks: appKs }) ?? 0;
      for (const held of actor.items.filter(i => i.type === "psiApp" && i.system.held && i.id !== app.id && i.system.boosts?.includes("psi") && i.system.defenseBonus)) {
        appBonus += evalFormula(held.system.defenseBonus, { ks: Math.max(1, held.getFlag("noreturn", "psiKs") ?? 1) }) ?? 0;
      }
      if (appBonus) { bonus += appBonus; styleNotes.push(game.i18n.format("NR.Psi.DefenseBonus", { n: appBonus })); }
      if (app.system.defense === "dodge" && attack.melee) {
        const dodgeBonus = mods["defense.dodgeMelee"] ?? 0;
        if (dodgeBonus) { bonus += dodgeBonus; styleNotes.push(game.i18n.format("NR.Style.DefenseBonus", { n: dodgeBonus })); }
      }
      if (app.system.defense) styleNotes.push(game.i18n.format(`NR.Psi.DefenseKind.${app.system.defense}`, { ks: appKs }));
      if (app.system.defense === "block" && app.system.effect) styleNotes.push(resolveKsText(app.system.effect, appKs).replace(/<[^>]+>/g, ""));
    }
    const g = opts.gearId ? actor.items.get(opts.gearId) : null;
    if (g) bonus += (isBlock ? g.system.blockDice : g.system.parryDice) || 0;
    const isParry = !isBlock && ["nahkampf", "waffenkampf"].includes(skillKey);

    // Style-Skills/Kampfkünste: situative Bonuswürfel auf die Verteidigung
    let styleBonus = skillKey ? (mods[`dice.${skillKey}`] ?? 0) : 0;
    if (isBlock) {
      if (!g || !g.system.blockDice) styleBonus += mods["defense.blockUnarmed"] ?? 0;
      if (attack.melee) styleBonus += mods["defense.blockMelee"] ?? 0;
    }
    if (skillKey === "ausweichen" && attack.melee) styleBonus += mods["defense.dodgeMelee"] ?? 0;
    if (isParry && g?.system.damageType === "klinge") styleBonus += mods["defense.parryBlade"] ?? 0;
    const tempBonus = actor.system.bonusDice ?? 0;
    if (tempBonus) { bonus += tempBonus; styleNotes.push(game.i18n.format("NR.Style.TempBonus", { n: tempBonus })); }
    if (styleBonus) { bonus += styleBonus; styleNotes.push(game.i18n.format("NR.Style.DefenseBonus", { n: styleBonus })); }
    if (isParry) parryGear = g;
    if (opts.useAdrenalin && attack.multi === 1 && await actor.spendAdrenalin()) bonus += actor.system.adrenalinBonus;

    // Parade gegen Fernkampf: nur Blademaster (Klinge ≥ 30 cm, Nachteil −2W)
    let extraMalus = 0;
    if (isParry && !attack.melee) {
      if (actor.styleLevel("blademaster") && g?.system.damageType === "klinge") {
        extraMalus += 2;
        styleNotes.push(game.i18n.localize("NR.Style.BlademasterNote"));
      } else styleNotes.push(game.i18n.localize("NR.Style.NoRangedParry"));
    }

    // Mehrfachabwehr: Mehrere Angriffe eines Mehrfachangriffs mit einer Defensivaktion abwehren
    // (Shield Master beim Blocken, sonst so viele, wie der Verteidiger selbst Angriffe hätte).
    const capacity = defenseCapacity(actor, isBlock);
    const kind = isBlock ? "block" : (skillKey ?? type);
    const freeRide = attack.multi > 1 && capacity > 1 && tally?.msg === message.id && tally.kind === kind && tally.n < capacity;
    const actionMalus = freeRide ? Math.max(0, count - 1) : count;
    if (attack.multi > 1 && capacity > 1) {
      await actor.setFlag("noreturn", "defTally", { msg: message.id, kind, n: freeRide ? tally.n + 1 : 1 });
      if (freeRide) styleNotes.push(game.i18n.localize("NR.Style.SameDefenseAction"));
    }

    // Steigender Malus je weiterer Defensivaktion – ohne 1-Würfel-Regel
    const physMalus = skillKey ? actor.physicalMalus(actor.system.skillList[skillKey]?.attr) : 0;
    if (physMalus) styleNotes.push(game.i18n.format("NR.Style.PhysicalMalus", { n: physMalus }));
    const malus = actor.getMalus({ boosted: [skillKey, skillKey && actor.system.skillList[skillKey]?.attr && `attr.${actor.system.skillList[skillKey].attr}`, type === "psi" ? "psi" : null].filter(Boolean) }) + opts.malusDice + actionMalus + extraMalus + physMalus;
    const effective = dice + bonus - malus;
    if (!freeRide) await actor.update({ "system.combat.defenses": count + 1 });
    if (effective < 1) {
      defTotal = 0;
      defLabel += ` – ${game.i18n.localize("NR.Combat.NoDiceLeft")}`;
    } else {
      const res = await rollPool({ actor, label: defLabel, dice, bonusDice: bonus, malusDice: malus, chat: false, oneDieRule: false });
      defTotal = res.total;
      defRoll = res.roll;
    }
    blocked = isBlock;
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
    index,
    attack,
    defender: { tokenUuid, actorUuid: actor.uuid, name: tokenDoc.name },
    defTotal, defLabel, hit, diff, goodHits, blocked: blocked && !hit, blockedAll, damageAllowed,
    canClinch: hit && attack.melee && (await fromUuid(attack.actorUuid))?.styleLevel?.("ringen") >= 1
  };
  const content = await renderTemplate("systems/noreturn/templates/chat/defense-card.hbs", {
    ...outcome, blockNote, attackTotal: attack.total, weaponName: attack.weaponName,
    dice: defRoll ? diceSummary(defRoll) : [], styleNotes, multiLabel: attack.multi > 1 ? `${index}/${attack.multi}` : null
  });
  const msgData = { speaker: ChatMessage.getSpeaker({ actor }), content, flags: { noreturn: { defense: outcome } } };
  if (defRoll) msgData.rolls = [defRoll];
  applyChatMode(msgData);
  const msg = await ChatMessage.create(msgData);
  // Erfolgreiche Parade im Nahkampf: Konterschaden (Aikido 3, Kenjutsu 3)
  if (!hit && !blocked && skillKey && ["nahkampf", "waffenkampf"].includes(skillKey) && attack.melee) {
    await parryRetaliation(actor, attack, parryGear);
  }
  return msg;
}

/** Wie viele Angriffe eines Mehrfachangriffs deckt eine Defensivaktion ab? */
function defenseCapacity(actor, isBlock) {
  if (isBlock && actor.styleLevel("shieldMaster")) return 99;
  const L = key => actor.styleLevel(key);
  return Math.max(1,
    L("stormOfFists") ? 4 : 0, L("fistOfRage") ? 2 : 0, L("multipleWielding") ? 4 : 0, L("dualWielding") ? 2 : 0,
    L("quadrupleAkimbo") ? 4 : 0, L("akimbo") ? 2 : 0);
}

/**
 * Konterschaden nach erfolgreicher Parade im Nahkampf, an einer zufälligen Zone des Angreifers:
 *  - Aikido 3: ST + 10 Punkte
 *  - Kenjutsu 3: Schaden der parierenden Klingenwaffe
 */
async function parryRetaliation(defender, attack, gear) {
  const counters = [];
  if (defender.styleLevel("aikido") >= 3) {
    counters.push({ label: "Aikido", dmg: { strength: true, points: 10, formula: "", damageType: "wucht", pierce: "" } });
  }
  if (defender.styleLevel("kenjutsu") >= 3 && gear?.system.damageType === "klinge") {
    const d = gear.system.damage;
    counters.push({ label: `Kenjutsu (${gear.name})`, dmg: { strength: d.strength, points: d.points, formula: d.formula, damageType: gear.system.damageType, pierce: d.pierce } });
  }
  for (const c of counters) await postRetaliation(defender, attack, c);
}

/** Würfle einen Konterschaden und poste die Schadenskarte für den Angreifer. */
async function postRetaliation(defender, attack, { label, dmg }) {
  const attacker = await fromUuid(attack.actorUuid);
  if (!attacker) return null;
  let roll;
  let text;
  if (dmg.formula) {
    roll = await new Roll(`${toFormula(dmg.formula)}${dmg.points ? ` + ${dmg.points}` : ""}`.replace(/\+ -/g, "- ")).evaluate();
    text = dmg.formula;
  } else if (dmg.strength) {
    const st = defender.system.attr.st.total;
    roll = await new Roll(buildFormula({ dice: st, points: dmg.points, hazard: true }).formula).evaluate();
    text = `ST ${st}${dmg.points ? ` + ${dmg.points}p.` : ""}`;
  } else {
    roll = await new Roll(buildFormula({ dice: 0, points: dmg.points, hazard: false, oneDieRule: false }).formula).evaluate();
    text = `${dmg.points}p.`;
  }
  const zones = [(await rollHitZone()).zone];
  const payload = {
    kind: "damage", amount: roll.total, zones,
    attack: { pierce: dmg.pierce ?? "", damageType: dmg.damageType ?? "wucht", noDamageVs: "", nonLethal: false, structure: false, continuous: false },
    target: { tokenUuid: attack.tokenUuid, actorUuid: attacker.uuid, name: attacker.name },
    weaponName: `${label} (${game.i18n.localize("NR.Combat.Retaliation")})`, blocked: false
  };
  const content = await renderTemplate("systems/noreturn/templates/chat/damage-card.hbs", {
    ...payload, label: text, zoneLabels: zones.map(z => NR.zones[z].label).join(", "), dice: diceSummary(roll), describe: ""
  });
  const msgData = { speaker: ChatMessage.getSpeaker({ actor: defender }), content, rolls: [roll], flags: { noreturn: { damage: payload } } };
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
  let msg = await rollDamageOnce(defense, attacker, 0);
  // Boxen 3 / Tae-Kwon-Do 3: Der Treffer gilt als zwei Treffer an zwei Zonen (zwei Schadenswürfe)
  if (attack.twoHits && !defense.blocked) msg = await rollDamageOnce(defense, attacker, 1);
  await spikeRetaliation(defense, attacker);
  return msg;
}

/** Ein Schadenswurf samt Schadenskarte; `hit` > 0 würfelt die Trefferzone zufällig (zweiter Treffer). */
async function rollDamageOnce(defense, attacker, hit) {
  const attack = defense.attack;
  const dmg = attack.dmg;
  const extraDice = (defense.blocked ? 0 : defense.goodHits) + (dmg.bonusDice ?? 0);

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
  if (defense.goodHits && !defense.blocked) label += ` + ${defense.goodHits}W (Gute Treffer)`;
  if (dmg.bonusDice) label += ` + ${dmg.bonusDice}W (${game.i18n.localize("NR.Style.StyleSkill")})`;

  // Trefferzonen
  let zones = [];
  if (defense.blocked) zones = ["9"];
  else if (attack.zonesMode === "all") zones = Object.keys(NR.zones);
  else if (attack.zonesMode === "twoRandom") zones = [(await rollHitZone()).zone, (await rollHitZone()).zone];
  else if (hit > 0) zones = [(await rollHitZone()).zone];
  else if (attack.aim === "zone" || attack.aim === "exact") zones = [attack.zone];
  else if (attack.aim === "half") zones = [(await rollHitZone(attack.half)).zone];
  else zones = [(await rollHitZone()).zone];
  zones = [...new Set(zones)];

  const payload = {
    kind: "damage", amount: roll.total, zones, attack: {
      pierce: dmg.pierce, damageType: dmg.damageType, noDamageVs: dmg.noDamageVs,
      nonLethal: dmg.nonLethal, structure: dmg.structure, continuous: dmg.continuous, aimVital: !!attack.aimVital, sollbruch: !!attack.sollbruch
    },
    target: defense.defender, weaponName: attack.weaponName, blocked: defense.blocked
  };
  const content = await renderTemplate("systems/noreturn/templates/chat/damage-card.hbs", {
    ...payload, label, zoneLabels: zones.map(z => NR.zones[z].label).join(", "),
    dice: diceSummary(roll), describe: describeDamage(dmg)
  });
  const msgData = { speaker: ChatMessage.getSpeaker({ actor: attacker }), content, rolls: [roll], flags: { noreturn: { damage: payload } } };
  applyChatMode(msgData);
  return ChatMessage.create(msgData);
}

/**
 * Stacheln (S. 164): Ein waffenloser/körpereigener Nahkampfangriff auf einen Träger
 * defensiver Stacheln fügt dem Angreifer KO + 15 Punkte Schaden zu.
 */
async function spikeRetaliation(defense, attacker) {
  const attack = defense.attack;
  if (!defense.defender || !attack.melee || attack.category !== "unbewaffnet") return;
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
  let target;
  if (payload.target) {
    const actor = (await fromUuid(payload.target.actorUuid)) ?? (await fromUuid(payload.target.tokenUuid))?.actor;
    // Bei unverlinkten Tokens den Token-Actor verwenden
    const tokenDoc = payload.target.tokenUuid ? await fromUuid(payload.target.tokenUuid) : null;
    target = tokenDoc?.actor ?? actor;
  } else {
    // Schaden ohne festes Ziel: markierte, sonst ausgewählte Tokens (erstes Token)
    const tokens = game.user.targets.size ? Array.from(game.user.targets) : (canvas.tokens?.controlled ?? []);
    if (!tokens.length) return ui.notifications.warn(game.i18n.localize("NR.Notify.NoTargetsForDamage"));
    if (tokens.length > 1) ui.notifications.info(game.i18n.localize("NR.Notify.ResistFirstTarget"));
    target = tokens[0].actor;
  }
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
  // Ringen: Ein Clinch endet, wenn ein Beteiligter bewusstlos wird oder ausscheidet (nur Spielleitung, mit Hinweis)
  Hooks.on("updateActor", async actor => {
    if (!game.user.isGM || !actor.getFlag?.("noreturn", "clinch")) return;
    if (actor.system.unconscious || actor.system.lethalDestroyed) {
      const { endClinch } = await import("./style-actions.mjs");
      await endClinch(actor, "NR.Style.ClinchOut");
    }
  });
  // Mexican Standoff (Reaktion-Initiative) gilt nur einmal je Szene – Hinweis an die SL beim Kampfbeginn (S. 88)
  Hooks.on("combatStart", async () => {
    if (!game.user.isGM) return;
    await ChatMessage.create({
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      content: `<div class="nr-card"><p class="nr-hint"><i class="fa-solid fa-crosshairs"></i> ${game.i18n.localize("NR.Combat.StandoffHint")}</p></div>`
    });
  });
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
