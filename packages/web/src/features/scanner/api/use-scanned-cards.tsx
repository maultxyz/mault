import {
  type BinConfig,
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
import {
  addCollectionCard,
  addUnmatchedCard as addUnmatchedCardApi,
  loadCollectionCards,
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
  const [cards, setCards] = useState<ScannedCard[]>([]);
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
  const cardsRef = useRef(cards);
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
    cardsRef.current = cards;
  }, [cards]);

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
            getCardsInBin(
              cardsRef.current.map((c) => ({
                binNumber: c.binNumber,
                scannedAt: c.scannedAt,
                card: c.card,
              })),
              bin,
            ),
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
      setCards([]);
      setUnmatchedCards([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setCards([]);
    setUnmatchedCards([]);
    setIsLoading(true);

    Promise.all([
      loadCollectionCards(activeCollection.guid),
      loadUnmatchedCards(activeCollection.guid),
    ])
      .then(([cardsResult, unmatchedResult]) => {
        if (cancelled) return;
        setCards(cardsResult.data ?? []);
        setUnmatchedCards(unmatchedResult.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load collection cards:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCollection?.guid]); // eslint-disable-line react-hooks/exhaustive-deps

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

      setCards((prev) => [record, ...prev]);
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
            setCards((prev) => prev.filter((c) => c.scanId !== record.scanId));
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

  const removeCard = useCallback((scanId: string) => {
    const collection = activeCollectionRef.current;
    setCards((prev) => prev.filter((entry) => entry.scanId !== scanId));
    if (collection) {
      removeCollectionCard(collection.guid, scanId).catch((err) =>
        console.error("Failed to remove card:", err),
      );
    }
  }, []);

  const removeCards = useCallback((scanIds: string[]) => {
    const collection = activeCollectionRef.current;
    const idSet = new Set(scanIds);
    setCards((prev) => prev.filter((entry) => !idSet.has(entry.scanId)));
    if (collection) {
      removeCollectionCards(collection.guid, scanIds).catch((err) =>
        console.error("Failed to remove cards:", err),
      );
    }
  }, []);

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
      setCards((prev) =>
        prev.map((entry) =>
          entry.scanId === scanId
            ? {
                ...entry,
                card: corrected,
                binNumber: matchedBin?.binNumber,
                corrected: true,
              }
            : entry,
        ),
      );
      if (collection) {
        updateCollectionCard(
          collection.guid,
          scanId,
          corrected,
          matchedBin?.binNumber,
        ).catch((err) => console.error("Failed to update card:", err));
      }
    },
    [saveBinConfig, resolveMatchedBin],
  );

  const setCardFoilType = useCallback(
    (scanId: string, foilType: string | null) => {
      const collection = activeCollectionRef.current;
      const isFoil = foilType != null;
      setCards((prev) =>
        prev.map((entry) =>
          entry.scanId === scanId
            ? { ...entry, isFoil, foilType: foilType ?? undefined }
            : entry,
        ),
      );
      if (collection) {
        setCollectionCardFoilType(
          collection.guid,
          scanId,
          isFoil,
          foilType,
        ).catch((err) => console.error("Failed to update foil status:", err));
      }
    },
    [],
  );

  const markDownloaded = useCallback((scanIds: string[]) => {
    const collection = activeCollectionRef.current;
    if (scanIds.length === 0) return;
    const idSet = new Set(scanIds);
    setCards((prev) =>
      prev.map((entry) =>
        idSet.has(entry.scanId) ? { ...entry, isDownloaded: true } : entry,
      ),
    );
    if (collection) {
      markCollectionCardsDownloaded(collection.guid, scanIds).catch((err) =>
        console.error("Failed to mark cards downloaded:", err),
      );
    }
  }, []);

  const clearCards = useCallback(() => {
    const collection = activeCollectionRef.current;
    setCards([]);
    setTimerTrigger(undefined);
    setTimerResetSignal((s) => s + 1);
    if (collection) {
      emptyCollectionRef
        .current(collection.guid)
        .catch((err) => console.error("Failed to clear cards:", err));
    }
  }, []);

  return (
    <ScannedCardsContext
      value={{
        cards,
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
