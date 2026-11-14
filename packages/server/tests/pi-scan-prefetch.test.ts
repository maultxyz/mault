import assert from "node:assert/strict";
import { test } from "node:test";
import { PiScanPrefetch } from "../src/lib/pi-scan/prefetch";

test("identifies the fed card before routing completes and consumes it once", async () => {
  let scans = 0;
  const prefetch = new PiScanPrefetch(async () => {
    scans++;
    return "card";
  });
  const feed = { detected: true };
  prefetch.offer(feed);
  await Promise.resolve();
  assert.equal(scans, 1);
  assert.equal(prefetch.hasPending, true);
  assert.deepEqual(await prefetch.take(), { feed, identified: "card" });
  assert.equal(await prefetch.take(), null);
});

test("pause invalidates identification while retaining the loaded card", async () => {
  const prefetch = new PiScanPrefetch(async () => "old match");
  const feed = { detected: true };
  prefetch.offer(feed);
  prefetch.invalidate();
  assert.deepEqual(await prefetch.take(), { feed, identified: null });
});

for (const feed of [
  { error: "empty", empty: true },
  { error: "timeout", empty: false },
]) {
  test(`retains feed failures for normal retry handling: ${feed.error}`, async () => {
    const prefetch = new PiScanPrefetch(async () =>
      assert.fail("Must not scan a failed feed"),
    );
    prefetch.offer(feed);
    assert.deepEqual(await prefetch.take(), { feed, identified: null });
  });
}

test("captures early scan rejection until the scan loop consumes it", async () => {
  const prefetch = new PiScanPrefetch(async () => {
    throw new Error("camera failed");
  });
  prefetch.offer({ detected: true });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(prefetch.take(), /camera failed/);
});

test("cleanup waits for an active scan and discards its result", async () => {
  let finish!: (value: string) => void;
  const prefetch = new PiScanPrefetch(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  prefetch.offer({ detected: true });
  await Promise.resolve();
  const discarded = prefetch.discard();
  finish("card");
  await discarded;
  assert.equal(await prefetch.take(), null);
});
