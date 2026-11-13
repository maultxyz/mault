import assert from "node:assert/strict";
import { test } from "node:test";
import { parseShareLinkUrl } from "@magic-vault/shared";

const GUID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

test("reads a collection watch link", () => {
  assert.deepEqual(parseShareLinkUrl(`https://mault.xyz/watch/${GUID}?t=abc.def`), {
    kind: "collection",
    guid: GUID,
    token: "abc.def",
  });
});

test("reads a storage location link with other parameters", () => {
  assert.deepEqual(
    parseShareLinkUrl(` https://dev.mault.xyz/shared/storage/${GUID.toUpperCase()}?card=x&t=a%2Bb `),
    { kind: "storage", guid: GUID, token: "a+b" },
  );
});

test("ignores other links, missing tokens and plain text", () => {
  assert.equal(parseShareLinkUrl(`https://mault.xyz/shop/${GUID}?t=abc`), null);
  assert.equal(parseShareLinkUrl(`https://mault.xyz/watch/${GUID}`), null);
  assert.equal(parseShareLinkUrl("mault-control:v1:pause"), null);
});
