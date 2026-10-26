import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SearchInput } from "@/components/ui/search-input";
import { cardSearchQueryOptions } from "@/features/cards/api/card-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_SEARCH_MIN_LENGTH } from "@/lib/constants/cards";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { SPACING } from "@/lib/constants/theme";
import type { CardCorrectionSearchProps } from "@/lib/interfaces/cards";
import { absoluteUrl } from "@/lib/url";
import {
  CARD_LANGUAGES,
  CARD_SEARCH_ALL_LANGUAGES,
  cardSearchResultKey,
  cardSearchResultLabel,
} from "@magic-vault/shared";

export function CardCorrectionSearch({ collectionGuid, initialQuery, disabled = false, onSelect }: CardCorrectionSearchProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const [query, setQuery] = useState(initialQuery);
  const [language, setLanguage] = useState<string>(CARD_SEARCH_ALL_LANGUAGES);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const search = useInfiniteQuery(cardSearchQueryOptions(debounced, collectionGuid, language));
  const languageLabel = (value: string) =>
    value === CARD_SEARCH_ALL_LANGUAGES ? t("cardDetail.allLanguages") : (LANGUAGE_LABELS[value] ?? value);
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
      <ListGroup>
        <ListRow
          icon="language"
          title={t("cardDetail.language")}
          value={languageLabel(language)}
          onPress={() => setLanguageSheetOpen(true)}
        />
      </ListGroup>
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
                  key={cardSearchResultKey(card)}
                  name={card.name}
                  subtitle={`${card.setName} · ${cardSearchResultLabel(card)}`}
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
      <OptionSheet
        visible={languageSheetOpen}
        title={t("cardDetail.language")}
        options={[CARD_SEARCH_ALL_LANGUAGES, ...CARD_LANGUAGES].map((value) => ({ value, label: languageLabel(value) }))}
        selected={[language]}
        onSelect={(value) => {
          setLanguage(value);
          setLanguageSheetOpen(false);
        }}
        onClose={() => setLanguageSheetOpen(false)}
      />
    </View>
  );
}
