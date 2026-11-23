import assert from "node:assert/strict";
import { test } from "node:test";
import { canManageOrgSettings } from "@magic-vault/shared";
import {
  deleteKeysContainingFromEveryCache,
  deleteRegisteredCacheKeys,
  listRegisteredCacheKeys,
} from "../src/lib/cache-registry";
import { pickCalibrationValues } from "../src/lib/calibration-input";
import {
  FEEDER_CALIBRATION_INPUT_KEYS,
  SERVO_CALIBRATION_INPUT_KEYS,
} from "../src/lib/constants/calibration-input";
import { redactedError, withoutQueryParamsText, withoutUrlQuery } from "../src/lib/error-redaction";
import { withoutMonitorLinkGuestHiddenFields } from "../src/lib/share-link-pricing";
import { createTtlCache } from "../src/lib/ttl-cache";

test("calibration input keeps only calibration fields, so a body can't move the row", () => {
  const picked = pickCalibrationValues(
    { speed: 400, pulseDuration: 80, orgId: "another-org", deviceId: 7, id: 1, guid: "x", isDeleted: true },
    FEEDER_CALIBRATION_INPUT_KEYS,
  );
  assert.deepEqual(picked, { speed: 400, pulseDuration: 80 });
  assert.deepEqual(
    pickCalibrationValues({ bottomOpen: 307, moduleNumber: 9, deviceId: 3 }, SERVO_CALIBRATION_INPUT_KEYS),
    { bottomOpen: 307 },
  );
});

test("calibration input rejects values that aren't whole numbers in range", () => {
  assert.equal(pickCalibrationValues({ speed: "400" }, FEEDER_CALIBRATION_INPUT_KEYS), null);
  assert.equal(pickCalibrationValues({ speed: 1.5 }, FEEDER_CALIBRATION_INPUT_KEYS), null);
  assert.equal(pickCalibrationValues({ speed: 1e12 }, FEEDER_CALIBRATION_INPUT_KEYS), null);
  assert.equal(pickCalibrationValues(null, FEEDER_CALIBRATION_INPUT_KEYS), null);
  assert.equal(pickCalibrationValues([1, 2], FEEDER_CALIBRATION_INPUT_KEYS), null);
});

test("failed query errors lose their parameter values before they are logged or reported", () => {
  const failed = Object.assign(
    new Error('Failed query: insert into "t" values ($1, $2)\nparams: secret-token,guest@example.com'),
    { query: 'insert into "t" values ($1, $2)', params: ["secret-token", "guest@example.com"] },
  );
  const redacted = redactedError(failed) as Error;
  assert.ok(!redacted.message.includes("secret-token"));
  assert.ok(!redacted.message.includes("guest@example.com"));
  assert.ok(!(redacted.stack ?? "").includes("secret-token"));
  assert.ok(redacted.message.includes('insert into "t"'));
  assert.ok(redacted.message.includes("(2 values)"));
  const plain = new Error("something else");
  assert.equal(redactedError(plain), plain);
  assert.equal(withoutQueryParamsText("Failed query: select 1\nparams: a,b"), "Failed query: select 1\nparams: [redacted]");
});

test("reported URLs lose their query string", () => {
  assert.equal(withoutUrlQuery("https://mault.xyz/api/stream?token=abc&orgId=1"), "https://mault.xyz/api/stream");
  assert.equal(withoutUrlQuery("/public/cards"), "/public/cards");
});

test("caches keyed by tokens list masked keys and still delete single entries", () => {
  const cache = createTtlCache<number>({
    name: "test.security.secretKeys",
    ttlMs: 60_000,
    maxEntries: 10,
    hasSecretKeys: true,
  });
  cache.set("token-one-org-12345678", 1);
  cache.set("token-two", 2);
  const listed = listRegisteredCacheKeys("test.security.secretKeys", "", 10);
  assert.equal(listed?.keys.length, 2);
  assert.ok(listed?.keys.every((key) => key.startsWith("masked:") && !key.includes("token")));
  assert.equal(deleteKeysContainingFromEveryCache("org-12345678"), 0);
  assert.equal(deleteRegisteredCacheKeys("test.security.secretKeys", (key) => key === listed?.keys[0]), 1);
  assert.equal(listRegisteredCacheKeys("test.security.secretKeys", "", 10)?.keys.length, 1);
});

test("watch-link guests don't receive review state, diagnostics or storage names", () => {
  const visible = withoutMonitorLinkGuestHiddenFields({
    scanId: "scan-1",
    card: { name: "Lightning Bolt" },
    capturedImageUrl: "https://example.com/photo.jpg",
    alternativeMatches: [{ name: "Shock" }],
    lowConfidenceMatch: true,
    storageLocation: { name: "Back room box 3" },
    unmatchedCards: [{ scanId: "u-1", diagnostics: { reason: "noMatch" } }],
  });
  assert.deepEqual(visible, {
    scanId: "scan-1",
    card: { name: "Lightning Bolt" },
    capturedImageUrl: "https://example.com/photo.jpg",
    unmatchedCards: [{ scanId: "u-1" }],
  });
});

test("only owners and admins manage organization-wide settings", () => {
  assert.equal(canManageOrgSettings("owner"), true);
  assert.equal(canManageOrgSettings("admin"), true);
  assert.equal(canManageOrgSettings("member"), false);
  assert.equal(canManageOrgSettings(null), false);
});
