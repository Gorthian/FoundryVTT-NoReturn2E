/**
 * Minimaler Ersatz für die `foundry.data.fields`- und `foundry.abstract.TypeDataModel`-Klassen,
 * damit die DataModels des Systems (module/data/*.mjs) ohne laufendes Foundry geladen und die
 * Compendium-Quellen dagegen geprüft werden können. Es werden nur die Felder unterstützt, die das
 * System verwendet; Prüfung ist bewusst strenger als Foundry (unbekannte Felder sind Fehler).
 */
class Field {
  constructor(options = {}) { this.options = options; }
  /** Gibt eine Liste von Fehlertexten zurück. */
  check(value, p) { return []; }
}
class NumberField extends Field {
  check(v, p) {
    const o = this.options;
    if (v === null) return o.nullable ? [] : [`${p}: null nicht erlaubt`];
    if (typeof v !== "number" || Number.isNaN(v)) return [`${p}: Zahl erwartet, gefunden ${JSON.stringify(v)}`];
    const e = [];
    if (o.integer && !Number.isInteger(v)) e.push(`${p}: Ganzzahl erwartet, gefunden ${v}`);
    if (o.min !== undefined && v < o.min) e.push(`${p}: ${v} < Minimum ${o.min}`);
    if (o.max !== undefined && v > o.max) e.push(`${p}: ${v} > Maximum ${o.max}`);
    return e;
  }
}
class StringField extends Field {
  check(v, p) {
    const o = this.options;
    if (v === null) return o.nullable ? [] : [`${p}: null nicht erlaubt`];
    if (typeof v !== "string") return [`${p}: Text erwartet, gefunden ${JSON.stringify(v)}`];
    if (v === "" && o.blank === false && !(o.choices ?? []).includes("")) return [`${p}: darf nicht leer sein`];
    if (o.choices && !o.choices.includes(v)) return [`${p}: "${v}" ist keiner der erlaubten Werte (${o.choices.map(c => `"${c}"`).join(", ")})`];
    return [];
  }
}
class HTMLField extends StringField {}
class BooleanField extends Field {
  check(v, p) { return typeof v === "boolean" ? [] : [`${p}: Wahrheitswert erwartet, gefunden ${JSON.stringify(v)}`]; }
}
class ArrayField extends Field {
  constructor(element, options) { super(options); this.element = element; }
  check(v, p) {
    if (!Array.isArray(v)) return [`${p}: Liste erwartet`];
    return v.flatMap((item, i) => this.element.check(item, `${p}[${i}]`));
  }
}
class SchemaField extends Field {
  constructor(fields, options) { super(options); this.fields = fields; }
  check(v, p) {
    if (v === null || typeof v !== "object" || Array.isArray(v)) return [`${p}: Objekt erwartet`];
    const e = [];
    for (const [k, val] of Object.entries(v)) {
      const f = this.fields[k];
      if (!f) e.push(`${p ? p + "." : ""}${k}: unbekanntes Feld`);
      else e.push(...f.check(val, `${p ? p + "." : ""}${k}`));
    }
    return e;
  }
}
class TypeDataModel {
  /** Prüft ein `system`-Objekt gegen das Schema; Fehlertexte oder []. */
  static validateSource(system) {
    return new SchemaField(this.defineSchema()).check(system, "system");
  }
}

export function installShim() {
  globalThis.foundry = {
    data: { fields: { NumberField, StringField, HTMLField, BooleanField, ArrayField, SchemaField } },
    abstract: { TypeDataModel }
  };
}
