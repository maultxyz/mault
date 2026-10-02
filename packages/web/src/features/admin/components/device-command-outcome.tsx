import type { DeviceCommandOutcomeProps } from "@/lib/interfaces/device-playground";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function DeviceCommandOutcome({ outcome }: DeviceCommandOutcomeProps) {
  const { t } = useTranslation("admin");
  const isError =
    outcome.status !== "ok" || (outcome.line?.includes('"error"') ?? false);

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border px-2 py-1.5 text-xs",
        isError
          ? "border-destructive/40 bg-destructive/5"
          : "border-green-500/30 bg-green-400/10",
      )}
    >
      <span className="text-foreground/70">
        {t(`devicePlayground.outcome.${outcome.status}`, {
          ms: outcome.elapsedMs,
        })}
      </span>
      {outcome.line && (
        <code className="font-mono break-all text-foreground">
          {outcome.line}
        </code>
      )}
    </div>
  );
}
