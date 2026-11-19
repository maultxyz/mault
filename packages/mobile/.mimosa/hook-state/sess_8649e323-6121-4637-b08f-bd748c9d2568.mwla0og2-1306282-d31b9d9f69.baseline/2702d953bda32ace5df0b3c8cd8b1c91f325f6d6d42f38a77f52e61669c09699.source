import { useTranslation } from "react-i18next";
import { Sheet } from "@/components/ui/sheet";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import { BATCH_SCAN_CORRECTION_SHEET_MAX_HEIGHT_RATIO } from "@/lib/constants/scanner";
import type { BatchScanCorrectionSheetProps } from "@/lib/interfaces/scanner";

export function BatchScanCorrectionSheet({ card, collectionGuid, onSelect, onClose }: BatchScanCorrectionSheetProps) {
  const { t } = useTranslation();
  const currentName = card?.correctedCard?.name ?? card?.outcome?.card?.name ?? "";

  return (
    <Sheet
      visible={!!card}
      onClose={onClose}
      title={t("batchScan.pickCard")}
      description={currentName || null}
      maxHeightRatio={BATCH_SCAN_CORRECTION_SHEET_MAX_HEIGHT_RATIO}
    >
      {card ? (
        <CardCorrectionSearch key={card.key} collectionGuid={collectionGuid} initialQuery={currentName} onSelect={onSelect} />
      ) : null}
    </Sheet>
  );
}
