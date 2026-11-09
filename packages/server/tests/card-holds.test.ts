import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CARD_HOLD_GUEST_KEY_MAX_LENGTH,
  CARD_HOLD_GUEST_KEY_MIN_LENGTH,
  cardHoldRequestSchema,
} from "@magic-vault/shared";
import { guestKeyHashFromHeader, hashCardHoldGuestKey } from "../src/lib/card-holds";

test("a guest key is hashed and never stored raw", () => {
  const guestKey = "a".repeat(CARD_HOLD_GUEST_KEY_MIN_LENGTH);
  const hash = guestKeyHashFromHeader(guestKey);
  assert.equal(hash, hashCardHoldGuestKey(guestKey));
  assert.notEqual(hash, guestKey);
});

test("a missing, short or oversized guest key is rejected", () => {
  assert.equal(guestKeyHashFromHeader(undefined), null);
  assert.equal(guestKeyHashFromHeader("a".repeat(CARD_HOLD_GUEST_KEY_MIN_LENGTH - 1)), null);
  assert.equal(guestKeyHashFromHeader("a".repeat(CARD_HOLD_GUEST_KEY_MAX_LENGTH + 1)), null);
});

test("a hold request needs a card id and a name", () => {
  const scanId = "5f0c6b8e-2d4a-4c1e-9a7b-3e2f1d0c9b8a";
  assert.equal(cardHoldRequestSchema.safeParse({ scanId, guestName: "Alex", guestNote: "" }).success, true);
  assert.equal(cardHoldRequestSchema.safeParse({ scanId, guestName: "  ", guestNote: "" }).success, false);
  assert.equal(cardHoldRequestSchema.safeParse({ scanId: "nope", guestName: "Alex", guestNote: "" }).success, false);
  assert.equal(
    cardHoldRequestSchema.safeParse({ scanId, guestName: "Alex", guestNote: "x".repeat(201) }).success,
    false,
  );
});
