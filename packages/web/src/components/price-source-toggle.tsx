import type { PriceSourceToggleProps } from "@/lib/interfaces/settings";
import { cn } from "@/lib/utils";
import { PRICE_SOURCE_FIELDS, PRICE_SOURCES } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PriceSourceToggle({ value, onChange }: PriceSourceToggleProps) {
  const { t } = useTranslation("settings");

  return (
    <div className="flex gap-2">
      {PRICE_SOURCES.map((source) => {
        const isSelected = value === source;
        return (
          <button
            key={source}
            type="button"
            onClick={() => onChange(source)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-3 w-36 transition-all",
              isSelected
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            <span className="text-xs font-medium">
              {t(`pricing.sources.${source}`)}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {PRICE_SOURCE_FIELDS[source].currency}
            </span>
          </button>
        );
      })}
    </div>
  );
}
