import { buildPublicApiOpenApiDocument } from "@magic-vault/shared";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(resolve(webRoot, "../../package.json"), "utf8"),
) as { version: string };
const outputPath = resolve(webRoot, "public/openapi.json");

writeFileSync(
  outputPath,
  `${JSON.stringify(buildPublicApiOpenApiDocument({ version }), null, 2)}\n`,
);
console.log(`[openapi] Wrote ${outputPath}`);
