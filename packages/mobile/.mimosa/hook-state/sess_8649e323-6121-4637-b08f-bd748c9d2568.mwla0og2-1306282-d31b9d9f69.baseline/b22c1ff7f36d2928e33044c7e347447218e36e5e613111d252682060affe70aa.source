import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Switch, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import { PLAN_LIMIT_INPUT_MAX_LENGTH } from "@/lib/constants/admin-plans";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { PlansLimitRowProps } from "@/lib/interfaces/admin-plans";

export function PlansLimitRow({ plan, limit, control, fallbackLimit, disabled }: PlansLimitRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const limitLabel = t(`admin.plans.limits.${limit}.label`);
  return (
    <Controller
      control={control}
      name={`${plan}.limits.${limit}`}
      render={({ field, fieldState }) => {
        const isUnlimited = field.value === null;
        const errorMessage = translateFormErrorMessage(t, fieldState.error?.message);
        return (
          <View style={{ gap: SPACING.sm }}>
            <View>
              <AppText weight="medium">{limitLabel}</AppText>
              <AppText size="xs" tone="secondary">
                {t(`admin.plans.limits.${limit}.description`)}
              </AppText>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
              <Input
                accessibilityLabel={limitLabel}
                keyboardType="number-pad"
                maxLength={PLAN_LIMIT_INPUT_MAX_LENGTH}
                editable={!disabled && !isUnlimited}
                placeholder={isUnlimited ? t("admin.plans.unlimited") : undefined}
                value={isUnlimited || Number.isNaN(field.value) ? "" : String(field.value)}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, "");
                  field.onChange(digits === "" ? Number.NaN : Number(digits));
                }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                <AppText size="xs" importantForAccessibility="no" accessibilityElementsHidden>
                  {t("admin.plans.unlimited")}
                </AppText>
                <Switch
                  accessibilityLabel={t("admin.plans.unlimitedFor", { limit: limitLabel })}
                  value={isUnlimited}
                  disabled={disabled}
                  onValueChange={(checked) => field.onChange(checked ? null : fallbackLimit)}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.background}
                  ios_backgroundColor={colors.muted}
                />
              </View>
            </View>
            {errorMessage ? (
              <AppText size="xs" tone="destructive" accessibilityRole="alert" accessibilityLiveRegion="polite">
                {errorMessage}
              </AppText>
            ) : null}
          </View>
        );
      }}
    />
  );
}
