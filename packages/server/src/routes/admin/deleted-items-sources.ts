import type { DeletedItemType } from "@magic-vault/shared";
import { and, eq, ne } from "drizzle-orm";
import { db, type Transaction } from "../../db";
import {
  announcements,
  binHeights,
  binRoutes,
  binSets,
  bins,
  collections,
  devices,
  games,
  moduleConfigs,
  notificationRules,
  soundClips,
  soundRules,
  storageLocations,
} from "../../db/schema";
import { binSetNameTaken } from "../bins/shared";
import { collectionNameTaken } from "../collections/shared";
import { locationNameTaken } from "../storage-locations/shared";
import type {
  DeletedItemRestoreResult,
  DeletedItemSource,
} from "../../lib/interfaces/deleted-items";

const NOT_FOUND: DeletedItemRestoreResult = {
  success: false,
  message: "Deleted item not found.",
};

const restored = (orgId: string | null): DeletedItemRestoreResult => ({
  success: true,
  orgId,
});

export const DELETED_ITEM_SOURCES: Record<DeletedItemType, DeletedItemSource> =
  {
    collection: {
      async list() {
        const rows = await db
          .select()
          .from(collections)
          .where(eq(collections.isDeleted, true));
        return rows.map((r) => ({
          type: "collection",
          guid: r.guid!,
          name: r.name,
          detail: null,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const row = await tx.query.collections.findFirst({
          where: and(
            eq(collections.guid, guid),
            eq(collections.isDeleted, true),
          ),
        });
        if (!row) return NOT_FOUND;
        if (await collectionNameTaken(tx, row.orgId, row.name)) {
          return {
            success: false,
            message: `The organization already has a collection named "${row.name}".`,
          };
        }
        await tx
          .update(collections)
          .set({ isDeleted: false })
          .where(eq(collections.id, row.id));
        return restored(row.orgId);
      },
    },
    binSet: {
      async list() {
        const rows = await db
          .select({
            guid: binSets.guid,
            name: binSets.name,
            gameName: games.name,
            orgId: binSets.orgId,
            updatedAt: binSets.updatedAt,
          })
          .from(binSets)
          .leftJoin(games, eq(games.id, binSets.gameId))
          .where(eq(binSets.isDeleted, true));
        return rows.map((r) => ({
          type: "binSet",
          guid: r.guid!,
          name: r.name,
          detail: r.gameName,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const row = await tx.query.binSets.findFirst({
          where: and(eq(binSets.guid, guid), eq(binSets.isDeleted, true)),
        });
        if (!row) return NOT_FOUND;
        if (await binSetNameTaken(tx, row.orgId, row.gameId, row.name)) {
          return {
            success: false,
            message: `The organization already has a bin preset named "${row.name}".`,
          };
        }
        await tx
          .update(binSets)
          .set({ isDeleted: false })
          .where(eq(binSets.id, row.id));
        return restored(row.orgId);
      },
    },
    bin: {
      async list() {
        const rows = await db
          .select({
            guid: bins.guid,
            binNumber: bins.binNumber,
            setName: binSets.name,
            orgId: bins.orgId,
            updatedAt: bins.updatedAt,
          })
          .from(bins)
          .innerJoin(binSets, eq(binSets.id, bins.binSet))
          .where(eq(bins.isDeleted, true));
        return rows.map((r) => ({
          type: "bin",
          guid: r.guid!,
          name: `Bin ${r.binNumber}`,
          detail: r.setName,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const row = await tx.query.bins.findFirst({
          where: and(eq(bins.guid, guid), eq(bins.isDeleted, true)),
        });
        if (!row) return NOT_FOUND;
        const active = await tx.query.bins.findFirst({
          where: and(
            eq(bins.binSet, row.binSet),
            eq(bins.binNumber, row.binNumber),
            eq(bins.isDeleted, false),
          ),
          columns: { id: true },
        });
        if (active) {
          return {
            success: false,
            message: `Bin ${row.binNumber} in that preset has been configured again since. Clear it first.`,
          };
        }
        await tx
          .update(bins)
          .set({ isDeleted: false })
          .where(eq(bins.id, row.id));
        return restored(row.orgId);
      },
    },
    device: {
      async list() {
        const rows = await db
          .select()
          .from(devices)
          .where(eq(devices.isDeleted, true));
        return rows.map((r) => ({
          type: "device",
          guid: r.guid!,
          name: r.name,
          detail: r.hardwareId,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const row = await tx.query.devices.findFirst({
          where: and(eq(devices.guid, guid), eq(devices.isDeleted, true)),
        });
        if (!row) return NOT_FOUND;
        if (row.hardwareId) {
          const active = await tx.query.devices.findFirst({
            where: and(
              eq(devices.orgId, row.orgId),
              eq(devices.hardwareId, row.hardwareId),
              eq(devices.isDeleted, false),
              ne(devices.id, row.id),
            ),
            columns: { id: true },
          });
          if (active) {
            return {
              success: false,
              message:
                "This board has connected again since and has a new sorter record. Delete that one first.",
            };
          }
        }
        await tx
          .update(devices)
          .set({ isDeleted: false })
          .where(eq(devices.id, row.id));
        return restored(row.orgId);
      },
    },
    binRoute: {
      async list() {
        const rows = await db
          .select({
            guid: binRoutes.guid,
            binNumber: binRoutes.binNumber,
            deviceName: devices.name,
            orgId: binRoutes.orgId,
            updatedAt: binRoutes.updatedAt,
          })
          .from(binRoutes)
          .innerJoin(devices, eq(devices.id, binRoutes.deviceId))
          .where(eq(binRoutes.isDeleted, true));
        return rows.map((r) => ({
          type: "binRoute",
          guid: r.guid!,
          name: `Bin ${r.binNumber} route`,
          detail: r.deviceName,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const [row] = await tx
          .update(binRoutes)
          .set({ isDeleted: false })
          .where(and(eq(binRoutes.guid, guid), eq(binRoutes.isDeleted, true)))
          .returning({ orgId: binRoutes.orgId });
        return row ? restored(row.orgId) : NOT_FOUND;
      },
    },
    binHeight: {
      async list() {
        const rows = await db
          .select({
            guid: binHeights.guid,
            binNumber: binHeights.binNumber,
            deviceName: devices.name,
            orgId: binHeights.orgId,
            updatedAt: binHeights.updatedAt,
          })
          .from(binHeights)
          .innerJoin(devices, eq(devices.id, binHeights.deviceId))
          .where(eq(binHeights.isDeleted, true));
        return rows.map((r) => ({
          type: "binHeight",
          guid: r.guid!,
          name: `Bin ${r.binNumber} height`,
          detail: r.deviceName,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const [row] = await tx
          .update(binHeights)
          .set({ isDeleted: false })
          .where(and(eq(binHeights.guid, guid), eq(binHeights.isDeleted, true)))
          .returning({ orgId: binHeights.orgId });
        return row ? restored(row.orgId) : NOT_FOUND;
      },
    },
    moduleConfig: {
      async list() {
        const rows = await db
          .select({
            guid: moduleConfigs.guid,
            moduleNumber: moduleConfigs.moduleNumber,
            deviceName: devices.name,
            orgId: moduleConfigs.orgId,
            updatedAt: moduleConfigs.updatedAt,
          })
          .from(moduleConfigs)
          .innerJoin(devices, eq(devices.id, moduleConfigs.deviceId))
          .where(eq(moduleConfigs.isDeleted, true));
        return rows.map((r) => ({
          type: "moduleConfig",
          guid: r.guid!,
          name: `Module ${r.moduleNumber} calibration`,
          detail: r.deviceName,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const [row] = await tx
          .update(moduleConfigs)
          .set({ isDeleted: false })
          .where(
            and(
              eq(moduleConfigs.guid, guid),
              eq(moduleConfigs.isDeleted, true),
            ),
          )
          .returning({ orgId: moduleConfigs.orgId });
        return row ? restored(row.orgId) : NOT_FOUND;
      },
    },
    storageLocation: {
      async list() {
        const rows = await db
          .select()
          .from(storageLocations)
          .where(eq(storageLocations.isDeleted, true));
        return rows.map((r) => ({
          type: "storageLocation",
          guid: r.guid!,
          name: r.name,
          detail: null,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const row = await tx.query.storageLocations.findFirst({
          where: and(
            eq(storageLocations.guid, guid),
            eq(storageLocations.isDeleted, true),
          ),
        });
        if (!row) return NOT_FOUND;
        if (await locationNameTaken(tx, row.orgId, row.name)) {
          return {
            success: false,
            message: `The organization already has a storage location named "${row.name}".`,
          };
        }
        await tx
          .update(storageLocations)
          .set({ isDeleted: false })
          .where(eq(storageLocations.id, row.id));
        return restored(row.orgId);
      },
    },
    soundClip: {
      async list() {
        const rows = await db
          .select({
            guid: soundClips.guid,
            name: soundClips.name,
            orgId: soundClips.orgId,
            updatedAt: soundClips.updatedAt,
          })
          .from(soundClips)
          .where(eq(soundClips.isDeleted, true));
        return rows.map((r) => ({
          type: "soundClip",
          guid: r.guid!,
          name: r.name,
          detail: null,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const [row] = await tx
          .update(soundClips)
          .set({ isDeleted: false })
          .where(and(eq(soundClips.guid, guid), eq(soundClips.isDeleted, true)))
          .returning({ orgId: soundClips.orgId });
        return row ? restored(row.orgId) : NOT_FOUND;
      },
    },
    soundRule: {
      async list() {
        const rows = await db
          .select({
            guid: soundRules.guid,
            name: soundRules.name,
            gameName: games.name,
            orgId: soundRules.orgId,
            updatedAt: soundRules.updatedAt,
          })
          .from(soundRules)
          .innerJoin(games, eq(games.id, soundRules.gameId))
          .where(eq(soundRules.isDeleted, true));
        return rows.map((r) => ({
          type: "soundRule",
          guid: r.guid!,
          name: r.name,
          detail: r.gameName,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const [row] = await tx
          .update(soundRules)
          .set({ isDeleted: false })
          .where(and(eq(soundRules.guid, guid), eq(soundRules.isDeleted, true)))
          .returning({ orgId: soundRules.orgId });
        return row ? restored(row.orgId) : NOT_FOUND;
      },
    },
    notificationRule: {
      async list() {
        const rows = await db
          .select({
            guid: notificationRules.guid,
            name: notificationRules.name,
            gameName: games.name,
            orgId: notificationRules.orgId,
            updatedAt: notificationRules.updatedAt,
          })
          .from(notificationRules)
          .innerJoin(games, eq(games.id, notificationRules.gameId))
          .where(eq(notificationRules.isDeleted, true));
        return rows.map((r) => ({
          type: "notificationRule",
          guid: r.guid!,
          name: r.name,
          detail: r.gameName,
          orgId: r.orgId,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const [row] = await tx
          .update(notificationRules)
          .set({ isDeleted: false })
          .where(
            and(
              eq(notificationRules.guid, guid),
              eq(notificationRules.isDeleted, true),
            ),
          )
          .returning({ orgId: notificationRules.orgId });
        return row ? restored(row.orgId) : NOT_FOUND;
      },
    },
    game: {
      async list() {
        const rows = await db
          .select()
          .from(games)
          .where(eq(games.isDeleted, true));
        return rows.map((r) => ({
          type: "game",
          guid: r.guid!,
          name: r.name,
          detail: r.key,
          orgId: null,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const row = await tx.query.games.findFirst({
          where: and(eq(games.guid, guid), eq(games.isDeleted, true)),
        });
        if (!row) return NOT_FOUND;
        const active = await tx.query.games.findFirst({
          where: and(eq(games.key, row.key), eq(games.isDeleted, false)),
          columns: { id: true },
        });
        if (active) {
          return {
            success: false,
            message: `Another game already uses the key "${row.key}".`,
          };
        }
        await tx
          .update(games)
          .set({ isDeleted: false })
          .where(eq(games.id, row.id));
        return restored(null);
      },
    },
    announcement: {
      async list() {
        const rows = await db
          .select({
            guid: announcements.guid,
            message: announcements.message,
            isDeploy: announcements.isDeploy,
            severity: announcements.severity,
            updatedAt: announcements.updatedAt,
          })
          .from(announcements)
          .where(
            and(
              eq(announcements.isDeleted, true),
              eq(announcements.isDeploy, false),
            ),
          );
        return rows.map((r) => ({
          type: "announcement",
          guid: r.guid!,
          name: r.message,
          detail: r.severity,
          orgId: null,
          updatedAt: r.updatedAt,
        }));
      },
      async restore(tx, guid) {
        const [row] = await tx
          .update(announcements)
          .set({ isDeleted: false })
          .where(
            and(
              eq(announcements.guid, guid),
              eq(announcements.isDeleted, true),
            ),
          )
          .returning({ id: announcements.id });
        return row ? restored(null) : NOT_FOUND;
      },
    },
  };
