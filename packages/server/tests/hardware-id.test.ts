import assert from "node:assert/strict";
import { test } from "node:test";
import { HARDWARE_ID_PATTERN } from "../src/lib/constants/validation";

test("hardware IDs accept Arduino and full Pi identifiers", () => {
  for (const hardwareId of ["6671E1", "b794926a995a", "B794926A995A"]) {
    assert.equal(HARDWARE_ID_PATTERN.test(hardwareId), true);
  }
});

test("hardware IDs reject malformed identifiers", () => {
  for (const hardwareId of [
    "",
    "12345",
    "1234567",
    "1234567890123",
    "B794926A995G",
    " 6671E1",
  ]) {
    assert.equal(HARDWARE_ID_PATTERN.test(hardwareId), false);
  }
});
