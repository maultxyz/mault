import assert from "node:assert/strict";
import { test } from "node:test";
import { authProvider } from "../src/auth";
import { piCameraRouter } from "../src/routes/pi-camera";

// Exercise the actual auth middleware and proxy without a database or camera.
test("Pi camera requires authentication and org membership before forwarding", async (t) => {
  const previous = process.env.PI_HOST;
  process.env.PI_HOST = "1";
  t.after(() => {
    if (previous === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previous;
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("frame", { headers: { "Content-Type": "image/jpeg" } });
  });
  t.mock.method(authProvider, "verifyToken", async (token: string) =>
    token === "test-token" ? { sub: "user-1" } : null,
  );
  t.mock.method(authProvider, "getUserRole", async () => "user");
  t.mock.method(
    authProvider,
    "resolveOrgMembership",
    async (_user: string, org: string) =>
      org === "org-1" ? { role: "member" } : null,
  );

  assert.equal((await piCameraRouter.request("/frame")).status, 401);
  assert.equal(calls, 0);
  const authorization = { Authorization: "Bearer test-token" };
  assert.equal(
    (await piCameraRouter.request("/frame", { headers: authorization })).status,
    400,
  );
  assert.equal(
    (
      await piCameraRouter.request("/frame", {
        headers: { ...authorization, "X-Org-Id": "other-org" },
      })
    ).status,
    403,
  );
  assert.equal(calls, 0);
  const response = await piCameraRouter.request("/frame", {
    headers: { ...authorization, "X-Org-Id": "org-1" },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "frame");
  assert.equal(calls, 1);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("Pi camera endpoints are disabled when PI_HOST=0", async (t) => {
  const previous = process.env.PI_HOST;
  process.env.PI_HOST = "0";
  t.after(() => {
    if (previous === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previous;
  });
  assert.equal((await piCameraRouter.request("/frame")).status, 404);
});
