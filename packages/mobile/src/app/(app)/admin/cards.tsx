import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { TabStrip } from "@/components/ui/tab-strip";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { CardsDatabasePanel } from "@/features/admin/components/cards-database-panel";
import { CardsStatsPanel } from "@/features/admin/components/cards-stats-panel";
import { CardsSyncApiKeysPanel } from "@/features/admin/components/cards-sync-api-keys-panel";
import { CardsSyncPanel } from "@/features/admin/components/cards-sync-panel";
import { GamesListPanel } from "@/features/admin/components/games-list-panel";
import { gamesQueryOptions } from "@/features/games/api/games";
import { useRole } from "@/hooks/use-role";
import { ADMIN_CARDS_QUERY_KEY, ADMIN_CARDS_STAFF_TABS, ADMIN_CARDS_TABS } from "@/lib/constants/admin-cards";
import type { AdminCardsTab } from "@/lib/interfaces/admin-cards";

export default function AdminCardsScreen() {
  const { t } = useTranslation();
  const { isAdmin } = useRole();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<AdminCardsTab>("stats");
  const [refreshing, setRefreshing] = useState(false);
  const availableTabs: readonly AdminCardsTab[] = isAdmin ? ADMIN_CARDS_TABS : ADMIN_CARDS_STAFF_TABS;
  const tab = availableTabs.includes(selectedTab) ? selectedTab : "stats";

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_CARDS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: gamesQueryOptions.queryKey }),
    ]);
    setRefreshing(false);
  };

  return (
    <AdminGate>
      <Screen
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        header={
          <PageHeader
            title={t("admin.sections.cards.title")}
            subtitle={t("admin.sections.cards.subtitle")}
            onBack={() => router.back()}
            tabs={
              <TabStrip<AdminCardsTab>
                value={tab}
                onChange={setSelectedTab}
                items={availableTabs.map((value) => ({ value, label: t(`admin.cards.tabs.${value}`) }))}
              />
            }
          />
        }
      >
        {tab === "stats" ? <CardsStatsPanel /> : null}
        {tab === "games" ? <GamesListPanel /> : null}
        {tab === "sync" ? <CardsSyncPanel /> : null}
        {tab === "database" ? <CardsDatabasePanel /> : null}
        {tab === "keys" ? <CardsSyncApiKeysPanel /> : null}
      </Screen>
    </AdminGate>
  );
}
