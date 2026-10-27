import { publicGet } from "@/lib/api/client";
import type { AppVersionResponse } from "@/lib/interfaces/nav";

let piHost = false;
let settled = false;
let pending: Promise<boolean> | null = null;

export function isPiHost(): boolean {
  return piHost;
}

export function isPiHostSettled(): boolean {
  return settled;
}

export function notePiHost(value: boolean) {
  piHost = value;
  settled = true;
}

export function loadPiHost(): Promise<boolean> {
  if (!pending) {
    pending = publicGet<AppVersionResponse>("/api/public/version")
      .then((res) => {
        notePiHost(res.data.piHost === true);
        return piHost;
      })
      .catch(() => {
        settled = true;
        return piHost;
      });
  }
  return pending;
}
