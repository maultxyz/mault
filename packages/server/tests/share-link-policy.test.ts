import assert from "node:assert/strict";
import { test } from "node:test";
import { RESTRICTED_SHARE_LINK_MINUTES } from "@magic-vault/shared";
import { ONE_MINUTE_MS } from "../src/lib/constants/timing";
import {
  restrictedShareLinkLifetime,
  shareLinkExpiresInMinutes,
} from "../src/lib/share-link-policy";

test("monitor links last the requested days only on plans with long links", () => {
  assert.equal(shareLinkExpiresInMinutes("view", false, 30), RESTRICTED_SHARE_LINK_MINUTES);
  assert.equal(shareLinkExpiresInMinutes("view", true, 7), 7 * 24 * 60);
});

test("trade links always last one hour", () => {
  assert.equal(shareLinkExpiresInMinutes("trade", true, 30), RESTRICTED_SHARE_LINK_MINUTES);
});

test("a restricted link older than an hour is cut off", () => {
  const issuedAt = new Date(Date.now() - (RESTRICTED_SHARE_LINK_MINUTES + 1) * ONE_MINUTE_MS);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * ONE_MINUTE_MS);
  assert.equal(restrictedShareLinkLifetime(issuedAt, expiresAt), null);
});

test("a restricted link expires an hour after it was issued, even if signed for longer", () => {
  const issuedAt = new Date(Date.now() - 10 * ONE_MINUTE_MS);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * ONE_MINUTE_MS);
  const lifetime = restrictedShareLinkLifetime(issuedAt, expiresAt);
  assert.equal(
    lifetime?.expiresAt.getTime(),
    issuedAt.getTime() + RESTRICTED_SHARE_LINK_MINUTES * ONE_MINUTE_MS,
  );
});
