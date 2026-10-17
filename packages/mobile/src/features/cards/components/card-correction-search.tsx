import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ListGroup } from "@/components/ui/list-group";
import { SearchInput } from "@/components/ui/search-input";
import { cardSearchQueryOptions } from "@/features/cards/api/card-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_SEARCH_MIN_LENGTH } from "@/lib/constants/cards";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import type { CardCorrectionSearchProps } from "@/lib/interfaces/cards";
import { absoluteUrl } from "@/lib/url";

export function CardCorrectionSearch({ collectionGuid, initialQuery, disabled = false, onSelect }: CardCorrectionSearchProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const [query, setQuery] = useState(initialQuery);
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const search = useInfiniteQuery(cardSearchQueryOptions(debounced, collectionGuid));
  const results = useMemo(() => search.data?.pages.flatMap((page) => page.cards) ?? [], [search.data]);
  const tooShort = debounced.length < CARD_SEARCH_MIN_LENGTH;

  return (
    <View style={{ gap: SPACING.md }}>
      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("cardDetail.searchPlaceholder")}
        accessibilityLabel={t("cardDetail.searchPlaceholder")}
      />
      {tooShort ? (
        <AppText tone="secondary" style={{ textAlign: "center", paddingVertical: SPACING.xl }}>
          {t("cardDetail.startTyping")}
        </AppText>
      ) : search.isPending ? (
        <ActivityIndicator color={colors.primaryText} style={{ paddingVertical: SPACING.xl }} />
      ) : results.length === 0 ? (
        <AppText tone="secondary" style={{ textAlign: "center", paddingVertical: SPACING.xl }}>
          {t("cardDetail.noCardsFound")}
        </AppText>
      ) : (
        <>
          <ListGroup>
            {results.map((card) => {
              const price = pricing.priceOf(card, false);
              return (
                <CardRow
                  key={card.id}
                  name={card.name}
                  subtitle={`${card.setName} · ${card.set.toUpperCase()} #${card.collectorNumber}`}
                  imageUrl={absoluteUrl(card.image?.small ?? card.image?.normal)}
                  price={price != null ? pricing.format(price) : null}
                  onPress={disabled ? undefined : () => onSelect(card)}
                />
              );
            })}
          </ListGroup>
          {search.hasNextPage ? (
            <Button
              variant="secondary"
              label={t("cardDetail.loadMore")}
              loading={search.isFetchingNextPage}
              onPress={() => void search.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
