import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  publicCardsFacetsQueryOptions,
  publicCardsPageQueryOptions,
} from "@/features/public-cards/api/public-cards";
import { PublicCardDetailView } from "@/features/public-cards/components/public-card-detail";
import { PublicCardFilterPanel } from "@/features/public-cards/components/public-card-filter-panel";
import { PublicCardResults } from "@/features/public-cards/components/public-card-results";
import {
  countActivePublicCardFilters,
  parsePriceInput,
} from "@/features/public-cards/lib/public-card-filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import {
  ALL_PUBLIC_CARD_GAMES,
  PUBLIC_CARD_PARAM,
} from "@/lib/constants/public-cards";
import { applyPrimaryColorName } from "@/lib/primary-color";
import { cn } from "@/lib/utils";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { PublicCardBrowserProps } from "@/lib/interfaces/public-cards";
import {
  DEFAULT_PUBLIC_CARD_SORT,
  EMPTY_PUBLIC_CARD_FILTERS,
  PUBLIC_CARDS_PAGE_SIZE,
  PUBLIC_CARD_PRICE_SORTS,
  PUBLIC_CARDS_SEARCH_MAX_LENGTH,
  PUBLIC_CARD_SORTS,
  type PublicCardFilters,
  type PublicCardSort,
} from "@magic-vault/shared";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function PublicCardBrowser({
  source,
  title,
  info,
  titleBadge,
  headerNote,
  sidebarTop,
}: PublicCardBrowserProps) {
  const { t } = useTranslation("cards");
  const resultsRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PublicCardSort>(DEFAULT_PUBLIC_CARD_SORT);
  const [gameKey, setGameKey] = useState<string>(ALL_PUBLIC_CARD_GAMES);
  const [filters, setFilters] = useState<PublicCardFilters>(EMPTY_PUBLIC_CARD_FILTERS);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const [showsFilterDrawer, setShowsFilterDrawer] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    applyPrimaryColorName(info.primaryColor);
    return () => applyPrimaryColorName(null);
  }, [info.primaryColor]);
  const debouncedMinPrice = useDebouncedValue(parsePriceInput(minPriceInput), SEARCH_DEBOUNCE_MS);
  const debouncedMaxPrice = useDebouncedValue(parsePriceInput(maxPriceInput), SEARCH_DEBOUNCE_MS);
  const selectedGameKey = gameKey === ALL_PUBLIC_CARD_GAMES ? null : gameKey;
  const appliedFilters = useMemo<PublicCardFilters>(
    () => ({ ...filters, minPrice: debouncedMinPrice, maxPrice: debouncedMaxPrice }),
    [filters, debouncedMinPrice, debouncedMaxPrice],
  );
  const sorts = PUBLIC_CARD_SORTS.filter(
    (option) =>
      info.showsPrices ||
      !(PUBLIC_CARD_PRICE_SORTS as readonly string[]).includes(option),
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
  const [searchParams, setSearchParams] = useSearchParams();
  const openScanId = searchParams.get(PUBLIC_CARD_PARAM);
  const listScrollTop = useRef(0);
  const lastOpenedScanId = useRef<string | null>(null);

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
    closeCard();
  };

  useLayoutEffect(() => {
    const scanId = lastOpenedScanId.current;
    if (openScanId || !scanId) return;
    lastOpenedScanId.current = null;
    resultsRef.current?.scrollTo({ top: listScrollTop.current });
    document
      .querySelector<HTMLElement>(`[data-shop-card="${CSS.escape(scanId)}"]`)
      ?.focus();
  }, [openScanId]);

  const changeFilters = (next: PublicCardFilters) => {
    setFilters(next);
    setRequestedPage(1);
    if (openScanId) leaveCardForResults();
  };
  const changeGameKey = (next: string) => {
    setGameKey(next);
    setFilters({
      ...EMPTY_PUBLIC_CARD_FILTERS,
      finish: filters.finish,
    });
    setRequestedPage(1);
    if (openScanId) leaveCardForResults();
  };
  const clearFilters = () => {
    setGameKey(ALL_PUBLIC_CARD_GAMES);
    setFilters(EMPTY_PUBLIC_CARD_FILTERS);
    setMinPriceInput("");
    setMaxPriceInput("");
    setRequestedPage(1);
    if (openScanId) leaveCardForResults();
  };
  const filterPanel = (
    <PublicCardFilterPanel
      info={info}
      facets={facets.data}
      gameKey={gameKey}
      onGameKeyChange={changeGameKey}
      sort={sort}
      sorts={sorts}
      onSortChange={(next) => {
        setSort(next);
        setRequestedPage(1);
        if (openScanId) leaveCardForResults();
      }}
      filters={filters}
      onFiltersChange={changeFilters}
      minPriceInput={minPriceInput}
      maxPriceInput={maxPriceInput}
      onMinPriceInputChange={(value) => {
        setMinPriceInput(value);
        setRequestedPage(1);
      }}
      onMaxPriceInputChange={(value) => {
        setMaxPriceInput(value);
        setRequestedPage(1);
      }}
      onClear={clearFilters}
    />
  );

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex h-dvh flex-col bg-background outline-none"
    >
      <header className="grid shrink-0 grid-cols-1 items-center gap-3 border-b px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,36rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3">
          {info.shopPhotoUrl && (
            <img
              src={info.shopPhotoUrl}
              alt=""
              className="h-12 w-20 shrink-0 rounded-lg object-cover ring-1 ring-border md:h-14 md:w-24"
            />
          )}
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-semibold">{title}</h1>
              {titleBadge}
            </div>
            <p className="truncate text-xs text-foreground/70">
              {headerNote ?? t("publicBrowse.cardCount", { count: info.cardCount })}
            </p>
          </div>
        </div>
        <div className="relative w-full min-w-0">
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/70"
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
              setRequestedPage(1);
              if (openScanId) leaveCardForResults();
            }}
            className="h-10 rounded-lg pl-9 md:text-sm max-md:h-11"
          />
        </div>
        <div className="flex items-center gap-1.5 md:justify-end">
          <Button
            variant={activeFilterCount > 0 ? "selected" : "outline"}
            className="flex-1 md:hidden"
            onClick={() => setShowsFilterDrawer(true)}
          >
            <IconAdjustmentsHorizontal />
            {activeFilterCount > 0
              ? t("publicBrowse.filtersWithCount", { count: activeFilterCount })
              : t("publicBrowse.filtersHeading")}
          </Button>
        </div>
      </header>
      <div className={cn("flex min-h-0 flex-1", openScanId && "hidden")}>
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-sidebar/70 p-4 md:flex md:flex-col md:gap-5 lg:w-72">
          {sidebarTop}
          {filterPanel}
        </aside>
        <div ref={resultsRef} className="min-w-0 flex-1 overflow-y-auto p-4">
          <PublicCardResults
            info={info}
            page={cards.data}
            isPending={cards.isPending}
            isError={cards.isError}
            onPageChange={(next) => {
              setRequestedPage(next);
              resultsRef.current?.scrollTo({ top: 0 });
            }}
            onOpenCard={openCard}
          />
        </div>
      </div>
      {openScanId && (
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
    </main>
  );
}
