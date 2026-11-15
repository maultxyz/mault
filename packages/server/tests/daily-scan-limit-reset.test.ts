import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyScanLimitResetCountdown } from "@magic-vault/shared";

test("daily scan limit counts down to the next UTC midnight", () => {
  assert.deepEqual(
    dailyScanLimitResetCountdown(new Date("2026-11-14T18:47:30Z")),
    { hours: 5, minutes: 13 },
  );
  assert.deepEqual(
    dailyScanLimitResetCountdown(new Date("2026-11-14T00:00:00Z")),
    { hours: 24, minutes: 0 },
  );
  assert.deepEqual(
    dailyScanLimitResetCountdown(new Date("2026-11-14T23:59:59Z")),
    { hours: 0, minutes: 1 },
  );
});
