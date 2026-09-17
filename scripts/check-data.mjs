#!/usr/bin/env node
/**
 * check-data.mjs — corre en `prebuild` y `predev`.
 *
 * Fetchea la Google Sheet de productos (publicada como CSV, ver .env.example),
 * descarga las fotos nuevas que José haya linkeado desde Drive (columna
 * opcional `imagen_url`, ver downloadImage/toDirectDownloadUrl más abajo),
 * la parsea, la valida, y escribe src/data/productos.json. Falla con exit 1
 * (mensaje señalando la fila/columna exacta) si:
 *   - la Sheet no responde / responde con HTML en vez de CSV
 *   - falta alguna columna esperada
 *   - una fila tiene: slug vacío o duplicado, nombre/descripcion vacíos,
 *     precio no-entero-positivo, zona inexistente o no activa, o
 *     imagen que no es un nombre de archivo simple .jpg/.jpeg/.png existente
 *     en src/assets/productos/ (o descargable desde `imagen_url`)
 *   - `imagen_url` está presente pero la descarga falla o el contenido no
 *     es una imagen válida (Drive devuelve HTML si el link no es público)
 *   - una zona activa queda con 0 productos válidos tras la validación
 *
 * `zonas.json[].id` + `.activa` siguen siendo la fuente de verdad de qué
 * zonas existen y cuáles están vivas — la Sheet solo aporta productos.
 *
 * Las funciones de abajo son puras y exportadas para tests (bun test,
 * ver tests/check-data.spec.ts). `main()` es el único punto con I/O
 * (red + filesystem) y solo corre cuando el archivo se ejecuta directo.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../src/data");
const productosImgDir = resolve(__dirname, "../src/assets/productos");
const EXPECTED_COLUMNS = ["slug", "nombre", "zona", "precio", "imagen", "descripcion"];

const load = (name) => JSON.parse(readFileSync(resolve(dataDir, name), "utf8"));

/**
 * @typedef {{ slug: string, nombre: string, zona: string, precio: string, imagen: string, descripcion: string, imagen_url?: string }} SheetRow
 */

// ┌──────────────────────────────────────────────────────────────────────────┐
// │ parseCSV — parser RFC4180-ish mínimo: comillas, comas y saltos de línea   │
// │ dentro de campos entrecomillados, BOM. No usa una lib porque el shape    │
// │ de entrada es simple (export de Google Sheets) y evita una dependencia.  │
// └──────────────────────────────────────────────────────────────────────────┘
/**
 * @param {string} text
 * @returns {SheetRow[]}
 */
export function parseCSV(text) {
  const s = text.replace(/^﻿/, "");
  if (/^\s*<(!doctype html|html)/i.test(s)) {
    throw new Error(
      "la Sheet devolvió HTML en vez de CSV — revisá que el link sea el de exportación, no el de edición"
    );
  }
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell !== ""));
  if (nonEmpty.length === 0) {
    throw new Error(
      "CSV vacío o no reconocible (¿la Sheet devolvió HTML en vez de CSV? revisá que el link sea el de exportación, no el de edición)"
    );
  }

  const [header, ...dataRows] = nonEmpty;
  for (const col of EXPECTED_COLUMNS) {
    if (!header.includes(col)) {
      throw new Error(
        `CSV inválido: falta la columna "${col}" (headers encontrados: ${header.join(", ")})`
      );
    }
  }

  return dataRows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => {
      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

/**
 * Entero positivo estricto. "$140.000", "140,000", "" o negativos → null.
 * @param {string} raw
 * @returns {number | null}
 */
export function normalizePrice(raw) {
  const cleaned = String(raw ?? "").trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Solo nombre de archivo simple, sin rutas, extensión soportada por astro:assets glob.
 * @param {string} name
 * @returns {boolean}
 */
export function isSafeImageFilename(name) {
  if (typeof name !== "string" || name.length === 0) return false;
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  return /\.(jpe?g|png)$/i.test(name);
}

/**
 * Valida cada fila y arma productos.json. Devuelve { productos, errors }.
 * Una fila con cualquier error se excluye del resultado (no queda a medias).
 * @param {SheetRow[]} rows
 * @param {{ zonas: Array<{id: string, activa: boolean}>, imageFiles: Set<string> }} deps
 * @returns {{ productos: Array<{slug: string, nombre: string, zona: string, precio: number, imagen: string, descripcion: string}>, errors: string[] }}
 */
export function buildProductos(rows, { zonas, imageFiles }) {
  const zonasById = new Map(zonas.map((z) => [z.id, z]));
  const errors = [];
  const seenSlugs = new Set();
  const productos = [];
  const validCountByZona = new Map();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 header, +1 para contar desde 1 como en la Sheet
    const { slug, nombre, zona, precio, imagen, descripcion } = row;
    const rowErrors = [];

    if (!slug) rowErrors.push('falta "slug"');
    else if (seenSlugs.has(slug)) rowErrors.push(`slug "${slug}" duplicado`);

    if (!nombre) rowErrors.push('falta "nombre"');
    if (!descripcion) rowErrors.push('falta "descripcion"');

    const zonaDef = zonasById.get(zona);
    if (!zonaDef) {
      rowErrors.push(`zona "${zona}" no existe en zonas.json`);
    } else if (!zonaDef.activa) {
      rowErrors.push(`zona "${zona}" existe pero no está activa todavía`);
    }

    const precioNum = normalizePrice(precio);
    if (precioNum === null) {
      rowErrors.push(`precio "${precio}" inválido (debe ser un entero positivo)`);
    }

    if (!isSafeImageFilename(imagen)) {
      rowErrors.push(
        '"imagen" inválida — debe ser solo un nombre de archivo .jpg/.jpeg/.png, sin rutas'
      );
    } else if (!imageFiles.has(imagen)) {
      rowErrors.push(`la imagen "${imagen}" no existe en src/assets/productos/`);
    }

    if (rowErrors.length > 0) {
      errors.push(`fila ${rowNum} (${slug || "?"}): ${rowErrors.join("; ")}`);
      return;
    }

    seenSlugs.add(slug);
    productos.push({ slug, nombre, zona, precio: precioNum, imagen, descripcion });
    validCountByZona.set(zona, (validCountByZona.get(zona) ?? 0) + 1);
  });

  for (const z of zonas) {
    if (z.activa && !(validCountByZona.get(z.id) > 0)) {
      errors.push(`zona "${z.id}" está activa pero quedó con 0 productos válidos tras la validación`);
    }
  }

  return { productos, errors };
}

const DRIVE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/, // .../file/d/<ID>/view?usp=sharing
  /[?&]id=([a-zA-Z0-9_-]+)/, // .../open?id=<ID> o .../uc?id=<ID>
];

/**
 * Convierte un link "Compartir" de Google Drive (el que José copia tal
 * cual desde el menú de compartir) a su URL de descarga directa. Si la
 * URL no es de Drive, se devuelve sin cambios — así también sirve
 * cualquier otro host que sirva la imagen directo desde `imagen_url`.
 * @param {string} url
 * @returns {string}
 */
export function toDirectDownloadUrl(url) {
  if (!/drive\.google\.com/.test(url)) return url;
  for (const pattern of DRIVE_ID_PATTERNS) {
    const m = url.match(pattern);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  }
  return url;
}

/**
 * Magic bytes de JPEG/PNG. Sirve para detectar que Drive devolvió una
 * página HTML (link no compartido públicamente, o interstitial de "no
 * se puede escanear este archivo") en vez del archivo real — un status
 * 200 no alcanza para confiar en el contenido.
 * @param {Buffer} buf
 * @returns {boolean}
 */
export function looksLikeImage(buf) {
  if (buf.length < 4) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return jpeg || png;
}

/**
 * Descarga una imagen desde `imagen_url` (transformando el link de Drive
 * si hace falta) y valida que el contenido sea realmente una imagen.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
async function downloadImage(url) {
  const direct = toDirectDownloadUrl(url);
  let res;
  try {
    res = await fetch(direct);
  } catch (err) {
    throw new Error(`no se pudo conectar (${err.message})`);
  }
  if (!res.ok) {
    throw new Error(`respondió ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!looksLikeImage(buf)) {
    throw new Error(
      'el contenido descargado no es una imagen válida — ¿el link está compartido como "Cualquier usuario con el enlace"?'
    );
  }
  return buf;
}

/**
 * Descarga a src/assets/productos/ toda foto nueva que José haya
 * linkeado desde Drive. Solo mira filas con `imagen_url` no vacío y un
 * nombre de archivo seguro en `imagen` — el resto sigue el camino de
 * siempre (debe existir ya en el repo). Se descarga siempre que haya
 * `imagen_url`, no solo si falta el archivo, para que reemplazar la foto
 * de un producto ya existente (misma fila, mismo nombre) también quede
 * autónomo para José.
 * @param {SheetRow[]} rows
 * @returns {Promise<string[]>} errores, uno por fila fallida
 */
async function downloadLinkedImages(rows) {
  const errors = [];
  for (const row of rows) {
    const url = (row.imagen_url ?? "").trim();
    if (!url) continue;
    if (!isSafeImageFilename(row.imagen)) continue; // buildProductos ya va a marcar este error

    try {
      const buf = await downloadImage(url);
      writeFileSync(resolve(productosImgDir, row.imagen), buf);
    } catch (err) {
      errors.push(
        `slug "${row.slug || "?"}": no se pudo descargar "${row.imagen}" desde imagen_url — ${err.message}`
      );
    }
  }
  return errors;
}

async function fetchSheetCSV(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`no se pudo conectar a la Sheet: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(
      `la Sheet respondió ${res.status} ${res.statusText} — ¿el link sigue compartido/publicado?`
    );
  }
  return res.text();
}

function listImageFiles() {
  return new Set(readdirSync(productosImgDir));
}

async function main() {
  const zonas = load("zonas.json");

  const sheetUrl = process.env.SHEET_CSV_URL;
  if (!sheetUrl) {
    console.error("\x1b[31m✖ check-data: falta la variable de entorno SHEET_CSV_URL\x1b[0m");
    console.error("  Copiá .env.example a .env y completá el link de la Sheet publicada.");
    process.exit(1);
  }

  let csvText;
  try {
    csvText = await fetchSheetCSV(sheetUrl);
  } catch (err) {
    console.error(`\x1b[31m✖ check-data: ${err.message}\x1b[0m`);
    process.exit(1);
  }

  let rows;
  try {
    rows = parseCSV(csvText);
  } catch (err) {
    console.error(`\x1b[31m✖ check-data: ${err.message}\x1b[0m`);
    process.exit(1);
  }

  const downloadErrors = await downloadLinkedImages(rows);
  if (downloadErrors.length > 0) {
    console.error("\x1b[31m✖ check-data: error descargando fotos desde Drive\x1b[0m");
    for (const e of downloadErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const imageFiles = listImageFiles();
  const { productos, errors } = buildProductos(rows, { zonas, imageFiles });

  if (errors.length > 0) {
    console.error("\x1b[31m✖ check-data: datos inválidos en la Sheet\x1b[0m");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  writeFileSync(
    resolve(dataDir, "productos.json"),
    JSON.stringify(productos, null, 2) + "\n"
  );

  console.log(
    `\x1b[32m✔ check-data: ${zonas.length} zonas, ${productos.length} productos — fetch + validación OK\x1b[0m`
  );
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
