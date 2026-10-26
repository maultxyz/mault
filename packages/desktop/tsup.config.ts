import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    main: "src/main.ts",
    "main-preload": "src/main-preload.ts",
    "picker-preload": "src/picker-preload.ts",
  },
  format: ["cjs"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  publicDir: "static",
  external: ["electron", /^@koromix\//],
  noExternal: [/^(?!electron$|@koromix\/).*/],
});
