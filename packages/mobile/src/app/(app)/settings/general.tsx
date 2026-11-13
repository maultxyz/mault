import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SwitchRow } from "@/components/ui/switch-row";
import { useOrgSettingsDraft } from "@/features/settings/api/use-org-settings-draft";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useTheme } from "@/hooks/use-theme";
import { THEME_COLORS } from "@/lib/constants/settings";
import { CONTROL_RADIUS, SPACING } from "@/lib/constants/theme";

export default function GeneralSettingsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const draft = useOrgSettingsDraft();
  const disabled = draft.isLoading || draft.isSaving;
  return (
    <SettingsPage
      title={t("settings.sections.general.title")}
      isLoading={draft.isLoading}
      isDirty={draft.isDirty}
      isSaving={draft.isSaving}
      saveError={draft.saveError}
      onSave={draft.save}
      onDiscard={draft.discard}
    >
      <SettingsSection title={t("settings.appearance.heading")} description={t("settings.appearance.description")}>
        <Controller
          control={draft.control}
          name="primaryColor"
          render={({ field }) => (
            <View style={{ gap: SPACING.sm }}>
              <AppText weight="medium">{t("settings.appearance.primaryColor")}</AppText>
              <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.md }}>
                {THEME_COLORS.map((color) => {
                  const selected = field.value === color.name;
                  return (
                    <Pressable
                      key={color.name}
                      accessibilityRole="radio"
                      accessibilityLabel={color.name}
                      accessibilityState={{ selected, disabled }}
                      disabled={disabled}
                      hitSlop={4}
                      onPress={() => field.onChange(color.name)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: CONTROL_RADIUS,
                        backgroundColor: color.value,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: selected ? 2 : 0,
                        borderColor: colors.foreground,
                      }}
                    >
                      {selected ? <Icon name="check" size={18} color={color.fg} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              {field.value ? (
                <ListGroup>
                  <ListRow
                    icon="refresh"
                    title={t("settings.appearance.resetColor")}
                    disabled={disabled}
                    onPress={() => field.onChange(null)}
                  />
                </ListGroup>
              ) : null}
            </View>
          )}
        />
      </SettingsSection>
      <SettingsSection title={t("settings.leaderboard.heading")} description={t("settings.leaderboard.description")}>
        <Controller
          control={draft.control}
          name="leaderboardOptIn"
          render={({ field }) => (
            <SwitchRow title={t("settings.leaderboard.toggleLabel")} value={field.value} disabled={disabled} onValueChange={field.onChange} />
          )}
        />
      </SettingsSection>
    </SettingsPage>
  );
}
