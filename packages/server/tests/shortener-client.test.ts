import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  findShortLinkTargetPath,
  listCustomShortLinks,
  registerShortLinks,
} from "../src/lib/shortener-client";

const originalFetch = globalThis.fetch;
const originalEnvironment = { ...process.env };

function respondWith(body: string, status: number) {
  globalThis.fetch = async () => new Response(body, { status });
}

beforeEach(() => {
  process.env.SHORT_LINK_BASE_URL = "https://short.example";
  process.env.SHORTENER_URL = "https://short.example";
  process.env.SHORTENER_API_SECRET = "test-secret";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnvironment };
});

test("a shortener without the custom links route fails with the URL and status, not a JSON parse error", async () => {
  respondWith("404 Not Found", 404);
  await assert.rejects(listCustomShortLinks(), /GET https:\/\/short\.example\/internal\/custom-links failed: 404/);
});

test("registering links fails when the shortener route is missing instead of silently succeeding", async () => {
  respondWith("404 Not Found", 404);
  await assert.rejects(
    registerShortLinks([{ code: "abc123", targetPath: "/watch/x", expiresAt: null }]),
    /failed: 404/,
  );
});

test("an unknown short code is still not found", async () => {
  respondWith(JSON.stringify({ success: false }), 404);
  assert.equal(await findShortLinkTargetPath("missing"), null);
});
