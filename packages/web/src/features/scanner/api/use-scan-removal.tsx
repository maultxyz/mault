import { usePiHost } from "@/hooks/use-pi-host";
import {
  applyPiScanState,
  getPiScanState,
  subscribePiScan,
} from "@/features/scanner/lib/pi-scan-store";
import {
  updatePiScanSettings,
  updatePiScanRemoval,
  piScanHoldsPort,
} from "@/features/scanner/api/pi-scan-session";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { fetchCollectionCardCopies } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { useHandScan } from "@/features/scanner/lib/hand-scan";
import type { ScanRemovalContextValue } from "@/lib/interfaces/scan-removal";
import {
  createScanRemovalEntry,
  resolveRemovalBinNumber,
  scanIdsToRemove,
  scanRemovalCandidateCardIds,
  type PlayingCardWithDistance,
  type ScannedCard,
  type ScanRemovalEntry,
} from "@magic-vault/shared";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";

const ScanRemovalContext = createContext<ScanRemovalContextValue | null>(null);

export function ScanRemovalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const { activeCollection } = useCollections();
  const { configs: binConfigs } = useBinConfigs();
  const { removeCards, sendCardToBin, sendCatchAllBin } = useScannedCards();
  const { isConnected } = useSerial();
  const [, setHandScan] = useHandScan();
  const [localRemoveModeEnabled, setIsRemoveModeEnabled] = useState(false);
  const [chosenRemovalBinNumber, setRemovalBinNumber] = useState<number | null>(
    null,
  );
  const [localEntries, setEntries] = useState<ScanRemovalEntry[]>([]);
  const [pendingLookupCount, setPendingLookupCount] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);
  const [queueCollectionGuid, setQueueCollectionGuid] = useState(
    activeCollection?.guid,
  );
  const piHost = usePiHost();
  const host = useSyncExternalStore(subscribePiScan, getPiScanState);
  const hostQueue = piHost && host.collectionGuid === activeCollection?.guid;
  const hostLive = hostQueue && piScanHoldsPort(host);
  const entries = useMemo(
    () => (hostQueue ? (host.removalEntries ?? []) : localEntries),
    [hostQueue, host.removalEntries, localEntries],
  );
  const isRemoveModeEnabled = hostLive
    ? (host.removalEnabled ?? false)
    : localRemoveModeEnabled;
  const sendRemovalAction = useCallback(
    async (action: Parameters<typeof updatePiScanRemoval>[0]) => {
      const result = await updatePiScanRemoval(action);
      if (!result.success)
        throw new Error(
          result.message ?? "The removal queue could not be updated.",
        );
      if (result.data) applyPiScanState(result.data);
    },
    [],
  );
  const nextEntryIdRef = useRef(0);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const activeCollectionGuid = activeCollection?.guid;

  if (queueCollectionGuid !== activeCollectionGuid) {
    setQueueCollectionGuid(activeCollectionGuid);
    setEntries([]);
  }

  const isRemoveModeActive = isRemoveModeEnabled && !!activeCollectionGuid;
  const removalBinNumber = resolveRemovalBinNumber(
    binConfigs,
    hostLive ? (host.removalBinNumber ?? null) : chosenRemovalBinNumber,
  );

  const setRemoveModeEnabled = useCallback(
    (enabled: boolean) => {
      setIsRemoveModeEnabled(enabled);
      if (enabled && !piHost) setHandScan(true);
      if (hostLive)
        void updatePiScanSettings({ removalEnabled: enabled }).then(
          (result) => {
            if (result.data) applyPiScanState(result.data);
          },
        );
    },
    [setHandScan, piHost, hostLive],
  );

  const routeRemovalScan = useCallback(
    (cardName: string, wasQueued: boolean) => {
      if (wasQueued && removalBinNumber != null) {
        sendCardToBin(removalBinNumber, cardName);
      } else {
        sendCatchAllBin();
      }
    },
    [removalBinNumber, sendCardToBin, sendCatchAllBin],
  );

  const queueScannedCard = useCallback(
    (
      matchedCard: PlayingCardWithDistance,
      alternativeMatches: PlayingCardWithDistance[],
    ) => {
      if (!activeCollectionGuid) return;
      const entryId = String(nextEntryIdRef.current++);
      setPendingLookupCount((count) => count + 1);
      fetchCollectionCardCopies(
        activeCollectionGuid,
        scanRemovalCandidateCardIds(matchedCard, alternativeMatches),
      )
        .then((copies: ScannedCard[]) => {
          const entry = createScanRemovalEntry({
            entryId,
            matchedCard,
            copies,
            existingEntries: entriesRef.current,
          });
          entriesRef.current = [entry, ...entriesRef.current];
          setEntries((current) => [entry, ...current]);
          routeRemovalScan(matchedCard.name, entry.selectedScanId != null);
        })
        .catch(() => {
          routeRemovalScan(matchedCard.name, false);
          toast.error(
            t("scanRemoval.lookupFailed", { name: matchedCard.name }),
          );
        })
        .finally(() => setPendingLookupCount((count) => count - 1));
    },
    [activeCollectionGuid, routeRemovalScan, toast, t],
  );

  const handleRemovalNoMatch = useCallback(() => {
    sendCatchAllBin();
    toast.info(t("scanRemoval.noMatch"));
  }, [sendCatchAllBin, toast, t]);

  const selectEntryCopy = useCallback(
    (entryId: string, scanId: string) => {
      if (hostQueue) {
        void sendRemovalAction({ action: "select", entryId, scanId }).catch(
          () => toast.error(t("scanRemoval.removeFailed")),
        );
        return;
      }
      setEntries((current) =>
        current.map((entry) =>
          entry.entryId === entryId
            ? { ...entry, selectedScanId: scanId }
            : entry,
        ),
      );
    },
    [hostQueue, sendRemovalAction, toast, t],
  );

  const dropEntry = useCallback(
    (entryId: string) => {
      if (hostQueue) {
        void sendRemovalAction({ action: "drop", entryId }).catch(() =>
          toast.error(t("scanRemoval.removeFailed")),
        );
        return;
      }
      setEntries((current) =>
        current.filter((entry) => entry.entryId !== entryId),
      );
    },
    [hostQueue, sendRemovalAction, toast, t],
  );

  const clearEntries = useCallback(() => {
    if (hostQueue)
      void sendRemovalAction({ action: "clear" }).catch(() =>
        toast.error(t("scanRemoval.removeFailed")),
      );
    else setEntries([]);
  }, [hostQueue, sendRemovalAction, toast, t]);

  const chooseRemovalBin = useCallback(
    (binNumber: number) => {
      setRemovalBinNumber(binNumber);
      if (hostLive)
        void updatePiScanSettings({ removalBinNumber: binNumber }).then(
          (result) => {
            if (result.data) applyPiScanState(result.data);
          },
        );
    },
    [hostLive],
  );

  const queuedCount = useMemo(() => scanIdsToRemove(entries).length, [entries]);

  const removeQueuedCards = useCallback(async () => {
    const scanIds = scanIdsToRemove(entries);
    if (scanIds.length === 0) return;
    setIsRemoving(true);
    const removed = hostQueue
      ? await sendRemovalAction({ action: "remove" }).then(
          () => true,
          () => false,
        )
      : await removeCards(scanIds);
    setIsRemoving(false);
    if (!removed) {
      toast.error(t("scanRemoval.removeFailed"));
      return;
    }
    setEntries([]);
    toast.success(t("scanRemoval.removed", { count: scanIds.length }));
  }, [entries, removeCards, hostQueue, sendRemovalAction, toast, t]);

  const value = useMemo(
    () => ({
      isRemoveModeEnabled,
      isRemoveModeActive,
      isSorterConnected: hostLive || isConnected,
      setRemoveModeEnabled,
      removalBinNumber,
      setRemovalBinNumber: chooseRemovalBin,
      entries,
      queuedCount,
      pendingLookupCount:
        hostQueue && host.removalBusy ? 1 : pendingLookupCount,
      isRemoving,
      queueScannedCard,
      handleRemovalNoMatch,
      selectEntryCopy,
      dropEntry,
      clearEntries,
      removeQueuedCards,
    }),
    [
      isRemoveModeEnabled,
      isRemoveModeActive,
      isConnected,
      setRemoveModeEnabled,
      removalBinNumber,
      chooseRemovalBin,
      hostLive,
      hostQueue,
      host.removalBusy,
      entries,
      queuedCount,
      pendingLookupCount,
      isRemoving,
      queueScannedCard,
      handleRemovalNoMatch,
      selectEntryCopy,
      dropEntry,
      clearEntries,
      removeQueuedCards,
    ],
  );

  return <ScanRemovalContext value={value}>{children}</ScanRemovalContext>;
}

export function useScanRemoval() {
  const context = useContext(ScanRemovalContext);
  if (!context) {
    throw new Error("useScanRemoval must be used within a ScanRemovalProvider");
  }
  return context;
}
