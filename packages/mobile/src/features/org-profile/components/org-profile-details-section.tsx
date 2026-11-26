import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ORG_PROFILE_BIO_MAX_LENGTH, ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { TextField } from "@/components/ui/text-field";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { OrgProfileSectionProps } from "@/lib/interfaces/org-profile";

export function OrgProfileDetailsSection({ control, disabled }: OrgProfileSectionProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t("settings.orgProfile.details.heading")}>
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            label={t("settings.orgProfile.displayNameLabel")}
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            autoCapitalize="words"
            maxLength={ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH}
            editable={!disabled}
            returnKeyType="done"
            error={translateFormErrorMessage(t, fieldState.error?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field, fieldState }) => (
          <View style={{ gap: SPACING.xs }}>
            <TextField
              label={t("settings.orgProfile.bioLabel")}
              placeholder={t("settings.orgProfile.bioPlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              multiline
              autoCapitalize="sentences"
              maxLength={ORG_PROFILE_BIO_MAX_LENGTH}
              editable={!disabled}
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
            <AppText size="2xs" tone="secondary" style={{ alignSelf: "flex-end", fontVariant: ["tabular-nums"] }}>
              {t("settings.orgProfile.bioCount", { length: field.value.length, max: ORG_PROFILE_BIO_MAX_LENGTH })}
            </AppText>
          </View>
        )}
      />
    </SettingsSection>
  );
}
