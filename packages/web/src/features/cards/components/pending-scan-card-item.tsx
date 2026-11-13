import { Badge } from "@/components/ui/badge";
import type { PendingScanCardItemProps } from "@/lib/interfaces/cards";
import { useTranslation } from "react-i18next";

export function PendingScanCardItem({ card }: PendingScanCardItemProps) {
  const { t } = useTranslation("cards");
  return (
    <div
      aria-busy="true"
      className="relative rounded-lg p-1 bg-muted border animate-in fade-in-0 zoom-in-90 duration-300 motion-reduce:animate-none"
    >
      <span className="sr-only">
        {t("cardGrid.pendingScanSavingName", { name: card.name })}
      </span>
      <div className="aspect-[2.5/3.5] rounded-md overflow-hidden animate-pulse motion-reduce:animate-none motion-reduce:opacity-60">
        <img
          src={card.image?.normal || ""}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <Badge
        variant="secondary"
        aria-hidden="true"
        className="absolute top-2 left-2 z-20 shadow-md"
      >
        {t("cardGrid.pendingScanSaving")}
      </Badge>
      <div className="flex min-w-0 flex-row items-center gap-1.5 px-1 pb-1">
        <p className="truncate text-xs font-semibold uppercase" title={card.set}>
          {card.set}
        </p>
        <p className="min-w-0 truncate text-xs text-foreground/70">
          #{card.collectorNumber}
        </p>
      </div>
    </div>
  );
}
