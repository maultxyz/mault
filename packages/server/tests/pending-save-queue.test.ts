import assert from "node:assert/strict";
import { test } from "node:test";
import { MemberSeatLimitError, PendingSaveQueue } from "@magic-vault/shared";

interface Save {
  scanId: string;
}

function harness(send: (save: Save, isRetry: boolean) => Promise<string>) {
  const events: string[] = [];
  let pending = 0;
  const queue = new PendingSaveQueue<Save, string>({
    keyOf: (save) => save.scanId,
    send: (save, isRetry) => {
      events.push(isRetry ? "retry" : "send");
      return send(save, isRetry);
    },
    put: () => void events.push("put"),
    remove: () => void events.push("remove"),
    onPendingCountChange: (delta) => {
      pending += delta;
    },
  });
  return { queue, events, pendingCount: () => pending };
}

test("a save that succeeds first time is never queued", async () => {
  const { queue, events, pendingCount } = harness(async () => "saved");
  assert.equal(await queue.submit({ scanId: "a" }), "saved");
  assert.deepEqual(events, ["send"]);
  assert.equal(pendingCount(), 0);
});

test("a retryable failure is stored, retried on wake and removed once saved", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const { queue, events, pendingCount } = harness(async () => {
    calls++;
    if (calls < 3) throw new Error("offline");
    return "saved";
  });
  const result = queue.submit({ scanId: "a" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(queue.isInFlight("a"), true);
  assert.equal(pendingCount(), 1);
  queue.wakeAll();
  await new Promise((resolve) => setImmediate(resolve));
  queue.wakeAll();
  assert.equal(await result, "saved");
  assert.deepEqual(events, ["send", "put", "retry", "retry", "remove"]);
  assert.equal(queue.isInFlight("a"), false);
  assert.equal(pendingCount(), 0);
});

test("a permanent failure is not queued, and drops a queued save", async () => {
  const first = harness(async () => {
    throw new MemberSeatLimitError(1);
  });
  await assert.rejects(first.queue.submit({ scanId: "a" }), MemberSeatLimitError);
  assert.deepEqual(first.events, ["send"]);

  const recovered = harness(async () => {
    throw new MemberSeatLimitError(1);
  });
  await assert.rejects(
    recovered.queue.retryUntilSettled({ scanId: "a" }, true),
    MemberSeatLimitError,
  );
  assert.deepEqual(recovered.events, ["retry", "remove"]);
  assert.equal(recovered.pendingCount(), 0);
});

test("a stopped queue keeps the stored save and never settles", async () => {
  const { queue, events } = harness(async () => "saved");
  queue.stop();
  let settled = false;
  void queue.retryUntilSettled({ scanId: "a" }, true).then(() => {
    settled = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  assert.deepEqual(events, []);
});
