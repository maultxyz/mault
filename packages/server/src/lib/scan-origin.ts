import { and, eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { devices } from "../db/schema";
import { UUID_PATTERN } from "./constants/validation";

export async function resolveScanDeviceId(
  tx: Transaction,
  orgId: string,
  deviceGuid: string | undefined,
): Promise<number | null> {
  if (!deviceGuid || !UUID_PATTERN.test(deviceGuid)) return null;
  const [device] = await tx
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.guid, deviceGuid), eq(devices.orgId, orgId)))
    .limit(1);
  return device?.id ?? null;
}
