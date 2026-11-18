import { Callout } from "@/components/callout";
import { useMachineLabels } from "@/features/machines/api/use-machine-labels";
import { MACHINE_RUN_STATE_DOT_CLASS } from "@/lib/constants/machines";
import type { MachinePanelProps } from "@/lib/interfaces/machines";
import { cn } from "@/lib/utils";
import { isMachineStatusStale } from "@magic-vault/shared";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MachineStatusSummary({ machine }: MachinePanelProps) {
  const { t } = useTranslation("machines");
  const { statusLabel } = useMachineLabels();
  const isStale = isMachineStatusStale(machine, Date.now());

  return (
    <div className="flex flex-col gap-2">
      <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <span aria-hidden className={cn("size-2 rounded-full", MACHINE_RUN_STATE_DOT_CLASS[machine.runState])} />
          {t(`runState.${machine.runState}`)}
        </span>
        <span className="text-foreground/70">
          {t("sessionCount", { count: machine.sessionScanCount })}
        </span>
        {isStale && <span className="text-foreground/70">{t("stale")}</span>}
      </div>
      <p className="truncate text-xs text-foreground/70">
        {[
          machine.collectionName
            ? t("collection", { name: machine.collectionName })
            : t("noCollection"),
          t(`source.${machine.source}`),
        ].join(" · ")}
      </p>
      {machine.attention && (
        <Callout variant="error" icon={IconAlertTriangle} title={statusLabel(machine)}>
          {machine.attention.detail}
        </Callout>
      )}
    </div>
  );
}
