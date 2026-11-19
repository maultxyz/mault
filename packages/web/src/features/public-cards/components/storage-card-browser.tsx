import { publicCardsInfoQueryOptions } from "@/features/public-cards/api/public-cards";
import { PublicCardsLoadingScreen } from "@/features/public-cards/components/public-cards-loading-screen";
import { PublicCardBrowser } from "@/features/public-cards/components/public-card-browser";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import { TRADE_OFFER_LINK_PATHS } from "@/lib/constants/trade-offers";
import type { StorageCardBrowserProps } from "@/lib/interfaces/public-cards";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardBrowser({ token, locationName, purpose, requiresGuestContact }: StorageCardBrowserProps) {
  const { t } = useTranslation("cards");
  const { t: tStorage } = useTranslation("storage");
  const source = useMemo(
    () => ({ basePath: PUBLIC_CARDS_SOURCE_PATHS.storage, linkParams: { token } }),
    [token],
  );
  const { data: info } = useQuery(publicCardsInfoQueryOptions(source));

  if (!info) return <PublicCardsLoadingScreen />;

  return (
    <PublicCardBrowser
      source={source}
      title={locationName}
      info={info}
      headerNote={
        purpose === "trade" ? t("publicBrowse.tradeHint") : tStorage("sharedPage.readOnly")
      }
      tradeOfferLink={
        purpose === "trade" ? { basePath: TRADE_OFFER_LINK_PATHS.storage, token, requiresGuestContact } : undefined
      }
    />
  );
}
