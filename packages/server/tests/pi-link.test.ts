import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PI_LINK_PAIRING_CODE_ALPHABET,
  PI_LINK_PAIRING_CODE_LENGTH,
  formatPiPairingCode,
  isPiPairingCode,
  normalizePiPairingCode,
  piHostClaimFormSchema,
} from "@magic-vault/shared";
import { PI_HOST_TOKEN_PREFIX, PI_LINK_PAIRING_TTL_MS } from "../src/lib/constants/pi-hosts";
import {
  generatePiHostToken,
  generatePiPairingCode,
  hashPiLinkSecret,
  piLinkPairingPollState,
} from "../src/lib/pi-hosts";

const now = new Date("2026-11-24T12:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);

test("pairing codes use only the unambiguous alphabet", () => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const code = generatePiPairingCode();
    assert.equal(code.length, PI_LINK_PAIRING_CODE_LENGTH);
    for (const character of code) assert.ok(PI_LINK_PAIRING_CODE_ALPHABET.includes(character));
    assert.ok(isPiPairingCode(code));
  }
});

test("typed codes are accepted in lowercase, with a dash or with spaces", () => {
  assert.equal(normalizePiPairingCode("abcd-efgh"), "ABCDEFGH");
  assert.equal(normalizePiPairingCode(" ab cd efgh "), "ABCDEFGH");
  assert.equal(formatPiPairingCode("ABCDEFGH"), "ABCD-EFGH");
  assert.ok(isPiPairingCode(formatPiPairingCode("ABCDEFGH")));
  assert.equal(isPiPairingCode("ABCDEFG"), false);
  assert.equal(isPiPairingCode("ABCDEFG0"), false);
  assert.equal(isPiPairingCode("ABCDEFGI"), false);
});

test("the claim form normalizes the code and requires a name", () => {
  const parsed = piHostClaimFormSchema.safeParse({ code: "abcd-efgh", name: " Shop Pi " });
  assert.ok(parsed.success);
  assert.deepEqual(parsed.data, { code: "ABCDEFGH", name: "Shop Pi" });
  assert.equal(piHostClaimFormSchema.safeParse({ code: "abcd-efgh", name: " " }).success, false);
  assert.equal(piHostClaimFormSchema.safeParse({ code: "nope", name: "Pi" }).success, false);
});

test("Pi tokens carry their prefix and hash deterministically", () => {
  const token = generatePiHostToken();
  assert.ok(token.startsWith(PI_HOST_TOKEN_PREFIX));
  assert.notEqual(generatePiHostToken(), token);
  assert.equal(hashPiLinkSecret(token), hashPiLinkSecret(token));
  assert.notEqual(hashPiLinkSecret(token), token);
});

test("an unclaimed pairing is pending until it expires", () => {
  const pairing = { expiresAt: later(60_000), piHostId: null, claimedAt: null, tokenDeliveredAt: null };
  assert.equal(piLinkPairingPollState(pairing, now), "pending");
  assert.equal(piLinkPairingPollState(pairing, later(60_000)), "expired");
});

test("a claimed pairing delivers its token once, within the pairing window", () => {
  const claimed = { expiresAt: later(1_000), piHostId: 7, claimedAt: now, tokenDeliveredAt: null };
  assert.equal(piLinkPairingPollState(claimed, later(5_000)), "deliver");
  assert.equal(piLinkPairingPollState(claimed, later(PI_LINK_PAIRING_TTL_MS)), "expired");
  assert.equal(
    piLinkPairingPollState({ ...claimed, tokenDeliveredAt: later(2_000) }, later(3_000)),
    "expired",
  );
});
