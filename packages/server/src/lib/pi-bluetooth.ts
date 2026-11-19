import { execFile, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { NUS_SERVICE_UUID, NUS_RX_CHARACTERISTIC_UUID, NUS_TX_CHARACTERISTIC_UUID } from "@magic-vault/shared";
import type { PiBluetoothCapabilities, PiSorterDevice } from "@magic-vault/shared";
import type { SorterPort } from "./interfaces/pi-serial";
import type { BluetoothProcess, BluetoothWrite } from "./interfaces/pi-bluetooth";

const execute = promisify(execFile);
function helperPath() {
  const relative = "scripts/pi/bluetooth-ctl.py";
  return [resolve(process.cwd(), relative), resolve(process.cwd(), "../..", relative)].find(existsSync) ?? resolve(process.cwd(), relative);
}
function argumentsFor(action: string, address?: string) {
  return [helperPath(), action, "--service", NUS_SERVICE_UUID, "--rx", NUS_RX_CHARACTERISTIC_UUID, "--tx", NUS_TX_CHARACTERISTIC_UUID, ...(address ? ["--address", address] : [])];
}
export const piBluetoothRuntime = {
  execute: async (action: string) => {
    const { stdout } = await execute("/usr/bin/python3", argumentsFor(action), { timeout: 12000, maxBuffer: 262144 });
    return JSON.parse(stdout);
  },
  spawn: (address: string) => spawn("/usr/bin/python3", argumentsFor("connect", address), { stdio: "pipe" }),
};
export async function bluetoothCapabilities(): Promise<PiBluetoothCapabilities> {
  if (process.platform !== "linux") return { supported: false };
  try { const result = await piBluetoothRuntime.execute("capabilities"); return { supported: result.supported === true, powered: result.powered === true }; }
  catch { return { supported: false }; }
}
let discovery: Promise<PiSorterDevice[]> | null = null;
export function discoverBluetoothSorters(): Promise<PiSorterDevice[]> {
  if (discovery) return discovery;
  discovery = piBluetoothRuntime.execute("discover").then((result: { devices: PiSorterDevice[] }) => result.devices.filter((device) => isBluetoothTarget(device.id))).finally(() => { discovery = null; });
  return discovery;
}
export function isBluetoothTarget(value: string): boolean {
  return /^ble:(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(value);
}

export class PiBluetoothPort extends EventEmitter implements SorterPort {
  isOpen = false;
  private sequence = 0;
  private pending = new Map<number, BluetoothWrite>();
  private closed = false;
  private constructor(private child: BluetoothProcess) { super(); }

  static open(target: string): Promise<PiBluetoothPort> {
    if (!isBluetoothTarget(target)) return Promise.reject(new Error("Invalid Bluetooth target"));
    return new Promise((resolveOpen, reject) => {
      const child = piBluetoothRuntime.spawn(target.slice(4));
      const port = new PiBluetoothPort(child);
      let buffer = "";
      const timeout = setTimeout(() => fail(new Error("Bluetooth connection timed out")), 30000);
      const fail = (error: Error) => {
        clearTimeout(timeout);
        if (!port.isOpen) reject(error);
        else if (port.listenerCount("error")) port.emit("error", error);
        port.close();
      };
      child.once("error", fail);
      child.once("close", () => {
        clearTimeout(timeout);
        if (!port.isOpen) reject(new Error("Bluetooth connection closed"));
        port.close();
      });
      child.stderr.resume();
      child.stdout.on("data", (chunk: Buffer) => {
        if (port.closed) return;
        buffer += chunk.toString();
        if (buffer.length > 1048576) { fail(new Error("Invalid Bluetooth helper response")); return; }
        while (buffer.includes("\n")) {
          const newline = buffer.indexOf("\n");
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          try {
            const message = JSON.parse(line);
            if (message.type === "ready") { clearTimeout(timeout); port.isOpen = true; resolveOpen(port); }
            else if (message.type === "data") port.emit("data", Buffer.from(message.data, "base64"));
            else if (message.type === "written") {
              const write = port.pending.get(message.id);
              if (write) { clearTimeout(write.timer); port.pending.delete(message.id); write.callback?.(); }
            } else if (message.type === "error") fail(new Error("Bluetooth sorter connection failed"));
          } catch { fail(new Error("Invalid Bluetooth helper response")); }
        }
      });
    });
  }
  write(data: string | Buffer, callback?: (error?: Error | null) => void) {
    if (!this.isOpen) { callback?.(new Error("Bluetooth connection closed")); return false; }
    const id = ++this.sequence;
    const timer = setTimeout(() => {
      const error = new Error("Bluetooth write timed out");
      this.pending.delete(id);
      callback?.(error);
      if (this.listenerCount("error")) this.emit("error", error);
      this.close();
    }, 15000);
    this.pending.set(id, { callback, timer });
    return this.child.stdin.write(JSON.stringify({ id, data: Buffer.from(data).toString("base64") }) + "\n", (error) => {
      if (!error) return;
      const pending = this.pending.get(id);
      if (pending) { clearTimeout(pending.timer); this.pending.delete(id); pending.callback?.(error); }
      this.close();
    });
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.isOpen = false;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.callback?.(new Error("Bluetooth connection closed")); }
    this.pending.clear();
    this.child.stdin.end();
    const kill = setTimeout(() => this.child.kill("SIGKILL"), 3000);
    kill.unref();
    this.child.once("close", () => clearTimeout(kill));
    this.emit("close");
  }
}
