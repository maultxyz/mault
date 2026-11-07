import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { ReviewCountBar } from "@/features/match-validations/components/review-count-bar";
import type { MatchValidationSummaryProps } from "@/lib/interfaces/match-validations";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function MatchValidationSummary({ className }: MatchValidationSummaryProps) {
  const { t } = useTranslation("matchValidations");
  const { data: progress } = useQuery(matchValidationProgressQueryOptions);
  const topValidatorOrgs = progress?.topValidatorOrgs ?? [];

  return (
    <section
      aria-label={t("summary.label")}
      className={cn("flex flex-col gap-2", className)}
    >
      {progress && progress.scanCount > 0 && (
        <div className="flex flex-col gap-1">
          {(progress.games ?? []).map((game) => (
            <ReviewCountBar
              key={game.gameKey}
              label={game.gameName}
              reviewCount={game.reviewCount}
              scanCount={game.scanCount}
            />
          ))}
          <ReviewCountBar
            label={t("summary.total")}
            reviewCount={progress.reviewCount}
            scanCount={progress.scanCount}
            isTotal
          />
        </div>
      )}
      {topValidatorOrgs.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-xs font-medium">{t("summary.topValidatorOrgs")}</h2>
          <ol className="flex flex-col gap-0.5">
            {topValidatorOrgs.map((org, index) => (
              <li key={index} className="flex items-center gap-2 text-xs">
                <span className="w-4 shrink-0 tabular-nums text-foreground/70">
                  {index + 1}.
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {org.name ?? t("summary.anonymousOrg")}
                </span>
                <span className="shrink-0 tabular-nums text-foreground/70">
                  {t("summary.reviewCount", { count: org.reviewCount })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
