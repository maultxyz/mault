import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";
import { gamesQueryOptions } from "@/features/games/api/games";
import { GameEditor } from "@/features/games/components/game-editor";
import { GAMES_ADMIN_PATH } from "@/lib/constants/games";
import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

export default function AdminGameEditorPage() {
  const { t } = useTranslation("games");
  const { guid } = useParams();
  const gamesQuery = useQuery(gamesQueryOptions);

  if (!guid) return <GameEditor key="new" game={null} />;

  if (gamesQuery.isLoading) return <ListSkeleton rows={8} />;

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
