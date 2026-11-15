import assert from "node:assert/strict";
import { test } from "node:test";
import {
  feedNextCardAfterRoutedCard,
  isModuleOneStillLoaded,
  routeAllowsPipelinedFeed,
  SerialSession,
  type SerialReply,
  type SerialSessionTransport,
} from "@magic-vault/shared";
import { feedNextPiScanCard } from "../src/lib/pi-scan/feed-next-card";

test("only routes that carry the card past module 1 may pipeline the next feed", () => {
  assert.equal(routeAllowsPipelinedFeed({ module: 1 }), false);
  assert.equal(routeAllowsPipelinedFeed({ module: 2 }), true);
  assert.equal(routeAllowsPipelinedFeed({ module: 5 }), true);
});

test("module 1 counts as loaded only on a successful readIR that sees a card", () => {
  assert.equal(isModuleOneStillLoaded({ status: "ok", ir: [true, false] }), true);
  assert.equal(isModuleOneStillLoaded({ status: "ok", ir: [false, true] }), false);
  assert.equal(isModuleOneStillLoaded({ error: "busy", ir: [true] }), false);
  assert.equal(isModuleOneStillLoaded({ status: "ok" }), false);
  assert.equal(isModuleOneStillLoaded(null), false);
});

test("a routed card still in module 1 sends no feed", async () => {
  let feeds = 0;
  const outcome = await feedNextCardAfterRoutedCard({
    readSensors: async () => ({ status: "ok", ir: [true, false] }),
    feedOnce: async () => {
      feeds++;
      return { status: "ok", detected: true };
    },
    replyOf: (reply) => reply,
    retryCount: 2,
  });
  assert.deepEqual(outcome, { kind: "stuckInModuleOne" });
  assert.equal(feeds, 0);
});

test("a cleared module 1 feeds the next card with the retry budget", async () => {
  const replies: SerialReply[] = [
    { status: "ok", detected: false, empty: false },
    { status: "ok", detected: true, empty: false },
  ];
  let feeds = 0;
  const outcome = await feedNextCardAfterRoutedCard({
    readSensors: async () => ({ status: "ok", ir: [false, false] }),
    feedOnce: async () => replies[feeds++],
    replyOf: (reply) => reply,
    retryCount: 1,
  });
  assert.deepEqual(outcome, { kind: "fed", result: replies[1] });
  assert.equal(feeds, 2);
});

test("an unreadable sensor reply does not block the feed", async () => {
  let feeds = 0;
  const outcome = await feedNextCardAfterRoutedCard({
    readSensors: async () => {
      throw new Error("timeout");
    },
    feedOnce: async () => {
      feeds++;
      return { status: "ok", detected: true };
    },
    replyOf: (reply) => reply,
    retryCount: 0,
  });
  assert.equal(outcome.kind, "fed");
  assert.equal(feeds, 1);
});

test("a module 1 route never asks firmware to pipeline the next feed", async () => {
  const sent: Record<string, unknown>[] = [];
  let deliver: (chunk: Uint8Array) => void = () => {};
  const transport: SerialSessionTransport = {
    write: async (data) => {
      const command = JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
      sent.push(command);
      const reply = "readIR" in command
        ? { seq: command.seq, status: "ok", ir: [true] }
        : { seq: command.seq, status: "routed" };
      queueMicrotask(() => deliver(new TextEncoder().encode(`${JSON.stringify(reply)}\n`)));
    },
    onData: (listener) => {
      deliver = listener;
    },
  };
  const session = new SerialSession<SerialSessionTransport>({
    createDecoder: () => new TextDecoder(),
    encodeText: (text) => new TextEncoder().encode(text),
    maxCommLogEntries: 10,
  });
  session.attach(transport);
  await session.sendRoute(
    { binNumber: 1, module: 1, direction: "left" },
    { requireLoadedCard: true, feedNext: true },
  );
  assert.deepEqual(
    sent.map(({ seq: _seq, ...command }) => command),
    [{ readIR: true }, { route: { module: 1, direction: "left" } }],
  );
});

test("the Pi host holds a routed card still in module 1 instead of feeding", async () => {
  const commands: object[] = [];
  const link = {
    async command(command: object) {
      commands.push(command);
      return { status: "ok", ir: [true] };
    },
  };
  const outcome = await feedNextPiScanCard(link, {
    confirmRoutedCardLeftModuleOne: true,
    feedOnce: async () => assert.fail("No feed expected"),
    retryCount: 1,
  });
  assert.deepEqual(outcome, { kind: "stuckInModuleOne" });
  assert.deepEqual(commands, [{ readIR: true }]);
});

test("the Pi host feeds without a sensor check when no routed card must leave module 1", async () => {
  const link = {
    async command() {
      return assert.fail("No sensor read expected");
    },
  };
  const outcome = await feedNextPiScanCard(link, {
    confirmRoutedCardLeftModuleOne: false,
    feedOnce: async () => ({ status: "ok", detected: true }),
    retryCount: 0,
  });
  assert.deepEqual(outcome, { kind: "fed", result: { status: "ok", detected: true } });
});
