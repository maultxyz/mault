import { publicGet } from "@/lib/api/client";
import type { AppVersionResponse } from "@/lib/interfaces/nav";

let piHost = false;
let pending: Promise<boolean> | null = null;

export function isPiHost(): boolean {
  return piHost;
}

export function notePiHost(value: boolean) {
  piHost = value;
}

export function loadPiHost(): Promise<boolean> {
  if (!pending) {
    pending = publicGet<AppVersionResponse>("/api/public/version")
      .then((res) => {
        piHost = res.data.piHost === true;
        return piHost;
      })
      .catch(() => false);
  }
  return pending;
}
