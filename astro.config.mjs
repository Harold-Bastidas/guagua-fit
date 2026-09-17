// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// GuaguaFit — sitio estático (vertical slice, zona Grips y Muñequeras).
export default defineConfig({
  site: "https://guagua-fit.vercel.app",
  output: "static",
  integrations: [tailwind({ applyBaseStyles: false })],
});

// Nota (repo en /mnt/c vía WSL): inotify no dispara de forma confiable en
// este mount, así que `astro dev` a veces sirve versiones viejas de un
// archivo recién editado. `usePolling: true` "arregla" el HMR pero
// escanea node_modules entero sobre 9p y el dev server nunca llega a
// "ready" en un tiempo razonable — probado y descartado. El workaround
// real: si un cambio no se refleja, matar el proceso de `astro dev` y
// arrancarlo de nuevo (recoge el estado actual de los archivos al vuelo).
