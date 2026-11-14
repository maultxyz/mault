import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildScanSaveRequest,
  isRetryableScanSaveError,
  isRetryableScanSaveStatus,
  MemberSeatLimitError,
} from "@magic-vault/shared";

test("matched scan saves normalize missing or invalid conditions and preserve explicit conditions", () => {
  for (const condition of [undefined, null, "invalid", "lp"]) {
    assert.equal(
      buildScanSaveRequest({ scanId: "scan", card: {}, condition }).condition,
      "NM",
    );
  }
  for (const condition of ["NM", "LP", "MP", "HP", "DMG"]) {
    assert.equal(
      buildScanSaveRequest({ scanId: "scan", card: {}, condition }).condition,
      condition,
    );
  }
  const record = { scanId: "scan", card: {}, condition: "LP", binNumber: 2 };
  assert.deepEqual(buildScanSaveRequest(record, { isRetry: true }), {
    ...record,
    isRetry: true,
  });
  assert.equal("isRetry" in record, false);
  assert.deepEqual(
    buildScanSaveRequest({ scanId: "unmatched", image: "image" }),
    { scanId: "unmatched", image: "image" },
  );
});

test("save retries use status rather than error text and never retry seat-limit errors", () => {
  for (const status of [401, 408, 429, 500, 502, 503]) {
    assert.equal(isRetryableScanSaveStatus(status), true, String(status));
    assert.equal(
      isRetryableScanSaveError({ status, message: "permanent" }),
      true,
    );
  }
  for (const status of [400, 403, 404, 409, 422, 425]) {
    assert.equal(isRetryableScanSaveStatus(status), false, String(status));
    assert.equal(
      isRetryableScanSaveError({ status, message: "network" }),
      false,
    );
  }
  assert.equal(isRetryableScanSaveError(new Error("offline")), true);
  assert.equal(isRetryableScanSaveError(new MemberSeatLimitError(1)), false);
});
