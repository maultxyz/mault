import assert from "node:assert/strict";
import { test } from "node:test";
import { routeLoadedPiCard } from "../src/lib/pi-scan/route-card";
import type { SorterLink } from "../src/lib/pi-scan/sorter-link";

function linkWith(replies: Record<string, unknown>[]) {
  const commands: object[] = [];
  const link = {
    command: async (command: object) => {
      commands.push(command);
      const reply = replies.shift();
      if (!reply) throw new Error("Unexpected hardware command");
      return reply;
    },
  } as unknown as SorterLink;
  return { link, commands };
}

for (const reply of [{ ir: [false] }, {}, { error: "busy" }]) {
  test(`Pi never asks firmware to route and implicitly feed without a loaded card: ${JSON.stringify(reply)}`, async () => {
    const { link, commands } = linkWith([reply]);
    await assert.rejects(
      routeLoadedPiCard(link, { binNumber: 1, module: 1, direction: "left" }),
      /module 1/,
    );
    assert.deepEqual(commands, [{ readIR: true }]);
  });
}

for (const reply of [{ skipped: true }, { status: "ok" }, { error: "jam" }]) {
  test(`Pi refuses to count a route without completion: ${JSON.stringify(reply)}`, async () => {
    const { link, commands } = linkWith([{ ir: [true] }, reply]);
    await assert.rejects(
      routeLoadedPiCard(link, { binNumber: 3, module: 2, direction: "left" }),
    );
    assert.equal(commands.length, 2);
    assert.ok(commands.every((command) => !("feeder" in command)));
  });
}

test("Pi routes one loaded card and requires the routed acknowledgment", async () => {
  const { link, commands } = linkWith([{ ir: [true] }, { status: "routed" }]);
  await routeLoadedPiCard(link, { binNumber: 3, module: 2, direction: "left" });
  assert.deepEqual(commands, [
    { readIR: true },
    { route: { module: 2, direction: "left" } },
  ]);
});

for (const [version, enabled, expected] of [
  ["2.1.0", true, true],
  ["2.7.0", false, false],
  ["2.0.0", true, false],
  [null, true, false],
] as const) {
  test(`pipeline flag honors preference and firmware: ${version}, ${enabled}`, async () => {
    const commands: object[] = [];
    let listener: ((feed: Record<string, unknown>) => void) | null = null;
    let unsubscribed = false;
    const feed = { event: "fed", detected: true };
    const received: object[] = [];
    const link = {
      firmwareVersion: version,
      onFed(callback: typeof listener) {
        listener = callback;
        return () => {
          listener = null;
          unsubscribed = true;
        };
      },
      async command(command: object) {
        commands.push(command);
        if ("readIR" in command) return { ir: [true] };
        listener?.(feed);
        return { status: "routed", ...(expected ? { fedNext: true } : {}) };
      },
    } as unknown as SorterLink;
    await routeLoadedPiCard(
      link,
      { binNumber: 3, module: 2, direction: "left" },
      {
        enabled: () => enabled,
        onFed: (reply) => received.push(reply),
      },
    );
    assert.deepEqual(commands[1], {
      route: {
        module: 2,
        direction: "left",
        ...(expected ? { feedNext: true } : {}),
      },
    });
    assert.deepEqual(received, expected ? [feed] : []);
    assert.equal(unsubscribed, expected);
  });
}

test("missing feed event after fedNext acknowledgment stops instead of double feeding", async () => {
  const { link } = linkWith([
    { ir: [true] },
    { status: "routed", fedNext: true },
  ]);
  Object.assign(link, { firmwareVersion: "2.7.0", onFed: () => () => {} });
  await assert.rejects(
    routeLoadedPiCard(
      link,
      { binNumber: 3, module: 2, direction: "left" },
      {
        enabled: () => true,
        onFed: () => {},
      },
    ),
    /next feed result/,
  );
});
