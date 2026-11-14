import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAutoAssignTarget,
  prepareMatchedScanPlan,
  prepareUnmatchedScanPlan,
  scanCompletionPauseReason,
  applyPickListFound,
  scanBinCapacity,
  computeBinCount,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CARD_CONDITION,
  DEFAULT_FEEDER_CALIBRATION,
  feedWithRetries,
  findScannerControlCommandProblem,
  runScanWorkflow,
  runScanDisposition,
  parseShareLinkUrl,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  getCatchAllBin,
  getChaosBins,
  hasMaxCopiesBins,
  isFedEvent,
  isFeedTimeoutReply,
  OCR_REGIONS_BY_GAME_KEY,
  SERIAL_JAM_ERROR,
  type SerialReply,
  toRuleCard,
  withScanRuleFields,
  presetMatchGameKeys,
  presetMatchedGameOptions,
  type AutoAssignTarget,
  type BinConfig,
  type BinContentCard,
  type BinRoute,
  type CardCondition,
  type ScanPickListUpdate,
  type ScannerControlCommand,
  type ScanRoutingContext,
  readsPrintedLanguageEveryScan,
  scanOcrMode,
} from "@magic-vault/shared";
import {
  binHeightsQueryOptions,
  feederConfigQueryOptions,
} from "@/features/calibration/api/calibration-configs";
import { releaseScanLock } from "@/features/collections/api/collections";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import {
  binRoutesQueryOptions,
  binSetsQueryOptions,
} from "@/features/devices/api/devices";
import { billingQueryOptions } from "@/features/org/api/billing";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import {
  fetchBinContents,
  fetchBinCounts,
} from "@/features/scanner/api/bin-counts";
import {
  activateBinSet,
  emptyBins,
  markPickListFound,
  saveBinConfig,
} from "@/features/rules/api/bin-sets";
import { sendSortOnlyScan } from "@/features/scanner/api/scan-saves";
import { gamesQueryOptions } from "@/features/games/api/games";
import { usePendingSaves } from "@/features/scanner/api/use-pending-saves";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { configsFromSet } from "@/features/scanner/lib/bin-routing";
import { createHandScanTracker } from "@/features/scanner/lib/hand-scan";
import { identifyCard } from "@/features/scanner/lib/identify";
import { readScannerQrText } from "@/features/scanner/lib/scanner-control-code";
import { warmScanModels } from "@/features/scanner/lib/inference";
import { reportSerialEvent } from "@/features/sorter/api/serial-events";
import { useSorter, useSorterMessage } from "@/features/sorter/api/use-sorter";
import { useAppStream } from "@/features/stream/api/use-app-stream";
import { useSoundRulePlayer } from "@/features/sounds/api/use-sound-rule-player";
import { useActiveOrgId } from "@/hooks/use-org";
import {
  BIN_DATA_RETRY_MS,
  CONTROL_CARD_NOTICE_DURATION_MS,
  SESSION_FEED_IMAGE_LIMIT,
  SESSION_FEED_LIMIT,
} from "@/lib/constants/scanner";
import { HAND_SCAN_BINS_KEY, HAND_SCAN_KEY } from "@/lib/constants/storage-keys";
import { readKv, writeKv } from "@/lib/storage/kv";
import { ROUTE_TIMEOUT_MODULE_PATTERN } from "@/lib/constants/sorter";
import type {
  CapturedFrame,
  CardSaveResult,
  ControlCardNotice,
  FeedCommand,
  IdentifyOutcome,
  LiveCorners,
  RoutedCardTarget,
  ScanFeedEntry,
  ScannerPauseReason,
  ScannerPhase,
  ScanSessionInputs,
  ScanSessionValue,
  SorterEventDetails,
} from "@/lib/interfaces/scanner";
import { delay } from "@/lib/delay";

export function useScanSession({
  capture,
}: ScanSessionInputs): ScanSessionValue {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const sorter = useSorter();
  const { saveCard, saveUnmatched } = usePendingSaves();
  const { collection, collections, setScanTargetGuid } = useScanTarget();
  const { data: binSets } = useQuery(binSetsQueryOptions(orgId));
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(orgId));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const { data: binRoutes } = useQuery(
    binRoutesQueryOptions(sorter.device?.guid ?? null),
  );
  const { data: feederConfig } = useQuery(
    feederConfigQueryOptions(sorter.device?.guid ?? null),
  );
  const { data: binHeights, isError: binHeightsFailed } = useQuery(
    binHeightsQueryOptions(sorter.device?.guid ?? null),
  );

  const [phase, setPhaseState] = useState<ScannerPhase>("idle");
  const [pauseReason, setPauseReason] = useState<ScannerPauseReason | null>(
    null,
  );
  const [pauseDetail, setPauseDetail] = useState<string | null>(null);
  const [feed, setFeed] = useState<ScanFeedEntry[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoFeed, setAutoFeedState] = useState(true);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const [handScan, setHandScanState] = useState(
    () => readKv(HAND_SCAN_KEY) !== "false",
  );
  const [handScanBins, setHandScanBinsState] = useState(
    () => readKv(HAND_SCAN_BINS_KEY) === "true",
  );
  const routesIntoBins = sorter.isConnected || handScanBins;
  const handScanActive = handScan && !sorter.isReady;

  const set = useMemo(() => {
    const forGame = (binSets ?? []).filter(
      (s) =>
        (s.game?.guid ?? undefined) === (collection?.game?.guid ?? undefined),
    );
    return forGame.find((s) => s.isActive) ?? forGame[0];
  }, [binSets, collection?.game?.guid]);
  const moduleCount = sorter.device?.moduleCount ?? 0;
  const binCount = moduleCount
    ? computeBinCount(moduleCount)
    : Math.max(0, ...(set?.bins ?? []).map((bin) => bin.binNumber));
  const configs = useMemo(
    () => (binCount && routesIntoBins ? configsFromSet(set, binCount) : []),
    [set, binCount, routesIntoBins],
  );
  const removal = useScanRemoval({
    collectionGuid: collection?.guid ?? null,
    binConfigs: configs,
  });
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const fieldDefinitions = useMemo(
    () =>
      withScanRuleFields(
        collection?.game?.fieldDefinitions ?? [],
        collection?.game?.foilTypes ?? [],
        collection?.game?.key,
        undefined,
        presetMatchedGameOptions(set, games),
      ),
    [
      collection?.game?.fieldDefinitions,
      collection?.game?.foilTypes,
      collection?.game?.key,
      set,
      games,
    ],
  );
  const playSoundForCard = useSoundRulePlayer(
    collection?.game?.guid,
    fieldDefinitions,
  );
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
    collections,
    binSets,
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
    removal,
    feedRetryCount:
      feederConfig?.feedRetryCount ?? DEFAULT_FEEDER_CALIBRATION.feedRetryCount,
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
      if (reason !== "user")
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
    },
    [setPhase],
  );

  const [fullBinNumbers, setFullBinNumbers] = useState<number[]>([]);
  const pauseForFullBins = useCallback(
    (binNumbers: number[]) => {
      setFullBinNumbers(binNumbers);
      pause("bin-full", binNumbers.join(", "));
    },
    [pause],
  );

  const [scanCondition, setScanConditionState] = useState<CardCondition>(
    DEFAULT_CARD_CONDITION,
  );
  const scanConditionRef = useRef<CardCondition>(DEFAULT_CARD_CONDITION);
  const setScanCondition = useCallback((condition: CardCondition) => {
    scanConditionRef.current = condition;
    setScanConditionState(condition);
  }, []);
  const [controlCardNotice, setControlCardNotice] =
    useState<ControlCardNotice | null>(null);
  useEffect(() => {
    if (!controlCardNotice) return;
    const dismissTimer = setTimeout(
      () => setControlCardNotice(null),
      CONTROL_CARD_NOTICE_DURATION_MS,
    );
    return () => clearTimeout(dismissTimer);
  }, [controlCardNotice]);

  const [forcedFoilType, setForcedFoilTypeState] = useState<string | null>(
    null,
  );
  const [forcedSetCodes, setForcedSetCodesState] = useState<string[]>([]);
  const forcedFoilTypeRef = useRef<string | null>(null);
  const forcedSetCodesRef = useRef<string[]>([]);
  const setForcedFoilType = useCallback((foilType: string | null) => {
    forcedFoilTypeRef.current = foilType;
    setForcedFoilTypeState(foilType);
  }, []);
  const setForcedSetCodes = useCallback((setCodes: string[]) => {
    forcedSetCodesRef.current = setCodes;
    setForcedSetCodesState(setCodes);
  }, []);

  const forcedValuesAfterCollectionSwitchRef = useRef<Pick<
    ScannerControlCommand,
    "forcedFoilType" | "forcedSetCode"
  > | null>(null);
  const lockedCollectionGuidRef = useRef<string | null>(null);
  useEffect(() => {
    const previous = lockedCollectionGuidRef.current;
    const next = collection?.guid ?? null;
    if (previous && previous !== next) {
      releaseScanLock(previous).catch(() => {});
      const forcedValues = forcedValuesAfterCollectionSwitchRef.current;
      forcedValuesAfterCollectionSwitchRef.current = null;
      setForcedSetCodes(
        forcedValues?.forcedSetCode ? [forcedValues.forcedSetCode] : [],
      );
      setForcedFoilType(forcedValues?.forcedFoilType ?? null);
    }
    lockedCollectionGuidRef.current = next;
  }, [collection?.guid, setForcedSetCodes, setForcedFoilType]);
  useEffect(
    () => () => {
      const guid = lockedCollectionGuidRef.current;
      if (guid) releaseScanLock(guid).catch(() => {});
    },
    [],
  );

  const { deployNotice } = useAppStream();
  const handledDeployNoticeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!deployNotice || handledDeployNoticeRef.current === deployNotice.guid)
      return;
    handledDeployNoticeRef.current = deployNotice.guid;
    const pauseOnDeploy =
      latestRef.current.orgSettings?.pauseScanningOnDeploy ?? true;
    if (runningRef.current && pauseOnDeploy) pause("deploy");
  }, [deployNotice, pause]);

  const reportSorterEvent = useCallback((event: SorterEventDetails) => {
    const ctx = latestRef.current;
    reportSerialEvent({
      ...event,
      collectionGuid: ctx.collection?.guid,
      deviceGuid: ctx.sorter.device?.guid,
    });
  }, []);

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
    if (!sorter.isReady && !handScanActive && runningRef.current)
      pause("sorter-disconnected");
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
        binCountsRef.current = new Map(
          counts.map((c) => [c.binNumber, c.count]),
        );
        binCountsLoadedRef.current = true;
      })
      .catch((error: unknown) => {
        console.warn("Loading bin counts failed, retrying", error);
        if (!cancelled)
          retryTimer = setTimeout(
            () => setBinDataReloadAttempt((n) => n + 1),
            BIN_DATA_RETRY_MS,
          );
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
      .map((bin) => ({
        binNumber: bin.binNumber,
        lastEmptiedAt: bin.lastEmptiedAt ?? null,
      }));
    void fetchBinContents(collection.guid, windows)
      .then((contents) => {
        if (cancelled) return;
        binContentsRef.current = contents.map((entry) => ({
          ...entry,
          card: toRuleCard(entry.card, entry),
        }));
        binContentsLoadedRef.current = true;
      })
      .catch((error: unknown) => {
        console.warn("Loading bin contents failed, retrying", error);
        if (!cancelled)
          retryTimer = setTimeout(
            () => setBinDataReloadAttempt((n) => n + 1),
            BIN_DATA_RETRY_MS,
          );
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

  const countInBin = useCallback(
    (binNumber: number) => binCountsRef.current.get(binNumber) ?? 0,
    [],
  );

  const binCapacity = useCallback((binNumber: number): number | null => {
    const {
      set: binSet,
      configs: binConfigs,
      binHeights: heights,
      collection: activeCollection,
    } = latestRef.current;
    const bin = binConfigs.find((c) => c.binNumber === binNumber);
    if (!bin) return null;
    const height = heights?.find((h) => h.binNumber === binNumber)?.height;
    return scanBinCapacity(
      height,
      activeCollection?.game?.cardThickness,
      binSet,
      bin,
    );
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
      return capacity == null
        ? Number.POSITIVE_INFINITY
        : capacity - countInBin(binNumber);
    },
    [binCapacity, countInBin],
  );

  const applyAutoAssign = useCallback(
    (configs: BinConfig[], target: AutoAssignTarget) => {
      const ctx = latestRef.current;
      const updatedConfigs = applyAutoAssignTarget(configs, target);
      locallyUpdatedConfigsRef.current = updatedConfigs;
      const assigned = updatedConfigs.find(
        (c) => c.binNumber === target.binNumber,
      );
      void saveBinConfig({
        binNumber: target.binNumber,
        gameGuid: ctx.collection?.game?.guid,
        rules: target.rules,
        isCatchAll: !!assigned?.isCatchAll,
        isDisabled: !!assigned?.isDisabled,
        overflowBin: assigned?.overflowBin ?? null,
      })
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: binSetsQueryOptions(ctx.orgId).queryKey,
          }),
        )
        .catch((error: unknown) =>
          console.warn("Saving the learned auto-assign rule failed", error),
        );
    },
    [queryClient],
  );

  const recordPickListFound = useCallback(
    (configs: BinConfig[], update: ScanPickListUpdate, persist = true) => {
      const { orgId: activeOrgId } = latestRef.current;
      const bin = configs.find((item) => item.guid === update.binGuid);
      const updatedPickList = bin?.pickList
        ? applyPickListFound(bin.pickList, update.name, update.delta)
        : null;
      if (updatedPickList) {
        locallyUpdatedConfigsRef.current = configs.map((c) =>
          c.binNumber === update.binNumber
            ? { ...c, pickList: updatedPickList }
            : c,
        );
      }
      if (!persist) return;
      void markPickListFound(update.binGuid, {
        name: update.name,
        delta: update.delta,
      })
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: binSetsQueryOptions(activeOrgId).queryKey,
          }),
        )
        .catch((error: unknown) =>
          console.warn("Failed to record pick list find", error),
        );
    },
    [queryClient],
  );

  const pushFeed = useCallback((entry: ScanFeedEntry) => {
    setFeed((current) => [
      entry,
      ...current
        .slice(0, SESSION_FEED_LIMIT - 1)
        .map((item, index) =>
          index >= SESSION_FEED_IMAGE_LIMIT - 1 && item.capturedImageUrl
            ? { ...item, capturedImageUrl: undefined }
            : item,
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
    (response: unknown, target: RoutedCardTarget) => {
      const res = response as SerialReply | null;
      if (!res) {
        reportSorterEvent({
          command: "bin",
          sent: true,
          response: null,
          ...target,
        });
        pause("route-failed");
        return;
      }
      if (res.skipped) {
        pause("route-failed");
        return;
      }
      if (res.noLoadedCard) {
        reportSorterEvent({
          command: "bin",
          sent: true,
          response: res,
          ...target,
        });
        pause("card-missing");
        return;
      }
      if (res.empty) {
        reportSorterEvent({
          command: "bin",
          sent: true,
          response: res,
          ...target,
        });
        pause("feeder-empty");
        return;
      }
      if (res.error) {
        reportSorterEvent({
          command: "bin",
          sent: true,
          response: res,
          ...target,
        });
        const jam = String(res.error).match(ROUTE_TIMEOUT_MODULE_PATTERN);
        pause(jam ? "jam" : "route-failed", jam ? jam[1] : String(res.error));
        return;
      }
      if (res.fedNext) return;
      if (runningRef.current && latestRef.current.autoFeed)
        triggerFeedRef.current();
      else if (phaseRef.current === "routing") setPhase("ready");
    },
    [pause, setPhase, reportSorterEvent],
  );

  const sendToBin = useCallback(
    (binNumber: number, cardName?: string) => {
      const { sorter: s } = latestRef.current;
      if (phaseRef.current !== "paused") setPhase("routing");
      const feedNext =
        runningRef.current &&
        latestRef.current.autoFeed &&
        !!s.device?.pipelinedFeed;
      void s
        .sendRoute(routeFor(binNumber), { feedNext, requireLoadedCard: true })
        .then((response) =>
          handleRouteResponse(response, { binNumber, cardName }),
        );
    },
    [handleRouteResponse, routeFor, setPhase],
  );

  const handleSaveResult = useCallback(
    (result: CardSaveResult, binNumber: number | undefined) => {
      if (result.success) return;
      if (result.binLimitReached)
        pauseForFullBins(binNumber != null ? [binNumber] : []);
      else if (result.sorterLimitReached) pause("sorter-limit");
      else if (result.scanLimitReached) pause("scan-limit");
      else pause("collection-locked", result.message);
    },
    [pause, pauseForFullBins],
  );

  const handleMatched = useCallback(
    async (outcome: IdentifyOutcome) => {
      const ctx = latestRef.current;
      const card = outcome.card;
      if (!card || !ctx.collection) return;
      lastCardIdRef.current = card.id;
      if (
        !binCountsLoadedRef.current ||
        !binContentsLoadedRef.current ||
        ctx.binHeightsFailed
      ) {
        pause("bin-data-unavailable");
        return;
      }
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
      const plan = prepareMatchedScanPlan(
        {
          scanId: Crypto.randomUUID(),
          scannedAt: Date.now(),
          card,
          capturedImageUrl: outcome.capturedImageUrl ?? undefined,
          gameKey: ctx.collection.game?.key,
          isNudgeFoilDetectionEnabled: false,
          isFoilStarDetectionEnabled:
            ctx.orgSettings?.foilStarDetectionEnabled ?? false,
          alternativeMatches: outcome.alternativeMatches,
          sessionFoilType: forcedFoilTypeRef.current,
          fallbackFoilTypes: ctx.collection.game?.foilTypes ?? [],
          condition: scanConditionRef.current,
          lowConfidenceMatch: outcome.matched?.lowConfidenceMatch,
          diagnostics: outcome.matched?.diagnostics,
          vectorizedOn: "web",
          deviceGuid: ctx.sorter.device?.guid,
        },
        routingContext,
      );
      const { record, ruleCard } = plan;
      const collectionGuid = ctx.collection.guid;
      let filledPack = false;
      await runScanDisposition({
        prepare: () => plan,
        hold: async (plan) => {
          if (plan.action !== "pause") return false;
          if (plan.reason === "all-packs-complete") pause("repack-complete");
          else if (plan.reason === "all-chaos-bins-full") {
            pauseForFullBins(getChaosBins(configs).map((bin) => bin.binNumber));
          } else pauseForFullBins(plan.bin ? [plan.bin.binNumber] : []);
          return false;
        },
        assign: (plan) => {
          if (plan.action !== "route") return;
          if (plan.autoAssignTarget)
            applyAutoAssign(configs, plan.autoAssignTarget);
          if (record.binNumber != null) {
            binCountsRef.current.set(
              record.binNumber,
              countInBin(record.binNumber) + 1,
            );
            if (
              plan.binContent &&
              (ctx.set?.isRepackMode || hasMaxCopiesBins(configs))
            ) {
              binContentsRef.current = [
                plan.binContent,
                ...binContentsRef.current,
              ];
            }
          }
          filledPack = !!scanCompletionPauseReason(plan, {
            ...routingContext,
            binContents: binContentsRef.current,
          });
        },
        pick: (plan) => {
          if (plan.pickListUpdate)
            recordPickListFound(
              configs,
              plan.pickListUpdate,
              plan.persistence.kind === "cards/sorted",
            );
        },
        route: () => {
          pushFeed({
            scanId: record.scanId,
            scannedAt: record.scannedAt,
            card,
            binNumber: record.binNumber,
            capturedImageUrl: record.capturedImageUrl,
            lowConfidence: record.lowConfidenceMatch,
          });
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
          setTimeout(() => ctx.playSoundForCard(ruleCard), 0);
          queryClient.setQueryData(
            billingQueryOptions(ctx.orgId).queryKey,
            (old) =>
              old
                ? { ...old, cardsScannedToday: old.cardsScannedToday + 1 }
                : old,
          );

          if (filledPack) pause("repack-complete");
          if (record.binNumber != null && ctx.sorter.isReady)
            sendToBin(record.binNumber, card.name);
          else if (!filledPack) continueAfterCard();
        },
        persist: () => {
          const saving =
            plan.persistence.kind === "cards/sorted"
              ? sendSortOnlyScan(
                  ctx.orgId,
                  collectionGuid,
                  plan.persistence.record,
                )
              : ctx.saveCard({
                  orgId: ctx.orgId,
                  collectionGuid,
                  deviceGuid: ctx.sorter.device?.guid,
                  record: plan.persistence.record,
                });
          void saving
            .then((result) => handleSaveResult(result, record.binNumber))
            .catch(() => pause("save-failed"))
            .finally(() => {
              if (plan.pickListUpdate)
                void queryClient.invalidateQueries({
                  queryKey: binSetsQueryOptions(ctx.orgId).queryKey,
                });
            });
        },
        complete: () => {},
      });
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
    async (outcome: IdentifyOutcome) => {
      const ctx = latestRef.current;
      if (!ctx.collection) return;
      const collectionGuid = ctx.collection.guid;
      const scanId = Crypto.randomUUID();
      const scannedAt = Date.now();
      await runScanDisposition({
        prepare: () =>
          prepareUnmatchedScanPlan(
            {
              scanId,
              scannedAt,
              capturedImageUrl: outcome.capturedImageUrl ?? undefined,
              vectorizedOn: "web",
              diagnostics: outcome.noMatch?.diagnostics,
              embedding: outcome.noMatch?.embedding,
            },
            {
              binSet: ctx.set,
              configs: locallyUpdatedConfigsRef.current ?? ctx.configs,
              fieldDefinitions: ctx.fieldDefinitions,
              binContents: binContentsRef.current,
              countCardsInBin: countInBin,
              isBinFull,
              binRoom,
              createRuleId: () => Crypto.randomUUID(),
            },
          ),
        hold: async (plan) => {
          pauseForFullBins(plan.bin ? [plan.bin.binNumber] : []);
          return false;
        },
        assign: (plan) => {
          const binNumber = plan.record.binNumber;
          if (binNumber != null)
            binCountsRef.current.set(binNumber, countInBin(binNumber) + 1);
        },
        pick: () => {},
        route: (plan) => {
          pushFeed({ ...plan.record, card: null });
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
          lastCardIdRef.current = null;
          if (plan.record.binNumber != null && ctx.sorter.isReady)
            sendToBin(plan.record.binNumber);
          else continueAfterCard();
        },
        persist: (plan) => {
          if (plan.persistence.kind === "none") return;
          void ctx
            .saveUnmatched({
              orgId: ctx.orgId,
              collectionGuid,
              deviceGuid: ctx.sorter.device?.guid,
              record: plan.persistence.record,
            })
            .then((result) => handleSaveResult(result, plan.record.binNumber))
            .catch(() => pause("save-failed"));
        },
        complete: () => {},
      });
    },
    [
      binRoom,
      continueAfterCard,
      countInBin,
      handleSaveResult,
      isBinFull,
      pause,
      pauseForFullBins,
      pushFeed,
      sendToBin,
    ],
  );

  const routeControlCard = useCallback(() => {
    const ctx = latestRef.current;
    lastCardIdRef.current = null;
    const catchAll = getCatchAllBin(ctx.configs);
    if (catchAll && ctx.sorter.isReady) sendToBin(catchAll.binNumber);
    else continueAfterCard();
  }, [continueAfterCard, sendToBin]);

  const applyControlCode = useCallback(
    async (command: ScannerControlCommand | null) => {
      const ctx = latestRef.current;
      const problem = command
        ? findScannerControlCommandProblem(command, {
            collections: ctx.collections ?? [],
            presets: ctx.binSets ?? [],
            activeCollectionGuid: ctx.collection?.guid,
          })
        : "unreadable";
      if (!command || problem) {
        pause(`control-card-${problem ?? "unreadable"}` as const);
        routeControlCard();
        return;
      }

      if (command.pauseScanner) pause("control-card");
      if (command.autoFeed !== undefined) {
        setAutoFeedState(command.autoFeed);
        latestRef.current = {
          ...latestRef.current,
          autoFeed: command.autoFeed,
        };
      }
      if (command.allowDuplicates !== undefined)
        setAllowDuplicates(command.allowDuplicates);
      if (command.condition) setScanCondition(command.condition);
      const switchesCollection =
        !!command.collectionGuid &&
        command.collectionGuid !== ctx.collection?.guid;
      if (switchesCollection && ctx.collection) {
        forcedValuesAfterCollectionSwitchRef.current = {
          forcedFoilType: command.forcedFoilType,
          forcedSetCode: command.forcedSetCode,
        };
      } else {
        if (command.forcedFoilType !== undefined)
          setForcedFoilType(command.forcedFoilType);
        if (command.forcedSetCode !== undefined) {
          setForcedSetCodes(
            command.forcedSetCode ? [command.forcedSetCode] : [],
          );
        }
      }
      try {
        if (switchesCollection && command.collectionGuid)
          setScanTargetGuid(command.collectionGuid);
        const preset = ctx.binSets?.find(
          (binSet) => binSet.guid === command.presetGuid,
        );
        if (preset && !preset.isActive) {
          const nextBinSets = await activateBinSet(preset.guid);
          queryClient.setQueryData(
            binSetsQueryOptions(ctx.orgId).queryKey,
            nextBinSets,
          );
        }
      } catch {
        forcedValuesAfterCollectionSwitchRef.current = null;
        pause("control-card-switch-failed");
        routeControlCard();
        return;
      }
      setControlCardNotice({ noticeId: Crypto.randomUUID(), command });
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      routeControlCard();
    },
    [
      pause,
      queryClient,
      routeControlCard,
      setForcedFoilType,
      setForcedSetCodes,
      setScanCondition,
      setScanTargetGuid,
    ],
  );

  const runCapture = useCallback(async () => {
    const ctx = latestRef.current;
    if (!ctx.collection) return;
    const device = ctx.sorter.device;
    const atLimit =
      !!ctx.billing &&
      ctx.billing.dailyLimit != null &&
      ctx.billing.cardsScannedToday >= ctx.billing.dailyLimit;
    if (atLimit) {
      pause("scan-limit");
      return;
    }
    setPhase("capturing");
    if (ctx.sorter.isReady)
      await delay(
        device?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
      );
    setPhase("identifying");
    const gameKey = ctx.collection.game?.key ?? "";
    try {
      await runScanWorkflow<{ frame: CapturedFrame | null }, IdentifyOutcome>({
        controlStage: "after-miss",
        capture: async () => ({ frame: null }),
        readControl: (captured) =>
          captured.frame ? readScannerQrText(captured.frame) : null,
        applyOtherCode: (text) => {
          const shareLink = parseShareLinkUrl(text);
          if (!shareLink) return false;
          pause("user");
          router.push({ pathname: "/shared-link", params: { ...shareLink } });
          return true;
        },
        applyControl: applyControlCode,
        identify: (captured) =>
          identifyCard(
            async () => (captured.frame = await ctx.capture()),
            {
              scope: {
                collectionGuid: ctx.collection!.guid,
                preferredSetCodes: forcedSetCodesRef.current,
                matchGameKeys: presetMatchGameKeys(ctx.set),
              },
              matchesNeeded: device?.matchesNeeded ?? DEFAULT_MATCHES_NEEDED,
              checkBothOrientations:
                device?.checkBothOrientations ??
                DEFAULT_CHECK_BOTH_ORIENTATIONS,
              ocrMode: scanOcrMode(
                ctx.orgSettings,
                (OCR_REGIONS_BY_GAME_KEY[gameKey]?.length ?? 0) > 0,
                readsPrintedLanguageEveryScan(ctx.collection, gameKey),
              ),
              gameKey: gameKey || null,
            },
            device?.scanRegion ?? DEFAULT_SCAN_REGION,
          ),
        card: (outcome) => outcome.card,
        isRemoval: () => latestRef.current.removal.isActive,
        remove: async (outcome) => {
          const catchAllBinNumber =
            getCatchAllBin(ctx.configs)?.binNumber ?? null;
          let removalTargetBin = catchAllBinNumber;
          if (outcome.card) {
            const wasQueued =
              await latestRef.current.removal.queueMatchedCardForRemoval(
                outcome.card,
                outcome.alternativeMatches,
              );
            if (wasQueued)
              removalTargetBin = latestRef.current.removal.removalBinNumber;
          } else {
            latestRef.current.removal.showNoMatchNotice();
          }
          if (latestRef.current.sorter.isReady && removalTargetBin != null) {
            sendToBin(removalTargetBin, outcome.card?.name);
          } else {
            continueAfterCard();
          }
        },
        isDuplicate: (card) =>
          !latestRef.current.allowDuplicates &&
          lastCardIdRef.current === card.id,
        duplicate: (outcome) => {
          pendingDuplicateRef.current = outcome;
          pause("duplicate");
        },
        matched: (outcome) => handleMatched(outcome),
        unmatched: handleUnmatched,
      });
      if (!runningRef.current && phaseRef.current !== "paused")
        setPhase("ready");
    } catch (err) {
      pause("route-failed", err instanceof Error ? err.message : String(err));
    }
  }, [
    applyControlCode,
    continueAfterCard,
    handleMatched,
    handleUnmatched,
    pause,
    sendToBin,
    setPhase,
  ]);

  const handleFeedResult = useCallback(
    (reply: SerialReply | null, command: FeedCommand = "auto-feed") => {
      if (!reply || reply.empty || reply.error || reply.detected === false) {
        reportSorterEvent({ command, sent: true, response: reply });
      }
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
    [pause, reportSorterEvent],
  );

  const feedWithConfiguredRetries = useCallback(
    (retryCount: number) =>
      feedWithRetries(
        () => latestRef.current.sorter.feed(),
        (reply) => reply,
        retryCount,
      ),
    [],
  );

  const triggerFeed = useCallback(() => {
    setPhase("feeding");
    void feedWithConfiguredRetries(latestRef.current.feedRetryCount).then(
      handleFeedResult,
    );
  }, [feedWithConfiguredRetries, handleFeedResult, setPhase]);
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
    const fields = message as SerialReply | null;
    if (fields?.error === SERIAL_JAM_ERROR && runningRef.current) {
      reportSorterEvent({ command: "jam", sent: true, response: fields });
      pause("jam", fields.module != null ? String(fields.module) : undefined);
      return;
    }
    if (!isFedEvent(message)) return;
    if (!runningRef.current) {
      if (!message.error) heldArrivalRef.current = true;
      return;
    }
    const { feedRetryCount } = latestRef.current;
    if (feedRetryCount > 0 && isFeedTimeoutReply(message)) {
      setPhase("feeding");
      void feedWithConfiguredRetries(feedRetryCount - 1).then(handleFeedResult);
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
      void handleMatched(duplicate);
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

  const markFullBinsEmpty = useCallback(async (): Promise<boolean> => {
    const ctx = latestRef.current;
    if (fullBinNumbers.length === 0) return false;
    try {
      await emptyBins(fullBinNumbers, ctx.collection?.game?.guid);
    } catch {
      return false;
    }
    for (const binNumber of fullBinNumbers)
      binCountsRef.current.set(binNumber, 0);
    setFullBinNumbers([]);
    await queryClient.invalidateQueries({
      queryKey: binSetsQueryOptions(ctx.orgId).queryKey,
    });
    start();
    return true;
  }, [fullBinNumbers, queryClient, start]);

  const scanOnce = useCallback(() => {
    if (runningRef.current) return;
    void runCapture();
  }, [runCapture]);

  const feedOnce = useCallback(async () => {
    if (!latestRef.current.sorter.isReady || !latestRef.current.collection)
      return;
    if (runningRef.current) {
      if (!latestRef.current.autoFeed && phaseRef.current === "ready")
        triggerFeed();
      return;
    }
    setPhase("feeding");
    const reply = await feedWithConfiguredRetries(
      latestRef.current.feedRetryCount,
    );
    if (!reply || reply.empty || reply.error || reply.detected === false) {
      handleFeedResult(reply, "feeder");
      return;
    }
    await runCapture();
  }, [
    feedWithConfiguredRetries,
    handleFeedResult,
    runCapture,
    setPhase,
    triggerFeed,
  ]);

  const setAutoFeed = useCallback(
    (value: boolean) => {
      setAutoFeedState(value);
      latestRef.current = { ...latestRef.current, autoFeed: value };
      if (value && runningRef.current && phaseRef.current === "ready")
        triggerFeed();
    },
    [triggerFeed],
  );

  const handScanTrackerRef = useRef(createHandScanTracker());
  const trackLiveCorners = useCallback(
    (corners: LiveCorners | null) => {
      if (!latestRef.current.handScanActive) return;
      const canCapture = runningRef.current && phaseRef.current === "ready";
      if (handScanTrackerRef.current.update(corners, canCapture))
        void runCapture();
    },
    [runCapture],
  );

  const setHandScan = useCallback((value: boolean) => {
    setHandScanState(value);
    writeKv(HAND_SCAN_KEY, value ? "true" : "false");
  }, []);

  const setHandScanBins = useCallback((value: boolean) => {
    setHandScanBinsState(value);
    writeKv(HAND_SCAN_BINS_KEY, value ? "true" : null);
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
    handScanBins,
    setHandScanBins,
    handScanActive,
    trackLiveCorners,
    forcedFoilType,
    setForcedFoilType,
    forcedSetCodes,
    setForcedSetCodes,
    scanCondition,
    setScanCondition,
    controlCardNotice,
    fullBinNumbers,
    markFullBinsEmpty,
    binConfigs: configs,
    removal,
  };
}
