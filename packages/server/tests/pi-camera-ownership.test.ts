import assert from "node:assert/strict";
import { test } from "node:test";
import { claimPiCamera, releasePiCamera } from "../src/lib/pi-camera-ownership";

test("headless sessions reserve individual cameras and only their owner can release them", () => {
  const first = {}, second = {};
  try {
    assert.equal(claimPiCamera("camera-a", first), true);
    assert.equal(claimPiCamera("camera-b", second), true);
    assert.equal(claimPiCamera("camera-a", second), false);
    releasePiCamera("camera-a", second);
    assert.equal(claimPiCamera("camera-a", second), false);
    releasePiCamera("camera-a", first);
    assert.equal(claimPiCamera("camera-a", second), true);
  } finally {
    releasePiCamera("camera-a", first);
    releasePiCamera("camera-a", second);
    releasePiCamera("camera-b", second);
  }
});
