import {
  DEVICE_ALERTS_LIST_LIMIT,
  DEVICE_MAINTENANCE_DUE_RATIO,
  DEVICE_MAINTENANCE_INTERVAL_MAX,
  DEVICE_MAINTENANCE_INTERVAL_MIN,
  DEVICE_RECENT_ALERTS_LIMIT,
  type DeviceAlert,
  type DeviceAlertType,
  type DeviceMaintenanceInput,
  type FleetHealth,
} from "@magic-vault/shared";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../../db";
import { deviceAlerts, devices } from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { isDeviceLeased } from "../../lib/device-leases";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { businessQuery, forbidden, notFound, readJson } from "./shared";

const DEVICE_NOT_FOUND = "Sorter not found.";

async function findDevice(tx: Transaction, orgId: string, guid: string) {
  if (!UUID_PATTERN.test(guid)) return null;
  const row = await tx.query.devices.findFirst({
    where: and(
      eq(devices.guid, guid),
      eq(devices.orgId, orgId),
      eq(devices.isDeleted, false),
    ),
    columns: { id: true, name: true, cardsSorted: true },
  });
  return row ?? null;
}

export const fleetRoute = new Hono<AppEnv>()
  .get("/fleet", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const orgId = c.get("orgId");
      const deviceRows = await tx
        .select()
        .from(devices)
        .where(and(eq(devices.orgId, orgId), eq(devices.isDeleted, false)))
        .orderBy(asc(devices.name));
      const alertRows = await tx
        .select({
          guid: deviceAlerts.guid,
          type: deviceAlerts.type,
          title: deviceAlerts.title,
          description: deviceAlerts.description,
          createdAt: deviceAlerts.createdAt,
          deviceGuid: devices.guid,
          deviceName: devices.name,
        })
        .from(deviceAlerts)
        .leftJoin(devices, eq(devices.id, deviceAlerts.deviceId))
        .where(eq(deviceAlerts.orgId, orgId))
        .orderBy(desc(deviceAlerts.createdAt), desc(deviceAlerts.id))
        .limit(DEVICE_ALERTS_LIST_LIMIT);
      const alerts: DeviceAlert[] = alertRows.map((row) => ({
        guid: row.guid!,
        type: row.type as DeviceAlertType,
        title: row.title,
        description: row.description,
        deviceGuid: row.deviceGuid,
        deviceName: row.deviceName,
        createdAt: row.createdAt.toISOString(),
      }));
      const data: FleetHealth = {
        alerts,
        devices: deviceRows.map((row) => {
          const cardsSinceService = row.cardsSorted - row.cardsAtLastService;
          const interval = row.maintenanceIntervalCards;
          return {
            guid: row.guid!,
            name: row.name,
            isConnected: isDeviceLeased(orgId, row.guid!),
            lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
            cardsSorted: row.cardsSorted,
            cardsSinceService,
            maintenanceIntervalCards: interval,
            lastServicedAt: row.lastServicedAt?.toISOString() ?? null,
            serviceDue:
              interval !== null &&
              cardsSinceService >= interval * DEVICE_MAINTENANCE_DUE_RATIO,
            recentAlerts: alerts
              .filter((alert) => alert.deviceGuid === row.guid)
              .slice(0, DEVICE_RECENT_ALERTS_LIMIT),
          };
        }),
      };
      return { success: true, data };
    }),
  )
  .put("/fleet/:guid/maintenance", requireAuth, requireOrg, async (c) => {
    const body = await readJson<DeviceMaintenanceInput>(c);
    const interval = body.maintenanceIntervalCards;
    const valid =
      interval === null ||
      (Number.isInteger(interval) &&
        (interval as number) >= DEVICE_MAINTENANCE_INTERVAL_MIN &&
        (interval as number) <= DEVICE_MAINTENANCE_INTERVAL_MAX);
    if (!valid) {
      return c.json({ success: false, message: "Invalid interval." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (!access.canManageSettings) return forbidden;
      const device = await findDevice(tx, c.get("orgId"), c.req.param("guid"));
      if (!device) return notFound(DEVICE_NOT_FOUND);
      await tx
        .update(devices)
        .set({
          maintenanceIntervalCards: interval ?? null,
          maintenanceAlertSentAt: null,
        })
        .where(eq(devices.id, device.id));
      return { success: true, data: null };
    });
  })
  .post("/fleet/:guid/serviced", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx) => {
      const orgId = c.get("orgId");
      const device = await findDevice(tx, orgId, c.req.param("guid"));
      if (!device) return notFound(DEVICE_NOT_FOUND);
      await tx
        .update(devices)
        .set({
          cardsAtLastService: sql`${devices.cardsSorted}`,
          lastServicedAt: new Date(),
          maintenanceAlertSentAt: null,
        })
        .where(eq(devices.id, device.id));
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "device.serviced",
        summary: device.name,
        details: { cardsSorted: device.cardsSorted },
      });
      return { success: true, data: null };
    }),
  );
