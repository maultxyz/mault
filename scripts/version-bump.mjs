import { readFileSync, writeFileSync } from "fs";

const type = process.argv[2];
if (!["patch", "minor", "major"].includes(type)) {
  console.error("Usage: node scripts/version-bump.mjs <patch|minor|major>");
  process.exit(1);
}

const files = [
  "package.json",
  "packages/web/package.json",
  "packages/server/package.json",
  "packages/shared/package.json",
  "packages/mobile/package.json",
];

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, "utf-8"));
  let [major, minor, patch] = pkg.version.split(".").map(Number);
  if (type === "major") { major++; minor = 0; patch = 0; }
  else if (type === "minor") { minor++; patch = 0; }
  else { patch++; }
  pkg.version = `${major}.${minor}.${patch}`;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`${file} → ${pkg.version}`);
}
