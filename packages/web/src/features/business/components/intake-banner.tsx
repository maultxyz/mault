import { openIntakeLotsQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { useCollections } from "@/features/collections/api/use-collections";
import { usePriceSource } from "@/hooks/use-price-source";
import { INTAKE_LOT_PARAM, INTAKE_PATH } from "@/lib/constants/business";
import { IconArrowRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export function IntakeBanner() {
  const { t } = useTranslation("business");
  const { pathname } = useLocation();
  const { format } = usePriceSource();
  const { orgId, access } = useBusinessAccess();
  const { activeCollection } = useCollections();
  const { data: lots = [] } = useQuery(openIntakeLotsQueryOptions(orgId));
  const lot = lots.find(
    (candidate) =>
      candidate.status === "open" &&
      candidate.collectionGuid === activeCollection?.guid,
  );

  if (!lot || pathname.startsWith(INTAKE_PATH)) return null;

  const showMoney = access?.canViewCosts && lot.cashOffer != null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-stretch border-b border-info-border bg-info-muted text-info-foreground animate-in fade-in-0 motion-reduce:animate-none"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {t("banner.title", { name: lot.customerName })}
          </p>
          <p className="truncate text-xs">
            {t("banner.description", { collection: lot.collectionName })}
          </p>
        </div>
        <div className="flex items-center gap-6 tabular-nums">
          <div className="text-right">
            <p className="text-2xs">{t("intake.stats.cards")}</p>
            <p className="text-sm font-semibold">
              {lot.cardCount.toLocaleString()}
            </p>
          </div>
          {showMoney && (
            <div className="text-right">
              <p className="text-2xs">{t("intake.stats.cash")}</p>
              <p className="text-sm font-semibold">
                {format(lot.cashOffer ?? 0)}
              </p>
            </div>
          )}
        </div>
      </div>
      <Link
        to={`${INTAKE_PATH}?${INTAKE_LOT_PARAM}=${lot.guid}`}
        className="flex shrink-0 items-center gap-1.5 border-l border-info-border px-4 text-sm font-medium transition-colors hover:bg-info-border/40 focus-visible:bg-info-border/40 focus-visible:outline-none"
      >
        {t("banner.open")}
        <IconArrowRight className="size-4" />
      </Link>
    </div>
  );
}
