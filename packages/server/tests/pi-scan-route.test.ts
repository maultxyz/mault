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
    await assert.rejects(routeLoadedPiCard(link, { binNumber: 1, module: 1, direction: "left" }), /module 1/);
    assert.deepEqual(commands, [{ readIR: true }]);
  });
}

for (const reply of [{ skipped: true }, { status: "ok" }, { error: "jam" }]) {
  test(`Pi refuses to count a route without completion: ${JSON.stringify(reply)}`, async () => {
    const { link, commands } = linkWith([{ ir: [true] }, reply]);
    await assert.rejects(routeLoadedPiCard(link, { binNumber: 3, module: 2, direction: "left" }));
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
