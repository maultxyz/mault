import { piHostScanStartFormSchema, type PiHostScanStartFormValues } from "@magic-vault/shared";
import { RASPBERRY_PI_SCAN_START_VALUES_KEY_PREFIX } from "@/lib/constants/storage-keys";
import { readKvJson, writeKvJson } from "@/lib/storage/kv";

export function readLastRaspberryPiScanStartValues(orgId: string | null): PiHostScanStartFormValues | null {
  if (!orgId) return null;
  const stored = piHostScanStartFormSchema.safeParse(
    readKvJson<unknown>(RASPBERRY_PI_SCAN_START_VALUES_KEY_PREFIX + orgId, null),
  );
  return stored.success ? stored.data : null;
}

export function saveLastRaspberryPiScanStartValues(orgId: string | null, values: PiHostScanStartFormValues): void {
  if (orgId) writeKvJson(RASPBERRY_PI_SCAN_START_VALUES_KEY_PREFIX + orgId, values);
}
