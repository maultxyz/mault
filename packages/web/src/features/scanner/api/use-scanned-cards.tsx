import {
  type BinRoute,
  type PlayingCard,
  type PlayingCardWithDistance,
  type ScannedCard,
  type UnmatchedCard,
  evaluateCardBin,
  getCatchAllBin,
} from "@magic-vault/shared";

import { billingQueryOptions } from "@/features/billing/api/billing";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
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
  setCollectionCardFoil,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { useAutoFeed } from "@/features/scanner/api/use-auto-feed";
import { useScanTimer } from "@/features/scanner/api/use-scan-timer";
import { useSerial } from "@/features/scanner/api/use-serial";
import { findAutoAssignTarget } from "@/features/scanner/lib/auto-assign";
import { routeCardToBin } from "@/features/scanner/lib/route-card-to-bin";
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
  } = useBinConfigs();
  const { routes: binRoutes } = useBinRoutes();
  const { sendRoute, sendCommand, receiveResponse, isConnected, isReady } =
    useSerial();
  const { activeCollection, emptyCollection } = useCollections();

  const { locks, currentUserId } = useCollectionLocks();
  const locksRef = useRef(locks);
  const currentUserIdRef = useRef(currentUserId);

  const { activeOrg } = useOrg();
  const activeOrgIdRef = useRef(activeOrg?.id);
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

  const [forceFoil, setForceFoilState] = useState(false);
  const forceFoilRef = useRef(false);

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

  const resolveRoute = useCallback((binNumber: number): BinRoute => {
    const found = binRoutesRef.current.find((r) => r.binNumber === binNumber);
    if (found) return found;
    const lastModule = Math.max(
      1,
      ...binRoutesRef.current.map((r) => r.module),
    );
    return { binNumber, module: lastModule, direction: "bottom" };
  }, []);

  const setForceFoil = useCallback((enabled: boolean) => {
    forceFoilRef.current = enabled;
    setForceFoilState(enabled);
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

      let matchedBin = evaluateCardBin(
        card,
        binConfigsRef.current,
        fieldDefinitionsRef.current,
      );
      const autoTarget = findAutoAssignTarget(
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
        isFoil: forceFoilRef.current || undefined,
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

      addCollectionCard(collection.guid, record)
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
            const key = result.scanLimitReached
              ? "scannedCards.scanLimitReached"
              : "scannedCards.collectionLocked";
            toast.error(t(`${key}.title`), {
              description: t(`${key}.description`),
            });
          }
        })
        .catch((err) => console.error("Failed to persist card:", err))
        .finally(() => {
          if (billingQueryKey) {
            void queryClient.invalidateQueries({ queryKey: billingQueryKey });
          }
        });

      if (matchedBin && serialRef.current.isConnected && serialRef.current.isReady) {
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
    },
    [
      t,
      saveBinConfig,
      queryClient,
      resolveRoute,
      isAutoFeedEnabled,
      disableAutoFeed,
      pause,
      triggerAutoFeed,
    ],
  );

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

  const addUnmatchedCard = useCallback((capturedImageUrl?: string) => {
    const collection = activeCollectionRef.current;
    if (!collection) return;

    const record: UnmatchedCard = {
      scanId: generateScanId(),
      capturedImageUrl,
      scannedAt: Date.now(),
    };

    setUnmatchedCards((prev) => [record, ...prev]);

    addUnmatchedCardApi(collection.guid, record).catch((err) => {
      console.error("Failed to persist unmatched card:", err);
      setUnmatchedCards((prev) =>
        prev.filter((c) => c.scanId !== record.scanId),
      );
    });
  }, []);

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
      const corrected: PlayingCardWithDistance = { ...card, distance: 0 };
      let matchedBin = evaluateCardBin(
        corrected,
        binConfigsRef.current,
        fieldDefinitionsRef.current,
      );
      const autoTarget = findAutoAssignTarget(
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
            ? { ...entry, card: corrected, binNumber: matchedBin?.binNumber }
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
    [saveBinConfig],
  );

  const toggleFoil = useCallback((scanId: string, isFoil: boolean) => {
    const collection = activeCollectionRef.current;
    setCards((prev) =>
      prev.map((entry) =>
        entry.scanId === scanId ? { ...entry, isFoil } : entry,
      ),
    );
    if (collection) {
      setCollectionCardFoil(collection.guid, scanId, isFoil).catch((err) =>
        console.error("Failed to update foil status:", err),
      );
    }
  }, []);

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
        forceFoil,
        elapsedMs,
        isTimerActive,
        setAutoFeed,
        setForceFoil,
        registerCardArrivedHook,
        registerPauseHook,
        addCard,
        addUnmatchedCard,
        removeUnmatchedCard,
        sendCatchAllBin,
        removeCard,
        removeCards,
        correctCard,
        toggleFoil,
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
