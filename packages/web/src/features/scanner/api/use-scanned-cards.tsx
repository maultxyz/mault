import {
  type BinConfig,
  type BinContentCard,
  type BinRoute,
  type PlayingCard,
  type PlayingCardWithDistance,
  type ScannedCard,
  type UnmatchedCard,
  evaluateCardBin,
  evaluateRepackBin,
  getCardsInBin,
  getCatchAllBin,
} from "@magic-vault/shared";

import { billingQueryOptions } from "@/features/billing/api/billing";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useDevice } from "@/features/calibration/api/use-device";
import { loadBinContents } from "@/features/collections/api/collection-cards";
import {
  addCollectionCard,
  addUnmatchedCard as addUnmatchedCardApi,
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
  invalidateCollectionCards,
  removeFromCardPages,
  updateInCardPages,
} from "@/features/collections/lib/card-page-cache";
import { useOrg } from "@/features/companies/api/use-organization";
import { useAutoFeed } from "@/features/scanner/api/use-auto-feed";
import { useScanTimer } from "@/features/scanner/api/use-scan-timer";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStations } from "@/features/scanner/api/use-stations";
import { findAutoAssignTarget } from "@/features/scanner/lib/auto-assign";
import { routeCardToBin } from "@/features/scanner/lib/route-card-to-bin";
import { showSorterLimitToast } from "@/features/scanner/lib/sorter-limit-toast";
import type { ScannedCardsContextValue } from "@/lib/interfaces/scanner";
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
import { toast } from "sonner";

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
    fieldDefinitions,
    selectedSet,
    save: saveBinConfig,
    emptyBin,
  } = useBinConfigs();
  const [binLimitBin, setBinLimitBin] = useState<BinConfig | null>(null);
  const { routes: binRoutes } = useBinRoutes();
  const device = useDevice();
  const deviceGuidRef = useRef(device?.guid);
  deviceGuidRef.current = device?.guid;
  const { sendRoute, sendCommand, receiveResponse, isConnected, isReady } =
    useSerial();
  const { activeCollection, emptyCollection } = useCollections();

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

  const binConfigsRef = useRef(binConfigs);
  const binRoutesRef = useRef(binRoutes);
  const fieldDefinitionsRef = useRef(fieldDefinitions);
  const autoAssignFieldRef = useRef(selectedSet?.autoAssignField ?? null);
  const selectedSetRef = useRef(selectedSet);
  // Cards still physically in each repack bin (scanned since it was last
  // emptied), which repack routing needs synchronously on every scan.
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
  const [timerTrigger, setTimerTrigger] = useState<number | undefined>(
    undefined,
  );
  const [timerResetSignal, setTimerResetSignal] = useState(0);
  const { elapsedMs, isActive: isTimerActive } = useScanTimer(
    timerTrigger,
    timerResetSignal,
  );

  const {
    autoFeed,
    isAutoFeedEnabled,
    setAutoFeed,
    disableAutoFeed,
    pause,
    triggerAutoFeed,
    registerCardArrivedHook,
    registerPauseHook,
  } = useAutoFeed({ serialRef, activeCollectionRef });

  const [forceFoilType, setForceFoilTypeState] = useState<string | null>(null);
  const forceFoilTypeRef = useRef<string | null>(null);

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
      const set = selectedSetRef.current;
      if (set?.isRepackMode) {
        return evaluateRepackBin(
          card,
          binConfigsRef.current,
          fieldDefinitionsRef.current,
          set,
          (bin) =>
            getCardsInBin(binContentsRef.current, bin),
        );
      }
      return evaluateCardBin(
        card,
        binConfigsRef.current,
        fieldDefinitionsRef.current,
      );
    },
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

  const isRepackMode = !!selectedSet?.isRepackMode;
  const repackBinWindowsKey = JSON.stringify(
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
    if (!guid || !isRepackMode) return;

    let cancelled = false;
    loadBinContents(guid, JSON.parse(repackBinWindowsKey))
      .then((contents) => {
        if (!cancelled) binContentsRef.current = contents;
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load bin contents:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCollection?.guid, isRepackMode, repackBinWindowsKey]);

  const addCard = useCallback(
    (
      card: PlayingCardWithDistance,
      capturedImageUrl?: string,
      alternativeMatches?: PlayingCardWithDistance[],
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

      let matchedBin = resolveMatchedBin(card);
      const autoTarget = selectedSetRef.current?.isRepackMode
        ? null
        : findAutoAssignTarget(
            card,
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
      const record: ScannedCard = {
        scanId: generateScanId(),
        card,
        scannedAt: Date.now(),
        binNumber: matchedBin?.binNumber,
        capturedImageUrl,
        alternativeMatches: alternativeMatches?.length
          ? alternativeMatches
          : undefined,
        isFoil: forceFoilTypeRef.current != null || undefined,
        foilType: forceFoilTypeRef.current ?? undefined,
      };

      if (record.binNumber != null && selectedSetRef.current?.isRepackMode) {
        binContentsRef.current = [
          {
            scanId: record.scanId,
            binNumber: record.binNumber,
            scannedAt: record.scannedAt,
            card,
          },
          ...binContentsRef.current,
        ];
      }
      setTimerTrigger(record.scannedAt);

      const orgId = activeOrgIdRef.current;
      const billingQueryKey = orgId
        ? billingQueryOptions(orgId).queryKey
        : undefined;
      if (billingQueryKey) {
        queryClient.setQueryData(billingQueryKey, (old) =>
          old ? { ...old, cardsScannedToday: old.cardsScannedToday + 1 } : old,
        );
      }

      addCollectionCard(collection.guid, record, deviceGuidRef.current)
        .then((result) => {
          if (!result.success) {
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
            if (result.binLimitReached) {
              // Card wasn't persisted or physically routed - the bin filled
              // up before this scan, so scanning stays blocked until addressed.
              disableAutoFeed();
              pause();
              setBinLimitBin(matchedBin ?? null);
              return;
            }
            if (result.sorterLimitReached) {
              disableAutoFeed();
              pause();
              showSorterLimitToast(t, sorterLimitIsHardCapRef.current);
              return;
            }
            const key = result.scanLimitReached
              ? "scannedCards.scanLimitReached"
              : "scannedCards.collectionLocked";
            toast.error(t(`${key}.title`), {
              description: t(`${key}.description`),
            });
            return;
          }

          // Only route physically once the server has confirmed the bin
          // wasn't full, so a rejected card never gets routed either.
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
              disableAutoFeed,
              pause,
              triggerAutoFeed,
            });
          }
        })
        .catch((err) => console.error("Failed to persist card:", err))
        .finally(() => {
          void invalidateCollectionCards(queryClient, collection.guid);
          if (billingQueryKey) {
            void queryClient.invalidateQueries({ queryKey: billingQueryKey });
          }
        });
    },
    [
      t,
      saveBinConfig,
      queryClient,
      resolveRoute,
      resolveMatchedBin,
      isAutoFeedEnabled,
      disableAutoFeed,
      pause,
      triggerAutoFeed,
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
        disableAutoFeed,
        pause,
        triggerAutoFeed,
      });
    }
  }, [
    t,
    resolveRoute,
    isAutoFeedEnabled,
    disableAutoFeed,
    pause,
    triggerAutoFeed,
  ]);

  const addUnmatchedCard = useCallback(
    (capturedImageUrl?: string) => {
      const collection = activeCollectionRef.current;
      if (!collection) {
        sendCatchAllBin();
        return;
      }

      const catchAll = getCatchAllBin(binConfigsRef.current);
      const record: UnmatchedCard = {
        scanId: generateScanId(),
        capturedImageUrl,
        scannedAt: Date.now(),
        binNumber: catchAll?.binNumber,
      };
      const dropRecord = () =>
        setUnmatchedCards((prev) =>
          prev.filter((c) => c.scanId !== record.scanId),
        );

      setUnmatchedCards((prev) => [record, ...prev]);

      addUnmatchedCardApi(collection.guid, record, deviceGuidRef.current)
        .then((result) => {
          if (!result.success) {
            dropRecord();
            if (result.binLimitReached) {
              disableAutoFeed();
              pause();
              setBinLimitBin(catchAll ?? null);
            }
            return;
          }
          sendCatchAllBin();
        })
        .catch((err) => {
          console.error("Failed to persist unmatched card:", err);
          dropRecord();
        });
    },
    [sendCatchAllBin, disableAutoFeed, pause],
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
      let matchedBin = resolveMatchedBin(corrected);
      const autoTarget = selectedSetRef.current?.isRepackMode
        ? null
        : findAutoAssignTarget(
            corrected,
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
          ? [{ ...entry, card: corrected, binNumber: matchedBin.binNumber }]
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

  const setCardFoilType = useCallback(
    (scanId: string, foilType: string | null) => {
      const collection = activeCollectionRef.current;
      const isFoil = foilType != null;
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
    setTimerTrigger(undefined);
    setTimerResetSignal((s) => s + 1);
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
        elapsedMs,
        isTimerActive,
        setAutoFeed,
        setForceFoilType,
        registerCardArrivedHook,
        registerPauseHook,
        addCard,
        addUnmatchedCard,
        removeUnmatchedCard,
        sendCatchAllBin,
        binLimitReached: binLimitBin,
        resolveBinLimit,
        removeCard,
        removeCards,
        correctCard,
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
