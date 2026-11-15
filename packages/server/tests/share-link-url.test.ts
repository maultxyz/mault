import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildShortLinkUrl,
  buildShortenerUrl,
  parseShareLinkUrl,
  parseShortLinkUrl,
  shareLinkPathWithToken,
  shortLinkUrlOf,
} from "@magic-vault/shared";

const GUID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

test("reads a collection watch link", () => {
  assert.deepEqual(parseShareLinkUrl(`https://mault.xyz/watch/${GUID}?t=abc.def`), {
    kind: "collection",
    guid: GUID,
    token: "abc.def",
  });
});

test("reads a storage location link with other parameters", () => {
  assert.deepEqual(
    parseShareLinkUrl(` https://dev.mault.xyz/shared/storage/${GUID.toUpperCase()}?card=x&t=a%2Bb `),
    { kind: "storage", guid: GUID, token: "a+b" },
  );
});

test("ignores other links, missing tokens and plain text", () => {
  assert.equal(parseShareLinkUrl(`https://mault.xyz/shop/${GUID}?t=abc`), null);
  assert.equal(parseShareLinkUrl(`https://mault.xyz/watch/${GUID}`), null);
  assert.equal(parseShareLinkUrl("mault-control:v1:pause"), null);
});

test("builds and reads short links", () => {
  const url = buildShortLinkUrl("https://mault.xyz/", "Ab3dE6gH9k");
  assert.equal(url, "https://mault.xyz/s/Ab3dE6gH9k");
  assert.equal(parseShortLinkUrl(url), "Ab3dE6gH9k");
  assert.equal(parseShortLinkUrl(` ${url}/ `), "Ab3dE6gH9k");
  assert.equal(parseShortLinkUrl("http://192.168.1.20:8080/s/0a1b2c3d4e5f"), "0a1b2c3d4e5f");
});

test("ignores links that are not short links", () => {
  assert.equal(parseShortLinkUrl("https://mault.xyz/s/short"), null);
  assert.equal(parseShortLinkUrl("https://mault.xyz/s/Ab3dE6gH9k/extra"), null);
  assert.equal(parseShortLinkUrl(`https://mault.xyz/watch/${GUID}?t=abc`), null);
  assert.equal(parseShortLinkUrl("mault-control:v1:pause"), null);
  assert.equal(parseShareLinkUrl("https://mault.xyz/s/Ab3dE6gH9k"), null);
});

test("reads short links on the shortener's own domain only when it is configured", () => {
  const url = buildShortenerUrl("https://mlt.example/", "Ab3dE6gH9k");
  assert.equal(url, "https://mlt.example/Ab3dE6gH9k");
  assert.equal(parseShortLinkUrl(url), null);
  assert.equal(parseShortLinkUrl(url, "https://mlt.example"), "Ab3dE6gH9k");
  assert.equal(parseShortLinkUrl(` ${url}/ `, "https://mlt.example/"), "Ab3dE6gH9k");
  assert.equal(parseShortLinkUrl("https://mault.xyz/s/Ab3dE6gH9k", "https://mlt.example"), "Ab3dE6gH9k");
  assert.equal(parseShortLinkUrl("https://other.example/Ab3dE6gH9k", "https://mlt.example"), null);
  assert.equal(parseShortLinkUrl("https://mlt.example/Ab3dE6gH9k/extra", "https://mlt.example"), null);
});

test("prefers the server's short URL and falls back to the app origin", () => {
  assert.equal(
    shortLinkUrlOf({ shortCode: "Ab3dE6gH9k", shortUrl: "https://mlt.example/Ab3dE6gH9k" }, "https://mault.xyz"),
    "https://mlt.example/Ab3dE6gH9k",
  );
  assert.equal(
    shortLinkUrlOf({ shortCode: "Ab3dE6gH9k", shortUrl: null }, "http://192.168.1.20:8080"),
    "http://192.168.1.20:8080/s/Ab3dE6gH9k",
  );
});

test("adds the share token to a target path", () => {
  assert.equal(shareLinkPathWithToken(`/watch/${GUID}`, "a+b"), `/watch/${GUID}?t=a%2Bb`);
  assert.equal(shareLinkPathWithToken("/shop/x", null), "/shop/x");
});
