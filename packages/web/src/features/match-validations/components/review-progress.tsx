import type { ReviewProgressProps } from "@/lib/interfaces/match-validations";
import { cn } from "@/lib/utils";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ReviewProgress({ reviewCount }: ReviewProgressProps) {
  const { t } = useTranslation("matchValidations");

  return (
    <div className="flex items-center gap-1.5 text-xs text-foreground/70">
      <span aria-hidden className="flex items-center gap-0.5">
        {Array.from({ length: MATCH_VALIDATION_REVIEWS_REQUIRED }, (_, index) => {
          const isReviewed = index < reviewCount;
          const Icon = isReviewed ? IconCircleCheckFilled : IconCircle;
          return (
            <Icon
              key={index}
              className={cn(
                "size-4",
                isReviewed ? "text-success-foreground" : "text-foreground/70",
              )}
            />
          );
        })}
      </span>
      {t("reviewProgress", {
        count: reviewCount,
        required: MATCH_VALIDATION_REVIEWS_REQUIRED,
      })}
    </div>
  );
}
