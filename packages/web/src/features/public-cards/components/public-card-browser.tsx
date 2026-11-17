import { CountDot } from "@/components/count-dot";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  publicCardsFacetsQueryOptions,
  publicCardsPageQueryOptions,
} from "@/features/public-cards/api/public-cards";
import { TradeOfferHeaderButton } from "@/features/trade-offers/components/trade-offer-header-button";
import { TradeOfferPage } from "@/features/trade-offers/components/trade-offer-page";
import { TradeOfferProvider } from "@/features/trade-offers/components/trade-offer-provider";
import { PoweredByMault } from "@/features/public-cards/components/powered-by-mault";
import { PublicCardDetailView } from "@/features/public-cards/components/public-card-detail";
import { PublicCardFilterPanel } from "@/features/public-cards/components/public-card-filter-panel";
import { PublicCardResults } from "@/features/public-cards/components/public-card-results";
import {
  countActivePublicCardFilters,
  parsePriceInput,
} from "@/features/public-cards/lib/public-card-filters";
import { useDebouncedSearchParamText } from "@/hooks/use-debounced-search-param-text";
import {
  clearPublicCardPriceSearchParams,
  readPageNumberSearchParam,
  readPublicCardFiltersFromSearchParams,
  readPublicCardGameKeyFromSearchParams,
  readPublicCardSortFromSearchParams,
  searchParamsSubsetKey,
  writePageNumberSearchParam,
  writePublicCardFiltersToSearchParams,
  writeTextSearchParam,
} from "@/lib/card-search-params";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import {
  ALL_PUBLIC_CARD_GAMES,
  PUBLIC_CARD_GAME_PARAM,
  PUBLIC_CARD_MAX_PRICE_PARAM,
  PUBLIC_CARD_MIN_PRICE_PARAM,
  PUBLIC_CARD_PAGE_PARAM,
  PUBLIC_CARD_PARAM,
  PUBLIC_CARD_PARAM_NAMES_CLEARED_ON_TEXT_CHANGE,
  PUBLIC_CARD_SEARCH_QUERY_PARAM,
  PUBLIC_CARD_SORT_PARAM,
  PUBLIC_CARD_VIEW_STATE_PARAM_NAMES,
  PUBLIC_TRADE_OFFER_PARAM,
  PUBLIC_TRADE_OFFER_PARAM_VALUE,
} from "@/lib/constants/public-cards";
import { applyPrimaryColorName } from "@/lib/primary-color";
import { cn } from "@/lib/utils";
import type { PublicCardBrowserProps } from "@/lib/interfaces/public-cards";
import {
  DEFAULT_PUBLIC_CARD_SORT,
  EMPTY_PUBLIC_CARD_FILTERS,
  PRICE_SOURCE_FIELDS,
  PUBLIC_CARDS_PAGE_SIZE,
  PUBLIC_CARD_PRICE_SORTS,
  PUBLIC_CARDS_SEARCH_MAX_LENGTH,
  PUBLIC_CARD_SORTS,
  type PublicCardFilters,
  type PublicCardSort,
} from "@magic-vault/shared";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function PublicCardBrowser({
  source,
  title,
  info,
  titleBadge,
  headerNote,
  sidebarTop,
  tradeOfferLink,
}: PublicCardBrowserProps) {
  const { t } = useTranslation("cards");
  const isMobile = useIsMobile();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    text: search,
    setText: setSearch,
    debouncedText: debouncedSearchText,
  } = useDebouncedSearchParamText(PUBLIC_CARD_SEARCH_QUERY_PARAM, {
    paramNamesClearedOnChange: PUBLIC_CARD_PARAM_NAMES_CLEARED_ON_TEXT_CHANGE,
  });
  const {
    text: minPriceInput,
    setText: setMinPriceInput,
    debouncedText: debouncedMinPriceInput,
  } = useDebouncedSearchParamText(PUBLIC_CARD_MIN_PRICE_PARAM, {
    paramNamesClearedOnChange: PUBLIC_CARD_PARAM_NAMES_CLEARED_ON_TEXT_CHANGE,
  });
  const {
    text: maxPriceInput,
    setText: setMaxPriceInput,
    debouncedText: debouncedMaxPriceInput,
  } = useDebouncedSearchParamText(PUBLIC_CARD_MAX_PRICE_PARAM, {
    paramNamesClearedOnChange: PUBLIC_CARD_PARAM_NAMES_CLEARED_ON_TEXT_CHANGE,
  });
  const sorts = PUBLIC_CARD_SORTS.filter(
    (option) =>
      info.showsPrices ||
      !(PUBLIC_CARD_PRICE_SORTS as readonly string[]).includes(option),
  );
  const sortInUrl = readPublicCardSortFromSearchParams(searchParams);
  const sort = sorts.includes(sortInUrl) ? sortInUrl : DEFAULT_PUBLIC_CARD_SORT;
  const gameKey = readPublicCardGameKeyFromSearchParams(searchParams);
  const viewStateKey = searchParamsSubsetKey(
    searchParams,
    PUBLIC_CARD_VIEW_STATE_PARAM_NAMES,
  );
  const filters = useMemo(
    () =>
      readPublicCardFiltersFromSearchParams(new URLSearchParams(viewStateKey)),
    [viewStateKey],
  );
  const requestedPage = readPageNumberSearchParam(
    searchParams,
    PUBLIC_CARD_PAGE_PARAM,
  );
  const [showsFilterDrawer, setShowsFilterDrawer] = useState(false);
  const debouncedSearch = debouncedSearchText.trim();
  useEffect(() => {
    applyPrimaryColorName(info.primaryColor);
    return () => applyPrimaryColorName(null);
  }, [info.primaryColor]);
  const debouncedMinPrice = parsePriceInput(debouncedMinPriceInput);
  const debouncedMaxPrice = parsePriceInput(debouncedMaxPriceInput);
  const selectedGameKey = gameKey === ALL_PUBLIC_CARD_GAMES ? null : gameKey;
  const appliedFilters = useMemo<PublicCardFilters>(
    () => ({ ...filters, minPrice: debouncedMinPrice, maxPrice: debouncedMaxPrice }),
    [filters, debouncedMinPrice, debouncedMaxPrice],
  );
  const facets = useQuery(publicCardsFacetsQueryOptions(source, selectedGameKey));
  const cards = useQuery(
    publicCardsPageQueryOptions(source, {
      page: requestedPage,
      pageSize: PUBLIC_CARDS_PAGE_SIZE,
      sort,
      search: debouncedSearch,
      gameKey: selectedGameKey,
      filters: appliedFilters,
    }),
  );
  const activeFilterCount = countActivePublicCardFilters(appliedFilters, gameKey);
  const openScanId = searchParams.get(PUBLIC_CARD_PARAM);
  const showsTradeOffer =
    !!tradeOfferLink && searchParams.get(PUBLIC_TRADE_OFFER_PARAM) === PUBLIC_TRADE_OFFER_PARAM_VALUE;
  const listScrollTop = useRef(0);
  const lastOpenedScanId = useRef<string | null>(null);
  const restoresListScroll = useRef(false);

  const openTradeOffer = useCallback(() => {
    if (!searchParams.get(PUBLIC_CARD_PARAM)) {
      listScrollTop.current = resultsRef.current?.scrollTop ?? 0;
      restoresListScroll.current = true;
    }
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(PUBLIC_TRADE_OFFER_PARAM, PUBLIC_TRADE_OFFER_PARAM_VALUE);
      next.delete(PUBLIC_CARD_PARAM);
      return next;
    });
  }, [searchParams, setSearchParams]);
  const closeTradeOffer = () =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete(PUBLIC_TRADE_OFFER_PARAM);
      return next;
    });

  const openCard = (scanId: string) => {
    listScrollTop.current = resultsRef.current?.scrollTop ?? 0;
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

  const leaveCardForResults = () => {
    lastOpenedScanId.current = null;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete(PUBLIC_CARD_PARAM);
      next.delete(PUBLIC_TRADE_OFFER_PARAM);
      return next;
    });
  };

  useLayoutEffect(() => {
    if (openScanId || showsTradeOffer || !restoresListScroll.current) return;
    restoresListScroll.current = false;
    resultsRef.current?.scrollTo({ top: listScrollTop.current });
  }, [openScanId, showsTradeOffer]);

  useLayoutEffect(() => {
    const scanId = lastOpenedScanId.current;
    if (openScanId || !scanId) return;
    lastOpenedScanId.current = null;
    resultsRef.current?.scrollTo({ top: listScrollTop.current });
    document
      .querySelector<HTMLElement>(`[data-shop-card="${CSS.escape(scanId)}"]`)
      ?.focus();
  }, [openScanId]);

  const changeResultsViewState = (
    writeViewState: (nextSearchParams: URLSearchParams) => void,
  ) => {
    lastOpenedScanId.current = null;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        writeViewState(next);
        next.delete(PUBLIC_CARD_PAGE_PARAM);
        next.delete(PUBLIC_CARD_PARAM);
        next.delete(PUBLIC_TRADE_OFFER_PARAM);
        return next;
      },
      { replace: true },
    );
  };
  const changeFilters = (nextFilters: PublicCardFilters) =>
    changeResultsViewState((nextSearchParams) =>
      writePublicCardFiltersToSearchParams(nextSearchParams, nextFilters),
    );
  const changeGameKey = (nextGameKey: string) =>
    changeResultsViewState((nextSearchParams) => {
      writeTextSearchParam(
        nextSearchParams,
        PUBLIC_CARD_GAME_PARAM,
        nextGameKey,
        ALL_PUBLIC_CARD_GAMES,
      );
      writePublicCardFiltersToSearchParams(nextSearchParams, {
        ...EMPTY_PUBLIC_CARD_FILTERS,
        finish: filters.finish,
      });
    });
  const changeSort = (nextSort: PublicCardSort) =>
    changeResultsViewState((nextSearchParams) =>
      writeTextSearchParam(
        nextSearchParams,
        PUBLIC_CARD_SORT_PARAM,
        nextSort,
        DEFAULT_PUBLIC_CARD_SORT,
      ),
    );
  const clearFilters = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    changeResultsViewState((nextSearchParams) => {
      nextSearchParams.delete(PUBLIC_CARD_GAME_PARAM);
      writePublicCardFiltersToSearchParams(
        nextSearchParams,
        EMPTY_PUBLIC_CARD_FILTERS,
      );
      clearPublicCardPriceSearchParams(nextSearchParams);
    });
  };
  const changePage = (nextPage: number) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      writePageNumberSearchParam(next, PUBLIC_CARD_PAGE_PARAM, nextPage);
      return next;
    }, { replace: true });
  const filterPanel = (
    <PublicCardFilterPanel
      info={info}
      facets={facets.data}
      gameKey={gameKey}
      onGameKeyChange={changeGameKey}
      sort={sort}
      sorts={sorts}
      onSortChange={changeSort}
      filters={filters}
      onFiltersChange={changeFilters}
      minPriceInput={minPriceInput}
      maxPriceInput={maxPriceInput}
      onMinPriceInputChange={setMinPriceInput}
      onMaxPriceInputChange={setMaxPriceInput}
      onClear={clearFilters}
    />
  );

  const page = (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex h-dvh flex-col bg-background outline-none"
    >
      <header className="grid shrink-0 grid-cols-1 items-center gap-3 border-b px-4 py-3 md:px-3 md:py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,36rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3">
          {info.shopPhotoUrl && (
            <img
              src={info.shopPhotoUrl}
              alt=""
              className="h-12 w-20 shrink-0 rounded-lg object-cover md:h-14 md:w-24"
            />
          )}
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className={cn(PAGE_TITLE_CLASS, "truncate")}>{title}</h1>
              {titleBadge}
            </div>
            <p className="truncate text-xs text-foreground/70">
              {headerNote ?? t("publicBrowse.cardCount", { count: info.cardCount })}
            </p>
          </div>
        </div>
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <IconSearch
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70 max-md:left-3"
              aria-hidden
            />
            <Input
              type="search"
              placeholder={t("publicBrowse.searchPlaceholder")}
              aria-label={t("publicBrowse.searchPlaceholder")}
              maxLength={PUBLIC_CARDS_SEARCH_MAX_LENGTH}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (openScanId || showsTradeOffer) leaveCardForResults();
              }}
              className="pl-8 max-md:pl-10"
            />
          </div>
          {isMobile && (
            <>
              <TradeOfferHeaderButton isIconOnly />
              <Button
                variant={activeFilterCount > 0 ? "selected" : "outline"}
                size="icon"
                className="relative shrink-0"
                aria-label={
                  activeFilterCount > 0
                    ? t("publicBrowse.filtersWithCount", { count: activeFilterCount })
                    : t("publicBrowse.filtersHeading")
                }
                onClick={() => setShowsFilterDrawer(true)}
              >
                <IconAdjustmentsHorizontal />
                <CountDot count={activeFilterCount} />
              </Button>
            </>
          )}
        </div>
        {!isMobile && (
          <div className="flex items-center gap-1.5 justify-end">
            <TradeOfferHeaderButton />
          </div>
        )}
      </header>
      <div className={cn("flex min-h-0 flex-1", (openScanId || showsTradeOffer) && "hidden")}>
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-muted p-4 md:flex md:flex-col md:gap-5 lg:w-72">
          {sidebarTop}
          {filterPanel}
        </aside>
        <div ref={resultsRef} className="min-w-0 flex-1 overflow-y-auto p-4 md:px-3 md:py-2">
          <PublicCardResults
            info={info}
            page={cards.data}
            isPending={cards.isPending}
            isError={cards.isError}
            onRetry={() => void cards.refetch()}
            onPageChange={(next) => {
              changePage(next);
              resultsRef.current?.scrollTo({ top: 0 });
            }}
            onOpenCard={openCard}
          />
        </div>
      </div>
      {tradeOfferLink && (
        <div className={cn("min-h-0 flex-1 overflow-y-auto", !showsTradeOffer && "hidden")}>
          <TradeOfferPage
            link={tradeOfferLink}
            sourceName={title}
            defaultGameKey={info.games[0]?.key ?? null}
            cashCurrency={PRICE_SOURCE_FIELDS[info.priceSource].currency}
            priceSource={info.priceSource}
            showsPrices={info.showsPrices}
            isVisible={showsTradeOffer}
            onBack={closeTradeOffer}
          />
        </div>
      )}
      {openScanId && !showsTradeOffer && (
        <div key={openScanId} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl">
            <PublicCardDetailView
              source={source}
              scanId={openScanId}
              onClose={closeCard}
            />
          </div>
        </div>
      )}
      <DynamicDialog
        open={showsFilterDrawer}
        onOpenChange={setShowsFilterDrawer}
        title={t("publicBrowse.filtersHeading")}
        footer={
          <Button className="w-full" onClick={() => setShowsFilterDrawer(false)}>
            {t("publicBrowse.showResults", { count: cards.data?.total ?? 0 })}
          </Button>
        }
      >
        {sidebarTop}
        {filterPanel}
      </DynamicDialog>
      <footer className="flex shrink-0 items-center justify-center bg-black px-4 py-1.5 dark:border-t md:justify-end md:px-3 md:py-1">
        <PoweredByMault isInverted />
      </footer>
    </main>
  );

  return tradeOfferLink ? (
    <TradeOfferProvider draftLinkToken={tradeOfferLink.token} onOpenComposer={openTradeOffer}>
      {page}
    </TradeOfferProvider>
  ) : (
    page
  );
}
