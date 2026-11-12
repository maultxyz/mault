import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { catalogCardsQueryOptions, revectorizeCatalogCard } from "@/features/admin/api/cards-database";
import { CardsDumpPanel } from "@/features/admin/components/cards-dump-panel";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ADMIN_CARDS_QUERY_KEY, ADMIN_DEFAULT_SYNC_LANGUAGE } from "@/lib/constants/admin-cards";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";
import type { AdminCatalogCard } from "@/lib/interfaces/admin-cards";

export function CardsDatabasePanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const [pageState, setPageState] = useState({ page: 1, search: "" });
  const page = pageState.search === debouncedSearch ? pageState.page : 1;
  const catalog = useQuery({ ...catalogCardsQueryOptions(page, debouncedSearch), placeholderData: keepPreviousData });
  const [revectorizingCardIds, setRevectorizingCardIds] = useState<ReadonlySet<string>>(new Set());
  const [revectorizeResult, setRevectorizeResult] = useState<{ tone: "success" | "destructive"; message: string } | null>(null);

  const revectorize = useMutation({
    mutationFn: (card: AdminCatalogCard) => revectorizeCatalogCard(card.cardId),
    onMutate: (card) => {
      setRevectorizeResult(null);
      setRevectorizingCardIds((previous) => new Set(previous).add(card.cardId));
    },
    onSuccess: (message) => {
      setRevectorizeResult({ tone: "success", message });
      AccessibilityInfo.announceForAccessibility(message);
      void queryClient.invalidateQueries({ queryKey: [...ADMIN_CARDS_QUERY_KEY, "catalog"] });
    },
    onError: (_error, card) => setRevectorizeResult({ tone: "destructive", message: t("admin.cards.database.revectorizeFailed", { name: card.name }) }),
    onSettled: (_result, _error, card) =>
      setRevectorizingCardIds((previous) => {
        const next = new Set(previous);
        next.delete(card.cardId);
        return next;
      }),
  });

  const data = catalog.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const goToPage = (nextPage: number) => setPageState({ page: nextPage, search: debouncedSearch });

  return (
    <View style={{ gap: SPACING.lg }}>
      <View style={{ gap: SPACING.md }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: SPACING.sm }}>
          <AppText heading weight="semibold" accessibilityRole="header">
            {t("admin.cards.database.heading")}
          </AppText>
          {data ? (
            <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
              {t("admin.cards.database.cardCount", { count: data.total })}
            </AppText>
          ) : null}
        </View>
        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t("admin.cards.database.searchPlaceholder")}
          accessibilityLabel={t("admin.cards.database.searchLabel")}
        />
        {catalog.isError ? <Callout tone="destructive" title={t("admin.cards.database.loadFailed")} /> : null}
        {revectorizeResult ? <Callout tone={revectorizeResult.tone} title={revectorizeResult.message} /> : null}
        {catalog.isLoading ? (
          <ListSkeleton rows={6} withIcon={false} />
        ) : data && data.cards.length === 0 ? (
          <EmptyState icon="database" title={t("admin.cards.database.empty")} />
        ) : (
          <ListGroup>
            {(data?.cards ?? []).map((card) => {
              const isRevectorizing = revectorizingCardIds.has(card.cardId);
              const details = [card.gameKey.toUpperCase(), card.setCode.toUpperCase(), card.lang !== ADMIN_DEFAULT_SYNC_LANGUAGE ? card.lang : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <ListRow
                  key={card.cardId}
                  title={card.name}
                  subtitle={`${details} · ${formatShortDate(card.updatedAt, i18n.language)}`}
                  rightIsInteractive
                  right={
                    <IconButton
                      icon="refresh"
                      accessibilityLabel={t("admin.cards.database.revectorizeLabel", { name: card.name })}
                      disabled={isRevectorizing}
                      onPress={() => revectorize.mutate(card)}
                    />
                  }
                />
              );
            })}
          </ListGroup>
        )}
        {data && pageCount > 1 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
            <Button
              variant="secondary"
              icon="arrowLeft"
              iconOnly
              label={t("admin.cards.database.previousPage")}
              disabled={page <= 1 || catalog.isFetching}
              onPress={() => goToPage(page - 1)}
            />
            <AppText size="xs" tone="secondary" accessibilityLiveRegion="polite" style={{ flex: 1, textAlign: "center", fontVariant: ["tabular-nums"] }}>
              {t("admin.cards.database.pageStatus", { page, pageCount })}
            </AppText>
            <Button
              variant="secondary"
              icon="arrowRight"
              iconOnly
              label={t("admin.cards.database.nextPage")}
              disabled={page >= pageCount || catalog.isFetching}
              onPress={() => goToPage(page + 1)}
            />
          </View>
        ) : null}
      </View>
      <CardsDumpPanel />
    </View>
  );
}
