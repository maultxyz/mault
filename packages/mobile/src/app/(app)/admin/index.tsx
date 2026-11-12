import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { useRole } from "@/hooks/use-role";
import { ADMIN_SECTIONS } from "@/lib/constants/admin";

export default function AdminScreen() {
  const { t } = useTranslation();
  const { isAdmin } = useRole();
  return (
    <AdminGate>
      <Screen header={<PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} onBack={() => router.back()} />}>
        <ListGroup>
          {ADMIN_SECTIONS.filter((section) => isAdmin || !section.requiresPlatformAdmin).map((section) => (
            <ListRow
              key={section.key}
              icon={section.icon}
              title={t(`admin.sections.${section.key}.title`)}
              subtitle={t(`admin.sections.${section.key}.subtitle`)}
              onPress={() => router.push(section.route)}
            />
          ))}
        </ListGroup>
      </Screen>
    </AdminGate>
  );
}
