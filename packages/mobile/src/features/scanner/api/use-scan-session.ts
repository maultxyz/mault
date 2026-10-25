import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAutoAssignTarget,
  applyPickListFound,
  computeBinCapacity,
  computeBinCount,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  getCatchAllBin,
  hasMaxCopiesBins,
  isFedEvent,
  isScanFillingLastRepackPack,
  OCR_REGIONS_BY_GAME_KEY,
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  resolveScanBin,
  SERIAL_JAM_ERROR,
  toRuleCard,
  withScanRuleFields,
  type AutoAssignTarget,
  type BinConfig,
  type BinContentCard,
  type BinRoute,
  type PickListMatch,
  type ScannedCard,
  type ScanRoutingContext,
} from "@magic-vault/shared";
import { binHeightsQueryOptions } from "@/features/calibration/api/calibration-configs";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { binRoutesQueryOptions, binSetsQueryOptions } from "@/features/devices/api/devices";
import { billingQueryOptions } from "@/features/org/api/billing";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { fetchBinContents, fetchBinCounts } from "@/features/scanner/api/bin-counts";
import { markPickListFound, saveBinConfig } from "@/features/rules/api/bin-sets";
import { usePendingSaves } from "@/features/scanner/api/use-pending-saves";
import { configsFromSet } from "@/features/scanner/lib/bin-routing";
import { createHandScanTracker } from "@/features/scanner/lib/hand-scan";
import { identifyCard } from "@/features/scanner/lib/identify";
import { warmScanModels } from "@/features/scanner/lib/inference";
import { useSorter, useSorterMessage } from "@/features/sorter/api/use-sorter";
import { useSoundRulePlayer } from "@/features/sounds/api/use-sound-rule-player";
import { useActiveOrgId } from "@/hooks/use-org";
import {
  BIN_DATA_RETRY_MS,
  LIVE_CORNERS_SUPPORTED,
  SESSION_FEED_IMAGE_LIMIT,
  SESSION_FEED_LIMIT,
} from "@/lib/constants/scanner";
import { HAND_SCAN_KEY } from "@/lib/constants/storage-keys";
import { readKv, writeKv } from "@/lib/storage/kv";
import { ROUTE_TIMEOUT_MODULE_PATTERN } from "@/lib/constants/sorter";
import type {
  CardSaveResult,
  IdentifyOutcome,
  LiveCorners,
  ScanFeedEntry,
  ScannerPauseReason,
  ScannerPhase,
  ScanSessionInputs,
  ScanSessionValue,
} from "@/lib/interfaces/scanner";
import type { SorterMessage } from "@/lib/interfaces/sorter";
import { delay } from "@/lib/delay";

export function useScanSession({ capture }: ScanSessionInputs): ScanSessionValue {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const sorter = useSorter();
  const { saveCard, saveUnmatched } = usePendingSaves();
  const { data: collections } = useQuery(collectionsQueryOptions(orgId));
  const { data: binSets } = useQuery(binSetsQueryOptions(orgId));
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(orgId));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const { data: binRoutes } = useQuery(binRoutesQueryOptions(sorter.device?.guid ?? null));
  const { data: binHeights, isError: binHeightsFailed } = useQuery(
    binHeightsQueryOptions(sorter.device?.guid ?? null),
  );

  const [phase, setPhaseState] = useState<ScannerPhase>("idle");
  const [pauseReason, setPauseReason] = useState<ScannerPauseReason | null>(null);
  const [pauseDetail, setPauseDetail] = useState<string | null>(null);
  const [feed, setFeed] = useState<ScanFeedEntry[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoFeed, setAutoFeedState] = useState(true);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const [handScan, setHandScanState] = useState(() => readKv(HAND_SCAN_KEY) === "true");
  const handScanActive = handScan && LIVE_CORNERS_SUPPORTED && !sorter.isReady;

  const collection = collections?.find((c) => c.isActive) ?? null;
  const set = useMemo(() => {
    const forGame = (binSets ?? []).filter(
      (s) => (s.game?.guid ?? undefined) === (collection?.game?.guid ?? undefined),
    );
    return forGame.find((s) => s.isActive) ?? forGame[0];
  }, [binSets, collection?.game?.guid]);
  const moduleCount = sorter.device?.moduleCount ?? 0;
  const binCount = moduleCount
    ? computeBinCount(moduleCount)
    : Math.max(0, ...(set?.bins ?? []).map((bin) => bin.binNumber));
  const configs = useMemo(() => (binCount ? configsFromSet(set, binCount) : []), [set, binCount]);
  const fieldDefinitions = useMemo(
    () =>
      withScanRuleFields(collection?.game?.fieldDefinitions ?? [], collection?.game?.foilTypes ?? []),
    [collection?.game?.fieldDefinitions, collection?.game?.foilTypes],
  );
  const playSoundForCard = useSoundRulePlayer(collection?.game?.guid, fieldDefinitions);
  const needsBinContents = !!set?.isRepackMode || hasMaxCopiesBins(configs);

  const phaseRef = useRef<ScannerPhase>("idle");
  const runningRef = useRef(false);
  const heldArrivalRef = useRef(false);
  const binCountsRef = useRef(new Map<number, number>());
  const binCountsLoadedRef = useRef(false);
  const binContentsLoadedRef = useRef(false);
  const [binDataReloadAttempt, setBinDataReloadAttempt] = useState(0);
  const lastCardIdRef = useRef<string | null>(null);
  const pendingDuplicateRef = useRef<IdentifyOutcome | null>(null);
  const binContentsRef = useRef<BinContentCard[]>([]);
  const locallyUpdatedConfigsRef = useRef<BinConfig[] | null>(null);

  const latest = {
    sorter,
    collection,
    set,
    configs,
    fieldDefinitions,
    orgSettings,
    billing,
    binRoutes,
    binHeights,
    binHeightsFailed,
    orgId,
    capture,
    saveCard,
    saveUnmatched,
    playSoundForCard,
    autoFeed,
    allowDuplicates,
    handScanActive,
  };
  const latestRef = useRef(latest);
  latestRef.current = latest;

  const setPhase = useCallback((next: ScannerPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const pause = useCallback(
    (reason: ScannerPauseReason, detail?: string) => {
      runningRef.current = false;
      setIsRunning(false);
      setPauseReason(reason);
      setPauseDetail(detail ?? null);
      setPhase("paused");
      if (reason !== "user") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },
    [setPhase],
  );

  useEffect(() => {
    setPhase("loading-models");
    warmScanModels()
      .then(() => {
        if (phaseRef.current === "loading-models") setPhase("ready");
      })
      .catch((err: unknown) => {
        setModelError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
  }, [setPhase]);

  useEffect(() => {
    if (!sorter.isReady && !handScanActive && runningRef.current) pause("sorter-disconnected");
  }, [sorter.isReady, handScanActive, pause]);

  useEffect(() => {
    binCountsLoadedRef.current = configs.length === 0;
    if (!collection || configs.length === 0) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const windows = configs.map((bin) => ({
      binNumber: bin.binNumber,
      lastEmptiedAt: bin.lastEmptiedAt ?? null,
    }));
    void fetchBinCounts(collection.guid, windows)
      .then((counts) => {
        if (cancelled) return;
        binCountsRef.current = new Map(counts.map((c) => [c.binNumber, c.count]));
        binCountsLoadedRef.current = true;
      })
      .catch((error: unknown) => {
        console.warn("Loading bin counts failed, retrying", error);
        if (!cancelled) retryTimer = setTimeout(() => setBinDataReloadAttempt((n) => n + 1), BIN_DATA_RETRY_MS);
      });
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [collection, configs, binDataReloadAttempt]);

  useEffect(() => {
    locallyUpdatedConfigsRef.current = null;
  }, [configs]);

  useEffect(() => {
    binContentsRef.current = [];
    binContentsLoadedRef.current = !needsBinContents;
    if (!collection || !needsBinContents) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const windows = configs
      .filter((bin) => !bin.isCatchAll)
      .map((bin) => ({ binNumber: bin.binNumber, lastEmptiedAt: bin.lastEmptiedAt ?? null }));
    void fetchBinContents(collection.guid, windows)
      .then((contents) => {
        if (cancelled) return;
        binContentsRef.current = contents.map((entry) => ({ ...entry, card: toRuleCard(entry.card, entry) }));
        binContentsLoadedRef.current = true;
      })
      .catch((error: unknown) => {
        console.warn("Loading bin contents failed, retrying", error);
        if (!cancelled) retryTimer = setTimeout(() => setBinDataReloadAttempt((n) => n + 1), BIN_DATA_RETRY_MS);
      });
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [collection, configs, needsBinContents, binDataReloadAttempt]);

  const routeFor = useCallback((binNumber: number): BinRoute => {
    const { binRoutes: routes, sorter: s } = latestRef.current;
    return (
      routes?.find((r) => r.binNumber === binNumber) ?? {
        binNumber,
        module: s.device?.moduleCount ?? 1,
        direction: "bottom",
      }
    );
  }, []);

  const countInBin = useCallback((binNumber: number) => binCountsRef.current.get(binNumber) ?? 0, []);

  const binCapacity = useCallback((binNumber: number): number | null => {
    const { set: binSet, configs: binConfigs, binHeights: heights, collection: activeCollection } = latestRef.current;
    const bin = binConfigs.find((c) => c.binNumber === binNumber);
    if (!bin) return null;
    const height = heights?.find((h) => h.binNumber === binNumber)?.height;
    const physicalCapacity = computeBinCapacity(height, activeCollection?.game?.cardThickness);
    const chaosBinSize = binSet?.isChaosMode && !bin.isCatchAll ? (binSet.chaosBinSize ?? null) : null;
    return chaosBinSize != null ? Math.min(physicalCapacity ?? chaosBinSize, chaosBinSize) : physicalCapacity;
  }, []);

  const isBinFull = useCallback(
    (binNumber: number) => {
      const capacity = binCapacity(binNumber);
      return capacity != null && countInBin(binNumber) >= capacity;
    },
    [binCapacity, countInBin],
  );

  const binRoom = useCallback(
    (binNumber: number) => {
      const capacity = binCapacity(binNumber);
      return capacity == null ? Number.POSITIVE_INFINITY : capacity - countInBin(binNumber);
    },
    [binCapacity, countInBin],
  );

  const applyAutoAssign = useCallback(
    (configs: BinConfig[], target: AutoAssignTarget) => {
      const ctx = latestRef.current;
      const updatedConfigs = applyAutoAssignTarget(configs, target);
      locallyUpdatedConfigsRef.current = updatedConfigs;
      const assigned = updatedConfigs.find((c) => c.binNumber === target.binNumber);
      void saveBinConfig({
        binNumber: target.binNumber,
        gameGuid: ctx.collection?.game?.guid,
        rules: target.rules,
        isCatchAll: !!assigned?.isCatchAll,
        isDisabled: !!assigned?.isDisabled,
        overflowBin: assigned?.overflowBin ?? null,
      })
        .then(() => queryClient.invalidateQueries({ queryKey: binSetsQueryOptions(ctx.orgId).queryKey }))
        .catch((error: unknown) => console.warn("Saving the learned auto-assign rule failed", error));
    },
    [queryClient],
  );

  const recordPickListFound = useCallback(
    (configs: BinConfig[], match: PickListMatch) => {
      const { orgId: activeOrgId } = latestRef.current;
      const updatedPickList = match.bin.pickList
        ? applyPickListFound(match.bin.pickList, match.entry.name, 1)
        : null;
      if (updatedPickList) {
        locallyUpdatedConfigsRef.current = configs.map((c) =>
          c.binNumber === match.bin.binNumber ? { ...c, pickList: updatedPickList } : c,
        );
      }
      void markPickListFound(match.bin.guid, { name: match.entry.name, delta: 1 })
        .then(() => queryClient.invalidateQueries({ queryKey: binSetsQueryOptions(activeOrgId).queryKey }))
        .catch((error: unknown) => console.warn("Failed to record pick list find", error));
    },
    [queryClient],
  );

  const pushFeed = useCallback((entry: ScanFeedEntry) => {
    setFeed((current) => [
      entry,
      ...current
        .slice(0, SESSION_FEED_LIMIT - 1)
        .map((item, index) =>
          index >= SESSION_FEED_IMAGE_LIMIT - 1 && item.capturedImageUrl ? { ...item, capturedImageUrl: undefined } : item,
        ),
    ]);
    setSessionCount((count) => count + 1);
  }, []);

  const triggerFeedRef = useRef<() => void>(() => {});
  const onCardArrivedRef = useRef<() => void>(() => {});

  const continueAfterCard = useCallback(() => {
    const ctx = latestRef.current;
    if (ctx.handScanActive) {
      if (phaseRef.current !== "paused") setPhase("ready");
      return;
    }
    if (runningRef.current && ctx.autoFeed) triggerFeedRef.current();
  }, [setPhase]);

  const handleRouteResponse = useCallback(
    (response: unknown) => {
      const res = response as SorterMessage | null;
      if (!res) {
        pause("route-failed");
        return;
      }
      if (res.skipped) {
        pause("route-failed");
        return;
      }
      if (res.empty) {
        pause("feeder-empty");
        return;
      }
      if (res.error) {
        const jam = String(res.error).match(ROUTE_TIMEOUT_MODULE_PATTERN);
        pause(jam ? "jam" : "route-failed", jam ? jam[1] : String(res.error));
        return;
      }
      if (res.fedNext) return;
      if (runningRef.current && latestRef.current.autoFeed) triggerFeedRef.current();
      else if (phaseRef.current === "routing") setPhase("ready");
    },
    [pause, setPhase],
  );

  const sendToBin = useCallback(
    (binNumber: number) => {
      const { sorter: s } = latestRef.current;
      if (phaseRef.current !== "paused") setPhase("routing");
      const feedNext = runningRef.current && latestRef.current.autoFeed && !!s.device?.pipelinedFeed;
      void s.sendRoute(routeFor(binNumber), { feedNext }).then(handleRouteResponse);
    },
    [handleRouteResponse, routeFor, setPhase],
  );

  const handleSaveResult = useCallback(
    (result: CardSaveResult) => {
      if (result.success) return;
      if (result.binLimitReached) pause("bin-full");
      else if (result.sorterLimitReached) pause("sorter-limit");
      else if (result.scanLimitReached) pause("scan-limit");
      else pause("collection-locked", result.message);
    },
    [pause],
  );

  const handleMatched = useCallback(
    (outcome: IdentifyOutcome, force = false) => {
      const ctx = latestRef.current;
      const card = outcome.card;
      if (!card || !ctx.collection) return;
      if (!force && !ctx.allowDuplicates && lastCardIdRef.current === card.id) {
        pendingDuplicateRef.current = outcome;
        pause("duplicate");
        return;
      }
      lastCardIdRef.current = card.id;
      if (!binCountsLoadedRef.current || !binContentsLoadedRef.current || ctx.binHeightsFailed) {
        pause("bin-data-unavailable");
        return;
      }
      const ruleCard = toRuleCard(card, { isFoil: false, foilType: null });
      const configs = locallyUpdatedConfigsRef.current ?? ctx.configs;
      const routingContext: ScanRoutingContext = {
        binSet: ctx.set,
        configs,
        fieldDefinitions: ctx.fieldDefinitions,
        binContents: binContentsRef.current,
        countCardsInBin: countInBin,
        isBinFull,
        binRoom,
        createRuleId: () => Crypto.randomUUID(),
      };
      const decision = resolveScanBin(ruleCard, routingContext);
      if (decision.action === "pause") {
        pause(decision.reason === "all-packs-complete" ? "repack-complete" : "bin-full");
        return;
      }
      if (decision.autoAssignTarget) applyAutoAssign(configs, decision.autoAssignTarget);
      if (decision.pickListMatch) recordPickListFound(configs, decision.pickListMatch);
      const record: ScannedCard = {
        scanId: Crypto.randomUUID(),
        card,
        scannedAt: Date.now(),
        binNumber: decision.bin?.binNumber,
        capturedImageUrl: outcome.capturedImageUrl ?? undefined,
        alternativeMatches: outcome.alternativeMatches.length ? outcome.alternativeMatches : undefined,
        lowConfidenceMatch: outcome.matched?.lowConfidenceMatch || decision.isLowMatch || undefined,
        vectorizedOn: "web",
      };
      if (record.binNumber != null) {
        binCountsRef.current.set(record.binNumber, countInBin(record.binNumber) + 1);
        if (ctx.set?.isRepackMode || hasMaxCopiesBins(configs)) {
          binContentsRef.current = [
            { scanId: record.scanId, binNumber: record.binNumber, scannedAt: record.scannedAt, card: ruleCard },
            ...binContentsRef.current,
          ];
        }
      }
      const filledPack =
        record.binNumber != null &&
        isScanFillingLastRepackPack(record.binNumber, { ...routingContext, binContents: binContentsRef.current });
      pushFeed({
        scanId: record.scanId,
        scannedAt: record.scannedAt,
        card,
        binNumber: record.binNumber,
        capturedImageUrl: record.capturedImageUrl,
        lowConfidence: record.lowConfidenceMatch,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTimeout(() => ctx.playSoundForCard(ruleCard), 0);
      queryClient.setQueryData(billingQueryOptions(ctx.orgId).queryKey, (old) =>
        old ? { ...old, cardsScannedToday: old.cardsScannedToday + 1 } : old,
      );

      if (filledPack) pause("repack-complete");
      if (record.binNumber != null && ctx.sorter.isReady) sendToBin(record.binNumber);
      else if (!filledPack) continueAfterCard();

      void ctx
        .saveCard({
          orgId: ctx.orgId,
          collectionGuid: ctx.collection.guid,
          deviceGuid: ctx.sorter.device?.guid,
          record: { ...record, diagnostics: outcome.matched?.diagnostics },
        })
        .then(handleSaveResult)
        .catch(() => pause("save-failed"));
    },
    [
      applyAutoAssign,
      binRoom,
      continueAfterCard,
      countInBin,
      handleSaveResult,
      isBinFull,
      pause,
      pushFeed,
      queryClient,
      recordPickListFound,
      sendToBin,
    ],
  );

  const handleUnmatched = useCallback(
    (outcome: IdentifyOutcome) => {
      const ctx = latestRef.current;
      if (!ctx.collection) return;
      const catchAll = getCatchAllBin(ctx.configs);
      if (catchAll && isBinFull(catchAll.binNumber)) {
        pause("bin-full");
        return;
      }
      if (catchAll) binCountsRef.current.set(catchAll.binNumber, countInBin(catchAll.binNumber) + 1);
      const scanId = Crypto.randomUUID();
      const scannedAt = Date.now();
      pushFeed({
        scanId,
        scannedAt,
        card: null,
        binNumber: catchAll?.binNumber,
        capturedImageUrl: outcome.capturedImageUrl ?? undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      lastCardIdRef.current = null;
      if (catchAll && ctx.sorter.isReady) sendToBin(catchAll.binNumber);
      else continueAfterCard();

      void ctx
        .saveUnmatched({
          orgId: ctx.orgId,
          collectionGuid: ctx.collection.guid,
          deviceGuid: ctx.sorter.device?.guid,
          record: {
            scanId,
            scannedAt,
            capturedImageUrl: outcome.capturedImageUrl ?? undefined,
            binNumber: catchAll?.binNumber,
            vectorizedOn: "web",
            diagnostics: outcome.noMatch?.diagnostics,
            embedding: outcome.noMatch?.embedding ?? undefined,
          },
        })
        .then(handleSaveResult)
        .catch(() => pause("save-failed"));
    },
    [continueAfterCard, countInBin, handleSaveResult, isBinFull, pause, pushFeed, sendToBin],
  );

  const runCapture = useCallback(async () => {
    const ctx = latestRef.current;
    if (!ctx.collection) return;
    const device = ctx.sorter.device;
    const atLimit =
      ctx.billing?.plan === "free" &&
      ctx.billing.dailyLimit != null &&
      ctx.billing.cardsScannedToday >= ctx.billing.dailyLimit;
    if (atLimit) {
      pause("scan-limit");
      return;
    }
    setPhase("capturing");
    await delay(device?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS);
    setPhase("identifying");
    const gameKey = ctx.collection.game?.key ?? "";
    try {
      const outcome = await identifyCard(
        ctx.capture,
        {
          scope: { collectionGuid: ctx.collection.guid },
          matchesNeeded: device?.matchesNeeded ?? DEFAULT_MATCHES_NEEDED,
          checkBothOrientations: device?.checkBothOrientations ?? DEFAULT_CHECK_BOTH_ORIENTATIONS,
          ocrEnabled: !!ctx.orgSettings?.ocrEnabled && (OCR_REGIONS_BY_GAME_KEY[gameKey]?.length ?? 0) > 0,
          colorBarRegionKey: COLOR_BAR_REGIONS_BY_GAME_KEY[gameKey] ? gameKey : null,
        },
        device?.scanRegion ?? DEFAULT_SCAN_REGION,
      );
      if (outcome.card) handleMatched(outcome);
      else handleUnmatched(outcome);
      if (!runningRef.current && phaseRef.current !== "paused") setPhase("ready");
    } catch (err) {
      pause("route-failed", err instanceof Error ? err.message : String(err));
    }
  }, [handleMatched, handleUnmatched, pause, setPhase]);

  const handleFeedResult = useCallback(
    (reply: SorterMessage | null) => {
      if (!reply) {
        pause("feed-failed");
        return;
      }
      if (reply.empty) {
        pause("feeder-empty");
        return;
      }
      if (reply.error) {
        pause("feed-failed", String(reply.error));
        return;
      }
      if (reply.detected === false) {
        pause("no-card");
        return;
      }
      onCardArrivedRef.current();
    },
    [pause],
  );

  const triggerFeed = useCallback(() => {
    setPhase("feeding");
    void latestRef.current.sorter.feed().then(handleFeedResult);
  }, [handleFeedResult, setPhase]);
  triggerFeedRef.current = triggerFeed;

  const onCardArrived = useCallback(() => {
    if (!runningRef.current) {
      heldArrivalRef.current = true;
      return;
    }
    void runCapture();
  }, [runCapture]);
  onCardArrivedRef.current = onCardArrived;

  useSorterMessage((message) => {
    const fields = message as SorterMessage | null;
    if (fields?.error === SERIAL_JAM_ERROR && runningRef.current) {
      pause("jam", fields.module != null ? String(fields.module) : undefined);
      return;
    }
    if (!isFedEvent(message)) return;
    if (!runningRef.current) {
      if (!message.error) heldArrivalRef.current = true;
      return;
    }
    handleFeedResult(message);
  });

  const canStart =
    !!collection &&
    (sorter.isReady || handScanActive) &&
    !modelError &&
    phase !== "loading-models" &&
    !isRunning;

  const start = useCallback(() => {
    const ctx = latestRef.current;
    if (!ctx.collection || (!ctx.sorter.isReady && !ctx.handScanActive)) return;
    runningRef.current = true;
    setIsRunning(true);
    setPauseReason(null);
    setPauseDetail(null);
    const duplicate = pendingDuplicateRef.current;
    if (duplicate) {
      pendingDuplicateRef.current = null;
      handleMatched(duplicate, true);
      return;
    }
    if (heldArrivalRef.current) {
      heldArrivalRef.current = false;
      void runCapture();
      return;
    }
    if (ctx.handScanActive || !ctx.autoFeed) {
      setPhase("ready");
      return;
    }
    triggerFeed();
  }, [handleMatched, runCapture, setPhase, triggerFeed]);

  const pauseByUser = useCallback(() => pause("user"), [pause]);

  const scanOnce = useCallback(() => {
    if (runningRef.current) return;
    void runCapture();
  }, [runCapture]);

  const feedOnce = useCallback(async () => {
    if (!latestRef.current.sorter.isReady || !latestRef.current.collection) return;
    if (runningRef.current) {
      if (!latestRef.current.autoFeed && phaseRef.current === "ready") triggerFeed();
      return;
    }
    setPhase("feeding");
    const reply = await latestRef.current.sorter.feed();
    if (!reply || reply.empty || reply.error || reply.detected === false) {
      handleFeedResult(reply);
      return;
    }
    await runCapture();
  }, [handleFeedResult, runCapture, setPhase, triggerFeed]);

  const setAutoFeed = useCallback(
    (value: boolean) => {
      setAutoFeedState(value);
      latestRef.current = { ...latestRef.current, autoFeed: value };
      if (value && runningRef.current && phaseRef.current === "ready") triggerFeed();
    },
    [triggerFeed],
  );

  const handScanTrackerRef = useRef(createHandScanTracker());
  const trackLiveCorners = useCallback(
    (corners: LiveCorners | null) => {
      if (!latestRef.current.handScanActive) return;
      const canCapture = runningRef.current && phaseRef.current === "ready";
      if (handScanTrackerRef.current.update(corners, canCapture)) void runCapture();
    },
    [runCapture],
  );

  const setHandScan = useCallback((value: boolean) => {
    setHandScanState(value);
    writeKv(HAND_SCAN_KEY, value ? "true" : null);
  }, []);

  return {
    phase,
    pauseReason,
    pauseDetail,
    feed,
    sessionCount,
    modelError,
    isRunning,
    canStart,
    start,
    pause: pauseByUser,
    resume: start,
    scanOnce,
    feedOnce,
    autoFeed,
    setAutoFeed,
    allowDuplicates,
    setAllowDuplicates,
    handScan,
    setHandScan,
    handScanActive,
    trackLiveCorners,
  };
}
