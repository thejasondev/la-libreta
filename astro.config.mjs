// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

import AstroPWA from "@vite-pwa/astro";

// https://astro.build/config
export default defineConfig({
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "recharts", "@nanostores/react"],
    },
  },

  integrations: [
    react(),
    AstroPWA({
      registerType: "prompt",
      injectRegister: "script",
      manifest: {
        name: "La Libreta",
        short_name: "Libreta",
        description: "Una PWA rápida, Local-first de alto rendimiento para gestión financiera y tareas.",
        theme_color: "#088395",
        background_color: "#021D26",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
          { src: "/favicon/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/favicon/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
});
