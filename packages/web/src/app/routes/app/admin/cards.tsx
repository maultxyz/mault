import { CardSyncProvider } from "@/features/admin/api/use-card-sync";
import { CardDatabaseManager } from "@/features/admin/components/card-database-manager";
import { CardSyncPanel } from "@/features/admin/components/card-sync-panel";
import { DumpCardDatabasePanel } from "@/features/admin/components/dump-card-database-panel";
import { ScanVectorizeStatsPanel } from "@/features/admin/components/scan-vectorize-stats-panel";
import { SyncCardByIdPanel } from "@/features/admin/components/sync-card-by-id-panel";

export default function AdminCardsPage() {
  return (
    <CardSyncProvider>
      <ScanVectorizeStatsPanel />

      <CardSyncPanel />

      <CardDatabaseManager />

      <SyncCardByIdPanel />

      <DumpCardDatabasePanel />
    </CardSyncProvider>
  );
}
