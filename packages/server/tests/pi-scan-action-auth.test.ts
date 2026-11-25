import assert from "node:assert/strict";
import { test } from "node:test";
import { authProvider } from "../src/auth";
import {
  applyScanTargetThroughRoute,
  loadControlTargetsThroughRoute,
  loadRemovalCopiesThroughRoute,
  loadScanContextThroughRoute,
  PiScanActionError,
} from "../src/lib/pi-scan/existing-routes";
import { setPiScanApi } from "../src/lib/pi-scan/api";
import { localPiScanApi } from "../src/lib/pi-scan/local-api";

setPiScanApi(localPiScanApi);

test("revoked headless actors cannot look up removal copies, load scan targets or apply control-card targets", async (t) => {
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
  await assert.rejects(loadControlTargetsThroughRoute(actor), forbidden);
  await assert.rejects(
    loadScanContextThroughRoute(actor, "collection", "SORTER"),
    forbidden,
  );
  await assert.rejects(
    applyScanTargetThroughRoute(actor, {
      collectionGuid: "collection",
      hardwareId: "SORTER",
      presetGuid: "preset",
      activatesCollection: true,
    }),
    forbidden,
  );
});
