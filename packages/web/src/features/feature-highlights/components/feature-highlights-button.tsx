import { useSecondaryRequestsEnabled } from "@/lib/initial-load-context";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  featureHighlightTimelineQueryOptions,
  unseenFeatureHighlightsQueryOptions,
} from "@/features/feature-highlights/api/feature-highlights";
import { useMarkFeatureHighlightsSeen } from "@/features/feature-highlights/api/use-mark-feature-highlights-seen";
import { FeatureHighlightCompactEntry } from "@/features/feature-highlights/components/feature-highlight-compact-entry";
import { useImpersonation } from "@/hooks/use-impersonation";
import { useAuthSession } from "@/lib/auth";
import {
  FEATURE_HIGHLIGHTS_POPOVER_CLASS,
  FEATURE_HIGHLIGHTS_POPOVER_LIMIT,
  WHATS_NEW_PATH,
} from "@/lib/constants/feature-highlights";
import { IconSparkles } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function FeatureHighlightsButton() {
  const { t } = useTranslation("common");
  const headingId = useId();
  const { data: authSession } = useAuthSession();
  const userId = authSession?.user?.id ?? null;
  const { isImpersonating } = useImpersonation();
  const [isOpen, setIsOpen] = useState(false);
  const [newWhileOpen, setNewWhileOpen] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const { mutate: markSeen } = useMarkFeatureHighlightsSeen();

  const areSecondaryRequestsEnabled = useSecondaryRequestsEnabled();
  const unseenQuery = useQuery(
    unseenFeatureHighlightsQueryOptions(
      isImpersonating || !areSecondaryRequestsEnabled ? null : userId,
    ),
  );
  const unseenCount = unseenQuery.data?.highlights.length ?? 0;
  const timelineQueryOptions = featureHighlightTimelineQueryOptions(userId);
  const timelineQuery = useInfiniteQuery({
    ...timelineQueryOptions,
    enabled: !!userId && isOpen,
  });
  const firstPage = timelineQuery.data?.pages[0];
  const highlights = useMemo(
    () => firstPage?.highlights.slice(0, FEATURE_HIGHLIGHTS_POPOVER_LIMIT) ?? [],
    [firstPage],
  );
  const unseenShownIds = useMemo(() => {
    const seenIds = new Set(firstPage?.seenHighlightIds ?? []);
    return highlights
      .map((highlight) => highlight.id)
      .filter((highlightId) => !seenIds.has(highlightId));
  }, [firstPage, highlights]);

  useEffect(() => {
    if (!isOpen || unseenShownIds.length === 0) return;
    setNewWhileOpen((current) => new Set([...current, ...unseenShownIds]));
    if (!isImpersonating) markSeen(unseenShownIds);
  }, [isOpen, unseenShownIds, isImpersonating, markSeen]);

  const changeOpen = (nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    if (!nextIsOpen) setNewWhileOpen(new Set());
  };

  const content = !timelineQuery.data ? (
    timelineQuery.isError ? (
      <LoadErrorCallout
        message={t("featureHighlights.timeline.loadFailed")}
        onRetry={() => void timelineQuery.refetch()}
      />
    ) : (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="sr-only">{t("a11y.loading")}</span>
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    )
  ) : highlights.length === 0 ? (
    <EmptyState
      size="compact"
      icon={IconSparkles}
      title={t("featureHighlights.timeline.empty")}
    />
  ) : (
    <div className="flex flex-col gap-2">
      {highlights.map((highlight) => (
        <FeatureHighlightCompactEntry
          key={highlight.id}
          highlight={highlight}
          isNew={
            newWhileOpen.has(highlight.id) ||
            unseenShownIds.includes(highlight.id)
          }
        />
      ))}
    </div>
  );

  return (
    <DynamicPopover
      open={isOpen}
      onOpenChange={changeOpen}
      side="bottom"
      align="end"
      contentClassName={FEATURE_HIGHLIGHTS_POPOVER_CLASS}
      trigger={
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={
            unseenCount > 0
              ? t("featureHighlights.triggerWithCount", { count: unseenCount })
              : t("featureHighlights.title")
          }
          className="relative"
        >
          <IconSparkles />
          {unseenCount > 0 && (
            <span
              aria-hidden
              className="absolute top-0 right-0 h-3.5 min-w-3.5 rounded-full bg-destructive px-0.5 text-2xs leading-3.5 font-semibold text-destructive-foreground ring-2 ring-sidebar"
            >
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </Button>
      }
    >
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2
          id={headingId}
          className="px-1 font-heading text-sm font-semibold text-foreground"
        >
          {t("featureHighlights.title")}
        </h2>
        {content}
        <Button
          variant="secondary"
          className="w-full"
          nativeButton={false}
          render={<Link to={WHATS_NEW_PATH} />}
          onClick={() => changeOpen(false)}
        >
          {t("featureHighlights.seeAll")}
        </Button>
      </section>
    </DynamicPopover>
  );
}
