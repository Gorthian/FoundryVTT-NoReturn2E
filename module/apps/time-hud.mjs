import { restParty } from "../timed.mjs";
import { TIME, getDate, formatDate, formatTime, isDaytime, advance, setDate, sceneSynced, syncLighting } from "../time.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const SYSTEM_ID = "noreturn";

/**
 * Zeit-HUD: zeigt das Datum nach NoReturn-Zeitrechnung und lässt die Spielleitung die Zeit steuern
 * (Datum/Uhrzeit setzen, ± Kampfrunden/Minuten/Stunden/Tage/Zonate). Spieler sehen optional nur die Anzeige.
 */
export class NRTimeHud extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "noreturn-time-hud",
    classes: ["noreturn", "nr-time-hud"],
    window: { title: "NR.Time.Title", icon: "fa-solid fa-clock", resizable: false, minimizable: true },
    position: { width: 340, top: 80, left: 130 },
    actions: {
      step: NRTimeHud.#onStep,
      quick: NRTimeHud.#onQuick,
      rest: NRTimeHud.#onRest,
      apply: NRTimeHud.#onApply,
      sync: NRTimeHud.#onSync,
      toggleLight: NRTimeHud.#onToggleLight
    }
  };

  static PARTS = {
    main: { template: "systems/noreturn/templates/apps/time-hud.hbs" }
  };

  /** Eingabefelder wurden bearbeitet und werden bei Zeitänderungen nicht überschrieben. */
  #dirty = false;

  /** Gewählte Schrittweite für „Zeit verschieben“ (bleibt über Neuzeichnen erhalten). */
  #amount = 1;
  #unit = "hour";

  /** @type {NRTimeHud|undefined} */
  static instance;

  /** Soll das HUD für diesen Benutzer angezeigt werden? */
  static get enabled() {
    if (!game.settings.get(SYSTEM_ID, "timeHud")) return false;
    return game.user.isGM || game.settings.get(SYSTEM_ID, "timeHudPlayers");
  }

  /** Zeigt oder schließt das HUD gemäß den Einstellungen. */
  static refresh() {
    if (NRTimeHud.enabled) NRTimeHud.show();
    else NRTimeHud.instance?.close();
  }

  static show({ force = false } = {}) {
    if (!force && !NRTimeHud.enabled) return;
    if (force && !game.user.isGM && !game.settings.get(SYSTEM_ID, "timeHudPlayers")) return;
    NRTimeHud.instance ??= new NRTimeHud();
    return NRTimeHud.instance.render({ force: true });
  }

  async _prepareContext() {
    const date = getDate();
    const i18n = game.i18n;
    const zonats = [{ value: 0, label: i18n.localize("NR.Time.Liberation") }];
    for (let z = 1; z <= 18; z++) zonats.push({ value: z, label: i18n.localize(`NR.Time.Zonat${z}`) });
    const scene = canvas?.scene;
    return {
      isGM: game.user.isGM,
      date,
      dateText: formatDate(date),
      timeText: formatTime(date),
      day: isDaytime(date),
      zonats: zonats.map(z => ({ ...z, selected: z.value === (date.liberation ? 0 : date.zonat) })),
      timeValue: formatTime(date),
      amount: this.#amount,
      units: ["round", "minute", "hour", "day", "week", "zonat"].map(k => ({ key: k, label: i18n.localize(`NR.Time.Unit.${k}`), selected: k === this.#unit })),
      quick: [
        { label: i18n.localize("NR.Time.QuickRound"), unit: "round", n: 1 }, { label: "+1 min", unit: "minute", n: 1 }, { label: "+10 min", unit: "minute", n: 10 },
        { label: "+1 h", unit: "hour", n: 1 }, { label: "+8 h", unit: "hour", n: 8 }, { label: i18n.localize("NR.Time.QuickDay"), unit: "day", n: 1 }
      ],
      lightEnabled: game.settings.get(SYSTEM_ID, "timeLightSync"),
      lightScene: !!scene,
      lightActive: sceneSynced(scene),
      auto: game.settings.get(SYSTEM_ID, "timeAuto"),
      maxDay: date.liberation ? TIME.liberationDays : TIME.daysPerZonat
    };
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    ui.controls?.render();
  }

  _onClose(options) {
    super._onClose?.(options);
    ui.controls?.render();
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    // Nach jedem Render zeigen die Eingabefelder wieder die aktuelle Weltzeit.
    this.#dirty = false;
    this.element.querySelectorAll(".nr-time-pick input, .nr-time-pick select").forEach(el => el.addEventListener("input", () => { this.#dirty = true; }));
    this.element.querySelector("[name=amount]")?.addEventListener("input", ev => { this.#amount = Math.max(0, Number(ev.currentTarget.value) || 0); });
    this.element.querySelector("[name=unit]")?.addEventListener("change", ev => { this.#unit = ev.currentTarget.value; });
    this.element.querySelector("[name=zonat]")?.addEventListener("change", ev => {
      const day = this.element.querySelector("[name=day]");
      if (!day) return;
      const max = Number(ev.currentTarget.value) === 0 ? TIME.liberationDays : TIME.daysPerZonat;
      day.max = max;
      if (Number(day.value) > max) day.value = max;
    });
  }

  /** Weltzeit hat sich geändert: Anzeige aktualisieren (Eingaben nur, wenn nicht gerade bearbeitet). */
  onTimeChanged() {
    if (!this.rendered) return;
    if (this.#dirty) {
      const date = getDate();
      const set = (sel, v) => { const el = this.element.querySelector(sel); if (el) el.textContent = v; };
      set("[data-nr-date]", formatDate(date)); set("[data-nr-time]", formatTime(date));
      const icon = this.element.querySelector("[data-nr-daynight]");
      if (icon) icon.className = `fa-solid ${isDaytime(date) ? "fa-sun" : "fa-moon"}`;
    } else this.render();
  }

  /* -------------------------------------------- */

  static async #onStep(event, target) {
    const form = target.closest(".nr-time-hud");
    const n = Number(form.querySelector("[name=amount]")?.value) || 0;
    const unit = form.querySelector("[name=unit]")?.value ?? "hour";
    const sign = Number(target.dataset.dir) || 1;
    await advance({ seconds: sign * n * TIME.units[unit] });
  }

  static async #onQuick(event, target) {
    await advance({ seconds: Number(target.dataset.n) * TIME.units[target.dataset.unit] });
  }

  /** Rast für die markierten Tokens: Zeit vorspulen, Adrenalin/Regenerationspool erholen. */
  static async #onRest(event, target) {
    await restParty(Number(target.dataset.hours) || 8);
  }

  static async #onApply(event, target) {
    const el = target.closest(".nr-time-hud");
    const val = name => el.querySelector(`[name=${name}]`)?.value;
    const [hour, minute] = String(val("time") || "00:00").split(":").map(Number);
    const cur = getDate();
    const num = (v, fallback) => (String(v ?? "").trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback);
    const zonat = num(val("zonat"), cur.liberation ? 0 : cur.zonat);
    this.#dirty = false;
    await setDate({
      year: num(val("year"), cur.year), zonat, liberation: zonat === 0,
      day: num(val("day"), 1), hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0
    });
    this.render();
  }

  static #onSync() {
    this.#dirty = false;
    this.render();
  }

  static async #onToggleLight() {
    const scene = canvas?.scene;
    if (!scene) return;
    await scene.setFlag(SYSTEM_ID, "timeLight", scene.getFlag(SYSTEM_ID, "timeLight") === false);
    await syncLighting();
    this.render();
  }
}
