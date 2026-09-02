import { defineConfig, devices } from "@playwright/test";

// Smoke tests corren contra `astro preview` (build estático).
const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "S1-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testMatch: /smoke\.spec\.ts/,
      grep: /@s1/,
    },
    {
      name: "S2-mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /smoke\.spec\.ts/,
      grep: /@s2/,
    },
  ],
  webServer: {
    command: "bun run build && bun run preview",
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
