import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UnmatchedCard } from "@magic-vault/shared";
import { IconPhotoOff, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsPanel({
  cards,
  onRemove,
}: {
  cards: UnmatchedCard[];
  onRemove?: (scanId: string) => void;
}) {
  const { t } = useTranslation("scanner");
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
                <div className="relative shrink-0 rounded-md overflow-hidden border bg-muted w-20 aspect-[2.5/3.5] group cursor-pointer">
                  {entry.capturedImageUrl ? (
                    <img
                      src={entry.capturedImageUrl}
                      alt={t("unmatchedCardsPanel.imageAlt")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconPhotoOff className="size-4 text-muted-foreground" />
                    </div>
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
            <PopoverContent side="right" className="w-auto p-1 gap-0">
              {entry.capturedImageUrl ? (
                <img
                  src={entry.capturedImageUrl}
                  alt={t("unmatchedCardsPanel.imageAlt")}
                  className="w-48 rounded-md"
                />
              ) : (
                <p className="px-1.5 py-1 text-muted-foreground">
                  {t("unmatchedCardsPanel.noImage")}
                </p>
              )}
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
}
