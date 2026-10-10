import { buildPublicApiOpenApiDocument } from "@magic-vault/shared";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(resolve(packageRoot, "../../package.json"), "utf8"),
) as { version: string };
const outputPath = resolve(packageRoot, "public/openapi.json");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify(buildPublicApiOpenApiDocument({ version }), null, 2)}\n`,
);
console.log(`[openapi] Wrote ${outputPath}`);
