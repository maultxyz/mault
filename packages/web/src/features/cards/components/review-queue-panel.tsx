import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviewQueueCards } from "@/features/cards/api/use-review-queue";
import { CARD_REVIEW_SEARCH_PARAM } from "@/lib/constants/cards";
import type {
  ReviewQueuePanelProps,
  ReviewQueueRowProps,
} from "@/lib/interfaces/cards";
import { sidebarItemClassName } from "@/lib/sidebar-item";
import { cn } from "@/lib/utils";
import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function ReviewQueueRow({
  entry,
  isCurrent,
  isReviewed,
  isRemoved,
  onOpen,
}: ReviewQueueRowProps) {
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isCurrent) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [isCurrent]);

  return (
    <button
      ref={rowRef}
      type="button"
      disabled={isRemoved}
      aria-current={isCurrent || undefined}
      onClick={onOpen}
      className={cn(
        sidebarItemClassName({ isActive: isCurrent }),
        "h-auto w-full justify-start gap-2 px-1.5 py-1 text-left",
      )}
    >
      {isRemoved ? (
        <IconTrash className="size-4 shrink-0 text-foreground/70" />
      ) : isReviewed ? (
        <IconCircleCheckFilled className="size-4 shrink-0 text-success" />
      ) : (
        <IconCircleDashed className="size-4 shrink-0 text-foreground/70" />
      )}
      <div className="aspect-[2.5/3.5] w-7 shrink-0 overflow-hidden rounded-sm bg-muted">
        {entry.card.image?.small && (
          <img
            src={entry.card.image.small}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-control font-medium",
            (isReviewed || isRemoved) && "text-foreground/70",
            isRemoved && "line-through",
          )}
        >
          {entry.card.name}
        </span>
        <span className="truncate text-xs uppercase text-foreground/70 tabular-nums">
          {entry.card.set} #{entry.card.collectorNumber}
        </span>
      </div>
    </button>
  );
}

export function ReviewQueuePanel({ session }: ReviewQueuePanelProps) {
  const { t } = useTranslation("cards");
  const navigate = useNavigate();
  const { data, isPending, isError } = useReviewQueueCards(session);
  const cards = data?.cards ?? [];
  const checkedCount = cards.filter(
    (entry) =>
      session.reviewedScanIds.has(entry.scanId) ||
      session.removedScanIds.has(entry.scanId),
  ).length;
  const notShownCount = Math.max(0, (data?.totalCards ?? 0) - cards.length);

  const openCard = (scanId: string) =>
    navigate(`/app/cards/${scanId}?${CARD_REVIEW_SEARCH_PARAM}=1`, {
      replace: true,
    });

  return (
    <div className="flex size-full flex-col bg-sidebar">
      <div className="flex shrink-0 items-start gap-2 border-b p-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {t("reviewQueue.title")}
          </h2>
          <p className="text-xs tabular-nums text-foreground/70">
            {isPending
              ? " "
              : t("reviewQueue.progress", {
                  checked: checkedCount,
                  total: cards.length,
                })}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate("/app", { replace: true })}
          aria-label={t("reviewQueue.exit")}
          title={t("reviewQueue.exit")}
        >
          <IconX />
        </Button>
      </div>
      {cards.length > 0 && (
        <div className="h-1 w-full shrink-0 bg-muted">
          <div
            className="h-full bg-success transition-[width] motion-reduce:transition-none"
            style={{ width: `${(checkedCount / cards.length) * 100}%` }}
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isError ? (
          <Callout variant="error">{t("reviewQueue.loadFailed")}</Callout>
        ) : isPending ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {cards.map((entry) => (
              <ReviewQueueRow
                key={entry.scanId}
                entry={entry}
                isCurrent={entry.scanId === session.currentScanId}
                isReviewed={session.reviewedScanIds.has(entry.scanId)}
                isRemoved={session.removedScanIds.has(entry.scanId)}
                onOpen={() => openCard(entry.scanId)}
              />
            ))}
            {notShownCount > 0 && (
              <p className="px-1.5 py-2 text-xs text-foreground/70">
                {t("reviewQueue.notShown", { count: notShownCount })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
