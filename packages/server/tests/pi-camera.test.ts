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
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL) => {
    urls.push(String(url));
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
  const selected = await piCameraRouter.request("/frame?cameraId=%2Fdev%2Fvideo-test-b&url=http://attacker", {
    headers: { ...authorization, "X-Org-Id": "org-1" },
  });
  assert.equal(selected.status, 200);
  const upstream = new URL(urls.at(-1)!);
  assert.equal(upstream.origin, "http://127.0.0.1:8765");
  assert.equal(upstream.searchParams.get("cameraId"), "/dev/video-test-b");
  assert.equal(upstream.searchParams.has("url"), false);
  assert.equal(upstream.searchParams.has("fresh"), false);
  const fresh = await piCameraRouter.request("/frame?cameraId=%2Fdev%2Fvideo-test-b&fresh=1&url=http://attacker", {
    headers: { ...authorization, "X-Org-Id": "org-1" },
  });
  assert.equal(fresh.status, 200);
  const freshUpstream = new URL(urls.at(-1)!);
  assert.equal(freshUpstream.searchParams.get("fresh"), "1");
  assert.equal(freshUpstream.searchParams.get("cameraId"), "/dev/video-test-b");
  assert.equal(freshUpstream.searchParams.has("url"), false);
  await piCameraRouter.request("/stream?fresh=1", {
    headers: { ...authorization, "X-Org-Id": "org-1" },
  });
  assert.equal(new URL(urls.at(-1)!).searchParams.has("fresh"), false);
  await piCameraRouter.request("/frame?fresh=other", {
    headers: { ...authorization, "X-Org-Id": "org-1" },
  });
  assert.equal(new URL(urls.at(-1)!).searchParams.has("fresh"), false);

  t.mock.method(globalThis, "fetch", async () => new Response("no fresh frame", { status: 503 }));
  const unavailable = await piCameraRouter.request("/frame?fresh=1", {
    headers: { ...authorization, "X-Org-Id": "org-1" },
  });
  assert.equal(unavailable.status, 503);
  assert.equal(await unavailable.text(), "no fresh frame");
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
