import assert from "node:assert/strict";
import { test } from "node:test";
import type { Transaction } from "../src/db";
import { loadSessionInit } from "../src/routes/session-init";
import { syncWorkRoute } from "../src/routes/admin/sync-work";
import { authProvider } from "../src/auth";

for (const pi of [false, true]) {
  test(`session initialization ${pi ? "includes Pi" : "preserves upstream without"} unmatched diagnostics`, async (t) => {
    const previous = process.env.PI_HOST;
    process.env.PI_HOST = pi ? "1" : "0";
    t.after(() => {
      if (previous === undefined) delete process.env.PI_HOST;
      else process.env.PI_HOST = previous;
    });
    const diagnostics = { reason: "too_far", attempts: [] };
    const row = {
      guid: "scan-1",
      scannedAt: new Date(),
      binNumber: 1,
      diagnostics,
      capturedImageDataUrl: null,
      capturedImageKey: null,
    };
    const tx = {
      query: {
        collections: {
          findFirst: async () => ({ id: 1, guid: "collection-1", gameId: null }),
        },
      },
      select: (fields: Record<string, unknown>) => {
        const rows = "cardCount" in fields
          ? [{ cardCount: 0 }]
          : [Object.fromEntries(Object.keys(fields).map((key) => [key, row[key as keyof typeof row]]))];
        const query = {
          from: () => query,
          where: () => query,
          orderBy: () => query,
          limit: async () => [],
          then: (resolve: (value: unknown) => void) => Promise.resolve(rows).then(resolve),
        };
        return query;
      },
    } as unknown as Transaction;
    const result = await loadSessionInit((run) => run(tx), "collection-1", "org-1", []);
    assert.equal(result?.unmatchedCards.length, 1);
    assert.deepEqual(result?.unmatchedCards[0].diagnostics, pi ? diagnostics : undefined);
  });
}

test("browser vectorization work endpoints stay disabled outside Pi hosting", async (t) => {
  const previous = process.env.PI_HOST;
  process.env.PI_HOST = "0";
  t.after(() => {
    if (previous === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previous;
  });
  t.mock.method(authProvider, "verifyToken", async () => ({ sub: "admin-1" }));
  t.mock.method(authProvider, "getUserRole", async () => "admin");
  for (const path of ["/sync/work/claim", "/sync/work"]) {
    const response = await syncWorkRoute.request(path, {
      method: "POST",
      headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 404);
  }
});
