/**
 * Schreibt die Compendium-Quellen (packs-src/*.json) als LevelDB-Datenbanken nach packs/<name>.
 * Benötigt "classic-level". Ohne eigenes Node.js kann die Node-Laufzeit von Foundry genutzt werden:
 *   set ELECTRON_RUN_AS_NODE=1
 *   "C:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe" tools\build-packs.mjs
 * (siehe tools/build-packs.cmd). Foundry muss dabei geschlossen sein, falls das System dort installiert ist.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(import.meta.url);

function loadClassicLevel() {
  const candidates = [
    "classic-level",
    process.env.FOUNDRY_APP ? path.join(process.env.FOUNDRY_APP, "node_modules", "classic-level") : null,
    "C:/Program Files/Foundry Virtual Tabletop/resources/app/node_modules/classic-level",
    "/opt/foundryvtt/resources/app/node_modules/classic-level"
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c).ClassicLevel; } catch (e) { /* weiter */ }
  }
  throw new Error("classic-level nicht gefunden. `npm i classic-level` ausführen oder FOUNDRY_APP setzen.");
}

const ClassicLevel = loadClassicLevel();
const srcDir = path.join(root, "packs-src");
const outDir = path.join(root, "packs");
fs.mkdirSync(outDir, { recursive: true });

for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith(".json"))) {
  const name = path.basename(file, ".json");
  const docs = JSON.parse(fs.readFileSync(path.join(srcDir, file), "utf8"));
  const target = path.join(outDir, name);
  fs.rmSync(target, { recursive: true, force: true });
  const db = new ClassicLevel(target, { keyEncoding: "utf8", valueEncoding: "json" });
  await db.open();
  const batch = db.batch();
  let count = 0;
  for (const doc of docs) {
    const { _key, _embedded, ...data } = doc;
    batch.put(_key, data);
    count++;
    for (const emb of _embedded ?? []) {
      const { _key: ek, ...edata } = emb;
      batch.put(ek, edata);
      count++;
    }
  }
  await batch.write();
  await db.compactRange("\x00", "\xff");
  await db.close();
  console.log(`${name.padEnd(20)} ${String(count).padStart(4)} Einträge`);
}
console.log("Fertig.");
