import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { UnmatchedCardsPanelProps } from "@/lib/interfaces/scanner";
import { useUnmatchedView } from "@/features/scanner/api/use-unmatched-view";
import { UnmatchedCardsGridDialog } from "@/features/scanner/components/unmatched-cards-grid-dialog";
import type { UnmatchedCard } from "@magic-vault/shared";
import { IconLayoutGrid, IconPhotoOff, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsPanel({
  cards,
  total,
  collectionGuid,
  canIdentify = false,
  onRemove,
}: UnmatchedCardsPanelProps) {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const [gridOpen, setGridOpen] = useState(false);
  const [dialogIndex, setDialogIndex] = useState<number | null>(null);
  const unmatchedView = useUnmatchedView();
  if (total === 0 && cards.length === 0) {
    if (gridOpen) setGridOpen(false);
    return null;
  }

  const openBrowser = (index: number | null) => {
    if (isMobile) {
      setDialogIndex(index);
      setGridOpen(true);
    } else {
      unmatchedView.open(index);
    }
  };

  const tileContent = (entry: UnmatchedCard) => (
    <>
      {entry.capturedImageUrl ? (
        <img
          src={entry.capturedImageUrl}
          alt={t("unmatchedCardsPanel.imageAlt")}
          className="w-full h-full object-fill"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <IconPhotoOff className="size-4 text-foreground/70" />
        </div>
      )}
      {entry.diagnostics && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-2xs text-white">
          {t(`unmatchedCardsPanel.reasons.${entry.diagnostics.reason}`)}
        </span>
      )}
    </>
  );
  const tileClass =
    "relative shrink-0 rounded-md overflow-hidden border bg-muted w-20 aspect-[2.5/3.5] group";

  return (
    <div className="rounded-lg border border-warning-border bg-warning-muted overflow-hidden flex-none">
      <div className="flex items-center justify-between gap-2 px-2 pt-2">
        <p className="text-2xs font-medium text-warning-foreground uppercase tracking-wide">
          {t("unmatchedCardsPanel.heading", {
            count: Math.max(total, cards.length),
          })}
        </p>
        {total > cards.length && (
          <p className="text-2xs text-warning-foreground">
            {t("unmatchedCardsPanel.showingRecent", { count: cards.length })}
          </p>
        )}
      </div>
      <div className="flex gap-1.5 p-1.5 overflow-x-auto">
        {cards.map((entry, index) =>
          collectionGuid ? (
            <div key={entry.scanId} className={tileClass}>
              <button
                type="button"
                className="absolute inset-0 cursor-pointer"
                aria-label={t("unmatchedCardsPanel.openCard")}
                onClick={() => openBrowser(index)}
              >
                {tileContent(entry)}
              </button>
              {onRemove && !isMobile && (
                <Button
                  size="icon-xs"
                  variant="destructive"
                  aria-label={t("unmatchedCardsPanel.remove")}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  onClick={() => void onRemove(entry.scanId)}
                >
                  <IconX />
                </Button>
              )}
            </div>
          ) : (
            <div key={entry.scanId} className={tileClass}>
              {tileContent(entry)}
            </div>
          ),
        )}
      </div>
      {collectionGuid && (
        <>
          <div className="px-1.5 pb-1.5">
            <Button className="w-full" onClick={() => openBrowser(null)}>
              <IconLayoutGrid />
              {t("unmatchedCardsPanel.viewAll", {
                count: Math.max(total, cards.length),
              })}
            </Button>
          </div>
          <UnmatchedCardsGridDialog
            open={isMobile && gridOpen}
            onOpenChange={setGridOpen}
            openIndex={dialogIndex}
            onOpenIndexChange={setDialogIndex}
            collectionGuid={collectionGuid}
            canIdentify={canIdentify}
            onRemove={onRemove}
          />
        </>
      )}
    </div>
  );
}
