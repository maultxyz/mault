import { loadServerVersion } from "@/lib/server-version";

let piHost = false;
let piController = false;
let settled = false;
let pending: Promise<boolean> | null = null;

export function isPiHost(): boolean {
  return piHost;
}

export function isPiHostSettled(): boolean {
  return settled;
}

export function isPiController(): boolean {
  return piHost && piController;
}

export function notePiHost(value: boolean, controller = false) {
  piHost = value;
  piController = controller;
  settled = true;
}

export function loadPiHost(): Promise<boolean> {
  if (!pending) {
    pending = loadServerVersion().then((serverVersion) => {
      if (serverVersion) {
        notePiHost(serverVersion.piHost === true, serverVersion.piSorter === true);
      } else settled = true;
      return piHost;
    });
  }
  return pending;
}
