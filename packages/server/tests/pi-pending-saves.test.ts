import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import {
  mkdtemp,
  readdir,
  readFile,
  writeFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  piScanSaveRuntime,
  recoverPiScanSaves,
  submitPiScanSave,
} from "../src/lib/pi-scan/pending-saves";
import type { PendingPiScanSave } from "../src/lib/interfaces/pi-scan";
import { PI_SCAN_RECOVERY_MAX_ATTEMPTS } from "../src/lib/constants/pi-scan";

const save = (
  orgId = "org",
  userId = "user",
  scanId = "scan",
): PendingPiScanSave => ({
  orgId,
  userId,
  collectionGuid: "collection",
  kind: "cards",
  body: {
    scanId,
    card: { id: "card" },
    condition: "LP",
    pickListUpdate: { binGuid: "bin", name: "Card", delta: 1 },
  },
  queuedAt: 1,
});

async function setup(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "pi-pending-test-"));
  t.mock.method(piScanSaveRuntime, "directory", () => directory);
  t.mock.method(piScanSaveRuntime, "wait", async () => {});
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("network and transient status failures retain the same scan and retry with deduplication enabled", async (t) => {
  const directory = await setup(t);
  t.mock.method(console, "warn", () => {});
  const flags: boolean[] = [];
  const entry = save();
  const result = await submitPiScanSave(
    entry,
    async (pending, retry) => {
      assert.deepEqual(pending, entry);
      flags.push(retry);
      assert.equal((await readdir(directory)).length, 1);
      if (flags.length === 1) throw new Error("offline");
      if (flags.length === 2)
        return { success: false, status: 503, message: "unavailable" };
      return { success: true, message: "saved" };
    },
    () => false,
  );
  assert.equal(result.success, true);
  assert.deepEqual(flags, [false, true, true]);
  assert.deepEqual(await readdir(directory), []);
});

test("stopping preserves private disk state and restart recovers only the matching org and user", async (t) => {
  const directory = await setup(t);
  const entries = [save(), save("other-org"), save("org", "other-user")];
  for (const entry of entries) {
    await submitPiScanSave(
      entry,
      async () => ({ success: false, status: 503, message: "offline" }),
      () => true,
    );
  }
  const names = await readdir(directory);
  assert.equal(names.length, 3);
  for (const name of names) {
    const path = join(directory, name);
    const raw = await readFile(path, "utf8");
    assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), [
      "body",
      "collectionGuid",
      "kind",
      "orgId",
      "queuedAt",
      "userId",
    ]);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
  }
  const cancelled = await recoverPiScanSaves(
    "org",
    "user",
    async () => assert.fail("cancelled recovery must not send old saves"),
    () => true,
  );
  assert.equal(cancelled.success, false);
  assert.equal((await readdir(directory)).length, 3);
  const recovered: PendingPiScanSave[] = [];
  assert.equal(
    (
      await recoverPiScanSaves(
        "org",
        "user",
        async (entry, retry) => {
          assert.equal(retry, true);
          recovered.push(entry);
          return { success: true, message: "saved" };
        },
        () => false,
      )
    ).success,
    true,
  );
  assert.deepEqual(recovered, [entries[0]]);
  assert.equal((await readdir(directory)).length, 2);
});

test("a permanent rejection stops retrying and keeps the save for a later session", async (t) => {
  const directory = await setup(t);
  let calls = 0;
  const result = await submitPiScanSave(
    save(),
    async () => {
      calls++;
      return { success: false, status: 403, message: "membership revoked" };
    },
    () => false,
  );
  assert.equal(result.status, 403);
  assert.equal(calls, 1);
  assert.equal((await readdir(directory)).length, 1);
});

test("stop during backoff leaves the entry and recovery retries it exactly once", async (t) => {
  const directory = await setup(t);
  t.mock.method(console, "warn", () => {});
  let stopped = false;
  t.mock.method(piScanSaveRuntime, "wait", async () => {
    stopped = true;
  });
  const result = await submitPiScanSave(
    save(),
    async () => ({ success: false, status: 429, message: "busy" }),
    () => stopped,
  );
  assert.equal(result.success, false);
  assert.equal((await readdir(directory)).length, 1);
  let calls = 0;
  await recoverPiScanSaves(
    "org",
    "user",
    async (_entry, retry) => {
      calls++;
      assert.equal(retry, true);
      return { success: true, message: "saved" };
    },
    () => false,
  );
  assert.equal(calls, 1);
  assert.deepEqual(await readdir(directory), []);
});

test("malformed state outside the recovering actor does not block its saves", async (t) => {
  const directory = await setup(t);
  await submitPiScanSave(
    save(),
    async () => ({ success: false, status: 503, message: "offline" }),
    () => true,
  );
  await writeFile(join(directory, "unrelated.json"), "{bad json");
  let recovered = 0;
  const result = await recoverPiScanSaves(
    "org",
    "user",
    async () => {
      recovered++;
      return { success: true, message: "saved" };
    },
    () => false,
  );
  assert.equal(result.success, true);
  assert.equal(recovered, 1);
  assert.deepEqual(await readdir(directory), ["unrelated.json"]);
});

test("stopping after routing still attempts the new save and clears its journal on success", async (t) => {
  const directory = await setup(t);
  let attempts = 0;
  const result = await submitPiScanSave(
    save(),
    async (entry, retry) => {
      attempts++;
      assert.equal(retry, false);
      assert.deepEqual(entry.body.pickListUpdate, {
        binGuid: "bin", name: "Card", delta: 1,
      });
      return { success: true, message: "saved" };
    },
    () => true,
  );
  assert.equal(result.success, true);
  assert.equal(attempts, 1);
  assert.deepEqual(await readdir(directory), []);
});

test("an accepted rejection settles the save and a permanent one is set aside so recovery continues", async (t) => {
  const directory = await setup(t);
  t.mock.method(console, "warn", () => {});
  for (const [scanId, status] of [["limit", 402], ["missing", 404]] as const) {
    const result = await submitPiScanSave(
      save("org", "user", scanId),
      async () => ({ success: false, status, message: "rejected" }),
      () => false,
    );
    assert.equal(result.status, status);
  }
  const names = await readdir(directory);
  assert.equal(names.length, 1);
  assert.ok(names[0].endsWith(".json.rejected"));
  await submitPiScanSave(
    save("org", "user", "later"),
    async () => ({ success: false, status: 503, message: "offline" }),
    () => true,
  );
  let recovered = 0;
  const result = await recoverPiScanSaves(
    "org",
    "user",
    async () => {
      recovered++;
      return { success: true, message: "saved" };
    },
    () => false,
  );
  assert.equal(result.success, true);
  assert.equal(recovered, 1);
});

test("recovery gives up after a bounded number of attempts and keeps the save", async (t) => {
  const directory = await setup(t);
  t.mock.method(console, "warn", () => {});
  await submitPiScanSave(
    save(),
    async () => ({ success: false, status: 503, message: "offline" }),
    () => true,
  );
  let calls = 0;
  const result = await recoverPiScanSaves(
    "org",
    "user",
    async () => {
      calls++;
      return { success: false, status: 503, message: "offline" };
    },
    () => false,
  );
  assert.equal(result.success, false);
  assert.equal(calls, PI_SCAN_RECOVERY_MAX_ATTEMPTS);
  assert.equal((await readdir(directory)).length, 1);
});
