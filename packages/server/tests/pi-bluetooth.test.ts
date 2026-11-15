import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { bluetoothCapabilities, discoverBluetoothSorters, PiBluetoothPort, piBluetoothRuntime } from "../src/lib/pi-bluetooth";
import type { BluetoothProcess } from "../src/lib/interfaces/pi-bluetooth";
import { claimSorterPort, releaseSorterPort, piSerialRuntime, resolveSorterTarget } from "../src/lib/pi-serial-port";

function helper() {
  return Object.assign(new EventEmitter(), { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), kill: () => true });
}

test("host capability reports an adapter without scanning and hides unavailable runtimes", async (t) => {
  const execute = t.mock.method(piBluetoothRuntime, "execute", async () => ({ supported: true, powered: false }));
  assert.deepEqual(await bluetoothCapabilities(), { supported: true, powered: false });
  assert.deepEqual(execute.mock.calls[0]?.arguments, ["capabilities"]);
  execute.mock.mockImplementation(async () => { throw new Error("missing runtime"); });
  assert.deepEqual(await bluetoothCapabilities(), { supported: false });
});

test("concurrent discovery shares a scan and rejects malformed device IDs", async (t) => {
  const execute = t.mock.method(piBluetoothRuntime, "execute", async () => ({ devices: [
    { id: "ble:AA:BB:CC:DD:EE:FF", label: "ESP32", builtin: false, busy: false },
    { id: "/etc/passwd", label: "wrong", builtin: false, busy: false },
  ] }));
  const [first, second] = await Promise.all([discoverBluetoothSorters(), discoverBluetoothSorters()]);
  assert.deepEqual(first, second);
  assert.equal(first.length, 1);
  assert.equal(execute.mock.callCount(), 1);
});

test("Bluetooth byte transport waits for ready, forwards notifications and confirms writes", async (t) => {
  const child = helper();
  t.mock.method(piBluetoothRuntime, "spawn", () => child as unknown as BluetoothProcess);
  const opening = PiBluetoothPort.open("ble:AA:BB:CC:DD:EE:FF");
  child.stdout.write('{"type":"ready"}\n');
  const port = await opening;
  let data = "";
  port.on("data", (bytes: Buffer) => { data += bytes.toString(); });
  child.stdout.write(JSON.stringify({ type: "data", data: Buffer.from('{"seq":1}\n').toString("base64") }) + '\n');
  assert.equal(data, '{"seq":1}\n');
  let written = false;
  port.write('{"getStatus":true}\n', () => { written = true; });
  const message = JSON.parse(child.stdin.read().toString());
  assert.equal(Buffer.from(message.data, "base64").toString(), '{"getStatus":true}\n');
  assert.equal(written, false);
  child.stdout.write(JSON.stringify({ type: "written", id: message.id }) + '\n');
  assert.equal(written, true);
  let closed = false;
  port.once("close", () => { closed = true; });
  child.emit("close");
  assert.equal(closed, true);
  assert.equal(port.isOpen, false);
});

test("a failed BLE connection rejects startup and releases only its own reservation", async (t) => {
  const previous = { host: process.env.PI_HOST, sorter: process.env.PI_SORTER };
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "0";
  t.after(() => {
    for (const [key, value] of [["PI_HOST", previous.host], ["PI_SORTER", previous.sorter]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  });
  const child = helper();
  t.mock.method(piBluetoothRuntime, "spawn", () => child as unknown as BluetoothProcess);
  const opening = PiBluetoothPort.open("ble:AA:BB:CC:DD:EE:FF");
  child.stdout.write('{"type":"error"}\n');
  await assert.rejects(opening, /failed/);
  child.emit("close");
  t.mock.method(piSerialRuntime, "openBluetooth", async () => { throw new Error("unavailable"); });
  await assert.rejects(claimSorterPort("bridge", { controllerId: "ble:AA:BB:CC:DD:EE:FF" }), /open-failed/);
  await assert.rejects(claimSorterPort("session", { controllerId: "ble:AA:BB:CC:DD:EE:FF" }), /open-failed/);
});

test("BLE reservations are case-insensitive and shared by browser bridges and headless scans", async (t) => {
  const previous = process.env.PI_SORTER;
  process.env.PI_SORTER = "0";
  const port = Object.assign(new EventEmitter(), { isOpen: true, write() {}, close() { this.isOpen = false; } });
  t.after(() => { releaseSorterPort("bridge", port); if (previous === undefined) delete process.env.PI_SORTER; else process.env.PI_SORTER = previous; });
  t.mock.method(piSerialRuntime, "openBluetooth", async () => port as PiBluetoothPort);
  await claimSorterPort("bridge", { controllerId: "ble:aa:bb:cc:dd:ee:ff" });
  await assert.rejects(claimSorterPort("session", { controllerId: "ble:AA:BB:CC:DD:EE:FF" }), /busy/);
  await assert.rejects(resolveSorterTarget("ble:not-a-device"), /missing/);
});
