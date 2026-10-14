import {
  SORTER_MODEL_LEGEND,
  SORTER_MODEL_PART_COLORS,
} from "@/lib/constants/sorter-model";
import type { SorterModelLegendProps } from "@/lib/interfaces/sorter-model";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function SorterModelLegend({ focus }: SorterModelLegendProps) {
  const { t } = useTranslation("calibration");

  return (
    <ul
      aria-label={t("sorterModel.legend")}
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
    >
      {SORTER_MODEL_LEGEND.map((part) => {
        const active = focus?.servo === part;
        return (
          <li
            key={part}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              active ? "font-medium text-foreground" : "text-foreground/70",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-3 shrink-0 rounded-sm ring-1 ring-foreground/20",
                active && "ring-2 ring-foreground/60",
              )}
              style={{ backgroundColor: SORTER_MODEL_PART_COLORS[part] }}
            />
            {t(`sorterModel.parts.${part}`)}
            {active &&
              focus &&
              ` (${t("sorterModel.moduleNumber", { module: focus.module })})`}
          </li>
        );
      })}
    </ul>
  );
}
