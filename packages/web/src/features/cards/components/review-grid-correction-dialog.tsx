import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useScanImage } from "@/features/cards/api/use-scan-image";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import type { ReviewGridCorrectionDialogProps } from "@/lib/interfaces/cards";
import { useTranslation } from "react-i18next";

export function ReviewGridCorrectionDialog({
  card,
  onSelect,
  onClose,
}: ReviewGridCorrectionDialogProps) {
  const { t } = useTranslation("cards");
  const { data: capturedImageUrl, isLoading: isCapturedImageLoading } =
    useScanImage(card?.collectionGuid, card?.scanId);
  const capturedImage = capturedImageUrl ? (
    <CapturedImageThumb
      src={capturedImageUrl}
      alt={t("cardPicker.scannedAlt")}
    />
  ) : isCapturedImageLoading ? (
    <Skeleton className="h-full w-full rounded-none" />
  ) : undefined;

  return (
    <DynamicDialog
      open={!!card}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("reviewGrid.correctTitle", { name: card?.card.name ?? "" })}
      className="sm:max-w-4xl"
    >
      {card && (
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <CardCorrectionSearch
            collectionGuid={card.collectionGuid}
            initialQuery={card.card.name}
            capturedImage={capturedImage}
            onSelect={(correctedCard) => onSelect(card, correctedCard)}
            onCancel={onClose}
          />
        </div>
      )}
    </DynamicDialog>
  );
}
