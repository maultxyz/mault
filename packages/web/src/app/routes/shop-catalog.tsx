import { isPublicCardsUnavailableError } from "@/features/public-cards/api/public-cards";
import { PublicCardBrowser } from "@/features/public-cards/components/public-card-browser";
import {
  publicShopCatalogQueryOptions,
  shopCatalogSource,
} from "@/features/business/api/shop-catalogs";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { ShareLinkStatusScreen } from "@/features/public-cards/components/share-link-status-screen";
import { publicQueryClient } from "@/lib/query-client";
import {
  SHARE_LINK_TOKEN_PARAM,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";

function ShopCatalogContent() {
  const { t } = useTranslation("business");
  const { catalogGuid } = useParams<{ catalogGuid: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get(SHARE_LINK_TOKEN_PARAM);
  const source = useMemo(
    () => shopCatalogSource(catalogGuid ?? "", token),
    [catalogGuid, token],
  );
  const { data: info, isPending, isFetching, error, refetch } = useQuery({
    ...publicShopCatalogQueryOptions(source),
    enabled: !!catalogGuid,
  });
  const validInfo = info?.catalogGuid === catalogGuid ? info : undefined;
  const pricing = useMemo<OrgPricing | null>(
    () =>
      validInfo
        ? {
            source: validInfo.priceSource,
            conditionMultipliers: toConditionMultipliers(
              validInfo.conditionMultipliers,
            ),
          }
        : null,
    [validInfo],
  );

  useEffect(() => {
    if (validInfo) document.title = `${validInfo.name} · Mault`;
  }, [validInfo]);

  if (!validInfo || !pricing) {
    return (
      <ShareLinkStatusScreen
        status={
          catalogGuid && (isPending || isFetching)
            ? "checking"
            : isPublicCardsUnavailableError(error)
              ? "failed"
              : "invalid"
        }
        invalidTitle={t("shopCatalogs.public.invalidTitle")}
        invalidDescription={t("shopCatalogs.public.invalidDescription")}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <PriceSourceProvider value={pricing}>
      <PublicCardBrowser
        source={source}
        title={validInfo.name}
        info={validInfo}
      />
    </PriceSourceProvider>
  );
}

export default function ShopCatalogPage() {
  return (
    <QueryClientProvider client={publicQueryClient}>
      <ShopCatalogContent />
    </QueryClientProvider>
  );
}
