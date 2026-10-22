import { EmptyState } from "@/components/empty-state";
import { HotkeyHint } from "@/components/hotkey-hint";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSearchPicker } from "@/features/cards/components/card-search-picker";
import { unmatchedCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { invalidateUnmatchedCards } from "@/features/collections/lib/card-page-cache";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { UnmatchedCardImage } from "@/features/scanner/components/unmatched-card-image";
import { UnmatchedDiagnosticsDetails } from "@/features/scanner/components/unmatched-diagnostics-details";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { HOTKEY_PRIORITY_OVERRIDE } from "@/lib/constants/hotkeys";
import type { UnmatchedCardDetailProps } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { UNMATCHED_PAGE_SIZE, type PlayingCard } from "@magic-vault/shared";
import {
  IconChecks,
  IconChevronDown,
  IconChevronUp,
  IconPlayerSkipForward,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardDetail({
  collectionGuid,
  index,
  onIndexChange,
  onClose,
  canIdentify,
  onRemove,
}: UnmatchedCardDetailProps) {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const { identifyUnmatchedCard } = useScannedCards();
  const [isBusy, setIsBusy] = useState(false);
  const page = Math.floor(index / UNMATCHED_PAGE_SIZE) + 1;
  const { data, isPlaceholderData } = useQuery(
    unmatchedCardsPageQueryOptions(collectionGuid, page),
  );
  const isCurrent = !!data && !isPlaceholderData;
  const total = data?.total ?? 0;
  const entry = isCurrent
    ? (data.cards[index % UNMATCHED_PAGE_SIZE] ?? null)
    : null;
  const isDone = isCurrent && index >= total;
  const hasPrev = index > 0 && total > 0;
  const hasNext = !!entry && index + 1 < total;

  const goPrev = () => onIndexChange(Math.min(index, total) - 1);
  const goNext = () => onIndexChange(index + 1);

  const handleIdentify = async (card: PlayingCard) => {
    if (!entry || isBusy) return;
    setIsBusy(true);
    const added = await identifyUnmatchedCard(entry.scanId, card);
    if (added) {
      toast.success(t("unmatchedCardsPanel.identified", { name: card.name }));
      await invalidateUnmatchedCards(queryClient, collectionGuid);
    } else {
      toast.error(t("unmatchedCardsPanel.identifyFailed"));
    }
    setIsBusy(false);
  };

  const handleRemove = async () => {
    if (!entry || !onRemove || isBusy) return;
    setIsBusy(true);
    const removed = await onRemove(entry.scanId);
    if (!removed) toast.error(t("unmatchedCardsPanel.removeFailed"));
    await invalidateUnmatchedCards(queryClient, collectionGuid);
    setIsBusy(false);
  };

  useHotkeys(
    {
      cardPrevious: hasPrev ? goPrev : undefined,
      cardNext: hasNext ? goNext : undefined,
      reviewAccept: hasNext ? goNext : undefined,
      cardRemove: entry && onRemove ? () => void handleRemove() : undefined,
      cardClose: onClose,
    },
    !isBusy,
    HOTKEY_PRIORITY_OVERRIDE,
  );

  const nearestName =
    entry?.diagnostics?.search?.candidates[0]?.name ?? undefined;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/80 p-2 backdrop-blur-2xl">
        <ButtonGroup className="shrink-0">
          <Button
            size="icon"
            variant="outline"
            onClick={goPrev}
            disabled={!hasPrev || isBusy}
            aria-label={t("unmatchedCardsPanel.previous")}
          >
            <IconChevronUp />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={goNext}
            disabled={!hasNext || isBusy}
            aria-label={t("unmatchedCardsPanel.next")}
          >
            <IconChevronDown />
          </Button>
        </ButtonGroup>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={onClose}
          aria-label={t("unmatchedCardsPanel.backToGrid")}
          title={t("unmatchedCardsPanel.backToGrid")}
        >
          <IconX />
        </Button>
      </div>

      <div className="@container flex flex-1 flex-col gap-6 p-6">
        {isDone ? (
          <EmptyState
            icon={IconChecks}
            title={t("unmatchedCardsPanel.reviewDone")}
            description={t("unmatchedCardsPanel.reviewDoneDescription")}
            action={
              <Button variant="outline" onClick={onClose}>
                {t("unmatchedCardsPanel.backToGrid")}
              </Button>
            }
            className="flex-1"
          />
        ) : !entry ? (
          <div className="flex flex-col gap-6 @2xl:flex-row">
            <Skeleton className="aspect-[2.5/3.5] w-48 rounded-lg @2xl:w-56" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-40 w-full rounded-md" />
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="truncate text-base font-semibold">
                  {entry.diagnostics
                    ? t(`unmatchedCardsPanel.reasons.${entry.diagnostics.reason}`)
                    : t("unmatchedCardsPanel.imageAlt")}
                </h2>
                <span className="shrink-0 text-xs text-foreground/70">
                  {index + 1} / {total}
                </span>
              </div>
              <p className="truncate text-sm text-foreground/70">
                {[
                  entry.binNumber != null
                    ? t("mobileMonitor.bin", { number: entry.binNumber })
                    : null,
                  new Date(entry.scannedAt).toLocaleString(),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <div className="flex flex-col gap-6 @2xl:flex-row">
              <div className="flex w-full flex-none flex-col gap-3 @2xl:w-64">
                <UnmatchedCardImage
                  entry={entry}
                  className="w-48 rounded-lg @2xl:w-full"
                />
                {entry.diagnostics ? (
                  <UnmatchedDiagnosticsDetails
                    diagnostics={entry.diagnostics}
                    className="w-full px-0"
                  />
                ) : (
                  !entry.capturedImageUrl && (
                    <p className="text-sm text-foreground/70">
                      {t("unmatchedCardsPanel.noImage")}
                    </p>
                  )
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <p className="text-sm text-foreground/70">
                  {canIdentify
                    ? t("unmatchedCardsPanel.reviewIdentifyHint")
                    : t("unmatchedCardsPanel.reviewReadOnlyHint")}
                </p>
                {canIdentify && (
                  <CardSearchPicker
                    key={entry.scanId}
                    collectionGuid={collectionGuid}
                    initialQuery={nearestName}
                    disabled={isBusy}
                    onSelect={(card) => void handleIdentify(card)}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {entry && (
        <div className="sticky bottom-0 z-10 shrink-0 border-t bg-background/80 p-2 backdrop-blur-2xl">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button disabled={!hasNext || isBusy} onClick={goNext}>
              <IconPlayerSkipForward className="size-4" />
              {t("unmatchedCardsPanel.skip")}
              <HotkeyHint id="reviewAccept" />
            </Button>
            {onRemove && (
              <Button
                variant="destructive"
                disabled={isBusy}
                onClick={() => void handleRemove()}
              >
                <IconTrash className="size-4" />
                {t("unmatchedCardsPanel.remove")}
                <HotkeyHint id="cardRemove" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
