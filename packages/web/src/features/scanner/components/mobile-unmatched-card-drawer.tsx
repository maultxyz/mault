import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { removeUnmatchedCard } from "@/features/collections/api/collections";
import { UnmatchedDiagnosticsDetails } from "@/features/scanner/components/unmatched-diagnostics-details";
import type { MobileUnmatchedCardDrawerProps } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { IconPhotoOff, IconSearch, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function MobileUnmatchedCardDrawer({
  entry,
  collectionGuid,
  onIdentify,
  onClose,
}: MobileUnmatchedCardDrawerProps) {
  const { t } = useTranslation("scanner");
  const [shownEntry, setShownEntry] = useState(entry);
  if (entry && entry !== shownEntry) setShownEntry(entry);

  const remove = useMutation({
    mutationFn: async (scanId: string) => {
      const result = await removeUnmatchedCard(collectionGuid, scanId);
      if (!result.success) throw new Error(result.message);
    },
    onSuccess: onClose,
    onError: () => toast.error(t("unmatchedCardsPanel.removeFailed")),
  });

  return (
    <Drawer
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[92dvh]">
        {shownEntry && (
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="min-w-0">
              <DrawerTitle className="truncate text-base font-semibold">
                {shownEntry.diagnostics
                  ? t(
                      `unmatchedCardsPanel.reasons.${shownEntry.diagnostics.reason}`,
                    )
                  : t("unmatchedCardsPanel.imageAlt")}
              </DrawerTitle>
              <DrawerDescription className="truncate text-xs text-foreground/70">
                {[
                  shownEntry.binNumber != null
                    ? t("mobileMonitor.bin", { number: shownEntry.binNumber })
                    : null,
                  new Date(shownEntry.scannedAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </DrawerDescription>
            </div>

            <div className="mx-auto aspect-[2.5/3.5] w-48 shrink-0 overflow-hidden rounded-lg border bg-muted">
              {shownEntry.capturedImageUrl ? (
                <img
                  src={shownEntry.capturedImageUrl}
                  alt={t("unmatchedCardsPanel.imageAlt")}
                  className="h-full w-full object-fill"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-foreground/70">
                  <IconPhotoOff className="size-5" />
                  {t("unmatchedCardsPanel.noImage")}
                </div>
              )}
            </div>

            {shownEntry.diagnostics && (
              <UnmatchedDiagnosticsDetails
                diagnostics={shownEntry.diagnostics}
                className="w-full px-0 text-sm"
              />
            )}

            <div className="flex flex-col gap-2">
              <Button
                className="h-11 w-full text-sm"
                onClick={() => onIdentify(shownEntry)}
              >
                <IconSearch className="size-5" />
                {t("unmatchedCardsPanel.identify")}
              </Button>
              <Button
                variant="destructive"
                className="h-11 w-full text-sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(shownEntry.scanId)}
              >
                <IconTrash className="size-5" />
                {t("unmatchedCardsPanel.remove")}
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
