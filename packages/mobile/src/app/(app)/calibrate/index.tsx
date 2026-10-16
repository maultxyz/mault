import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { CALIBRATION_SECTION_LINKS } from "@/lib/constants/calibration";
import { PHASE_TONES } from "@/lib/constants/sorter";

export default function CalibrationHubScreen() {
  const { t } = useTranslation();
  const sorter = useSorter();
  return (
    <Screen
      header={
        <PageHeader
          title={t("calibration.title")}
          subtitle={sorter.device?.name ?? t("calibration.hubSubtitle")}
          onBack={() => router.back()}
          actions={<Pill tone={PHASE_TONES[sorter.phase]} label={t(`sorter.phase.${sorter.phase}`)} />}
        />
      }
    >
      {!sorter.isConnected ? (
        <Callout
          tone="warning"
          title={t("calibration.notConnectedTitle")}
          description={t("calibration.notConnectedDescription")}
          action={<Button size="sm" variant="secondary" label={t("scan.openSorter")} onPress={() => router.push("/sorter")} />}
        />
      ) : null}
      <ListGroup>
        {CALIBRATION_SECTION_LINKS.map((section) => (
          <ListRow
            key={section.path}
            icon={section.icon}
            title={t(section.titleKey)}
            subtitle={t(section.descriptionKey)}
            disabled={!sorter.isConnected}
            onPress={() => router.push(section.path)}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}
