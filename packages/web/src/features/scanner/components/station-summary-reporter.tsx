import { collectionCardsSummaryQueryOptions } from "@/features/collections/api/collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { stationCanResume } from "@/features/scanner/lib/station-attention";
import { setStationSummary } from "@/features/scanner/lib/station-summary-store";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { usePiHost } from "@/hooks/use-pi-host";
import {
  pausePiScanSession,
  resumePiScanSession,
} from "@/features/scanner/api/pi-scan-session";
import {
  applyPiScanState,
  getPiScanState,
  subscribePiScan,
} from "@/features/scanner/lib/pi-scan-store";

export function StationSummaryReporter() {
  const { station } = useStation();
  const { stations } = useStations();
  const piHost = usePiHost();
  const hostState = useSyncExternalStore(subscribePiScan, getPiScanState);
  const usesHostSession = piHost && station.id === stations[0]?.id;
  const { isTimerActive, pause, resume, attention } = useScannedCards();
  const { isReady } = useSerial();
  const { activeCollection, collections } = useCollections();
  const collectionGuid = usesHostSession
    ? (hostState.collectionGuid ?? undefined)
    : activeCollection?.guid;
  const collectionName = usesHostSession
    ? (collections.find((collection) => collection.guid === collectionGuid)
        ?.name ?? null)
    : (activeCollection?.name ?? null);
  const isRunning = usesHostSession
    ? hostState.phase === "running" && !hostState.stopping
    : isTimerActive;
  const { data: collectionSummary } = useQuery(
    collectionCardsSummaryQueryOptions(collectionGuid, ALL_CARDS_QUERY),
  );
  const totalCount = collectionSummary?.all.totalCount ?? 0;
  const { registerSorterControl } = useSorterSelection();
  const selectionKey = station.deviceGuid ?? station.id;
  const canResume = usesHostSession
    ? hostState.phase === "paused" && !hostState.stopping
    : stationCanResume(isReady, isTimerActive, attention);
  const pauseSorter = useCallback(() => {
    if (!usesHostSession) return pause();
    if (hostState.phase !== "running" || hostState.stopping) return;
    void pausePiScanSession().then((result) => {
      if (result.data) applyPiScanState(result.data);
    });
  }, [usesHostSession, hostState.phase, hostState.stopping, pause]);
  const resumeSorter = useCallback(() => {
    if (!usesHostSession) return resume();
    if (hostState.phase !== "paused" || hostState.stopping) return;
    void resumePiScanSession().then((result) => {
      if (result.data) applyPiScanState(result.data);
    });
  }, [usesHostSession, hostState.phase, hostState.stopping, resume]);

  useEffect(
    () =>
      registerSorterControl(selectionKey, {
        isRunning,
        canResume,
        pause: pauseSorter,
        resume: resumeSorter,
      }),
    [
      registerSorterControl,
      selectionKey,
      isRunning,
      canResume,
      pauseSorter,
      resumeSorter,
    ],
  );

  useEffect(() => {
    setStationSummary(station.id, {
      isRunning,
      totalCount,
      collectionName,
    });
  }, [station.id, isRunning, totalCount, collectionName]);

  useEffect(() => () => setStationSummary(station.id, null), [station.id]);

  return null;
}
