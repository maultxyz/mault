import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: fileURLToPath(new URL("../../", import.meta.url)),
  build: { chunkSizeWarningLimit: 4000 },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
      },
    },
  },
});
