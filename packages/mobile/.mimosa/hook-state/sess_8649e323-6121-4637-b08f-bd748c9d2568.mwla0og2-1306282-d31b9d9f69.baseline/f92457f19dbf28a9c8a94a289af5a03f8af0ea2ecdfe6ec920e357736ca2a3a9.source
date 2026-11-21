import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import {
  DEFAULT_TRADE_OFFER_CARD_SORT,
  PRICE_TRADE_OFFER_CARD_SORT,
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
  UNPRICED_DEFAULT_TRADE_OFFER_CARD_SORT,
  type TradeOfferCardSort,
  type TradeOfferLocationSection,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ListGroup } from "@/components/ui/list-group";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TradeOfferReviewRow } from "@/features/trade-offers/components/trade-offer-review-row";
import { SPACING } from "@/lib/constants/theme";
import type { TradeOfferReviewSideProps } from "@/lib/interfaces/trade-offers";

export function TradeOfferReviewSide({
  title,
  cards,
  prices,
  placements,
  priceSource,
  showsPrices = true,
  children,
}: TradeOfferReviewSideProps) {
  const { t } = useTranslation();
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
        ? filterTradeOfferLocationSections(groupTradeOfferCardsByLocation(cards, prices, placements, sort), query)
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
  const filterResults = t("tradeOffers.cardList.filterResults", { count: matchingRowCount });

  useEffect(() => {
    if (isFiltering) AccessibilityInfo.announceForAccessibility(filterResults);
  }, [isFiltering, filterResults]);

  const sectionTitle = (section: TradeOfferLocationSection) =>
    section.kind === "storage"
      ? section.name
      : section.kind === "bin"
        ? t("tradeOffers.cardList.sectionBin", { collection: section.name, bin: section.binNumber })
        : section.kind === "collection"
          ? t("tradeOffers.cardList.sectionCollection", { collection: section.name })
          : t("tradeOffers.cardList.sectionMissing");

  return (
    <View style={{ gap: SPACING.sm }}>
      <View>
        <SectionHeader title={title} />
        {cards.length > 0 ? (
          <AppText size="xs" tone="secondary">
            {[
              t("tradeOffers.cardList.cardCount", { count: totals.totalCards }),
              t("tradeOffers.cardList.uniqueCount", { count: totals.uniqueCards }),
              showsPrices ? formatPrice(totals.totalValue, priceSource) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
        ) : null}
      </View>
      {children}
      {rows.length > 1 ? (
        <View style={{ gap: SPACING.xs }}>
          <AppText size="xs" tone="secondary">
            {t("tradeOffers.cardList.sortLabel")}
          </AppText>
          <SegmentedControl
            options={TRADE_OFFER_CARD_SORTS.filter((value) => showsPrices || value !== PRICE_TRADE_OFFER_CARD_SORT).map(
              (value) => ({ value, label: t(`tradeOffers.cardList.sort.${value}`) }),
            )}
            value={sort}
            onChange={setSort}
          />
        </View>
      ) : null}
      {rows.length > 1 && placements ? (
        <Surface>
          <SwitchRow
            title={t("tradeOffers.cardList.groupByLocation")}
            description={groupsByLocation ? t("tradeOffers.cardList.groupByLocationHint") : undefined}
            value={groupsByLocation}
            onValueChange={setGroupsByLocation}
          />
        </Surface>
      ) : null}
      {hasFilter ? (
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("tradeOffers.cardList.filterPlaceholder")}
          accessibilityLabel={t("tradeOffers.cardList.filterLabel")}
        />
      ) : null}
      {isFiltering && matchingRowCount > 0 ? (
        <AppText size="xs" tone="secondary">
          {filterResults}
        </AppText>
      ) : null}
      {cards.length === 0 ? null : matchingRowCount === 0 ? (
        <AppText size="sm" tone="secondary">
          {t("tradeOffers.cardList.noFilterResults")}
        </AppText>
      ) : visibleSections ? (
        visibleSections.map((section) => (
          <View key={section.key} style={{ gap: SPACING.xs }}>
            <AppText size="sm" weight="semibold" accessibilityRole="header">
              {sectionTitle(section)}
            </AppText>
            <ListGroup>
              {section.rows.map((row) => (
                <TradeOfferReviewRow
                  key={row.key}
                  row={row}
                  priceSource={priceSource}
                  showsPlacement
                  showsPrice={showsPrices}
                />
              ))}
            </ListGroup>
          </View>
        ))
      ) : (
        <ListGroup>
          {visibleRows.map((row) => (
            <TradeOfferReviewRow
              key={row.key}
              row={row}
              priceSource={priceSource}
              showsPlacement={!!placements}
              showsPrice={showsPrices}
            />
          ))}
        </ListGroup>
      )}
      {isCollapsible ? (
        <Button
          variant="ghost"
          icon={isExpanded ? "collapse" : "expand"}
          label={
            isExpanded
              ? t("tradeOffers.cardList.showLess")
              : t("tradeOffers.cardList.showAll", { count: matchingRowCount })
          }
          onPress={() => setIsExpanded((expanded) => !expanded)}
        />
      ) : null}
    </View>
  );
}
