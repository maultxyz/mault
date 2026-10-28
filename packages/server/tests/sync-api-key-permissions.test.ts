import assert from "node:assert/strict";
import { test } from "node:test";
import { syncApiKeyFormSchema } from "@magic-vault/shared";
import {
  hasSyncApiKeyPermission,
  syncStartPermissionFor,
  toSyncApiKeyPermissions,
} from "../src/lib/sync-api-key-permissions";

test("sync api keys: a force resync needs sync_force, a regular sync needs sync_start", () => {
  assert.equal(syncStartPermissionFor(false), "sync_start");
  assert.equal(syncStartPermissionFor(true), "sync_force");
  assert.equal(hasSyncApiKeyPermission(["sync_start"], "sync_force"), false);
  assert.equal(hasSyncApiKeyPermission(["sync_force"], "sync_start"), false);
  assert.equal(hasSyncApiKeyPermission(["sync_force"], "sync_force"), true);
});

test("sync api keys: stored permissions drop unknown values", () => {
  assert.deepEqual(
    toSyncApiKeyPermissions(["sync_card", "drop_tables", "sync_start"]),
    ["sync_start", "sync_card"],
  );
});

test("sync api keys: the form needs a name and at least one permission", () => {
  assert.equal(
    syncApiKeyFormSchema.safeParse({ name: "CI", permissions: [] }).success,
    false,
  );
  assert.equal(
    syncApiKeyFormSchema.safeParse({ name: "CI", permissions: ["sync_root"] })
      .success,
    false,
  );
  assert.equal(
    syncApiKeyFormSchema.safeParse({ name: "CI", permissions: ["sync_card"] })
      .success,
    true,
  );
});
