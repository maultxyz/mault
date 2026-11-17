import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOrderPickUrl, parseOrderPickUrl } from "@magic-vault/shared";

const FIRST = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";
const SECOND = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

test("builds a single pick link on the pick page and reads it back", () => {
  const url = buildOrderPickUrl("https://mault.xyz/", { orderGuids: [FIRST], orgId: "org 1" });
  assert.equal(url, `https://mault.xyz/app/orders/pick?order=${FIRST}&org=org%201`);
  assert.deepEqual(parseOrderPickUrl(` ${url} `), { orderGuids: [FIRST], orgId: "org 1" });
});

test("builds a batch link for several picks", () => {
  const url = buildOrderPickUrl("https://mault.xyz", { orderGuids: [FIRST, SECOND], orgId: null });
  assert.equal(url, `https://mault.xyz/app/orders/pick/batch?order=${FIRST}&order=${SECOND}`);
  assert.deepEqual(parseOrderPickUrl(url), { orderGuids: [FIRST, SECOND], orgId: null });
});

test("reads web links with an uppercase guid, duplicates and other parameters", () => {
  assert.deepEqual(
    parseOrderPickUrl(`http://192.168.1.5:8080/app/orders/pick/batch?x=1&order=${FIRST.toUpperCase()}&order=${FIRST}`),
    { orderGuids: [FIRST], orgId: null },
  );
});

test("ignores other links and links without a valid pick", () => {
  assert.equal(parseOrderPickUrl("https://mault.xyz/app/orders/pick"), null);
  assert.equal(parseOrderPickUrl("https://mault.xyz/app/orders/pick?order=nope"), null);
  assert.equal(parseOrderPickUrl(`https://mault.xyz/app/orders/intake?order=${FIRST}`), null);
  assert.equal(parseOrderPickUrl(`https://mault.xyz/app/storage?location=${FIRST}&org=o1`), null);
});
