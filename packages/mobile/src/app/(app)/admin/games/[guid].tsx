import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Screen } from "@/components/ui/screen";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { GamesEditor } from "@/features/admin/components/games-editor";
import { gamesQueryOptions } from "@/features/games/api/games";

export default function AdminEditGameScreen() {
  const { t } = useTranslation();
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const games = useQuery(gamesQueryOptions);
  const game = games.data?.find((candidate) => candidate.guid === guid) ?? null;

  if (game) {
    return (
      <AdminGate>
        <GamesEditor key={game.guid} game={game} />
      </AdminGate>
    );
  }

  return (
    <AdminGate>
      <Screen header={<PageHeader title={t("admin.sections.cards.title")} onBack={() => router.back()} />}>
        {games.isLoading ? (
          <PageSkeleton />
        ) : (
          <EmptyState
            icon="game"
            title={t("admin.cards.gameForm.notFound")}
            action={<Button variant="secondary" label={t("admin.cards.gameForm.backToGames")} onPress={() => router.back()} />}
          />
        )}
      </Screen>
    </AdminGate>
  );
}
