import { reviewTooltip } from "@/features/cards/lib/review-tooltip";
import type { ReviewStatusIconProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { IconCheck, IconHelpCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ReviewStatusIcon({
  hasAlternatives = false,
  needsReview = false,
  wasCorrected = false,
  isReviewed = false,
  className,
}: ReviewStatusIconProps) {
  const { t } = useTranslation("cards");
  const flagged = hasAlternatives || needsReview;
  const resolved = wasCorrected || isReviewed;
  if (!flagged && !isReviewed) return null;

  return (
    <span
      className={cn(
        "shrink-0 rounded-full p-0.5",
        resolved ? "bg-success-strong" : "bg-warning-strong",
        className,
      )}
      title={
        flagged
          ? reviewTooltip(t, needsReview, resolved)
          : t("scannedCardItem.reviewedTooltip")
      }
    >
      {flagged ? (
        <IconHelpCircle className="size-3 text-white" />
      ) : (
        <IconCheck className="size-3 text-white" />
      )}
    </span>
  );
}
