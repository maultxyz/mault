import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { gameCoverageQueryOptions } from "@/features/games/api/games";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { IconCards } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function GameCoverageList() {
  const { t } = useTranslation("games");
  const { data: coverage = [], isLoading } = useQuery(gameCoverageQueryOptions);

  return (
    <div className="rounded-lg border divide-y overflow-hidden">
      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}

      {!isLoading && coverage.length === 0 && (
        <EmptyState
          icon={<IconCards className="size-10" />}
          title={t("gameCoverage.empty")}
        />
      )}

      {coverage.map((game) => (
        <div key={game.guid} className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{game.name}</p>
              {!game.isActive && (
                <Badge variant="outline">{t("gameCoverage.inactive")}</Badge>
              )}
            </div>
            {game.languages.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {game.languages
                  .map((lang) => LANGUAGE_LABELS[lang] ?? lang)
                  .join(", ")}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold tabular-nums">
              {t("gameCoverage.cardCount", { count: game.cardCount })}
            </p>
            {game.lastUpdated && (
              <p className="text-xs text-muted-foreground">
                {t("gameCoverage.lastUpdated", {
                  date: new Date(game.lastUpdated).toLocaleDateString(),
                })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
