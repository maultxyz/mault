import assert from "node:assert/strict";
import { test } from "node:test";
import { SerialSession, type SerialSessionTransport } from "@magic-vault/shared";

function sessionWith(replyTo: (command: Record<string, unknown>) => object) {
  const sent: Record<string, unknown>[] = [];
  let deliver: (chunk: Uint8Array) => void = () => {};
  const transport: SerialSessionTransport = {
    write: async (data) => {
      const command = JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
      sent.push(command);
      const reply = { seq: command.seq, ...replyTo(command) };
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
  return { session, sent };
}

const route = { binNumber: 3, module: 2, direction: "left" as const };

test("a scan route never reaches firmware when module 1 has no card", async () => {
  const { session, sent } = sessionWith(() => ({ status: "ok", ir: [false, false, false] }));
  const reply = await session.sendRoute(route, { requireLoadedCard: true });
  assert.deepEqual(reply, { noLoadedCard: true });
  assert.ok(sent.every((command) => !("route" in command)));
});

test("routes queued behind a missing card are skipped", async () => {
  const { session, sent } = sessionWith(() => ({ status: "ok", ir: [false] }));
  const first = session.sendRoute(route, { requireLoadedCard: true });
  const second = session.sendRoute(route, { requireLoadedCard: true });
  assert.deepEqual(await first, { noLoadedCard: true });
  assert.deepEqual(await second, { skipped: true });
  assert.equal(sent.length, 1);
});

test("a scan route checks module 1 and then routes the loaded card", async () => {
  const { session, sent } = sessionWith((command) =>
    "readIR" in command
      ? { status: "ok", ir: [true, false, false] }
      : { status: "routed", module: 2, direction: "left", fedNext: true },
  );
  const reply = await session.sendRoute(route, { requireLoadedCard: true, feedNext: true });
  assert.equal((reply as Record<string, unknown>).status, "routed");
  assert.deepEqual(
    sent.map(({ seq: _seq, ...command }) => command),
    [{ readIR: true }, { route: { module: 2, direction: "left", feedNext: true } }],
  );
});

test("calibration routes still go straight to firmware", async () => {
  const { session, sent } = sessionWith(() => ({ status: "routed" }));
  await session.sendRoute(route);
  assert.equal(sent.length, 1);
  assert.ok("route" in sent[0]);
});
