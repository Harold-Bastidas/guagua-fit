import { describe, expect, test } from "bun:test";
import {
  buildProductos,
  isSafeImageFilename,
  normalizePrice,
  parseCSV,
} from "../scripts/check-data.mjs";

const zonas = [
  { id: "grips", activa: true },
  { id: "levantamiento", activa: false },
];
const imageFiles = new Set(["sun-grips.jpg", "iron-grips.jpg"]);

describe("parseCSV", () => {
  test("happy path: headers + filas bien formadas", () => {
    const csv =
      'slug,nombre,zona,precio,imagen,descripcion\n' +
      'sun-grips,Sun Grips,grips,140000,sun-grips.jpg,"Agarre brutal, sin importar la barra."';
    const rows = parseCSV(csv);
    expect(rows).toEqual([
      {
        slug: "sun-grips",
        nombre: "Sun Grips",
        zona: "grips",
        precio: "140000",
        imagen: "sun-grips.jpg",
        descripcion: "Agarre brutal, sin importar la barra.",
      },
    ]);
  });

  test("headers rotos/faltantes → error distinguible", () => {
    const csv = "slug,nombre\nsun-grips,Sun Grips";
    expect(() => parseCSV(csv)).toThrow(/falta la columna/);
  });

  test("HTML en vez de CSV (link mal publicado) → error distinguible, no parsea silencioso", () => {
    const html = "<!doctype html><html><body>Error 404</body></html>";
    expect(() => parseCSV(html)).toThrow(/HTML en vez de CSV/);
  });

  test("BOM al inicio no rompe el parseo", () => {
    const csv =
      "﻿slug,nombre,zona,precio,imagen,descripcion\n" +
      "sun-grips,Sun Grips,grips,140000,sun-grips.jpg,desc";
    const rows = parseCSV(csv);
    expect(rows[0].slug).toBe("sun-grips");
  });
});

describe("normalizePrice", () => {
  test("entero positivo válido", () => {
    expect(normalizePrice("140000")).toBe(140000);
  });
  test("formato con puntos/comas → inválido (no coerciona)", () => {
    expect(normalizePrice("140.000")).toBeNull();
    expect(normalizePrice("140,000")).toBeNull();
  });
  test("blank/negativo/no-numérico → inválido", () => {
    expect(normalizePrice("")).toBeNull();
    expect(normalizePrice("-5")).toBeNull();
    expect(normalizePrice("ciento cuarenta mil")).toBeNull();
  });
});

describe("isSafeImageFilename", () => {
  test("nombre simple con extensión soportada → válido", () => {
    expect(isSafeImageFilename("sun-grips.jpg")).toBe(true);
  });
  test("path traversal o rutas → inválido", () => {
    expect(isSafeImageFilename("../../etc/passwd.jpg")).toBe(false);
    expect(isSafeImageFilename("carpeta/foto.jpg")).toBe(false);
  });
  test("extensión no soportada → inválido", () => {
    expect(isSafeImageFilename("sun-grips.gif")).toBe(false);
  });
});

describe("buildProductos", () => {
  const validRow = {
    slug: "sun-grips",
    nombre: "Sun Grips",
    zona: "grips",
    precio: "140000",
    imagen: "sun-grips.jpg",
    descripcion: "desc",
  };

  test("happy path: fila válida → 0 errores", () => {
    const { productos, errors } = buildProductos([validRow], { zonas, imageFiles });
    expect(errors).toEqual([]);
    expect(productos).toEqual([
      { slug: "sun-grips", nombre: "Sun Grips", zona: "grips", precio: 140000, imagen: "sun-grips.jpg", descripcion: "desc" },
    ]);
  });

  test("precio inválido → error nombrando la fila (+ cascada: la zona se queda sin productos válidos)", () => {
    const { errors } = buildProductos([{ ...validRow, precio: "ciento cuarenta mil" }], {
      zonas,
      imageFiles,
    });
    expect(errors[0]).toMatch(/fila 2/);
    expect(errors[0]).toMatch(/precio/);
    // la fila rechazada deja a "grips" (activa) con 0 productos válidos —
    // ambos errores son correctos, no un bug del validador.
    expect(errors).toContain('zona "grips" está activa pero quedó con 0 productos válidos tras la validación');
  });

  test("zona inactiva → error, producto no se publica en ningún lado", () => {
    const { productos, errors } = buildProductos(
      [{ ...validRow, slug: "otro", zona: "levantamiento" }],
      { zonas, imageFiles }
    );
    expect(productos).toEqual([]);
    expect(errors[0]).toMatch(/no está activa/);
  });

  test("zona inexistente → error", () => {
    const { errors } = buildProductos([{ ...validRow, zona: "cardio" }], { zonas, imageFiles });
    expect(errors[0]).toMatch(/no existe en zonas\.json/);
  });

  test("slug duplicado → la segunda fila se rechaza", () => {
    const { productos, errors } = buildProductos([validRow, validRow], { zonas, imageFiles });
    expect(productos.length).toBe(1);
    expect(errors[0]).toMatch(/duplicado/);
  });

  test("imagen con path traversal → error, no llega a resolverse", () => {
    const { errors } = buildProductos([{ ...validRow, imagen: "../../etc/passwd.jpg" }], {
      zonas,
      imageFiles,
    });
    expect(errors[0]).toMatch(/imagen.*inválida/);
  });

  test("imagen que no existe en el directorio → error", () => {
    const { errors } = buildProductos([{ ...validRow, imagen: "no-existe.jpg" }], {
      zonas,
      imageFiles,
    });
    expect(errors[0]).toMatch(/no existe en src\/assets\/productos/);
  });

  test("zona activa con 0 productos válidos → error dedicado", () => {
    const { errors } = buildProductos([], { zonas, imageFiles });
    expect(errors).toContain('zona "grips" está activa pero quedó con 0 productos válidos tras la validación');
  });
});
