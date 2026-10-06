import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  createGame,
  gamesQueryOptions,
  updateGame,
} from "@/features/games/api/games";
import { toFieldRenames, toGameInput } from "@/features/games/lib/game-form";
import { toast } from "@/lib/toast";
import type { GameFormValues } from "@/schemas/games.schema";
import type { Game } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useSaveGame(game: Game | null) {
  const { t } = useTranslation("games");
  const queryClient = useQueryClient();

  function upsertCachedGame(saved: Game) {
    queryClient.setQueryData(gamesQueryOptions.queryKey, (games = []) =>
      games.some((g) => g.guid === saved.guid)
        ? games.map((g) => (g.guid === saved.guid ? saved : g))
        : [...games, saved],
    );
  }

  return useMutation({
    mutationFn: async (values: GameFormValues): Promise<Game | null> => {
      const r = game
        ? await updateGame(game.guid, {
            ...toGameInput(values),
            fieldRenames: toFieldRenames(values.fieldDefinitions),
          })
        : await createGame(toGameInput(values));
      if (!r.success || !r.data) {
        toast.error(
          r.message ||
            t(
              game
                ? "gamesManager.toasts.updateError"
                : "gamesManager.toasts.createError",
            ),
        );
        return null;
      }
      return r.data;
    },
    onSuccess: (saved) => {
      if (!saved) return;
      upsertCachedGame(saved);
      if (game) {
        queryClient.invalidateQueries({
          queryKey: collectionsQueryOptions.queryKey,
        });
        queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey });
      }
      toast.success(
        t(
          game
            ? "gamesManager.toasts.updateSuccess"
            : "gamesManager.toasts.createSuccess",
          { name: saved.name },
        ),
      );
    },
    onError: () =>
      toast.error(
        t(
          game
            ? "gamesManager.toasts.updateError"
            : "gamesManager.toasts.createError",
        ),
      ),
  });
}
