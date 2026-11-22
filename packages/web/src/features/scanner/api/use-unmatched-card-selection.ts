import type { UnmatchedCardSelectionState } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { UNMATCHED_BULK_SELECTION_MAX } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function useUnmatchedCardSelection(): UnmatchedCardSelectionState {
  const { t } = useTranslation("scanner");
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);

  const warnAboutLimit = () =>
    toast.info(
      t("unmatchedCardsPanel.selection.limitReached", {
        max: UNMATCHED_BULK_SELECTION_MAX,
      }),
    );

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
    selectedScanIds,
    isSelected: (scanId) => selectedScanIds.includes(scanId),
    toggle,
    selectMany,
    clear: () => setSelectedScanIds([]),
  };
}
