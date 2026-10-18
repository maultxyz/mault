import { readFileSync, writeFileSync } from "fs";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version)) {
  console.error("Usage: node scripts/set-version.mjs <major.minor.patch[-prerelease]>");
  process.exit(1);
}

const files = [
  "package.json",
  "packages/web/package.json",
  "packages/server/package.json",
  "packages/shared/package.json",
  "packages/api-docs/package.json",
  "packages/bot/package.json",
];

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, "utf-8"));
  pkg.version = version;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`${file} → ${version}`);
}
