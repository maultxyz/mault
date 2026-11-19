import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Pill } from "@/components/ui/pill";
import { gamesQueryOptions } from "@/features/games/api/games";
import { SPACING } from "@/lib/constants/theme";

export function GamesListPanel() {
  const { t } = useTranslation();
  const games = useQuery(gamesQueryOptions);
  return (
    <View style={{ gap: SPACING.md }}>
      <AppText size="xs" tone="secondary">
        {t("admin.cards.games.description")}
      </AppText>
      <Button icon="plus" label={t("admin.cards.games.addGame")} onPress={() => router.push("/admin/games/new")} />
      {games.isError ? <Callout tone="destructive" title={t("admin.cards.games.loadFailed")} /> : null}
      {games.isLoading ? (
        <ListSkeleton rows={4} withIcon={false} />
      ) : games.data && games.data.length === 0 ? (
        <EmptyState icon="game" title={t("admin.cards.games.empty")} />
      ) : (
        <ListGroup>
          {(games.data ?? []).map((game) => {
            const status = game.isActive ? t("admin.cards.games.active") : t("admin.cards.games.inactive");
            return (
              <ListRow
                key={game.guid}
                title={game.name}
                subtitle={`${game.key} · ${t("admin.cards.games.fieldCount", { count: game.fieldDefinitions.length })}`}
                right={<Pill label={status} tone={game.isActive ? "success" : "neutral"} />}
                onPress={() => router.push(`/admin/games/${game.guid}`)}
              />
            );
          })}
        </ListGroup>
      )}
    </View>
  );
}
