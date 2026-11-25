import { claimPiCamera, releasePiCamera } from "../pi-camera-ownership";
import { isPiSorter } from "../pi-host";
import { updatePiScanRemovalQueue } from "./removal";
import { runPiScanCardWorkflow } from "./workflow";
import { readPiScannerControlCode } from "./control-code";
import { configurePiScanSorter } from "./configure";
import { checkPiScanFoil } from "./foil";
import { PiScanPrefetch, usablePrefetchedMatch } from "./prefetch";
import { routeLoadedPiCard } from "./route-card";
import { feedNextPiScanCard } from "./feed-next-card";
import { retainPiScanUnsavedCards, waitForPiScanResume } from "./recovery";
import { randomUUID } from "node:crypto";
import {
  runScanDisposition,
  applyPickListFound,
  closeCardSearchMatches,
  earlyRouteBinOf,
  isFirmwareFeatureSupported,
  SENSOR_CHECKED_FEED_COMMAND,
  type MatchedScanPlanInput,
  prepareMatchedScanPlan,
  prepareUnmatchedScanPlan,
  scanCompletionPauseReason,
  selectScanSound,
  createScanRemovalEntry,
  scanRemovalCandidateCardIds,
  resolveControlCardBinNumber,
  resolveRemovalBinNumber,
  findScannerControlCommandProblem,
  parseFoilNudgeFirmwareLimits,
  type ScannerControlCommand,
  type PiScanRemovalAction,
  type ScanRoutingDecision,
  DEFAULT_CARD_CONDITION,
  toCardCondition,
  DEWARP_OUTPUT_SIZE,
  OCR_CROP_HEIGHT,
  OCR_CROP_WIDTH,
  OCR_REGIONS_BY_GAME_KEY,
  detectCardStampRgba,
  detectedStampOf,
  contourHomography,
  scanPrintingMarkGrids,
  detectPrintedLanguageCode,
  detectPrintedFoilMarkerRgba,
  PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY,
  dewarpRgba,
  getDefaultCardDewarpContour,
  rotateRgba180,
  scanBinCapacity,
  binStorageBatchStarts,
  claimStorageBatchStart,
  applyAutoAssignTarget,
  type ScanRoutingContext,
  isCardFromOtherGame,
  presetMatchGameKeys,
  type CornerDetection,
  type BinConfig,
  type BinRoute,
  type CardSearchDiagnostics,
  type MatchedScanDiagnostics,
  type ScanDetectionDiagnostics,
  type PiScanSessionStartBody,
  type PiScanSessionState,
  type PlayingCardWithDistance,
  type ScanAttemptDiagnostic,
  type UnmatchedReason,
  type UnmatchedScanDiagnostics,
  type CardContour,
  type RgbaImage,
  type ScanOrientation,
} from "@magic-vault/shared";
import { piUpdateRunning } from "../pi-update";
import type {
  PiScanEarlyRoute,
  PiScanFrameMatch,
  PiScanIdentification,
  PiScanPrefetchedCard,
  PiScanLive,
  PiScanRunContext,
  PiScanStartInput,
  PiScanStartResult,
} from "../interfaces/pi-scan";
import {
  PI_SCAN_CARD_STUCK_IN_MODULE_ONE_MESSAGE,
  PI_SCAN_EMERGENCY_STOP_MESSAGE,
  PI_SCAN_EMERGENCY_STOP_UNCONFIRMED_MESSAGE,
  PI_SCAN_FEED_TIMEOUT_MS,
  PI_SCAN_NEUTRAL_TIMEOUT_MS,
  PI_SCAN_PORT_DRAIN_MS,
  PI_SCAN_POLL_MS,
  PI_SCAN_STATUS_TIMEOUT_MS,
} from "../constants/pi-scan";
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
import { matchScopesForGames } from "../card-search/match-scopes";
import type { CollectionMatchScope } from "../interfaces/card-search";
import type { ServerScanActor } from "../interfaces/scan-actor";
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
  applyScanTargetThroughRoute,
  loadControlTargetsThroughRoute,
  loadScanContextThroughRoute,
  lockCollectionThroughRoute,
  matchThroughRoute,
  publishPendingSaveThroughRoute,
  readTextThroughRoute,
  recordPickFound,
  revealGiftThroughRoute,
  saveBinThroughRoute,
  saveThroughCollectionRoute,
  recoverSessionScanSaves,
  loadRemovalCopiesThroughRoute,
  removeQueuedCardsThroughRoute,
  unlockCollectionThroughRoute,
  PiScanActionError,
} from "./existing-routes";
import { PiScanStartError } from "./errors";
import { SorterLink } from "./sorter-link";

const sessions = new Map<string, PiScanLive>();

export { PiScanStartError };

function scanActor(session: PiScanLive): ServerScanActor {
  return { userId: session.userId, orgId: session.orgId };
}

function loadContext(
  session: PiScanLive,
  hardwareId: string,
  collectionGuid = session.collectionGuid,
): Promise<PiScanRunContext> {
  return loadScanContextThroughRoute(scanActor(session), collectionGuid, hardwareId);
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
    controllerId: session.controllerId,
    cameraId: session.cameraId,
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
    emergencyStopped: session.emergencyStopMessage !== null,
    allowDuplicates: session.allowDuplicates,
    removalEnabled: session.removalEnabled,
    removalBinNumber: session.removalBinNumber,
    removalEntries: session.removalEntries,
    removalBusy: session.removalBusy,
    pendingSave: session.pendingSave,
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

export function getPiScanMachineSource(orgId: string) {
  const session = sessions.get(orgId);
  if (!session) return null;
  return {
    state: publicState(session),
    context: session.context,
    cameraId: session.cameraId ?? null,
    jwtClaims: session.jwtClaims,
  };
}

export function piScanSessionDone(orgId: string): Promise<void> | null {
  return sessions.get(orgId)?.done ?? null;
}

export function listPiScanSessionOrgIds(): string[] {
  return [...sessions.keys()];
}

function jpegDataUrl(buffer: Buffer): string {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
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

function piMatchInputsKey(
  session: PiScanLive,
  context: PiScanRunContext,
): string {
  return JSON.stringify([
    session.collectionGuid,
    session.preferredSetCodes,
    piMatchScopes(context),
    context.region,
    context.flipCamera,
    context.checkBothOrientations,
    context.ocrEnabled,
    context.highAccuracyScans,
  ]);
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
  const markHomography = markSource
    ? contourHomography(markSource.contour)
    : null;
  const printingMarkGrids =
    markSource && markHomography
      ? scanPrintingMarkGrids(
          markSource.source,
          markHomography,
          context.gameKey,
          orientation,
        )
      : null;
  const printedLanguageCode =
    markSource && markHomography
      ? (detectPrintedLanguageCode(
          markSource.source,
          markHomography,
          context.gameKey,
          orientation,
        )?.present ?? null)
      : null;
  const result = await matchThroughRoute(scanActor(session), {
    scopes: piMatchScopes(context),
    primaryGameKey: context.gameKey,
    embeddings,
    preferredSetCodes: session.preferredSetCodes,
    printingMarkGrids,
    printedLanguageCode,
  });
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
  onImageMatchBeforeText?: (provisional: PiScanFrameMatch) => void,
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
    getDefaultCardDewarpContour(source.width, source.height, context.region);
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
  const frameMatchFor = async (
    best: Awaited<ReturnType<typeof searchOrientation>>,
    text: Pick<PiScanFrameMatch, "ocr" | "matchedBy" | "lowConfidenceFromOcr">,
  ): Promise<PiScanFrameMatch> => {
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
      ...text,
      detection,
      stampDetection,
      printedFoilMarker,
      foilDetection: null,
    };
  };
  const identified = await identifyScanImage<
    Awaited<ReturnType<typeof searchOrientation>>
  >({
    checkBothOrientations: context.checkBothOrientations,
    preferredOrientation: corners.contour
      ? session.lastMatchedOrientation
      : null,
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
        const result = await readTextThroughRoute(scanActor(session), {
          scope,
          tagsGame: piMatchScopes(context).length > 1,
          imageBase64: (
            await rgbaToJpeg(
              orientedOcrCrop(source, corners.contour, candidate.orientation),
            )
          ).toString("base64"),
          embedding: candidate.embedding,
          preferredSetCodes: session.preferredSetCodes,
        });
        if (!result) return null;
        return {
          ...candidate,
          result,
          ocr: result.ocr ?? null,
        };
      } catch (error) {
        console.error("[pi-scan] text search failed:", error);
        return null;
      }
    },
    onImageMatchBeforeText: onImageMatchBeforeText
      ? (image) => {
          if (
            closeCardSearchMatches(image.result).some((match) => !match.card)
          )
            return;
          void frameMatchFor(
            {
              image: image.image,
              orientation: image.orientation,
              result: image.result,
              embedding: image.embedding,
            },
            { ocr: null, matchedBy: "embedding", lowConfidenceFromOcr: false },
          )
            .then(onImageMatchBeforeText)
            .catch((error: unknown) =>
              console.error("[pi-scan] early route check failed:", error),
            );
        }
      : undefined,
  });
  return frameMatchFor(identified.pick, {
    ocr: identified.ocr,
    matchedBy: identified.matchedBy,
    lowConfidenceFromOcr: identified.lowConfidenceMatch,
  });
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
  firstFrameMatch?: PiScanFrameMatch | null,
  offerEarlyRoute?: (provisional: PiScanIdentification) => void,
): Promise<PiScanIdentification> {
  let initial = firstFrame;
  let initialMatch = firstFrame ? firstFrameMatch : null;
  const outcome = await identifyScanWithConsensus(
    async () => {
      const earlyMatch = initialMatch;
      initialMatch = null;
      if (earlyMatch) {
        initial = undefined;
        return earlyMatch;
      }
      const frame = initial ?? (await grabSettledCameraFrame(undefined, undefined, session.cameraId));
      initial = undefined;
      return matchFrame(
        session,
        context,
        frame,
        offerEarlyRoute && context.matchesNeeded <= 1
          ? (provisional) =>
              offerEarlyRoute({
                matched: provisional,
                attempts: [attemptDiagnostic(provisional)],
                card: provisional.resolved.card,
              })
          : undefined,
      );
    },
    (attempt) => attempt.resolved.card,
    context.matchesNeeded,
  );
  if (outcome.card && outcome.attempt.detection.cardDetected)
    session.lastMatchedOrientation = outcome.attempt.orientation;
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
    const fresh = await loadContext(session, context.hardwareId);
    session.configurationVersion += 1;
    return fresh;
  });
}

async function routeScannedPiCard(
  session: PiScanLive,
  link: SorterLink,
  route: BinRoute,
  pipeline?: Parameters<typeof routeLoadedPiCard>[2],
) {
  await routeLoadedPiCard(link, route, pipeline);
  session.routedCardMustLeaveModuleOneBeforeFeed = true;
}

function holdCard(session: PiScanLive, message: string) {
  pausePiScanSession(session.orgId);
  session.message = message;
}

function routingContext(
  context: PiScanRunContext,
  storageBatchStartBins: ReadonlySet<number> = new Set(),
): ScanRoutingContext {
  const capacity = (binNumber: number) =>
    scanBinCapacity(
      context.heights.get(binNumber),
      context.cardThickness,
      context.set,
      context.configs.find((bin) => bin.binNumber === binNumber) ?? {
        isCatchAll: false,
      },
      binStorageBatchStarts(
        context.storageBatchStarts.get(binNumber),
        context.counts.get(binNumber) ?? 0,
        storageBatchStartBins.has(binNumber),
      ),
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
    startsStorageBatch: (bin) => storageBatchStartBins.has(bin),
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

function matchedScanPlanInput(
  session: PiScanLive,
  context: PiScanRunContext,
  identified: PiScanIdentification,
  scan: { scanId: string; scannedAt: number; card: PlayingCardWithDistance },
): MatchedScanPlanInput {
  const matched = identified.matched;
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
  return {
    ...scan,
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
  };
}

function routePiCardEarly(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  provisional: PiScanIdentification,
  pipeline: Parameters<typeof routeLoadedPiCard>[2],
): PiScanEarlyRoute | null {
  const card = provisional.card;
  if (
    !card ||
    !session.allowDuplicates ||
    context.foilDetectionEnabled ||
    session.stopRequested ||
    session.pauseRequested
  )
    return null;
  const scanId = randomUUID();
  const scannedAt = Date.now();
  const routing = routingContext(context, session.storageBatchStartBins);
  const bin = earlyRouteBinOf(
    [card, ...provisional.matched.resolved.alternativeMatches].map(
      (candidate) =>
        prepareMatchedScanPlan(
          matchedScanPlanInput(session, context, provisional, {
            scanId,
            scannedAt,
            card: candidate,
          }),
          routing,
        ),
    ),
  );
  if (!bin) return null;
  showCard(session, card.name, bin.binNumber, true);
  const routed = routeScannedPiCard(
    session,
    link,
    routeForBin(bin.binNumber, context.routes),
    pipeline,
  );
  routed.catch(() => undefined);
  return { scanId, scannedAt, bin, routing: routed };
}

async function processMatched(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  identified: PiScanIdentification,
  pipeline: Parameters<typeof routeLoadedPiCard>[2],
  prefetch: PiScanPrefetch<PiScanPrefetchedCard>,
  earlyRoute: PiScanEarlyRoute | null = null,
) {
  const card = identified.card;
  if (!card) return;
  const scanId = earlyRoute?.scanId ?? randomUUID();
  const scannedAt = earlyRoute?.scannedAt ?? Date.now();
  session.lastCardId = card.id;
  await runScanDisposition({
    prepare: () =>
      prepareMatchedScanPlan(
        matchedScanPlanInput(session, context, identified, {
          scanId,
          scannedAt,
          card,
        }),
        routingContext(context, session.storageBatchStartBins),
        earlyRoute?.bin,
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
      session.lastScannedCardBinNumber = decision.bin.binNumber;
      claimStorageBatchStart(
        session.storageBatchStartBins,
        context.storageBatchStarts,
        decision.bin.binNumber,
        context.counts.get(decision.bin.binNumber) ?? 0,
      );
      if (earlyRoute) {
        await earlyRoute.routing;
        return;
      }
      await routeScannedPiCard(
        session,
        link,
        routeForBin(decision.bin.binNumber, context.routes),
        pipeline,
      );
    },
    persist: async (decision) => {
      if (decision.action !== "route" || !decision.bin) return;
      const collectionGuid = session.collectionGuid;
      const publishesPendingSave = decision.persistence.kind === "cards";
      const publishPendingSave = (status: "saving" | "saved" | "failed") => {
        session.pendingSave = {
          updatedAt: Math.max(
            Date.now(),
            (session.pendingSave?.updatedAt ?? 0) + 1,
          ),
          orgId: session.orgId,
          collectionGuid,
          scanId,
          status,
          card: {
            id: card.id,
            name: card.name,
            set: card.set,
            collectorNumber: card.collectorNumber,
          },
        };
        publishPendingSaveThroughRoute(scanActor(session), session.pendingSave).catch(
          (error: unknown) => console.error("[pi-scan] pending save notice failed", error),
        );
      };
      if (publishesPendingSave) publishPendingSave("saving");
      try {
        const saved = await saveThroughCollectionRoute(
          session.orgId,
          collectionGuid,
          decision.persistence.kind,
          { ...decision.persistence.record, deviceGuid: context.deviceGuid },
          saveOptions(session),
        );
        if (!saved.success) throw new Error(saved.message);
        if (publishesPendingSave) {
          publishPendingSave("saved");
          revealGiftThroughRoute(scanActor(session), collectionGuid, decision.record).catch(
            (error) => console.error("[pi-scan] gift reveal failed", error),
          );
        }
      } catch (error) {
        if (publishesPendingSave) publishPendingSave("failed");
        throw error;
      }
      const update = decision.pickListUpdate;
      if (update && decision.persistence.kind === "cards/sorted") {
        const pickList = await recordPickFound(
          { userId: session.userId, orgId: session.orgId },
          update.binGuid,
          update,
        );
        if (!pickList) throw new Error("The pick list could not be updated.");
        const listed = context.pickConfigs.find(
          (bin) => bin.guid === update.binGuid,
        );
        if (listed) listed.pickList = pickList;
      } else if (update) {
        const listed = context.pickConfigs.find(
          (bin) => bin.guid === update.binGuid,
        );
        if (listed?.pickList)
          listed.pickList = applyPickListFound(listed.pickList, update, update.delta);
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
    checkpoint: earlyRoute ? undefined : () => waitForResume(session),
    revision: () => session.configurationVersion,
  });
}

async function processUnmatched(
  session: PiScanLive,
  context: PiScanRunContext,
  link: SorterLink,
  identified: Awaited<ReturnType<typeof matchUntilConsensus>>,
  pipeline: Parameters<typeof routeLoadedPiCard>[2],
  prefetch: PiScanPrefetch<PiScanPrefetchedCard>,
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
        routingContext(context, session.storageBatchStartBins),
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
      session.lastScannedCardBinNumber = decision.bin!.binNumber;
      claimStorageBatchStart(
        session.storageBatchStartBins,
        context.storageBatchStarts,
        decision.bin!.binNumber,
        context.counts.get(decision.bin!.binNumber) ?? 0,
      );
      await routeScannedPiCard(
        session,
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
  { isControlCard = false }: { isControlCard?: boolean } = {},
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
    await routeScannedPiCard(session, link, routeForBin(bin, context.routes));
    if (isControlCard) {
      const lastScannedCard = session.lastCard;
      savedCard(session);
      session.lastCard = lastScannedCard;
      return;
    }
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
  const actor = scanActor(session);
  const targets = {
    ...(await loadControlTargetsThroughRoute(actor)),
    activeCollectionGuid: session.collectionGuid,
  };
  const problem = command
    ? findScannerControlCommandProblem(command, targets)
    : "unreadable";
  const routedControlCard = { binNumber: null as number | null };
  await routeUnsavedCard(
    session,
    context,
    link,
    () => {
      routedControlCard.binNumber = resolveControlCardBinNumber(
        context.configs,
        problem ? null : command,
        session.lastScannedCardBinNumber,
      );
      return routedControlCard.binNumber;
    },
    { isControlCard: true },
  );
  if (session.stopRequested) return;
  if (command?.endBatch && !problem && routedControlCard.binNumber != null)
    session.storageBatchStartBins.add(routedControlCard.binNumber);
  if (!command || problem) {
    holdCard(session, `Control card rejected: ${problem ?? "unreadable"}.`);
    return;
  }
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
      const lock = await lockCollectionThroughRoute(actor, nextCollection);
      if (!lock.ok)
        throw new Error("The target collection is locked by another scanner.");
      acquired = true;
    }
    const fresh = await applyScanTargetThroughRoute(actor, {
      collectionGuid: nextCollection,
      hardwareId: context.hardwareId,
      presetGuid: command.presetGuid ?? null,
      activatesCollection: switching,
    });
    retainPiScanUnsavedCards(context, fresh);
    if (switching)
      for (const entry of fresh.contents)
        if (entry.unsaved) entry.capacityOnly = true;
    session.collectionGuid = nextCollection;
    if (switching) {
      await unlockCollectionThroughRoute(actor, oldCollection);
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
    if (acquired) await unlockCollectionThroughRoute(actor, nextCollection);
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
  const prefetch = new PiScanPrefetch<PiScanPrefetchedCard>(async () => {
    if (
      session.stopRequested ||
      session.pauseRequested ||
      link.jamModule != null
    ) {
      return null;
    }
    const frame = await grabSettledCameraFrame(
      undefined,
      undefined,
      session.cameraId,
    );
    const matchInputsKey = piMatchInputsKey(session, context);
    const match = await matchFrame(session, context, frame).catch(
      (error: unknown) => {
        console.error("[pi-scan] early identification failed:", error);
        return null;
      },
    );
    return { frame, match, matchInputsKey };
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
      const confirmRoutedCardLeftModuleOne =
        session.routedCardMustLeaveModuleOneBeforeFeed && !bufferedFeed;
      session.routedCardMustLeaveModuleOneBeforeFeed = false;
      const feedOutcome = await feedNextPiScanCard(link, {
        confirmRoutedCardLeftModuleOne,
        feedOnce: async () => {
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
        feedOnceRequiringEmptyModuleOne: isFirmwareFeatureSupported(
          link.firmwareVersion,
          "sensorCheckedCommands",
        )
          ? async () => {
              if (!(await waitForResume(session))) {
                throw new Error("Feeding interrupted.");
              }
              return link.command(
                SENSOR_CHECKED_FEED_COMMAND,
                PI_SCAN_FEED_TIMEOUT_MS,
              );
            }
          : undefined,
        retryCount: context.feedRetryCount,
      });
      if (feedOutcome.kind === "stuckInModuleOne") {
        console.log("[pi-scan] the routed card is still in module 1");
        session.activity = null;
        holdCard(session, PI_SCAN_CARD_STUCK_IN_MODULE_ONE_MESSAGE);
        continue;
      }
      const fed = feedOutcome.result;
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
      const jammedAfterFeed = takeJam(link);
      if (jammedAfterFeed != null) {
        fail(session, `Jam at module ${jammedAfterFeed}.`);
        break;
      }

      let earlyRoute: PiScanEarlyRoute | null = null;
      await runPiScanCardWorkflow(session, {
        capture: async () =>
          prefetched?.identified?.frame ??
          grabSettledCameraFrame(undefined, undefined, session.cameraId),
        readControl: readPiScannerControlCode,
        applyControl: (command) =>
          applyControlCard(session, context, link, command),
        identify: (frame, offerEarlyRoute) =>
          matchUntilConsensus(
            session,
            context,
            frame,
            frame === prefetched?.identified?.frame
              ? usablePrefetchedMatch(
                  prefetched.identified,
                  piMatchInputsKey(session, context),
                )
              : null,
            offerEarlyRoute,
          ),
        routeEarly: (provisional) => {
          earlyRoute = routePiCardEarly(
            session,
            context,
            link,
            provisional,
            pipeline,
          );
          return earlyRoute !== null;
        },
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
          processMatched(
            session,
            context,
            link,
            outcome,
            pipeline,
            prefetch,
            earlyRoute,
          ),
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
    releasePiCamera(session.cameraId ?? "default", session);
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
      releaseSorterPort("session", session.port);
      session.portHeld = false;
    }
    if (session.locked) {
      await unlockCollectionThroughRoute(scanActor(session), session.collectionGuid);
      session.locked = false;
    }
    if (session.phase === "running" || session.phase === "paused") {
      session.phase = "stopped";
    }
    if (session.emergencyStopMessage !== null) {
      session.phase = "stopped";
      session.message = session.emergencyStopMessage;
    }
    console.log(
      `[pi-scan] finished (${session.phase}, ${session.cardsScanned} cards)`,
    );
    session.resolveDone();
  }
}

async function arm(session: PiScanLive) {
  if ((session.controllerId !== undefined && typeof session.controllerId !== "string") ||
      (session.cameraId !== undefined && typeof session.cameraId !== "string"))
    throw new PiScanStartError("Invalid hardware selection.", "invalid");
  session.controllerId ??= isPiSorter() ? "gpio" : "usb";
  if (isPiSorter() && session.controllerId !== "gpio")
    throw new PiScanStartError("GPIO mode supports only the built-in sorter.", "invalid");
  const health = new URL("http://127.0.0.1:8765/health");
  if (session.cameraId) health.searchParams.set("cameraId", session.cameraId);
  const camera = await fetch(health, { signal: AbortSignal.timeout(10_000) });
  if (!camera.ok) throw new PiScanStartError("The selected Pi camera is unavailable.", "invalid");
  const cameraState = await camera.json() as { id?: string };
  session.cameraId = cameraState.id ?? session.cameraId;
  if (!claimPiCamera(session.cameraId ?? "default", session))
    throw new PiScanStartError("The selected camera is in use by another scan.", "busy");
  const recovered = await recoverSessionScanSaves(
    session.orgId,
    saveOptions(session),
  );
  if (!recovered.success)
    throw new PiScanStartError(recovered.message, "invalid");
  if (await piUpdateRunning())
    throw new PiScanStartError("A system update is running.", "busy");
  const lock = await lockCollectionThroughRoute(scanActor(session), session.collectionGuid);
  if (!lock.ok) throw new PiScanStartError(lock.message, "invalid");
  session.locked = true;

  let port;
  try {
    port = await claimSorterPort("session", { controllerId: session.controllerId });
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
  session.port = port;
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
    session.context = await loadContext(session, hardwareId);
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
    releaseSorterPort("session", session.port);
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
    controllerId: body.controllerId,
    cameraId: body.cameraId,
    pendingSave: null,
    configurationVersion: 0,
    lastMatchedOrientation: null,
    allowDuplicates: body.allowDuplicates !== false,
    lastCardId: null,
    lastScannedCardBinNumber: null,
    storageBatchStartBins: new Set(),
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
    routedCardMustLeaveModuleOneBeforeFeed: false,
    startedAt: 0,
    pausedMs: 0,
    pauseStartedAt: null,
    pauseRequested: false,
    refreshRequested: false,
    stopRequested: false,
    emergencyStopMessage: null,
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
    releasePiCamera(session.cameraId ?? "default", session);
    session.phase = "error";
    session.message = message;
    if (session.locked) {
      await unlockCollectionThroughRoute(scanActor(session), session.collectionGuid);
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

export async function emergencyStopPiScanSession(
  orgId: string,
): Promise<PiScanSessionState | null> {
  const session = sessions.get(orgId);
  if (
    !session?.link ||
    (session.phase !== "running" && session.phase !== "paused")
  ) {
    return null;
  }
  session.stopRequested = true;
  session.pauseRequested = false;
  session.emergencyStopMessage = PI_SCAN_EMERGENCY_STOP_MESSAGE;
  session.message = PI_SCAN_EMERGENCY_STOP_MESSAGE;
  const confirmed = await session.link.emergencyStop();
  if (!confirmed) {
    session.emergencyStopMessage = PI_SCAN_EMERGENCY_STOP_UNCONFIRMED_MESSAGE;
    session.message = PI_SCAN_EMERGENCY_STOP_UNCONFIRMED_MESSAGE;
  }
  console.log(`[pi-scan] ${session.message}`);
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
