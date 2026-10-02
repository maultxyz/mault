import type { SessionError } from "@/features/scanner/api/use-session-monitor";
import { useTranslation } from "react-i18next";

export function SessionErrorsPanel({ errors }: { errors: SessionError[] }) {
  const { t } = useTranslation("scanner");
  if (errors.length === 0) return null;

  return (
    <div className="rounded-lg border border-destructive-border bg-destructive-muted overflow-hidden">
      <p className="text-2xs font-medium text-destructive uppercase tracking-wide px-2 pt-2 pb-1.5">
        {t("sessionErrorsPanel.heading")}
      </p>
      <div className="flex flex-col divide-y divide-destructive/10 max-h-48 overflow-y-auto">
        {errors.map((err) => (
          <div key={err.id} className="px-2 py-1.5">
            <p className="text-xs text-destructive leading-snug">{err.message}</p>
            <p className="text-2xs text-destructive/60 mt-0.5">
              {new Date(err.timestamp).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
