import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { authProvider } from "../src/auth";
import { requireAuth, requireOrg, type AppEnv } from "../src/middleware/auth";
import { SERVER_SCAN_ACTOR } from "../src/lib/constants/scan-actor";

function app() {
  const router = new Hono<AppEnv>();
  router.use("*", requireAuth, requireOrg);
  router.get("/", (c) =>
    c.json({
      userId: c.get("userId"),
      orgId: c.get("orgId"),
      claims: JSON.parse(c.get("jwtClaims")),
    }),
  );
  return router;
}

test("trusted process actor uses current membership and scoped claims without bearer verification", async (t) => {
  t.mock.method(authProvider, "verifyToken", async () =>
    assert.fail("process actor must not verify an expired token"),
  );
  t.mock.method(authProvider, "getUserRole", async () => "user");
  t.mock.method(
    authProvider,
    "resolveOrgMembership",
    async (user: string, org: string) => {
      assert.equal(user, "process-user");
      assert.equal(org, "process-org");
      return { role: "owner" };
    },
  );
  const response = await app().request(
    "/",
    { headers: { "X-Org-Id": "process-org" } },
    {
      [SERVER_SCAN_ACTOR]: { userId: "process-user", orgId: "process-org" },
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    userId: "process-user",
    orgId: "process-org",
    claims: {
      sub: "process-user",
      role: "authenticated",
      org_id: "process-org",
    },
  });
});

test("process actor cannot select another org or bypass revoked membership", async (t) => {
  t.mock.method(authProvider, "getUserRole", async () => "user");
  t.mock.method(authProvider, "resolveOrgMembership", async () => null);
  const env = {
    [SERVER_SCAN_ACTOR]: { userId: "revoked-user", orgId: "revoked-org" },
  };
  assert.equal(
    (await app().request("/", { headers: { "X-Org-Id": "different" } }, env))
      .status,
    401,
  );
  assert.equal(
    (await app().request("/", { headers: { "X-Org-Id": "revoked-org" } }, env))
      .status,
    403,
  );
});

test("HTTP headers cannot impersonate a trusted process actor", async (t) => {
  t.mock.method(authProvider, "verifyToken", async () => null);
  for (const authorization of [undefined, "Bearer forged"]) {
    const headers: Record<string, string> = {
      "X-Org-Id": "org",
      "X-Server-Scan-Actor": JSON.stringify({ userId: "user", orgId: "org" }),
    };
    if (authorization) headers.Authorization = authorization;
    assert.equal((await app().request("/", { headers })).status, 401);
  }
});
