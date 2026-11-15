import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { CardTile } from "@/components/cards/card-tile";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cardPrintingsQueryOptions } from "@/features/search/api/catalog-card-search";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { usePricing } from "@/hooks/use-pricing";
import { cardArtSources } from "@/lib/card-art";
import { CARD_ASPECT_RATIO, CARD_GRID_GAP_X, CARD_GRID_GAP_Y } from "@/lib/constants/collections";
import { CARD_PRINTINGS_GRID_COLUMNS, CARD_PRINTINGS_SKELETON_TILES } from "@/lib/constants/search";
import { CARD_ART_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CardPrintingsGridProps } from "@/lib/interfaces/search";
import { catalogPrintingLabel } from "@magic-vault/shared";

export function CardPrintingsGrid({ game, openedCardId, selectedCardId, onSelect }: CardPrintingsGridProps) {
  const { t } = useTranslation();
  const pricing = usePricing();
  const panelWidth = usePanelWidth();
  const printingsQuery = useInfiniteQuery(cardPrintingsQueryOptions(game, openedCardId));
  const printings = printingsQuery.data?.pages.flatMap((page) => page.cards) ?? [];
  const totalCount = printingsQuery.data?.pages[0]?.totalCount ?? 0;
  const tileWidth =
    (panelWidth - SCREEN_GUTTER * 2 - CARD_GRID_GAP_X * (CARD_PRINTINGS_GRID_COLUMNS - 1)) / CARD_PRINTINGS_GRID_COLUMNS;

  if (printingsQuery.isSuccess && totalCount <= 1) return null;

  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader
        title={
          printingsQuery.isSuccess ? t("search.printings.titleWithCount", { count: totalCount }) : t("search.printings.title")
        }
      />
      {printingsQuery.isError ? (
        <Callout
          tone="destructive"
          title={t("search.printings.loadFailed")}
          action={
            <Button
              size="sm"
              variant="secondary"
              label={t("recovery.retry")}
              loading={printingsQuery.isFetching}
              onPress={() => void printingsQuery.refetch()}
            />
          }
        />
      ) : printingsQuery.isPending ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", flexWrap: "wrap", columnGap: CARD_GRID_GAP_X, rowGap: CARD_GRID_GAP_Y }}
        >
          {Array.from({ length: CARD_PRINTINGS_SKELETON_TILES }).map((_, index) => (
            <View key={index} style={{ width: tileWidth, gap: 6 }}>
              <Skeleton height={tileWidth / CARD_ASPECT_RATIO} radius={CARD_ART_RADIUS} />
              <Skeleton height={12} width="75%" />
              <Skeleton height={12} width="50%" />
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: CARD_GRID_GAP_X, rowGap: CARD_GRID_GAP_Y }}>
            {printings.map((printing) => {
              const price = pricing.priceOf(printing, false);
              const label = catalogPrintingLabel(printing);
              return (
                <View key={printing.id} style={{ width: tileWidth, flexDirection: "row" }}>
                  <CardTile
                    name={printing.setName || printing.set.toUpperCase()}
                    caption={[
                      printing.collectorNumber ? `#${printing.collectorNumber}` : null,
                      price != null ? pricing.format(price) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {...cardArtSources(printing.image)}
                    selected={printing.id === selectedCardId}
                    onPress={() => {
                      if (printing.id === selectedCardId) return;
                      onSelect(printing);
                      AccessibilityInfo.announceForAccessibility(t("search.printings.selected", { printing: label }));
                    }}
                  />
                </View>
              );
            })}
          </View>
          {printingsQuery.hasNextPage ? (
            <Button
              variant="secondary"
              label={t("search.printings.showMore")}
              loading={printingsQuery.isFetchingNextPage}
              onPress={() => void printingsQuery.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
