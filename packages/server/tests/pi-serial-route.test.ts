import assert from "node:assert/strict";
import { test } from "node:test";
import { authProvider } from "../src/auth";
import { createPiSerialRouter, createPiSorterRouter } from "../src/routes/pi-serial";

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

test("built-in sorter endpoint requires PI_SORTER and the existing org authentication", async (context) => {
  const previousHost = process.env.PI_HOST;
  const previousSorter = process.env.PI_SORTER;
  context.after(() => {
    if (previousHost === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previousHost;
    if (previousSorter === undefined) delete process.env.PI_SORTER;
    else process.env.PI_SORTER = previousSorter;
  });
  context.mock.method(authProvider, "verifyToken", async (token: string) =>
    token === "test-token" ? { sub: "user-1" } : null,
  );
  context.mock.method(authProvider, "resolveOrgMembership", async (user: string, org: string) =>
    user === "user-1" && org === "org-1" ? { role: "member" } : null,
  );
  const upgrade = () => async (connection: { text: (value: string) => Response }) => connection.text("gpio");
  const gpio = createPiSorterRouter(upgrade as Parameters<typeof createPiSorterRouter>[0]);
  const serial = createPiSerialRouter(upgrade as Parameters<typeof createPiSerialRouter>[0]);
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "0";
  assert.equal((await gpio.request("/?token=test-token&orgId=org-1")).status, 404);
  process.env.PI_SORTER = "1";
  assert.equal((await serial.request("/?token=test-token&orgId=org-1")).status, 404);
  assert.equal((await gpio.request("/")).status, 401);
  assert.equal((await gpio.request("/?token=test-token&orgId=other-org")).status, 401);
  assert.equal((await gpio.request("/?token=test-token&orgId=org-1")).status, 200);
  process.env.PI_HOST = "0";
  assert.equal((await gpio.request("/?token=test-token&orgId=org-1")).status, 404);
});
