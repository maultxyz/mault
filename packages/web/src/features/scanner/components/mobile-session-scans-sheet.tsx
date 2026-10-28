import { FoilOverlay } from "@/components/foil-overlay";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { usePriceSource } from "@/hooks/use-price-source";
import { CARD_LOOKUP_QUERY } from "@/lib/constants/card-filters";
import {
  MOBILE_LIST_CLASS,
  MOBILE_LIST_ROW_CLASS,
} from "@/lib/constants/nav";
import { MONITOR_OPEN_CARD_PARAM } from "@/lib/constants/scanner";
import type { MobileSessionScansSheetProps } from "@/lib/interfaces/scanner";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MobileSessionScansSheet({
  open,
  onOpenChange,
  collectionGuid,
  count,
}: MobileSessionScansSheetProps) {
  const { t } = useTranslation("scanner");
  const { priceOf, format } = usePriceSource();
  const { data, isPending } = useQuery({
    ...collectionCardsPageQueryOptions(collectionGuid, CARD_LOOKUP_QUERY, 0),
    enabled: open && !!collectionGuid && count > 0,
  });
  const items = (data?.items ?? []).slice(0, count);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div>
            <DrawerTitle className="font-heading text-lg font-bold text-foreground">
              {t("mobileScan.session.title")}
            </DrawerTitle>
            <p className="text-sm text-foreground/70">
              {t("mobileScan.session.count", { count })}
            </p>
          </div>
          {count === 0 ? (
            <p className="py-6 text-center text-sm text-foreground/70">
              {t("mobileScan.session.empty")}
            </p>
          ) : isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className={MOBILE_LIST_CLASS}>
              {items.map((entry) => {
                const price = priceOf(
                  entry.card,
                  { isFoil: entry.isFoil, foilType: entry.foilType },
                  entry.condition,
                );
                return (
                  <Link
                    key={entry.scanId}
                    to={`/app/monitor/${collectionGuid}?${MONITOR_OPEN_CARD_PARAM}=${entry.scanId}`}
                    className={MOBILE_LIST_ROW_CLASS}
                  >
                    <span className="relative aspect-[2.5/3.5] w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {entry.card.image?.small && (
                        <img
                          src={entry.card.image.small}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                        />
                      )}
                      {entry.isFoil && <FoilOverlay />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {entry.card.name}
                      </span>
                      <span className="block truncate text-xs font-normal text-foreground/70">
                        {[
                          entry.binNumber != null
                            ? t("mobileScan.bin", { number: entry.binNumber })
                            : null,
                          entry.card.setName,
                          new Date(entry.scannedAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {price != null && (
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {format(price)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
