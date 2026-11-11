import { Badge } from "@/components/ui/badge";
import { publicCardsInfoQueryOptions } from "@/features/public-cards/api/public-cards";
import { useLivePublicCards } from "@/features/public-cards/api/use-live-public-cards";
import { PublicCardBrowser } from "@/features/public-cards/components/public-card-browser";
import { WatchLiveSidebar } from "@/features/public-cards/components/watch-live-sidebar";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import type { WatchCardBrowserProps } from "@/lib/interfaces/public-cards";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function WatchCardBrowser({
  token,
  collectionGuid,
  collectionName,
  holdMinutes,
  session,
}: WatchCardBrowserProps) {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const source = useMemo(
    () => ({ basePath: PUBLIC_CARDS_SOURCE_PATHS.watch, token }),
    [token],
  );
  const { data: info } = useQuery(publicCardsInfoQueryOptions(source));
  const live = useLivePublicCards(source, collectionGuid, session.cardsVersion);

  if (!info) {
    return (
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex h-dvh items-center justify-center bg-background outline-none"
      >
        <IconLoader2
          className="size-6 animate-spin text-foreground/70"
          aria-label={tCards("publicBrowse.loading")}
        />
      </main>
    );
  }

  return (
    <PublicCardBrowser
      source={source}
      title={collectionName}
      info={info}
      titleBadge={<Badge variant="secondary">{t("watchPage.liveBadge")}</Badge>}
      headerNote={
        holdMinutes !== null ? tCards("publicBrowse.holdHint") : t("watchPage.readOnly")
      }
      sidebarTop={
        <WatchLiveSidebar session={session} stats={live.stats} cardCount={live.cardCount} />
      }
    />
  );
}
