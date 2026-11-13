import { defineConfig } from "tsup";

const desktopChannel = process.env.MAULT_DESKTOP_CHANNEL ?? "production";
const baseAppId = process.env.MAULT_DESKTOP_APP_ID ?? "";
const appUserModelId = baseAppId && desktopChannel === "development" ? `${baseAppId}.dev` : baseAppId;

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
  define: {
    "process.env.MAULT_DESKTOP_CHANNEL": JSON.stringify(desktopChannel),
    "process.env.MAULT_DESKTOP_APP_USER_MODEL_ID": JSON.stringify(appUserModelId),
  },
  external: ["electron", /^@koromix\//],
  noExternal: [/^(?!electron$|@koromix\/).*/],
});
