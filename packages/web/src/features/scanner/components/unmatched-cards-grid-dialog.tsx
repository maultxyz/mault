import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { UnmatchedCardsBrowser } from "@/features/scanner/components/unmatched-cards-browser";
import type { UnmatchedCardsGridDialogProps } from "@/lib/interfaces/scanner";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsGridDialog({
  open,
  onOpenChange,
  openIndex,
  onOpenIndexChange,
  collectionGuid,
  canIdentify,
  onRemove,
  onRemoveAll,
}: UnmatchedCardsGridDialogProps) {
  const { t } = useTranslation("scanner");
  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("unmatchedCardsPanel.gridTitle")}
      description={t("unmatchedCardsPanel.gridDescription")}
      className="sm:max-w-6xl md:h-[85dvh] data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
    >
      <UnmatchedCardsBrowser
        collectionGuid={collectionGuid}
        openIndex={openIndex}
        onOpenIndexChange={onOpenIndexChange}
        canIdentify={canIdentify}
        onRemove={onRemove}
        onRemoveAll={onRemoveAll}
        className="min-h-0 overflow-y-auto border-t"
      />
    </DynamicDialog>
  );
}
