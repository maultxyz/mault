import {
  CHANNEL_OFFSET,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_FEEDER_CALIBRATION,
  DEFAULT_MATCHES_NEEDED,
  createDefaultBinRoutes,
  hasMaxCopiesBins,
  isRulesMode,
  presetMatchGameKeys,
  presetMatchedGameOptions,
  reservePickListBins,
  toRuleCard,
  withScanRuleFields,
  type BinConfig,
  type BinDirection,
  type BinRoute,
  type FieldMeta,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collections, feederConfigs, games, orgSettings } from "../../db/schema";
import { loadSets } from "../../routes/bins/shared";
import { loadBinContents, loadBinCounts } from "../../routes/collections/cards-query";
import { toScanRegion } from "../../routes/org-settings/shared";
import { loadSoundRules } from "../../routes/sounds/shared";
import type { PiScanBinCard, PiScanRunContext } from "../interfaces/pi-scan";
import type { ScanHostContextPayload } from "../interfaces/scan-host";
import { PiScanStartError } from "../pi-scan/errors";

function asDirection(value: string): BinDirection | null {
  if (value === "left" || value === "right" || value === "bottom") return value;
  return null;
}

async function loadFillCounts(
  tx: Transaction,
  collectionId: number,
  configs: BinConfig[],
): Promise<Pick<PiScanRunContext, "counts" | "storageBatchStarts">> {
  const windows = configs.map((bin) => ({
    binNumber: bin.binNumber,
    lastEmptiedAt: bin.lastEmptiedAt ?? null,
  }));
  const rows = windows.length === 0 ? [] : await loadBinCounts(tx, collectionId, windows);
  return {
    counts: new Map(rows.map((row) => [row.binNumber, row.count])),
    storageBatchStarts: new Map(
      rows.map((row) => [row.binNumber, row.storageBatchStarts ?? []]),
    ),
  };
}

async function loadRunContext(
  tx: Transaction,
  orgId: string,
  collectionGuid: string,
  hardwareId: string,
): Promise<PiScanRunContext> {
  const [collection] = await tx
    .select({
      id: collections.id,
      name: collections.name,
      gameId: collections.gameId,
      lang: collections.lang,
      matchAllLanguages: collections.matchAllLanguages,
      gameKey: games.key,
      gameGuid: games.guid,
      gameName: games.name,
      fieldDefinitions: games.fieldDefinitions,
      foilTypes: games.foilTypes,
      cardThickness: games.cardThickness,
    })
    .from(collections)
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(
      and(
        eq(collections.guid, collectionGuid),
        eq(collections.orgId, orgId),
        eq(collections.isDeleted, false),
      ),
    )
    .limit(1);
  if (!collection) {
    throw new PiScanStartError(
      "That collection was not found.",
      "invalid",
      400,
    );
  }
  if (collection.gameId == null || !collection.gameKey) {
    throw new PiScanStartError(
      "This collection has no game.",
      "invalid",
      400,
    );
  }

  const sets = await loadSets(tx, orgId, collection.id);
  const active = sets.data?.find(
    (item) => item.isActive && item.game?.key === collection.gameKey,
  );
  if (!active || !collection.gameGuid) {
    throw new PiScanStartError(
      "This collection's game has no active bin preset.",
      "invalid",
      400,
    );
  }
  const device = await tx.query.devices.findFirst({
    where: (table, { eq: eqCol, and: andCol }) =>
      andCol(
        eqCol(table.orgId, orgId),
        eqCol(table.hardwareId, hardwareId),
        eqCol(table.isDeleted, false),
      ),
    columns: {
      id: true,
      guid: true,
      moduleCount: true,
      channelLayout: true,
      scanCoverage: true,
      scanOffsetX: true,
      scanOffsetY: true,
      captureSettleDelayMs: true,
      checkBothOrientations: true,
      flipCamera: true,
      matchesNeeded: true,
      pipelinedFeed: true,
    },
  });
  if (!device?.guid) {
    throw new PiScanStartError(
      "This sorter is not registered yet. Connect it once from the app, then start again.",
      "invalid",
      400,
    );
  }

  const routeRows = await tx.query.binRoutes.findMany({
    where: (table, { eq: eqCol, and: andCol }) =>
      andCol(eqCol(table.deviceId, device.id), eqCol(table.isDeleted, false)),
    columns: { binNumber: true, module: true, direction: true },
  });
  const savedRoutes: BinRoute[] = [];
  for (const row of routeRows) {
    const direction = asDirection(row.direction);
    if (direction) {
      savedRoutes.push({
        binNumber: row.binNumber,
        module: row.module,
        direction,
      });
    }
  }
  const routes =
    savedRoutes.length > 0
      ? savedRoutes
      : createDefaultBinRoutes(device.moduleCount);

  const heightRows = await tx.query.binHeights.findMany({
    where: (table, { eq: eqCol, and: andCol }) =>
      andCol(eqCol(table.deviceId, device.id), eqCol(table.isDeleted, false)),
    columns: { binNumber: true, height: true },
  });
  const heights = new Map<number, number>();
  for (const row of heightRows) heights.set(row.binNumber, row.height);

  const foilTypes = (collection.foilTypes as string[] | null) ?? [];
  const matchGameKeys = presetMatchGameKeys(active);
  const matchedGames =
    matchGameKeys.length > 0
      ? await tx
          .select({ key: games.key, name: games.name })
          .from(games)
          .where(inArray(games.key, [collection.gameKey, ...matchGameKeys]))
      : [];
  const fieldDefinitions = withScanRuleFields(
    (collection.fieldDefinitions as FieldMeta[] | null) ?? [],
    foilTypes,
    collection.gameKey,
    undefined,
    presetMatchedGameOptions(active, matchedGames),
  );
  const trackContents = active.isRepackMode || hasMaxCopiesBins(active.bins);
  const windows = trackContents
    ? active.bins
        .filter((bin) => !bin.isCatchAll)
        .map((bin) => ({
          binNumber: bin.binNumber,
          lastEmptiedAt: bin.lastEmptiedAt ?? null,
        }))
    : [];
  const settings = await tx.query.orgSettings.findFirst({
    where: eq(orgSettings.orgId, orgId),
    columns: {
      ocrEnabled: true,
      highAccuracyScans: true,
      foilDetectionEnabled: true,
      foilStarDetectionEnabled: true,
    },
  });
  const feeder = await tx.query.feederConfigs.findFirst({
    where: eq(feederConfigs.deviceId, device.id),
  });
  const loaded = await loadBinContents(
    tx,
    { id: collection.id, gameKey: collection.gameKey, lang: collection.lang },
    windows,
  );
  const contents: PiScanBinCard[] = loaded.map((row) => ({
    binNumber: row.binNumber,
    scannedAt: row.scannedAt,
    card: toRuleCard(row.card, row),
  }));
  const moduleRows = await tx.query.moduleConfigs.findMany({
    where: (table, { eq, and }) =>
      and(eq(table.deviceId, device.id), eq(table.isDeleted, false)),
  });
  const moduleCalibrations = moduleRows
    .filter(
      (row) =>
        row.moduleNumber >= 1 && row.moduleNumber <= device.moduleCount,
    )
    .sort((a, b) => a.moduleNumber - b.moduleNumber)
    .map((row) => ({ moduleNumber: row.moduleNumber, calibration: row }));
  const nudgeCalibration =
    moduleCalibrations.find((module) => module.moduleNumber === 1)
      ?.calibration ?? null;
  const soundRules = await loadSoundRules(
    tx,
    orgId,
    collection.gameId,
  );
  const sourceBins = active.bins.map((bin) => ({ ...bin }));

  return {
    channelOffset:
      CHANNEL_OFFSET[
        device.channelLayout === "legacy" ? "legacy" : DEFAULT_CHANNEL_LAYOUT
      ],
    moduleCalibrations,
    feederCalibration: feeder ?? null,
    nudgeCalibration,
    soundRules,
    hardwareId,
    collectionId: collection.id,
    collectionName: collection.name,
    gameId: collection.gameId,
    gameKey: collection.gameKey,
    gameGuid: collection.gameGuid,
    gameName: collection.gameName ?? undefined,
    lang: collection.lang,
    deviceGuid: device.guid,
    moduleCount: device.moduleCount,
    pipelinedFeed: device.pipelinedFeed,
    region: toScanRegion(device),
    settleMs: device.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
    feedRetryCount:
      feeder?.feedRetryCount ?? DEFAULT_FEEDER_CALIBRATION.feedRetryCount,
    checkBothOrientations:
      device.checkBothOrientations ?? DEFAULT_CHECK_BOTH_ORIENTATIONS,
    flipCamera: device.flipCamera,
    matchesNeeded: device.matchesNeeded ?? DEFAULT_MATCHES_NEEDED,
    matchAllLanguages: collection.matchAllLanguages,
    ocrEnabled: settings?.ocrEnabled === true,
    foilDetectionEnabled: settings?.foilDetectionEnabled === true,
    highAccuracyScans: settings?.highAccuracyScans === true,
    isFoilStarDetectionEnabled: settings?.foilStarDetectionEnabled === true,
    cardThickness: collection.cardThickness,
    fieldDefinitions,
    foilTypes,
    set: active,
    configs: isRulesMode(active)
      ? reservePickListBins(sourceBins.map((bin) => ({ ...bin })))
      : sourceBins.map((bin) => ({ ...bin })),
    pickConfigs: sourceBins,
    routes,
    heights,
    counts: new Map(),
    storageBatchStarts: new Map(),
    contents,
  };
}

export async function loadScanHostContext(
  tx: Transaction,
  orgId: string,
  collectionGuid: string,
  hardwareId: string,
): Promise<ScanHostContextPayload> {
  const context = await loadRunContext(tx, orgId, collectionGuid, hardwareId);
  const { counts, storageBatchStarts } = await loadFillCounts(
    tx,
    context.collectionId,
    context.configs,
  );
  return {
    ...context,
    heights: [...context.heights],
    counts: [...counts],
    storageBatchStarts: [...storageBatchStarts],
  };
}
