import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS, DEFAULT_CORRECTION_AUTO_CLOSE_SECONDS } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { OptionSheet } from "@/components/ui/option-sheet";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { useOrgSettingsDraft } from "@/features/settings/api/use-org-settings-draft";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SPACING } from "@/lib/constants/theme";

export default function ScanningSettingsScreen() {
  const { t } = useTranslation();
  const draft = useOrgSettingsDraft();
  const disabled = draft.isLoading || draft.isSaving;
  const correctionBinPrompt = useWatch({ control: draft.control, name: "correctionBinPrompt" });
  const [secondsOpen, setSecondsOpen] = useState(false);

  const section = (heading: string, description: string, badge?: string) => (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <AppText heading weight="semibold">
          {heading}
        </AppText>
        {badge ? <Pill label={badge} /> : null}
      </View>
      <AppText size="xs" tone="secondary">
        {description}
      </AppText>
    </View>
  );

  return (
    <SettingsPage
      title={t("settings.sections.scanning.title")}
      isDirty={draft.isDirty}
      isSaving={draft.isSaving}
      saveError={draft.saveError}
      onSave={draft.save}
      onDiscard={draft.discard}
    >
      <Surface style={{ gap: SPACING.md }}>
        {section(t("settings.sessionWrapped.heading"), t("settings.sessionWrapped.description"))}
        <Controller
          control={draft.control}
          name="sessionWrappedEnabled"
          render={({ field }) => (
            <SwitchRow title={t("settings.sessionWrapped.toggleLabel")} value={field.value} disabled={disabled} onValueChange={field.onChange} />
          )}
        />
      </Surface>
      <Surface style={{ gap: SPACING.md }}>
        {section(t("settings.ocr.heading"), t("settings.ocr.description"), t("settings.ocr.badge"))}
        <Controller
          control={draft.control}
          name="ocrEnabled"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.ocr.toggleLabel")}
              value={field.value}
              disabled={disabled}
              onValueChange={(next) => {
                if (!next) {
                  field.onChange(false);
                  return;
                }
                Alert.alert(t("settings.ocrBetaDialog.title"), t("settings.ocrBetaDialog.description"), [
                  { text: t("settings.ocrBetaDialog.cancel"), style: "cancel" },
                  { text: t("settings.ocrBetaDialog.confirm"), onPress: () => field.onChange(true) },
                ]);
              }}
            />
          )}
        />
      </Surface>
      <Surface style={{ gap: SPACING.md }}>
        {section(t("settings.correctionAutoClose.heading"), t("settings.correctionAutoClose.description"))}
        <Controller
          control={draft.control}
          name="correctionBinPrompt"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.correctionAutoClose.promptToggleLabel")}
              description={t("settings.correctionAutoClose.promptToggleDescription")}
              value={field.value}
              disabled={disabled}
              onValueChange={field.onChange}
            />
          )}
        />
        {correctionBinPrompt ? (
          <Controller
            control={draft.control}
            name="correctionAutoCloseSeconds"
            render={({ field }) => (
              <View style={{ gap: SPACING.sm }}>
                <SwitchRow
                  title={t("settings.correctionAutoClose.toggleLabel")}
                  value={field.value != null}
                  disabled={disabled}
                  onValueChange={(next) => field.onChange(next ? DEFAULT_CORRECTION_AUTO_CLOSE_SECONDS : null)}
                />
                {field.value != null ? (
                  <SelectField
                    label={t("settings.correctionAutoClose.secondsLabel")}
                    value={t("settings.correctionAutoClose.seconds", { count: field.value })}
                    placeholder={t("settings.correctionAutoClose.secondsLabel")}
                    disabled={disabled}
                    onPress={() => setSecondsOpen(true)}
                  />
                ) : null}
                <OptionSheet
                  visible={secondsOpen}
                  title={t("settings.correctionAutoClose.secondsLabel")}
                  options={CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS.map((seconds) => ({
                    value: String(seconds),
                    label: t("settings.correctionAutoClose.seconds", { count: seconds }),
                  }))}
                  selected={field.value != null ? [String(field.value)] : []}
                  onSelect={(value) => {
                    setSecondsOpen(false);
                    field.onChange(Number(value));
                  }}
                  onClose={() => setSecondsOpen(false)}
                />
              </View>
            )}
          />
        ) : null}
      </Surface>
      <Surface style={{ gap: SPACING.md }}>
        {section(t("settings.deployPause.heading"), t("settings.deployPause.description"))}
        <Controller
          control={draft.control}
          name="pauseScanningOnDeploy"
          render={({ field }) => (
            <SwitchRow title={t("settings.deployPause.toggleLabel")} value={field.value} disabled={disabled} onValueChange={field.onChange} />
          )}
        />
      </Surface>
    </SettingsPage>
  );
}
