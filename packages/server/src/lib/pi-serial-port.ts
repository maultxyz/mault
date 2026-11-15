import { realpath, readdir } from "node:fs/promises";
import type { PiSorterDevice } from "@magic-vault/shared";
import { SerialPort } from "serialport";
import type { PiSerialErrorReason } from "@magic-vault/shared";
import { PI_SERIAL_BAUD_RATE } from "./constants/pi-serial";
import type { SorterPort, SorterPortOwner, SorterPortClaim, SorterPortOptions } from "./interfaces/pi-serial";
import { PiControllerPort } from "./pi-controller-port";
import { PiControllerHub } from "./pi-controller-hub";
import { PiBluetoothPort, isBluetoothTarget } from "./pi-bluetooth";
import { isPiSorter, piControllerSocket } from "./pi-host";

export class SorterPortError extends Error {
  constructor(readonly reason: PiSerialErrorReason) {
    super(reason);
  }
}

const claimedPorts = new Map<string, SorterPortClaim>();
const controllerHub = new PiControllerHub(() =>
  PiControllerPort.open(piControllerSocket()),
);

export function sorterPortOwner(): SorterPortOwner | null {
  return controllerHub.owner() ?? claimedPorts.values().next().value?.owner ?? null;
}

export const piSerialRuntime = {
  list: () => SerialPort.list(),
  open: (path: string, hupcl: boolean) => openSorterPort(path, hupcl),
  openBluetooth: (target: string) => PiBluetoothPort.open(target),
};

export async function listPiSorters(): Promise<PiSorterDevice[]> {
  if (isPiSorter()) return [{ id: "gpio", label: "GPIO", builtin: true, busy: controllerHub.owner() !== null }];
  const ports = await piSerialRuntime.list();
  const aliases = new Map<string, string>();
  const names = await readdir("/dev/serial/by-id").catch(() => [] as string[]);
  for (const name of names.sort()) {
    const path = `/dev/serial/by-id/${name}`;
    const target = await realpath(path).catch(() => null);
    if (target && !aliases.has(target)) aliases.set(target, path);
  }
  const devices: PiSorterDevice[] = [];
  for (const port of ports) {
    if (!/\/tty(?:ACM|USB)\d+$/.test(port.path)) continue;
    const id = aliases.get(port.path) ?? port.path;
    devices.push({ id, label: [port.manufacturer, port.serialNumber || port.path].filter(Boolean).join(" "),
      builtin: false, busy: claimedPorts.has(port.path) });
  }
  return devices;
}

export async function resolveSorterTarget(controllerId?: string): Promise<string> {
  if (isPiSorter()) {
    if (!controllerId || controllerId === "gpio") return "gpio";
    throw new SorterPortError("missing");
  }
  if (controllerId?.startsWith("ble:")) {
    if (!isBluetoothTarget(controllerId)) throw new SorterPortError("missing");
    return "ble:" + controllerId.slice(4).toUpperCase();
  }
  if (controllerId === "gpio") {
    if (!isPiSorter()) throw new SorterPortError("missing");
    return "gpio";
  }
  const devices = (await listPiSorters()).filter((device) => !device.builtin);
  const configured = process.env.SERIAL_PORT?.trim();
  const selected = controllerId === "usb" ? devices[0]?.id : controllerId ?? configured ?? devices[0]?.id;
  if (!controllerId && configured) return realpath(configured).catch(() => configured);
  if (!selected || !devices.some((device) => device.id === selected))
    throw new SorterPortError("missing");
  return realpath(selected).catch(() => selected);
}

function openSorterPort(path: string, hupcl: boolean): Promise<SerialPort> {
  return new Promise((resolve, reject) => {
    const port = new SerialPort(
      { path, baudRate: PI_SERIAL_BAUD_RATE, lock: true, hupcl },
      (error) => (error ? reject(error) : resolve(port)),
    );
  });
}

export async function claimSorterPort(
  next: SorterPortOwner,
  options?: SorterPortOptions,
): Promise<SorterPort> {
  const target = await resolveSorterTarget(options?.controllerId);
  if (target === "gpio") {
    try {
      return await controllerHub.open(next);
    } catch (error) {
      if (error instanceof Error && error.message === "busy")
        throw new SorterPortError("busy");
      throw new SorterPortError("open-failed");
    }
  }
  if (claimedPorts.has(target)) throw new SorterPortError("busy");
  const claim = { owner: next, port: null as SorterPort | null };
  claimedPorts.set(target, claim);
  try {
    const port = isBluetoothTarget(target)
      ? await piSerialRuntime.openBluetooth(target)
      : await piSerialRuntime.open(target, options?.hupcl !== false);
    claim.port = port;
    return port;
  } catch (error) {
    claimedPorts.delete(target);
    if (error instanceof SorterPortError) throw error;
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") throw new SorterPortError("missing");
    if (
      err.code === "EBUSY" ||
      err.code === "EAGAIN" ||
      /lock/i.test(err.message ?? "")
    ) {
      throw new SorterPortError("busy");
    }
    throw new SorterPortError("open-failed");
  }
}

export function releaseSorterPort(
  current: SorterPortOwner,
  connection?: SorterPort,
) {
  const entry = [...claimedPorts.entries()].find(([, claim]) =>
    claim.owner === current && (!connection || claim.port === connection));
  if (!entry) {
    controllerHub.release(current, connection);
    return;
  }
  const [target, claim] = entry;
  claimedPorts.delete(target);
  const port = claim.port;
  if (!port) return;
  port.removeAllListeners();
  if (port.isOpen) port.close();
}

export function bluetoothSorterBusy(target: string): boolean {
  return claimedPorts.has("ble:" + target.slice(4).toUpperCase());
}
