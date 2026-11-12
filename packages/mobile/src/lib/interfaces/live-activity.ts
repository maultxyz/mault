import type { ScannerPhase } from "@/lib/interfaces/scanner";

export interface ScanSessionLiveActivityProps {
  title: string;
  collectionName: string;
  statusLabel: string;
  isRunning: boolean;
  scannedCountLabel: string;
  scannedCount: number;
  lastCardLabel: string;
  binLabel: string;
}

export interface ScanLiveActivityOptions {
  isActive: boolean;
  phase: ScannerPhase;
  collectionName: string | null;
  sessionCount: number;
  lastCardName: string | null;
  lastBinNumber: number | null;
}
