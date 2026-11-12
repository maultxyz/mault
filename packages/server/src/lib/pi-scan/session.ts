import { updatePiScanRemovalQueue } from "./removal";
import { runPiScanCardWorkflow } from "./workflow";
import { readPiScannerControlCode } from "./control-code";
import { configurePiScanSorter } from "./configure";
import { checkPiScanFoil } from "./foil";
import { loadSoundRules } from "../../routes/sounds/shared";
import { loadCollections } from "../../routes/collections/shared";
import { PiScanPrefetch } from "./prefetch";
import { routeLoadedPiCard } from "./route-card";
import { retainPiScanUnsavedCards, waitForPiScanResume } from "./recovery";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  runScanDisposition,
  prepareMatchedScanPlan,
  prepareUnmatchedScanPlan,
  scanCompletionPauseReason,
  selectScanSound,
  createScanRemovalEntry,
  scanRemovalCandidateCardIds,
  resolveRemovalBinNumber,
  findScannerControlCommandProblem,
  parseFoilNudgeFirmwareLimits,
  type ScannerControlCommand,
  type PiScanRemovalAction,
  type ScanRoutingDecision,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CARD_CONDITION,
  toCardCondition,
  DEFAULT_FEEDER_CALIBRATION,
  feedWithRetries,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEWARP_OUTPUT_SIZE,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  OCR_REGIONS_BY_GAME_KEY,
  detectCardStampRgba,
  detectedStampOf,
  contourHomography,
  scanPrintingMarkGrids,
  detectPrintedFoilMarkerRgba,
  PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY,
  dewarpRgba,
  getDefaultCardContour,
  rotateRgba180,
  scanBinCapacity,
  CHANNEL_OFFSET,
  DEFAULT_CHANNEL_LAYOUT,
  applyAutoAssignTarget,
  type ScanRoutingContext,
  createDefaultBinRoutes,
  hasMaxCopiesBins,
  isRulesMode,
  reservePickListBins,
  toRuleCard,
  withScanRuleFields,
  isCardFromOtherGame,
  presetMatchGameKeys,
  presetMatchedGameOptions,
  type CornerDetection,
  type BinConfig,
  type BinDirection,
  type BinRoute,
  type CardSearchDiagnostics,
  type FieldMeta,
  type MatchedScanDiagnostics,
  type ScanDetectionDiagnostics,
  type PiScanSessionStartBody,
  type PiScanSessionStartCode,
  type PiScanSessionState,
  type PlayingCardWithDistance,
  type ScanAttemptDiagnostic,
  type UnmatchedReason,
  type UnmatchedScanDiagnostics,
  type CardContour,
  type RgbaImage,
  type ScanOrientation,
} from "@magic-vault/shared";
import { authQuery, type Transaction } from "../../db";
import { activateScanCollection, activateScanPreset } from "../scan-targets";
import { emitToOrg } from "../session-stream";
import { piUpdateRunning } from "../pi-update";
import {
  collections,
  feederConfigs,
  games,
  orgSettings,
} from "../../db/schema";
import type {
  PiScanBinCard,
  PiScanFrameMatch,
  PiScanLive,
  PiScanRunContext,
  PiScanStartInput,
  PiScanStartResult,
} from "../interfaces/pi-scan";
import {
  PI_SCAN_FEED_TIMEOUT_MS,
  PI_SCAN_NEUTRAL_TIMEOUT_MS,
  PI_SCAN_PORT_DRAIN_MS,
  PI_SCAN_POLL_MS,
  PI_SCAN_STATUS_TIMEOUT_MS,
} from "../constants/pi-scan";
import { acquireHostScanLock, releaseHostScanLock } from "../scan-lock";
import { getUserDisplayName } from "../../middleware/auth";
import {
  detectScanCorners,
  readScanImage,
  rgbaToJpeg,
} from "../straighten-scan";
import { vectorizeCardImage } from "../vectorize";
import {
  claimSorterPort,
  releaseSorterPort,
  SorterPortError,
} from "../pi-serial-port";
import {
  attachMatchedCards,
  findCardMatches,
  findCardMatchesByOcr,
} from "../../routes/card/shared";
import {
  loadBinContents,
  loadBinCounts,
} from "../../routes/collections/cards-query";
import { toScanRegion } from "../../routes/org-settings/shared";
import { loadSets } from "../../routes/bins/shared";
import {
  findBestMatchAcrossGames,
  matchScopesForGames,
  tagWithGame,
} from "../card-search/match-games";
import type { CollectionMatchScope } from "../interfaces/card-search";
import { grabSettledCameraFrame } from "./camera";
import {
  resolveCardSearchMatches,
  identifyScanImage,
  identifyScanWithConsensus,
  consensusMissReason,
  readsPrintedLanguageEveryScan,
  scanOcrMode,
  routeForBin,
} from "@magic-vault/shared";
import {
  recordPickFound,
  saveBinThroughRoute,
  saveThroughCollectionRoute,
  recoverSessionScanSaves,
  loadRemovalCopiesThroughRoute,
  removeQueuedCardsThroughRoute,
  withScanActorTransaction,
  PiScanActionError,
} from "./existing-routes";
import { SorterLink } from "./sorter-link";

const sessions = new Map<string, PiScanLive>();

export class PiScanStartError extends Error {
  constructor(
    message: string,
    readonly code: PiScanSessionStartCode,
    readonly status: 400 | 409 = 409,
  ) {
    super(message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function publicState(session: PiScanLive | undefined): PiScanSessionState {
  if (!session || session.phase === "idle") {
    return {
      phase: "idle",
      collectionGuid: null,
      message: null,
      cardsScanned: 0,
      stopping: false,
      activity: null,
      current: null,
      lastCard: null,
      startedAt: null,
      pausedMs: 0,
      pausedAt: null,
      autoFeed: true,
    };
  }
  return {
    phase: session.phase,
    collectionGuid: session.collectionGuid,
    message: session.message,
    cardsScanned: session.cardsScanned,
    stopping:
      session.stopRequested &&
      (session.phase === "running" || session.phase === "paused"),
    activity: session.activity,
    current: session.current,
    lastCard: session.lastCard,
    startedAt:
      session.startedAt > 0 ? new Date(session.startedAt).toISOString() : null,
    pausedMs: session.pausedMs,
    pausedAt:
      session.pauseStartedAt != null
        ? new Date(session.pauseStartedAt).toISOString()
        : null,
    autoFeed: session.autoFeed,
    allowDuplicates: session.allowDuplicates,
    removalEnabled: session.removalEnabled,
    removalBinNumber: session.removalBinNumber,
    removalEntries: session.removalEntries,
    removalBusy: session.removalBusy,
    soundEvents: session.soundEvents.filter(
      (event) => event.at > Date.now() - 10_000,
    ),
    condition: session.condition,
    foilType: session.foilType,
    preferredSetCodes: [...session.preferredSetCodes],
  };
}

function cleanSetCodes(setCodes: unknown): string[] {
  if (!Array.isArray(setCodes)) return [];
  return [
    ...new Set(
      setCodes.flatMap((code) =>
        typeof code === "string" && code.trim() ? [code.trim()] : [],
      ),
    ),
  ];
}

function holdClock(session: PiScanLive) {
  if (session.pauseStartedAt != null) return;
  session.pauseStartedAt = Date.now();
}

function releaseClock(session: PiScanLive) {
  if (session.pauseStartedAt == null) return;
  session.pausedMs += Date.now() - session.pauseStartedAt;
  session.pauseStartedAt = null;
}

export function getPiScanSession(orgId: string): PiScanSessionState {
  return publicState(sessions.get(orgId));
}

function jpegDataUrl(buffer: Buffer): string {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function asDirection(value: string): BinDirection | null {
  if (value === "left" || value === "right" || value === "bottom") return value;
  return null;
}

function lineError(line: Record<string, unknown>): string | null {
  return typeof line.error === "string" && line.error.length > 0
    ? line.error
    : null;
}

function takeJam(link: SorterLink): number | null {
  const module = link.jamModule;
  link.jamModule = null;
  return module;
}

function withoutEmbedding(
  diagnostics: CardSearchDiagnostics,
): Omit<CardSearchDiagnostics, "embedding"> {
  const { embedding: _embedding, ...search } = diagnostics;
  return search;
}

async function loadFillCounts(
  jwtClaims: string,
  collectionId: number,
  configs: BinConfig[],
  transaction?: Transaction,
): Promise<Map<number, number>> {
  const windows = configs.map((bin) => ({
    binNumber: bin.binNumber,
    lastEmptiedAt: bin.lastEmptiedAt ?? null,
  }));
  if (windows.length === 0) return new Map();
  const load = (tx: Transaction) => loadBinCounts(tx, collectionId, windows);
  const rows = await (transaction
    ? load(transaction)
    : authQuery(jwtClaims, load));
  return new Map(rows.map((row) => [row.binNumber, row.count]));
}

async function prepareContext(
  session: PiScanLive,
  hardwareId: string,
  transaction?: Transaction,
  collectionGuid = session.collectionGuid,
): Promise<PiScanRunContext> {
  const load = async (tx: Transaction): Promise<PiScanRunContext> => {
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
          eq(collections.orgId, session.orgId),
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

    const sets = await loadSets(tx, session.orgId);
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
          eqCol(table.orgId, session.orgId),
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

    const foilTypes =
      (collection.foilTypes as string[] | null) ?? active.game?.foilTypes ?? [];
    const matchGameKeys = presetMatchGameKeys(active);
    const matchedGames =
      matchGameKeys.length > 0
        ? await tx
            .select({ key: games.key, name: games.name })
            .from(games)
            .where(inArray(games.key, [collection.gameKey, ...matchGameKeys]))
        : [];
    const fieldDefinitions = withScanRuleFields(
      (collection.fieldDefinitions as FieldMeta[] | null) ??
        active.game?.fieldDefinitions ??
        [],
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
      where: eq(orgSettings.orgId, session.orgId),
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
      session.orgId,
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
      contents,
    };
  };
  return transaction ? load(transaction) : authQuery(session.jwtClaims, load);
}

async function rememberAutoAssign(
  session: PiScanLive,
  context: PiScanRunContext,
  binNumber: number,
  rules: BinConfig["rules"],
) {
  const target = context.configs.find((bin) => bin.binNumber === binNumber);
  if (!target) return;
  target.rules = rules;
  context.pickConfigs = applyAutoAssignTarget(context.pickConfigs, {
    binNumber,
    rules,
  });
  try {
    const saved = await saveBinThroughRoute(
      { userId: session.userId, orgId: session.orgId },
      context.gameGuid,
      target,
    );
    if (!saved) {
      console.error("[pi-scan] failed to save an auto-assign rule");
    }
  } catch (err) {
    console.error("[pi-scan] failed to save an auto-assign rule:", err);
  }
}

function piMatchScopes(context: PiScanRunContext): CollectionMatchScope[] {
  return matchScopesForGames(
    {
      gameKey: context.gameKey,
      lang: context.lang,
      matchAllLanguages: context.matchAllLanguages,
    },
    presetMatchGameKeys(context.set),
  );
}

function piScopeForMatchedGame(
  context: PiScanRunContext,
  gameKey: string | undefined,
): CollectionMatchScope {
  const scopes = piMatchScopes(context);
  return scopes.find((scope) => scope.gameKey === gameKey) ?? scopes[0];
}

async function searchOrientation(
  session: PiScanLive,
  context: PiScanRunContext,
  image: Buffer,
  orientation: "upright" | "rotated",
  markSource: { source: RgbaImage; contour: CardContour } | null,
) {
  const embeddings = await vectorizeCardImage(image);
  const printingMarkGrids = markSource
    ? scanPrintingMarkGrids(
        markSource.source,
        contourHomography(markSource.contour),
        context.gameKey,
        orientation,
      )
    : null;
  const scopes = piMatchScopes(context);
  const { result: nearest, scope } = await findBestMatchAcrossGames(
    scopes,
    (matchScope) =>
      findCardMatches({
        ...matchScope,
        embeddings,
        preferredSetCodes: session.preferredSetCodes,
        skipsUnloadedIndex: matchScope.gameKey !== context.gameKey,
        printingMarkGrids:
          matchScope.gameKey === context.gameKey ? printingMarkGrids : null,
      }),
  );
  const attached = await attachMatchedCards(nearest, scope.gameKey, scope.lang);
  const result =
    scopes.length > 1 ? tagWithGame(attached, scope.gameKey) : attached;
  return {
    image,
    orientation,
    result,
    embedding: embeddings.embedding,
  };
}

async function matchFrame(
  session: PiScanLive,
  context: PiScanRunContext,
  frame: Buffer,
): Promise<PiScanFrameMatch> {
  const read = await readScanImage(frame);
  const source = context.flipCamera ? rotateRgba180(read) : read;
  let corners: CornerDetection;
  let detectorError: string | null = null;
  try {
    corners = await detectScanCorners(source);
  } catch (error) {
    detectorError = `card detection failed: ${error instanceof Error ? error.message : String(error)}`;
    corners = {
      cardPresent: false,
      confidence: 0,
      sharpness: null,
      contour: null,
    };
    console.error("[pi-scan] using fallback scan region:", error);
  }
  const contour =
    corners.contour ??
    getDefaultCardContour(source.width, source.height, context.region);
  const upright = dewarpRgba(source, contour, DEWARP_OUTPUT_SIZE);
  const uprightImage = await rgbaToJpeg(upright);
  const detection: ScanDetectionDiagnostics = {
    cardDetected: corners.cardPresent,
    sharpness: corners.sharpness,
    confidence: corners.confidence,
    fallbackReason:
      detectorError ??
      (corners.contour
        ? null
        : `card not detected (cardPresent=${corners.cardPresent}, sharpness=${corners.sharpness ?? "n/a"})`),
  };

  const markSource = corners.contour
    ? { source, contour: corners.contour }
    : null;
  const identified = await identifyScanImage<
    Awaited<ReturnType<typeof searchOrientation>>
  >({
    checkBothOrientations: context.checkBothOrientations,
    ocrMode: (candidate) => {
      const scope = piScopeForMatchedGame(
        context,
        candidate.result.data?.[0]?.gameKey,
      );
      return scanOcrMode(
        context,
        !!corners.contour &&
          (OCR_REGIONS_BY_GAME_KEY[scope.gameKey]?.length ?? 0) > 0,
        readsPrintedLanguageEveryScan(scope, scope.gameKey),
      );
    },
    search: async (orientation) =>
      searchOrientation(
        session,
        context,
        orientation === "rotated"
          ? await rgbaToJpeg(rotateRgba180(upright))
          : uprightImage,
        orientation,
        markSource,
      ),
    readText: async (candidate) => {
      if (!corners.contour || !candidate.embedding) return null;
      const scope = piScopeForMatchedGame(
        context,
        candidate.result.data?.[0]?.gameKey,
      );
      const regions = OCR_REGIONS_BY_GAME_KEY[scope.gameKey] ?? [];
      if (!regions.length) return null;
      try {
        const result = await findCardMatchesByOcr(
          await rgbaToJpeg(
            orientedOcrCrop(source, corners.contour, candidate.orientation),
          ),
          regions,
          {
            ...scope,
            embeddings: { embedding: candidate.embedding },
            preferredSetCodes: session.preferredSetCodes,
          },
        );
        const attached = await attachMatchedCards(
          result,
          scope.gameKey,
          scope.lang,
        );
        return {
          ...candidate,
          result:
            piMatchScopes(context).length > 1
              ? tagWithGame(attached, scope.gameKey)
              : attached,
          ocr: result.ocr ?? null,
        };
      } catch (error) {
        console.error("[pi-scan] text search failed:", error);
        return null;
      }
    },
  });
  const best = identified.pick;
  const {
    ocr,
    matchedBy,
    lowConfidenceMatch: lowConfidenceFromOcr,
  } = identified;
  const resolved = await resolveCardSearchMatches(
    best.result,
    async () => null,
  );

  const stampDetection =
    corners.contour && resolved.card?.stamps?.length
      ? detectCardStampRgba(
          best.orientation === "rotated" ? rotateRgba180(upright) : upright,
          resolved.card,
        )
      : null;

  const markerGameKey = piScopeForMatchedGame(
    context,
    best.result.data?.[0]?.gameKey,
  ).gameKey;
  const printedFoilMarker =
    corners.contour && PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY[markerGameKey]
      ? detectPrintedFoilMarkerRgba(
          orientedOcrCrop(source, corners.contour, best.orientation),
          markerGameKey,
        )
      : null;

  return {
    ...best,
    resolved,
    ocr,
    matchedBy,
    lowConfidenceFromOcr,
    detection,
    stampDetection,
    printedFoilMarker,
    foilDetection: null,
  };
}

function orientedOcrCrop(
  source: RgbaImage,
  contour: CardContour,
  orientation: ScanOrientation,
): RgbaImage {
  const crop = dewarpRgba(source, contour, OCR_CROP_WIDTH, OCR_CROP_HEIGHT);
  return orientation === "rotated" ? rotateRgba180(crop) : crop;
}

function attemptDiagnostic(matched: PiScanFrameMatch): ScanAttemptDiagnostic {
  const card = matched.resolved.card;
  return {
    reason: matched.resolved.noMatchReason,
    cardId: card?.id ?? null,
    cardName: card?.name ?? null,
    distance: card?.distance ?? matched.result.nearestDistance ?? null,
  };
}

function unmatchedReason(
  matched: PiScanFrameMatch,
  attempts: ScanAttemptDiagnostic[],
): UnmatchedReason {
  return consensusMissReason(
    attempts.some((attempt) => attempt.cardId),
    matched.resolved.noMatchReason,
  );
}

async function matchUntilConsensus(
  session: PiScanLive,
  context: PiScanRunContext,
  firstFrame?: Buffer,
): Promise<{
  matched: PiScanFrameMatch;
  attempts: ScanAttemptDiagnostic[];
  card: PlayingCardWithDistance | null;
}> {
  let initial = firstFrame;
  const outcome = await identifyScanWithConsensus(
    async () => {
      const frame = initial ?? (await grabSettledCameraFrame());
      initial = undefined;
      return matchFrame(session, context, frame);
    },
    (attempt) => attempt.resolved.card,
    context.matchesNeeded,
  );
  return {
    matched: outcome.attempt,
    attempts: outcome.attempts.map(attemptDiagnostic),
    card: outcome.card,
  };
}

function fail(session: PiScanLive, message: string) {
  console.error(
    `[pi-scan] failed while ${session.activity ?? "scanning"}: ${message}`,
  );
  session.phase = "error";
  session.message = message;
  session.stopRequested = true;
  session.activity = null;
  session.current = null;
  holdClock(session);
}

function stopClean(session: PiScanLive, message: string | null) {
  session.phase = "stopped";
  session.message = message;
  session.stopRequested = true;
  session.activity = null;
  session.current = null;
  holdClock(session);
  if (message) console.log(`[pi-scan] ${message}`);
}

function showCard(
  session: PiScanLive,
  name: string | null,
  binNumber: number,
  matched: boolean,
) {
  session.activity = "routing";
  session.current = { name, binNumber, matched };
}

function saveOptions(session: PiScanLive) {
  return { userId: session.userId, stopping: () => session.stopRequested };
}

function savedCard(session: PiScanLive, hasPending = false) {
  session.cardInFlight = hasPending;
  if (session.current) session.lastCard = session.current;
  session.current = null;
  session.activity = null;
}

async function waitForResume(session: PiScanLive): Promise<boolean> {
  return waitForPiScanResume(session, async (context) => {
    const fresh = await prepareContext(session, context.hardwareId);
    session.configurationVersion += 1;
    fresh.counts = await loadFillCounts(
      session.jwtClaims,
      fresh.collectionId,
      fresh.configs,
    );
    return fresh;
  });
}

function holdCard(session: PiScanLive, message: string) {
  pausePiScanSession(session.orgId);
  session.message = message;
}

function routingContext(context: PiScanRunContext): ScanRoutingContext {
  const capacity = (binNumber: number) =>
    scanBinCapacity(
      context.heights.get(binNumber),
      context.cardThickness,
      context.set,
      context.configs.find((bin) => bin.binNumber === binNumber) ?? {
        isCatchAll: false,
      },
    );
  return {
    binSet: context.set,
    configs: context.pickConfigs,
    fieldDefinitions: context.fieldDefinitions,
    binContents: context.contents.filter((entry) => !entry.capacityOnly),
    countCardsInBin: (bin) => context.counts.get(bin) ?? 0,
    isBinFull: (bin) =>
      capacity(bin) != null && (context.counts.get(bin) ?? 0) >= capacity(bin)!,
    binRoom: (bin) =>
      capacity(bin) == null
        ? Number.POSITIVE_INFINITY
        : capacity(bin)! - (context.counts.get(bin) ?? 0),
    createRuleId: randomUUID,
  };
}

function routingPauseMessage(decision: ScanRoutingDecision): string {
  if (decision.action !== "pause") return "";
  if (decision.reason === "bin-full")
    return `Bin ${decision.bin!.binNumber} is full. Empty it, then resume.`;
  if (decision.reason === "all-chaos-bins-full")
    return "Every bin is full. Empty one, then resume.";
  return "Every pack is complete. Empty the completed packs, then resume.";
}

async function processMatched(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  identified: Awaited<ReturnType<typeof matchUntilConsensus>>,
  pipeline: Parameters<typeof routeLoadedPiCard>[2],
  prefetch: PiScanPrefetch<Buffer>,
) {
  const card = identified.card;
  if (!card) return;
  const matched = identified.matched;
  const scanId = randomUUID();
  const scannedAt = Date.now();
  const diagnostics: MatchedScanDiagnostics = {
    matchedBy: matched.matchedBy,
    vectorizedOn: "server",
    detection: matched.detection,
    orientation: matched.orientation,
    matchesNeeded: context.matchesNeeded,
    attempts: identified.attempts,
    candidates: matched.resolved.candidates,
    ocr: matched.ocr,
    stampDetection: matched.stampDetection,
    printedFoilMarker: matched.printedFoilMarker,
    printingMarks: matched.result.printingMarks ?? null,
    foilDetection: matched.foilDetection,
  };
  session.lastCardId = card.id;
  await runScanDisposition({
    prepare: () =>
      prepareMatchedScanPlan(
        {
          scanId,
          scannedAt,
          card,
          capturedImageUrl: jpegDataUrl(matched.image),
          alternativeMatches: matched.resolved.alternativeMatches,
          condition: session.condition,
          sessionFoilType: session.foilType,
          foilDetection: matched.foilDetection,
          fallbackFoilTypes: context.foilTypes,
          gameKey: context.gameKey,
          isNudgeFoilDetectionEnabled: context.foilDetectionEnabled,
          isFoilStarDetectionEnabled: context.isFoilStarDetectionEnabled,
          lowConfidenceMatch: matched.lowConfidenceFromOcr,
          diagnostics,
          vectorizedOn: "server",
          deviceGuid: context.deviceGuid,
        },
        routingContext(context),
      ),
    hold: async (decision) => {
      holdCard(session, routingPauseMessage(decision));
      return waitForResume(session);
    },
    assign: async (decision) => {
      if (decision.action === "route" && decision.autoAssignTarget) {
        await rememberAutoAssign(
          session,
          context,
          decision.autoAssignTarget.binNumber,
          decision.autoAssignTarget.rules,
        );
      }
    },
    pick: () => {},
    route: async (decision) => {
      if (!decision.bin) throw new Error("No bin matched this card.");
      showCard(session, card.name, decision.bin.binNumber, true);
      await routeLoadedPiCard(
        link,
        routeForBin(decision.bin.binNumber, context.routes),
        pipeline,
      );
    },
    persist: async (decision) => {
      if (decision.action !== "route" || !decision.bin) return;
      const saved = await saveThroughCollectionRoute(
        session.orgId,
        session.collectionGuid,
        decision.persistence.kind,
        { ...decision.persistence.record, deviceGuid: context.deviceGuid },
        saveOptions(session),
      );
      if (!saved.success) throw new Error(saved.message);
      const update = decision.pickListUpdate;
      if (update) {
        const pickList = await recordPickFound(
          { userId: session.userId, orgId: session.orgId },
          update.binGuid,
          update.name,
          update.delta,
        );
        if (!pickList) throw new Error("The pick list could not be updated.");
        const listed = context.pickConfigs.find(
          (bin) => bin.guid === update.binGuid,
        );
        if (listed) listed.pickList = pickList;
      }
    },
    complete: async (decision) => {
      const binNumber = decision.bin!.binNumber;
      savedCard(session, prefetch.hasPending);
      context.counts.set(binNumber, (context.counts.get(binNumber) ?? 0) + 1);
      if (decision.binContent) context.contents.push(decision.binContent);
      session.cardsScanned += 1;
      const clipGuid = selectScanSound(
        decision.ruleCard,
        context.soundRules,
        context.fieldDefinitions,
      );
      if (clipGuid)
        session.soundEvents = [
          ...session.soundEvents.filter(
            (event) => event.at > Date.now() - 10_000,
          ),
          { id: scanId, clipGuid, at: Date.now() },
        ].slice(-20);
      while (scanCompletionPauseReason(decision, routingContext(context))) {
        holdCard(
          session,
          "Every pack is complete. Empty the completed packs, then resume.",
        );
        if (!(await waitForResume(session))) break;
      }
    },
    checkpoint: () => waitForResume(session),
    revision: () => session.configurationVersion,
  });
}

async function processUnmatched(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  identified: Awaited<ReturnType<typeof matchUntilConsensus>>,
  pipeline: Parameters<typeof routeLoadedPiCard>[2],
  prefetch: PiScanPrefetch<Buffer>,
) {
  session.lastCardId = null;
  const matched = identified.matched;
  const scanId = randomUUID();
  const scannedAt = Date.now();
  await runScanDisposition({
    prepare: () => {
      const plan = prepareUnmatchedScanPlan(
        {
          scanId,
          scannedAt,
          capturedImageUrl: jpegDataUrl(matched.image),
          vectorizedOn: "server",
          embedding: matched.embedding,
          diagnostics: {
            reason: unmatchedReason(matched, identified.attempts),
            search: matched.result.diagnostics
              ? withoutEmbedding(matched.result.diagnostics)
              : null,
            detection: matched.detection,
            orientation: matched.orientation,
            matchesNeeded: context.matchesNeeded,
            attempts: identified.attempts,
          },
        },
        routingContext(context),
      );
      if (!plan.bin)
        throw new Error(
          "No card matched, and this preset has no catch-all bin.",
        );
      return plan;
    },
    hold: async (decision) => {
      holdCard(session, routingPauseMessage(decision));
      return waitForResume(session);
    },
    assign: () => {},
    pick: () => {},
    route: async (decision) => {
      showCard(session, null, decision.bin!.binNumber, false);
      await routeLoadedPiCard(
        link,
        routeForBin(decision.bin!.binNumber, context.routes),
        pipeline,
      );
    },
    persist: async (decision) => {
      if (decision.persistence.kind === "none") return;
      const saved = await saveThroughCollectionRoute(
        session.orgId,
        session.collectionGuid,
        decision.persistence.kind,
        { ...decision.persistence.record, deviceGuid: context.deviceGuid },
        saveOptions(session),
      );
      if (!saved.success) throw new Error(saved.message);
    },
    complete: (decision) => {
      const bin = decision.bin!.binNumber;
      context.counts.set(bin, (context.counts.get(bin) ?? 0) + 1);
      if (decision.binContent) context.contents.push(decision.binContent);
      savedCard(session, prefetch.hasPending);
      session.cardsScanned += 1;
    },
    checkpoint: () => waitForResume(session),
    revision: () => session.configurationVersion,
  });
}

async function routeUnsavedCard(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  binNumber: () => number | null,
) {
  while (!session.stopRequested) {
    if (!(await waitForResume(session))) return;
    const bin = binNumber();
    if (bin == null) throw new Error("This preset has no bin for this card.");
    if (routingContext(context).isBinFull(bin)) {
      holdCard(session, `Bin ${bin} is full. Empty it, then resume.`);
      if (!(await waitForResume(session))) return;
      continue;
    }
    showCard(session, null, bin, false);
    await routeLoadedPiCard(link, routeForBin(bin, context.routes));
    context.counts.set(bin, (context.counts.get(bin) ?? 0) + 1);
    context.contents.push({
      binNumber: bin,
      scannedAt: Date.now(),
      card: {},
      unsaved: true,
      capacityOnly: true,
    });
    savedCard(session);
    return;
  }
}

async function processRemoval(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  card: PlayingCardWithDistance | null,
  alternatives: PlayingCardWithDistance[],
) {
  session.lastCardId = null;
  while (session.removalBusy && !session.stopRequested)
    await sleep(PI_SCAN_POLL_MS);
  if (!(await waitForResume(session))) return;
  session.removalBusy = true;
  try {
    let queued = false;
    if (card) {
      try {
        const copies = await loadRemovalCopiesThroughRoute(
          { userId: session.userId, orgId: session.orgId },
          session.collectionGuid,
          scanRemovalCandidateCardIds(card, alternatives),
        );
        if (!(await waitForResume(session))) return;
        const entry = createScanRemovalEntry({
          entryId: randomUUID(),
          matchedCard: card,
          copies,
          existingEntries: session.removalEntries,
        });
        session.removalEntries = [entry, ...session.removalEntries];
        queued = entry.selectedScanId != null;
      } catch (error) {
        if (
          error instanceof PiScanActionError &&
          [401, 402, 403].includes(error.status)
        )
          throw error;
        session.message =
          error instanceof Error ? error.message : "Removal lookup failed.";
      }
    }
    await routeUnsavedCard(session, context, link, () =>
      resolveRemovalBinNumber(
        context.configs,
        queued ? session.removalBinNumber : null,
      ),
    );
  } finally {
    session.removalBusy = false;
  }
}

async function applyControlCard(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  command: ScannerControlCommand | null,
) {
  while (session.removalBusy && !session.stopRequested)
    await sleep(PI_SCAN_POLL_MS);
  if (!(await waitForResume(session))) return;
  session.removalBusy = true;
  try {
    await applyControlCardWhenIdle(session, context, link, command);
  } finally {
    session.removalBusy = false;
  }
}

async function applyControlCardWhenIdle(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  command: ScannerControlCommand | null,
) {
  session.lastCardId = null;
  const targets = await withScanActorTransaction(
    { userId: session.userId, orgId: session.orgId },
    async (tx) => ({
      collections: (await loadCollections(tx, session.orgId)).data ?? [],
      presets: (await loadSets(tx, session.orgId)).data ?? [],
      activeCollectionGuid: session.collectionGuid,
    }),
  );
  const problem = command
    ? findScannerControlCommandProblem(command, targets)
    : "unreadable";
  await routeUnsavedCard(session, context, link, () =>
    resolveRemovalBinNumber(context.configs, null),
  );
  if (session.stopRequested) return;
  if (!command || problem) {
    holdCard(session, `Control card rejected: ${problem ?? "unreadable"}.`);
    return;
  }
  const actor = { userId: session.userId, orgId: session.orgId };
  const oldCollection = session.collectionGuid;
  const nextCollection = command.collectionGuid ?? oldCollection;
  const switching = nextCollection !== oldCollection;
  let acquired = false;
  try {
    if (switching) {
      const recovered = await recoverSessionScanSaves(
        session.orgId,
        saveOptions(session),
      );
      if (!recovered.success) throw new Error(recovered.message);
      const lock = acquireHostScanLock(
        nextCollection,
        session.userId,
        session.orgId,
        await getUserDisplayName(session.userId),
      );
      if (!lock.ok)
        throw new Error("The target collection is locked by another scanner.");
      acquired = true;
    }
    const fresh = await withScanActorTransaction(actor, async (tx) => {
      if (
        command.presetGuid &&
        !(await activateScanPreset(tx, session.orgId, command.presetGuid))
      )
        throw new Error("Preset not found.");
      if (
        switching &&
        !(await activateScanCollection(tx, session.orgId, nextCollection))
      )
        throw new Error("Collection not found.");
      const loaded = await prepareContext(
        session,
        context.hardwareId,
        tx,
        nextCollection,
      );
      loaded.counts = await loadFillCounts(
        session.jwtClaims,
        loaded.collectionId,
        loaded.configs,
        tx,
      );
      return loaded;
    });
    retainPiScanUnsavedCards(context, fresh);
    if (switching)
      for (const entry of fresh.contents)
        if (entry.unsaved) entry.capacityOnly = true;
    session.collectionGuid = nextCollection;
    if (switching)
      emitToOrg(session.orgId, "collections_changed", { guid: nextCollection });
    if (switching) {
      releaseHostScanLock(oldCollection, session.userId);
      session.removalEntries = [];
      session.foilType = null;
      session.preferredSetCodes = [];
    }
    Object.assign(context, fresh);
    if (command.condition) session.condition = command.condition;
    if (command.forcedFoilType !== undefined)
      session.foilType = command.forcedFoilType;
    if (command.forcedSetCode !== undefined)
      session.preferredSetCodes = command.forcedSetCode
        ? [command.forcedSetCode]
        : [];
    if (command.autoFeed !== undefined) session.autoFeed = command.autoFeed;
    if (command.allowDuplicates !== undefined)
      session.allowDuplicates = command.allowDuplicates;
    if (command.pauseScanner) holdCard(session, "Paused by a control card.");
  } catch (error) {
    session.collectionGuid = oldCollection;
    if (acquired) releaseHostScanLock(nextCollection, session.userId);
    holdCard(
      session,
      error instanceof Error
        ? error.message
        : "The control card could not be applied.",
    );
  }
}

export async function updatePiScanRemoval(
  orgId: string,
  userId: string,
  action: PiScanRemovalAction,
): Promise<PiScanSessionState | null> {
  const session = sessions.get(orgId);
  if (!session) return null;
  const updated = await updatePiScanRemovalQueue(session, action, (scanIds) =>
    removeQueuedCardsThroughRoute(
      { userId, orgId },
      session.collectionGuid,
      scanIds,
    ),
  );
  return updated ? publicState(session) : null;
}

async function runLoop(session: PiScanLive, link: SorterLink) {
  const context = session.context;
  if (!context) return;
  console.log(
    `[pi-scan] started collection ${session.collectionGuid} on ${context.deviceGuid}`,
  );
  session.startedAt = Date.now();
  const prefetch = new PiScanPrefetch(async () => {
    await sleep(context.settleMs);
    if (
      session.stopRequested ||
      session.pauseRequested ||
      link.jamModule != null
    ) {
      return null;
    }
    return grabSettledCameraFrame();
  });
  const pipeline = {
    enabled: () =>
      context.pipelinedFeed &&
      session.autoFeed &&
      !session.pauseRequested &&
      !session.stopRequested &&
      !context.set.isRepackMode &&
      !session.removalEnabled,
    onFed: prefetch.offer,
  };
  try {
    while (!session.stopRequested) {
      if (session.pauseRequested || session.refreshRequested)
        prefetch.invalidate();
      if (!(await waitForResume(session))) break;
      while (
        !session.autoFeed &&
        !session.feedRequested &&
        !prefetch.hasPending &&
        !session.stopRequested &&
        !session.pauseRequested
      ) {
        session.phase = "running";
        session.activity = null;
        session.current = null;
        await sleep(PI_SCAN_POLL_MS);
      }
      if (session.pauseRequested || session.stopRequested) continue;
      session.feedRequested = false;
      session.phase = "running";
      session.cardInFlight = true;
      session.activity = "feeding";
      session.current = null;

      const jammed = takeJam(link);
      if (jammed != null) {
        fail(session, `Jam at module ${jammed}.`);
        break;
      }

      console.log(`[pi-scan] feeding card ${session.cardsScanned + 1}`);
      const prefetched = await prefetch.take();
      if (prefetched && (session.pauseRequested || session.refreshRequested)) {
        prefetched.identified = null;
      }
      let bufferedFeed = prefetched?.feed;
      const fed = await feedWithRetries(
        async () => {
          if (!(await waitForResume(session))) {
            throw new Error("Feeding interrupted.");
          }
          if (bufferedFeed) {
            const reply = bufferedFeed;
            bufferedFeed = undefined;
            return reply;
          }
          return link.command({ feeder: true }, PI_SCAN_FEED_TIMEOUT_MS);
        },
        (reply) => reply,
        context.feedRetryCount,
      );
      const fedError = lineError(fed);
      if (fedError) {
        const empty = fed.empty === true || fedError.startsWith("empty");
        if (empty) stopClean(session, "The hopper is empty.");
        else fail(session, fedError);
        break;
      }
      if (fed.detected !== true) {
        if (fed.empty === true) stopClean(session, "The hopper is empty.");
        else fail(session, "The feeder did not deliver a card to module 1.");
        break;
      }
      session.activity = "matching";
      if (!prefetched?.identified) await sleep(context.settleMs);
      const jammedAfterFeed = takeJam(link);
      if (jammedAfterFeed != null) {
        fail(session, `Jam at module ${jammedAfterFeed}.`);
        break;
      }

      await runPiScanCardWorkflow(session, {
        capture: async () => prefetched?.identified ?? grabSettledCameraFrame(),
        readControl: readPiScannerControlCode,
        applyControl: (command) =>
          applyControlCard(session, context, link, command),
        identify: (frame) => matchUntilConsensus(session, context, frame),
        removal: (outcome) =>
          processRemoval(
            session,
            context,
            link,
            outcome.card,
            outcome.matched.resolved.alternativeMatches,
          ),
        holdDuplicate: () =>
          holdCard(
            session,
            "Duplicate card. Resume to accept it, or stop to remove it.",
          ),
        nudge: (outcome) =>
          checkPiScanFoil(
            session,
            context,
            outcome.matched,
            outcome.card!,
            context.nudgeCalibration,
            session.nudgeLimits,
            session.nudgeCalibration,
          ),
        matched: (outcome) =>
          processMatched(session, context, link, outcome, pipeline, prefetch),
        unmatched: (outcome) =>
          processUnmatched(session, context, link, outcome, pipeline, prefetch),
        checkpoint: () => waitForResume(session),
      });
    }
  } catch (err) {
    if (
      !session.stopRequested &&
      (session.phase === "running" || session.phase === "paused")
    ) {
      const message =
        err instanceof Error ? err.message : "The scan session stopped.";
      fail(session, message);
    }
  } finally {
    await prefetch.discard();
    if (session.phase === "error") {
      try {
        const stopped = await link.command(
          { feederStop: true },
          PI_SCAN_STATUS_TIMEOUT_MS,
        );
        if (stopped.error || stopped.status !== "ok")
          throw new Error("Feeder stop was not confirmed.");
      } catch {
        session.message = `${session.message ?? "The scan failed."} Feeder stop unconfirmed.`;
        console.error(`[pi-scan] ${session.message}`);
      }
    }
    link.close();
    if (session.portHeld) {
      releaseSorterPort("session");
      session.portHeld = false;
    }
    if (session.locked) {
      releaseHostScanLock(session.collectionGuid, session.userId);
      session.locked = false;
    }
    if (session.phase === "running" || session.phase === "paused") {
      session.phase = "stopped";
    }
    console.log(
      `[pi-scan] finished (${session.phase}, ${session.cardsScanned} cards)`,
    );
    session.resolveDone();
  }
}

async function arm(session: PiScanLive) {
  const recovered = await recoverSessionScanSaves(
    session.orgId,
    saveOptions(session),
  );
  if (!recovered.success)
    throw new PiScanStartError(recovered.message, "invalid");
  const displayName = await getUserDisplayName(session.userId);
  if (await piUpdateRunning())
    throw new PiScanStartError("A system update is running.", "busy");
  const lock = acquireHostScanLock(
    session.collectionGuid,
    session.userId,
    session.orgId,
    displayName,
  );
  if (!lock.ok) {
    throw new PiScanStartError(
      "Another org member is currently scanning into this collection.",
      "invalid",
    );
  }
  session.locked = true;

  let port;
  try {
    port = await claimSorterPort("session");
  } catch (err) {
    if (err instanceof SorterPortError && err.reason === "missing") {
      throw new PiScanStartError(
        "No sorter is plugged into the Pi.",
        "missing",
      );
    }
    if (err instanceof SorterPortError && err.reason === "busy") {
      throw new PiScanStartError(
        "The sorter port is in use. Disconnect it in the browser, then start again.",
        "busy",
      );
    }
    throw new PiScanStartError("The sorter port could not be opened.", "busy");
  }
  session.portHeld = true;
  const link = new SorterLink(port);
  session.link = link;
  try {
    await sleep(PI_SCAN_PORT_DRAIN_MS);
    const status = await link.command(
      { getStatus: true },
      PI_SCAN_STATUS_TIMEOUT_MS,
    );
    session.nudgeLimits = parseFoilNudgeFirmwareLimits(status);
    const statusError = lineError(status);
    if (statusError) throw new PiScanStartError(statusError, "invalid");
    const hardwareId =
      typeof status.id === "string" ? status.id.trim().toUpperCase() : "";
    if (!hardwareId) {
      throw new PiScanStartError("The sorter did not report an id.", "invalid");
    }
    session.context = await prepareContext(session, hardwareId);
    session.context.counts = await loadFillCounts(
      session.jwtClaims,
      session.context.collectionId,
      session.context.configs,
    );
    await configurePiScanSorter(
      (command, timeout) => link.command(command, timeout),
      session.context,
    );
    const neutral = await link.command(
      { neutral: true },
      PI_SCAN_NEUTRAL_TIMEOUT_MS,
    );
    const neutralError = lineError(neutral);
    if (neutralError) throw new PiScanStartError(neutralError, "invalid");
    if (neutral.status !== "ok")
      throw new PiScanStartError(
        "The sorter did not confirm neutral positioning.",
        "invalid",
      );
    session.nudgeCalibration = session.context.nudgeCalibration
      ? { ...session.context.nudgeCalibration }
      : null;
  } catch (err) {
    link.close();
    releaseSorterPort("session");
    session.portHeld = false;
    session.link = null;
    throw err;
  }

  session.handedOff = true;
  session.phase = "running";
  void runLoop(session, link);
}

function createSession(
  orgId: string,
  userId: string,
  jwtClaims: string,
  body: PiScanSessionStartBody,
): PiScanLive {
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  return {
    configurationVersion: 0,
    allowDuplicates: body.allowDuplicates !== false,
    lastCardId: null,
    removalEnabled: body.removalEnabled === true,
    removalBinNumber: Number.isInteger(body.removalBinNumber)
      ? body.removalBinNumber!
      : null,
    removalEntries: [],
    removalBusy: false,
    soundEvents: [],
    nudgeLimits: null,
    nudgeCalibration: null,
    phase: "running",
    orgId,
    userId,
    jwtClaims,
    collectionGuid: body.collectionGuid,
    message: null,
    cardsScanned: 0,
    activity: null,
    current: null,
    lastCard: null,
    condition: toCardCondition(body.condition ?? DEFAULT_CARD_CONDITION),
    foilType: body.foilType ?? null,
    preferredSetCodes: cleanSetCodes(body.preferredSetCodes),
    autoFeed: body.autoFeed !== false,
    feedRequested: false,
    cardInFlight: false,
    startedAt: 0,
    pausedMs: 0,
    pauseStartedAt: null,
    pauseRequested: false,
    refreshRequested: false,
    stopRequested: false,
    handedOff: false,
    locked: false,
    portHeld: false,
    context: null,
    link: null,
    done,
    resolveDone,
  };
}

export async function startPiScanSession(
  input: PiScanStartInput,
): Promise<PiScanStartResult> {
  const collectionGuid = input.body.collectionGuid?.trim();
  if (!collectionGuid) {
    return {
      ok: false,
      status: 400,
      code: "invalid",
      message: "Pick a collection first.",
    };
  }
  const existing = sessions.get(input.orgId);
  if (
    existing &&
    (existing.phase === "running" || existing.phase === "paused")
  ) {
    return {
      ok: false,
      status: 409,
      code: "running",
      message: "A scan is already running.",
    };
  }
  if (existing?.removalBusy)
    return {
      ok: false,
      status: 409,
      code: "busy",
      message: "The removal queue is busy.",
    };
  if (existing) await existing.done;

  const session = createSession(input.orgId, input.userId, input.jwtClaims, {
    ...input.body,
    collectionGuid,
  });
  if (existing?.collectionGuid === collectionGuid)
    session.removalEntries = existing.removalEntries;
  sessions.set(input.orgId, session);
  try {
    await arm(session);
    return { ok: true, state: publicState(session) };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "The scan could not be started.";
    const code = err instanceof PiScanStartError ? err.code : "invalid";
    const status = err instanceof PiScanStartError ? err.status : 409;
    session.phase = "error";
    session.message = message;
    if (session.locked) {
      releaseHostScanLock(session.collectionGuid, session.userId);
      session.locked = false;
    }
    if (!session.handedOff) session.resolveDone();
    return { ok: false, status, code, message };
  }
}

export function pausePiScanSession(orgId: string): PiScanSessionState | null {
  const session = sessions.get(orgId);
  if (!session || (session.phase !== "running" && session.phase !== "paused")) {
    return null;
  }
  session.pauseRequested = true;
  session.phase = "paused";
  holdClock(session);
  return publicState(session);
}

export function resumePiScanSession(orgId: string): PiScanSessionState | null {
  const session = sessions.get(orgId);
  if (!session || session.phase !== "paused") return null;
  releaseClock(session);
  session.pauseRequested = false;
  session.refreshRequested = true;
  session.phase = "running";
  return publicState(session);
}

export function stopPiScanSession(orgId: string): PiScanSessionState {
  const session = sessions.get(orgId);
  if (!session) return publicState(undefined);
  session.stopRequested = true;
  session.pauseRequested = false;
  if (session.phase === "running" || session.phase === "paused") {
    session.message = session.cardInFlight
      ? "A card may remain in the sorter. Remove it before starting again."
      : null;
  }
  return publicState(session);
}

export function updatePiScanSettings(
  orgId: string,
  foilType: string | null | undefined,
  preferredSetCodes: string[] | undefined,
  autoFeed?: boolean,
  condition?: unknown,
  workflowSettings?: {
    allowDuplicates?: boolean;
    removalEnabled?: boolean;
    removalBinNumber?: number | null;
  },
): PiScanSessionState | null {
  const session = sessions.get(orgId);
  if (!session || (session.phase !== "running" && session.phase !== "paused")) {
    return null;
  }
  session.configurationVersion += 1;
  if (typeof workflowSettings?.allowDuplicates === "boolean")
    session.allowDuplicates = workflowSettings.allowDuplicates;
  if (typeof workflowSettings?.removalEnabled === "boolean")
    session.removalEnabled = workflowSettings.removalEnabled;
  if (
    workflowSettings?.removalBinNumber === null ||
    Number.isInteger(workflowSettings?.removalBinNumber)
  )
    session.removalBinNumber = workflowSettings!.removalBinNumber!;
  if (condition !== undefined) session.condition = toCardCondition(condition);
  if (foilType !== undefined) session.foilType = foilType;
  if (preferredSetCodes !== undefined) {
    session.preferredSetCodes = cleanSetCodes(preferredSetCodes);
  }
  if (typeof autoFeed === "boolean") session.autoFeed = autoFeed;
  return publicState(session);
}

export function resetPiScanSessionStats(
  orgId: string,
): PiScanSessionState | null {
  const session = sessions.get(orgId);
  if (!session || session.phase === "idle" || session.startedAt <= 0) {
    return null;
  }
  const now = Date.now();
  session.cardsScanned = 0;
  session.startedAt = now;
  session.pausedMs = 0;
  if (session.pauseStartedAt != null) session.pauseStartedAt = now;
  return publicState(session);
}

export function requestPiScanFeed(orgId: string): PiScanSessionState | null {
  const session = sessions.get(orgId);
  if (!session || (session.phase !== "running" && session.phase !== "paused")) {
    return null;
  }
  session.feedRequested = !session.cardInFlight;
  if (session.pauseRequested) {
    releaseClock(session);
    session.pauseRequested = false;
    session.refreshRequested = true;
    session.phase = "running";
  }
  return publicState(session);
}
