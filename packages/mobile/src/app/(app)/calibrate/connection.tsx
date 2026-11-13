import { router, useNavigation, usePreventRemove } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { FIRMWARE_FEATURE_MIN_VERSIONS, isFirmwareFeatureSupported } from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useDeviceTogglesDraft } from "@/features/calibration/api/use-device-toggles-draft";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { SPACING } from "@/lib/constants/theme";

export default function CalibrationConnectionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const sorter = useSorter();
  const draft = useDeviceTogglesDraft();
  const pipelinedSupported = isFirmwareFeatureSupported(sorter.firmwareVersion, "pipelinedFeed");

  usePreventRemove(draft.isDirty && !draft.isSaving, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("common.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <PageHeader title={t("calibration.sections.connection.title")} subtitle={sorter.device?.name} onBack={() => router.back()} />
        }
      >
        {draft.saveError ? <Callout tone="destructive" title={t("calibration.saveFailed")} /> : null}
        <SettingsSection title={t("calibration.connection.title")}>
          <Surface style={{ gap: SPACING.xl }}>
            <SwitchRow
              title={t("calibration.connection.autoConnectLabel")}
              description={t("calibration.connection.autoConnectDescription")}
              value={draft.values.autoConnect}
              onValueChange={(value) => draft.set("autoConnect", value)}
            />
            <SwitchRow
              title={t("calibration.connection.testOnConnectLabel")}
              description={t("calibration.connection.testOnConnectDescription")}
              value={draft.values.testOnConnect}
              onValueChange={(value) => draft.set("testOnConnect", value)}
            />
          </Surface>
        </SettingsSection>
        <SettingsSection
          title={t("calibration.connection.experimentalTitle")}
          badge={t("calibration.connection.experimentalBadge")}
        >
          <Surface style={{ gap: SPACING.xl }}>
            <SwitchRow
              title={t("calibration.connection.pipelinedFeedLabel")}
              description={
                pipelinedSupported
                  ? t("calibration.connection.pipelinedFeedDescription")
                  : t("calibration.firmwareRequired", { version: FIRMWARE_FEATURE_MIN_VERSIONS.pipelinedFeed })
              }
              value={draft.values.pipelinedFeed}
              disabled={!pipelinedSupported}
              onValueChange={(value) => draft.set("pipelinedFeed", value)}
            />
          </Surface>
        </SettingsSection>
        <Callout
          tone="info"
          title={t("sorter.firmware", { version: sorter.firmwareVersion ?? "?", board: sorter.board ?? "?" })}
          description={t("calibration.connection.firmwareNote")}
        />
      </Screen>
      <SaveBar visible={draft.isDirty} saving={draft.isSaving} onSave={() => void draft.save()} onDiscard={draft.discard} />
    </View>
  );
}
