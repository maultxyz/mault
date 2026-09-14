import {
  DEFAULT_CHANNEL_LAYOUT,
  type ChannelLayout,
} from "@magic-vault/shared";
import type { Transaction } from "../db";
import { devices } from "../db/schema";

async function detectDefaultChannelLayout(
  tx: Transaction,
  orgId: string,
): Promise<ChannelLayout> {
  const existing = await tx.query.moduleConfigs.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    columns: { id: true },
  });
  return existing ? "legacy" : DEFAULT_CHANNEL_LAYOUT;
}

export async function getOrCreateDevice(tx: Transaction, orgId: string) {
  const existing = await tx.query.devices.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
  });
  if (existing) return existing;

  const channelLayout = await detectDefaultChannelLayout(tx, orgId);
  const [inserted] = await tx
    .insert(devices)
    .values({ orgId, channelLayout })
    .onConflictDoNothing({ target: devices.orgId })
    .returning();
  if (inserted) return inserted;

  const row = await tx.query.devices.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
  });
  if (!row) throw new Error(`Failed to get or create device for org ${orgId}`);
  return row;
}

export async function getDeviceByGuid(
  tx: Transaction,
  orgId: string,
  guid: string,
) {
  const row = await tx.query.devices.findFirst({
    where: (t, { and, eq }) => and(eq(t.orgId, orgId), eq(t.guid, guid)),
  });
  return row ?? null;
}
