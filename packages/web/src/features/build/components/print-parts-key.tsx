import { SORTER_PRINT_PART_COLORS } from "@/lib/constants/sorter-model";
import type { PrintPartsKeyProps } from "@/lib/interfaces/build";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function PrintPartsKey({
  entries,
  breakoutHeight,
  selected,
  onSelect,
  onPreview,
}: PrintPartsKeyProps) {
  const { t } = useTranslation("build");

  return (
    <ul
      aria-label={t("printModel.key")}
      className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2"
    >
      {entries.map(({ part, count }) => {
        const active = selected === part;
        const label =
          part === "circuitBoardPlate" && breakoutHeight !== null
            ? t("printModel.parts.circuitBoardPlateBreakout")
            : t(`printModel.parts.${part}`, { height: breakoutHeight });
        return (
          <li key={part}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : part)}
              onMouseEnter={() => onPreview(part)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(part)}
              onBlur={() => onPreview(null)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active && "bg-muted font-medium",
              )}
            >
              <span
                aria-hidden
                className="size-4 shrink-0 rounded-sm ring-1 ring-foreground/20"
                style={{ backgroundColor: SORTER_PRINT_PART_COLORS[part] }}
              />
              <span className="min-w-0 flex-1">{label}</span>
              {count !== null && (
                <span className="shrink-0 font-mono tabular-nums">
                  {t("printModel.count", { count })}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
