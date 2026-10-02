import { SCAN_RATE_WINDOW_MS } from "@/lib/constants/scanner";
import {
  type BinConfig,
  type BinContentCard,
  type BinRoute,
  type MatchedScanDetails,
  type PlayingCard,
  type PlayingCardWithDistance,
  type ScanVectorizeSource,
  type ScannedCard,
  type UnmatchedCard,
  type UnmatchedScanDetails,
  countCopiesInBin,
  evaluateAlphabetBin,
  evaluateCardBin,
  evaluateRepackBin,
  findLowMatchCatchAll,
  getCardsInBin,
  getCatchAllBin,
  hasMaxCopiesBins,
  toRuleCard,
} from "@magic-vault/shared";

import { billingQueryOptions } from "@/features/billing/api/billing";
import { recordSupportPromptScan } from "@/features/billing/lib/support-prompt";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useDevice } from "@/features/calibration/api/use-device";
import { loadBinContents } from "@/features/collections/api/collection-cards";
import {
  addCollectionCard,
  addUnmatchedCard as addUnmatchedCardApi,
  confirmCollectionCard,
  identifyUnmatchedCard as identifyUnmatchedCardApi,
  loadUnmatchedCards,
  markCollectionCardsDownloaded,
  releaseScanLock,
  removeCollectionCard,
  removeCollectionCards,
  removeUnmatchedCard as removeUnmatchedCardApi,
  setCollectionCardFoilType,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  findInCardPages,
  invalidateCollectionCards,
  removeFromCardPages,
  updateInCardPages,
} from "@/features/collections/lib/card-page-cache";
import { useOrg } from "@/features/companies/api/use-organization";
import { useAutoFeed } from "@/features/scanner/api/use-auto-feed";
import { useComputedBinFillLevels } from "@/features/scanner/api/use-computed-bin-fill-levels";
import { useJamToast } from "@/features/scanner/api/use-jam-toast";
import { useScanTimer } from "@/features/scanner/api/use-scan-timer";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStations } from "@/features/scanner/api/use-stations";
import { findAutoAssignTarget } from "@/features/scanner/lib/auto-assign";
import { routeCardToBin } from "@/features/scanner/lib/route-card-to-bin";
import { showSorterLimitToast } from "@/features/scanner/lib/sorter-limit-toast";
import { useSoundRulePlayer } from "@/features/sounds/api/use-sound-rule-player";
import type {
  LastRoutedBin,
  ScannedCardsContextValue,
} from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { generateScanId } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const ScannedCardsContext = createContext<ScannedCardsContextValue | null>(
  null,
);

export function ScannedCardsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("scanner");
  const [unmatchedCards, setUnmatchedCards] = useState<UnmatchedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {
    configs: binConfigs,
    ruleFieldDefinitions: fieldDefinitions,
    selectedSet,
    save: saveBinConfig,
    emptyBin,
  } = useBinConfigs();
  const [binLimitBin, setBinLimitBin] = useState<BinConfig | null>(null);
  const { routes: binRoutes } = useBinRoutes();
  const device = useDevice();
  const deviceGuidRef = useRef(device?.guid);
  deviceGuidRef.current = device?.guid;
  const pipelinedFeedRef = useRef(device?.pipelinedFeed ?? false);
  pipelinedFeedRef.current = device?.pipelinedFeed ?? false;
  const isPipelinedFeedEnabled = useCallback(
    () => pipelinedFeedRef.current,
    [],
  );
  const { sendRoute, sendCommand, receiveResponse, isConnected, isReady } =
    useSerial();
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
  const { sorterLimitIsHardCap } = useStations();
  const sorterLimitIsHardCapRef = useRef(sorterLimitIsHardCap);
  sorterLimitIsHardCapRef.current = sorterLimitIsHardCap;
  const queryClient = useQueryClient();

  useEffect(() => {
    locksRef.current = locks;
  }, [locks]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    activeOrgIdRef.current = activeOrg?.id;
  }, [activeOrg?.id]);

  const binFillLevels = useComputedBinFillLevels(unmatchedCards);
  const binFillLevelsRef = useRef(binFillLevels);
  binFillLevelsRef.current = binFillLevels;
  const pendingBinCardsRef = useRef(new Map<number, number>());
  const isBinFullLocally = useCallback((binNumber: number) => {
    const level = binFillLevelsRef.current.find(
      (l) => l.binNumber === binNumber,
    );
    if (!level?.capacity) return false;
    const pending = pendingBinCardsRef.current.get(binNumber) ?? 0;
    return level.count + pending >= level.capacity;
  }, []);
  const trackPendingBinCard = useCallback(
    (binNumber: number, delta: number) => {
      const pending = pendingBinCardsRef.current;
      const next = (pending.get(binNumber) ?? 0) + delta;
      if (next > 0) pending.set(binNumber, next);
      else pending.delete(binNumber);
    },
    [],
  );

  const binConfigsRef = useRef(binConfigs);
  const binRoutesRef = useRef(binRoutes);
  const fieldDefinitionsRef = useRef(fieldDefinitions);
  const autoAssignFieldRef = useRef(selectedSet?.autoAssignField ?? null);
  const selectedSetRef = useRef(selectedSet);
  const binContentsRef = useRef<BinContentCard[]>([]);
  const serialRef = useRef({
    sendRoute,
    sendCommand,
    receiveResponse,
    isConnected,
    isReady,
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
  const [lastRoutedBin, setLastRoutedBin] = useState<LastRoutedBin | null>(
    null,
  );

  const {
    autoFeed,
    isAutoFeedEnabled,
    setAutoFeed,
    isFeedHalted,
    clearFeedHalt,
    pause,
    triggerAutoFeed,
    registerCardArrivedHook,
    registerPauseHook,
    resume,
    registerResumeHook,
  } = useAutoFeed({ serialRef, activeCollectionRef });
  const showJamToast = useJamToast(resume);

  const [forceFoilType, setForceFoilTypeState] = useState<string | null>(null);
  const forceFoilTypeRef = useRef<string | null>(null);
  const [forceSetCode, setForceSetCode] = useState<string | null>(null);

  useEffect(() => {
    binConfigsRef.current = binConfigs;
  }, [binConfigs]);

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
      sendCommand,
      receiveResponse,
      isConnected,
      isReady,
    };
  }, [sendRoute, sendCommand, receiveResponse, isConnected, isReady]);

  const resolveMatchedBin = useCallback(
    (card: PlayingCardWithDistance): BinConfig | undefined => {
      const lowMatch = findLowMatchCatchAll(card, binConfigsRef.current);
      if (lowMatch) return lowMatch;
      const set = selectedSetRef.current;
      if (set?.isAlphabetMode) {
        return evaluateAlphabetBin(
          card,
          binConfigsRef.current,
          set.alphabetPass,
          set.alphabetPrefix,
        );
      }
      if (set?.isRepackMode) {
        return evaluateRepackBin(
          card,
          binConfigsRef.current,
          fieldDefinitionsRef.current,
          set,
          (bin) => getCardsInBin(binContentsRef.current, bin),
        );
      }
      return evaluateCardBin(
        card,
        binConfigsRef.current,
        fieldDefinitionsRef.current,
        autoAssignFieldRef.current
          ? undefined
          : (bin) => countCopiesInBin(binContentsRef.current, bin, card.id),
      );
    },
    [],
  );

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

  useEffect(() => {
    const prev = prevCollectionGuidRef.current;
    const next = activeCollection?.guid;
    if (prev && prev !== next) {
      releaseScanLock(prev).catch(() => {});
      setForceSetCode(null);
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

  useEffect(() => {
    if (!activeCollection) {
      setUnmatchedCards([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setUnmatchedCards([]);
    setIsLoading(true);

    loadUnmatchedCards(activeCollection.guid)
      .then((unmatchedResult) => {
        if (cancelled) return;
        setUnmatchedCards(unmatchedResult.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load unmatched cards:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCollection?.guid]); // eslint-disable-line react-hooks/exhaustive-deps

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
    ) => {
      const collection = activeCollectionRef.current;
      if (!collection) {
        toast.error(t("scannedCards.noCollectionSelected.title"), {
          description: t("scannedCards.noCollectionSelected.description"),
        });
        return;
      }

      const lock = locksRef.current?.[collection.guid];
      if (lock && lock.userId !== currentUserIdRef.current) {
        toast.error(t("scannedCards.collectionLocked.title"), {
          description: t("scannedCards.collectionLocked.description"),
        });
        return;
      }

      const forcedFoilType = forceFoilTypeRef.current;
      const ruleCard = toRuleCard(card, {
        isFoil: forcedFoilType != null,
        foilType: forcedFoilType,
      });
      let matchedBin = resolveMatchedBin(ruleCard);
      const autoTarget = selectedSetRef.current?.isRepackMode
        ? null
        : findAutoAssignTarget(
            ruleCard,
            binConfigsRef.current,
            fieldDefinitionsRef.current,
            autoAssignFieldRef.current,
          );
      if (autoTarget) {
        binConfigsRef.current = binConfigsRef.current.map((c) =>
          c.binNumber === autoTarget.binNumber
            ? { ...c, rules: autoTarget.rules }
            : c,
        );
        matchedBin = binConfigsRef.current.find(
          (c) => c.binNumber === autoTarget.binNumber,
        );
        saveBinConfig(autoTarget.binNumber, autoTarget.rules);
      }
      if (matchedBin && isBinFullLocally(matchedBin.binNumber)) {
        pause();
        setBinLimitBin(matchedBin);
        return;
      }
      const isLowMatch =
        !!matchedBin &&
        findLowMatchCatchAll(ruleCard, binConfigsRef.current)?.binNumber ===
          matchedBin.binNumber;
      const record: ScannedCard = {
        scanId: generateScanId(),
        card,
        scannedAt: Date.now(),
        binNumber: matchedBin?.binNumber,
        capturedImageUrl,
        alternativeMatches: alternativeMatches?.length
          ? alternativeMatches
          : undefined,
        isFoil: forcedFoilType != null || undefined,
        foilType: forcedFoilType ?? undefined,
        needsReview: details?.needsReview || isLowMatch || undefined,
        vectorizedOn,
      };

      recordSupportPromptScan();
      if (record.binNumber != null) {
        setLastRoutedBin({ binNumber: record.binNumber, at: record.scannedAt });
      }
      setRecentScanTimes((prev) => [
        ...prev.filter((time) => time > record.scannedAt - SCAN_RATE_WINDOW_MS),
        record.scannedAt,
      ]);

      if (record.binNumber != null && tracksBinContents()) {
        binContentsRef.current = [
          {
            scanId: record.scanId,
            binNumber: record.binNumber,
            scannedAt: record.scannedAt,
            card: ruleCard,
            isFoil: record.isFoil,
            foilType: record.foilType,
          },
          ...binContentsRef.current,
        ];
      }

      const orgId = activeOrgIdRef.current;
      const billingQueryKey = orgId
        ? billingQueryOptions(orgId).queryKey
        : undefined;
      if (billingQueryKey) {
        queryClient.setQueryData(billingQueryKey, (old) =>
          old ? { ...old, cardsScannedToday: old.cardsScannedToday + 1 } : old,
        );
      }

      if (
        matchedBin &&
        serialRef.current.isConnected &&
        serialRef.current.isReady
      ) {
        void routeCardToBin({
          route: resolveRoute(matchedBin.binNumber),
          sendRoute: serialRef.current.sendRoute,
          t,
          failedKey: "scannedCards.routingFailed",
          cardName: card.name,
          collectionGuid: collection.guid,
          isAutoFeedEnabled,
          isPipelinedFeedEnabled,
          pause,
          triggerAutoFeed,
          onJam: showJamToast,
        });
      }

      const pendingBin = record.binNumber;
      if (pendingBin != null) trackPendingBinCard(pendingBin, 1);

      addCollectionCard(
        collection.guid,
        { ...record, diagnostics: details?.diagnostics },
        deviceGuidRef.current,
      )
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
                    cardsScannedToday: Math.max(0, old.cardsScannedToday - 1),
                  }
                : old,
            );
          }
          pause();
          if (result.binLimitReached) {
            setBinLimitBin(matchedBin ?? null);
            return;
          }
          if (result.sorterLimitReached) {
            showSorterLimitToast(t, sorterLimitIsHardCapRef.current);
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
          pause();
          toast.error(t("scannedCards.saveFailed.title"), {
            description: t("scannedCards.saveFailed.description", {
              name: card.name,
            }),
            duration: Infinity,
            dismissible: true,
          });
        })
        .finally(async () => {
          try {
            await invalidateCollectionCards(queryClient, collection.guid);
          } finally {
            if (pendingBin != null) trackPendingBinCard(pendingBin, -1);
          }
          if (billingQueryKey) {
            void queryClient.invalidateQueries({ queryKey: billingQueryKey });
          }
        });

      setTimeout(() => playSoundForCard(ruleCard), 0);
    },
    [
      t,
      saveBinConfig,
      queryClient,
      resolveRoute,
      resolveMatchedBin,
      tracksBinContents,
      isAutoFeedEnabled,
      isPipelinedFeedEnabled,
      pause,
      triggerAutoFeed,
      showJamToast,
      isBinFullLocally,
      trackPendingBinCard,
      playSoundForCard,
    ],
  );

  const resolveBinLimit = useCallback(async () => {
    const bin = binLimitBin;
    if (!bin) return;
    try {
      await emptyBin(bin.binNumber);
    } catch (err) {
      console.error("Failed to mark bin as emptied:", err);
    } finally {
      setBinLimitBin(null);
    }
  }, [binLimitBin, emptyBin]);

  const sendCatchAllBin = useCallback(() => {
    const catchAll = getCatchAllBin(binConfigsRef.current);
    if (
      catchAll &&
      serialRef.current.isConnected &&
      serialRef.current.isReady
    ) {
      void routeCardToBin({
        route: resolveRoute(catchAll.binNumber),
        sendRoute: serialRef.current.sendRoute,
        t,
        failedKey: "scannedCards.routingFailedCatchAll",
        collectionGuid: activeCollectionRef.current?.guid,
        isAutoFeedEnabled,
        isPipelinedFeedEnabled,
        pause,
        triggerAutoFeed,
        onJam: showJamToast,
      });
    }
  }, [
    t,
    resolveRoute,
    isAutoFeedEnabled,
    isPipelinedFeedEnabled,
    pause,
    triggerAutoFeed,
    showJamToast,
  ]);

  const addUnmatchedCard = useCallback(
    (
      capturedImageUrl?: string,
      vectorizedOn?: ScanVectorizeSource,
      details?: UnmatchedScanDetails,
    ) => {
      const collection = activeCollectionRef.current;
      if (!collection) {
        sendCatchAllBin();
        return;
      }

      const catchAll = getCatchAllBin(binConfigsRef.current);
      if (catchAll && isBinFullLocally(catchAll.binNumber)) {
        pause();
        setBinLimitBin(catchAll);
        return;
      }
      const record: UnmatchedCard = {
        scanId: generateScanId(),
        capturedImageUrl,
        scannedAt: Date.now(),
        binNumber: catchAll?.binNumber,
        vectorizedOn,
        diagnostics: details?.diagnostics,
      };
      const dropRecord = () =>
        setUnmatchedCards((prev) =>
          prev.filter((c) => c.scanId !== record.scanId),
        );

      setUnmatchedCards((prev) => [record, ...prev]);
      sendCatchAllBin();

      addUnmatchedCardApi(
        collection.guid,
        { ...record, embedding: details?.embedding ?? undefined },
        deviceGuidRef.current,
      )
        .then((result) => {
          if (result.success) return;
          dropRecord();
          pause();
          if (result.binLimitReached) setBinLimitBin(catchAll ?? null);
        })
        .catch((err) => {
          console.error("Failed to persist unmatched card:", err);
          dropRecord();
          pause();
          toast.error(t("scannedCards.saveFailedUnmatched.title"), {
            description: t("scannedCards.saveFailedUnmatched.description"),
            duration: Infinity,
            dismissible: true,
          });
        });
    },
    [sendCatchAllBin, pause, isBinFullLocally, t],
  );

  const removeUnmatchedCard = useCallback((scanId: string) => {
    const collection = activeCollectionRef.current;
    setUnmatchedCards((prev) => prev.filter((c) => c.scanId !== scanId));
    if (collection) {
      removeUnmatchedCardApi(collection.guid, scanId).catch((err) =>
        console.error("Failed to remove unmatched card:", err),
      );
    }
  }, []);

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
        setUnmatchedCards((prev) => prev.filter((c) => c.scanId !== scanId));
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
        return true;
      } catch (err) {
        console.error("Failed to identify unmatched card:", err);
        return false;
      }
    },
    [queryClient],
  );

  const removeCards = useCallback(
    (scanIds: string[]) => {
      const collection = activeCollectionRef.current;
      if (!collection) return;
      const idSet = new Set(scanIds);
      binContentsRef.current = binContentsRef.current.filter(
        (c) => !idSet.has(c.scanId),
      );
      removeFromCardPages(queryClient, collection.guid, idSet);
      const request =
        scanIds.length === 1
          ? removeCollectionCard(collection.guid, scanIds[0])
          : removeCollectionCards(collection.guid, scanIds);
      request
        .catch((err) => console.error("Failed to remove cards:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
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
      let matchedBin = resolveMatchedBin(ruleCard);
      const autoTarget = selectedSetRef.current?.isRepackMode
        ? null
        : findAutoAssignTarget(
            ruleCard,
            binConfigsRef.current,
            fieldDefinitionsRef.current,
            autoAssignFieldRef.current,
          );
      if (autoTarget) {
        binConfigsRef.current = binConfigsRef.current.map((c) =>
          c.binNumber === autoTarget.binNumber
            ? { ...c, rules: autoTarget.rules }
            : c,
        );
        matchedBin = binConfigsRef.current.find(
          (c) => c.binNumber === autoTarget.binNumber,
        );
        saveBinConfig(autoTarget.binNumber, autoTarget.rules);
      }
      binContentsRef.current = binContentsRef.current.flatMap((entry) => {
        if (entry.scanId !== scanId) return [entry];
        return matchedBin
          ? [{ ...entry, card: ruleCard, binNumber: matchedBin.binNumber }]
          : [];
      });
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({
          ...entry,
          card: corrected,
          binNumber: matchedBin?.binNumber,
          corrected: true,
        }),
      );
      updateCollectionCard(
        collection.guid,
        scanId,
        corrected,
        matchedBin?.binNumber,
      )
        .catch((err) => console.error("Failed to update card:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [saveBinConfig, resolveMatchedBin, queryClient],
  );

  const confirmCard = useCallback(
    (scanId: string) => {
      const collection = activeCollectionRef.current;
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({ ...entry, corrected: true }),
      );
      confirmCollectionCard(collection.guid, scanId)
        .catch((err) => console.error("Failed to confirm card:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const setCardFoilType = useCallback(
    (scanId: string, foilType: string | null) => {
      const collection = activeCollectionRef.current;
      const isFoil = foilType != null;
      binContentsRef.current = binContentsRef.current.map((entry) =>
        entry.scanId === scanId
          ? {
              ...entry,
              isFoil,
              foilType: foilType ?? undefined,
              card: toRuleCard(entry.card, { isFoil, foilType }),
            }
          : entry,
      );
      if (!collection) return;
      updateInCardPages(
        queryClient,
        collection.guid,
        new Set([scanId]),
        (entry) => ({ ...entry, isFoil, foilType: foilType ?? undefined }),
      );
      setCollectionCardFoilType(collection.guid, scanId, isFoil, foilType)
        .catch((err) => console.error("Failed to update foil status:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const markDownloaded = useCallback(
    (scanIds: string[]) => {
      const collection = activeCollectionRef.current;
      if (scanIds.length === 0 || !collection) return;
      markCollectionCardsDownloaded(collection.guid, scanIds)
        .catch((err) => console.error("Failed to mark cards downloaded:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    },
    [queryClient],
  );

  const clearCards = useCallback(() => {
    const collection = activeCollectionRef.current;
    binContentsRef.current = [];
    setTimerResetSignal((s) => s + 1);
    setRecentScanTimes([]);
    if (collection) {
      emptyCollectionRef
        .current(collection.guid)
        .catch((err) => console.error("Failed to clear cards:", err))
        .finally(
          () => void invalidateCollectionCards(queryClient, collection.guid),
        );
    }
  }, [queryClient]);

  return (
    <ScannedCardsContext
      value={{
        unmatchedCards,
        isLoading,
        autoFeed,
        forceFoilType,
        forceSetCode,
        elapsedMs,
        isTimerActive,
        recentScanTimes,
        lastRoutedBin,
        setScannerRunning,
        setAutoFeed,
        setForceFoilType,
        setForceSetCode,
        registerCardArrivedHook,
        registerPauseHook,
        registerResumeHook,
        pause,
        isFeedHalted,
        clearFeedHalt,
        showJamToast,
        addCard,
        addUnmatchedCard,
        removeUnmatchedCard,
        identifyUnmatchedCard,
        sendCatchAllBin,
        binLimitReached: binLimitBin,
        resolveBinLimit,
        removeCard,
        removeCards,
        correctCard,
        confirmCard,
        setCardFoilType,
        markDownloaded,
        clearCards,
      }}
    >
      {children}
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
