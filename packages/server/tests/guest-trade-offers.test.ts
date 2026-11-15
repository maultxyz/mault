import assert from "node:assert/strict";
import { test } from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  claimableGuestTradeOffersFilter,
  outgoingTradeOffersFilter,
  toOutgoingTradeOffer,
} from "../src/lib/guest-trade-offers";
import type { TradeOfferRow } from "../src/lib/interfaces/trade-offers";
import { bearerTokenFromHeader, optionalVerifiedUserId } from "../src/lib/optional-auth";

const dialect = new PgDialect();

test("bearerTokenFromHeader reads only well-formed bearer headers", () => {
  assert.equal(bearerTokenFromHeader(undefined), null);
  assert.equal(bearerTokenFromHeader(""), null);
  assert.equal(bearerTokenFromHeader("Basic abc"), null);
  assert.equal(bearerTokenFromHeader("Bearer "), null);
  assert.equal(bearerTokenFromHeader("Bearer   "), null);
  assert.equal(bearerTokenFromHeader("Bearer token-value"), "token-value");
});

test("optionalVerifiedUserId returns the verified subject", async () => {
  const verifiedTokens: string[] = [];
  const userId = await optionalVerifiedUserId("Bearer good", async (token) => {
    verifiedTokens.push(token);
    return { sub: "user-1" };
  });
  assert.equal(userId, "user-1");
  assert.deepEqual(verifiedTokens, ["good"]);
});

test("optionalVerifiedUserId treats missing, invalid and failing tokens as anonymous", async () => {
  let verifierCalls = 0;
  const neverCalled = async () => {
    verifierCalls += 1;
    return { sub: "user-1" };
  };
  assert.equal(await optionalVerifiedUserId(undefined, neverCalled), null);
  assert.equal(await optionalVerifiedUserId("Token abc", neverCalled), null);
  assert.equal(verifierCalls, 0);
  assert.equal(await optionalVerifiedUserId("Bearer bad", async () => null), null);
  assert.equal(await optionalVerifiedUserId("Bearer empty", async () => ({ sub: "" })), null);
  assert.equal(
    await optionalVerifiedUserId("Bearer broken", async () => {
      throw new Error("JWKS unavailable");
    }),
    null,
  );
});

test("outgoing offers are filtered by the verified user only", () => {
  const query = dialect.sqlToQuery(outgoingTradeOffersFilter("user-1"));
  assert.match(query.sql, /"trade_offers"\."guest_user_id" = \$1/);
  assert.deepEqual(query.params, ["user-1"]);
});

test("claiming only matches the guest key on offers no user has claimed yet", () => {
  const query = dialect.sqlToQuery(claimableGuestTradeOffersFilter("hash-1"));
  assert.match(query.sql, /"trade_offers"\."guest_key_hash" = \$1/);
  assert.match(query.sql, /"trade_offers"\."guest_user_id" is null/);
  assert.deepEqual(query.params, ["hash-1"]);
});

test("toOutgoingTradeOffer exposes only guest-visible fields", () => {
  const row: TradeOfferRow = {
    id: 7,
    guid: "offer-guid",
    orgId: "org-1",
    linkKind: "storage",
    collectionId: null,
    storageLocationId: 3,
    guestName: "Sam",
    guestContact: "sam@example.com",
    guestNote: null,
    guestKeyHash: "hash-1",
    guestUserId: "user-1",
    wantedCards: [],
    offeredCards: [],
    offeredCashAmount: 25.5,
    offeredCashCurrency: "USD",
    status: "accepted",
    respondedAt: new Date("2026-11-02T10:00:00Z"),
    respondedByUserId: "owner-1",
    remainingPickScanIds: ["scan-1"],
    createdAt: new Date("2026-11-01T10:00:00Z"),
  };
  const offer = toOutgoingTradeOffer(row, "Binder A");
  assert.deepEqual(Object.keys(offer).sort(), [
    "createdAt",
    "guestContact",
    "guestName",
    "guestNote",
    "guid",
    "linkKind",
    "offered",
    "offeredCash",
    "respondedAt",
    "sentToName",
    "status",
    "wanted",
  ]);
  assert.equal(offer.sentToName, "Binder A");
  assert.deepEqual(offer.offeredCash, { amount: 25.5, currency: "USD" });
  assert.equal(offer.respondedAt, "2026-11-02T10:00:00.000Z");
});
