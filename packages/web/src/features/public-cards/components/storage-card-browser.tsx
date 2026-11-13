import { publicCardsInfoQueryOptions } from "@/features/public-cards/api/public-cards";
import { PublicCardBrowser } from "@/features/public-cards/components/public-card-browser";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import { TRADE_OFFER_LINK_PATHS } from "@/lib/constants/trade-offers";
import type { StorageCardBrowserProps } from "@/lib/interfaces/public-cards";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function StorageCardBrowser({ token, locationName, purpose }: StorageCardBrowserProps) {
  const { t } = useTranslation("cards");
  const { t: tStorage } = useTranslation("storage");
  const source = useMemo(
    () => ({ basePath: PUBLIC_CARDS_SOURCE_PATHS.storage, linkParams: { token } }),
    [token],
  );
  const { data: info } = useQuery(publicCardsInfoQueryOptions(source));

  if (!info) {
    return (
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex h-dvh items-center justify-center bg-background outline-none"
      >
        <IconLoader2
          className="size-6 animate-spin text-foreground/70"
          aria-label={t("publicBrowse.loading")}
        />
      </main>
    );
  }

  return (
    <PublicCardBrowser
      source={source}
      title={locationName}
      info={info}
      headerNote={
        purpose === "trade" ? t("publicBrowse.tradeHint") : tStorage("sharedPage.readOnly")
      }
      tradeOfferLink={
        purpose === "trade" ? { basePath: TRADE_OFFER_LINK_PATHS.storage, token } : undefined
      }
    />
  );
}
