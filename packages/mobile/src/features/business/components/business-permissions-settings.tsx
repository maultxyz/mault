import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { BUSINESS_PERMISSION_KEYS } from "@magic-vault/shared";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { SPACING } from "@/lib/constants/theme";
import type { BusinessSettingsFormProps } from "@/lib/interfaces/business";

export function BusinessPermissionsSettings({ control, disabled }: BusinessSettingsFormProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection
      title={t("settings.business.permissions.heading")}
      description={t("settings.business.permissions.description")}
    >
      <Surface style={{ gap: SPACING.lg }}>
        {BUSINESS_PERMISSION_KEYS.map((key) => (
          <Controller
            key={key}
            control={control}
            name={`permissions.${key}`}
            render={({ field }) => (
              <SwitchRow
                title={t(`settings.business.permissions.${key}.label`)}
                description={t(`settings.business.permissions.${key}.description`)}
                value={field.value}
                disabled={disabled}
                onValueChange={field.onChange}
              />
            )}
          />
        ))}
      </Surface>
    </SettingsSection>
  );
}
