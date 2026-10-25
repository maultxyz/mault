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
} from "react";
import { useTranslation } from "react-i18next";

const ScanRemovalContext = createContext<ScanRemovalContextValue | null>(null);

export function ScanRemovalProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const { activeCollection } = useCollections();
  const { configs: binConfigs } = useBinConfigs();
  const { removeCards, sendCardToBin, sendCatchAllBin } = useScannedCards();
  const { isConnected } = useSerial();
  const [, setHandScan] = useHandScan();
  const [isRemoveModeEnabled, setIsRemoveModeEnabled] = useState(false);
  const [chosenRemovalBinNumber, setRemovalBinNumber] = useState<number | null>(
    null,
  );
  const [entries, setEntries] = useState<ScanRemovalEntry[]>([]);
  const [pendingLookupCount, setPendingLookupCount] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);
  const [queueCollectionGuid, setQueueCollectionGuid] = useState(
    activeCollection?.guid,
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
    chosenRemovalBinNumber,
  );

  const setRemoveModeEnabled = useCallback(
    (enabled: boolean) => {
      setIsRemoveModeEnabled(enabled);
      if (enabled) setHandScan(true);
    },
    [setHandScan],
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
          toast.error(t("scanRemoval.lookupFailed", { name: matchedCard.name }));
        })
        .finally(() => setPendingLookupCount((count) => count - 1));
    },
    [activeCollectionGuid, routeRemovalScan, toast, t],
  );

  const handleRemovalNoMatch = useCallback(() => {
    sendCatchAllBin();
    toast.info(t("scanRemoval.noMatch"));
  }, [sendCatchAllBin, toast, t]);

  const selectEntryCopy = useCallback((entryId: string, scanId: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.entryId === entryId ? { ...entry, selectedScanId: scanId } : entry,
      ),
    );
  }, []);

  const dropEntry = useCallback((entryId: string) => {
    setEntries((current) => current.filter((entry) => entry.entryId !== entryId));
  }, []);

  const clearEntries = useCallback(() => setEntries([]), []);

  const queuedCount = useMemo(() => scanIdsToRemove(entries).length, [entries]);

  const removeQueuedCards = useCallback(async () => {
    const scanIds = scanIdsToRemove(entries);
    if (scanIds.length === 0) return;
    setIsRemoving(true);
    const removed = await removeCards(scanIds);
    setIsRemoving(false);
    if (!removed) {
      toast.error(t("scanRemoval.removeFailed"));
      return;
    }
    setEntries([]);
    toast.success(t("scanRemoval.removed", { count: scanIds.length }));
  }, [entries, removeCards, toast, t]);

  const value = useMemo(
    () => ({
      isRemoveModeEnabled,
      isRemoveModeActive,
      isSorterConnected: isConnected,
      setRemoveModeEnabled,
      removalBinNumber,
      setRemovalBinNumber,
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
    }),
    [
      isRemoveModeEnabled,
      isRemoveModeActive,
      isConnected,
      setRemoveModeEnabled,
      removalBinNumber,
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
