import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't load the PWA/Tailwind plugins.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
