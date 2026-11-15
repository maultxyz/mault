import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TradeOfferReviewRow } from "@/features/trade-offers/components/trade-offer-review-row";
import type { TradeOfferReviewSideProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TRADE_OFFER_CARD_SORT,
  PRICE_TRADE_OFFER_CARD_SORT,
  UNPRICED_DEFAULT_TRADE_OFFER_CARD_SORT,
  TRADE_OFFER_CARD_SORTS,
  TRADE_OFFER_COLLAPSED_ROW_COUNT,
  TRADE_OFFER_FILTER_ROW_THRESHOLD,
  filterTradeOfferCardGroups,
  filterTradeOfferLocationSections,
  formatPrice,
  groupTradeOfferCards,
  groupTradeOfferCardsByLocation,
  limitTradeOfferLocationSections,
  sortTradeOfferCardGroups,
  tradeOfferSideTotals,
  type TradeOfferCardSort,
  type TradeOfferLocationSection,
} from "@magic-vault/shared";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function TradeOfferReviewSide({
  title,
  cards,
  prices,
  placements,
  priceSource,
  showsPrices = true,
  className,
  children,
}: TradeOfferReviewSideProps) {
  const { t } = useTranslation("common");
  const headingId = useId();
  const filterId = useId();
  const groupId = useId();
  const [sort, setSort] = useState<TradeOfferCardSort>(
    showsPrices ? DEFAULT_TRADE_OFFER_CARD_SORT : UNPRICED_DEFAULT_TRADE_OFFER_CARD_SORT,
  );
  const [query, setQuery] = useState("");
  const [groupsByLocation, setGroupsByLocation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const totals = useMemo(() => tradeOfferSideTotals(cards, prices), [cards, prices]);
  const rows = useMemo(
    () => sortTradeOfferCardGroups(groupTradeOfferCards(cards, prices, placements), sort),
    [cards, prices, placements, sort],
  );
  const sections = useMemo<TradeOfferLocationSection[] | null>(
    () =>
      groupsByLocation && placements
        ? filterTradeOfferLocationSections(
            groupTradeOfferCardsByLocation(cards, prices, placements, sort),
            query,
          )
        : null,
    [groupsByLocation, placements, cards, prices, sort, query],
  );
  const filteredRows = useMemo(() => filterTradeOfferCardGroups(rows, query), [rows, query]);
  const matchingRowCount = sections
    ? sections.reduce((sum, section) => sum + section.rows.length, 0)
    : filteredRows.length;
  const isCollapsible = matchingRowCount > TRADE_OFFER_COLLAPSED_ROW_COUNT;
  const visibleLimit = isCollapsible && !isExpanded ? TRADE_OFFER_COLLAPSED_ROW_COUNT : Infinity;
  const visibleSections = sections ? limitTradeOfferLocationSections(sections, visibleLimit) : null;
  const visibleRows = filteredRows.slice(0, visibleLimit);
  const hasFilter = rows.length > TRADE_OFFER_FILTER_ROW_THRESHOLD;
  const isFiltering = query.trim().length > 0;
  const sortItems = TRADE_OFFER_CARD_SORTS.filter(
    (key) => showsPrices || key !== PRICE_TRADE_OFFER_CARD_SORT,
  ).map((key) => ({
    key,
    label: t(`tradeOffers.cardList.sort.${key}`),
  }));

  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="font-heading text-sm font-semibold">
          {title}
        </h2>
        {cards.length > 0 && (
          <p className="text-xs text-foreground/70 tabular-nums">
            {[
              t("tradeOffers.cardList.cardCount", { count: totals.totalCards }),
              t("tradeOffers.cardList.uniqueCount", { count: totals.uniqueCards }),
              showsPrices ? formatPrice(totals.totalValue, priceSource) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      {children}
      {rows.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ResponsiveSegmented
            items={sortItems}
            value={sort}
            onChange={setSort}
            label={t("tradeOffers.cardList.sortLabel")}
          />
          {placements && (
            <Field orientation="horizontal" className="w-auto">
              <Switch
                id={groupId}
                checked={groupsByLocation}
                onCheckedChange={setGroupsByLocation}
              />
              <FieldLabel htmlFor={groupId}>{t("tradeOffers.cardList.groupByLocation")}</FieldLabel>
            </Field>
          )}
        </div>
      )}
      {hasFilter && (
        <div className="flex flex-col gap-1">
          <label htmlFor={filterId} className="text-xs text-foreground/70">
            {t("tradeOffers.cardList.filterLabel")}
          </label>
          <Input
            id={filterId}
            type="search"
            value={query}
            placeholder={t("tradeOffers.cardList.filterPlaceholder")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}
      <p role="status" className="sr-only">
        {isFiltering ? t("tradeOffers.cardList.filterResults", { count: matchingRowCount }) : ""}
      </p>
      {groupsByLocation && placements && (
        <p className="text-xs text-foreground/70">{t("tradeOffers.cardList.groupByLocationHint")}</p>
      )}
      {cards.length === 0 ? null : matchingRowCount === 0 ? (
        <p className="text-control text-foreground/70">{t("tradeOffers.cardList.noFilterResults")}</p>
      ) : visibleSections ? (
        <div className="flex flex-col gap-3 md:gap-2">
          {visibleSections.map((section) => (
            <div key={section.key} className="flex flex-col">
              <h3
                className={
                  section.kind === "missing"
                    ? "text-xs font-medium text-warning-foreground"
                    : "text-xs font-medium text-foreground/70"
                }
              >
                {section.kind === "storage"
                  ? section.name
                  : section.kind === "bin"
                    ? t("tradeOffers.cardList.sectionBin", { collection: section.name, bin: section.binNumber })
                    : section.kind === "collection"
                      ? t("tradeOffers.cardList.sectionCollection", { collection: section.name })
                      : t("tradeOffers.cardList.sectionMissing")}
              </h3>
              <ul className="flex flex-col divide-y divide-border">
                {section.rows.map((row) => (
                  <TradeOfferReviewRow
                    key={row.key}
                    row={row}
                    priceSource={priceSource}
                    showsPlacement
                    showsPrice={showsPrices}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {visibleRows.map((row) => (
            <TradeOfferReviewRow
              key={row.key}
              row={row}
              priceSource={priceSource}
              showsPlacement={!!placements}
              showsPrice={showsPrices}
            />
          ))}
        </ul>
      )}
      {isCollapsible && (
        <Button
          variant="ghost"
          className="self-start"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? <IconChevronUp /> : <IconChevronDown />}
          {isExpanded
            ? t("tradeOffers.cardList.showLess")
            : t("tradeOffers.cardList.showAll", { count: matchingRowCount })}
        </Button>
      )}
    </section>
  );
}
