import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { ANNOUNCED_SORTER_PHASES } from "@/lib/constants/sorter";
import type { SorterPhase } from "@/lib/interfaces/sorter";

export function useSorterPhaseAnnouncements(phase: SorterPhase) {
  const { t } = useTranslation();
  const previousPhaseRef = useRef(phase);

  useEffect(() => {
    if (previousPhaseRef.current === phase) return;
    previousPhaseRef.current = phase;
    if (ANNOUNCED_SORTER_PHASES.includes(phase)) AccessibilityInfo.announceForAccessibility(t(`sorter.phase.${phase}`));
  }, [phase, t]);
}
