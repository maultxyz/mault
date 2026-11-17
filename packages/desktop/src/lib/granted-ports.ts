import { app } from "electron";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { GRANTED_SERIAL_PORTS_FILE } from "./constants/desktop";
import type { SerialPortIdentity } from "./interfaces/desktop";

let granted: Set<string> | null = null;

function storePath() {
  return path.join(app.getPath("userData"), GRANTED_SERIAL_PORTS_FILE);
}

function load(): Set<string> {
  if (granted) return granted;
  try {
    granted = new Set(JSON.parse(readFileSync(storePath(), "utf-8")) as string[]);
  } catch {
    granted = new Set();
  }
  return granted;
}

export function serialPortKey(port: SerialPortIdentity): string | null {
  const instanceId = port.deviceInstanceId ?? port.device_instance_id;
  if (instanceId) return `win:${instanceId}`;
  const vendorId = port.vendorId ?? port.vendor_id;
  const productId = port.productId ?? port.product_id;
  if (vendorId !== undefined && productId !== undefined) {
    const serialNumber = port.serialNumber ?? port.serial_number ?? "";
    return `usb:${Number(vendorId)}:${Number(productId)}:${serialNumber}`;
  }
  return null;
}

export function isSerialPortGranted(port: SerialPortIdentity): boolean {
  const key = serialPortKey(port);
  return key !== null && load().has(key);
}

export function grantSerialPort(port: Electron.SerialPort) {
  const key = serialPortKey(port);
  if (!key) return;
  const ports = load();
  if (ports.has(key)) return;
  ports.add(key);
  try {
    writeFileSync(storePath(), JSON.stringify([...ports]));
  } catch (err) {
    console.error("[desktop] failed to store serial port grant:", err);
  }
}
