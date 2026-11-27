import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";

const sourceRoot = resolve(__dirname, "../src");
const importPattern =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function resolveRelativeImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, join(base, "index.ts"), base])
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

function importChains(entry: string): Map<string, string | null> {
  const parents = new Map<string, string | null>([[entry, null]]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const match of readFileSync(file, "utf8").matchAll(importPattern)) {
      if (match[1]) continue;
      const imported = resolveRelativeImport(file, match[2] ?? match[3]);
      if (!imported || parents.has(imported)) continue;
      parents.set(imported, file);
      queue.push(imported);
    }
  }
  return parents;
}

function chainTo(parents: Map<string, string | null>, file: string): string {
  const chain: string[] = [];
  for (let current: string | null = file; current; current = parents.get(current) ?? null)
    chain.unshift(relative(sourceRoot, current));
  return chain.join(" -> ");
}

test("the linked Pi runtime never loads the database, auth or app routes", () => {
  const parents = importChains(join(sourceRoot, "pi-link-main.ts"));
  const forbidden = [...parents.keys()].filter((file) => {
    const path = relative(sourceRoot, file).replace(/\\/g, "/");
    return path.startsWith("db/") || path.startsWith("auth/") || path === "lib/pi-scan/local-api.ts";
  });
  assert.deepEqual(
    forbidden.map((file) => chainTo(parents, file)),
    [],
  );
});
