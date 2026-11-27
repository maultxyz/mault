import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { QuickAddPanel } from "@/features/cards/components/quick-add-panel";
import type { QuickAddDialogProps } from "@/lib/interfaces/cards";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function QuickAddDialog({
  open,
  onOpenChange,
  collectionGuid,
  locationGuid,
}: QuickAddDialogProps) {
  const { t } = useTranslation("cards");
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("quickAdd.title")}
      description={t("quickAdd.description")}
      initialFocusRef={searchInputRef}
      className="sm:max-w-5xl"
    >
      <QuickAddPanel
        initialCollectionGuid={collectionGuid}
        initialLocationGuid={locationGuid}
        searchInputRef={searchInputRef}
      />
    </DynamicDialog>
  );
}
