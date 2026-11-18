import { Progress } from "@/components/ui/progress";
import type { MachineBinTileProps, MachinePanelProps } from "@/lib/interfaces/machines";
import { cn } from "@/lib/utils";
import {
  MACHINE_BIN_WARNING_PERCENT,
  machineBinFillPercent,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function MachineBinTile({ fill }: MachineBinTileProps) {
  const { t } = useTranslation("machines");
  const percent = machineBinFillPercent(fill);
  const name = fill.isCatchAll
    ? t("bins.catchAll", { number: fill.binNumber })
    : t("bins.bin", { number: fill.binNumber });
  const accessibleLabel =
    fill.capacity != null
      ? t("bins.a11y", { name, count: fill.count, capacity: fill.capacity })
      : t("bins.a11yUnknown", { name, count: fill.count });

  return (
    <li
      aria-label={accessibleLabel}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg bg-card px-3 py-2 md:p-2",
        fill.isCatchAll && "col-span-2",
      )}
    >
      <span aria-hidden className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate text-foreground">{name}</span>
        <span className="shrink-0 font-semibold text-foreground">
          {fill.capacity != null
            ? t("bins.fill", { count: fill.count, capacity: fill.capacity })
            : t("bins.fillUnknown", { count: fill.count })}
        </span>
      </span>
      <Progress
        decorative
        value={percent ?? 0}
        tone={percent != null && percent >= MACHINE_BIN_WARNING_PERCENT ? "warning" : "primary"}
      />
    </li>
  );
}

export function MachineBinGrid({ machine }: MachinePanelProps) {
  const { t } = useTranslation("machines");

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h3 className="font-heading text-sm font-semibold text-foreground">{t("bins.title")}</h3>
        <p className="text-xs text-foreground/70">{t("bins.estimated")}</p>
      </div>
      {machine.binFill && machine.binFill.length > 0 ? (
        <ul className="grid grid-cols-2 gap-1.5">
          {machine.binFill.map((fill) => (
            <MachineBinTile key={fill.binNumber} fill={fill} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-card px-3 py-2 text-sm text-foreground/70">{t("bins.unavailable")}</p>
      )}
    </section>
  );
}
