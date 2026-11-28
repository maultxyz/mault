import { EmptyState } from "@/components/empty-state";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { publicCardsInfoQueryOptions } from "@/features/public-cards/api/public-cards";
import { useWatchDisplayCards } from "@/features/public-cards/api/use-watch-display-cards";
import { PoweredByMault } from "@/features/public-cards/components/powered-by-mault";
import { WatchDisplayCard } from "@/features/public-cards/components/watch-display-card";
import { WatchDisplayHero } from "@/features/public-cards/components/watch-display-hero";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useQrCodeDataUrl } from "@/hooks/use-qr-code-data-url";
import { useScreenWakeLock } from "@/hooks/use-screen-wake-lock";
import {
  PUBLIC_CARDS_SOURCE_PATHS,
  WATCH_DISPLAY_RECENT_CARD_COUNT,
} from "@/lib/constants/public-cards";
import type { WatchDisplayProps } from "@/lib/interfaces/public-cards";
import { applyPrimaryColorName } from "@/lib/primary-color";
import { buildShareLinkUrl, formatCompactNumber } from "@magic-vault/shared";
import { IconCards, IconMaximize, IconMinimize } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";

export function WatchDisplay({
  token,
  collectionGuid,
  collectionName,
  session,
}: WatchDisplayProps) {
  const { t, i18n } = useTranslation("scanner");
  const latestHeadingId = useId();
  const recentHeadingId = useId();
  const source = useMemo(
    () => ({ basePath: PUBLIC_CARDS_SOURCE_PATHS.watch, linkParams: { token } }),
    [token],
  );
  const { data: info } = useQuery(publicCardsInfoQueryOptions(source));
  const { newestCard, recentCards, cardCount, isLoading } = useWatchDisplayCards(
    source,
    token,
    collectionGuid,
    session,
  );
  const { isFullscreen, canUseFullscreen, toggleFullscreen } = useFullscreen();
  const browseUrl = buildShareLinkUrl(window.location.origin, {
    kind: "collection",
    subjectGuid: collectionGuid,
    token,
  });
  const browseQrCodeDataUrl = useQrCodeDataUrl(browseUrl);
  const showsPrices = info?.showsPrices ?? false;
  useScreenWakeLock();

  useEffect(() => {
    applyPrimaryColorName(info?.primaryColor ?? null);
    return () => applyPrimaryColorName(null);
  }, [info?.primaryColor]);

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col gap-4 bg-background p-4 outline-none md:h-dvh md:overflow-hidden md:p-6 2xl:gap-6 2xl:p-10"
    >
      <header className="flex shrink-0 items-center gap-3 2xl:gap-5">
        {info?.shopPhotoUrl && (
          <img
            src={info.shopPhotoUrl}
            alt=""
            className="size-10 shrink-0 rounded-lg object-cover md:size-12 2xl:size-16"
          />
        )}
        <h1 className="min-w-0 truncate font-heading text-2xl font-semibold md:text-3xl 2xl:text-5xl">
          {collectionName}
        </h1>
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-foreground/6 px-3 py-1 text-sm font-semibold 2xl:text-xl">
          <span
            aria-hidden
            className="size-2.5 rounded-full bg-destructive animate-pulse motion-reduce:animate-none 2xl:size-3.5"
          />
          {t("watchPage.liveBadge")}
        </span>
        <span role="status" className="text-sm text-foreground/70 2xl:text-xl">
          {session.status === "error" ? t("watchDisplay.reconnecting") : null}
        </span>
        <span className="ml-auto shrink-0 text-base text-foreground/70 tabular-nums md:text-lg 2xl:text-3xl">
          {t("watchDisplay.cardCount", {
            count: cardCount,
            formattedCount: formatCompactNumber(cardCount, i18n.language),
          })}
        </span>
        {canUseFullscreen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t(isFullscreen ? "watchDisplay.exitFullscreen" : "watchDisplay.enterFullscreen")}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <IconMinimize /> : <IconMaximize />}
          </Button>
        )}
      </header>

      {isLoading ? (
        <WatchDisplaySkeleton />
      ) : newestCard ? (
        <div className="flex flex-col gap-6 md:grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:grid-rows-1 md:gap-8 2xl:gap-12">
          <section aria-labelledby={latestHeadingId} className="flex min-h-0 flex-col gap-3 2xl:gap-5">
            <h2
              id={latestHeadingId}
              className="text-sm font-semibold tracking-wide text-foreground/70 uppercase 2xl:text-2xl"
            >
              {t("watchDisplay.latest")}
            </h2>
            <WatchDisplayHero key={newestCard.scanId} entry={newestCard} showsPrices={showsPrices} />
            <p role="status" className="sr-only">
              {t("watchDisplay.newestAnnouncement", { name: newestCard.card.name })}
            </p>
          </section>
          <section aria-labelledby={recentHeadingId} className="flex min-h-0 flex-col gap-3 2xl:gap-5">
            <h2
              id={recentHeadingId}
              className="text-sm font-semibold tracking-wide text-foreground/70 uppercase 2xl:text-2xl"
            >
              {t("watchDisplay.recent")}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:min-h-0 md:flex-1 md:grid-cols-5 md:grid-rows-2 md:gap-4 2xl:gap-6">
              {recentCards.map((entry) => (
                <WatchDisplayCard key={entry.scanId} entry={entry} showsPrices={showsPrices} />
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={IconCards}
            title={t("watchDisplay.waitingTitle")}
            description={t("watchDisplay.waitingDescription")}
          />
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between gap-4">
        <PoweredByMault className="2xl:text-lg" />
        {browseQrCodeDataUrl && (
          <div className="flex items-center gap-3 2xl:gap-4">
            <p className="max-w-48 text-right text-sm font-semibold 2xl:max-w-72 2xl:text-2xl">
              {t("watchDisplay.scanToBrowse")}
            </p>
            <img
              src={browseQrCodeDataUrl}
              alt={t("watchDisplay.browseQrAlt")}
              className="size-20 rounded-lg bg-white p-1 md:size-24 2xl:size-36"
            />
          </div>
        )}
      </footer>
    </main>
  );
}

function WatchDisplaySkeleton() {
  return (
    <div className="flex flex-col gap-6 md:grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:grid-rows-1 md:gap-8 2xl:gap-12">
      <div className="flex min-h-0 flex-col items-center gap-4">
        <Skeleton className="h-4 w-32 self-start" />
        <Skeleton className="aspect-[2.5/3.5] w-full rounded-xl md:h-full md:w-auto md:flex-1" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </div>
      <div className="flex min-h-0 flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:min-h-0 md:flex-1 md:grid-cols-5 md:grid-rows-2 md:gap-4">
          {Array.from({ length: WATCH_DISPLAY_RECENT_CARD_COUNT }, (_, index) => (
            <Skeleton key={index} className="aspect-[2.5/3.5] w-full rounded-lg md:aspect-auto md:h-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
