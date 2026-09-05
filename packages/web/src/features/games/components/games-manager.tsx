import { DeleteDialog } from "@/components/delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  createGame,
  deleteGame,
  gamesQueryOptions,
  updateGame,
} from "@/features/games/api/games";
import type { GameFormValues } from "@/schemas/games.schema";
import type { Game } from "@magic-vault/shared";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { GameFormDialog, toFieldDefinitions } from "./game-form-dialog";

export function GamesManager() {
  const { t } = useTranslation("games");
  const queryClient = useQueryClient();
  const [formGame, setFormGame] = useState<Game | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);

  const gamesQuery = useQuery(gamesQueryOptions);

  function setGames(games: Game[]) {
    queryClient.setQueryData(gamesQueryOptions.queryKey, games);
  }

  const createMutation = useMutation({
    mutationFn: (values: GameFormValues) =>
      createGame({
        key: values.key,
        name: values.name,
        apiDocsUrl: values.apiDocsUrl || null,
        isActive: values.isActive,
        fieldDefinitions: toFieldDefinitions(values.fieldDefinitions),
      }),
    onSuccess: (r) => {
      if (!r.success || !r.data) {
        toast.error(r.message || t("gamesManager.toasts.createError"));
        return;
      }
      setGames([...(gamesQuery.data ?? []), r.data]);
      toast.success(
        t("gamesManager.toasts.createSuccess", { name: r.data.name }),
      );
    },
    onError: () => toast.error(t("gamesManager.toasts.createError")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ guid, values }: { guid: string; values: GameFormValues }) =>
      updateGame(guid, {
        key: values.key,
        name: values.name,
        apiDocsUrl: values.apiDocsUrl || null,
        isActive: values.isActive,
        fieldDefinitions: toFieldDefinitions(values.fieldDefinitions),
      }),
    onSuccess: (r) => {
      if (!r.success || !r.data) {
        toast.error(r.message || t("gamesManager.toasts.updateError"));
        return;
      }
      setGames(
        (gamesQuery.data ?? []).map((g) =>
          g.guid === r.data!.guid ? r.data! : g,
        ),
      );
      toast.success(
        t("gamesManager.toasts.updateSuccess", { name: r.data.name }),
      );
    },
    onError: () => toast.error(t("gamesManager.toasts.updateError")),
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => deleteGame(guid),
    onSuccess: (r, guid) => {
      if (!r.success) {
        toast.error(r.message || t("gamesManager.toasts.deleteError"));
        return;
      }
      setGames((gamesQuery.data ?? []).filter((g) => g.guid !== guid));
      toast.success(t("gamesManager.toasts.deleteSuccess"));
    },
    onError: () => toast.error(t("gamesManager.toasts.deleteError")),
  });

  async function handleSubmit(values: GameFormValues) {
    if (formGame) {
      await updateMutation.mutateAsync({ guid: formGame.guid, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t("gamesManager.heading")}</p>
          <p className="text-sm text-muted-foreground">
            {t("gamesManager.description")}
          </p>
        </div>
        <Button onClick={() => setFormGame(null)}>
          <IconPlus size={14} />
          {t("gamesManager.addGame")}
        </Button>
      </div>

      <div className="divide-y">
        {gamesQuery.isLoading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("gamesManager.loading")}
          </p>
        )}
        {gamesQuery.data?.map((game) => (
          <div key={game.guid} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{game.name}</p>
                <Badge variant={game.isActive ? "success" : "outline"}>
                  {game.isActive
                    ? t("gamesManager.active")
                    : t("gamesManager.inactive")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
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
                onClick={() => setFormGame(game)}
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
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("gamesManager.empty")}
          </p>
        )}
      </div>

      <GameFormDialog
        open={formGame !== undefined}
        onOpenChange={(open) => {
          if (!open) setFormGame(undefined);
        }}
        game={formGame}
        onSubmit={handleSubmit}
      />

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
    </div>
  );
}
