/**
 * „Aus Kompendium aktualisieren“: Items an Charakteren mit dem Systemkompendium abgleichen
 * (pro Actor und weltweit für die SL), mit Vorschau, Ausschluss pro Item und Zusammenfassung.
 * Zuordnung und Unterschiede: sync-diff.mjs.
 */
import { NRItem } from "./documents/item.mjs";
import { makeCatalog, findCatalogDoc, diffItemData, diffEffects } from "./sync-diff.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const SYSTEM_ID = "noreturn";
const TEMPLATE = "systems/noreturn/templates/apps/compendium-sync.hbs";

/** Alle Item-Kompendien des Systems, die als Katalog dienen. */
export const CATALOG_PACKS = [
  "spezies", "abnormitaeten", "bio-eigenschaften", "vor-nachteile", "merkmale", "style-skills", "fertigkeiten",
  "psi-kraefte", "psi-apps", "waffen", "ruestungen", "ausruestung", "munition", "augmentierung"
];

const L = key => game.i18n.localize(key);
const F = (key, data) => game.i18n.format(key, data);

export function registerSyncSettings() {
  game.settings.register(SYSTEM_ID, "syncVersion", { scope: "world", config: false, type: String, default: "" });
  game.settings.registerMenu(SYSTEM_ID, "syncMenu", {
    name: "NR.Sync.MenuName",
    label: "NR.Sync.MenuLabel",
    hint: "NR.Sync.MenuHint",
    icon: "fa-solid fa-arrows-rotate",
    type: NRWorldCompendiumSync,
    restricted: true
  });
}

/** Katalog aus allen Item-Kompendien laden. */
export async function loadCatalog() {
  const docs = [];
  for (const name of CATALOG_PACKS) {
    const pack = game.packs.get(`${SYSTEM_ID}.${name}`);
    if (pack) docs.push(...await pack.getDocuments());
  }
  return makeCatalog(docs);
}

const isCompendiumLinked = item => String(item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? "").startsWith(`Compendium.${SYSTEM_ID}.`)
  || (item.type === "styleSkill" && !!item._source.system.key);

/**
 * Abgleichplan für einen Actor erstellen (ändert nichts).
 * Eigene Items ohne Kompendiumsquelle bleiben unberührt; Items mit Quelle, die im Kompendium fehlen, gelten als „verwaist“.
 */
export function planActor(actor, catalog) {
  const plan = { actor, entries: [], orphans: [], current: 0, custom: 0, excluded: 0 };
  const defaultIcons = [Item.DEFAULT_ICON, ...Object.values(NRItem.DEFAULT_ICONS)];
  for (const item of actor.items) {
    if (item.type === "skill" && item.system.category === "sprache") { plan.custom++; continue; }
    if (item.getFlag(SYSTEM_ID, "noSync")) { plan.excluded++; continue; }
    const hit = findCatalogDoc(item, catalog, { strict: true });
    if (!hit) {
      if (isCompendiumLinked(item)) plan.orphans.push(item); else plan.custom++;
      continue;
    }
    const { doc, how } = hit;
    const { changes, patch } = diffItemData(item.toObject(), doc.toObject(), { defaultIcons });
    const fx = diffEffects(item.effects.map(e => e.toObject()), doc.effects.map(e => e.toObject()));
    if (!changes.length && !fx.changes.length) { plan.current++; continue; }
    // Herkunft nachtragen, damit künftige Abgleiche eindeutig zuordnen
    if (item._stats?.compendiumSource !== doc.uuid) patch["_stats.compendiumSource"] = doc.uuid;
    plan.entries.push({ item, doc, how, changes, fx, patch, selected: how !== "fuzzy" });
  }
  return plan;
}

/** Pläne für alle Actors der Welt, die der Nutzer ändern darf. */
export async function planWorld(catalog = null) {
  catalog ??= await loadCatalog();
  return game.actors.contents
    .filter(a => a.isOwner && a.items.size)
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
    .map(a => planActor(a, catalog));
}

/** Plan anwenden: nur ausgewählte Updates und Löschungen. */
async function applyPlan(plan, { updateIds, deleteIds }) {
  const result = { actor: plan.actor, updated: 0, deleted: 0, skipped: 0, errors: [] };
  const chosen = plan.entries.filter(e => updateIds.has(e.item.id));
  result.skipped = plan.entries.length - chosen.length;
  try {
    const patches = chosen.map(e => ({ _id: e.item.id, ...e.patch })).filter(p => Object.keys(p).length > 1);
    if (patches.length) await plan.actor.updateEmbeddedDocuments("Item", patches);
    for (const e of chosen) {
      if (e.fx.create.length) await e.item.createEmbeddedDocuments("ActiveEffect", e.fx.create);
      if (e.fx.update.length) await e.item.updateEmbeddedDocuments("ActiveEffect", e.fx.update);
    }
    result.updated = chosen.length;
    const del = plan.orphans.filter(i => deleteIds.has(i.id)).map(i => i.id);
    if (del.length) await plan.actor.deleteEmbeddedDocuments("Item", del);
    result.deleted = del.length;
  } catch (err) {
    console.error("NoReturn 2E | Kompendium-Abgleich", err);
    result.errors.push(`${plan.actor.name}: ${err.message}`);
  }
  return result;
}

/* -------------------------------------------- */
/*  Darstellung                                  */
/* -------------------------------------------- */

const FIELD_LABELS = {
  name: "NR.Sync.Field.name", img: "NR.Sync.Field.img", description: "NR.Sync.Field.description", hint: "NR.Sync.Field.hint",
  modifiers: "NR.Sync.Field.modifiers"
};

function formatValue(v) {
  if (v === undefined || v === null || v === "") return "–";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 70 ? `${s.slice(0, 67)}…` : s;
}

function describeChange(c) {
  const field = c.path.replace(/^system\./, "");
  const last = field.split(".").pop();
  const label = FIELD_LABELS[last] ? L(FIELD_LABELS[last]) : field;
  if (c.html) return { label, text: L("NR.Sync.TextChanged") };
  if (c.text) return { label: c.path, text: L(c.text === "new" ? "NR.Sync.EffectNew" : "NR.Sync.EffectChanged") };
  return { label, from: formatValue(c.from), to: formatValue(c.to) };
}

/* -------------------------------------------- */
/*  Fenster                                      */
/* -------------------------------------------- */

/**
 * Vorschau und Anwendung des Abgleichs. Mit `actor` für einen Charakter, sonst für alle Actors der Welt.
 */
export class NRCompendiumSync extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "noreturn-compendium-sync",
    classes: ["noreturn", "nr-sync-app"],
    window: { title: "NR.Sync.Title", icon: "fa-solid fa-arrows-rotate", resizable: true },
    position: { width: 720, height: 680 },
    actions: {
      apply: NRCompendiumSync.#onApply,
      selectAll: NRCompendiumSync.#onSelectAll,
      selectNone: NRCompendiumSync.#onSelectNone,
      toggleActor: NRCompendiumSync.#onToggleActor,
      close: NRCompendiumSync.#onClose
    }
  };

  static PARTS = { main: { template: TEMPLATE, scrollable: [".nr-sync-list"] } };

  constructor(options = {}) {
    const { actor = null, plans = null, ...rest } = options;
    if (actor) rest.id = `${NRCompendiumSync.DEFAULT_OPTIONS.id}-${actor.id}`;
    super(rest);
    this.actor = actor;
    this.plans = plans;
    this.result = null;
  }

  /** Weltweit (SL) oder für einen Actor? */
  get isWorld() {
    return !this.actor;
  }

  /** @override */
  get title() {
    return this.actor ? F("NR.Sync.TitleActor", { name: this.actor.name }) : L("NR.Sync.TitleWorld");
  }

  async _loadPlans() {
    if (this.plans) return this.plans;
    const catalog = await loadCatalog();
    this.plans = this.actor ? [planActor(this.actor, catalog)] : await planWorld(catalog);
    return this.plans;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (this.result) return Object.assign(context, { result: this.result, isWorld: this.isWorld });
    const plans = await this._loadPlans();
    const typeLabel = t => L(`TYPES.Item.${t}`);
    const view = plans.map(p => ({
      id: p.actor.id,
      name: p.actor.name,
      current: p.current,
      excluded: p.excluded,
      custom: p.custom,
      hasWork: p.entries.length || p.orphans.length,
      entries: p.entries.map(e => ({
        id: e.item.id,
        name: e.item.name,
        type: typeLabel(e.item.type),
        selected: e.selected,
        fuzzy: e.how === "fuzzy",
        byName: e.how === "name",
        changes: [...e.changes, ...e.fx.changes].map(describeChange)
      })),
      orphans: p.orphans.map(i => ({ id: i.id, name: i.name, type: typeLabel(i.type) }))
    })).filter(p => p.hasWork || !this.isWorld);
    return Object.assign(context, {
      plans: view,
      isWorld: this.isWorld,
      empty: !view.some(p => p.hasWork),
      total: view.reduce((n, p) => n + p.entries.length, 0)
    });
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Item-Auswahl und Actor-Kopfzeile abgleichen
    if (!this.#bound) {
      this.#bound = true;
      this.element.addEventListener("change", ev => {
        const box = ev.target.closest("input[data-sel='update']");
        if (box) this.#syncActorBox(box.dataset.actor);
      });
    }
    for (const a of this.element.querySelectorAll("input[data-action='toggleActor']")) this.#syncActorBox(a.dataset.actor);
  }

  #bound = false;

  #syncActorBox(actorId) {
    const head = this.element.querySelector(`input[data-action='toggleActor'][data-actor='${actorId}']`);
    const boxes = [...this.element.querySelectorAll(`input[data-sel='update'][data-actor='${actorId}']`)];
    if (!head || !boxes.length) return;
    const n = boxes.filter(b => b.checked).length;
    head.checked = n === boxes.length;
    head.indeterminate = n > 0 && n < boxes.length;
  }

  static #setAll(app, checked, selector = "input[data-sel='update']") {
    for (const b of app.element.querySelectorAll(selector)) b.checked = checked;
    for (const a of app.element.querySelectorAll("input[data-action='toggleActor']")) app.#syncActorBox(a.dataset.actor);
  }

  static #onSelectAll() { NRCompendiumSync.#setAll(this, true); }
  static #onSelectNone() { NRCompendiumSync.#setAll(this, false); }

  static #onToggleActor(event, target) {
    for (const b of this.element.querySelectorAll(`input[data-sel='update'][data-actor='${target.dataset.actor}']`)) b.checked = target.checked;
  }

  static #onClose() { return this.close(); }

  static async #onApply() {
    const checked = sel => new Set([...this.element.querySelectorAll(sel)].filter(b => b.checked).map(b => b.dataset.item));
    const updateIds = checked("input[data-sel='update']");
    const deleteIds = checked("input[data-sel='orphan']");
    if (!updateIds.size && !deleteIds.size) return ui.notifications.warn(L("NR.Sync.NothingSelected"));
    if (deleteIds.size) {
      const ok = await DialogV2.confirm({
        window: { title: L("NR.Sync.Title") },
        content: `<p>${F("NR.Sync.ConfirmDelete", { n: deleteIds.size })}</p>`
      });
      if (!ok) return;
    }
    const results = [];
    for (const plan of this.plans) {
      if (!plan.actor.isOwner) continue;
      results.push(await applyPlan(plan, { updateIds, deleteIds }));
    }
    const sum = key => results.reduce((n, r) => n + r[key], 0);
    this.result = {
      updated: sum("updated"), deleted: sum("deleted"), skipped: sum("skipped"),
      actors: results.filter(r => r.updated || r.deleted).length,
      orphans: this.plans.reduce((n, p) => n + p.orphans.length, 0) - sum("deleted"),
      errors: results.flatMap(r => r.errors)
    };
    if (this.isWorld) await game.settings.set(SYSTEM_ID, "syncVersion", game.system.version);
    ui.notifications.info(F("NR.Sync.Done", { n: this.result.updated }));
    this.render();
  }
}

/** Menüeintrag in den Einstellungen: öffnet den weltweiten Abgleich. */
export class NRWorldCompendiumSync extends NRCompendiumSync {
  constructor(options = {}) {
    super({ ...options, actor: null });
  }
}

/** Abgleich für einen Charakter öffnen. */
export function openCompendiumSync(actor = null) {
  if (!actor && !game.user.isGM) return ui.notifications.warn(L("NR.Sync.GmOnly"));
  if (actor && !actor.isOwner) return ui.notifications.warn(L("NR.Sync.NoPermission"));
  return new NRCompendiumSync({ actor }).render(true);
}

/**
 * Nach einem Systemupdate (SL): Wenn das Kompendium Änderungen für bestehende Items bringt, nachfragen.
 */
export async function checkSyncAfterUpdate() {
  if (!game.user.isGM) return;
  const version = game.system.version;
  if (game.settings.get(SYSTEM_ID, "syncVersion") === version) return;
  const plans = (await planWorld()).filter(p => p.entries.length);
  if (!plans.length) return game.settings.set(SYSTEM_ID, "syncVersion", version);
  const items = plans.reduce((n, p) => n + p.entries.length, 0);
  const choice = await DialogV2.wait({
    window: { title: L("NR.Sync.Title"), icon: "fa-solid fa-arrows-rotate" },
    content: `<p>${F("NR.Sync.UpdatePrompt", { version, items, actors: plans.length })}</p><p><strong>${L("NR.Sync.BackupHint")}</strong></p>`,
    modal: false,
    rejectClose: false,
    buttons: [
      { action: "open", label: L("NR.Sync.OpenPreview"), icon: "fa-solid fa-magnifying-glass", default: true },
      { action: "later", label: L("NR.Sync.Later") },
      { action: "skip", label: L("NR.Sync.SkipVersion") }
    ]
  });
  if (choice === "open") new NRWorldCompendiumSync({ plans }).render(true);
  else if (choice === "skip") await game.settings.set(SYSTEM_ID, "syncVersion", version);
}
