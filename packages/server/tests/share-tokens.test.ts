import assert from "node:assert/strict";
import * as jose from "jose";
import { test } from "node:test";
import { MONITOR_LINK_ISSUER, STORAGE_SHARE_LINK_ISSUER } from "../src/lib/constants/auth";
import { withoutPrices } from "../src/lib/share-link-pricing";
import { signShareToken, verifyShareToken } from "../src/lib/share-tokens";

process.env.MONITOR_LINK_SECRET = "test-share-token-secret";

test("a storage share token verifies with its own issuer", async () => {
  const { token, expiresAt } = await signShareToken({
    issuer: STORAGE_SHARE_LINK_ISSUER,
    subjectGuid: "location-guid",
    orgId: "org-1",
    version: 3,
    expiresInDays: 7,
    showsPrices: false,
  });
  const verified = await verifyShareToken(STORAGE_SHARE_LINK_ISSUER, token);
  assert.equal(verified?.subjectGuid, "location-guid");
  assert.equal(verified?.orgId, "org-1");
  assert.equal(verified?.version, 3);
  assert.equal(verified?.showsPrices, false);
  assert.equal(verified?.expiresAt.getTime(), Math.floor(expiresAt.getTime() / 1000) * 1000);
});

test("a collection monitor token is rejected as a storage share token and the reverse", async () => {
  const monitor = await signShareToken({
    issuer: MONITOR_LINK_ISSUER,
    subjectGuid: "collection-guid",
    orgId: "org-1",
    version: 0,
    expiresInDays: 1,
    showsPrices: true,
  });
  const storage = await signShareToken({
    issuer: STORAGE_SHARE_LINK_ISSUER,
    subjectGuid: "location-guid",
    orgId: "org-1",
    version: 0,
    expiresInDays: 1,
    showsPrices: true,
  });
  assert.equal(await verifyShareToken(STORAGE_SHARE_LINK_ISSUER, monitor.token), null);
  assert.equal(await verifyShareToken(MONITOR_LINK_ISSUER, storage.token), null);
});

test("a tampered token is rejected", async () => {
  const { token } = await signShareToken({
    issuer: STORAGE_SHARE_LINK_ISSUER,
    subjectGuid: "location-guid",
    orgId: "org-1",
    version: 0,
    expiresInDays: 1,
    showsPrices: true,
  });
  const tampered = `${token.slice(0, -2)}${token.endsWith("AA") ? "BB" : "AA"}`;
  assert.equal(await verifyShareToken(STORAGE_SHARE_LINK_ISSUER, tampered), null);
});

test("links created before price visibility existed keep showing prices", async () => {
  const token = await new jose.SignJWT({ org: "org-1", ver: 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(MONITOR_LINK_ISSUER)
    .setSubject("collection-guid")
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(new TextEncoder().encode(process.env.MONITOR_LINK_SECRET));
  const verified = await verifyShareToken(MONITOR_LINK_ISSUER, token);
  assert.equal(verified?.showsPrices, true);
});

test("hiding prices strips every price field from nested cards and zeroes stats", () => {
  const payload = {
    feed: [
      {
        scanId: "scan-1",
        acquisitionCost: 4,
        card: {
          name: "Black Lotus",
          price: 10,
          priceFoil: 20,
          priceEur: 9,
          priceByCondition: { NM: 10 },
          finishPrices: { "Reverse Holo": { price: 3 } },
          pricesAtScan: { price: 8 },
          foilOnlyFoilType: "Etched",
          purchaseLinks: { tcgplayer: "https://example.com" },
        },
      },
    ],
    stats: {
      totalCount: 2,
      priceableCount: 2,
      totalValue: 30,
      mostValuable: { name: "Black Lotus", price: 20 },
      sets: [{ code: "LEA", name: "Alpha", count: 2, value: 30 }],
    },
  };
  const stripped = withoutPrices(payload);
  assert.deepEqual(stripped.feed[0], {
    scanId: "scan-1",
    card: {
      name: "Black Lotus",
      foilOnlyFoilType: "Etched",
      purchaseLinks: { tcgplayer: "https://example.com" },
    },
  });
  assert.deepEqual(stripped.stats, {
    totalCount: 2,
    priceableCount: 0,
    totalValue: 0,
    mostValuable: null,
    sets: [{ code: "LEA", name: "Alpha", count: 2, value: 0 }],
  });
});
