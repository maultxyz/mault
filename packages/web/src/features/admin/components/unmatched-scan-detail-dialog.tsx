import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { adminUnmatchedDiagnosticsQueryOptions } from "@/features/admin/api/unmatched-retry";
import { UnmatchedOcrOverlay } from "@/features/admin/components/unmatched-ocr-overlay";
import { UnmatchedOcrPanel } from "@/features/admin/components/unmatched-ocr-panel";
import { UnmatchedRetryResult } from "@/features/admin/components/unmatched-retry-result";
import { formatMatchDistance } from "@/features/admin/lib/format-match-distance";
import { UnmatchedDiagnosticsDetails } from "@/features/scanner/components/unmatched-diagnostics-details";
import type { UnmatchedScanDetailDialogProps } from "@/lib/interfaces/admin";
import { DISTANCE_THRESHOLD } from "@magic-vault/shared";
import {
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconPhotoOff,
  IconPhotoX,
  IconRefresh,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function UnmatchedScanDetailDialog({
  scan,
  result,
  isRetrying,
  onRetry,
  isBadPhoto,
  onToggleBadPhoto,
  ocrResult,
  isRunningOcr,
  onRunOcr,
  onPrevious,
  onNext,
  onClose,
}: UnmatchedScanDetailDialogProps) {
  const { t, i18n } = useTranslation("admin");
  const diagnostics = useQuery(
    adminUnmatchedDiagnosticsQueryOptions(scan?.scanId),
  );
  const matchedCard = result?.status === "match" ? result.card : null;
  const matchedImage = matchedCard?.image?.normal ?? matchedCard?.image?.small;

  return (
    <DynamicDialog
      open={!!scan}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("unmatchedRetry.detail.title")}
      description={
        scan
          ? [
              scan.collectionName,
              scan.orgName ?? t("unmatchedRetry.unknownOrg"),
              new Date(scan.scannedAt).toLocaleString(i18n.language, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            ].join(" · ")
          : undefined
      }
      className="max-h-[90dvh] sm:max-w-3xl data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
      footer={
        scan && (
          <>
            <Button
              variant="outline"
              onClick={() => onPrevious?.()}
              disabled={!onPrevious}
            >
              <IconChevronLeft />
              {t("unmatchedRetry.detail.previous")}
            </Button>
            <Button
              variant={isBadPhoto ? "destructive" : "outline"}
              aria-pressed={isBadPhoto}
              onClick={() => onToggleBadPhoto(scan.scanId)}
            >
              <IconPhotoX />
              {isBadPhoto
                ? t("unmatchedRetry.unmarkBadPhoto")
                : t("unmatchedRetry.markBadPhoto")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onNext?.()}
              disabled={!onNext}
            >
              {t("unmatchedRetry.detail.next")}
              <IconChevronRight />
            </Button>
          </>
        )
      }
      footerClassName="flex-row justify-between"
    >
      {scan && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 max-md:max-h-[60dvh]">
          <div className="grid grid-cols-2 gap-3">
            <figure className="flex flex-col gap-1.5">
              <figcaption className="text-xs font-medium text-foreground/70">
                {t("unmatchedRetry.detail.scannedPhoto")}
              </figcaption>
              <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border bg-muted">
                {scan.capturedImageUrl ? (
                  <>
                    <a
                      href={scan.capturedImageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={scan.capturedImageUrl}
                        alt={t("unmatchedRetry.imageAlt")}
                        className="h-full w-full object-fill"
                      />
                    </a>
                    <UnmatchedOcrOverlay result={ocrResult} />
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <IconPhotoOff className="size-5 text-foreground/70" />
                  </div>
                )}
              </div>
            </figure>
            <figure className="flex flex-col gap-1.5">
              <figcaption className="truncate text-xs font-medium text-foreground/70">
                {matchedCard
                  ? t("unmatchedRetry.detail.matchedCard", {
                      name: matchedCard.name,
                    })
                  : t("unmatchedRetry.detail.matchedCardEmpty")}
              </figcaption>
              <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border bg-muted">
                {matchedImage ? (
                  <img
                    src={matchedImage}
                    alt={matchedCard?.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-foreground/70">
                    {result
                      ? t(`unmatchedRetry.statuses.${result.status}`)
                      : t("unmatchedRetry.detail.compareHint")}
                  </div>
                )}
              </div>
            </figure>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                {t("unmatchedRetry.detail.atScanTime")}
              </h3>
              {diagnostics.isPending ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : diagnostics.data ? (
                <div className="rounded-lg border p-1">
                  <UnmatchedDiagnosticsDetails diagnostics={diagnostics.data} />
                </div>
              ) : (
                <p className="text-xs text-foreground/70">
                  {t("unmatchedRetry.detail.noDiagnostics")}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {t("unmatchedRetry.detail.retryResult")}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRetry(scan.scanId)}
                  disabled={isRetrying || !scan.hasEmbedding}
                >
                  {isRetrying ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconRefresh />
                  )}
                  {t("unmatchedRetry.retry")}
                </Button>
              </div>
              {result ? (
                <>
                  <UnmatchedRetryResult result={result} />
                  {result.candidates.length > 0 && (
                    <div className="flex flex-col gap-1 text-xs">
                      <p className="font-medium">
                        {t("unmatchedRetry.detail.candidates", {
                          threshold: formatMatchDistance(DISTANCE_THRESHOLD),
                        })}
                      </p>
                      <ul className="divide-y rounded-md border">
                        {result.candidates.map((candidate) => (
                          <li
                            key={candidate.cardId}
                            className="flex justify-between gap-2 px-2 py-1"
                          >
                            <span className="truncate">
                              {candidate.setCode
                                ? `${candidate.name} (${candidate.setCode.toUpperCase()})`
                                : candidate.name}
                            </span>
                            <span className="tabular-nums text-foreground/70">
                              {formatMatchDistance(candidate.distance)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-foreground/70">
                  {scan.hasEmbedding
                    ? t("unmatchedRetry.notRetried")
                    : t("unmatchedRetry.statuses.no_embedding")}
                </p>
              )}
            </section>
          </div>

          <UnmatchedOcrPanel
            result={ocrResult}
            isRunning={isRunningOcr}
            canRun={scan.hasEmbedding && !!scan.capturedImageUrl}
            onRun={() => onRunOcr(scan.scanId)}
          />

          <p className="text-2xs text-foreground/70">
            {t("unmatchedRetry.detail.scanId", { id: scan.scanId })}
          </p>
        </div>
      )}
    </DynamicDialog>
  );
}
