import { useInfiniteQuery } from "@tanstack/react-query";
import {
  filterFeatureHighlightsBySearch,
  normalizeFeatureHighlightSearchQuery,
  type FeatureHighlight,
} from "@magic-vault/shared";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, SectionList, View, type ListViewToken } from "react-native";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListLoadingFooter } from "@/components/ui/list-loading-footer";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PullToRefreshControl } from "@/components/ui/pull-to-refresh-control";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeader } from "@/components/ui/section-header";
import {
  featureHighlightTimelineQueryOptions,
  useMarkFeatureHighlightsSeen,
} from "@/features/feature-highlights/api/feature-highlights";
import { FeatureHighlightTimelineEntry } from "@/features/feature-highlights/components/feature-highlight-timeline-entry";
import {
  featureHighlightTimelineSections,
  resolveFeatureHighlightText,
} from "@/features/feature-highlights/lib/feature-highlight-content";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSession } from "@/lib/auth/session";
import { LIST_END_THRESHOLD, SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import {
  FEATURE_HIGHLIGHT_TIMELINE_MIN_VIEW_TIME_MS,
  FEATURE_HIGHLIGHT_TIMELINE_SEEN_DEBOUNCE_MS,
  FEATURE_HIGHLIGHT_TIMELINE_SKELETON_ROWS,
  FEATURE_HIGHLIGHT_TIMELINE_VISIBLE_PERCENT,
} from "@/lib/constants/feature-highlights";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function WhatsNewScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const timeline = useInfiniteQuery(featureHighlightTimelineQueryOptions(user?.id ?? null));
  const markSeen = useMarkFeatureHighlightsSeen();
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);
  const searchQuery = normalizeFeatureHighlightSearchQuery(debouncedSearchText);
  const isSearching = searchQuery.length > 0;
  const pages = timeline.data?.pages;
  const allHighlights = useMemo(() => pages?.flatMap((page) => page.highlights) ?? [], [pages]);
  const visibleHighlights = useMemo(
    () =>
      isSearching
        ? filterFeatureHighlightsBySearch(allHighlights, (text) => resolveFeatureHighlightText(t, text), searchQuery)
        : allHighlights,
    [allHighlights, isSearching, searchQuery, t],
  );
  const sections = useMemo(
    () => featureHighlightTimelineSections(visibleHighlights, i18n.language),
    [visibleHighlights, i18n.language],
  );
  const seenHighlightIds = useMemo(() => new Set(pages?.flatMap((page) => page.seenHighlightIds) ?? []), [pages]);
  const isLoadingRemainingForSearch =
    isSearching && !timeline.isFetchNextPageError && (timeline.hasNextPage || timeline.isFetchingNextPage);
  const hasSettledSearch = isSearching && !!timeline.data && !isLoadingRemainingForSearch;
  const matchCount = sections.reduce((count, section) => count + section.data.length, 0);

  useEffect(() => {
    if (!isSearching || !timeline.hasNextPage || timeline.isFetchingNextPage || timeline.isFetchNextPageError) return;
    void timeline.fetchNextPage();
  }, [isSearching, timeline]);

  const lastAnnouncedSearch = useRef<string | null>(null);
  useEffect(() => {
    if (!hasSettledSearch) {
      if (!isSearching) lastAnnouncedSearch.current = null;
      return;
    }
    const announcement = t("featureHighlights.search.resultsCount", { count: matchCount });
    const announcementKey = `${searchQuery}:${matchCount}`;
    if (lastAnnouncedSearch.current === announcementKey) return;
    lastAnnouncedSearch.current = announcementKey;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [hasSettledSearch, isSearching, matchCount, searchQuery, t]);

  const newThisVisitHighlightIds = useRef(new Set<string>());
  for (const highlight of allHighlights) {
    if (!seenHighlightIds.has(highlight.id)) newThisVisitHighlightIds.current.add(highlight.id);
  }

  const seenHighlightIdsRef = useRef(seenHighlightIds);
  seenHighlightIdsRef.current = seenHighlightIds;
  const markSeenRef = useRef(markSeen.mutate);
  markSeenRef.current = markSeen.mutate;
  const requestedHighlightIds = useRef(new Set<string>());
  const pendingHighlightIds = useRef(new Set<string>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingHighlightIds = useRef(() => {
    flushTimer.current = null;
    const highlightIds = [...pendingHighlightIds.current];
    pendingHighlightIds.current.clear();
    if (highlightIds.length > 0) markSeenRef.current({ highlightIds });
  }).current;

  const viewabilityConfigCallbackPairs = useRef(
    (() => {
      const onViewableItemsChanged = ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
        for (const token of viewableItems) {
          const highlightId = (token.item as FeatureHighlight | null | undefined)?.id;
          if (!highlightId || !token.isViewable) continue;
          if (seenHighlightIdsRef.current.has(highlightId) || requestedHighlightIds.current.has(highlightId)) continue;
          requestedHighlightIds.current.add(highlightId);
          pendingHighlightIds.current.add(highlightId);
        }
        if (pendingHighlightIds.current.size > 0 && !flushTimer.current) {
          flushTimer.current = setTimeout(flushPendingHighlightIds, FEATURE_HIGHLIGHT_TIMELINE_SEEN_DEBOUNCE_MS);
        }
      };
      return [
        {
          viewabilityConfig: {
            itemVisiblePercentThreshold: FEATURE_HIGHLIGHT_TIMELINE_VISIBLE_PERCENT,
            minimumViewTime: FEATURE_HIGHLIGHT_TIMELINE_MIN_VIEW_TIME_MS,
          },
          onViewableItemsChanged,
        },
        {
          viewabilityConfig: {
            viewAreaCoveragePercentThreshold: FEATURE_HIGHLIGHT_TIMELINE_VISIBLE_PERCENT,
            minimumViewTime: FEATURE_HIGHLIGHT_TIMELINE_MIN_VIEW_TIME_MS,
          },
          onViewableItemsChanged,
        },
      ];
    })(),
  ).current;

  useEffect(
    () => () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushPendingHighlightIds();
    },
    [flushPendingHighlightIds],
  );

  return (
    <Screen
      scroll={false}
      padded={false}
      header={<PageHeader title={t("featureHighlights.title")} onBack={() => router.back()} />}
    >
      <SectionList
        sections={sections}
        keyExtractor={(highlight) => highlight.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl }}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        onEndReachedThreshold={LIST_END_THRESHOLD}
        onEndReached={() => {
          if (isSearching) return;
          if (timeline.hasNextPage && !timeline.isFetchingNextPage) void timeline.fetchNextPage();
        }}
        refreshControl={<PullToRefreshControl onRefresh={() => timeline.refetch()} />}
        ListHeaderComponent={
          timeline.data && (allHighlights.length > 0 || searchText.length > 0) ? (
            <View style={{ paddingBottom: SPACING.lg }}>
              <SearchInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={t("featureHighlights.search.placeholder")}
                accessibilityLabel={t("featureHighlights.search.label")}
                onClear={() => setSearchText("")}
                clearAccessibilityLabel={t("featureHighlights.search.clear")}
              />
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <View style={{ paddingBottom: SPACING.sm, paddingTop: section.key === sections[0]?.key ? 0 : SPACING.lg }}>
            <SectionHeader title={section.title} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        renderItem={({ item: highlight }) => (
          <FeatureHighlightTimelineEntry
            highlight={highlight}
            isNew={newThisVisitHighlightIds.current.has(highlight.id)}
          />
        )}
        ListEmptyComponent={
          timeline.isPending ? (
            <ListSkeleton rows={FEATURE_HIGHLIGHT_TIMELINE_SKELETON_ROWS} withIcon={false} />
          ) : timeline.isError && !timeline.data ? (
            <QueryErrorState
              title={t("featureHighlights.loadFailed")}
              onRetry={() => void timeline.refetch()}
              isRetrying={timeline.isFetching}
            />
          ) : isSearching ? (
            hasSettledSearch ? (
              <EmptyState
                icon="search"
                title={t("featureHighlights.search.noMatches", { query: debouncedSearchText.trim() })}
                action={
                  <Button variant="secondary" label={t("featureHighlights.search.clear")} onPress={() => setSearchText("")} />
                }
              />
            ) : undefined
          ) : (
            <EmptyState icon="sparkles" title={t("featureHighlights.timeline.empty")} />
          )
        }
        ListFooterComponent={
          timeline.isFetchingNextPage || isLoadingRemainingForSearch ? (
            <ListLoadingFooter accessibilityLabel={t("featureHighlights.timeline.loadingMore")} />
          ) : undefined
        }
      />
    </Screen>
  );
}
