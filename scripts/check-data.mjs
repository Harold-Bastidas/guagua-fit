#!/usr/bin/env node
/**
 * check-data.mjs — corre en `prebuild`.
 * Falla con exit 1 si:
 *   - algún productos[].zona no ∈ zonas[].id
 *   - algún zonas[].productos[] no ∈ productos[].slug
 * `zonas.json[].id` es la única fuente de verdad del identificador de zona.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../src/data");

const load = (name) =>
  JSON.parse(readFileSync(resolve(dataDir, name), "utf8"));

const zonas = load("zonas.json");
const productos = load("productos.json");

const zonaIds = new Set(zonas.map((z) => z.id));
const productoSlugs = new Set(productos.map((p) => p.slug));

const errors = [];

for (const p of productos) {
  if (!zonaIds.has(p.zona)) {
    errors.push(
      `producto "${p.slug}": zona "${p.zona}" no existe en zonas.json (ids: ${[...zonaIds].join(", ")})`
    );
  }
}

for (const z of zonas) {
  for (const slug of z.productos ?? []) {
    if (!productoSlugs.has(slug)) {
      errors.push(
        `zona "${z.id}": producto "${slug}" no existe en productos.json (slugs: ${[...productoSlugs].join(", ")})`
      );
    }
  }
}

if (errors.length > 0) {
  console.error("\x1b[31m✖ check-data: datos inconsistentes\x1b[0m");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `\x1b[32m✔ check-data: ${zonas.length} zonas, ${productos.length} productos — ids OK\x1b[0m`
);
