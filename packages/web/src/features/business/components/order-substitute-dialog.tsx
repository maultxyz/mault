import { CardThumbnail } from "@/components/card-thumbnail";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  orderLineSubstitutesQueryOptions,
  substituteOrderLine,
} from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import type { OrderSubstituteDialogProps } from "@/lib/interfaces/business";
import { orderLineLabel } from "@magic-vault/shared";
import { IconReplace } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function OrderSubstituteDialog({ order, lineIndex, onOpenChange }: OrderSubstituteDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const [pendingScanId, setPendingScanId] = useState<string | null>(null);
  const line = lineIndex === null ? null : order.lines[lineIndex];
  const substitutesQuery = useQuery(orderLineSubstitutesQueryOptions(order.guid, lineIndex));
  const substitutes = substitutesQuery.data ?? [];

  const chooseSubstitute = async (scanId: string) => {
    if (lineIndex === null) return;
    setPendingScanId(scanId);
    const result = await run(
      () => substituteOrderLine(order.guid, { lineIndex, scanId }),
      t("orders.substitutes.added"),
    );
    setPendingScanId(null);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={line !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("orders.substitutes.title")}</DialogTitle>
          <DialogDescription>
            {line &&
              t("orders.substitutes.description", {
                name: orderLineLabel(line),
                missing: line.quantity - line.allocations.length,
              })}
          </DialogDescription>
        </DialogHeader>
        {substitutesQuery.isPending ? (
          <ListSkeleton rows={4} />
        ) : substitutesQuery.isError ? (
          <LoadErrorCallout
            message={t("errors.loadFailed")}
            onRetry={() => void substitutesQuery.refetch()}
          />
        ) : substitutes.length === 0 ? (
          <EmptyState
            size="compact"
            icon={IconReplace}
            title={t("orders.substitutes.emptyTitle")}
            description={t("orders.substitutes.emptyDescription")}
          />
        ) : (
          <ul className="flex max-h-[60svh] flex-col divide-y divide-border overflow-y-auto rounded-lg bg-foreground/6">
            {substitutes.map(({ entry, differences }) => (
              <li key={entry.scanId} className="flex items-center gap-2.5 px-2.5 py-2">
                <CardThumbnail image={entry.card.image} className="w-10 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">
                    {t("orders.printing", {
                      setName: entry.card.setName,
                      set: entry.card.set.toUpperCase(),
                      number: entry.card.collectorNumber,
                    })}
                  </p>
                  <p className="truncate text-xs text-foreground/70">
                    {[entry.condition, entry.isFoil ? t("table.foil") : null]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    {entry.locationName
                      ? t("orders.locationAt", {
                          location: entry.locationName,
                          position: (entry.locationPosition ?? 0) + 1,
                        })
                      : t("orders.inCollection", {
                          collection: entry.collectionName,
                          bin: entry.binNumber ?? "-",
                        })}
                  </p>
                  {differences.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {differences.map((difference) => (
                        <Badge key={difference} variant="outline">
                          {t(`orders.substitutes.differences.${difference}`)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground/70">{t("orders.substitutes.exactMatch")}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  disabled={pendingScanId !== null}
                  aria-label={t("orders.substitutes.useCopyFor", {
                    printing: `${entry.card.set.toUpperCase()} ${entry.card.collectorNumber}`,
                    condition: entry.condition,
                  })}
                  onClick={() => void chooseSubstitute(entry.scanId)}
                >
                  {t("orders.substitutes.useCopy")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
