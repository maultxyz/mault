import { Progress } from "@/components/ui/progress";
import type { ReviewCountBarProps } from "@/lib/interfaces/match-validations";
import { cn } from "@/lib/utils";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function ReviewCountBar({
  label,
  reviewCount,
  scanCount,
  isTotal = false,
}: ReviewCountBarProps) {
  const { t } = useTranslation("common");
  const reviewsNeeded = scanCount * MATCH_VALIDATION_REVIEWS_REQUIRED;
  const valueText = t("matchValidationProgress.valueText", {
    done: reviewCount,
    total: reviewsNeeded,
  });

  return (
    <div className={cn("flex items-center gap-2 text-xs", isTotal && "font-medium")}>
      <span className="w-24 shrink-0 truncate sm:w-32">{label}</span>
      <Progress
        aria-label={label}
        aria-valuetext={valueText}
        value={reviewCount}
        max={reviewsNeeded}
        className="min-w-0 flex-1"
      />
      <span aria-hidden className="shrink-0 text-right tabular-nums text-foreground/70 sm:w-48">
        {valueText}
      </span>
    </div>
  );
}
