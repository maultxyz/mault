import { THEME_COLORS } from "@/lib/constants/colors";
import type { PrimaryColorPickerProps } from "@/lib/interfaces/settings";
import { applyPrimaryColorName } from "@/lib/primary-color";
import { cn } from "@/lib/utils";
import { IconCheck, IconRotate } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function PrimaryColorPicker({
  value,
  savedValue,
  onChange,
}: PrimaryColorPickerProps) {
  const { t } = useTranslation("settings");

  useEffect(() => {
    applyPrimaryColorName(value);
    return () => applyPrimaryColorName(savedValue);
  }, [value, savedValue]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {THEME_COLORS.map((color) => {
          const isSelected = value === color.name;
          return (
            <button
              key={color.name}
              type="button"
              title={color.name}
              onClick={() => onChange(color.name)}
              className={cn(
                "size-7 rounded-md shrink-0 transition-all ring-offset-background",
                isSelected
                  ? "ring-2 ring-offset-2 ring-foreground scale-110"
                  : "hover:scale-110",
              )}
              style={{ background: color.value }}
            >
              {isSelected && (
                <IconCheck size={14}
                  style={{ color: color.fg }}
                  className="mx-auto"
                />
              )}
              <span className="sr-only">{color.name}</span>
            </button>
          );
        })}

        {value && (
          <button
            type="button"
            title={t("appearance.resetColor")}
            onClick={() => onChange(null)}
            className="size-7 rounded-md shrink-0 border border-dashed border-border flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors hover:border-foreground"
          >
            <IconRotate size={13} />
            <span className="sr-only">{t("appearance.resetColor")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
