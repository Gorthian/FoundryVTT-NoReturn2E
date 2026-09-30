import { NR } from "../config.mjs";
import { attackWithWeapon } from "../combat.mjs";
import { castPsiApp } from "../psi.mjs";

const { renderTemplate } = foundry.applications.handlebars;

export class NRItem extends Item {

  /** Standard-Icons je Typ. */
  static DEFAULT_ICONS = {
    weapon: "icons/svg/sword.svg",
    ammo: "icons/svg/target.svg",
    armor: "icons/svg/shield.svg",
    gear: "icons/svg/item-bag.svg",
    skill: "icons/svg/book.svg",
    psiPower: "icons/svg/daze.svg",
    psiApp: "icons/svg/aura.svg",
    styleSkill: "icons/svg/combat.svg",
    species: "icons/svg/mystery-man.svg",
    abnormality: "icons/svg/biohazard.svg",
    bioTrait: "icons/svg/pawprint.svg",
    advantage: "icons/svg/upgrade.svg",
    trait: "icons/svg/heal.svg",
    augment: "icons/svg/clockwork.svg"
  };

  /** @override */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if (!data.img || data.img === Item.DEFAULT_ICON) this.updateSource({ img: NRItem.DEFAULT_ICONS[this.type] ?? Item.DEFAULT_ICON });
  }

  /** @override – Spezies überträgt Startwerte auf den Charakter (S. 134). */
  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    if (game.user.id !== userId || !this.parent || this.parent.documentName !== "Actor") return;
    const actor = this.parent;
    if (this.type === "species" && actor.type !== "vehicle") {
      const s = this.system;
      await actor.update({
        "system.tpBase": s.tp,
        "system.infection.dice": s.irDice,
        "system.infection.points": s.irPoints,
        "system.special.adrenalin.value": s.adrenalin,
        "system.psyche.base": s.psyche,
        "system.organismus.base": s.organismus,
        "system.details.species": this.name
      });
      // Nur eine Spezies je Charakter
      const others = actor.items.filter(i => i.type === "species" && i.id !== this.id).map(i => i.id);
      if (others.length) await actor.deleteEmbeddedDocuments("Item", others);
    }
  }

  get isPhysical() {
    return ["weapon", "ammo", "armor", "gear", "augment"].includes(this.type);
  }

  /** Hauptaktion eines Items. */
  async use() {
    const actor = this.actor;
    switch (this.type) {
      case "weapon":
        if (!actor) return this.toChat();
        return attackWithWeapon(actor, this);
      case "skill":
        if (!actor) return this.toChat();
        return actor.rollCustomSkill(this);
      case "psiApp":
        if (!actor) return this.toChat();
        return castPsiApp(actor, this);
      case "psiPower":
        if (!actor) return this.toChat();
        return actor.rollCheck({ label: this.name, dice: this.system.value, subtitle: `${this.name} ${this.system.value}`, allowPass: false });
      default:
        return this.toChat();
    }
  }

  /** Beschreibung als Chatkarte. */
  async toChat() {
    const TE = foundry.applications.ux?.TextEditor?.implementation ?? TextEditor;
    const description = await TE.enrichHTML(this.system.description ?? "", { relativeTo: this, secrets: this.isOwner });
    const content = await renderTemplate("systems/noreturn/templates/chat/item-card.hbs", {
      item: this, system: this.system, description, stats: this.chatStats()
    });
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }

  /** Kurze Werteliste für Chat und Tooltips. */
  chatStats() {
    const s = this.system;
    const st = [];
    const ts = s.ts ? NR.techLevels[s.ts] : null;
    switch (this.type) {
      case "weapon":
        st.push(NR.weaponCategories[s.category]?.label, `Schaden ${s.damageLabel}`);
        if (s.attackDice) st.push(`Angriff +${s.attackDice}W`);
        if (s.parryDice) st.push(`Parade +${s.parryDice}W`);
        if (s.blockDice) st.push(`Blocken +${s.blockDice}W`);
        if (s.modes.length) st.push(`Modus ${s.modes.join(", ")}`);
        if (s.modes.length || s.rd) st.push(`RD ${s.rd}${s.rdFolded ? `(${s.rdFolded})` : ""}`);
        if (s.ammo.max) st.push(`Ladung ${s.ammo.value}/${s.ammo.max}(${s.ammo.container})`);
        break;
      case "armor":
        st.push(`RW ${s.rw}p. ${NR.materialCategories[s.mk]}`, `Komfort ${s.komfort}`, `Zonen ${s.zones.join(", ")}`);
        break;
      case "ammo":
        if (s.damage) st.push(`Schaden ${s.damage}`);
        if (s.damageBonus) st.push(`Bonusschaden ${s.damageBonus > 0 ? "+" : ""}${s.damageBonus}`);
        if (s.pierce) st.push(NR.armorPiercing[s.pierce]);
        if (s.radius) st.push(`Radius ${s.radius}`);
        break;
      case "psiApp":
        st.push(NR.psiPowers[s.power]?.label, `${NR.psiDifficulties[s.difficulty]?.label} (${s.min}–${s.max})`);
        if (s.hold) st.push(`Haltung ${s.hold}`);
        if (s.defensive) st.push("Defensivaktion");
        break;
      case "styleSkill":
        st.push(`${s.gp} GP / ${s.ep} EP`);
        if (s.prerequisites) st.push(`Voraussetzung: ${s.prerequisites}`);
        break;
      case "abnormality":
      case "bioTrait":
        if (s.gp) st.push(`${s.gp} GP${s.perLevel ? " je Stufe" : ""}`);
        break;
      case "advantage":
        st.push(`${NR.advantageKinds[s.kind]}: ${s.markers} Marker`);
        break;
      case "species":
        st.push(`${s.gp} GP`, `TP ${s.tp}`, `IR ${s.irDice}W6${s.irPoints ? s.irPoints : ""}`, `Adrenalin ${s.adrenalin}`, `Psyche ${s.psyche}`);
        break;
      case "augment":
        st.push(NR.augmentKinds[s.kind]);
        if (s.orgLoss) st.push(`Organismus −${s.orgLoss}`);
        if (s.psycheLoss) st.push(`Psyche −${s.psycheLoss}`);
        break;
    }
    if (ts) st.push(ts);
    if (s.price) st.push(`${s.price.toLocaleString("de-DE")} N$`);
    return st.filter(Boolean);
  }
}
