import { SerialPort } from "serialport";
import type { PiSerialErrorReason } from "@magic-vault/shared";
import { PI_SERIAL_BAUD_RATE } from "./constants/pi-serial";
import type { SorterPort, SorterPortOwner } from "./interfaces/pi-serial";
import { PiControllerPort } from "./pi-controller-port";
import { PiControllerHub } from "./pi-controller-hub";
import { isPiSorter, piControllerSocket } from "./pi-host";

export class SorterPortError extends Error {
  constructor(readonly reason: PiSerialErrorReason) {
    super(reason);
  }
}

let owner: SorterPortOwner | null = null;
let openPort: SorterPort | null = null;
const controllerHub = new PiControllerHub(() =>
  PiControllerPort.open(piControllerSocket()),
);

export function sorterPortOwner(): SorterPortOwner | null {
  if (isPiSorter()) return controllerHub.owner();
  return owner;
}

async function findSorterPort(): Promise<string | null> {
  const configured = process.env.SERIAL_PORT?.trim();
  if (configured) return configured;
  const ports = await SerialPort.list();
  const paths = ports.map((port) => port.path);
  const acm = paths.filter((path) => /ttyACM\d+$/.test(path)).sort();
  if (acm[0]) return acm[0];
  const usb = paths.filter((path) => /ttyUSB\d+$/.test(path)).sort();
  return usb[0] ?? null;
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
  options?: { hupcl?: boolean },
): Promise<SorterPort> {
  if (isPiSorter()) {
    try {
      return await controllerHub.open(next);
    } catch (error) {
      if (error instanceof Error && error.message === "busy")
        throw new SorterPortError("busy");
      throw new SorterPortError("open-failed");
    }
  }
  if (owner) throw new SorterPortError("busy");
  owner = next;
  try {
    const path = await findSorterPort();
    if (!path) throw new SorterPortError("missing");
    const port = await openSorterPort(path, options?.hupcl !== false);
    openPort = port;
    return port;
  } catch (error) {
    owner = null;
    openPort = null;
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
  if (isPiSorter()) {
    controllerHub.release(current, connection);
    return;
  }
  if (owner !== current) return;
  const port = openPort;
  owner = null;
  openPort = null;
  if (!port) return;
  port.removeAllListeners();
  if (port.isOpen) port.close();
}
