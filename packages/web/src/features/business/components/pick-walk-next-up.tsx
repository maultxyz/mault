import { Button } from "@/components/ui/button";
import { CardThumbnail } from "@/components/card-thumbnail";
import {
  pickWalkOrderLabel,
  pickWalkPlaceTitle,
  pickWalkPrintingLabel,
  pickWalkSpotLabel,
} from "@/features/business/lib/pick-walk-labels";
import type { PickWalkNextUpProps } from "@/lib/interfaces/business";
import { IconCheck, IconEyeOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PickWalkNextUp({
  entry,
  showOrderName,
  canPick,
  isReleasing = false,
  onPicked,
  onMissing,
}: PickWalkNextUpProps) {
  const { t } = useTranslation("business");
  const spot = pickWalkSpotLabel(entry, t);
  const orderLabel = pickWalkOrderLabel(entry, showOrderName, t);

  return (
    <section className="rounded-lg bg-card p-3 ring-1 ring-border max-md:p-4">
      <div className="flex items-start gap-3 max-md:gap-4">
        <CardThumbnail
          image={entry.card.image}
          className="w-16 shrink-0 md:w-24"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-2xs font-medium uppercase tracking-wide text-foreground/60">
            {t("orders.pickWalk.nextUp")}
          </p>
          <p className="truncate font-heading text-lg font-semibold leading-tight">
            {pickWalkPlaceTitle(entry, t)}
          </p>
          <p className="text-base font-semibold text-primary tabular-nums">
            {spot}
          </p>
          <p className="truncate text-sm font-medium">{entry.card.name}</p>
          <p className="truncate text-xs text-foreground/70">
            {pickWalkPrintingLabel(entry, t)}
          </p>
          {orderLabel && (
            <p className="truncate text-xs text-foreground/70">{orderLabel}</p>
          )}
        </div>
      </div>
      {canPick && (
        <div className="mt-3 flex gap-1.5 max-md:flex-col">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={isReleasing}
            aria-label={t("orders.pickWalk.cantFindCard", {
              name: entry.card.name,
            })}
            onClick={onMissing}
          >
            <IconEyeOff />
            {t("orders.pickWalk.cantFind")}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            aria-label={
              entry.orderRef == null
                ? t("orders.pickCopy", { name: entry.card.name })
                : t("orders.pickCopyForOrder", {
                    name: entry.card.name,
                    order: entry.orderRef,
                  })
            }
            onClick={onPicked}
          >
            <IconCheck />
            {t("orders.markPicked")}
          </Button>
        </div>
      )}
    </section>
  );
}
