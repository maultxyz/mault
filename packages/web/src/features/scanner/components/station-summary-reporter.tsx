import { collectionCardsSummaryQueryOptions } from "@/features/collections/api/collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { useStation } from "@/features/scanner/api/use-stations";
import { stationCanResume } from "@/features/scanner/lib/station-attention";
import { setStationSummary } from "@/features/scanner/lib/station-summary-store";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function StationSummaryReporter() {
  const { station } = useStation();
  const { isTimerActive, pause, resume, attention } = useScannedCards();
  const { isReady } = useSerial();
  const { activeCollection } = useCollections();
  const { data: collectionSummary } = useQuery(
    collectionCardsSummaryQueryOptions(activeCollection?.guid, ALL_CARDS_QUERY),
  );
  const totalCount = collectionSummary?.all.totalCount ?? 0;
  const { registerSorterControl } = useSorterSelection();
  const selectionKey = station.deviceGuid ?? station.id;
  const canResume = stationCanResume(isReady, isTimerActive, attention);

  useEffect(
    () =>
      registerSorterControl(selectionKey, {
        isRunning: isTimerActive,
        canResume,
        pause,
        resume,
      }),
    [registerSorterControl, selectionKey, isTimerActive, canResume, pause, resume],
  );

  useEffect(() => {
    setStationSummary(station.id, {
      isRunning: isTimerActive,
      totalCount,
      collectionName: activeCollection?.name ?? null,
    });
  }, [station.id, isTimerActive, totalCount, activeCollection?.name]);

  useEffect(() => () => setStationSummary(station.id, null), [station.id]);

  return null;
}
