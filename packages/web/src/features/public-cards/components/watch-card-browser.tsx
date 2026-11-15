import { Badge } from "@/components/ui/badge";
import { publicCardsInfoQueryOptions } from "@/features/public-cards/api/public-cards";
import { useLivePublicCards } from "@/features/public-cards/api/use-live-public-cards";
import { PublicCardsLoadingScreen } from "@/features/public-cards/components/public-cards-loading-screen";
import { PublicCardBrowser } from "@/features/public-cards/components/public-card-browser";
import { WatchLiveSidebar } from "@/features/public-cards/components/watch-live-sidebar";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import { TRADE_OFFER_LINK_PATHS } from "@/lib/constants/trade-offers";
import type { WatchCardBrowserProps } from "@/lib/interfaces/public-cards";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function WatchCardBrowser({
  token,
  collectionGuid,
  collectionName,
  purpose,
  session,
}: WatchCardBrowserProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const source = useMemo(
    () => ({ basePath: PUBLIC_CARDS_SOURCE_PATHS.watch, linkParams: { token } }),
    [token],
  );
  const { data: info } = useQuery(publicCardsInfoQueryOptions(source));
  const live = useLivePublicCards(source, token, collectionGuid, session.cardsVersion);

  if (!info) return <PublicCardsLoadingScreen />;

  return (
    <PublicCardBrowser
      source={source}
      title={collectionName}
      info={info}
      titleBadge={<Badge variant="secondary">{t("watchPage.liveBadge")}</Badge>}
      headerNote={
        purpose === "trade" ? tCards("publicBrowse.tradeHint") : t("watchPage.readOnly")
      }
      tradeOfferLink={
        purpose === "trade" ? { basePath: TRADE_OFFER_LINK_PATHS.collection, token } : undefined
      }
      sidebarTop={
        <WatchLiveSidebar session={session} stats={live.stats} cardCount={live.cardCount} />
      }
    />
  );
}
