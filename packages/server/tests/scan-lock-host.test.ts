import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { db } from "../src/db";
import { SCAN_LOCK_TTL_MS } from "../src/lib/constants/timing";
import {
  acquireHostScanLock,
  acquireLock,
  getLocksForGuids,
  releaseHostScanLock,
  releaseLock,
  subscribeOrgLocks,
} from "../src/lib/scan-lock";

function mockThreadClear(t: TestContext) {
  return t.mock.method(db, "update", () => ({
    set: () => ({ where: async () => undefined }),
  }));
}

test("host scan lock survives initiating browser release and competing scanners", (t) => {
  const update = mockThreadClear(t);
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10_000 });
  const guid = "host-browser-release";
  const events: string[] = [];
  const unsubscribe = subscribeOrgLocks("org", (event) => { events.push(event); });
  t.after(() => { releaseHostScanLock(guid, "owner"); unsubscribe(); });

  assert.deepEqual(acquireHostScanLock(guid, "owner", "org", "Owner"), { ok: true, isNewSession: true });
  assert.equal(releaseLock(guid, "owner"), false);
  assert.equal(releaseHostScanLock(guid, "other"), false);
  assert.equal(releaseLock(guid, "owner"), false);
  assert.deepEqual(acquireLock(guid, "other", "org", "Other"), { ok: false, isNewSession: false });
  assert.equal(getLocksForGuids([guid])[guid]?.userId, "owner");
  assert.deepEqual(events, ["lock_acquired"]);
  assert.equal(update.mock.callCount(), 0);

  assert.equal(releaseHostScanLock(guid, "owner"), true);
  assert.equal(getLocksForGuids([guid])[guid], undefined);
  assert.deepEqual(events, ["lock_acquired", "lock_released"]);
  assert.equal(update.mock.callCount(), 1);
});

test("host scan lock renews across TTLs and only expires after host relinquishes ownership", (t) => {
  const update = mockThreadClear(t);
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10_000 });
  const guid = "host-ttl-renewal";
  t.after(() => releaseHostScanLock(guid, "owner"));
  acquireHostScanLock(guid, "owner", "org", "Owner");
  for (let elapsed = 1; elapsed <= 3; elapsed++) {
    t.mock.timers.tick(SCAN_LOCK_TTL_MS);
    assert.equal(getLocksForGuids([guid])[guid]?.userId, "owner");
    assert.equal(getLocksForGuids([guid])[guid]?.expiresAt, 10_000 + (elapsed + 1) * SCAN_LOCK_TTL_MS);
    assert.equal(acquireLock(guid, "other", "org", "Other").ok, false);
    assert.equal(update.mock.callCount(), 0);
  }
  assert.equal(releaseHostScanLock(guid, "owner"), true);
  assert.equal(acquireLock(guid, "other", "org", "Other").ok, true);
  t.mock.timers.tick(SCAN_LOCK_TTL_MS);
  assert.equal(getLocksForGuids([guid])[guid], undefined);
  assert.equal(update.mock.callCount(), 2);
});

test("taking host ownership of an existing same-user browser lock protects it until host cleanup", (t) => {
  mockThreadClear(t);
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10_000 });
  const guid = "host-takes-browser-lock";
  t.after(() => releaseHostScanLock(guid, "owner"));
  assert.equal(acquireLock(guid, "owner", "org", "Owner").isNewSession, true);
  assert.deepEqual(acquireHostScanLock(guid, "owner", "org", "Owner"), { ok: true, isNewSession: false });
  assert.equal(releaseLock(guid, "owner"), false);
  t.mock.timers.tick(SCAN_LOCK_TTL_MS * 2);
  assert.equal(getLocksForGuids([guid])[guid]?.userId, "owner");
  assert.equal(releaseHostScanLock(guid, "owner"), true);
  assert.equal(getLocksForGuids([guid])[guid], undefined);
});
