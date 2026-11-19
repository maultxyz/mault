import { MatchValidationProgress } from "@/components/match-validation-progress";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { MATCH_VALIDATIONS_PATH } from "@/lib/constants/match-validations";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { IconArrowRight, IconCircleCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export function ValidateMatchesPopover() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data: progress } = useQuery(matchValidationProgressQueryOptions);
  const reviewsNeeded = progress
    ? progress.scanCount * MATCH_VALIDATION_REVIEWS_REQUIRED
    : 0;
  const percent =
    progress && reviewsNeeded > 0
      ? Math.min(100, Math.floor((progress.reviewCount / reviewsNeeded) * 100))
      : null;
  const label = t("nav.validateMatches");
  const percentText =
    percent == null ? null : t("matchValidationProgress.percent", { percent });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
            aria-label={percentText ? `${label}, ${percentText}` : label}
          >
            <IconCircleCheck />
            {label}
            {percentText && (
              <span aria-hidden className="tabular-nums text-foreground/70">
                {percentText}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
          <PopoverDescription className="text-foreground/70">
            {t("matchValidationProgress.description")}
          </PopoverDescription>
        </PopoverHeader>
        <MatchValidationProgress />
        <Button
          className="w-full"
          nativeButton={false}
          aria-current={pathname === MATCH_VALIDATIONS_PATH ? "page" : undefined}
          render={<Link to={MATCH_VALIDATIONS_PATH} />}
          onClick={() => setOpen(false)}
        >
          {t("matchValidationProgress.start")}
          <IconArrowRight />
        </Button>
      </PopoverContent>
    </Popover>
  );
}
