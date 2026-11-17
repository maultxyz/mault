import assert from "node:assert/strict";
import { test } from "node:test";
import { feedWithRetries, isFeedTimeoutReply } from "@magic-vault/shared";

test("feed timeout replies are recognised in both firmware shapes", () => {
  assert.equal(isFeedTimeoutReply({ status: "ok", detected: false, empty: false }), true);
  assert.equal(
    isFeedTimeoutReply({
      event: "fed",
      error: "timeout: feeder did not deliver card to module 1",
      empty: false,
    }),
    true,
  );
  assert.equal(isFeedTimeoutReply({ status: "ok", detected: true, empty: false }), false);
  assert.equal(isFeedTimeoutReply({ status: "ok", detected: false, empty: true }), false);
  assert.equal(isFeedTimeoutReply({ error: "jam" }), false);
  assert.equal(isFeedTimeoutReply(null), false);
});

test("feeds are resent up to the retry count while they time out", async () => {
  const replies = [
    { detected: false, empty: false },
    { detected: false, empty: false },
    { detected: true, empty: false },
  ];
  let sends = 0;
  const feedOnce = async () => replies[sends++];

  const delivered = await feedWithRetries(feedOnce, (reply) => reply, 5);
  assert.equal(delivered.detected, true);
  assert.equal(sends, 3);

  sends = 0;
  const gaveUp = await feedWithRetries(feedOnce, (reply) => reply, 1);
  assert.equal(gaveUp.detected, false);
  assert.equal(sends, 2);
});

test("an empty hopper or no retries sends the feed only once", async () => {
  let sends = 0;
  await feedWithRetries(
    async () => {
      sends++;
      return { detected: false, empty: true };
    },
    (reply) => reply,
    5,
  );
  assert.equal(sends, 1);

  sends = 0;
  await feedWithRetries(
    async () => {
      sends++;
      return { detected: false, empty: false };
    },
    (reply) => reply,
    0,
  );
  assert.equal(sends, 1);
});
