import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions, View } from "react-native";
import { OCR_REGIONS_BY_GAME_KEY, type PlayingCard } from "@magic-vault/shared";
import { CardTile } from "@/components/cards/card-tile";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeader } from "@/components/ui/section-header";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  gameCardSearchQueryOptions,
  gameCardSetsQueryOptions,
  gameCoverageQueryOptions,
  healthQueryOptions,
} from "@/features/health/api/health";
import { OcrRegionTile } from "@/features/health/components/ocr-region-tile";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_SEARCH_MIN_LENGTH } from "@/lib/constants/cards";
import { CARD_GRID_COLUMNS, CARD_GRID_GAP_X, CARD_GRID_GAP_Y, SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { OCR_TILE_COLUMNS } from "@/lib/constants/health";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { ANY_SET_OPTION, CARD_SET_PICKER_LIMIT } from "@/lib/constants/scanner";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";
import { absoluteUrl } from "@/lib/url";

export default function HealthScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const { width } = useWindowDimensions();
  const health = useQuery(healthQueryOptions);
  const coverage = useQuery(gameCoverageQueryOptions);
  const [gameKey, setGameKey] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [picker, setPicker] = useState<"game" | "lang" | "set" | null>(null);
  const [query, setQuery] = useState("");
  const [setCode, setSetCode] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const games = (coverage.data ?? []).filter((game) => game.cardCount > 0);
  const game = games.find((g) => g.key === gameKey) ?? games[0];
  const languages = game?.languages.length ? game.languages : ["en"];
  const activeLang = lang && languages.includes(lang) ? lang : languages[0];
  const search = useInfiniteQuery(gameCardSearchQueryOptions(debounced, game?.key ?? null, activeLang, setCode));
  const cardSets = useQuery(gameCardSetsQueryOptions(debounced, game?.key ?? null, activeLang));
  const sets = cardSets.data ?? [];
  const selectedSetName = setCode ? (sets.find((set) => set.code === setCode)?.name ?? setCode.toUpperCase()) : null;
  const results = search.data?.pages.flatMap((page) => page.cards) ?? [];
  const queryReady = debounced.trim().length >= CARD_SEARCH_MIN_LENGTH;

  const contentWidth = width - SCREEN_GUTTER * 2;
  const tileWidth = (contentWidth - CARD_GRID_GAP_X * (CARD_GRID_COLUMNS - 1)) / CARD_GRID_COLUMNS;
  const ocrWidth = (contentWidth - SPACING.lg * (OCR_TILE_COLUMNS - 1)) / OCR_TILE_COLUMNS;
  const ocrGames = Object.entries(OCR_REGIONS_BY_GAME_KEY)
    .map(([key, regions]) => {
      const match = coverage.data?.find((g) => g.key === key);
      return {
        key,
        regions,
        name: match?.name ?? key,
        lang: match && match.cardCount > 0 ? (match.languages[0] ?? "en") : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const data = health.data;
  const cardLookupCaption = (card: PlayingCard) => {
    const printing = `${card.set.toUpperCase()} #${card.collectorNumber}`;
    const price = pricing.priceOf(card, false);
    return price != null ? `${printing} · ${pricing.format(price)}` : printing;
  };

  return (
    <Screen
      refreshing={health.isRefetching}
      onRefresh={() => {
        void health.refetch();
        void coverage.refetch();
      }}
      header={
        <PageHeader
          title={t("health.title")}
          subtitle={t("health.subtitle")}
          onBack={() => router.back()}
          actions={
            <IconButton
              icon="refresh"
              accessibilityLabel={t("health.refresh")}
              disabled={health.isFetching}
              onPress={() => void health.refetch()}
            />
          }
        />
      }
    >
      {data ? (
        <Callout
          tone={data.healthy ? "success" : "destructive"}
          title={data.healthy ? t("health.allHealthy") : t("health.someUnhealthy")}
          description={t("health.lastChecked", { time: new Date(data.checkedAt).toLocaleTimeString(i18n.language) })}
        />
      ) : null}
      {health.isPending ? (
        <Skeleton height={64} />
      ) : (
        <ListGroup>
          {(data?.checks ?? []).map((check) => (
            <ListRow
              key={check.name}
              title={check.name}
              subtitle={check.status === "error" ? check.message : undefined}
              tone={check.status === "error" ? "destructive" : "default"}
              leading={
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: RADIUS.full,
                    backgroundColor: check.status === "ok" ? colors.success : colors.destructive,
                  }}
                />
              }
              value={`${t("health.latency", { ms: check.latencyMs })} · ${check.status === "ok" ? t("health.statusOk") : t("health.statusError")}`}
            />
          ))}
        </ListGroup>
      )}

      <SectionHeader title={t("health.gameCoverage.heading")} />
      <AppText size="xs" tone="secondary">
        {t("health.gameCoverage.description")}
      </AppText>
      {coverage.isPending ? (
        <Skeleton height={120} />
      ) : coverage.data && coverage.data.length === 0 ? (
        <EmptyState icon="collections" title={t("health.gameCoverage.empty")} />
      ) : (
        <ListGroup>
          {(coverage.data ?? []).map((entry) => (
            <ListRow
              key={entry.guid}
              title={entry.isActive ? entry.name : `${entry.name} · ${t("health.gameCoverage.inactive")}`}
              subtitle={
                [
                  entry.languages.map((code) => LANGUAGE_LABELS[code] ?? code).join(", "),
                  entry.lastUpdated
                    ? t("health.gameCoverage.lastUpdated", { date: formatShortDate(entry.lastUpdated, i18n.language) })
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n") || undefined
              }
              value={t("health.gameCoverage.cardCount", { count: entry.cardCount })}
            />
          ))}
        </ListGroup>
      )}

      <SectionHeader title={t("health.cardLookup.heading")} />
      <AppText size="xs" tone="secondary">
        {t("health.cardLookup.description")}
      </AppText>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <View style={{ flex: 1 }}>
          <SelectField
            label={t("health.cardLookup.game")}
            value={game?.name ?? null}
            placeholder={t("health.cardLookup.noGames")}
            disabled={games.length === 0}
            onPress={() => setPicker("game")}
          />
        </View>
        {languages.length > 1 ? (
          <View style={{ flex: 1 }}>
            <SelectField
              label={t("health.cardLookup.language")}
              value={LANGUAGE_LABELS[activeLang] ?? activeLang}
              placeholder={t("health.cardLookup.language")}
              onPress={() => setPicker("lang")}
            />
          </View>
        ) : null}
      </View>
      <SearchInput
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setSetCode(null);
        }}
        placeholder={t("health.cardLookup.searchPlaceholder")}
        accessibilityLabel={t("health.cardLookup.searchPlaceholder")}
      />
      {queryReady && sets.length > 1 ? (
        <SelectField
          label={t("cardDetail.set")}
          value={selectedSetName ?? t("health.cardLookup.allSets")}
          placeholder={t("health.cardLookup.allSets")}
          onPress={() => setPicker("set")}
        />
      ) : null}
      {queryReady && search.isPending ? <Skeleton height={tileWidth * 1.4} /> : null}
      {queryReady && search.data && results.length === 0 ? (
        <AppText size="sm" tone="secondary">
          {t("health.cardLookup.noResults")}
        </AppText>
      ) : null}
      {results.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: CARD_GRID_GAP_X, rowGap: CARD_GRID_GAP_Y }}>
          {results.map((card) => (
            <View key={card.id} style={{ width: tileWidth }}>
              <CardTile
                name={card.name}
                caption={cardLookupCaption(card)}
                imageUrl={absoluteUrl(card.image?.normal ?? card.image?.small)}
              />
            </View>
          ))}
        </View>
      ) : null}
      {search.hasNextPage ? (
        <Button
          variant="secondary"
          label={t("health.cardLookup.loadMore")}
          loading={search.isFetchingNextPage}
          onPress={() => void search.fetchNextPage()}
        />
      ) : null}

      <SectionHeader title={t("health.ocrRegions.heading")} />
      <AppText size="xs" tone="secondary">
        {t("health.ocrRegions.description")}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: SPACING.lg, rowGap: SPACING.xl }}>
        {ocrGames.map((entry) => (
          <OcrRegionTile
            key={entry.key}
            gameKey={entry.key}
            name={entry.name}
            lang={entry.lang}
            regions={entry.regions}
            width={ocrWidth}
          />
        ))}
      </View>

      <OptionSheet
        visible={picker === "game"}
        title={t("health.cardLookup.game")}
        options={games.map((g) => ({ value: g.key, label: g.name }))}
        selected={game ? [game.key] : []}
        onSelect={(value) => {
          setPicker(null);
          setGameKey(value);
          setSetCode(null);
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "lang"}
        title={t("health.cardLookup.language")}
        options={languages.map((code) => ({ value: code, label: LANGUAGE_LABELS[code] ?? code }))}
        selected={[activeLang]}
        onSelect={(value) => {
          setPicker(null);
          setLang(value);
          setSetCode(null);
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "set"}
        title={t("cardDetail.set")}
        searchPlaceholder={t("scan.options.searchSets")}
        maxVisibleOptions={CARD_SET_PICKER_LIMIT}
        options={[
          { value: ANY_SET_OPTION, label: t("health.cardLookup.allSets") },
          ...sets.map((set) => ({ value: set.code, label: set.name })),
        ]}
        selected={[setCode ?? ANY_SET_OPTION]}
        onSelect={(value) => {
          setPicker(null);
          setSetCode(value === ANY_SET_OPTION ? null : value);
        }}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}
