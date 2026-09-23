import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const { version } = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8"),
);

const BRAND_BLUE = "#1447e6";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt" so nothing reloads on its own: a scan session can be running.
      // The existing outdated-version banner is what triggers the reload.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "MAULT",
        short_name: "MAULT",
        description: "Automated trading card sorting and inventory.",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        theme_color: BRAND_BLUE,
        background_color: BRAND_BLUE,
        icons: [
          { src: "/icon/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Excludes the 20MB+ onnxruntime .wasm, which is only needed for scanning.
        globPatterns: ["**/*.{js,css,html}"],
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
        // API + SSE traffic must always hit the network.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(`${version}`),
  },
  envDir: path.resolve(__dirname, "../../"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
});
