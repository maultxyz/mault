import assert from "node:assert/strict";
import { test } from "node:test";
import { authProvider } from "../src/auth";
import { createPiSerialRouter } from "../src/routes/pi-serial";

test("Pi serial requires Pi hosting, a valid token and org membership before upgrading", async (t) => {
  const previous = process.env.PI_HOST;
  t.after(() => {
    if (previous === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previous;
  });
  t.mock.method(authProvider, "verifyToken", async (token: string) =>
    token === "test-token" ? { sub: "user-1" } : null,
  );
  t.mock.method(
    authProvider,
    "resolveOrgMembership",
    async (user: string, org: string) =>
      user === "user-1" && org === "org-1" ? { role: "member" } : null,
  );
  let upgrades = 0;
  const router = createPiSerialRouter(() => async (c) => {
    upgrades++;
    return c.text("upgraded");
  });

  process.env.PI_HOST = "0";
  assert.equal(
    (await router.request("/?token=test-token&orgId=org-1")).status,
    404,
  );
  process.env.PI_HOST = "1";
  for (const query of [
    "",
    "?token=test-token",
    "?orgId=org-1",
    "?token=bad&orgId=org-1",
    "?token=test-token&orgId=other-org",
  ]) {
    assert.equal((await router.request(`/${query}`)).status, 401);
  }
  assert.equal(upgrades, 0);
  const response = await router.request("/?token=test-token&orgId=org-1");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "upgraded");
  assert.equal(upgrades, 1);
});
