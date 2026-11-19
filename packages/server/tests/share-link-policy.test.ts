import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SHARE_LINK_LENGTHS, type ShareLinkLengths } from "@magic-vault/shared";
import { ONE_MINUTE_MS } from "../src/lib/constants/timing";
import {
  cappedShareLinkLifetime,
  parseShareLinkExpiryDays,
  shareLinkExpiresInMinutes,
  shareLinkMaxMinutes,
} from "../src/lib/share-link-policy";

const CUSTOM_LENGTHS: ShareLinkLengths = {
  tradeLinkHours: 24,
  restrictedShareLinkHours: 3,
  monitorLinkExpiryDays: [2, 14],
};

test("monitor links last the requested days only on plans with long links", () => {
  assert.equal(shareLinkExpiresInMinutes("view", false, 30, DEFAULT_SHARE_LINK_LENGTHS), 60);
  assert.equal(shareLinkExpiresInMinutes("view", true, 7, DEFAULT_SHARE_LINK_LENGTHS), 7 * 24 * 60);
});

test("trade links last the configured trade length", () => {
  assert.equal(shareLinkExpiresInMinutes("trade", true, 30, DEFAULT_SHARE_LINK_LENGTHS), 60);
  assert.equal(shareLinkExpiresInMinutes("trade", true, 30, CUSTOM_LENGTHS), 24 * 60);
});

test("monitor links use the configured short length without long links", () => {
  assert.equal(shareLinkExpiresInMinutes("view", false, 7, CUSTOM_LENGTHS), 3 * 60);
});

test("a requested length longer than the longest option is cut to it", () => {
  assert.equal(shareLinkExpiresInMinutes("view", true, 30, CUSTOM_LENGTHS), 14 * 24 * 60);
});

test("a missing expiry uses the default option, or the first when the default is gone", () => {
  assert.equal(parseShareLinkExpiryDays(undefined, DEFAULT_SHARE_LINK_LENGTHS), 7);
  assert.equal(parseShareLinkExpiryDays(undefined, CUSTOM_LENGTHS), 2);
  assert.equal(parseShareLinkExpiryDays(0, CUSTOM_LENGTHS), null);
  assert.equal(parseShareLinkExpiryDays(1.5, CUSTOM_LENGTHS), null);
});

test("a link older than its length is cut off", () => {
  const issuedAt = new Date(Date.now() - 61 * ONE_MINUTE_MS);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * ONE_MINUTE_MS);
  assert.equal(cappedShareLinkLifetime(issuedAt, expiresAt, 60), null);
});

test("a link expires its length after it was issued, even if signed for longer", () => {
  const issuedAt = new Date(Date.now() - 10 * ONE_MINUTE_MS);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * ONE_MINUTE_MS);
  const maxMinutes = shareLinkMaxMinutes("trade", true, DEFAULT_SHARE_LINK_LENGTHS);
  const lifetime = cappedShareLinkLifetime(issuedAt, expiresAt, maxMinutes);
  assert.equal(lifetime?.expiresAt.getTime(), issuedAt.getTime() + 60 * ONE_MINUTE_MS);
});

test("a link signed for less than its length keeps its own expiry", () => {
  const issuedAt = new Date(Date.now() - 10 * ONE_MINUTE_MS);
  const expiresAt = new Date(Date.now() + 50 * ONE_MINUTE_MS);
  const lifetime = cappedShareLinkLifetime(issuedAt, expiresAt, 24 * 60);
  assert.equal(lifetime?.expiresAt.getTime(), expiresAt.getTime());
});
