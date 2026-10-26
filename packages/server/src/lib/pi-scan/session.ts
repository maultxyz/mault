import { routeLoadedPiCard } from "./route-card";
import { waitForPiScanResume } from "./recovery";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEWARP_OUTPUT_SIZE,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  OCR_REGIONS_BY_GAME_KEY,
  detectColorBarRgba,
  dewarpRgba,
  getDefaultCardContour,
  rotateRgba180,
  computeBinCapacity,
  areAllScanRepackPacksComplete,
  resolveScanBin,
  applyAutoAssignTarget,
  type ScanRoutingContext,
  createDefaultBinRoutes,
  findLowMatchCatchAll,
  hasMaxCopiesBins,
  isRulesMode,
  reservePickListBins,
  toRuleCard,
  withScanRuleFields,
  type CornerDetection,
  type BinConfig,
  type BinDirection,
  type BinRoute,
  type CardSearchDiagnostics,
  type FieldMeta,
  type MatchedScanDiagnostics,
  type OcrDiagnostics,
  type ScanDetectionDiagnostics,
  type ScanMatchSource,
  type PiScanSessionStartBody,
  type PiScanSessionStartCode,
  type PiScanSessionState,
  isStrongerTextMatch,
  type PlayingCardWithDistance,
  type ScanAttemptDiagnostic,
  type UnmatchedReason,
  type UnmatchedScanDiagnostics,
} from "@magic-vault/shared";
import { authQuery } from "../../db";
import { piUpdateRunning } from "../pi-update";
import { collections, games, orgSettings } from "../../db/schema";
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
import { acquireLock, releaseLock } from "../scan-lock";
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
import { loadBinContents } from "../../routes/collections/cards-query";
import { toScanRegion } from "../../routes/org-settings/shared";
import { loadSets } from "../../routes/bins/shared";
import { grabSettledCameraFrame } from "./camera";
import {
  pickBetterOrientation,
  resolveCardSearchMatches,
  preferDetectedColor,
  pickConsensus,
  consensusAttemptLimit,
  consensusMissReason,
  hasCardMatch,
  needsTextSearch,
  routeForBin,
} from "@magic-vault/shared";
import {
  recordPickFound,
  saveBinThroughRoute,
  saveThroughCollectionRoute,
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
  };
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
): Promise<Map<number, number>> {
  const windows = configs.map((bin) => ({
    binNumber: bin.binNumber,
    lastEmptiedAt: bin.lastEmptiedAt ?? null,
  }));
  if (windows.length === 0) return new Map();
  const result = await authQuery(jwtClaims, (tx) =>
    tx.execute(sql`
      SELECT b."binNumber" AS bin_number,
        (
          SELECT count(*)::int FROM collection_cards c
          WHERE c.collection_id = ${collectionId}
            AND c.bin_number = b."binNumber"
            AND (
              b."lastEmptiedAt" IS NULL
              OR c.scanned_at > to_timestamp(b."lastEmptiedAt" / 1000.0) AT TIME ZONE 'UTC'
            )
        ) + (
          SELECT count(*)::int FROM unmatched_cards u
          WHERE u.collection_id = ${collectionId}
            AND u.bin_number = b."binNumber"
            AND u.is_deleted = false
            AND (
              b."lastEmptiedAt" IS NULL
              OR u.scanned_at > to_timestamp(b."lastEmptiedAt" / 1000.0) AT TIME ZONE 'UTC'
            )
        ) AS count
      FROM jsonb_to_recordset(${JSON.stringify(windows)}::jsonb)
        AS b("binNumber" int, "lastEmptiedAt" float8)
    `),
  );
  const counts = new Map<number, number>();
  for (const row of result.rows as { bin_number: number; count: number }[]) {
    counts.set(Number(row.bin_number), Number(row.count));
  }
  return counts;
}

async function prepareContext(
  session: PiScanLive,
  hardwareId: string,
): Promise<PiScanRunContext> {
  return authQuery(session.jwtClaims, async (tx) => {
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
          eq(collections.guid, session.collectionGuid),
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
        scanCoverage: true,
        scanOffsetX: true,
        scanOffsetY: true,
        captureSettleDelayMs: true,
        checkBothOrientations: true,
        flipCamera: true,
        matchesNeeded: true,
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

    const fieldDefinitions = withScanRuleFields(
      (collection.fieldDefinitions as FieldMeta[] | null) ??
        active.game?.fieldDefinitions ??
        [],
      (collection.foilTypes as string[] | null) ?? active.game?.foilTypes ?? [],
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
      columns: { ocrEnabled: true },
    });
    const loaded = await loadBinContents(tx, collection.id, windows);
    const contents: PiScanBinCard[] = loaded.map((row) => ({
      binNumber: row.binNumber,
      scannedAt: row.scannedAt,
      card: toRuleCard(row.card, row),
    }));
    const sourceBins = active.bins.map((bin) => ({ ...bin }));

    return {
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
      region: toScanRegion(device),
      settleMs: device.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
      checkBothOrientations:
        device.checkBothOrientations ?? DEFAULT_CHECK_BOTH_ORIENTATIONS,
      flipCamera: device.flipCamera,
      matchesNeeded: device.matchesNeeded ?? DEFAULT_MATCHES_NEEDED,
      matchAllLanguages: collection.matchAllLanguages,
      ocrEnabled: settings?.ocrEnabled === true,
      cardThickness: collection.cardThickness,
      fieldDefinitions,
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
  });
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
  context.pickConfigs = applyAutoAssignTarget(context.pickConfigs, { binNumber, rules });
  try {
    const saved = await saveBinThroughRoute(
      session.accessToken,
      session.orgId,
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

async function searchOrientation(
  session: PiScanLive,
  context: PiScanRunContext,
  image: Buffer,
  orientation: "upright" | "rotated",
) {
  const embeddings = await vectorizeCardImage(image);
  const result = await attachMatchedCards(
    await findCardMatches(session.jwtClaims, {
      gameKey: context.gameKey,
      lang: context.lang,
      matchAllLanguages: context.matchAllLanguages,
      embeddings,
      preferredSetCode: session.preferredSetCode ?? undefined,
    }),
    context.gameKey,
    context.lang,
  );
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

  let best: Awaited<ReturnType<typeof searchOrientation>>;
  let alternate: typeof best | null = null;
  if (context.checkBothOrientations) {
    const rotatedImage = await rgbaToJpeg(rotateRgba180(upright));
    const [uprightHit, rotated] = await Promise.all([
      searchOrientation(session, context, uprightImage, "upright"),
      searchOrientation(session, context, rotatedImage, "rotated"),
    ]);
    const picked = pickBetterOrientation(uprightHit, rotated);
    best = picked;
    alternate = picked.alternate;
  } else {
    best = await searchOrientation(session, context, uprightImage, "upright");
  }

  let ocr: OcrDiagnostics | null = null;
  let matchedBy: ScanMatchSource = "embedding";
  let lowConfidenceFromOcr = false;
  const regions = OCR_REGIONS_BY_GAME_KEY[context.gameKey] ?? [];
  const embeddingMatched = hasCardMatch(best.result);
  if (
    context.ocrEnabled &&
    corners.contour &&
    regions.length > 0 &&
    needsTextSearch(best.result)
  ) {
    const ocrCrop = dewarpRgba(
      source,
      corners.contour,
      OCR_CROP_WIDTH,
      OCR_CROP_HEIGHT,
    );
    const options = [best, alternate].filter(
      (option): option is NonNullable<typeof best> & { embedding: number[] } =>
        !!option?.embedding,
    );
    const texts = await Promise.all(
      options.map(async (option) => {
        try {
          return await findCardMatchesByOcr(
            session.jwtClaims,
            await rgbaToJpeg(
              option.orientation === "rotated"
                ? rotateRgba180(ocrCrop)
                : ocrCrop,
            ),
            regions,
            {
              gameKey: context.gameKey,
              lang: context.lang,
              matchAllLanguages: context.matchAllLanguages,
              embeddings: { embedding: option.embedding },
              preferredSetCode: session.preferredSetCode ?? undefined,
            },
          );
        } catch (err) {
          console.error("[pi-scan] text search failed:", err);
          return null;
        }
      }),
    );
    let bestIndex = 0;
    texts.forEach((result, index) => {
      if (isStrongerTextMatch(result, texts[bestIndex])) bestIndex = index;
    });
    const text = texts[bestIndex];
    ocr = text?.ocr ?? texts.find((item) => item?.ocr)?.ocr ?? null;
    if (text && hasCardMatch(text)) {
      best = {
        ...options[bestIndex],
        result: await attachMatchedCards(text, context.gameKey, context.lang),
      };
      matchedBy = "ocr";
      lowConfidenceFromOcr = !embeddingMatched;
    }
  }

  const colorRegion = corners.contour
    ? COLOR_BAR_REGIONS_BY_GAME_KEY[context.gameKey]
    : undefined;
  const detectedColor = colorRegion
    ? detectColorBarRgba(
        best.orientation === "rotated" ? rotateRgba180(upright) : upright,
        colorRegion,
      )
    : null;

  return {
    ...best,
    resolved: preferDetectedColor(
      await resolveCardSearchMatches(best.result, async () => null),
      detectedColor,
    ),
    ocr,
    matchedBy,
    lowConfidenceFromOcr,
    detection,
    detectedColor,
  };
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
): Promise<{
  matched: PiScanFrameMatch;
  attempts: ScanAttemptDiagnostic[];
  card: PlayingCardWithDistance | null;
}> {
  const take = async () =>
    matchFrame(session, context, await grabSettledCameraFrame());
  if (context.matchesNeeded <= 1) {
    const matched = await take();
    return {
      matched,
      attempts: [attemptDiagnostic(matched)],
      card: matched.resolved.card,
    };
  }

  const maxAttempts = consensusAttemptLimit(context.matchesNeeded);
  const attempts: ScanAttemptDiagnostic[] = [];
  const frames: PiScanFrameMatch[] = [];
  let last: PiScanFrameMatch | null = null;
  for (let index = 0; index < maxAttempts; index += 1) {
    const matched = await take();
    last = matched;
    attempts.push(attemptDiagnostic(matched));
    frames.push(matched);
    const agreed = pickConsensus(
      frames.map((frame) => ({
        matched: frame,
        card: frame.resolved.card,
      })),
      context.matchesNeeded,
    );
    if (agreed) {
      return { matched: agreed.matched, attempts, card: agreed.card };
    }
  }

  if (!last) {
    const matched = await take();
    return { matched, attempts: [attemptDiagnostic(matched)], card: null };
  }
  return { matched: last, attempts, card: null };
}

function fail(session: PiScanLive, message: string) {
  console.error(`[pi-scan] failed while ${session.activity ?? "scanning"}: ${message}`);
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

function savedCard(session: PiScanLive) {
  session.cardInFlight = false;
  if (session.current) session.lastCard = session.current;
  session.current = null;
  session.activity = null;
}

async function waitForResume(session: PiScanLive): Promise<boolean> {
  return waitForPiScanResume(session, async (context) => {
    const fresh = await prepareContext(session, context.hardwareId);
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

async function runLoop(session: PiScanLive, link: SorterLink) {
  const context = session.context;
  if (!context) return;
  console.log(
    `[pi-scan] started collection ${session.collectionGuid} on ${context.deviceGuid}`,
  );
  session.startedAt = Date.now();
  try {
    while (!session.stopRequested) {
      if (!(await waitForResume(session))) break;
      while (
        !session.autoFeed &&
        !session.feedRequested &&
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
      const fed = await link.command({ feeder: true }, PI_SCAN_FEED_TIMEOUT_MS);
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
      await sleep(context.settleMs);
      const jammedAfterFeed = takeJam(link);
      if (jammedAfterFeed != null) {
        fail(session, `Jam at module ${jammedAfterFeed}.`);
        break;
      }

      const identified = await matchUntilConsensus(session, context);
      const matched = identified.matched;
      const card = identified.card;
      const imageUrl = jpegDataUrl(matched.image);
      const scannedAt = Date.now();
      const scanId = randomUUID();

      if (!(await waitForResume(session))) break;

      if (!card) {
        while (!session.stopRequested) {
          const catchAll = context.configs.find((bin) => bin.isCatchAll);
          if (!catchAll) {
            fail(
              session,
              "No card matched, and this preset has no catch-all bin.",
            );
            break;
          }
          showCard(session, null, catchAll.binNumber, false);
          const capacity = computeBinCapacity(
            context.heights.get(catchAll.binNumber),
            context.cardThickness,
          );
          if (
            capacity != null &&
            (context.counts.get(catchAll.binNumber) ?? 0) >= capacity
          ) {
            holdCard(
              session,
              `Bin ${catchAll.binNumber} is full. Empty it, then resume.`,
            );
            if (!(await waitForResume(session))) break;
            continue;
          }
          const route = routeForBin(catchAll.binNumber, context.routes);
          await routeLoadedPiCard(link, route);
          const diagnostics: UnmatchedScanDiagnostics = {
            reason: unmatchedReason(matched, identified.attempts),
            search: matched.result.diagnostics
              ? withoutEmbedding(matched.result.diagnostics)
              : null,
            detection: matched.detection,
            orientation: matched.orientation,
            matchesNeeded: context.matchesNeeded,
            attempts: identified.attempts,
          };
          const saved = await saveThroughCollectionRoute(
            session.accessToken,
            session.orgId,
            session.collectionGuid,
            "unmatched",
            {
              scanId,
              scannedAt,
              capturedImageUrl: imageUrl,
              binNumber: catchAll.binNumber,
              vectorizedOn: "server",
              diagnostics,
              embedding: matched.embedding,
              deviceGuid: context.deviceGuid,
            },
          );
          if (!saved.success) {
            fail(session, saved.message);
            break;
          }
          context.counts.set(
            catchAll.binNumber,
            (context.counts.get(catchAll.binNumber) ?? 0) + 1,
          );
          savedCard(session);
          session.cardsScanned += 1;
          console.log(`[pi-scan] unmatched -> bin ${catchAll.binNumber}`);
          break;
        }
        continue;
      }

      while (!session.stopRequested) {
        const ruleCard = toRuleCard(card, {
          isFoil: session.foilType != null,
          foilType: session.foilType,
        });
        const countInBin = (bin: BinConfig) =>
          context.counts.get(bin.binNumber) ?? 0;
        const isBinFull = (bin: BinConfig) => {
          const capacity = computeBinCapacity(
            context.heights.get(bin.binNumber),
            context.cardThickness,
          );
          if (capacity == null) return false;
          return countInBin(bin) >= capacity;
        };
        const binRoom = (bin: BinConfig) => {
          const capacity = computeBinCapacity(
            context.heights.get(bin.binNumber),
            context.cardThickness,
          );
          if (capacity == null) return Number.POSITIVE_INFINITY;
          return capacity - countInBin(bin);
        };
        const routingContext = (): ScanRoutingContext => ({
          binSet: context.set,
          configs: context.pickConfigs,
          fieldDefinitions: context.fieldDefinitions,
          binContents: context.contents,
          countCardsInBin: (binNumber) => context.counts.get(binNumber) ?? 0,
          isBinFull: (binNumber) => isBinFull({ binNumber } as BinConfig),
          binRoom: (binNumber) => binRoom({ binNumber } as BinConfig),
          createRuleId: randomUUID,
        });
        const decision = resolveScanBin(ruleCard, routingContext());
        if (decision.action === "pause") {
          const message =
            decision.reason === "bin-full"
              ? `Bin ${decision.bin!.binNumber} is full. Empty it, then resume.`
              : decision.reason === "all-chaos-bins-full"
                ? "Every bin is full. Empty one, then resume."
                : "Every pack is complete. Empty the completed packs, then resume.";
          holdCard(session, message);
          if (!(await waitForResume(session))) break;
          continue;
        }
        if (decision.autoAssignTarget) {
          await rememberAutoAssign(
            session,
            context,
            decision.autoAssignTarget.binNumber,
            decision.autoAssignTarget.rules,
          );
        }
        const chosen = decision.bin;
        if (!chosen) {
          fail(session, "No bin matched this card.");
          break;
        }
        showCard(session, card.name, chosen.binNumber, true);
        if (decision.pickListMatch) {
          const listed = context.pickConfigs.find(
            (bin) => bin.guid === chosen.guid,
          );
          try {
            const pickList = await recordPickFound(
              session.accessToken,
              session.orgId,
              chosen.guid,
              decision.pickListMatch.entry.name,
            );
            if (pickList && listed) listed.pickList = pickList;
          } catch (err) {
            console.error("[pi-scan] failed to update a pick list:", err);
          }
        }

        const route = routeForBin(chosen.binNumber, context.routes);
        await routeLoadedPiCard(link, route);

        const alternatives = matched.resolved.alternativeMatches;
        const lowMatchBin = findLowMatchCatchAll(ruleCard, context.configs);
        const diagnostics: MatchedScanDiagnostics = {
          matchedBy: matched.matchedBy,
          vectorizedOn: "server",
          detection: matched.detection,
          orientation: matched.orientation,
          matchesNeeded: context.matchesNeeded,
          attempts: identified.attempts,
          candidates: matched.resolved.candidates,
          ocr: matched.ocr,
          detectedColor: matched.detectedColor,
        };
        const saved = await saveThroughCollectionRoute(
          session.accessToken,
          session.orgId,
          session.collectionGuid,
          context.set.skipSaving ? "cards/sorted" : "cards",
          {
            hasAlternatives: alternatives.length > 0,
            scanId,
            card,
            scannedAt,
            binNumber: chosen.binNumber,
            capturedImageUrl: imageUrl,
            isFoil: session.foilType != null,
            foilType: session.foilType ?? undefined,
            alternativeMatches: alternatives,
            lowConfidenceMatch:
              matched.lowConfidenceFromOcr ||
              lowMatchBin?.binNumber === chosen.binNumber,
            diagnostics,
            vectorizedOn: "server",
            deviceGuid: context.deviceGuid,
          },
        );
        if (!saved.success) {
          fail(session, saved.message);
          break;
        }
        savedCard(session);
        context.counts.set(chosen.binNumber, countInBin(chosen) + 1);
        context.contents.push({
          binNumber: chosen.binNumber,
          scannedAt,
          card: ruleCard,
          unsaved: context.set.skipSaving,
        });
        session.cardsScanned += 1;
        console.log(`[pi-scan] ${card.name} -> bin ${chosen.binNumber}`);
        // Finish a repack before feeding another card, as the browser does.
        while (
          context.set.isRepackMode &&
          areAllScanRepackPacksComplete(routingContext())
        ) {
          holdCard(
            session,
            "Every pack is complete. Empty the completed packs, then resume.",
          );
          if (!(await waitForResume(session))) break;
        }
        break;
      }
    }
  } catch (err) {
    if (session.phase === "running" || session.phase === "paused") {
      const message =
        err instanceof Error ? err.message : "The scan session stopped.";
      fail(session, message);
    }
  } finally {
    if (session.phase === "error") {
      try {
        const stopped = await link.command({ feederStop: true }, PI_SCAN_STATUS_TIMEOUT_MS);
        if (stopped.error || stopped.status !== "ok") throw new Error("Feeder stop was not confirmed.");
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
      releaseLock(session.collectionGuid, session.userId);
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
  const displayName = await getUserDisplayName(session.userId);
  if (await piUpdateRunning())
    throw new PiScanStartError("A system update is running.", "busy");
  const lock = acquireLock(
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
    const statusError = lineError(status);
    if (statusError) throw new PiScanStartError(statusError, "invalid");
    const hardwareId = typeof status.id === "string" ? status.id.trim() : "";
    if (!hardwareId) {
      throw new PiScanStartError("The sorter did not report an id.", "invalid");
    }
    session.context = await prepareContext(session, hardwareId);
    session.context.counts = await loadFillCounts(
      session.jwtClaims,
      session.context.collectionId,
      session.context.configs,
    );
    const neutral = await link.command(
      { neutral: true },
      PI_SCAN_NEUTRAL_TIMEOUT_MS,
    );
    const neutralError = lineError(neutral);
    if (neutralError) throw new PiScanStartError(neutralError, "invalid");
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
  accessToken: string,
  body: PiScanSessionStartBody,
): PiScanLive {
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  return {
    phase: "running",
    orgId,
    userId,
    jwtClaims,
    accessToken,
    collectionGuid: body.collectionGuid,
    message: null,
    cardsScanned: 0,
    activity: null,
    current: null,
    lastCard: null,
    foilType: body.foilType ?? null,
    preferredSetCode: body.preferredSetCode?.trim() || null,
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
  if (existing) await existing.done;

  const session = createSession(
    input.orgId,
    input.userId,
    input.jwtClaims,
    input.accessToken,
    {
      ...input.body,
      collectionGuid,
    },
  );
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
      releaseLock(session.collectionGuid, session.userId);
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
  preferredSetCode: string | null | undefined,
  autoFeed?: boolean,
): PiScanSessionState | null {
  const session = sessions.get(orgId);
  if (!session || (session.phase !== "running" && session.phase !== "paused")) {
    return null;
  }
  if (foilType !== undefined) session.foilType = foilType;
  if (preferredSetCode !== undefined) {
    session.preferredSetCode = preferredSetCode?.trim() || null;
  }
  if (typeof autoFeed === "boolean") session.autoFeed = autoFeed;
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
