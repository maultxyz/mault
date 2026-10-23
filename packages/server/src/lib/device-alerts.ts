import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { deviceAlerts, devices } from "../db/schema";
import {
  ALERT_EMBED_COLOR,
  DEVICE_LAST_SEEN_THROTTLE_MS,
  MAINTENANCE_EMBED_COLOR,
} from "./constants/business";
import { DEVICE_OFFLINE_ALERT_WINDOW_MS } from "./constants/timing";
import {
  markDeviceLeaseScanned,
  onDeviceLeaseExpired,
  UNIDENTIFIED_SORTER_LEASE_KEY,
} from "./device-leases";
import { sendDiscordNotification } from "./discord";
import type { DeviceAlertInput } from "./interfaces/business";
import { emitSorterAlertWebhook } from "./webhooks/events";

async function findDevice(orgId: string, deviceGuid: string | null) {
  if (!deviceGuid) return null;
  const [row] = await db
    .select({ id: devices.id, guid: devices.guid, name: devices.name })
    .from(devices)
    .where(
      and(
        eq(devices.guid, deviceGuid),
        eq(devices.orgId, orgId),
        eq(devices.isDeleted, false),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function raiseDeviceAlert(input: DeviceAlertInput): Promise<void> {
  try {
    const device = await findDevice(input.orgId, input.deviceGuid);
    await db.insert(deviceAlerts).values({
      orgId: input.orgId,
      deviceId: device?.id ?? null,
      type: input.type,
      title: input.title,
      description: input.description,
    });
    const description = device
      ? `**Sorter:** ${device.name}\n${input.description}`
      : input.description;
    void sendDiscordNotification(
      input.orgId,
      {
        title: `Mault: ${input.title}`,
        description,
        color:
          input.type === "maintenance"
            ? MAINTENANCE_EMBED_COLOR
            : ALERT_EMBED_COLOR,
        timestamp: new Date().toISOString(),
      },
      "error",
      undefined,
      undefined,
      input.collectionGuid,
    );
    emitSorterAlertWebhook(input.orgId, {
      object: "sorter_alert",
      type: input.type,
      title: input.title,
      description: input.description,
      sorter:
        device?.guid != null
          ? { object: "sorter", id: device.guid, name: device.name }
          : null,
    });
  } catch (err) {
    console.error("[device-alerts] Failed to raise alert:", err);
  }
}

export async function recordDeviceSorted(
  orgId: string,
  deviceGuid: string | null | undefined,
): Promise<void> {
  if (!deviceGuid) return;
  markDeviceLeaseScanned(orgId, deviceGuid);
  try {
    const [row] = await db
      .update(devices)
      .set({
        cardsSorted: sql`${devices.cardsSorted} + 1`,
        lastSeenAt: new Date(),
      })
      .where(
        and(
          eq(devices.guid, deviceGuid),
          eq(devices.orgId, orgId),
          eq(devices.isDeleted, false),
        ),
      )
      .returning({
        id: devices.id,
        guid: devices.guid,
        name: devices.name,
        cardsSorted: devices.cardsSorted,
        cardsAtLastService: devices.cardsAtLastService,
        maintenanceIntervalCards: devices.maintenanceIntervalCards,
        maintenanceAlertSentAt: devices.maintenanceAlertSentAt,
      });
    if (
      !row?.maintenanceIntervalCards ||
      row.maintenanceAlertSentAt ||
      row.cardsSorted - row.cardsAtLastService < row.maintenanceIntervalCards
    ) {
      return;
    }
    const [claimed] = await db
      .update(devices)
      .set({ maintenanceAlertSentAt: new Date() })
      .where(
        and(
          eq(devices.id, row.id),
          sql`${devices.maintenanceAlertSentAt} IS NULL`,
        ),
      )
      .returning({ id: devices.id });
    if (!claimed) return;
    await raiseDeviceAlert({
      orgId,
      deviceGuid: row.guid,
      type: "maintenance",
      title: "Service Due",
      description: `${row.cardsSorted - row.cardsAtLastService} cards sorted since the last service (interval ${row.maintenanceIntervalCards}). Clean the rollers, check the paddles and mark it serviced on the Sorters page.`,
    });
  } catch (err) {
    console.error("[device-alerts] Failed to count sorted card:", err);
  }
}

const lastSeenWrites = new Map<string, number>();

export function touchDeviceLastSeen(orgId: string, deviceGuid: string): void {
  const now = Date.now();
  const key = `${orgId}:${deviceGuid}`;
  if (now - (lastSeenWrites.get(key) ?? 0) < DEVICE_LAST_SEEN_THROTTLE_MS) {
    return;
  }
  lastSeenWrites.set(key, now);
  void db
    .update(devices)
    .set({ lastSeenAt: new Date(now) })
    .where(and(eq(devices.guid, deviceGuid), eq(devices.orgId, orgId)))
    .catch((err) => console.error("[device-alerts] last seen:", err));
}

export function startDeviceOfflineAlerts(): void {
  onDeviceLeaseExpired((orgId, deviceKey, lastScanAt) => {
    if (deviceKey === UNIDENTIFIED_SORTER_LEASE_KEY || lastScanAt === null) {
      return;
    }
    if (Date.now() - lastScanAt > DEVICE_OFFLINE_ALERT_WINDOW_MS) return;
    void raiseDeviceAlert({
      orgId,
      deviceGuid: deviceKey,
      type: "offline",
      title: "Sorter Offline",
      description:
        "The sorter stopped checking in during a scan session without disconnecting. The browser tab may have closed or lost its network.",
    });
  });
}
