import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";

export function useIsSessionActive() {
  return useScannedCards().isTimerActive;
}
