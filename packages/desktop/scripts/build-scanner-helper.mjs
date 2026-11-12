import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const target = path.resolve("native/scanner-helper");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

if (process.platform === "win32") {
  execFileSync(
    "dotnet",
    [
      "publish",
      path.resolve("scanner-helper/MaultScannerHelper.csproj"),
      "--configuration",
      "Release",
      "--output",
      target,
    ],
    { stdio: "inherit" },
  );
}
