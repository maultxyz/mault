import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { piScanHoldsPort } from "@/features/scanner/api/pi-scan-session";
import {
  getPiScanState,
  subscribePiScan,
} from "@/features/scanner/lib/pi-scan-store";
import { useSyncExternalStore } from "react";
import { usePiHostState } from "@/hooks/use-pi-host";

export function useIsSessionActive() {
  const localSessionActive = useScannedCards().isTimerActive;
  const { piSorter } = usePiHostState();
  const piSession = useSyncExternalStore(subscribePiScan, getPiScanState);
  return localSessionActive || (piSorter && piScanHoldsPort(piSession));
}
