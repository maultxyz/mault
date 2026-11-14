import { useTranslation } from "react-i18next";
import type { SessionError } from "@/lib/interfaces/scanner";

export function SessionErrorsPanel({ errors }: { errors: SessionError[] }) {
  const { t } = useTranslation("scanner");
  if (errors.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-card bg-destructive-muted">
      <p className="px-3 pt-3 pb-1.5 text-xs font-medium text-destructive">
        {t("sessionErrorsPanel.heading")}
      </p>
      <div
        role="log"
        className="flex flex-col divide-y divide-destructive/10 max-h-48 overflow-y-auto"
      >
        {errors.map((err) => (
          <div key={err.id} className="px-3 py-1.5">
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
