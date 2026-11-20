import { NR } from "../config.mjs";
import { rollPool } from "../dice/pool.mjs";
import { manualDamageDialog } from "../combat.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Fahrzeugbogen (S. 104–106).
 */
export class NRVehicleSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["noreturn", "sheet", "actor", "vehicle"],
    position: { width: 640, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      drive: NRVehicleSheet.#onDrive,
      crash: NRVehicleSheet.#onCrash,
      stunt: NRVehicleSheet.#onStunt,
      damage: NRVehicleSheet.#onDamage,
      addVital: NRVehicleSheet.#onAddVital,
      removeVital: NRVehicleSheet.#onRemoveVital,
      useItem: NRVehicleSheet.#onUseItem,
      editItem: NRVehicleSheet.#onEditItem,
      deleteItem: NRVehicleSheet.#onDeleteItem
    }
  };

  static PARTS = {
    sheet: { template: "systems/noreturn/templates/actor/vehicle-sheet.hbs", scrollable: [""] }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const TE = foundry.applications.ux.TextEditor.implementation;
    Object.assign(context, {
      actor: this.actor, system: this.actor.system, config: NR, editable: this.isEditable,
      fields: this.actor.system.schema.fields,
      categories: { boden: "Bodenfahrzeug", wasser: "Wasserfahrzeug", luft: "Fluggerät", raum: "Raumfahrzeug" },
      mkOptions: NR.materialCategories, tsOptions: NR.techLevels,
      weapons: this.actor.items.filter(i => i.type === "weapon"),
      otherItems: this.actor.items.filter(i => i.type !== "weapon"),
      enrichedDescription: await TE.enrichHTML(this.actor.system.description ?? "", { relativeTo: this.actor, secrets: this.actor.isOwner }),
      hpPct: this.actor.system.hp.max ? Math.round(this.actor.system.hp.value / this.actor.system.hp.max * 100) : 0
    });
    return context;
  }

  /** Fahrer: kontrollierter Charakter des Benutzers. */
  _driver() {
    const actor = canvas?.tokens?.controlled.find(t => t.actor && t.actor.type !== "vehicle")?.actor ?? game.user.character;
    if (!actor) ui.notifications.warn(game.i18n.localize("NR.Vehicle.NoDriver"));
    return actor;
  }

  _skillKey() {
    return { boden: "bodenfahrzeuge", wasser: "wasserfahrzeuge", luft: "fluggeraete", raum: "raumschiff" }[this.actor.system.category];
  }

  /** Steuern gegen Handling (MW = Handling; Unterwürfeln → Crash). */
  static async #onDrive() {
    const driver = this._driver();
    if (!driver) return;
    const s = this.actor.system;
    const key = this._skillKey();
    const sk = driver.system.skillList[key];
    return driver.rollCheck({
      label: `${game.i18n.localize("NR.Vehicle.Drive")}: ${this.actor.name}`, dice: sk.pool, attrKey: sk.attr,
      subtitle: `${sk.label} ${sk.value} · Manöver ${s.effManeuver >= 0 ? "+" : ""}${s.effManeuver}W`,
      mw: s.effHandling, extraBonus: s.effManeuver, skillValue: sk.value, untrained: !sk.trained
    });
  }

  /** Crash: Reaktion (SL-MW), dann Fahrzeugprobe + Manöver (S. 105). */
  static async #onCrash() {
    const driver = this._driver();
    if (!driver) return;
    const r1 = await driver.rollSkill("reaktion");
    if (!r1 || !r1.success) return;
    const s = this.actor.system;
    const sk = driver.system.skillList[this._skillKey()];
    return driver.rollCheck({
      label: `${game.i18n.localize("NR.Vehicle.Crash")}: ${this.actor.name}`, dice: sk.pool, attrKey: sk.attr,
      mw: s.effHandling, extraBonus: s.effManeuver, skillValue: sk.value, untrained: !sk.trained
    });
  }

  /** Stunt: ab MW 20 (S. 105). */
  static async #onStunt() {
    const driver = this._driver();
    if (!driver) return;
    const s = this.actor.system;
    const sk = driver.system.skillList[this._skillKey()];
    const drift = driver.styleLevel("driftKing") > 0;
    return driver.rollCheck({
      label: `${game.i18n.localize("NR.Vehicle.Stunt")}: ${this.actor.name}`, dice: sk.pool, attrKey: sk.attr,
      mw: 20, extraBonus: s.effManeuver, extraPoints: drift ? 10 : 0, skillValue: sk.value, untrained: !sk.trained
    });
  }

  static async #onDamage() {
    const res = await DialogV2.input({
      window: { title: game.i18n.localize("NR.Vehicle.Damage") },
      content: `<div class="form-group"><label>${game.i18n.localize("NR.Damage.Amount")}</label><input type="number" name="amount" value="50"></div>
        <div class="form-group"><label>${game.i18n.localize("NR.Damage.Pierce")}</label><select name="pierce">${Object.entries(NR.armorPiercing).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
        <div class="form-group"><label>${game.i18n.localize("NR.Damage.Structure")}</label><input type="checkbox" name="structure"></div>`
    }).catch(() => null);
    if (!res) return;
    return this.actor.resistVehicleDamage({ amount: Number(res.amount) || 0, attack: { pierce: res.pierce, structure: !!res.structure } });
  }

  static async #onAddVital() {
    const vitals = [...this.actor.system.vitals, { name: "Neue vitale Stelle", destroyed: false, visible: true }];
    return this.actor.update({ "system.vitals": vitals });
  }

  static async #onRemoveVital(event, target) {
    const idx = Number(target.dataset.index);
    const vitals = this.actor.system.vitals.filter((v, i) => i !== idx);
    return this.actor.update({ "system.vitals": vitals });
  }

  static async #onUseItem(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    if (item.type !== "weapon") return item.toChat();
    // Fahrzeugwaffen werden vom Schützen (kontrollierter Charakter) abgefeuert
    const gunner = this._driver();
    if (!gunner) return;
    const { attackWithWeapon } = await import("../combat.mjs");
    return attackWithWeapon(gunner, item);
  }

  static async #onEditItem(event, target) {
    this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId)?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    return this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId)?.delete();
  }
}
