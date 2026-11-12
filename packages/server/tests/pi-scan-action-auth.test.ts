import assert from "node:assert/strict";
import { test } from "node:test";
import { authProvider } from "../src/auth";
import {
  loadRemovalCopiesThroughRoute,
  PiScanActionError,
  withScanActorTransaction,
} from "../src/lib/pi-scan/existing-routes";

test("revoked headless actors cannot look up removal copies or apply control-card target transactions", async (t) => {
  t.mock.method(authProvider, "verifyToken", async () =>
    assert.fail(
      "Internal scans must retain process-bound actor authentication",
    ),
  );
  t.mock.method(authProvider, "getUserRole", async () => "user");
  t.mock.method(authProvider, "resolveOrgMembership", async () => null);
  const actor = { userId: "revoked-queue-user", orgId: "revoked-queue-org" };
  const forbidden = (error: unknown) =>
    error instanceof PiScanActionError && error.status === 403;
  await assert.rejects(
    loadRemovalCopiesThroughRoute(actor, "collection", ["printing"]),
    forbidden,
  );
  await assert.rejects(
    withScanActorTransaction(actor, async () =>
      assert.fail("A revoked actor must not begin a transaction"),
    ),
    forbidden,
  );
});
