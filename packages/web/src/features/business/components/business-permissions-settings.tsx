import { Switch } from "@/components/ui/switch";
import type { BusinessPermissionsSettingsProps } from "@/lib/interfaces/business";
import { BUSINESS_PERMISSION_KEYS } from "@magic-vault/shared";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function BusinessPermissionsSettings({
  control,
  disabled,
}: BusinessPermissionsSettingsProps) {
  const { t } = useTranslation("business");
  return (
    <div className="divide-y rounded-lg border">
      {BUSINESS_PERMISSION_KEYS.map((key) => (
        <Controller
          key={key}
          control={control}
          name={`permissions.${key}`}
          render={({ field }) => (
            <label className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="text-sm">
                  {t(`settings.permissions.${key}.label`)}
                </span>
                <span className="text-xs text-foreground/70">
                  {t(`settings.permissions.${key}.description`)}
                </span>
              </span>
              <Switch
                checked={field.value}
                disabled={disabled}
                onCheckedChange={field.onChange}
              />
            </label>
          )}
        />
      ))}
    </div>
  );
}
