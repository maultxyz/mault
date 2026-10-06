import { SettingsSection } from "@/components/settings-section";
import { DeleteDialog } from "@/components/delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { deleteGame, gamesQueryOptions } from "@/features/games/api/games";
import type { Game } from "@magic-vault/shared";
import {
  buildGamesExport,
  downloadGamesExport,
} from "@/features/games/lib/games-export";
import {
  IconDownload,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import { GAMES_ADMIN_PATH, NEW_GAME_PATH } from "@/lib/constants/games";
import { Link } from "react-router-dom";
import { GamesTransferMenu } from "./games-transfer-menu";

export function GamesManager() {
  const { t } = useTranslation("games");
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);

  const gamesQuery = useQuery(gamesQueryOptions);

  function setGames(games: Game[]) {
    queryClient.setQueryData(gamesQueryOptions.queryKey, games);
  }

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => deleteGame(guid),
    onSuccess: (r, guid) => {
      if (!r.success) {
        toast.error(r.message || t("gamesManager.toasts.deleteError"));
        return;
      }
      setGames((gamesQuery.data ?? []).filter((g) => g.guid !== guid));
      queryClient.invalidateQueries({
        queryKey: collectionsQueryOptions.queryKey,
      });
      toast.success(t("gamesManager.toasts.deleteSuccess"));
    },
    onError: () => toast.error(t("gamesManager.toasts.deleteError")),
  });

  return (
    <SettingsSection
      heading={t("gamesManager.heading")}
      description={t("gamesManager.description")}
      action={
        <div className="flex items-center gap-2">
          <GamesTransferMenu games={gamesQuery.data ?? []} />
          <Button nativeButton={false} render={<Link to={NEW_GAME_PATH} />}>
            <IconPlus size={14} />
            {t("addGame")}
          </Button>
        </div>
      }
    >
      <div className="divide-y rounded-lg border empty:hidden">
        {gamesQuery.isLoading && (
          <p className="text-sm text-foreground/70 text-center py-6">
            {t("gamesManager.loading")}
          </p>
        )}
        {gamesQuery.data?.map((game) => (
          <div key={game.guid} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{game.name}</p>
                <Badge variant={game.isActive ? "success" : "outline"}>
                  {game.isActive ? t("active") : t("inactive")}
                </Badge>
              </div>
              <p className="text-xs text-foreground/70 truncate">
                {game.key} ·{" "}
                {t("gamesManager.fieldCount", {
                  count: game.fieldDefinitions.length,
                })}
              </p>
            </div>
            <ButtonGroup>
              <Button
                size="icon"
                variant="outline"
                onClick={() =>
                  downloadGamesExport(buildGamesExport([game]), game.key)
                }
                title={t("gamesManager.exportTitle")}
              >
                <IconDownload size={14} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                nativeButton={false}
                render={<Link to={`${GAMES_ADMIN_PATH}/${game.guid}`} />}
                title={t("gamesManager.editTitle")}
              >
                <IconPencil size={14} />
              </Button>
              <Button
                size="icon"
                variant="outline-destructive"
                onClick={() => setDeleteTarget(game)}
                title={t("gamesManager.deleteTitle")}
              >
                <IconTrash size={14} />
              </Button>
            </ButtonGroup>
          </div>
        ))}
        {gamesQuery.data?.length === 0 && (
          <p className="text-sm text-foreground/70 text-center py-6">
            {t("noGamesConfigured")}
          </p>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("gamesManager.deleteDialog.title")}
        description={t("gamesManager.deleteDialog.description", {
          name: deleteTarget?.name ?? "",
        })}
        confirm={{ type: "name", name: deleteTarget?.name ?? "" }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.guid);
        }}
      />
    </SettingsSection>
  );
}
