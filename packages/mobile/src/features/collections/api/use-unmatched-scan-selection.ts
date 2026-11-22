import { UNMATCHED_BULK_SELECTION_MAX } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast-provider";
import type { UnmatchedScanSelectionState } from "@/lib/interfaces/scanner";

export function useUnmatchedScanSelection(): UnmatchedScanSelectionState {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);

  const warnAboutLimit = () =>
    showToast({ message: t("unmatchedCards.selection.limitReached", { max: UNMATCHED_BULK_SELECTION_MAX }) });

  const toggle = (scanId: string) => {
    if (selectedScanIds.includes(scanId)) {
      setSelectedScanIds(selectedScanIds.filter((selected) => selected !== scanId));
      return;
    }
    if (selectedScanIds.length >= UNMATCHED_BULK_SELECTION_MAX) {
      warnAboutLimit();
      return;
    }
    setSelectedScanIds([...selectedScanIds, scanId]);
  };

  const selectMany = (scanIds: string[]) => {
    const additions = scanIds.filter((scanId) => !selectedScanIds.includes(scanId));
    const room = UNMATCHED_BULK_SELECTION_MAX - selectedScanIds.length;
    if (additions.length > room) warnAboutLimit();
    setSelectedScanIds([...selectedScanIds, ...additions.slice(0, Math.max(0, room))]);
  };

  return {
    isSelecting,
    selectedScanIds,
    isSelected: (scanId) => selectedScanIds.includes(scanId),
    startSelecting: () => setIsSelecting(true),
    stopSelecting: () => {
      setIsSelecting(false);
      setSelectedScanIds([]);
    },
    toggle,
    selectMany,
    clear: () => setSelectedScanIds([]),
  };
}
