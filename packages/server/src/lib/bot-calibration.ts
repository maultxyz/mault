import { DEFAULT_FEEDER_CALIBRATION } from "@magic-vault/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { devices, feederConfigs, moduleConfigs } from "../db/schema";
import { buildConfigs } from "../routes/module-configs/shared";
import { rowToCalibration } from "../routes/feeder/shared";
import { DISCORD_SELECT_MENU_MAX_OPTIONS } from "./constants/discord";
import type {
  BotCalibrationDevice,
  BotDeviceCalibration,
} from "./interfaces/bot";

export async function listUserCalibrationDevices(
  userId: string,
  preferredOrgId: string | null,
): Promise<BotCalibrationDevice[]> {
  const orgs = await authProvider.listUserOrganisations(userId);
  if (orgs.length === 0) return [];
  const orgNameById = new Map(orgs.map((org) => [org.id, org.name]));

  const rows = await db
    .select({
      guid: devices.guid,
      name: devices.name,
      orgId: devices.orgId,
      moduleCount: devices.moduleCount,
    })
    .from(devices)
    .where(
      and(
        inArray(devices.orgId, [...orgNameById.keys()]),
        eq(devices.isDeleted, false),
      ),
    )
    .orderBy(asc(devices.id));

  return rows
    .sort(
      (a, b) =>
        Number(b.orgId === preferredOrgId) - Number(a.orgId === preferredOrgId),
    )
    .slice(0, DISCORD_SELECT_MENU_MAX_OPTIONS)
    .map((row) => ({
      guid: row.guid!,
      name: row.name,
      orgName: orgNameById.get(row.orgId) ?? "",
      moduleCount: row.moduleCount,
    }));
}

export async function loadUserDeviceCalibration(
  userId: string,
  deviceGuid: string,
): Promise<BotDeviceCalibration | null> {
  const [device] = await db
    .select({
      id: devices.id,
      orgId: devices.orgId,
      name: devices.name,
      moduleCount: devices.moduleCount,
    })
    .from(devices)
    .where(and(eq(devices.guid, deviceGuid), eq(devices.isDeleted, false)))
    .limit(1);
  if (!device) return null;

  const orgs = await authProvider.listUserOrganisations(userId);
  if (!orgs.some((org) => org.id === device.orgId)) return null;

  const [moduleRows, [feederRow]] = await Promise.all([
    db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          eq(moduleConfigs.deviceId, device.id),
          eq(moduleConfigs.isDeleted, false),
        ),
      ),
    db
      .select()
      .from(feederConfigs)
      .where(eq(feederConfigs.deviceId, device.id))
      .limit(1),
  ]);

  return {
    deviceName: device.name,
    moduleCount: device.moduleCount,
    modules: buildConfigs(moduleRows, device.moduleCount),
    feeder: feederRow
      ? rowToCalibration(feederRow)
      : { ...DEFAULT_FEEDER_CALIBRATION },
  };
}
