import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { useActiveOrg } from "@/hooks/use-org";
import { SETTINGS_SECTION_LINKS } from "@/lib/constants/settings";

export default function SettingsHubScreen() {
  const { t } = useTranslation();
  const org = useActiveOrg();
  return (
    <Screen header={<PageHeader title={t("settings.title")} subtitle={org?.name ?? t("settings.subtitle")} onBack={() => router.back()} />}>
      <ListGroup>
        {SETTINGS_SECTION_LINKS.map((section) => (
          <ListRow
            key={section.path}
            icon={section.icon}
            title={t(`settings.sections.${section.key}.title`)}
            subtitle={t(`settings.sections.${section.key}.description`)}
            onPress={() => router.push(section.path)}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}
