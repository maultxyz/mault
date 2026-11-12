import { SCAN_RATE_WINDOW_MS } from "@/lib/constants/scanner";
import {
  type BinConfig,
  type BinContentCard,
  type CardCondition,
  DEFAULT_CARD_CONDITION,
  type BinRoute,
  type EmptyBinOptions,
  type MatchedScanDetails,
  type PlayingCard,
  type PlayingCardWithDistance,
  type ScanVectorizeSource,
  type ScannedCard,
  type UnmatchedCard,
  type UnmatchedScanDetails,
  type AutoAssignTarget,
  type ScanRoutingContext,
  applyAutoAssignTarget,
  findAutoAssignTarget,
  evaluatePickListBin,
  applyPickListFound,
  isPickListComplete,
  isPickListBin,
  findPickListEntry,
  reservePickListBins,
  findLowMatchCatchAll,
  isRulesMode,
  matchScanBin,
  prepareMatchedScanPlan,
  prepareUnmatchedScanPlan,
  scanCompletionPauseReason,
  runScanDisposition,
  getCatchAllBin,
  getChaosBins,
  getRepackPackBins,
  hasMaxCopiesBins,
  toRuleCard,
  UNMATCHED_PREVIEW_COUNT,
  withCardTags,
  type CardTag,
} from "@magic-vault/shared";

import { billingQueryOptions } from "@/features/billing/api/billing";
import { recordSupportPromptScan } from "@/features/billing/lib/support-prompt";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { announcePolitely } from "@/lib/live-announcer";
import { useFeederConfig } from "@/features/calibration/api/use-feeder-config";
import { recordPickListFound } from "@/features/bins/api/use-pick-list";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useDevice } from "@/features/calibration/api/use-device";
import { loadBinContents } from "@/features/collections/api/collection-cards";
import {
  confirmCollectionCard,
  identifyUnmatchedCard as identifyUnmatchedCardApi,
  loadUnmatchedCards,
  markCollectionCardReviewed,
  recordSortOnlyScan,
  releaseScanLock,
  removeCollectionCard,
  removeCollectionCards,
  moveCollectionCardsToCollection,
  removeUnmatchedCard as removeUnmatchedCardApi,
  clearUnmatchedCards as clearUnmatchedCardsApi,
  setCollectionCardTags,
  setCollectionCardBin,
  setCollectionCardsCondition,
  setCollectionCardLanguage,
  setCollectionCardStamp,
  setCollectionCardsFoilType,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  findInCardPages,
  invalidateBinCounts,
  invalidateCollectionCards,
  invalidateUnmatchedCards,
  removeFromCardPages,
  updateInCardPages,
} from "@/features/collections/lib/card-page-cache";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { usePiScanSettings } from "@/features/scanner/api/use-pi-scan-settings";
import { useAutoFeed } from "@/features/scanner/api/use-auto-feed";
import { useDeployScanPause } from "@/features/scanner/api/use-deploy-pause";
import { useComputedBinFillLevels } from "@/features/scanner/api/use-computed-bin-fill-levels";
import { useJamToast } from "@/features/scanner/api/use-jam-toast";
import { usePendingScanSaves } from "@/features/scanner/api/use-pending-scan-saves";
import { usePiHost } from "@/hooks/use-pi-host";
import { useSessionMonitor } from "@/features/scanner/api/use-session-monitor";
import { useScanTimer } from "@/features/scanner/api/use-scan-timer";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { BinCorrectionDialog } from "@/features/scanner/components/bin-correction-dialog";
import { routeCardToBin } from "@/features/scanner/lib/route-card-to-bin";
import { showSorterLimitToast } from "@/features/scanner/lib/sorter-limit-toast";
import { useSoundRulePlayer } from "@/features/sounds/api/use-sound-rule-player";
import type {
  BinCorrection,
  CorrectedBinTarget,
  LastRoutedBin,
  MoveCardsToCollectionInput,
  PendingBinCard,
  JamToastOptions,
  ScannedCardsContextValue,
  ScanPlacement,
} from "@/lib/interfaces/scanner";
import type { StationAttention } from "@/lib/interfaces/stations";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { generateScanId } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useCollectionLocks } from "@/lib/app-stream";
import { useIgnoreIrSensors } from "@/features/scanner/lib/ignore-ir-sensors";

const ScannedCardsContext = createContext<ScannedCardsContextValue | null>(
  null,
);

export function ScannedCardsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const [unmatchedCards, setUnmatchedCards] = useState<UnmatchedCard[]>([]);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const unmatchedRequestRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const {
    configs: binConfigs,
    ruleFieldDefinitions: fieldDefinitions,
    selectedSet,
    save: saveBinConfig,
    emptyBin,
  } = useBinConfigs();
  const [binLimitBin, setBinLimitBin] = useState<BinConfig | null>(null);
  const [fullBins, setFullBinsState] = useState<number[] | null>(null);
  const [fullBinCount, setFullBinCount] = useState(0);
  const lastBinLimitBinRef = useRef<BinConfig | null>(null);
  const lastFullBinsRef = useRef<number[] | null>(null);
  const setFullBins = useCallback((bins: number[] | null) => {
    if (bins) lastFullBinsRef.current = bins;
    setFullBinsState(bins);
    setFullBinCount((count) =>
      bins == null ? 0 : count === 0 ? bins.length : count,
    );
  }, []);
  const { routes: binRoutes } = useBinRoutes();
  const device = useDevice();
  const deviceGuidRef = useRef(device?.guid);
  deviceGuidRef.current = device?.guid;
  const { feederConfig } = useFeederConfig();
  const feedRetryCountRef = useRef(feederConfig.feedRetryCount);
  feedRetryCountRef.current = feederConfig.feedRetryCount;
  const pipelinedFeedRef = useRef(device?.pipelinedFeed ?? false);
  pipelinedFeedRef.current = device?.pipelinedFeed ?? false;
  const hasCustomFeedSourceRef = useRef<() => boolean>(() => false);
  const isPipelinedFeedEnabled = useCallback(
    () => pipelinedFeedRef.current && !hasCustomFeedSourceRef.current(),
    [],
  );
  const { sendRoute, sendRequest, isConnected, isReady } = useSerial();
  const { activeCollection, emptyCollection } = useCollections();
  const playSoundForCard = useSoundRulePlayer(
    activeCollection?.game?.guid,
    fieldDefinitions,
  );

  const { locks, currentUserId } = useCollectionLocks();
  const locksRef = useRef(locks);
  const currentUserIdRef = useRef(currentUserId);

  const { activeOrg } = useOrg();
  const activeOrgIdRef = useRef(activeOrg?.id);
  const { saveCard, saveUnmatched } = usePendingScanSaves();
  const { sorterLimitReason, reportStationAttention } = useStations();
  const { station: currentStation } = useStation();
  const sorterLimitReasonRef = useRef(sorterLimitReason);
  sorterLimitReasonRef.current = sorterLimitReason;
  const queryClient = useQueryClient();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const correctionBinPromptRef = useRef(true);
  correctionBinPromptRef.current = orgSettings?.correctionBinPrompt ?? true;
  const isNudgeFoilDetectionEnabledRef = useRef(false);
  isNudgeFoilDetectionEnabledRef.current =
    orgSettings?.foilDetectionEnabled ?? false;
  const isFoilStarDetectionEnabledRef = useRef(false);
  isFoilStarDetectionEnabledRef.current =
    orgSettings?.foilStarDetectionEnabled ?? false;

  useEffect(() => {
    locksRef.current = locks;
  }, [locks]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    activeOrgIdRef.current = activeOrg?.id;
  }, [activeOrg?.id]);

  const { levels: binFillLevels, countsUpdatedAt } = useComputedBinFillLevels();
  const binFillLevelsRef = useRef(binFillLevels);
  binFillLevelsRef.current = binFillLevels;
  const countsUpdatedAtRef = useRef(countsUpdatedAt);
  countsUpdatedAtRef.current = countsUpdatedAt;
  const rawBinConfigsRef = useRef(binConfigs);
  const pendingBinCardsRef = useRef(new Map<string, PendingBinCard>());
  const countPendingCards = useCallback((binNumber: number) => {
    let count = 0;
    for (const [scanId, pending] of pendingBinCardsRef.current) {
      const emptiedAt = rawBinConfigsRef.current.find(
        (bin) => bin.binNumber === pending.binNumber,
      )?.lastEmptiedAt;
      if (
        (emptiedAt != null && pending.scannedAt <= emptiedAt) ||
        (!pending.unsaved &&
          pending.savedAt != null &&
          pending.savedAt < countsUpdatedAtRef.current)
      ) {
        pendingBinCardsRef.current.delete(scanId);
      } else if (pending.binNumber === binNumber) {
        count++;
      }
    }
    return count;
  }, []);
  const isBinFullLocally = useCallback(
    (binNumber: number) => {
      const level = binFillLevelsRef.current.find(
        (l) => l.binNumber === binNumber,
      );
      if (!level?.capacity) return false;
      return level.count + countPendingCards(binNumber) >= level.capacity;
    },
    [countPendingCards],
  );
  const countCardsLocally = useCallback(
    (binNumber: number) => {
      const level = binFillLevelsRef.current.find(
        (l) => l.binNumber === binNumber,
      );
      return (level?.count ?? 0) + countPendingCards(binNumber);
    },
    [countPendingCards],
  );
  const binRoomLocally = useCallback(
    (binNumber: number) => {
      const level = binFillLevelsRef.current.find(
        (l) => l.binNumber === binNumber,
      );
      if (!level?.capacity) return Number.POSITIVE_INFINITY;
      return level.capacity - countCardsLocally(binNumber);
    },
    [countCardsLocally],
  );
  const trackPendingBinCard = useCallback(
    (scanId: string, binNumber: number, scannedAt: number, unsaved = false) => {
      pendingBinCardsRef.current.set(scanId, {
        binNumber,
        scannedAt,
        unsaved,
        savedAt: null,
      });
    },
    [],
  );
  const settlePendingBinCard = useCallback((scanId: string) => {
    const pending = pendingBinCardsRef.current.get(scanId);
    if (pending) pending.savedAt = Date.now();
  }, []);

  const binConfigsRef = useRef(
    isRulesMode(selectedSet) ? reservePickListBins(binConfigs) : binConfigs,
  );
  const binRoutesRef = useRef(binRoutes);
  const fieldDefinitionsRef = useRef(fieldDefinitions);
  const autoAssignFieldRef = useRef(selectedSet?.autoAssignField ?? null);
  const selectedSetRef = useRef(selectedSet);
  const binContentsRef = useRef<BinContentCard[]>([]);
  const [ignoreIrSensors] = useIgnoreIrSensors();
  const serialRef = useRef({
    sendRoute,
    sendRequest,
    isConnected,
    isReady,
    ignoreIrSensors,
  });
  const activeCollectionRef = useRef(activeCollection);
  const emptyCollectionRef = useRef(emptyCollection);
  const prevCollectionGuidRef = useRef<string | undefined>(undefined);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [timerResetSignal, setTimerResetSignal] = useState(0);
  const { elapsedMs, isActive: isTimerActive } = useScanTimer(
    scannerRunning,
    timerResetSignal,
  );
  const [recentScanTimes, setRecentScanTimes] = useState<number[]>([]);
  const [sessionScanCount, setSessionScanCount] = useState(0);
  const [lastRoutedBin, setLastRoutedBin] = useState<LastRoutedBin | null>(
    null,
  );
  const [binCorrection, setBinCorrection] = useState<BinCorrection | null>(
    null,
  );

  const {
    autoFeed,
    isAutoFeedEnabled,
    setAutoFeed,
    isFeedHalted,
    clearFeedHalt,
    pause,
    pauseForAttention,
    attention: feedAttention,
    triggerAutoFeed,
    registerCardArrivedHook,
    registerFeedSource,
    hasCustomFeedSource,
    feedOneCard,
    registerPauseHook,
    resume,
    registerResumeHook,
  } = useAutoFeed({
    serialRef,
    activeCollectionRef,
    deviceGuidRef,
    feedRetryCountRef,
  });
  hasCustomFeedSourceRef.current = hasCustomFeedSource;
  const showJamToastMessage = useJamToast(resume);
  const showJamToast = useCallback(
    (options: JamToastOptions) => {
      pauseForAttention({ kind: "jam", module: options.module });
      showJamToastMessage(options);
    },
    [pauseForAttention, showJamToastMessage],
  );
  const pauseForRoutingFailure = useCallback(
    () => pauseForAttention({ kind: "routingFailed" }),
    [pauseForAttention],
  );
  const [scannerErrorMessage, setScannerErrorMessage] = useState<string | null>(
    null,
  );
  const [scannerErrorRaisedAt, setScannerErrorRaisedAt] = useState(0);
  const reportScannerError = useCallback((message: string | null) => {
    setScannerErrorMessage(message);
    if (message !== null) setScannerErrorRaisedAt(Date.now());
  }, []);
  const attention = useMemo<StationAttention | null>(
    () =>
      feedAttention ??
      (scannerErrorMessage !== null
        ? {
            kind: "scannerError",
            detail: scannerErrorMessage || undefined,
            raisedAt: scannerErrorRaisedAt,
          }
        : null),
    [feedAttention, scannerErrorMessage, scannerErrorRaisedAt],
  );
  useEffect(
    () => reportStationAttention(currentStation.id, attention),
    [reportStationAttention, currentStation.id, attention],
  );
  useEffect(
    () => () => reportStationAttention(currentStation.id, null),
    [reportStationAttention, currentStation.id],
  );
  useDeployScanPause(
    scannerRunning && (orgSettings?.pauseScanningOnDeploy ?? true),
    pause,
    resume,
  );

  const [forceFoilType, setForceFoilTypeState] = useState<string | null>(null);
  const forceFoilTypeRef = useRef<string | null>(null);
  const [forceSetCodes, setForceSetCodes] = useState<string[]>([]);
  const forceSetCodesAfterCollectionSwitchRef = useRef<string[]>([]);
  const [scanCondition, setScanConditionState] = useState<CardCondition>(
    DEFAULT_CARD_CONDITION,
  );
  const scanConditionRef = useRef<CardCondition>(DEFAULT_CARD_CONDITION);

  const pickListsActive = isRulesMode(selectedSet);
  useEffect(() => {
    rawBinConfigsRef.current = binConfigs;
    binConfigsRef.current = pickListsActive
      ? reservePickListBins(binConfigs)
      : binConfigs;
  }, [binConfigs, pickListsActive]);

  useEffect(() => {
    binRoutesRef.current = binRoutes;
  }, [binRoutes]);

  useEffect(() => {
    fieldDefinitionsRef.current = fieldDefinitions;
  }, [fieldDefinitions]);

  useEffect(() => {
    autoAssignFieldRef.current = selectedSet?.autoAssignField ?? null;
  }, [selectedSet?.autoAssignField]);

  useEffect(() => {
    selectedSetRef.current = selectedSet;
  }, [selectedSet]);

  useEffect(() => {
    emptyCollectionRef.current = emptyCollection;
  }, [emptyCollection]);

  useEffect(() => {
    serialRef.current = {
      sendRoute,
      sendRequest,
      isConnected,
      isReady,
      ignoreIrSensors,
    };
  }, [sendRoute, sendRequest, isConnected, isReady, ignoreIrSensors]);

  const scanRoutingContext = useCallback(
    (): ScanRoutingContext => ({
      binSet: selectedSetRef.current,
      configs: rawBinConfigsRef.current,
      fieldDefinitions: fieldDefinitionsRef.current,
      binContents: binContentsRef.current,
      countCardsInBin: countCardsLocally,
      isBinFull: isBinFullLocally,
      binRoom: binRoomLocally,
      createRuleId: () => crypto.randomUUID(),
    }),
    [countCardsLocally, isBinFullLocally, binRoomLocally],
  );

  const applyAutoAssign = useCallback(
    (target: AutoAssignTarget) => {
      rawBinConfigsRef.current = applyAutoAssignTarget(
        rawBinConfigsRef.current,
        target,
      );
      binConfigsRef.current = applyAutoAssignTarget(
        binConfigsRef.current,
        target,
      );
      saveBinConfig({ binNumber: target.binNumber, rules: target.rules });
      return binConfigsRef.current.find(
        (c) => c.binNumber === target.binNumber,
      );
    },
    [saveBinConfig],
  );

  const resolvePickListMatch = useCallback(
    (card: PlayingCardWithDistance) =>
      !isRulesMode(selectedSetRef.current) ||
      findLowMatchCatchAll(card, rawBinConfigsRef.current)
        ? null
        : evaluatePickListBin(card.name, rawBinConfigsRef.current),
    [],
  );

  const markPickListFound = useCallback(
    (binNumber: number, name: string, delta: number) => {
      const bin = rawBinConfigsRef.current.find(
        (c) => c.binNumber === binNumber && isPickListBin(c),
      );
      if (!bin?.pickList) return;
      const next = applyPickListFound(bin.pickList, name, delta);
      if (!next) return;
      rawBinConfigsRef.current = rawBinConfigsRef.current.map((c) =>
        c.binNumber === binNumber ? { ...c, pickList: next } : c,
      );
      void recordPickListFound(queryClient, bin.guid, name, delta);
      if (delta > 0 && isPickListComplete(next)) {
        toast.success(t("scannedCards.pickListComplete.title"), {
          description: t("scannedCards.pickListComplete.description", {
            bin: binNumber,
          }),
        });
      }
    },
    [toast, queryClient, t],
  );

  const pickListNameInBin = useCallback(
    (cardName: string | undefined, binNumber: number | undefined) => {
      if (!cardName || binNumber == null) return undefined;
      const bin = rawBinConfigsRef.current.find(
        (c) => c.binNumber === binNumber && isPickListBin(c),
      );
      return bin?.pickList
        ? findPickListEntry(cardName, bin.pickList)?.name
        : undefined;
    },
    [],
  );

  const resolveCorrectedRuleBin = useCallback(
    (
      ruleCard: PlayingCardWithDistance,
      currentBinNumber: number | undefined,
    ): BinConfig | undefined => {
      const configs = binConfigsRef.current;
      if (selectedSetRef.current?.isChaosMode) {
        const currentBin = configs.find(
          (bin) => bin.binNumber === currentBinNumber,
        );
        if (currentBin && !currentBin.isCatchAll && !currentBin.isDisabled) {
          return currentBin;
        }
      }
      const autoTarget = selectedSetRef.current?.isRepackMode
        ? null
        : findAutoAssignTarget(
            ruleCard,
            configs,
            fieldDefinitionsRef.current,
            autoAssignFieldRef.current,
            () => crypto.randomUUID(),
          );
      if (!autoTarget) return matchScanBin(ruleCard, scanRoutingContext());
      return applyAutoAssign(autoTarget);
    },
    [scanRoutingContext, applyAutoAssign],
  );

  const resolveCorrectedBin = useCallback(
    (
      ruleCard: PlayingCardWithDistance,
      currentBinNumber: number | undefined,
    ): CorrectedBinTarget => {
      const pickMatch = resolvePickListMatch(ruleCard);
      if (pickMatch) {
        return pickMatch.bin.binNumber === currentBinNumber
          ? { bin: pickMatch.bin }
          : { bin: pickMatch.bin, pickListName: pickMatch.entry.name };
      }
      return { bin: resolveCorrectedRuleBin(ruleCard, currentBinNumber) };
    },
    [resolvePickListMatch, resolveCorrectedRuleBin],
  );

  const pauseForCompletePacks = useCallback(() => {
    const set = selectedSetRef.current;
    if (!set) return;
    const packBins = getRepackPackBins(binConfigsRef.current, set)
      .map((bin) => bin.binNumber)
      .sort((a, b) => a - b);
    pauseForAttention({ kind: "packsComplete", binNumbers: packBins });
    setFullBins(packBins);
  }, [pauseForAttention, setFullBins]);

  const tracksBinContents = useCallback(
    () =>
      !!selectedSetRef.current?.isRepackMode ||
      hasMaxCopiesBins(binConfigsRef.current),
    [],
  );

  const resolveRoute = useCallback((binNumber: number): BinRoute => {
    const found = binRoutesRef.current.find((r) => r.binNumber === binNumber);
    if (found) return found;
    const lastModule = Math.max(
      1,
      ...binRoutesRef.current.map((r) => r.module),
    );
    return { binNumber, module: lastModule, direction: "bottom" };
  }, []);

  const setForceFoilType = useCallback((foilType: string | null) => {
    forceFoilTypeRef.current = foilType;
    setForceFoilTypeState(foilType);
  }, []);

  const setLocalScanCondition = useCallback((condition: CardCondition) => {
    scanConditionRef.current = condition;
    setScanConditionState(condition);
  }, []);

  const piScanSettings = usePiScanSettings({
    collectionGuid: activeCollection?.guid,
    condition: scanCondition,
    setCondition: setLocalScanCondition,
    foilType: forceFoilType,
    preferredSetCodes: forceSetCodes,
    setFoilType: setForceFoilType,
    setPreferredSetCodes: setForceSetCodes,
  });

  const setForceSetCodesAfterCollectionSwitch = useCallback(
    (setCodes: string[]) => {
      forceSetCodesAfterCollectionSwitchRef.current = setCodes;
    },
    [],
  );

  useEffect(() => {
    const prev = prevCollectionGuidRef.current;
    const next = activeCollection?.guid;
    if (prev !== next) pendingBinCardsRef.current.clear();
    if (prev && prev !== next) {
      releaseScanLock(prev).catch(() => {});
      setForceSetCodes(forceSetCodesAfterCollectionSwitchRef.current);
      forceSetCodesAfterCollectionSwitchRef.current = [];
    }
    prevCollectionGuidRef.current = next;
    activeCollectionRef.current = activeCollection;
  }, [activeCollection]);

  useEffect(() => {
    return () => {
      const guid = activeCollectionRef.current?.guid;
      if (guid) releaseScanLock(guid).catch(() => {});
    };
  }, []);

  const refreshUnmatched = useCallback(async (guid: string) => {
    const request = ++unmatchedRequestRef.current;
    const result = await loadUnmatchedCards(guid, UNMATCHED_PREVIEW_COUNT);
    if (request !== unmatchedRequestRef.current || !result.data) return;
    setUnmatchedCards(result.data.cards);
    setUnmatchedCount(result.data.total);
  }, []);

  const dropUnmatched = useCallback((scanId: string) => {
    setUnmatchedCards((prev) => prev.filter((c) => c.scanId !== scanId));
    setUnmatchedCount((count) => Math.max(0, count - 1));
  }, []);

  const syncUnmatched = useCallback(
    (guid: string) => {
      refreshUnmatched(guid).catch((err) =>
        console.error("Failed to load unmatched cards:", err),
      );
      void invalidateUnmatchedCards(queryClient, guid);
    },
    [refreshUnmatched, queryClient],
  );

  const activeCollectionGuid = activeCollection?.guid;
  const piHost = usePiHost();
  const piSession = useSessionMonitor(
    piHost ? activeCollectionGuid : undefined,
  );
  useEffect(() => {
    if (!piHost) return;
    setUnmatchedCards(piSession.unmatchedCards);
    setUnmatchedCount(piSession.unmatchedCount);
    setIsLoading(piSession.status === "connecting");
  }, [
    piHost,
    piSession.unmatchedCards,
    piSession.unmatchedCount,
    piSession.status,
  ]);

  useEffect(() => {
    if (piHost) return;
    unmatchedRequestRef.current++;
    setUnmatchedCards([]);
    setUnmatchedCount(0);
    if (!activeCollectionGuid) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    refreshUnmatched(activeCollectionGuid)
      .catch((err) => {
        if (!cancelled) console.error("Failed to load unmatched cards:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCollectionGuid, refreshUnmatched, piHost]);

  const needsBinContents =
    !!selectedSet?.isRepackMode || hasMaxCopiesBins(binConfigs);
  const binContentsWindowsKey = JSON.stringify(
    binConfigs
      .filter((bin) => !bin.isCatchAll)
      .map((bin) => ({
        binNumber: bin.binNumber,
        lastEmptiedAt: bin.lastEmptiedAt ?? null,
      })),
  );

  useEffect(() => {
    binContentsRef.current = [];
    const guid = activeCollection?.guid;
    if (!guid || !needsBinContents) return;

    let cancelled = false;
    loadBinContents(guid, JSON.parse(binContentsWindowsKey))
      .then((contents) => {
        if (cancelled) return;
        binContentsRef.current = contents.map((entry) => ({
          ...entry,
          card: toRuleCard(entry.card, entry),
        }));
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load bin contents:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCollection?.guid, needsBinContents, binContentsWindowsKey]);

  const addCard = useCallback(
    (
      card: PlayingCardWithDistance,
      capturedImageUrl?: string,
      alternativeMatches?: PlayingCardWithDistance[],
      vectorizedOn?: ScanVectorizeSource,
      details?: MatchedScanDetails,
      capturedBackImageUrl?: string,
    ): ScanPlacement | null => {
      const collection = activeCollectionRef.current;
      if (!collection) {
        toast.error(t("scannedCards.noCollectionSelected.title"), {
          description: t("scannedCards.noCollectionSelected.description"),
        });
        return null;
      }

      const lock = locksRef.current?.[collection.guid];
      if (lock && lock.userId !== currentUserIdRef.current) {
        toast.error(t("scannedCards.collectionLocked.title"), {
          description: t("scannedCards.collectionLocked.description"),
        });
        return null;
      }

      const scanId = generateScanId();
      const scannedAt = Date.now();
      let placement: ScanPlacement | null = null;
      void runScanDisposition({
        prepare: () =>
          prepareMatchedScanPlan(
            {
              scanId,
              scannedAt,
              card,
              capturedImageUrl,
              capturedBackImageUrl,
              alternativeMatches,
              gameKey: collection.game?.key,
              isNudgeFoilDetectionEnabled:
                isNudgeFoilDetectionEnabledRef.current,
              isFoilStarDetectionEnabled: isFoilStarDetectionEnabledRef.current,
              sessionFoilType: forceFoilTypeRef.current,
              foilDetection: details?.diagnostics.foilDetection,
              fallbackFoilTypes: collection.game?.foilTypes ?? [],
              condition: scanConditionRef.current,
              lowConfidenceMatch: details?.lowConfidenceMatch,
              diagnostics: details?.diagnostics,
              vectorizedOn,
              deviceGuid: deviceGuidRef.current,
            },
            scanRoutingContext(),
          ),
        hold: async (decision) => {
          if (decision.action === "pause") {
            if (decision.reason === "all-packs-complete") {
              pauseForCompletePacks();
              return false;
            }
            pauseForAttention({
              kind:
                decision.reason === "all-chaos-bins-full"
                  ? "binsFull"
                  : "binLimit",
              binNumbers: decision.bin ? [decision.bin.binNumber] : [],
            });
            if (decision.reason === "all-chaos-bins-full") {
              setFullBins(
                getChaosBins(binConfigsRef.current).map((bin) => bin.binNumber),
              );
            } else {
              setBinLimitBin(decision.bin ?? null);
            }
          }
          return false;
        },
        assign: (decision) => {
          if (decision.action !== "route") return;
          if (decision.autoAssignTarget)
            applyAutoAssign(decision.autoAssignTarget);
          const record = decision.record;
          placement = {
            scanId: record.scanId,
            collectionName: collection.name,
            binNumber: record.binNumber ?? null,
          };
          recordSupportPromptScan();
          announcePolitely(
            record.binNumber != null
              ? t("a11y.scanRoutedToBin", {
                  name: card.name,
                  binNumber: record.binNumber,
                })
              : card.name,
          );
          if (record.binNumber != null) {
            setLastRoutedBin({
              binNumber: record.binNumber,
              at: record.scannedAt,
            });
          }
          setRecentScanTimes((prev) => [
            ...prev.filter(
              (time) => time > record.scannedAt - SCAN_RATE_WINDOW_MS,
            ),
            record.scannedAt,
          ]);
          setSessionScanCount((count) => count + 1);

          if (decision.binContent && tracksBinContents()) {
            binContentsRef.current = [
              decision.binContent,
              ...binContentsRef.current,
            ];
            if (scanCompletionPauseReason(decision, scanRoutingContext()))
              pauseForCompletePacks();
          }

          if (record.binNumber != null) {
            trackPendingBinCard(
              record.scanId,
              record.binNumber,
              record.scannedAt,
              decision.persistence.kind === "cards/sorted",
            );
          }
        },
        pick: (decision) => {
          if (decision.action !== "route") return;
          const update = decision.pickListUpdate;
          if (update)
            markPickListFound(update.binNumber, update.name, update.delta);
        },
        route: async (decision) => {
          const matchedBin = decision.bin;

          if (
            matchedBin &&
            serialRef.current.isConnected &&
            serialRef.current.isReady &&
            !serialRef.current.ignoreIrSensors
          ) {
            await routeCardToBin({
              route: resolveRoute(matchedBin.binNumber),
              sendRoute: serialRef.current.sendRoute,
              toast,
              t,
              failedKey: "scannedCards.routingFailed",
              cardName: card.name,
              collectionGuid: collection.guid,
              deviceGuid: deviceGuidRef.current,
              isAutoFeedEnabled,
              isPipelinedFeedEnabled,
              pause: pauseForRoutingFailure,
              triggerAutoFeed,
              onJam: showJamToast,
            });
          }
        },
        persist: async (decision) => {
          const record = decision.record;
          const matchedBin = decision.bin;
          if (!record) return;
          const orgId = activeOrgIdRef.current;
          const billingQueryKey = orgId
            ? billingQueryOptions(orgId).queryKey
            : undefined;
          if (billingQueryKey) {
            queryClient.setQueryData(billingQueryKey, (old) =>
              old
                ? { ...old, cardsScannedToday: old.cardsScannedToday + 1 }
                : old,
            );
          }
          if (decision.persistence.kind === "cards/sorted") {
            await recordSortOnlyScan(
              collection.guid,
              decision.persistence.record,
              orgId ?? null,
            )
              .then((result) => {
                if (result.success) return;
                pauseForAttention({
                  kind: result.sorterLimitReached ? "sorterLimit" : "scanLimit",
                });
                if (result.sorterLimitReached) {
                  showSorterLimitToast(toast, t, sorterLimitReasonRef.current);
                  return;
                }
                toast.error(t("scannedCards.scanLimitReached.title"), {
                  description: t("scannedCards.scanLimitReached.description"),
                });
              })
              .catch((err) =>
                console.error("Failed to record sorted scan:", err),
              )
              .finally(() => {
                settlePendingBinCard(record.scanId);
                if (billingQueryKey) {
                  void queryClient.invalidateQueries({
                    queryKey: billingQueryKey,
                  });
                }
              });
            return;
          }

          await saveCard({
            orgId: orgId ?? null,
            collectionGuid: collection.guid,
            deviceGuid: deviceGuidRef.current,
            record: decision.persistence.record,
          })
            .then((result) => {
              if (result.success) return;
              binContentsRef.current = binContentsRef.current.filter(
                (c) => c.scanId !== record.scanId,
              );
              if (billingQueryKey) {
                queryClient.setQueryData(billingQueryKey, (old) =>
                  old
                    ? {
                        ...old,
                        cardsScannedToday: Math.max(
                          0,
                          old.cardsScannedToday - 1,
                        ),
                      }
                    : old,
                );
              }
              pauseForAttention({
                kind: result.binLimitReached
                  ? "binLimit"
                  : result.sorterLimitReached
                    ? "sorterLimit"
                    : result.scanLimitReached
                      ? "scanLimit"
                      : "collectionLocked",
                binNumbers: matchedBin ? [matchedBin.binNumber] : [],
              });
              if (result.binLimitReached) {
                setBinLimitBin(matchedBin ?? null);
                return;
              }
              if (result.sorterLimitReached) {
                showSorterLimitToast(toast, t, sorterLimitReasonRef.current);
                return;
              }
              const key = result.scanLimitReached
                ? "scannedCards.scanLimitReached"
                : "scannedCards.collectionLocked";
              toast.error(t(`${key}.title`), {
                description: t(`${key}.description`),
              });
            })
            .catch((err) => {
              console.error("Failed to persist card:", err);
              pauseForAttention({ kind: "saveFailed", detail: card.name });
              toast.error(t("scannedCards.saveFailed.title"), {
                description: t("scannedCards.saveFailed.description", {
                  name: card.name,
                }),
                duration: Infinity,
                dismissible: true,
              });
            })
            .finally(() => {
              settlePendingBinCard(record.scanId);
              void invalidateCollectionCards(queryClient, collection.guid);
              if (billingQueryKey) {
                void queryClient.invalidateQueries({
                  queryKey: billingQueryKey,
                });
              }
            });
        },
        complete: ({ ruleCard }) => {
          setTimeout(() => playSoundForCard(ruleCard), 0);
        },
      });
      return placement;
    },
    [
      toast,
      t,
      scanRoutingContext,
      applyAutoAssign,
      markPickListFound,
      queryClient,
      resolveRoute,
      tracksBinContents,
      isAutoFeedEnabled,
      isPipelinedFeedEnabled,
      pauseForRoutingFailure,
      pauseForAttention,
      triggerAutoFeed,
      showJamToast,
      trackPendingBinCard,
      settlePendingBinCard,
      playSoundForCard,
      setFullBins,
      pauseForCompletePacks,
      saveCard,
    ],
  );

  const resolveBinLimit = useCallback(
    async (options: EmptyBinOptions): Promise<boolean> => {
      const bin = binLimitBin;
      if (!bin) return true;
      const emptied = await emptyBin(bin.binNumber, options).catch((err) => {
        console.error("Failed to mark bin as emptied:", err);
        return false;
      });
      if (emptied) setBinLimitBin(null);
      return emptied;
    },
    [binLimitBin, emptyBin],
  );

  const dismissBinLimit = useCallback(() => setBinLimitBin(null), []);

  useEffect(() => {
    if (binLimitBin) lastBinLimitBinRef.current = binLimitBin;
  }, [binLimitBin]);

  const reopenAttention = useCallback(() => {
    if (!attention) return;
    if (attention.kind === "binLimit") {
      const [binNumber] = attention.binNumbers ?? [];
      const bin =
        binConfigsRef.current.find(
          (config) => config.binNumber === binNumber,
        ) ?? lastBinLimitBinRef.current;
      if (bin) setBinLimitBin(bin);
      return;
    }
    if (attention.kind === "binsFull" || attention.kind === "packsComplete") {
      const bins = lastFullBinsRef.current ?? attention.binNumbers ?? null;
      if (bins?.length) setFullBins(bins);
    }
  }, [attention, setFullBins]);

  const emptyNextFullBin = useCallback(
    async (options: EmptyBinOptions): Promise<boolean> => {
      const [binNumber, ...rest] = fullBins ?? [];
      if (binNumber == null) return true;
      if (!(await emptyBin(binNumber, options))) return false;
      setFullBins(rest.length > 0 ? rest : null);
      return rest.length === 0;
    },
    [fullBins, emptyBin, setFullBins],
  );

  const dismissFullBins = useCallback(() => setFullBins(null), [setFullBins]);

  const routeToBin = useCallback(
    (binNumber: number, failedKey: string, cardName?: string) => {
      if (
        !serialRef.current.isConnected ||
        !serialRef.current.isReady ||
        serialRef.current.ignoreIrSensors
      ) {
        return;
      }
      return routeCardToBin({
        route: resolveRoute(binNumber),
        sendRoute: serialRef.current.sendRoute,
        toast,
        t,
        failedKey,
        cardName,
        collectionGuid: activeCollectionRef.current?.guid,
        deviceGuid: deviceGuidRef.current,
        isAutoFeedEnabled,
        isPipelinedFeedEnabled,
        pause: pauseForRoutingFailure,
        triggerAutoFeed,
        onJam: showJamToast,
      });
    },
    [
      toast,
      t,
      resolveRoute,
      isAutoFeedEnabled,
      isPipelinedFeedEnabled,
      pauseForRoutingFailure,
      triggerAutoFeed,
      showJamToast,
    ],
  );

  const sendCatchAllBin = useCallback(() => {
    const catchAll = getCatchAllBin(binConfigsRef.current);
    if (catchAll) {
      routeToBin(catchAll.binNumber, "scannedCards.routingFailedCatchAll");
    }
  }, [routeToBin]);

  const sendCardToBin = useCallback(
    (binNumber: number, cardName: string) =>
      routeToBin(binNumber, "scannedCards.routingFailed", cardName),
    [routeToBin],
  );

  const addUnmatchedCard = useCallback(
    (
      capturedImageUrl?: string,
      vectorizedOn?: ScanVectorizeSource,
      details?: UnmatchedScanDetails,
      capturedBackImageUrl?: string,
    ): ScanPlacement | null => {
      const collection = activeCollectionRef.current;
      if (!collection) {
        sendCatchAllBin();
        return null;
      }

      let placement: ScanPlacement | null = null;
      const scanId = generateScanId();
      const scannedAt = Date.now();
      void runScanDisposition({
        prepare: () =>
          prepareUnmatchedScanPlan(
            {
              scanId,
              scannedAt,
              capturedImageUrl,
              capturedBackImageUrl,
              vectorizedOn,
              diagnostics: details?.diagnostics,
              embedding: details?.embedding,
            },
            scanRoutingContext(),
          ),
        hold: async (plan) => {
          pauseForAttention({
            kind: "binLimit",
            binNumbers: plan.bin ? [plan.bin.binNumber] : [],
          });
          setBinLimitBin(plan.bin ?? null);
          return false;
        },
        assign: (plan) => {
          const record = plan.record;
          placement = {
            scanId: record.scanId,
            collectionName: collection.name,
            binNumber: record.binNumber ?? null,
          };
          if (record.binNumber != null) {
            setLastRoutedBin({
              binNumber: record.binNumber,
              at: record.scannedAt,
            });
          }
          if (record.binNumber != null) {
            trackPendingBinCard(
              record.scanId,
              record.binNumber,
              record.scannedAt,
              plan.persistence.kind === "none",
            );
          }
          if (plan.persistence.kind === "none") return;
          setUnmatchedCards((prev) =>
            [record, ...prev].slice(0, UNMATCHED_PREVIEW_COUNT),
          );
          setUnmatchedCount((count) => count + 1);
        },
        pick: () => {},
        route: async ({ bin }) => {
          if (bin)
            await routeToBin(
              bin.binNumber,
              "scannedCards.routingFailedCatchAll",
            );
        },
        persist: async (plan) => {
          if (plan.persistence.kind === "none") return;
          const record = plan.record;
          const catchAll = plan.bin;
          const dropRecord = () => {
            dropUnmatched(record.scanId);
            syncUnmatched(collection.guid);
          };
          await saveUnmatched({
            orgId: activeOrgIdRef.current ?? null,
            collectionGuid: collection.guid,
            deviceGuid: deviceGuidRef.current,
            record: plan.persistence.record,
          })
            .then((result) => {
              if (result.success) return;
              dropRecord();
              pauseForAttention({
                kind: result.binLimitReached ? "binLimit" : "saveFailed",
                binNumbers: catchAll ? [catchAll.binNumber] : [],
              });
              if (result.binLimitReached) setBinLimitBin(catchAll ?? null);
            })
            .catch((err) => {
              console.error("Failed to persist unmatched card:", err);
              dropRecord();
              pauseForAttention({ kind: "saveFailed" });
              toast.error(t("scannedCards.saveFailedUnmatched.title"), {
                description: t("scannedCards.saveFailedUnmatched.description"),
                duration: Infinity,
                dismissible: true,
              });
            })
            .finally(() => {
              settlePendingBinCard(record.scanId);
              void invalidateBinCounts(queryClient, collection.guid);
              void invalidateUnmatchedCards(queryClient, collection.guid);
            });
        },
        complete: () => {},
      });
      return placement;
    },
    [
      toast,
      sendCatchAllBin,
      pauseForAttention,
      scanRoutingContext,
      routeToBin,
      t,
      saveUnmatched,
      dropUnmatched,
      syncUnmatched,
      trackPendingBinCard,
      settlePendingBinCard,
      queryClient,
    ],
  );

  const removeUnmatchedCard = useCallback(
    async (scanId: string) => {
      const collection = activeCollectionRef.current;
      dropUnmatched(scanId);
      if (!collection) return false;
      try {
        const result = await removeUnmatchedCardApi(collection.guid, scanId);
        return result.success;
      } catch (err) {
        console.error("Failed to remove unmatched card:", err);
        return false;
      } finally {
        syncUnmatched(collection.guid);
        void invalidateBinCounts(queryClient, collection.guid);
      }
    },
    [dropUnmatched, syncUnmatched, queryClient],
  );

  const removeAllUnmatchedCards = useCallback(async () => {
    const collection = activeCollectionRef.current;
    if (!collection) return false;
    try {
      const result = await clearUnmatchedCardsApi(collection.guid);
      if (result.success) {
        setUnmatchedCards([]);
        setUnmatchedCount(0);
      }
      return result.success;
    } catch (err) {
      console.error("Failed to remove unmatched cards:", err);
      return false;
    } finally {
      syncUnmatched(collection.guid);
      void invalidateBinCounts(queryClient, collection.guid);
    }
  }, [syncUnmatched, queryClient]);

  const identifyUnmatchedCard = useCallback(
    async (scanId: string, card: PlayingCard) => {
      const collection = activeCollectionRef.current;
      if (!collection) return false;
      try {
        const result = await identifyUnmatchedCardApi(collection.guid, scanId, {
          card,
        });
        if (!result.success || !result.data) return false;
        const added = result.data;
        dropUnmatched(scanId);
        syncUnmatched(collection.guid);
        if (added.binNumber != null) {
          binContentsRef.current = [
            ...binContentsRef.current,
            {
              scanId,
              binNumber: added.binNumber,
              scannedAt: added.scannedAt,
              card: added.card,
              isFoil: added.isFoil,
              foilType: added.foilType,
            },
          ];
        }
        void invalidateCollectionCards(queryClient, collection.guid);
        if (!correctionBinPromptRef.current) return true;
        const target = resolveCorrectedBin(
          toRuleCard(
            { ...card, distance: 0, confidence: 1 },
            { isFoil: added.isFoil, foilType: added.foilType },
          ),
          added.binNumber,
        );
        setBinCorrection({
          id: generateScanId(),
          scanId,
          cardName: card.name,
          currentBin: added.binNumber,
          targetBin: target.bin?.binNumber,
          pickListName: target.pickListName,
        });
        return true;
      } catch (err) {
        console.error("Failed to identify unmatched card:", err);
        return false;
      }
    },
    [resolveCorrectedBin, queryClient, dropUnmatched, syncUnmatched],
  );

  const promptAddedCardBin = useCallback(
    (collectionGuid: string, added: ScannedCard) => {
      if (activeCollectionRef.current?.guid !== collectionGuid) return false;
      const target = resolveCorrectedBin(
        toRuleCard(added.card, {
          isFoil: added.isFoil,
          foilType: added.foilType,
        }),
        undefined,
      );
      setBinCorrection({
        id: generateScanId(),
        scanId: added.scanId,
        cardName: added.card.name,
        targetBin: target.bin?.binNumber,
        pickListName: target.pickListName,
        addedCard: added,
      });
      return true;
    },
    [resolveCorrectedBin],
  );

  const removeCards = useCallback(
    (scanIds: string[]) => {
      const collection = activeCollectionRef.current;
      if (!collection) return Promise.resolve(false);
      const idSet = new Set(scanIds);
      binContentsRef.current = binContentsRef.current.filter(
        (c) => !idSet.has(c.scanId),
      );
      removeFromCardPages(queryClient, collection.guid, idSet);
      const request =
        scanIds.length === 1
          ? removeCollectionCard(collection.guid, scanIds[0])
          : removeCollectionCards(collection.guid, scanIds);
      return request
        .then((result) => result.success)
        .catch((err) => {
          console.error("Failed to remove cards:", err);
          return false;
        })
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const moveCardsToCollection = useCallback(
    ({
      sourceCollectionGuid,
      targetCollectionGuid,
      scanIds,
    }: MoveCardsToCollectionInput) => {
      const idSet = new Set(scanIds);
      return moveCollectionCardsToCollection(
        sourceCollectionGuid,
        scanIds,
        targetCollectionGuid,
      )
        .then((result) => {
          if (!result.success || !result.data) return null;
          if (activeCollectionRef.current?.guid === sourceCollectionGuid) {
            binContentsRef.current = binContentsRef.current.filter(
              (c) => !idSet.has(c.scanId),
            );
          }
          removeFromCardPages(queryClient, sourceCollectionGuid, idSet);
          return result.data.moved;
        })
        .catch((err) => {
          console.error("Failed to move cards:", err);
          return null;
        })
        .finally(() => {
          void invalidateCollectionCards(queryClient, sourceCollectionGuid);
          void invalidateCollectionCards(queryClient, targetCollectionGuid);
          void queryClient.invalidateQueries({ queryKey: ["collections"] });
        });
    },
    [queryClient],
  );

  const removeCard = useCallback(
    (scanId: string) => removeCards([scanId]),
    [removeCards],
  );

  const correctCard = useCallback(
    (scanId: string, card: PlayingCard) => {
      const collection = activeCollectionRef.current;
      const corrected: PlayingCardWithDistance = {
        ...card,
        distance: 0,
        confidence: 1,
      };
      const scan =
        binContentsRef.current.find((entry) => entry.scanId === scanId) ??
        (collection
          ? findInCardPages(queryClient, collection.guid, scanId)
          : undefined);
      const ruleCard = toRuleCard(corrected, {
        isFoil: scan?.isFoil,
        foilType: scan?.foilType,
      });
      const currentBin = scan?.binNumber;
      binContentsRef.current = binContentsRef.current.map((entry) =>
        entry.scanId === scanId ? { ...entry, card: ruleCard } : entry,
      );
      if (correctionBinPromptRef.current) {
        const target = resolveCorrectedBin(ruleCard, currentBin);
        const releasedPickListName = pickListNameInBin(
          scan?.card.name,
          currentBin,
        );
        setBinCorrection({
          id: generateScanId(),
          scanId,
          cardName: card.name,
          currentBin,
          targetBin: target.bin?.binNumber,
          pickListName: target.pickListName,
          releasedPickListName:
            target.bin?.binNumber !== currentBin &&
            releasedPickListName !== target.pickListName
              ? releasedPickListName
              : undefined,
        });
      }
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({
          ...entry,
          card: corrected,
          corrected: true,
          reviewed: true,
          lowConfidenceMatch: false,
        }),
      );
      updateCollectionCard(collection.guid, scanId, corrected, currentBin)
        .catch((err) => console.error("Failed to update card:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [resolveCorrectedBin, pickListNameInBin, queryClient],
  );

  const moveCorrectedCard = useCallback(
    ({
      scanId,
      targetBin,
      currentBin,
      pickListName,
      releasedPickListName,
      addedCard,
    }: BinCorrection) => {
      setBinCorrection(null);
      const collection = activeCollectionRef.current;
      if (targetBin == null) return;
      if (releasedPickListName && currentBin != null) {
        markPickListFound(currentBin, releasedPickListName, -1);
      }
      if (pickListName) markPickListFound(targetBin, pickListName, 1);
      binContentsRef.current = addedCard
        ? [
            ...binContentsRef.current,
            {
              scanId,
              binNumber: targetBin,
              scannedAt: addedCard.scannedAt,
              card: addedCard.card,
              isFoil: addedCard.isFoil,
              foilType: addedCard.foilType,
            },
          ]
        : binContentsRef.current.map((entry) =>
            entry.scanId === scanId
              ? { ...entry, binNumber: targetBin }
              : entry,
          );
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({ ...entry, binNumber: targetBin }),
      );
      setCollectionCardBin(collection.guid, scanId, targetBin)
        .catch((err) => console.error("Failed to move card:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient, markPickListFound],
  );

  const dismissBinCorrection = useCallback(() => setBinCorrection(null), []);

  const confirmCard = useCallback(
    (scanId: string) => {
      const collection = activeCollectionRef.current;
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({
          ...entry,
          corrected: true,
          reviewed: true,
          lowConfidenceMatch: false,
        }),
      );
      confirmCollectionCard(collection.guid, scanId)
        .catch((err) => console.error("Failed to confirm card:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const markCardReviewed = useCallback(
    (scanId: string) => {
      const collection = activeCollectionRef.current;
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({ ...entry, reviewed: true, lowConfidenceMatch: false }),
      );
      markCollectionCardReviewed(collection.guid, scanId)
        .catch((err) => console.error("Failed to mark card reviewed:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const setCardsFoilType = useCallback(
    (scanIds: string[], foilType: string | null) => {
      if (scanIds.length === 0) return;
      const collection = activeCollectionRef.current;
      const isFoil = foilType != null;
      const scanIdSet = new Set(scanIds);
      binContentsRef.current = binContentsRef.current.map((entry) =>
        scanIdSet.has(entry.scanId)
          ? {
              ...entry,
              isFoil,
              foilType: foilType ?? undefined,
              card: toRuleCard(entry.card, { isFoil, foilType }),
            }
          : entry,
      );
      if (!collection) return;
      updateInCardPages(queryClient, collection.guid, scanIdSet, (entry) => ({
        ...entry,
        isFoil,
        foilType: foilType ?? undefined,
      }));
      setCollectionCardsFoilType(collection.guid, scanIds, foilType)
        .catch((err) => console.error("Failed to update foil status:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const setCardFoilType = useCallback(
    (scanId: string, foilType: string | null) =>
      setCardsFoilType([scanId], foilType),
    [setCardsFoilType],
  );

  const setCardsCondition = useCallback(
    (scanIds: string[], condition: CardCondition) => {
      const collection = activeCollectionRef.current;
      if (!collection || scanIds.length === 0) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set(scanIds),
        (entry) => ({ ...entry, condition }),
      );
      setCollectionCardsCondition(collection.guid, scanIds, condition)
        .catch((err) => console.error("Failed to update condition:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const setCardCondition = useCallback(
    (scanId: string, condition: CardCondition) =>
      setCardsCondition([scanId], condition),
    [setCardsCondition],
  );

  const setCardStamp = useCallback(
    (scanId: string, stamp: string | null) => {
      const collection = activeCollectionRef.current;
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({ ...entry, stamp: stamp ?? undefined }),
      );
      setCollectionCardStamp(collection.guid, scanId, stamp)
        .catch((err) => console.error("Failed to update stamp:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const setCardLanguage = useCallback(
    (scanId: string, language: string) => {
      const collection = activeCollectionRef.current;
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({ ...entry, language }),
      );
      setCollectionCardLanguage(collection.guid, scanId, language)
        .catch((err) => console.error("Failed to update language:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const setCardsTags = useCallback(
    (scanIds: string[], tags: CardTag[], enabled: boolean) => {
      const collection = activeCollectionRef.current;
      if (!collection || scanIds.length === 0 || tags.length === 0) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set(scanIds),
        (entry) => withCardTags(entry, tags, enabled),
      );
      setCollectionCardTags(collection.guid, { scanIds, tags, enabled })
        .catch((err) => console.error("Failed to update card tags:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const resetSessionStats = useCallback(() => {
    setTimerResetSignal((s) => s + 1);
    setRecentScanTimes([]);
    setSessionScanCount(0);
  }, []);

  const clearCards = useCallback(() => {
    const collection = activeCollectionRef.current;
    binContentsRef.current = [];
    resetSessionStats();
    if (collection) {
      emptyCollectionRef
        .current(collection.guid)
        .catch((err) => console.error("Failed to clear cards:", err))
        .finally(() => {
          void invalidateCollectionCards(queryClient, collection.guid);
          syncUnmatched(collection.guid);
        });
    }
  }, [queryClient, syncUnmatched, resetSessionStats]);

  return (
    <ScannedCardsContext
      value={{
        unmatchedCards,
        unmatchedCount,
        isLoading,
        autoFeed,
        forceFoilType: piScanSettings.foilType,
        forceSetCodes: piScanSettings.preferredSetCodes,
        scanCondition: piScanSettings.condition ?? scanCondition,
        elapsedMs,
        isTimerActive,
        recentScanTimes,
        sessionScanCount,
        lastRoutedBin,
        setScannerRunning,
        resetSessionStats,
        setAutoFeed,
        setForceFoilType: piScanSettings.setFoilType,
        setForceSetCodes: piScanSettings.setPreferredSetCodes,
        setForceSetCodesAfterCollectionSwitch,
        setScanCondition: piScanSettings.setCondition,
        registerCardArrivedHook,
        registerFeedSource,
        feedOneCard,
        registerPauseHook,
        registerResumeHook,
        pause,
        pauseForAttention,
        resume,
        attention,
        reopenAttention,
        reportScannerError,
        isFeedHalted,
        clearFeedHalt,
        showJamToast,
        addCard,
        addUnmatchedCard,
        removeUnmatchedCard,
        removeAllUnmatchedCards,
        identifyUnmatchedCard,
        promptAddedCardBin,
        sendCatchAllBin,
        sendCardToBin,
        binLimitReached: binLimitBin,
        resolveBinLimit,
        dismissBinLimit,
        fullBins,
        fullBinCount,
        emptyNextFullBin,
        dismissFullBins,
        removeCard,
        removeCards,
        moveCardsToCollection,
        correctCard,
        confirmCard,
        markCardReviewed,
        setCardFoilType,
        setCardsFoilType,
        setCardCondition,
        setCardsCondition,
        setCardLanguage,
        setCardStamp,
        setCardsTags,
        clearCards,
      }}
    >
      {children}
      <BinCorrectionDialog
        correction={binCorrection}
        onMoved={moveCorrectedCard}
        onClose={dismissBinCorrection}
      />
    </ScannedCardsContext>
  );
}

export function useScannedCards() {
  const context = useContext(ScannedCardsContext);
  if (!context) {
    throw new Error(
      "useScannedCards must be used within a ScannedCardsProvider",
    );
  }
  return context;
}
