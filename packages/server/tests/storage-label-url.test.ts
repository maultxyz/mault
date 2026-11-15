import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStorageLabelUrl, parseStorageLabelUrl } from "@magic-vault/shared";

const GUID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

test("builds and reads a storage label link", () => {
  const url = buildStorageLabelUrl("https://mault.xyz/", { locationGuid: GUID, orgId: "org_A b" });
  assert.equal(url, `https://mault.xyz/app/storage?location=${GUID}&org=org_A%20b`);
  assert.deepEqual(parseStorageLabelUrl(` ${url} `), { locationGuid: GUID, orgId: "org_A b" });
});

test("reads a label with parameters in any order and an uppercase guid", () => {
  assert.deepEqual(parseStorageLabelUrl(`http://192.168.1.5:8080/app/storage/?org=o1&card=x&location=${GUID.toUpperCase()}`), {
    locationGuid: GUID,
    orgId: "o1",
  });
});

test("ignores other links and incomplete labels", () => {
  assert.equal(parseStorageLabelUrl(`https://mault.xyz/app/storage?location=${GUID}`), null);
  assert.equal(parseStorageLabelUrl("https://mault.xyz/app/storage?location=nope&org=o1"), null);
  assert.equal(parseStorageLabelUrl(`https://mault.xyz/app/storage/pick-list?location=${GUID}&org=o1`), null);
  assert.equal(parseStorageLabelUrl(`https://mault.xyz/shared/storage/${GUID}?t=abc`), null);
  assert.equal(parseStorageLabelUrl("mault-control:1?pause=1"), null);
});
