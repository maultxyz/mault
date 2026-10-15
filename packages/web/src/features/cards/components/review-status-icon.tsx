import { reviewTooltip } from "@/features/cards/lib/review-tooltip";
import type { ReviewStatusIconProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { IconCheck, IconHelpCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ReviewStatusIcon({
  hasAlternatives = false,
  lowConfidenceMatch = false,
  wasCorrected = false,
  isReviewed = false,
  className,
}: ReviewStatusIconProps) {
  const { t } = useTranslation("cards");
  const flagged = hasAlternatives || lowConfidenceMatch;
  const resolved = wasCorrected || isReviewed;
  if (!flagged && !isReviewed) return null;

  return (
    <span
      className={cn(
        "shrink-0 rounded-full p-0.5",
        resolved
          ? "bg-success-strong ring-2 ring-background"
          : "bg-warning-strong",
        className,
      )}
      title={
        flagged
          ? reviewTooltip(t, lowConfidenceMatch, resolved)
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
