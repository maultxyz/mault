import { LoadErrorCallout } from "@/components/load-error-callout";
import { SkeletonStatus } from "@/components/skeleton-status";
import { Button } from "@/components/ui/button";
import { PublicOrgProfileShopCatalogs } from "@/features/org-profile/components/public-org-profile-shop-catalogs";
import { PublicOrgProfileShowcaseSkeleton } from "@/features/org-profile/components/public-org-profile-skeleton";
import { publicCardsPageQueryOptions } from "@/features/public-cards/api/public-cards";
import { PoweredByMault } from "@/features/public-cards/components/powered-by-mault";
import { PublicCardDetailView } from "@/features/public-cards/components/public-card-detail";
import { PublicCardTile } from "@/features/public-cards/components/public-card-tile";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import {
  ORG_PROFILE_LINK_KIND_ICONS,
  ORG_PROFILE_PUBLIC_SHOWCASE_PAGE,
} from "@/lib/constants/org-profile";
import { PUBLIC_CARD_PARAM } from "@/lib/constants/public-cards";
import type { PublicOrgProfileViewProps } from "@/lib/interfaces/org-profile";
import { applyPrimaryColorName } from "@/lib/primary-color";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PUBLIC_CARD_SORT,
  EMPTY_PUBLIC_CARD_FILTERS,
  ORG_PROFILE_SHOWCASE_CARDS_MAX,
} from "@magic-vault/shared";
import { IconExternalLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function PublicOrgProfileView({ source, info }: PublicOrgProfileViewProps) {
  const { t } = useTranslation("org-profile");
  const showcaseHeadingId = useId();
  const linksLabelId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const openScanId = searchParams.get(PUBLIC_CARD_PARAM);
  const lastOpenedScanId = useRef<string | null>(null);
  const scrollTopBeforeCard = useRef(0);
  const showcase = useQuery({
    ...publicCardsPageQueryOptions(source, {
      page: ORG_PROFILE_PUBLIC_SHOWCASE_PAGE,
      pageSize: ORG_PROFILE_SHOWCASE_CARDS_MAX,
      sort: DEFAULT_PUBLIC_CARD_SORT,
      search: "",
      gameKey: null,
      filters: EMPTY_PUBLIC_CARD_FILTERS,
    }),
    enabled: info.cardCount > 0,
  });
  const showcaseCards = showcase.data?.cards ?? [];
  const initial = info.displayName.trim().charAt(0).toUpperCase();
  const hasLinks = info.links.length > 0;

  useEffect(() => {
    applyPrimaryColorName(info.primaryColor);
    return () => applyPrimaryColorName(null);
  }, [info.primaryColor]);

  useLayoutEffect(() => {
    const scanId = lastOpenedScanId.current;
    if (openScanId || !scanId) return;
    lastOpenedScanId.current = null;
    window.scrollTo({ top: scrollTopBeforeCard.current });
    document.querySelector<HTMLElement>(`[data-shop-card="${CSS.escape(scanId)}"]`)?.focus();
  }, [openScanId]);

  const openCard = (scanId: string) => {
    scrollTopBeforeCard.current = window.scrollY;
    lastOpenedScanId.current = scanId;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(PUBLIC_CARD_PARAM, scanId);
      return next;
    });
  };
  const closeCard = () =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete(PUBLIC_CARD_PARAM);
      return next;
    });

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col bg-background outline-none"
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 md:gap-5 md:py-10",
          openScanId ? "max-w-6xl" : "max-w-2xl",
        )}
      >
        <header
          className={cn(
            "flex items-center gap-3",
            openScanId ? "flex-row" : "flex-col text-center",
          )}
        >
          {info.shopPhotoUrl ? (
            <img
              src={info.shopPhotoUrl}
              alt=""
              className={cn(
                "shrink-0 rounded-full object-cover ring-1 ring-border",
                openScanId ? "size-10" : "size-24",
              )}
            />
          ) : (
            <span
              aria-hidden
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-primary font-heading font-semibold text-primary-foreground",
                openScanId ? "size-10 text-base" : "size-24 text-3xl",
              )}
            >
              {initial}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className={cn(PAGE_TITLE_CLASS, "break-words")}>{info.displayName}</h1>
            <p className="text-sm text-foreground/70">@{info.handle}</p>
          </div>
          {!openScanId && info.bio && (
            <p className="max-w-prose whitespace-pre-line break-words text-sm">{info.bio}</p>
          )}
        </header>
        {openScanId ? (
          <div key={openScanId} className="-mx-4">
            <PublicCardDetailView source={source} scanId={openScanId} onClose={closeCard} />
          </div>
        ) : (
          <>
            {hasLinks && (
              <nav aria-labelledby={linksLabelId}>
                <h2 id={linksLabelId} className="sr-only">
                  {t("public.linksHeading")}
                </h2>
                <ul className="flex flex-col gap-2">
                  {info.links.map((link, index) => {
                    const KindIcon = ORG_PROFILE_LINK_KIND_ICONS[link.kind];
                    return (
                      <li key={`${link.url}-${index}`}>
                        <Button
                          variant="outline"
                          size="xl"
                          nativeButton={false}
                          className="w-full justify-start"
                          render={<a href={link.url} target="_blank" rel="noopener noreferrer" />}
                        >
                          <KindIcon aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-left">
                            {link.label || t(`kinds.${link.kind}`)}
                          </span>
                          <IconExternalLink aria-hidden className="text-foreground/70" />
                          <span className="sr-only">{t("public.opensInNewTab")}</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            {info.shopCatalogs.length > 0 && (
              <PublicOrgProfileShopCatalogs catalogs={info.shopCatalogs} />
            )}
            {info.cardCount > 0 && (
              <section aria-labelledby={showcaseHeadingId} className="@container flex flex-col gap-3">
                <h2 id={showcaseHeadingId} className="font-heading text-sm font-semibold">
                  {t("public.showcaseHeading")}
                </h2>
                {showcase.isError ? (
                  <LoadErrorCallout
                    message={t("public.showcaseLoadFailed")}
                    onRetry={() => void showcase.refetch()}
                  />
                ) : showcase.isPending ? (
                  <SkeletonStatus>
                    <PublicOrgProfileShowcaseSkeleton />
                  </SkeletonStatus>
                ) : (
                  <div className={CARD_GRID_CLASS}>
                    {showcaseCards.map((entry) => (
                      <PublicCardTile key={entry.scanId} entry={entry} onOpen={openCard} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
      <footer className="flex justify-center px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <PoweredByMault />
      </footer>
    </main>
  );
}
