import {
  SET_NAME_MAX_LENGTH,
  STORAGE_LOCATION_NAME_MAX_LENGTH,
  type DeletedItemType,
} from "@magic-vault/shared";
import { and, eq, ne } from "drizzle-orm";
import { db, type Transaction } from "../../db";
import {
  accuracyChecks,
  announcements,
  binHeights,
  binRoutes,
  binSets,
  bins,
  collections,
  devices,
  fulfilmentOrders,
  games,
  importTemplates,
  intakeLots,
  moduleConfigs,
  notificationRules,
  presetWorkflows,
  soundClips,
  shopCatalogs,
  soundRules,
  storageLocations,
} from "../../db/schema";
import { binSetNameTaken } from "../bins/shared";
import { presetWorkflowNameTaken } from "../../lib/preset-workflows";
import { collectionNameTaken } from "../collections/shared";
import { locationNameTaken } from "../storage-locations/shared";
import type {
  DeletedItemRestoreResult,
  DeletedItemRow,
  DeletedItemSource,
} from "../../lib/interfaces/deleted-items";
import { findRestorableName } from "../../lib/restored-name";
import { shopCatalogShortTarget } from "../../lib/short-links";
import { registerShortLinks } from "../../lib/shortener-client";

const NOT_FOUND: DeletedItemRestoreResult = {
  success: false,
  message: "Deleted item not found.",
};

const restored = (orgId: string | null): DeletedItemRestoreResult => ({
  success: true,
  orgId,
});

type FlagRestorableTable =
  | typeof binRoutes
  | typeof binHeights
  | typeof moduleConfigs
  | typeof soundClips
  | typeof soundRules
  | typeof notificationRules
  | typeof fulfilmentOrders
  | typeof accuracyChecks
  | typeof importTemplates;

async function deletedRows<
  Row extends { guid: string | null; updatedAt: Date; orgId?: string | null },
>(
  type: DeletedItemType,
  rows: PromiseLike<Row[]>,
  nameOf: (row: Row) => string,
  detailOf: (row: Row) => string | null = () => null,
): Promise<DeletedItemRow[]> {
  return (await rows).map((row) => ({
    type,
    guid: row.guid!,
    name: nameOf(row),
    detail: detailOf(row),
    orgId: row.orgId ?? null,
    updatedAt: row.updatedAt,
  }));
}

function restoreByFlag(
  table: FlagRestorableTable,
): DeletedItemSource["restore"] {
  return async (tx, guid) => {
    const [row] = await tx
      .update(table)
      .set({ isDeleted: false })
      .where(and(eq(table.guid, guid), eq(table.isDeleted, true)))
      .returning({ orgId: table.orgId });
    return row ? restored(row.orgId) : NOT_FOUND;
  };
}

export const DELETED_ITEM_SOURCES: Record<DeletedItemType, DeletedItemSource> =
  {
    collection: {
      list: () =>
        deletedRows(
          "collection",
          db
            .select({
              guid: collections.guid,
              name: collections.name,
              orgId: collections.orgId,
              updatedAt: collections.updatedAt,
            })
            .from(collections)
            .where(eq(collections.isDeleted, true)),
          (r) => r.name,
        ),
      async restore(tx, guid) {
        const row = await tx.query.collections.findFirst({
          where: and(
            eq(collections.guid, guid),
            eq(collections.isDeleted, true),
          ),
        });
        if (!row) return NOT_FOUND;
        const name = await findRestorableName(
          row.name,
          SET_NAME_MAX_LENGTH,
          (candidate) => collectionNameTaken(tx, row.orgId, candidate),
        );
        await tx
          .update(collections)
          .set({ isDeleted: false, name })
          .where(eq(collections.id, row.id));
        return restored(row.orgId);
      },
    },
    binSet: {
      list: () =>
        deletedRows(
          "binSet",
          db
            .select({
              guid: binSets.guid,
              name: binSets.name,
              gameName: games.name,
              orgId: binSets.orgId,
              updatedAt: binSets.updatedAt,
            })
            .from(binSets)
            .leftJoin(games, eq(games.id, binSets.gameId))
            .where(eq(binSets.isDeleted, true)),
          (r) => r.name,
          (r) => r.gameName,
        ),
      async restore(tx, guid) {
        const row = await tx.query.binSets.findFirst({
          where: and(eq(binSets.guid, guid), eq(binSets.isDeleted, true)),
        });
        if (!row) return NOT_FOUND;
        const name = await findRestorableName(
          row.name,
          SET_NAME_MAX_LENGTH,
          (candidate) => binSetNameTaken(tx, row.orgId, row.gameId, candidate),
        );
        await tx
          .update(binSets)
          .set({ isDeleted: false, name })
          .where(eq(binSets.id, row.id));
        return restored(row.orgId);
      },
    },
    presetWorkflow: {
      list: () =>
        deletedRows(
          "presetWorkflow",
          db
            .select({
              guid: presetWorkflows.guid,
              name: presetWorkflows.name,
              gameName: games.name,
              orgId: presetWorkflows.orgId,
              updatedAt: presetWorkflows.updatedAt,
            })
            .from(presetWorkflows)
            .leftJoin(games, eq(games.id, presetWorkflows.gameId))
            .where(eq(presetWorkflows.isDeleted, true)),
          (r) => r.name,
          (r) => r.gameName,
        ),
      async restore(tx, guid) {
        const row = await tx.query.presetWorkflows.findFirst({
          where: and(
            eq(presetWorkflows.guid, guid),
            eq(presetWorkflows.isDeleted, true),
          ),
        });
        if (!row) return NOT_FOUND;
        const name = await findRestorableName(
          row.name,
          SET_NAME_MAX_LENGTH,
          (candidate) =>
            presetWorkflowNameTaken(tx, row.orgId, row.gameId, candidate),
        );
        await tx
          .update(presetWorkflows)
          .set({ isDeleted: false, name })
          .where(eq(presetWorkflows.id, row.id));
        return restored(row.orgId);
      },
    },
    bin: {
      list: () =>
        deletedRows(
          "bin",
          db
            .select({
              guid: bins.guid,
              binNumber: bins.binNumber,
              setName: binSets.name,
              orgId: bins.orgId,
              updatedAt: bins.updatedAt,
            })
            .from(bins)
            .innerJoin(binSets, eq(binSets.id, bins.binSet))
            .where(eq(bins.isDeleted, true)),
          (r) => `Bin ${r.binNumber}`,
          (r) => r.setName,
        ),
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
      list: () =>
        deletedRows(
          "device",
          db
            .select({
              guid: devices.guid,
              name: devices.name,
              hardwareId: devices.hardwareId,
              orgId: devices.orgId,
              updatedAt: devices.updatedAt,
            })
            .from(devices)
            .where(eq(devices.isDeleted, true)),
          (r) => r.name,
          (r) => r.hardwareId,
        ),
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
      list: () =>
        deletedRows(
          "binRoute",
          db
            .select({
              guid: binRoutes.guid,
              binNumber: binRoutes.binNumber,
              deviceName: devices.name,
              orgId: binRoutes.orgId,
              updatedAt: binRoutes.updatedAt,
            })
            .from(binRoutes)
            .innerJoin(devices, eq(devices.id, binRoutes.deviceId))
            .where(eq(binRoutes.isDeleted, true)),
          (r) => `Bin ${r.binNumber} route`,
          (r) => r.deviceName,
        ),
      restore: restoreByFlag(binRoutes),
    },
    binHeight: {
      list: () =>
        deletedRows(
          "binHeight",
          db
            .select({
              guid: binHeights.guid,
              binNumber: binHeights.binNumber,
              deviceName: devices.name,
              orgId: binHeights.orgId,
              updatedAt: binHeights.updatedAt,
            })
            .from(binHeights)
            .innerJoin(devices, eq(devices.id, binHeights.deviceId))
            .where(eq(binHeights.isDeleted, true)),
          (r) => `Bin ${r.binNumber} height`,
          (r) => r.deviceName,
        ),
      restore: restoreByFlag(binHeights),
    },
    moduleConfig: {
      list: () =>
        deletedRows(
          "moduleConfig",
          db
            .select({
              guid: moduleConfigs.guid,
              moduleNumber: moduleConfigs.moduleNumber,
              deviceName: devices.name,
              orgId: moduleConfigs.orgId,
              updatedAt: moduleConfigs.updatedAt,
            })
            .from(moduleConfigs)
            .innerJoin(devices, eq(devices.id, moduleConfigs.deviceId))
            .where(eq(moduleConfigs.isDeleted, true)),
          (r) => `Module ${r.moduleNumber} calibration`,
          (r) => r.deviceName,
        ),
      restore: restoreByFlag(moduleConfigs),
    },
    storageLocation: {
      list: () =>
        deletedRows(
          "storageLocation",
          db
            .select({
              guid: storageLocations.guid,
              name: storageLocations.name,
              orgId: storageLocations.orgId,
              updatedAt: storageLocations.updatedAt,
            })
            .from(storageLocations)
            .where(eq(storageLocations.isDeleted, true)),
          (r) => r.name,
        ),
      async restore(tx, guid) {
        const row = await tx.query.storageLocations.findFirst({
          where: and(
            eq(storageLocations.guid, guid),
            eq(storageLocations.isDeleted, true),
          ),
        });
        if (!row) return NOT_FOUND;
        const name = await findRestorableName(
          row.name,
          STORAGE_LOCATION_NAME_MAX_LENGTH,
          (candidate) => locationNameTaken(tx, row.orgId, candidate),
        );
        await tx
          .update(storageLocations)
          .set({ isDeleted: false, name })
          .where(eq(storageLocations.id, row.id));
        return restored(row.orgId);
      },
    },
    soundClip: {
      list: () =>
        deletedRows(
          "soundClip",
          db
            .select({
              guid: soundClips.guid,
              name: soundClips.name,
              orgId: soundClips.orgId,
              updatedAt: soundClips.updatedAt,
            })
            .from(soundClips)
            .where(eq(soundClips.isDeleted, true)),
          (r) => r.name,
        ),
      restore: restoreByFlag(soundClips),
    },
    soundRule: {
      list: () =>
        deletedRows(
          "soundRule",
          db
            .select({
              guid: soundRules.guid,
              name: soundRules.name,
              gameName: games.name,
              orgId: soundRules.orgId,
              updatedAt: soundRules.updatedAt,
            })
            .from(soundRules)
            .innerJoin(games, eq(games.id, soundRules.gameId))
            .where(eq(soundRules.isDeleted, true)),
          (r) => r.name,
          (r) => r.gameName,
        ),
      restore: restoreByFlag(soundRules),
    },
    notificationRule: {
      list: () =>
        deletedRows(
          "notificationRule",
          db
            .select({
              guid: notificationRules.guid,
              name: notificationRules.name,
              gameName: games.name,
              orgId: notificationRules.orgId,
              updatedAt: notificationRules.updatedAt,
            })
            .from(notificationRules)
            .innerJoin(games, eq(games.id, notificationRules.gameId))
            .where(eq(notificationRules.isDeleted, true)),
          (r) => r.name,
          (r) => r.gameName,
        ),
      restore: restoreByFlag(notificationRules),
    },
    game: {
      list: () =>
        deletedRows(
          "game",
          db
            .select({
              guid: games.guid,
              name: games.name,
              key: games.key,
              updatedAt: games.updatedAt,
            })
            .from(games)
            .where(eq(games.isDeleted, true)),
          (r) => r.name,
          (r) => r.key,
        ),
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
      list: () =>
        deletedRows(
          "announcement",
          db
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
            ),
          (r) => r.message,
          (r) => r.severity,
        ),
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
    intakeLot: {
      list: () =>
        deletedRows(
          "intakeLot",
          db
            .select({
              guid: intakeLots.guid,
              customerName: intakeLots.customerName,
              status: intakeLots.status,
              orgId: intakeLots.orgId,
              updatedAt: intakeLots.updatedAt,
            })
            .from(intakeLots)
            .where(eq(intakeLots.isDeleted, true)),
          (r) => r.customerName,
          (r) => r.status,
        ),
      async restore(tx, guid) {
        const row = await tx.query.intakeLots.findFirst({
          where: and(eq(intakeLots.guid, guid), eq(intakeLots.isDeleted, true)),
        });
        if (!row) return NOT_FOUND;
        if (row.status === "open") {
          const openLot = await tx.query.intakeLots.findFirst({
            where: and(
              eq(intakeLots.collectionId, row.collectionId),
              eq(intakeLots.status, "open"),
              eq(intakeLots.isDeleted, false),
            ),
            columns: { id: true },
          });
          if (openLot) {
            return {
              success: false,
              message: "That collection already has an open intake lot.",
            };
          }
        }
        await tx
          .update(intakeLots)
          .set({ isDeleted: false })
          .where(eq(intakeLots.id, row.id));
        return restored(row.orgId);
      },
    },
    fulfilmentOrder: {
      list: () =>
        deletedRows(
          "fulfilmentOrder",
          db
            .select({
              guid: fulfilmentOrders.guid,
              name: fulfilmentOrders.name,
              status: fulfilmentOrders.status,
              orgId: fulfilmentOrders.orgId,
              updatedAt: fulfilmentOrders.updatedAt,
            })
            .from(fulfilmentOrders)
            .where(eq(fulfilmentOrders.isDeleted, true)),
          (r) => r.name,
          (r) => r.status,
        ),
      restore: restoreByFlag(fulfilmentOrders),
    },
    accuracyCheck: {
      list: () =>
        deletedRows(
          "accuracyCheck",
          db
            .select({
              guid: accuracyChecks.guid,
              orgId: accuracyChecks.orgId,
              sampleSize: accuracyChecks.sampleSize,
              status: accuracyChecks.status,
              updatedAt: accuracyChecks.updatedAt,
              collectionName: collections.name,
            })
            .from(accuracyChecks)
            .innerJoin(
              collections,
              eq(collections.id, accuracyChecks.collectionId),
            )
            .where(eq(accuracyChecks.isDeleted, true)),
          (r) => r.collectionName,
          (r) => `${r.sampleSize} cards, ${r.status}`,
        ),
      restore: restoreByFlag(accuracyChecks),
    },
    shopCatalog: {
      list: () =>
        deletedRows(
          "shopCatalog",
          db
            .select({
              guid: shopCatalogs.guid,
              name: shopCatalogs.name,
              orgId: shopCatalogs.orgId,
              updatedAt: shopCatalogs.updatedAt,
            })
            .from(shopCatalogs)
            .where(eq(shopCatalogs.isDeleted, true)),
          (r) => r.name,
        ),
      async restore(tx, guid) {
        const [row] = await tx
          .update(shopCatalogs)
          .set({ isDeleted: false })
          .where(
            and(eq(shopCatalogs.guid, guid), eq(shopCatalogs.isDeleted, true)),
          )
          .returning();
        if (!row) return NOT_FOUND;
        await registerShortLinks([await shopCatalogShortTarget(row)]);
        return restored(row.orgId);
      },
    },
    importTemplate: {
      list: () =>
        deletedRows(
          "importTemplate",
          db
            .select({
              guid: importTemplates.guid,
              name: importTemplates.name,
              orgId: importTemplates.orgId,
              updatedAt: importTemplates.updatedAt,
            })
            .from(importTemplates)
            .where(eq(importTemplates.isDeleted, true)),
          (r) => r.name,
        ),
      restore: restoreByFlag(importTemplates),
    },
  };
