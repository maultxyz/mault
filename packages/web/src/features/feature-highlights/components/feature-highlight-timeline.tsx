import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { featureHighlightTimelineQueryOptions } from "@/features/feature-highlights/api/feature-highlights";
import { useMarkFeatureHighlightsSeenWhenViewed } from "@/features/feature-highlights/api/use-mark-feature-highlights-seen-when-viewed";
import { FeatureHighlightSearchField } from "@/features/feature-highlights/components/feature-highlight-search-field";
import { FeatureHighlightTimelineEntry } from "@/features/feature-highlights/components/feature-highlight-timeline-entry";
import { seenFeatureHighlightIdsOf } from "@/features/feature-highlights/lib/feature-highlight-cache";
import { resolveFeatureHighlightText } from "@/features/feature-highlights/lib/feature-highlight-slides";
import { groupFeatureHighlightsByMonth } from "@/features/feature-highlights/lib/feature-highlight-timeline";
import { useImpersonation } from "@/hooks/use-impersonation";
import { useInView } from "@/hooks/use-in-view";
import { useAuthSession } from "@/lib/auth";
import {
  FEATURE_HIGHLIGHT_ID_ATTRIBUTE,
  FEATURE_HIGHLIGHT_TARGET_EMPHASIS_MS,
  FEATURE_HIGHLIGHT_TIMELINE_PRELOAD_MARGIN,
  WHATS_NEW_HIGHLIGHT_PARAM,
} from "@/lib/constants/feature-highlights";
import { prefersReducedMotion } from "@/lib/motion";
import type { FeatureHighlightTimelineProps } from "@/lib/interfaces/feature-highlights";
import { cn } from "@/lib/utils";
import {
  filterFeatureHighlightsBySearch,
  normalizeFeatureHighlightSearchQuery,
} from "@magic-vault/shared";
import { IconSearch, IconSparkles } from "@tabler/icons-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function TimelineEntrySkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 md:gap-3 md:p-2.5">
      <div className="flex h-5 items-center">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col gap-3 md:gap-2">
        <Skeleton className="aspect-video w-full rounded-lg" />
        <div className="flex h-6 items-center">
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      </div>
    </div>
  );
}

export function FeatureHighlightTimeline({
  searchText,
  onSearchTextChange,
  searchQuery,
}: FeatureHighlightTimelineProps) {
  const { t, i18n } = useTranslation("common");
  const { data: authSession } = useAuthSession();
  const userId = authSession?.user?.id ?? null;
  const { isImpersonating } = useImpersonation();
  const timelineQuery = useInfiniteQuery(
    featureHighlightTimelineQueryOptions(userId),
  );
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = timelineQuery;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isSentinelInView = useInView(sentinelRef, {
    rootMargin: FEATURE_HIGHLIGHT_TIMELINE_PRELOAD_MARGIN,
  });
  const isSearching = normalizeFeatureHighlightSearchQuery(searchQuery) !== "";
  const trimmedQuery = searchQuery.trim();

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const loadedHighlights = useMemo(
    () => pages.flatMap((page) => page.highlights),
    [pages],
  );
  const highlights = useMemo(() => {
    return isSearching
      ? filterFeatureHighlightsBySearch(
          loadedHighlights,
          (text) => resolveFeatureHighlightText(t, text),
          searchQuery,
        )
      : loadedHighlights;
  }, [loadedHighlights, isSearching, searchQuery, t]);
  const groups = useMemo(
    () => groupFeatureHighlightsByMonth(highlights),
    [highlights],
  );
  const shownCount = groups.reduce(
    (count, group) => count + group.highlights.length,
    0,
  );
  const seenHighlightIds = useMemo(() => seenFeatureHighlightIdsOf(pages), [pages]);
  const unseenLoadedIds = useMemo(
    () =>
      loadedHighlights
        .map((highlight) => highlight.id)
        .filter((highlightId) => !seenHighlightIds.has(highlightId)),
    [loadedHighlights, seenHighlightIds],
  );
  const unseenHighlightIds = useMemo(() => {
    const shownIds = new Set(highlights.map((highlight) => highlight.id));
    return unseenLoadedIds.filter((highlightId) => shownIds.has(highlightId));
  }, [highlights, unseenLoadedIds]);
  const [newOnThisVisit, setNewOnThisVisit] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  if (unseenLoadedIds.some((highlightId) => !newOnThisVisit.has(highlightId))) {
    setNewOnThisVisit(new Set([...newOnThisVisit, ...unseenLoadedIds]));
  }
  const listRef = useRef<HTMLDivElement>(null);
  useMarkFeatureHighlightsSeenWhenViewed(
    listRef,
    unseenHighlightIds,
    !isImpersonating,
  );
  const monthFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }),
    [i18n.language],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const targetHighlightId = searchParams.get(WHATS_NEW_HIGHLIGHT_PARAM);
  const isTargetShown =
    !!targetHighlightId &&
    highlights.some((highlight) => highlight.id === targetHighlightId);
  const isSeekingTarget = !!targetHighlightId && !!data && !isTargetShown;
  const [emphasizedHighlightId, setEmphasizedHighlightId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!targetHighlightId || !data) return;
    if (!isTargetShown && (hasNextPage || isFetchingNextPage) && !isFetchNextPageError) {
      return;
    }
    if (isTargetShown) {
      const entry = listRef.current?.querySelector<HTMLElement>(
        `[${FEATURE_HIGHLIGHT_ID_ATTRIBUTE}="${CSS.escape(targetHighlightId)}"]`,
      );
      entry?.scrollIntoView?.({
        block: "start",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      entry?.focus({ preventScroll: true });
      setEmphasizedHighlightId(targetHighlightId);
    }
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete(WHATS_NEW_HIGHLIGHT_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [
    targetHighlightId,
    data,
    isTargetShown,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!emphasizedHighlightId) return;
    const timeout = setTimeout(
      () => setEmphasizedHighlightId(null),
      FEATURE_HIGHLIGHT_TARGET_EMPHASIS_MS,
    );
    return () => clearTimeout(timeout);
  }, [emphasizedHighlightId]);

  const loadsMore = isSearching || isSentinelInView || isSeekingTarget;
  useEffect(() => {
    if (!loadsMore || !hasNextPage || isFetchingNextPage || isFetchNextPageError) {
      return;
    }
    void fetchNextPage();
  }, [loadsMore, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const isLoadingSearch =
    isSearching && (!data || hasNextPage || isFetchingNextPage) && !isFetchNextPageError;
  const statusText =
    isSearching && !isLoadingSearch
      ? t("featureHighlights.search.resultsCount", { count: shownCount })
      : "";
  const showsSearchField = loadedHighlights.length > 0 || searchText !== "";

  const loadMoreControls = (
    <>
      {isFetchingNextPage && (
        <div aria-busy="true">
          <span className="sr-only">{t("featureHighlights.timeline.loadingMore")}</span>
          <TimelineEntrySkeleton />
        </div>
      )}
      {isFetchNextPageError && (
        <LoadErrorCallout
          message={t("featureHighlights.timeline.loadFailed")}
          onRetry={() => void fetchNextPage()}
        />
      )}
      {!isSearching && hasNextPage && !isFetchingNextPage && !isFetchNextPageError && (
        <Button
          variant="secondary"
          className="self-center"
          onClick={() => void fetchNextPage()}
        >
          {t("featureHighlights.timeline.loadMore")}
        </Button>
      )}
    </>
  );

  let body;
  if (!data) {
    body = timelineQuery.isError ? (
      <LoadErrorCallout
        message={t("featureHighlights.timeline.loadFailed")}
        onRetry={() => void timelineQuery.refetch()}
      />
    ) : (
      <div className="flex flex-col gap-3 md:gap-2" role="status" aria-busy="true">
        <span className="sr-only">{t("a11y.loading")}</span>
        <Skeleton className="h-11 w-full rounded-lg md:h-7" />
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-28" />
        </div>
        <div className="flex flex-col gap-3 md:ml-1.5 md:gap-2 md:border-l md:border-border md:pl-4">
          <TimelineEntrySkeleton />
          <TimelineEntrySkeleton />
        </div>
      </div>
    );
  } else if (groups.length === 0) {
    body = isSearching ? (
      isFetchNextPageError ? (
        loadMoreControls
      ) : isLoadingSearch ? (
        <TimelineEntrySkeleton />
      ) : (
        <EmptyState
          icon={IconSearch}
          title={t("featureHighlights.search.noMatches", { query: trimmedQuery })}
          action={
            <Button variant="secondary" onClick={() => onSearchTextChange("")}>
              {t("featureHighlights.search.clear")}
            </Button>
          }
        />
      )
    ) : (
      <EmptyState icon={IconSparkles} title={t("featureHighlights.timeline.empty")} />
    );
  } else {
    body = (
      <div ref={listRef} className="flex flex-col gap-6 md:gap-4">
        {groups.map((group) => {
          const headingId = `whats-new-month-${group.key}`;
          return (
            <section
              key={group.key}
              aria-labelledby={headingId}
              className="flex flex-col gap-3 md:gap-2"
            >
              <h2
                id={headingId}
                className="font-heading text-sm font-semibold text-foreground"
              >
                {monthFormat.format(group.monthStart)}
              </h2>
              <ol className="flex flex-col gap-3 md:ml-1.5 md:gap-2 md:border-l md:border-border md:pl-4">
                {group.highlights.map((highlight) => (
                  <li
                    key={highlight.id}
                    className="md:relative md:before:absolute md:before:top-4 md:before:-left-[1.3125rem] md:before:size-2 md:before:rounded-full md:before:bg-primary md:before:content-['']"
                  >
                    <FeatureHighlightTimelineEntry
                      highlight={highlight}
                      isNew={newOnThisVisit.has(highlight.id)}
                      isEmphasized={emphasizedHighlightId === highlight.id}
                    />
                  </li>
                ))}
              </ol>
            </section>
          );
        })}

        {loadMoreControls}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      {showsSearchField && (
        <FeatureHighlightSearchField
          value={searchText}
          onValueChange={onSearchTextChange}
        />
      )}
      <p
        role="status"
        className={cn("text-xs text-foreground/70", !statusText && "sr-only")}
      >
        {statusText}
      </p>
      {body}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </div>
  );
}
