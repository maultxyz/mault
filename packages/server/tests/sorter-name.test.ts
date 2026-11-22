import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RECENT_SORTERS_MAX,
  recentSortersWithCurrentNames,
  rememberRecentSorter,
  sorterBluetoothName,
  sorterNameCommandFor,
  syncSorterBluetoothName,
  type RecentSorter,
} from "@magic-vault/shared";

function recentSorter(id: string, deviceGuid = `guid-${id}`): RecentSorter {
  return { id, deviceGuid, name: `Sorter ${id}`, connectedAt: "2026-11-21T00:00:00.000Z" };
}

test("sorter Bluetooth names fit the 29-byte scan response without splitting characters", () => {
  assert.equal(sorterBluetoothName("  Kitchen sorter  "), "Kitchen sorter");
  assert.equal(sorterBluetoothName("a".repeat(40)), "a".repeat(29));
  assert.equal(sorterBluetoothName("ü".repeat(20)), "ü".repeat(14));
  assert.equal(sorterBluetoothName(`Say "hi"\\\n`), "Say hi");
  assert.equal(sorterBluetoothName("Sorter 🃏🃏🃏🃏🃏🃏🃏"), "Sorter 🃏🃏🃏🃏🃏");
});

test("the name command is only sent to firmware that supports it and has another name", () => {
  assert.deepEqual(sorterNameCommandFor("2.14.0", "Mault Sorter ABC123", "Kitchen"), {
    setName: "Kitchen",
  });
  assert.equal(sorterNameCommandFor("2.14.0", "Kitchen", "Kitchen"), null);
  assert.equal(sorterNameCommandFor("2.13.4", undefined, "Kitchen"), null);
  assert.equal(sorterNameCommandFor("pi-0.3.0", undefined, "Kitchen"), null);
  assert.equal(sorterNameCommandFor("2.14.0", "Mault Sorter ABC123", "  "), null);
});

test("name sync waits for the sorter to be idle and returns the advertised name", async () => {
  const sent: object[] = [];
  let ranWhenIdle = false;
  const advertised = await syncSorterBluetoothName(
    {
      runWhenIdle: async (task) => {
        ranWhenIdle = true;
        return task();
      },
      sendParsed: async (command) => {
        sent.push(command);
        return { status: "ok", name: "Kitchen" };
      },
    },
    "2.14.0",
    "Mault Sorter ABC123",
    "Kitchen",
  );
  assert.equal(ranWhenIdle, true);
  assert.deepEqual(sent, [{ setName: "Kitchen" }]);
  assert.equal(advertised, "Kitchen");
});

test("recent sorters keep the newest connection per sorter, capped", () => {
  let recent: RecentSorter[] = [];
  for (let i = 0; i < RECENT_SORTERS_MAX + 2; i++) {
    recent = rememberRecentSorter(recent, recentSorter(String(i)));
  }
  assert.equal(recent.length, RECENT_SORTERS_MAX);
  assert.equal(recent[0].id, String(RECENT_SORTERS_MAX + 1));

  recent = rememberRecentSorter(recent, recentSorter("new-id", recent[2].deviceGuid));
  assert.equal(recent[0].id, "new-id");
  assert.equal(recent.length, RECENT_SORTERS_MAX);
  assert.equal(new Set(recent.map((sorter) => sorter.deviceGuid)).size, recent.length);
});

test("recent sorters take the current device name and drop deleted sorters", () => {
  const recent = [recentSorter("a"), recentSorter("b")];
  assert.deepEqual(recentSortersWithCurrentNames(recent, undefined), recent);
  assert.deepEqual(
    recentSortersWithCurrentNames(recent, [{ guid: "guid-a", name: "Kitchen" }]),
    [{ ...recent[0], name: "Kitchen" }],
  );
});
