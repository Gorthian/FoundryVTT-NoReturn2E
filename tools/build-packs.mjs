/**
 * Baut die Compendien (LevelDB) aus den Quellen packs-src/*.json nach packs/<name>.
 * Nutzt dafür die Pack-Funktion des offiziellen @foundryvtt/foundryvtt-cli (entspricht `fvtt package pack`).
 *
 * Aufruf:  npm install   (einmalig)
 *          npm run build:packs
 *
 * Quellformat (packs-src/<pack>.json): Array von Dokumenten mit `_key`; eingebettete Dokumente
 * (z. B. Journal-Seiten, Tabellen-Ergebnisse) stehen flach in `_embedded` und werden hier für die
 * CLI unter dem jeweiligen Sammlungsnamen verschachtelt.
 * packs/ ist ein reines Build-Artefakt (.gitignore); Foundry muss beim lokalen Bauen geschlossen sein,
 * falls das System dort installiert ist.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "packs-src");
const outDir = path.join(root, "packs");

/** Wandelt ein Quell-Array in einzelne, für die CLI verschachtelte Dokumentdateien um. */
export function nestDocuments(docs) {
  const nested = docs.map(({ _embedded, ...d }) => ({ ...d }));
  const byId = new Map(nested.map(d => [d._key.split("!")[2], d]));
  for (const doc of docs) {
    const parent = byId.get(doc._key.split("!")[2]);
    const buckets = {};
    for (const emb of doc._embedded ?? []) {
      const [, sublevel] = emb._key.match(/^!([^!]+)!(.+)$/);
      const collection = sublevel.split(".")[1];
      (buckets[collection] ??= []).push(emb);
    }
    for (const [collection, list] of Object.entries(buckets)) parent[collection] = list;
  }
  return nested;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nr-packs-"));
try {
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith(".json")).sort()) {
    const name = path.basename(file, ".json");
    const docs = JSON.parse(fs.readFileSync(path.join(srcDir, file), "utf8"));
    const stage = path.join(tmp, name);
    fs.mkdirSync(stage);
    for (const doc of nestDocuments(docs)) {
      fs.writeFileSync(path.join(stage, `${doc._key.split("!")[2]}.json`), JSON.stringify(doc));
    }
    const target = path.join(outDir, name);
    fs.rmSync(target, { recursive: true, force: true });
    await compilePack(stage, target);
    const count = docs.length + docs.reduce((n, d) => n + (d._embedded?.length ?? 0), 0);
    console.log(`${name.padEnd(20)} ${String(count).padStart(4)} Einträge`);
  }
  console.log("Fertig.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
