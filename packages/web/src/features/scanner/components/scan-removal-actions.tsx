import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import type { ScanRemovalActionsProps } from "@/lib/interfaces/scan-removal";
import { cn } from "@/lib/utils";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ScanRemovalActions({ className }: ScanRemovalActionsProps) {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const {
    entries,
    queuedCount,
    pendingLookupCount,
    isRemoving,
    clearEntries,
    removeQueuedCards,
  } = useScanRemoval();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <Button
        variant="outline"
        disabled={entries.length === 0 || isRemoving}
        onClick={clearEntries}
      >
        {t("scanRemoval.clear")}
      </Button>
      <Button
        variant="destructive"
        disabled={queuedCount === 0 || pendingLookupCount > 0 || isRemoving}
        onClick={() => setConfirmOpen(true)}
      >
        <IconTrash />
        {t("scanRemoval.removeButton", { count: queuedCount })}
      </Button>
      <DeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("scanRemoval.confirmTitle", { count: queuedCount })}
        description={t("scanRemoval.confirmDescription", {
          collection: activeCollection?.name ?? "",
        })}
        confirmLabel={t("scanRemoval.removeButton", { count: queuedCount })}
        onConfirm={() => {
          setConfirmOpen(false);
          void removeQueuedCards();
        }}
      />
    </div>
  );
}
