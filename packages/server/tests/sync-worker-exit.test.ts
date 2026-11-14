import assert from "node:assert/strict";
import childProcess, { type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import {
  claimSyncWork,
  getStatus,
  startSync,
  subscribeSSE,
} from "../src/lib/sync-job";

for (const [code, signal, reason] of [
  [null, "SIGABRT", "signal SIGABRT"],
  [null, "SIGKILL", "signal SIGKILL"],
  [1, null, "code 1"],
] as const) {
  test(`sync reports ${reason} and rejects pending browser work`, async (t) => {
    const worker = Object.assign(new EventEmitter(), { send: () => true });
    t.mock.method(childProcess, "fork", () => worker as unknown as ChildProcess);
    const events: { event: string; data: unknown }[] = [];
    const unsubscribe = subscribeSSE((event, data) => events.push({ event, data }));
    t.after(unsubscribe);
    startSync(undefined, "mtg", "en", false, undefined, 1, "browser");
    const pending = assert.rejects(claimSyncWork(1), /Sync worker stopped/);
    worker.emit("close", code, signal);
    await pending;
    const message = `Sync worker exited unexpectedly (${reason}).`;
    assert.equal(getStatus().status, "failed");
    assert.ok(getStatus().logs.includes(`Fatal error: ${message}`));
    assert.ok(events.some((event) => event.event === "error" &&
      (event.data as { message?: string }).message === message));
    assert.deepEqual(await claimSyncWork(1), []);
  });
}

test("a completed worker does not become failed when it closes", (t) => {
  const worker = Object.assign(new EventEmitter(), { send: () => true });
  t.mock.method(childProcess, "fork", () => worker as unknown as ChildProcess);
  startSync(undefined, "mtg", "en", false, undefined, 1, "browser");
  worker.emit("message", { type: "patchState", patch: { status: "completed" } });
  worker.emit("close", 0, null);
  assert.equal(getStatus().status, "completed");
  assert.ok(!getStatus().logs.some((line) => line.includes("exited unexpectedly")));
});
