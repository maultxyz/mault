import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeBinCount,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  getCatchAllBin,
  isFedEvent,
  OCR_REGIONS_BY_GAME_KEY,
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  SERIAL_JAM_ERROR,
  toRuleCard,
  withScanRuleFields,
  type BinRoute,
  type ScannedCard,
} from "@magic-vault/shared";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { binRoutesQueryOptions, binSetsQueryOptions } from "@/features/devices/api/devices";
import { billingQueryOptions } from "@/features/org/api/billing";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { fetchBinCounts } from "@/features/scanner/api/bin-counts";
import { usePendingSaves } from "@/features/scanner/api/use-pending-saves";
import { configsFromSet, resolveBin } from "@/features/scanner/lib/bin-routing";
import { identifyCard } from "@/features/scanner/lib/identify";
import { warmScanModels } from "@/features/scanner/lib/inference";
import { useSorter, useSorterMessage } from "@/features/sorter/api/use-sorter";
import { useActiveOrgId } from "@/hooks/use-org";
import { RECENT_SCANS_LIMIT } from "@/lib/constants/scanner";
import { ROUTE_TIMEOUT_MODULE_PATTERN } from "@/lib/constants/sorter";
import type {
  CardSaveResult,
  IdentifyOutcome,
  ScanFeedEntry,
  ScannerPauseReason,
  ScannerPhase,
  ScanSessionInputs,
  ScanSessionValue,
  UnsupportedScanMode,
} from "@/lib/interfaces/scanner";
import type { SorterMessage } from "@/lib/interfaces/sorter";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const [phase, setPhaseState] = useState<ScannerPhase>("idle");
  const [pauseReason, setPauseReason] = useState<ScannerPauseReason | null>(null);
  const [pauseDetail, setPauseDetail] = useState<string | null>(null);
  const [feed, setFeed] = useState<ScanFeedEntry[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const collection = collections?.find((c) => c.isActive) ?? null;
  const set = useMemo(() => {
    const forGame = (binSets ?? []).filter(
      (s) => (s.game?.guid ?? undefined) === (collection?.game?.guid ?? undefined),
    );
    return forGame.find((s) => s.isActive) ?? forGame[0];
  }, [binSets, collection?.game?.guid]);
  const moduleCount = sorter.device?.moduleCount ?? 0;
  const configs = useMemo(
    () => (moduleCount ? configsFromSet(set, computeBinCount(moduleCount)) : []),
    [set, moduleCount],
  );
  const fieldDefinitions = useMemo(
    () =>
      withScanRuleFields(collection?.game?.fieldDefinitions ?? [], collection?.game?.foilTypes ?? []),
    [collection?.game?.fieldDefinitions, collection?.game?.foilTypes],
  );
  const unsupportedMode: UnsupportedScanMode | null = set?.isRepackMode
    ? "repack"
    : set?.autoAssignField
      ? "auto-assign"
      : null;

  const phaseRef = useRef<ScannerPhase>("idle");
  const runningRef = useRef(false);
  const heldArrivalRef = useRef(false);
  const binCountsRef = useRef(new Map<number, number>());

  const latest = {
    sorter,
    collection,
    set,
    configs,
    fieldDefinitions,
    orgSettings,
    billing,
    binRoutes,
    orgId,
    capture,
    saveCard,
    saveUnmatched,
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
    if (!sorter.isReady && runningRef.current) pause("sorter-disconnected");
  }, [sorter.isReady, pause]);

  useEffect(() => {
    if (!collection || configs.length === 0) return;
    const windows = configs.map((bin) => ({
      binNumber: bin.binNumber,
      lastEmptiedAt: bin.lastEmptiedAt ?? null,
    }));
    void fetchBinCounts(collection.guid, windows)
      .then((counts) => {
        binCountsRef.current = new Map(counts.map((c) => [c.binNumber, c.count]));
      })
      .catch(() => {});
  }, [collection, configs]);

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

  const isBinFull = useCallback(
    (binNumber: number) => {
      const { set: s, configs: cfg } = latestRef.current;
      const bin = cfg.find((c) => c.binNumber === binNumber);
      if (!s?.isChaosMode || !s.chaosBinSize || !bin || bin.isCatchAll) return false;
      return countInBin(binNumber) >= s.chaosBinSize;
    },
    [countInBin],
  );

  const pushFeed = useCallback((entry: ScanFeedEntry) => {
    setFeed((current) => [entry, ...current].slice(0, RECENT_SCANS_LIMIT));
    setSessionCount((count) => count + 1);
  }, []);

  const triggerFeedRef = useRef<() => void>(() => {});
  const onCardArrivedRef = useRef<() => void>(() => {});

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
      if (runningRef.current) triggerFeedRef.current();
      else if (phaseRef.current === "routing") setPhase("ready");
    },
    [pause, setPhase],
  );

  const sendToBin = useCallback(
    (binNumber: number) => {
      const { sorter: s } = latestRef.current;
      setPhase("routing");
      const feedNext = runningRef.current && !!s.device?.pipelinedFeed;
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
    (outcome: IdentifyOutcome) => {
      const ctx = latestRef.current;
      const card = outcome.card;
      if (!card || !ctx.collection) return;
      const ruleCard = toRuleCard(card, { isFoil: false, foilType: null });
      const decision = resolveBin(ruleCard, {
        set: ctx.set,
        configs: ctx.configs,
        fieldDefinitions: ctx.fieldDefinitions,
        countInBin,
        isBinFull,
      });
      if (decision.allChaosBinsFull || (decision.bin && isBinFull(decision.bin.binNumber))) {
        pause("bin-full");
        return;
      }
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
      }
      pushFeed({
        scanId: record.scanId,
        scannedAt: record.scannedAt,
        card,
        binNumber: record.binNumber,
        capturedImageUrl: record.capturedImageUrl,
        lowConfidence: record.lowConfidenceMatch,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      queryClient.setQueryData(billingQueryOptions(ctx.orgId).queryKey, (old) =>
        old ? { ...old, cardsScannedToday: old.cardsScannedToday + 1 } : old,
      );

      if (record.binNumber != null && ctx.sorter.isReady) sendToBin(record.binNumber);
      else if (runningRef.current) triggerFeedRef.current();

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
    [countInBin, handleSaveResult, isBinFull, pause, pushFeed, queryClient, sendToBin],
  );

  const handleUnmatched = useCallback(
    (outcome: IdentifyOutcome) => {
      const ctx = latestRef.current;
      if (!ctx.collection) return;
      const catchAll = getCatchAllBin(ctx.configs);
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

      if (catchAll && ctx.sorter.isReady) sendToBin(catchAll.binNumber);
      else if (runningRef.current) triggerFeedRef.current();

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
    [handleSaveResult, pause, pushFeed, sendToBin],
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
    sorter.isReady &&
    !unsupportedMode &&
    !modelError &&
    phase !== "loading-models" &&
    !isRunning;

  const start = useCallback(() => {
    if (!latestRef.current.collection || !latestRef.current.sorter.isReady) return;
    runningRef.current = true;
    setIsRunning(true);
    setPauseReason(null);
    setPauseDetail(null);
    if (heldArrivalRef.current) {
      heldArrivalRef.current = false;
      void runCapture();
      return;
    }
    triggerFeed();
  }, [runCapture, triggerFeed]);

  const pauseByUser = useCallback(() => pause("user"), [pause]);

  const scanOnce = useCallback(() => {
    if (runningRef.current) return;
    void runCapture();
  }, [runCapture]);

  return {
    phase,
    pauseReason,
    pauseDetail,
    feed,
    sessionCount,
    modelError,
    isRunning,
    unsupportedMode,
    canStart,
    start,
    pause: pauseByUser,
    resume: start,
    scanOnce,
  };
}
