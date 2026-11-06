import { EmptyState } from "@/components/empty-state";
import { HotkeyHint } from "@/components/hotkey-hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OcrRegionCrops } from "@/features/cards/components/ocr-region-crops";
import { OcrRegionOverlay } from "@/features/cards/components/ocr-region-overlay";
import {
  padFixedOcrRegions,
  toOcrOverlayRegions,
} from "@/features/cards/lib/ocr-read-regions";
import {
  MATCH_VALIDATION_SCANS_QUERY_KEY,
  matchValidationProgressQueryOptions,
  matchValidationQueueQueryOptions,
  saveMatchValidation,
} from "@/features/match-validations/api/match-validations";
import { ReviewProgress } from "@/features/match-validations/components/review-progress";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useLabelQueue } from "@/hooks/use-label-queue";
import {
  IconArrowLeft,
  IconCircleCheck,
  IconCircleX,
  IconPhotoOff,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import {
  OCR_REGIONS_BY_GAME_KEY,
  type MatchValidationVerdict,
} from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function MatchValidationQueue() {
  const { t, i18n } = useTranslation("matchValidations");
  const queryClient = useQueryClient();
  const queueQuery = useQuery(matchValidationQueueQueryOptions);
  const { refetch: refetchQueue, isFetching: isFetchingQueue } = queueQuery;
  const {
    current,
    revisiting,
    history,
    decide,
    skip,
    goBack,
    canGoBack,
    isLoadingMore,
  } = useLabelQueue({
    items: queueQuery.data?.items,
    isFetchingQueue,
    queueFetchedAt: queueQuery.dataUpdatedAt,
    refetchQueue,
    saveLabel: async (item, verdict: MatchValidationVerdict) => {
      const result = await saveMatchValidation({ scanId: item.scanId, verdict });
      if (result.success) {
        void queryClient.invalidateQueries({
          queryKey: matchValidationProgressQueryOptions.queryKey,
        });
        void queryClient.invalidateQueries({
          queryKey: MATCH_VALIDATION_SCANS_QUERY_KEY,
        });
      }
      return result;
    },
    saveErrorMessage: t("toasts.saveError"),
  });

  const sessionCountOf = (verdict: MatchValidationVerdict) =>
    history.filter((entry) => entry.decision === verdict).length;

  useHotkeys({
    matchValidationCorrect: () => decide("correct"),
    matchValidationIncorrect: () => decide("incorrect"),
    matchValidationBadScan: () => decide("badScan"),
    matchValidationSkip: skip,
    matchValidationBack: goBack,
  });

  const counts = queueQuery.data?.counts;
  const cardName = current?.cardName ?? t("unknownCard");
  const gameOcrRegions = OCR_REGIONS_BY_GAME_KEY[current?.gameKey ?? ""] ?? [];
  const fixedOcrRegions = padFixedOcrRegions(gameOcrRegions);
  const scanOcrRegions = current?.ocrRegions?.length
    ? toOcrOverlayRegions(current.ocrRegions, gameOcrRegions)
    : fixedOcrRegions;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/70">
        {counts && (
          <span>
            {t("counts", {
              yours: counts.validatedByYou,
              community: counts.validatedByCommunity,
            })}
          </span>
        )}
        <span>
          {t("sessionCounts", {
            correct: sessionCountOf("correct"),
            incorrect: sessionCountOf("incorrect"),
            badScan: sessionCountOf("badScan"),
          })}
        </span>
      </div>

      {queueQuery.isPending || isLoadingMore ? (
        <div className="grid w-full grid-cols-2 gap-3 md:max-w-xl">
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
        </div>
      ) : !current ? (
        <EmptyState
          icon={IconCircleCheck}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <div className="flex gap-1.5">
              {history.length > 0 && (
                <Button variant="outline" onClick={goBack}>
                  <IconArrowLeft />
                  {t("actions.back")}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={isFetchingQueue}
                onClick={() => void refetchQueue()}
              >
                {t("actions.refresh")}
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="grid w-full grid-cols-2 gap-3 md:max-w-xl">
              <figure className="flex min-w-0 flex-col gap-1.5">
                <figcaption className="text-xs text-foreground/70">
                  {t("scanPhoto")}
                </figcaption>
                <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg ring-1 ring-border">
                  {current.capturedImageUrl && (
                    <img
                      key={current.scanId}
                      src={current.capturedImageUrl}
                      alt={t("scanPhotoAlt", { name: cardName })}
                      className="h-full w-full object-fill"
                    />
                  )}
                  <OcrRegionOverlay regions={scanOcrRegions} />
                </div>
                {current.capturedImageUrl && (
                  <OcrRegionCrops
                    src={current.capturedImageUrl}
                    regions={scanOcrRegions}
                    className="mt-1.5"
                  />
                )}
              </figure>
              <figure className="flex min-w-0 flex-col gap-1.5">
                <figcaption className="text-xs text-foreground/70">
                  {t("matchedCard")}
                </figcaption>
                <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-lg ring-1 ring-border">
                  {current.catalogImageUrl && (
                    <img
                      key={current.scanId}
                      src={current.catalogImageUrl}
                      alt={t("matchedCardAlt", { name: cardName })}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <OcrRegionOverlay regions={fixedOcrRegions} />
                </div>
                {current.catalogImageUrl && (
                  <OcrRegionCrops
                    src={current.catalogImageUrl}
                    regions={fixedOcrRegions}
                    className="mt-1.5"
                  />
                )}
              </figure>
            </div>
            <div className="flex flex-col gap-3">
              <dl aria-live="polite" className="flex flex-col gap-1 text-xs">
                <dt className="text-sm font-medium">{cardName}</dt>
                <dd className="text-foreground/70">
                  {[current.setName ?? current.setCode, current.collectorNumber]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
                {current.matchedBy && (
                  <dd className="text-foreground/70">
                    {t(
                      current.matchedBy === "ocr"
                        ? "matchedByOcr"
                        : "matchedByEmbedding",
                    )}
                  </dd>
                )}
                <dd className="text-foreground/70">
                  {t("scannedAt", {
                    date: new Date(current.scannedAt).toLocaleString(
                      i18n.language,
                    ),
                  })}
                </dd>
              </dl>
              <ReviewProgress reviewCount={current.reviewCount} />
              <div className="flex flex-wrap gap-1.5">
                {current.lowConfidenceMatch && (
                  <Badge variant="outline">{t("lowConfidence")}</Badge>
                )}
                {revisiting && (
                  <Badge variant="outline">
                    {t(`decisions.${revisiting.decision}`)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button onClick={() => decide("correct")}>
              <IconCircleCheck />
              {t("actions.correct")}
              <HotkeyHint id="matchValidationCorrect" />
            </Button>
            <Button variant="outline" onClick={() => decide("incorrect")}>
              <IconCircleX />
              {t("actions.incorrect")}
              <HotkeyHint id="matchValidationIncorrect" />
            </Button>
            <Button variant="outline" onClick={() => decide("badScan")}>
              <IconPhotoOff />
              {t("actions.badScan")}
              <HotkeyHint id="matchValidationBadScan" />
            </Button>
            <Button variant="ghost" onClick={skip}>
              <IconPlayerSkipForward />
              {t("actions.skip")}
              <HotkeyHint id="matchValidationSkip" />
            </Button>
            <Button variant="ghost" disabled={!canGoBack} onClick={goBack}>
              <IconArrowLeft />
              {t("actions.back")}
              <HotkeyHint id="matchValidationBack" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
