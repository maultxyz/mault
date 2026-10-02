import type { ScannerLayoutToggleProps } from "@/lib/interfaces/settings";
import { cn } from "@/lib/utils";
import { IconLayoutColumns, IconLayoutRows } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScannerLayoutToggle({ value, onChange }: ScannerLayoutToggleProps) {
  const { t } = useTranslation("settings");

  const OPTIONS = [
    {
      value: "horizontal" as const,
      label: t("appearance.scannerLayoutHorizontal"),
      description: t("appearance.scannerLayoutHorizontalDescription"),
      icon: IconLayoutColumns,
    },
    {
      value: "vertical" as const,
      label: t("appearance.scannerLayoutVertical"),
      description: t("appearance.scannerLayoutVerticalDescription"),
      icon: IconLayoutRows,
    },
  ];

  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 w-36 transition-all text-left",
              isSelected
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground",
            )}
          >
            <Icon size={20} className={isSelected ? "text-primary" : ""} />
            <span className="text-xs font-medium">{opt.label}</span>
            <span className="text-2xs leading-tight text-foreground/70">
              {opt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
