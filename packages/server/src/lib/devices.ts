import {
  DEFAULT_CHANNEL_LAYOUT,
  type ChannelLayout,
} from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
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

// devices has no per-org unique constraint to conflict on (an org can own
// several), so concurrent first-connects are serialized per org instead.
async function lockOrgDevices(tx: Transaction, orgId: string) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`devices:${orgId}`}))`,
  );
}

async function findFirstDevice(tx: Transaction, orgId: string) {
  return tx.query.devices.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    orderBy: (t, { asc }) => asc(t.id),
  });
}

export async function getOrCreateDevice(tx: Transaction, orgId: string) {
  const existing = await findFirstDevice(tx, orgId);
  if (existing) return existing;

  await lockOrgDevices(tx, orgId);
  const raced = await findFirstDevice(tx, orgId);
  if (raced) return raced;

  const channelLayout = await detectDefaultChannelLayout(tx, orgId);
  const [inserted] = await tx
    .insert(devices)
    .values({ orgId, channelLayout })
    .returning();
  return inserted;
}

export async function listOrgDevices(tx: Transaction, orgId: string) {
  await getOrCreateDevice(tx, orgId);
  return tx.query.devices.findMany({
    where: (t, { eq }) => eq(t.orgId, orgId),
    orderBy: (t, { asc }) => asc(t.id),
  });
}

// Binds a physical board (its firmware-reported id) to a device record: an
// exact match wins, then the oldest record no board has claimed yet (an
// org's pre-multi-device record, or one created by hand), and only then a
// brand new record with default calibration.
export async function resolveDeviceByHardwareId(
  tx: Transaction,
  orgId: string,
  hardwareId: string,
) {
  await lockOrgDevices(tx, orgId);

  const existing = await tx.query.devices.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.orgId, orgId), eq(t.hardwareId, hardwareId)),
  });
  if (existing) return existing;

  const unclaimed = await tx.query.devices.findFirst({
    where: (t, { and, eq, isNull }) =>
      and(eq(t.orgId, orgId), isNull(t.hardwareId)),
    orderBy: (t, { asc }) => asc(t.id),
  });
  if (unclaimed) {
    const [claimed] = await tx
      .update(devices)
      .set({ hardwareId, updatedAt: new Date() })
      .where(eq(devices.id, unclaimed.id))
      .returning();
    return claimed;
  }

  const [inserted] = await tx
    .insert(devices)
    .values({
      orgId,
      hardwareId,
      name: `Card Sorter ${hardwareId}`,
      channelLayout: DEFAULT_CHANNEL_LAYOUT,
    })
    .returning();
  return inserted;
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
