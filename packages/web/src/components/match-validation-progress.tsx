import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import type { MatchValidationProgressProps } from "@/lib/interfaces/match-validations";
import { cn } from "@/lib/utils";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function MatchValidationProgress({
  className,
}: MatchValidationProgressProps) {
  const { t } = useTranslation("common");
  const { data: progress } = useQuery(matchValidationProgressQueryOptions);
  if (!progress || progress.scanCount === 0) return null;

  const reviewsNeeded = progress.scanCount * MATCH_VALIDATION_REVIEWS_REQUIRED;
  const percent = Math.floor((progress.reviewCount / reviewsNeeded) * 100);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        role="progressbar"
        aria-label={t("matchValidationProgress.label")}
        aria-valuemin={0}
        aria-valuemax={reviewsNeeded}
        aria-valuenow={progress.reviewCount}
        aria-valuetext={t("matchValidationProgress.valueText", {
          done: progress.reviewCount,
          total: reviewsNeeded,
        })}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/15"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span aria-hidden className="shrink-0 text-xs tabular-nums text-foreground/70">
        {t("matchValidationProgress.percent", { percent })}
      </span>
    </div>
  );
}
