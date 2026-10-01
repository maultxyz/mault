import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { CardSearchPicker } from "@/features/cards/components/card-search-picker";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import type { IdentifyUnmatchedDialogProps } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import type { PlayingCard } from "@magic-vault/shared";
import { IconPhotoOff } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function IdentifyUnmatchedDialog({
  entry,
  collectionGuid,
  onClose,
}: IdentifyUnmatchedDialogProps) {
  const { t } = useTranslation("scanner");
  const { identifyUnmatchedCard } = useScannedCards();
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = async (card: PlayingCard) => {
    if (!entry || isSaving) return;
    setIsSaving(true);
    const added = await identifyUnmatchedCard(entry.scanId, card);
    setIsSaving(false);
    if (!added) {
      toast.error(t("unmatchedCardsPanel.identifyFailed"));
      return;
    }
    toast.success(t("unmatchedCardsPanel.identified", { name: card.name }));
    onClose();
  };

  return (
    <DynamicDialog
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("unmatchedCardsPanel.identifyTitle")}
      description={t("unmatchedCardsPanel.identifyDescription")}
      className="sm:max-w-2xl data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
    >
      {entry && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="aspect-[2.5/3.5] w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
              {entry.capturedImageUrl ? (
                <img
                  src={entry.capturedImageUrl}
                  alt={t("unmatchedCardsPanel.imageAlt")}
                  className="h-full w-full object-fill"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <IconPhotoOff className="size-4 text-foreground/70" />
                </div>
              )}
            </div>
            {entry.diagnostics && (
              <p className="text-sm text-foreground/70">
                {t(`unmatchedCardsPanel.reasons.${entry.diagnostics.reason}`)}
              </p>
            )}
          </div>
          <CardSearchPicker
            collectionGuid={collectionGuid}
            disabled={isSaving}
            onSelect={(card) => void handleSelect(card)}
          />
        </div>
      )}
    </DynamicDialog>
  );
}
