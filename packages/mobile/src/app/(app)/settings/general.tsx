import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { useOrgSettingsDraft } from "@/features/settings/api/use-org-settings-draft";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { useTheme } from "@/hooks/use-theme";
import { THEME_COLORS } from "@/lib/constants/settings";
import { RADIUS, SPACING } from "@/lib/constants/theme";

export default function GeneralSettingsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const draft = useOrgSettingsDraft();
  const disabled = draft.isLoading || draft.isSaving;
  return (
    <SettingsPage
      title={t("settings.sections.general.title")}
      isDirty={draft.isDirty}
      isSaving={draft.isSaving}
      saveError={draft.saveError}
      onSave={draft.save}
      onDiscard={draft.discard}
    >
      <Surface style={{ gap: SPACING.md }}>
        <View>
          <AppText heading weight="semibold">
            {t("settings.appearance.heading")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("settings.appearance.description")}
          </AppText>
        </View>
        <AppText weight="medium">{t("settings.appearance.primaryColor")}</AppText>
        <Controller
          control={draft.control}
          name="primaryColor"
          render={({ field }) => (
            <View style={{ gap: SPACING.sm }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
                {THEME_COLORS.map((color) => {
                  const selected = field.value === color.name;
                  return (
                    <Pressable
                      key={color.name}
                      accessibilityRole="radio"
                      accessibilityLabel={color.name}
                      accessibilityState={{ selected }}
                      onPress={() => field.onChange(color.name)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: RADIUS.md,
                        backgroundColor: color.value,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: selected ? 2 : 0,
                        borderColor: colors.foreground,
                      }}
                    >
                      {selected ? <Icon name="check" size={16} color={color.fg} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              {field.value ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="refresh"
                  label={t("settings.appearance.resetColor")}
                  onPress={() => field.onChange(null)}
                  style={{ alignSelf: "flex-start" }}
                />
              ) : null}
            </View>
          )}
        />
      </Surface>
      <Surface style={{ gap: SPACING.md }}>
        <View>
          <AppText heading weight="semibold">
            {t("settings.leaderboard.heading")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("settings.leaderboard.description")}
          </AppText>
        </View>
        <Controller
          control={draft.control}
          name="leaderboardOptIn"
          render={({ field }) => (
            <SwitchRow title={t("settings.leaderboard.toggleLabel")} value={field.value} disabled={disabled} onValueChange={field.onChange} />
          )}
        />
      </Surface>
    </SettingsPage>
  );
}
