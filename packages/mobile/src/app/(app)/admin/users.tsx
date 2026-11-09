import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { TabStrip } from "@/components/ui/tab-strip";
import { impersonationAuditQueryOptions } from "@/features/admin/api/users-impersonation";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { ImpersonationAuditPanel } from "@/features/admin/components/users-impersonation-audit-panel";
import { UserSearchPanel } from "@/features/admin/components/users-search-panel";
import { ADMIN_USERS_TABS } from "@/lib/constants/admin-users";
import type { AdminUsersTab } from "@/lib/interfaces/admin-users";

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminUsersTab>("search");
  const auditQuery = useQuery({ ...impersonationAuditQueryOptions, enabled: activeTab === "audit" });

  return (
    <AdminGate>
      <Screen
        refreshing={activeTab === "audit" && auditQuery.isRefetching}
        onRefresh={activeTab === "audit" ? () => void auditQuery.refetch() : undefined}
        header={
          <PageHeader
            title={t("admin.sections.users.title")}
            subtitle={t("admin.users.subtitle")}
            onBack={() => router.back()}
            tabs={
              <TabStrip<AdminUsersTab>
                value={activeTab}
                onChange={setActiveTab}
                items={ADMIN_USERS_TABS.map((tab) => ({ value: tab, label: t(`admin.users.tabs.${tab}`) }))}
              />
            }
          />
        }
      >
        {activeTab === "search" ? <UserSearchPanel /> : <ImpersonationAuditPanel />}
      </Screen>
    </AdminGate>
  );
}
