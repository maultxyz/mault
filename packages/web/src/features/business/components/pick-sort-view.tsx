import { Button } from "@/components/ui/button";
import { CardThumbnail } from "@/components/card-thumbnail";
import { OrderRefLabel } from "@/features/business/components/order-ref-label";
import {
  pickWalkPrintingLabel,
  pickWalkSpotLabel,
} from "@/features/business/lib/pick-walk-labels";
import type { PickSortViewProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { IconBox, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PickSortView({ groups, canPick, onUnpick }: PickSortViewProps) {
  const { t } = useTranslation("business");
  const ordered = [
    ...groups.filter((group) => group.picked.length > 0),
    ...groups.filter((group) => group.picked.length === 0),
  ];

  return (
    <div className="flex flex-col gap-4">
      {ordered.map((group) => (
        <section
          key={group.key}
          className="flex flex-col gap-1.5"
          aria-label={t("orders.batch.sortGroupLabel", {
            order: group.orderName,
          })}
        >
          <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-heading text-sm font-semibold">
            <IconBox className="size-4 shrink-0 text-foreground/70" />
            <span className="min-w-0 truncate">{group.orderName}</span>
            <OrderRefLabel orderRef={group.orderRef} binNumber={group.binNumber} />
            <span className="text-xs font-normal tabular-nums text-foreground/70">
              {t("orders.pickWalk.stopProgress", {
                picked: group.picked.length,
                total: group.total,
              })}
            </span>
          </h3>
          {group.picked.length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-border">
              {group.picked.map((entry) => (
                <div
                  key={entry.scanId}
                  className="flex items-center gap-2.5 border-b p-2 last:border-b-0 max-md:gap-3 max-md:p-3"
                >
                  <CardThumbnail
                    image={entry.card.image}
                    className="w-10 shrink-0 max-md:w-12"
                  />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span className="w-full truncate text-sm font-medium">
                      {entry.card.name}
                    </span>
                    <span className="w-full truncate text-xs text-foreground/70">
                      {pickWalkPrintingLabel(entry, t)}
                    </span>
                    <span className="w-full truncate text-xs font-semibold text-primary">
                      {pickWalkSpotLabel(entry, t)}
                    </span>
                  </span>
                  {canPick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-1 shrink-0 self-center"
                      aria-label={t("orders.batch.unpick", {
                        name: entry.card.name,
                      })}
                      title={t("orders.batch.unpick", {
                        name: entry.card.name,
                      })}
                      onClick={() => onUnpick(entry.scanId)}
                    >
                      <IconX />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {group.picked.length < group.total && (
            <p
              className={cn(
                "text-xs tabular-nums text-warning-strong",
                group.picked.length === 0 && "rounded-lg border bg-muted/40 px-2 py-1.5",
              )}
            >
              {t("orders.batch.sortStillToPick", {
                count: group.total - group.picked.length,
              })}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
