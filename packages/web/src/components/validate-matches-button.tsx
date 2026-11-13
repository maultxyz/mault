import { Button } from "@/components/ui/button";
import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { MATCH_VALIDATIONS_PATH } from "@/lib/constants/match-validations";
import type { ValidateMatchesButtonProps } from "@/lib/interfaces/match-validations";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { IconCircleCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export function ValidateMatchesButton({ iconOnly }: ValidateMatchesButtonProps) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const { data: progress } = useQuery({
    ...matchValidationProgressQueryOptions,
    enabled: !!iconOnly,
  });
  const isCurrentPage = pathname === MATCH_VALIDATIONS_PATH;
  const label = t("nav.validateMatches");
  const reviewsNeeded = progress
    ? progress.scanCount * MATCH_VALIDATION_REVIEWS_REQUIRED
    : 0;
  const percent =
    iconOnly && progress && reviewsNeeded > 0
      ? Math.min(100, Math.floor((progress.reviewCount / reviewsNeeded) * 100))
      : null;
  const iconOnlyLabel =
    percent == null
      ? label
      : `${label}, ${t("matchValidationProgress.percent", { percent })}`;

  return (
    <Button
      variant="outline-selected"
      size={iconOnly ? "icon-lg" : "default"}
      aria-label={iconOnly ? iconOnlyLabel : undefined}
      aria-current={isCurrentPage ? "page" : undefined}
      nativeButton={false}
      render={<Link to={MATCH_VALIDATIONS_PATH} />}
    >
      {percent == null ? (
        <IconCircleCheck />
      ) : (
        <span className="flex flex-col items-center gap-0.5">
          <IconCircleCheck />
          <span
            aria-hidden
            className="h-0.5 w-4 overflow-hidden rounded-full bg-foreground/15"
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </span>
        </span>
      )}
      {!iconOnly && label}
    </Button>
  );
}
