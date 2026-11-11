import { PublicCardBrowser } from "@/features/public-cards/components/public-card-browser";
import { publicShopCatalogQueryOptions } from "@/features/business/api/shop-catalogs";
import { PriceSourceProvider } from "@/hooks/use-price-source";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import { publicQueryClient } from "@/lib/query-client";
import {
  SHARE_LINK_TOKEN_PARAM,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { IconLinkOff, IconLoader2 } from "@tabler/icons-react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";

function ShopCatalogContent() {
  const { t } = useTranslation("business");
  const { catalogGuid } = useParams<{ catalogGuid: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get(SHARE_LINK_TOKEN_PARAM) ?? "";
  const { data: info, isPending } = useQuery({
    ...publicShopCatalogQueryOptions(token),
    enabled: !!token,
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
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center outline-none"
      >
        {token && isPending ? (
          <IconLoader2
            className="size-6 animate-spin text-foreground/70"
            aria-label={t("shopCatalogs.public.loading")}
          />
        ) : (
          <>
            <IconLinkOff className="size-8 text-foreground/70" aria-hidden />
            <h1 className="text-base font-semibold">
              {t("shopCatalogs.public.invalidTitle")}
            </h1>
            <p className="max-w-sm text-sm text-foreground/70">
              {t("shopCatalogs.public.invalidDescription")}
            </p>
          </>
        )}
      </main>
    );
  }

  return (
    <PriceSourceProvider value={pricing}>
      <PublicCardBrowser
        source={{ basePath: PUBLIC_CARDS_SOURCE_PATHS.catalog, token }}
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
