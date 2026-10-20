import { Checkbox } from "@/components/ui/checkbox";
import type { PlatformStatsFieldsProps } from "@/lib/interfaces/admin";
import { PLATFORM_STAT_KEYS } from "@magic-vault/shared";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PlatformStatsFields({ form }: PlatformStatsFieldsProps) {
  const { t } = useTranslation("admin");

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-foreground/70">
        {t("platformStats.statsDescription")}
      </p>
      <Controller
        control={form.control}
        name="stats"
        render={({ field }) => (
          <div className="divide-y rounded-lg border">
            {PLATFORM_STAT_KEYS.map((key) => {
              const id = `platform-stat-${key}`;
              return (
                <div key={key} className="flex items-start gap-3 px-3 py-2.5">
                  <Checkbox
                    id={id}
                    checked={field.value.includes(key)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        PLATFORM_STAT_KEYS.filter((k) =>
                          k === key ? checked : field.value.includes(k),
                        ),
                      )
                    }
                    className="mt-0.5"
                  />
                  <label htmlFor={id} className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">
                      {t(`platformStats.stats.${key}.label`)}
                    </span>
                    <span className="text-xs text-foreground/70">
                      {t(`platformStats.stats.${key}.description`)}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}
