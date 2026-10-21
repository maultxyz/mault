import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { UnmatchedCardsPanelProps } from "@/lib/interfaces/scanner";
import { UnmatchedCardsGridDialog } from "@/features/scanner/components/unmatched-cards-grid-dialog";
import { UnmatchedDiagnosticsDetails } from "@/features/scanner/components/unmatched-diagnostics-details";
import type { UnmatchedCard } from "@magic-vault/shared";
import {
  IconArrowsMaximize,
  IconPhotoOff,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsPanel({
  cards,
  onRemove,
  onIdentify,
  onOpen,
}: UnmatchedCardsPanelProps) {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const [gridOpen, setGridOpen] = useState(false);
  if (cards.length === 0) {
    if (gridOpen) setGridOpen(false);
    return null;
  }

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
    "relative shrink-0 rounded-md overflow-hidden border bg-muted w-20 aspect-[2.5/3.5] group cursor-pointer";

  return (
    <div className="rounded-lg border border-warning-border bg-warning-muted overflow-hidden flex-none">
      <div className="flex items-center justify-between gap-2 pl-2 pr-1 pt-1">
        <p className="text-2xs font-medium text-warning-foreground uppercase tracking-wide">
          {t("unmatchedCardsPanel.heading", { count: cards.length })}
        </p>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t("unmatchedCardsPanel.expand")}
          title={t("unmatchedCardsPanel.expand")}
          onClick={() => setGridOpen(true)}
        >
          <IconArrowsMaximize />
        </Button>
      </div>
      <div className="flex gap-1.5 p-1.5 overflow-x-auto">
        {cards.map((entry) =>
          onOpen ? (
            <button
              key={entry.scanId}
              type="button"
              className={tileClass}
              onClick={() => onOpen(entry)}
            >
              {tileContent(entry)}
            </button>
          ) : (
            <Popover key={entry.scanId}>
              <PopoverTrigger
                render={
                  <div className={tileClass}>
                    {tileContent(entry)}
                    {onRemove && (
                      <Button
                        size="icon-xs"
                        variant="destructive"
                        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(entry.scanId);
                        }}
                      >
                        <IconX className="size-2.5" />
                      </Button>
                    )}
                  </div>
                }
              />
              <PopoverContent
                side={isMobile ? "bottom" : "right"}
                className="w-auto p-1 gap-1"
              >
                {entry.capturedImageUrl ? (
                  <img
                    src={entry.capturedImageUrl}
                    alt={t("unmatchedCardsPanel.imageAlt")}
                    className="w-48 aspect-[2.5/3.5] rounded-md object-fill"
                  />
                ) : (
                  <p className="px-1.5 py-1 text-foreground/70">
                    {t("unmatchedCardsPanel.noImage")}
                  </p>
                )}
                {entry.diagnostics && (
                  <UnmatchedDiagnosticsDetails
                    diagnostics={entry.diagnostics}
                  />
                )}
                {onIdentify && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onIdentify(entry)}
                  >
                    <IconSearch />
                    {t("unmatchedCardsPanel.identify")}
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          ),
        )}
      </div>
      <UnmatchedCardsGridDialog
        open={gridOpen}
        onOpenChange={setGridOpen}
        cards={cards}
        onRemove={onRemove}
        onIdentify={onIdentify}
      />
    </div>
  );
}
