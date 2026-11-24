import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSectionSkeleton } from "@/components/settings-section-skeleton";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { gamesQueryOptions } from "@/features/games/api/games";
import { GameEditor } from "@/features/games/components/game-editor";
import { GAMES_ADMIN_PATH } from "@/lib/constants/games";
import { GAME_FIELD_DEFINITIONS_SKELETON_COLUMNS } from "@/lib/constants/skeletons";
import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

export default function AdminGameEditorPage() {
  const { t } = useTranslation("games");
  const { guid } = useParams();
  const gamesQuery = useQuery(gamesQueryOptions);

  if (!guid) return <GameEditor key="new" game={null} />;

  if (gamesQuery.isLoading) {
    return (
      <SkeletonStatus className="flex flex-col gap-6 md:gap-2">
        <div className="flex flex-col items-start gap-1">
          <Skeleton className="h-10 w-20 rounded-lg md:h-7" />
          <div className="flex h-7 items-center">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex flex-col gap-4 md:gap-2">
          <SettingsSectionSkeleton fields={4} fieldGridClassName="sm:grid-cols-2" />
          <SettingsSectionSkeleton fields={1} hasFieldDescriptions controlClassName="max-w-32" />
          <SettingsSectionSkeleton hasAction>
            <div className="rounded-lg bg-foreground/6 p-3">
              <TableSkeleton columns={GAME_FIELD_DEFINITIONS_SKELETON_COLUMNS} rows={4} />
            </div>
          </SettingsSectionSkeleton>
        </div>
      </SkeletonStatus>
    );
  }

  if (gamesQuery.isError && !gamesQuery.data) {
    return (
      <LoadErrorCallout
        message={t("gameForm.loadFailed")}
        onRetry={() => void gamesQuery.refetch()}
      />
    );
  }

  const game = gamesQuery.data?.find((g) => g.guid === guid);
  if (!game) {
    return (
      <EmptyState
        icon={IconDeviceGamepad2}
        title={t("gameForm.notFound")}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to={GAMES_ADMIN_PATH} />}
          >
            {t("gameForm.back")}
          </Button>
        }
      />
    );
  }

  return <GameEditor key={game.guid} game={game} />;
}
