import { PI_SCAN_SESSION_API } from "@/lib/constants/scanner";
import { piHostScanSessionPath } from "@magic-vault/shared";

let linkedPiHostGuid: string | null = null;

export function linkedPiScanHostGuid(): string | null {
  return linkedPiHostGuid;
}

export function setLinkedPiScanHostGuid(hostGuid: string | null) {
  linkedPiHostGuid = hostGuid;
}

export function piScanSessionApiPath(subpath?: string): string {
  const base = linkedPiHostGuid
    ? `/api${piHostScanSessionPath(linkedPiHostGuid)}`
    : PI_SCAN_SESSION_API;
  return subpath ? `${base}/${subpath}` : base;
}
