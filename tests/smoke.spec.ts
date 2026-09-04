import { test, expect } from "@playwright/test";

// S0 — portal de entrada: tap "Entrar al box" → aterriza en el gymBox
// (tag @s1: corre en el proyecto desktop, mismo filtro que el resto de S1)
test("@s1 carga / → portal visible → tap Entrar al box → revela #top", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  const portal = page.locator("[data-portal]");
  await expect(portal).toBeVisible();
  await expect(page.getByText("Entrar al box")).toBeVisible();

  await page.locator("[data-portal-enter]").click();

  // aterriza en el gymBox (#top), scrolleado a la vista
  await expect(page.locator("#top")).toBeInViewport({ timeout: 5000 });
  await expect(page.locator("[data-hotspot]").first()).toBeVisible();

  expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
});

// S1 — desktop 1280x800
test("@s1 carga / → 4 marcadores → tap Grips → panel con 3 productos → Ver zona → scroll a #grips", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  // 4 hotspots visibles
  const hotspots = page.locator("[data-hotspot]");
  await expect(hotspots).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(hotspots.nth(i)).toBeVisible();
  }

  // tap en Grips y Muñequeras
  await page.locator('[data-hotspot="grips"]').click();

  // panel con los 3 productos
  const panel = page.locator('[data-panel="grips"]');
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Sun Grips")).toBeVisible();
  await expect(panel.getByText("Iron Grips")).toBeVisible();
  await expect(panel.getByText("Wristbands")).toBeVisible();
  await expect(panel.getByText("$140.000")).toBeVisible();

  // Ver zona ↓ → cierra panel y scrollea a #grips
  await panel.locator("[data-panel-verzona]").click();
  await expect(panel).toBeHidden();
  await expect(page.locator("#grips")).toBeInViewport({ timeout: 5000 });

  expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
});

// S2 — móvil 390x844 (Pixel 5)
test("@s2 tap Grips → panel (cámara-lite) → volver cierra", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-hotspot="grips"]').click();

  const panel = page.locator('[data-panel="grips"]');
  await expect(panel).toBeVisible();

  // cámara con transform aplicado (zoom)
  const transform = await page.evaluate(() => {
    const el = document.querySelector("[data-camara]") as HTMLElement;
    return getComputedStyle(el).transform;
  });
  expect(transform).not.toBe("none");

  // "volver" cierra
  await panel.locator("[data-panel-close]").click();
  await expect(panel).toBeHidden();
});

// S1b — hotspot inactivo muestra "Pronto"
test("@s1 hotspot inactivo → panel Pronto → volver", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-hotspot="kettlebells"]').click();
  const pronto = page.locator('[data-panel="__pronto"]');
  await expect(pronto).toBeVisible();
  await expect(pronto.getByText("Pronto")).toBeVisible();
  await pronto.locator("[data-panel-close]").click();
  await expect(pronto).toBeHidden();
});
