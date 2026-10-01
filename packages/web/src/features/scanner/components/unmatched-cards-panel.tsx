import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { UnmatchedCardsPanelProps } from "@/lib/interfaces/scanner";
import { UnmatchedDiagnosticsDetails } from "@/features/scanner/components/unmatched-diagnostics-details";
import { IconPhotoOff, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsPanel({
  cards,
  onRemove,
  onIdentify,
}: UnmatchedCardsPanelProps) {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  if (cards.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden flex-none">
      <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide px-2 pt-2 pb-1.5">
        {t("unmatchedCardsPanel.heading", { count: cards.length })}
      </p>
      <div className="flex gap-1.5 p-1.5 overflow-x-auto">
        {cards.map((entry) => (
          <Popover key={entry.scanId}>
            <PopoverTrigger
              render={
                <div className="relative shrink-0 rounded-md overflow-hidden border bg-muted w-20 aspect-square group cursor-pointer">
                  {entry.capturedImageUrl ? (
                    <img
                      src={entry.capturedImageUrl}
                      alt={t("unmatchedCardsPanel.imageAlt")}
                      className="w-full h-full object-fill"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconPhotoOff className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  {entry.diagnostics && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">
                      {t(
                        `unmatchedCardsPanel.reasons.${entry.diagnostics.reason}`,
                      )}
                    </span>
                  )}
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
                  className="w-48 aspect-square rounded-md object-fill"
                />
              ) : (
                <p className="px-1.5 py-1 text-muted-foreground">
                  {t("unmatchedCardsPanel.noImage")}
                </p>
              )}
              {entry.diagnostics && (
                <UnmatchedDiagnosticsDetails diagnostics={entry.diagnostics} />
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
        ))}
      </div>
    </div>
  );
}
