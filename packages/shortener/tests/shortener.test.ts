import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SHORTENER_API_SECRET_HEADER,
  SHORTENER_INTERNAL_CUSTOM_LINKS_PATH,
  SHORTENER_INTERNAL_DELETE_LINKS_PATH,
  SHORTENER_INTERNAL_LINKS_PATH,
  type ShortenerLink,
} from "@magic-vault/shared";
import { createShortenerApp } from "../src/app";
import type { ShortenerConfig, ShortLinkStore } from "../src/lib/interfaces/shortener";

const SECRET = "test-secret";
const CODE = "Ab3dE6gH9k";

type MemoryLink = ShortenerLink & { isCustom: boolean };
const STAMP = "2026-11-15T00:00:00.000Z";

function createMemoryStore(): ShortLinkStore & { links: Map<string, MemoryLink> } {
  const links = new Map<string, MemoryLink>();
  const customOf = (link: MemoryLink) => ({
    code: link.code,
    targetUrl: link.targetPath,
    createdAt: STAMP,
    updatedAt: STAMP,
  });
  return {
    links,
    async findTargetPath(code) {
      const lowered = links.get(code.toLowerCase());
      const link = links.get(code) ?? (lowered?.isCustom ? lowered : undefined);
      if (!link) return null;
      if (link.expiresAt && new Date(link.expiresAt) <= new Date()) return null;
      return link.targetPath;
    },
    async saveLinks(saved) {
      for (const link of saved) {
        if (!links.get(link.code)?.isCustom) links.set(link.code, { ...link, isCustom: false });
      }
    },
    async deleteLinks(codes) {
      for (const code of codes) if (!links.get(code)?.isCustom) links.delete(code);
    },
    async listCustomLinks() {
      return [...links.values()].filter((link) => link.isCustom).map(customOf);
    },
    async createCustomLink(code, targetUrl) {
      if (links.has(code)) return null;
      const link = { code, targetPath: targetUrl, expiresAt: null, isCustom: true };
      links.set(code, link);
      return customOf(link);
    },
    async updateCustomLink(code, targetUrl) {
      const link = links.get(code);
      if (!link?.isCustom) return null;
      link.targetPath = targetUrl;
      return customOf(link);
    },
    async deleteCustomLink(code) {
      if (!links.get(code)?.isCustom) return false;
      return links.delete(code);
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

function customRequest(
  app: ReturnType<typeof createApp>["app"],
  method: string,
  path: string,
  body?: unknown,
) {
  return app.request(path, {
    method,
    headers: { "Content-Type": "application/json", [SHORTENER_API_SECRET_HEADER]: SECRET },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("custom links redirect to any web URL, matching codes case-insensitively", async () => {
  const { app } = createApp();
  const created = await customRequest(app, "POST", SHORTENER_INTERNAL_CUSTOM_LINKS_PATH, {
    code: "Discord",
    targetUrl: "https://discord.gg/example",
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).data.code, "discord");

  for (const path of ["/discord", "/DISCORD", "/s/Discord"]) {
    const response = await app.request(path);
    assert.equal(response.headers.get("Location"), "https://discord.gg/example", path);
  }
});

test("custom link codes must be free, valid and unreserved", async () => {
  const { app } = createApp();
  await register(app, [{ code: CODE, targetPath: "/shop/x", expiresAt: null }]);
  const create = (code: string) =>
    customRequest(app, "POST", SHORTENER_INTERNAL_CUSTOM_LINKS_PATH, {
      code,
      targetUrl: "https://example.com",
    });
  assert.equal((await create(CODE.toLowerCase())).status, 201);
  assert.equal((await create(CODE.toLowerCase())).status, 409);
  for (const code of ["health", "internal", "s", "-bad", "has space", "a".repeat(65)]) {
    assert.equal((await create(code)).status, 400, code);
  }
});

test("app link registration never overwrites or deletes a custom link", async () => {
  const { app } = createApp();
  await customRequest(app, "POST", SHORTENER_INTERNAL_CUSTOM_LINKS_PATH, {
    code: "promo2026",
    targetUrl: "https://example.com/promo",
  });
  await register(app, [{ code: "promo2026", targetPath: "/watch/x?t=1", expiresAt: null }]);
  await app.request(SHORTENER_INTERNAL_DELETE_LINKS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", [SHORTENER_API_SECRET_HEADER]: SECRET },
    body: JSON.stringify({ codes: ["promo2026"] }),
  });
  assert.equal(
    (await app.request("/promo2026")).headers.get("Location"),
    "https://example.com/promo",
  );
});

test("custom links can be listed, edited and deleted, and stay out of app lookups", async () => {
  const { app } = createApp();
  const path = `${SHORTENER_INTERNAL_CUSTOM_LINKS_PATH}/guide`;
  await customRequest(app, "POST", SHORTENER_INTERNAL_CUSTOM_LINKS_PATH, {
    code: "guide",
    targetUrl: "https://example.com/old",
  });
  const lookup = await customRequest(app, "GET", `${SHORTENER_INTERNAL_LINKS_PATH}/guide`);
  assert.equal(lookup.status, 404);

  assert.equal(
    (await customRequest(app, "PUT", path, { targetUrl: "https://example.com/new" })).status,
    200,
  );
  const list = await (await customRequest(app, "GET", SHORTENER_INTERNAL_CUSTOM_LINKS_PATH)).json();
  assert.deepEqual(
    list.data.map((link: { code: string; targetUrl: string }) => [link.code, link.targetUrl]),
    [["guide", "https://example.com/new"]],
  );
  assert.equal(
    (await customRequest(app, "PUT", path, { targetUrl: "ftp://example.com" })).status,
    400,
  );

  assert.equal((await customRequest(app, "DELETE", path)).status, 200);
  assert.equal((await customRequest(app, "DELETE", path)).status, 404);
});
