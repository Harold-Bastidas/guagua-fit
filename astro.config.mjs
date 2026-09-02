// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// GuaguaFit — sitio estático (vertical slice, zona Grips y Muñequeras).
export default defineConfig({
  site: "https://guaguafit-demo.vercel.app",
  output: "static",
  integrations: [tailwind({ applyBaseStyles: false })],
});
