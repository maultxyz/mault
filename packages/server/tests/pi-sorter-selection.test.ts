import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { claimSorterPort, releaseSorterPort, listPiSorters, resolveSorterTarget, piSerialRuntime, SorterPortError } from "../src/lib/pi-serial-port";
import type { SorterPort } from "../src/lib/interfaces/pi-serial";

class FakePort extends EventEmitter implements SorterPort {
  isOpen = true;
  write() {}
  close() { this.isOpen = false; }
}

test("GPIO mode exposes only its built-in sorter and rejects USB targets", async (t) => {
  const previous = { host: process.env.PI_HOST, sorter: process.env.PI_SORTER };
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "1";
  t.after(() => {
    if (previous.host === undefined) delete process.env.PI_HOST; else process.env.PI_HOST = previous.host;
    if (previous.sorter === undefined) delete process.env.PI_SORTER; else process.env.PI_SORTER = previous.sorter;
  });
  const list = t.mock.method(piSerialRuntime, "list", async () => [{ path: "/dev/ttyACM901" }]);
  assert.equal(await resolveSorterTarget(), "gpio");
  assert.equal(await resolveSorterTarget("gpio"), "gpio");
  const devices = await listPiSorters();
  assert.equal(devices.length, 1);
  assert.equal(devices[0]?.id, "gpio");
  assert.equal(list.mock.callCount(), 0);
  for (const target of ["usb", "/dev/ttyACM901", "/etc/passwd", "ble:AA:BB:CC:DD:EE:FF"])
    await assert.rejects(claimSorterPort("bridge", { controllerId: target }), (error: unknown) => error instanceof SorterPortError && error.reason === "missing");
});

test("a failed open releases only its own reservation", async (t) => {
  t.mock.method(piSerialRuntime, "list", async () => [{ path: "/dev/ttyUSB903" }]);
  t.mock.method(piSerialRuntime, "open", async () => { throw new Error("failed"); });
  await assert.rejects(claimSorterPort("bridge", { controllerId: "/dev/ttyUSB903" }), /open-failed/);
  assert.equal((await listPiSorters()).find((device) => device.id === "/dev/ttyUSB903")?.busy, false);
});


test("USB-only Linux/Pi hosts discover and connect multiple sorters without GPIO", async (t) => {
  const previous = { host: process.env.PI_HOST, sorter: process.env.PI_SORTER };
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "0";
  const ports: FakePort[] = [];
  t.after(() => {
    for (const port of ports) releaseSorterPort("bridge", port);
    if (previous.host === undefined) delete process.env.PI_HOST; else process.env.PI_HOST = previous.host;
    if (previous.sorter === undefined) delete process.env.PI_SORTER; else process.env.PI_SORTER = previous.sorter;
  });
  t.mock.method(piSerialRuntime, "list", async () => [
    { path: "/dev/ttyACM904", manufacturer: "USB Sorter A" },
    { path: "/dev/ttyUSB905", manufacturer: "USB Sorter B" },
  ]);
  t.mock.method(piSerialRuntime, "open", async () => {
    const port = new FakePort();
    ports.push(port);
    return port;
  });
  const devices = await listPiSorters();
  assert.equal(devices.length, 2);
  assert.ok(devices.every((device) => !device.builtin));
  assert.equal(await resolveSorterTarget(), "/dev/ttyACM904");
  await assert.rejects(resolveSorterTarget("gpio"), /missing/);
  await claimSorterPort("bridge", { controllerId: "/dev/ttyACM904" });
  await claimSorterPort("bridge", { controllerId: "/dev/ttyUSB905" });
  assert.equal(ports.length, 2);
  assert.ok((await listPiSorters()).every((device) => device.busy));
  await assert.rejects(claimSorterPort("session", { controllerId: "/dev/ttyACM904" }), /busy/);
});
