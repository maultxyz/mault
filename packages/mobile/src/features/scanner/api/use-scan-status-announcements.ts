import { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { ANNOUNCED_SCANNER_PHASES } from "@/lib/constants/scanner";
import type { ScannerPhase } from "@/lib/interfaces/scanner";

export function useScanStatusAnnouncements(phase: ScannerPhase, statusText: string) {
  const announcedPhaseRef = useRef(phase);

  useEffect(() => {
    if (phase === announcedPhaseRef.current) return;
    announcedPhaseRef.current = phase;
    if (Platform.OS === "ios" && ANNOUNCED_SCANNER_PHASES.includes(phase)) {
      AccessibilityInfo.announceForAccessibility(statusText);
    }
  }, [phase, statusText]);
}
