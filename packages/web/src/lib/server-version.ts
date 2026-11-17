import { publicGet } from "@/lib/api/client";
import type { AppVersionResponse } from "@/lib/interfaces/nav";
import { noteLatestFirmwareVersion } from "@/lib/latest-firmware-version";

let pending: Promise<AppVersionResponse["data"] | null> | null = null;

export async function fetchServerVersion(): Promise<AppVersionResponse["data"]> {
  const res = await publicGet<AppVersionResponse>("/api/public/version");
  noteLatestFirmwareVersion(res.data.latestFirmwareVersion ?? null);
  return res.data;
}

export function loadServerVersion(): Promise<AppVersionResponse["data"] | null> {
  if (!pending) pending = fetchServerVersion().catch(() => null);
  return pending;
}
