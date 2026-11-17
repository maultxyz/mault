import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const target = path.resolve("native/koffi");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

if (process.platform === "win32") {
  const require = createRequire(import.meta.url);
  const koffiRequire = createRequire(require.resolve("koffi"));
  const triplet = `win32_${process.arch}`;
  const prebuild = path.dirname(koffiRequire.resolve(`@koromix/koffi-win32-${process.arch}/package.json`));
  mkdirSync(path.join(target, triplet));
  copyFileSync(path.join(prebuild, triplet, "koffi.node"), path.join(target, triplet, "koffi.node"));
}
