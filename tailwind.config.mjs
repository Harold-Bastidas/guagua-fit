/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens confirmados por José — sin acento cromático.
        negro: "#111110",
        crema: "#EFE7D6",
        blanco: "#FFFFFF",
        "negro-scrim": "rgba(10,10,9,.72)",
      },
      fontFamily: {
        // System stack por ahora — Anton/Inter self-host lo hace Harold aparte.
        display: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
