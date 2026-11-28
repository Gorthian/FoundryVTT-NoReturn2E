/**
 * Abgleich von Actor-Items mit dem Kompendium: Zuordnung und Unterschiede.
 * Reine Logik ohne Foundry-Globals (testbar mit Node); die Oberfläche steht in sync.mjs.
 */

/** Nutzerfelder je Itemtyp (Pfade unter `system`): bleiben beim Abgleich unverändert. */
const PHYSICAL = ["quantity", "equipped", "taped"];
export const USER_FIELDS = {
  weapon: [...PHYSICAL, "ammo.value", "ammo.type"],
  ammo: [...PHYSICAL],
  armor: [...PHYSICAL],
  gear: [...PHYSICAL, "uses.value"],
  augment: [...PHYSICAL, "installed"],
  skill: ["value", "native"],
  psiPower: ["value", "free", "show", "active"],
  psiApp: ["held"],
  styleSkill: ["variant", "active", "level", "uses.value"],
  abnormality: ["variant"],
  bioTrait: ["level", "charges.value"],
  advantage: ["markers", "level"],
  species: [],
  trait: []
};

/** HTML-Textfelder: in der Vorschau nur als „Text geändert“ angezeigt. */
export const HTML_FIELDS = new Set(["description", "hint"]);

/** Namen, deren Skill-Modifikatoren der Generator je Charakter individuell setzt. */
const SKILL_MOD_NAMES = /^(N²|Mysteriöses Implantat|Meisterschaft)/;

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

/** Name ohne angehängte Auswahl: „Memorum [Telekinese]“ → „Memorum“. */
export const baseName = n => String(n ?? "").replace(/\s*[(\[][^)\]]*[)\]]\s*$/, "").trim();

/** Katalog aus Dokumenten: Zugriff über UUID und Typ. */
export function makeCatalog(docs) {
  const byUuid = new Map();
  const byType = new Map();
  for (const d of docs) {
    byUuid.set(d.uuid, d);
    (byType.get(d.type) ?? byType.set(d.type, []).get(d.type)).push(d);
  }
  return { byUuid, byType };
}

/**
 * Katalogeintrag zu einem Item finden.
 * Reihenfolge: Herkunft (compendiumSource / sourceId) → gespeicherter Schlüssel `system.key` →
 * Name → Name ohne Auswahl in Klammern. Mit `strict` müssen Schlüssel- und Teilnamentreffer eindeutig sein.
 * @returns {{doc: object, how: "source"|"key"|"name"|"fuzzy"}|null}
 */
export function findCatalogDoc(item, catalog, { strict = false } = {}) {
  const src = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
  if (src && catalog.byUuid.has(src)) return { doc: catalog.byUuid.get(src), how: "source" };

  const cands = catalog.byType.get(item.type) ?? [];
  const key = item._source?.system?.key;
  if (key) {
    const hits = cands.filter(x => x.system?.key === key);
    if (hits.length === 1) return { doc: hits[0], how: "key" };
  }
  const exact = cands.find(x => x.name === item.name);
  if (exact) return { doc: exact, how: "name" };

  const base = baseName(item.name);
  const fuzzy = cands.filter(x => baseName(x.name) && baseName(x.name) === base);
  if (fuzzy.length === 1 || (!strict && fuzzy.length)) return { doc: fuzzy[0], how: "fuzzy" };
  if (item.type === "advantage" && item.name.startsWith("Schwaches Attribut")) {
    const w = cands.find(x => x.name.startsWith("Schwaches Attribut"));
    if (w) return { doc: w, how: "fuzzy" };
  }
  return null;
}

/** Ist der Itemname eine vom Nutzer/Generator gewählte Variante des Katalognamens? */
export function isVariantName(itemName, docName) {
  const b = baseName(docName);
  return itemName !== docName && !!b && itemName.startsWith(b);
}

function walk(cur, tgt, keep, path, out) {
  for (const [k, tv] of Object.entries(tgt ?? {})) {
    const p = path ? `${path}.${k}` : k;
    if (keep.has(p) || tv === undefined) continue;
    const cv = cur?.[k];
    if (isObj(tv) && isObj(cv)) walk(cv, tv, keep, p, out);
    else if (!eq(cv, tv)) out.push({ path: p, from: cv, to: tv });
  }
}

/**
 * Unterschiede zwischen einem Actor-Item (`cur`) und dem Katalogeintrag (`tgt`), beide als Rohdaten.
 * @param {object} [opts]
 * @param {string[]} [opts.defaultIcons]  Platzhalter-Icons, die durch das Katalog-Icon ersetzt werden dürfen
 * @returns {{changes: {path: string, from: any, to: any, html: boolean}[], patch: object}}
 */
export function diffItemData(cur, tgt, { defaultIcons = [] } = {}) {
  const keep = new Set(USER_FIELDS[cur.type] ?? []);
  const t = structuredClone(tgt);
  const sys = t.system ?? {};
  const csys = cur.system ?? {};

  // Vom Generator individuell gesetzte Werte erhalten
  if (SKILL_MOD_NAMES.test(cur.name ?? "")) {
    const own = (csys.modifiers ?? []).filter(m => String(m.target).startsWith("skills.")
      && !(sys.modifiers ?? []).some(x => x.target === m.target && x.value === m.value));
    sys.modifiers = [...(sys.modifiers ?? []), ...own];
  }
  if (/\(einziehbar\)\s*$/.test(cur.name ?? "")) { keep.add("kind"); keep.add("gp"); }

  const raw = [];
  if (!isVariantName(cur.name, t.name) && cur.name !== t.name) raw.push({ path: "name", from: cur.name, to: t.name });
  if (t.img && t.img !== cur.img && (!cur.img || defaultIcons.includes(cur.img))) raw.push({ path: "img", from: cur.img, to: t.img });
  const sysChanges = [];
  walk(csys, sys, keep, "", sysChanges);
  for (const c of sysChanges) raw.push({ ...c, path: `system.${c.path}` });

  const changes = raw.map(c => ({ ...c, html: HTML_FIELDS.has(c.path.split(".").pop()) }));
  const patch = Object.fromEntries(changes.map(c => [c.path, c.to]));
  return { changes, patch };
}

/** Felder eines ActiveEffects, die abgeglichen werden (Zustand `disabled` bleibt beim Nutzer). */
const EFFECT_FIELDS = ["name", "img", "description", "transfer", "statuses", "changes"];

/**
 * Effekte abgleichen (Zuordnung über den Namen). Eigene Effekte am Item bleiben unberührt.
 * @returns {{create: object[], update: object[], changes: {path: string, text: string}[]}}
 */
export function diffEffects(curEffects, tgtEffects) {
  const create = [], update = [], changes = [];
  for (const te of tgtEffects ?? []) {
    const ce = (curEffects ?? []).find(e => e.name === te.name);
    if (!ce) {
      const o = structuredClone(te);
      delete o._id; delete o._stats;
      create.push(o);
      changes.push({ path: `effects.${te.name}`, text: "new" });
      continue;
    }
    const fields = EFFECT_FIELDS.filter(f => te[f] !== undefined && !eq(ce[f], te[f]));
    if (fields.length) {
      update.push({ _id: ce._id, ...Object.fromEntries(fields.map(f => [f, structuredClone(te[f])])) });
      changes.push({ path: `effects.${te.name}`, text: "changed" });
    }
  }
  return { create, update, changes };
}

/* -------------------------------------------- */
/*  Weltdokumente: Makros, Würfeltabellen, Journale */
/* -------------------------------------------- */

/** Felder, die bei Makros abgeglichen werden. */
const MACRO_FIELDS = ["name", "img", "type", "scope", "command"];
/** Felder einer Würfeltabelle (die Ergebnisse werden getrennt verglichen). */
const TABLE_FIELDS = ["name", "description", "formula", "replacement", "displayRoll"];
const RESULT_FIELDS = ["type", "name", "description", "img", "weight", "range", "documentUuid", "text"];
/** Felder einer Journalseite (Reihenfolge und Zustand wie Sichtbarkeit bleiben beim Nutzer). */
const PAGE_FIELDS = ["type", "src", "text.content", "text.format", "title.show", "title.level"];

const getPath = (o, p) => p.split(".").reduce((v, k) => v?.[k], o);
const setPath = (o, p, v) => {
  const ks = p.split(".");
  const last = ks.pop();
  const parent = ks.reduce((x, k) => (x[k] ??= {}), o);
  parent[last] = v;
};

function diffFields(cur, tgt, fields) {
  const changes = [];
  for (const f of fields) {
    const to = getPath(tgt, f);
    if (to === undefined) continue;
    const from = getPath(cur, f);
    if (!eq(from, to)) changes.push({ path: f, from, to, html: f === "text.content" });
  }
  return changes;
}

/** Makro: Name, Bild, Typ, Geltungsbereich und Befehl. */
export function diffMacro(cur, tgt) {
  const changes = diffFields(cur, tgt, MACRO_FIELDS);
  return { changes, patch: Object.fromEntries(changes.map(c => [c.path, c.to])), ops: {} };
}

const normResult = r => Object.fromEntries(RESULT_FIELDS.filter(f => r[f] !== undefined).map(f => [f, r[f]]));

/** Würfeltabelle: Kopfdaten per Update, Ergebnisse (bei Abweichung) komplett ersetzt. */
export function diffTable(cur, tgt) {
  const changes = diffFields(cur, tgt, TABLE_FIELDS);
  const patch = Object.fromEntries(changes.map(c => [c.path, c.to]));
  const ops = {};
  const a = (cur.results ?? []).map(normResult);
  const b = (tgt.results ?? []).map(normResult);
  if (!eq(a, b)) {
    ops.results = (tgt.results ?? []).map(r => { const o = structuredClone(r); delete o._id; delete o._stats; delete o.drawn; return o; });
    changes.push({ path: "results", text: "NR.Sync.ResultsChanged", n: `${a.length} → ${b.length}` });
  }
  return { changes, patch, ops };
}

/** Journal: Name sowie Seiten über den Seitennamen; eigene Zusatzseiten bleiben unberührt. */
export function diffJournal(cur, tgt) {
  const changes = diffFields(cur, tgt, ["name"]);
  const patch = Object.fromEntries(changes.map(c => [c.path, c.to]));
  const create = [], update = [];
  for (const tp of tgt.pages ?? []) {
    const cp = (cur.pages ?? []).find(p => p.name === tp.name);
    if (!cp) {
      const o = structuredClone(tp);
      delete o._id; delete o._stats;
      create.push(o);
      changes.push({ path: `pages.${tp.name}`, text: "NR.Sync.PageNew" });
      continue;
    }
    const fields = diffFields(cp, tp, PAGE_FIELDS);
    if (fields.length) {
      const u = { _id: cp._id };
      for (const f of fields) setPath(u, f.path, f.to);
      update.push(u);
      changes.push({ path: `pages.${tp.name}`, text: "NR.Sync.PageChanged" });
    }
  }
  return { changes, patch, ops: { pages: { create, update } } };
}
