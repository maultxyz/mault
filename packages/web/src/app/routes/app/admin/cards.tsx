import { CardSyncProvider } from "@/features/admin/api/use-card-sync";
import { CardDatabaseManager } from "@/features/admin/components/card-database-manager";
import { CardSyncPanel } from "@/features/admin/components/card-sync-panel";
import { DumpCardDatabasePanel } from "@/features/admin/components/dump-card-database-panel";
import { ScanStatsOverviewPanel } from "@/features/admin/components/scan-stats-overview-panel";
import { SyncCardByIdPanel } from "@/features/admin/components/sync-card-by-id-panel";
import { GamesManager } from "@/features/games/components/games-manager";

export default function AdminCardsPage() {
  return (
    <CardSyncProvider>
      <ScanStatsOverviewPanel />

      <GamesManager />

      <CardSyncPanel />

      <CardDatabaseManager />

      <SyncCardByIdPanel />

      <DumpCardDatabasePanel />
    </CardSyncProvider>
  );
}
