import { CardSyncProvider } from "@/features/admin/api/use-card-sync";
import { CardDatabaseManager } from "@/features/admin/components/card-database-manager";
import { CardSyncPanel } from "@/features/admin/components/card-sync-panel";
import { DumpCardDatabasePanel } from "@/features/admin/components/dump-card-database-panel";
import { ImpersonationUsersManager } from "@/features/admin/components/impersonation-users-manager";
import { RollbarTestPanel } from "@/features/admin/components/rollbar-test-panel";
import { SyncCardByIdPanel } from "@/features/admin/components/sync-card-by-id-panel";
import { AnnouncementsManager } from "@/features/announcements/components/announcements-manager";
import { GamesManager } from "@/features/games/components/games-manager";
import { useTranslation } from "react-i18next";

export default function AdminPage() {
  const { t } = useTranslation("admin");

  return (
    <div className="overflow-y-auto h-full w-full">
      <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4 ">
        <div>
          <h1 className="text-lg font-semibold font-heading">
            {t("page.title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("page.subtitle")}</p>
        </div>

        <CardSyncProvider>
          <CardSyncPanel />

          <CardDatabaseManager />

          <GamesManager />

          <ImpersonationUsersManager />

          <AnnouncementsManager />

          <SyncCardByIdPanel />

          <RollbarTestPanel />

          <DumpCardDatabasePanel />
        </CardSyncProvider>
      </div>
    </div>
  );
}
