import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SHORTENER_API_SECRET_HEADER,
  SHORTENER_INTERNAL_DELETE_LINKS_PATH,
  SHORTENER_INTERNAL_LINKS_PATH,
  type ShortenerLink,
} from "@magic-vault/shared";
import { createShortenerApp } from "../src/app";
import type { ShortenerConfig, ShortLinkStore } from "../src/lib/interfaces/shortener";

const SECRET = "test-secret";
const CODE = "Ab3dE6gH9k";

function createMemoryStore(): ShortLinkStore & { links: Map<string, ShortenerLink> } {
  const links = new Map<string, ShortenerLink>();
  return {
    links,
    async findTargetPath(code) {
      const link = links.get(code);
      if (!link) return null;
      if (link.expiresAt && new Date(link.expiresAt) <= new Date()) return null;
      return link.targetPath;
    },
    async saveLinks(saved) {
      for (const link of saved) links.set(link.code, link);
    },
    async deleteLinks(codes) {
      for (const code of codes) links.delete(code);
    },
  };
}

function createApp(config: Partial<ShortenerConfig> = {}) {
  const store = createMemoryStore();
  const app = createShortenerApp(store, {
    apiSecret: SECRET,
    shortLinkTargetOrigin: "https://mault.example",
    ...config,
  });
  return { app, store };
}

function register(app: ReturnType<typeof createApp>["app"], links: unknown, secret = SECRET) {
  return app.request(SHORTENER_INTERNAL_LINKS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", [SHORTENER_API_SECRET_HEADER]: secret },
    body: JSON.stringify({ links }),
  });
}

test("redirects a registered code on its own domain and under /s", async () => {
  const { app } = createApp();
  const target = "/watch/3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b?t=abc.def";
  assert.equal((await register(app, [{ code: CODE, targetPath: target, expiresAt: null }])).status, 200);

  const ownDomain = await app.request(`/${CODE}`);
  assert.equal(ownDomain.status, 302);
  assert.equal(ownDomain.headers.get("Location"), `https://mault.example${target}`);
  assert.equal(ownDomain.headers.get("Cache-Control"), "no-store");

  const appPath = await app.request(`/s/${CODE}`);
  assert.equal(appPath.headers.get("Location"), target);
});

test("sends unknown, invalid and expired codes to the not found page", async () => {
  const { app } = createApp();
  await register(app, [
    { code: CODE, targetPath: "/shop/x", expiresAt: new Date(Date.now() - 1000).toISOString() },
  ]);
  for (const path of [`/${CODE}`, "/nope", "/0000000000"]) {
    const response = await app.request(path);
    assert.equal(response.headers.get("Location"), "https://mault.example/link-not-found");
  }
  assert.equal((await app.request(`/s/${CODE}`)).headers.get("Location"), "/link-not-found");
});

test("only serves the own-domain route when a target origin is set", async () => {
  const { app } = createApp({ shortLinkTargetOrigin: null });
  assert.equal((await app.request(`/${CODE}`)).status, 404);
  assert.equal((await app.request(`/s/${CODE}`)).status, 302);
});

test("rejects internal calls without the secret", async () => {
  const { app, store } = createApp();
  const link = { code: CODE, targetPath: "/shop/x", expiresAt: null };
  assert.equal((await register(app, [link], "wrong")).status, 401);
  assert.equal(store.links.size, 0);
  const { app: unconfigured } = createApp({ apiSecret: null });
  assert.equal((await register(unconfigured, [link])).status, 503);
});

test("refuses targets that leave the app", async () => {
  const { app, store } = createApp();
  for (const targetPath of ["//evil.example", "/\\evil.example", "https://evil.example", "/a b"]) {
    const response = await register(app, [{ code: CODE, targetPath, expiresAt: null }]);
    assert.equal(response.status, 400, targetPath);
  }
  assert.equal(store.links.size, 0);
});

test("resolves and deletes links through the internal API", async () => {
  const { app } = createApp();
  await register(app, [{ code: CODE, targetPath: "/shop/x", expiresAt: null }]);
  const headers = { [SHORTENER_API_SECRET_HEADER]: SECRET, "Content-Type": "application/json" };

  const found = await app.request(`${SHORTENER_INTERNAL_LINKS_PATH}/${CODE}`, { headers });
  assert.deepEqual(await found.json(), { success: true, data: { targetPath: "/shop/x" } });

  await app.request(SHORTENER_INTERNAL_DELETE_LINKS_PATH, {
    method: "POST",
    headers,
    body: JSON.stringify({ codes: [CODE] }),
  });
  const missing = await app.request(`${SHORTENER_INTERNAL_LINKS_PATH}/${CODE}`, { headers });
  assert.equal(missing.status, 404);
});
