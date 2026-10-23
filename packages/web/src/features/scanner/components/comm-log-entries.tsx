import { useTranslation } from "react-i18next";
import type { CommLogEntriesProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";

export function CommLogEntries({ entries }: CommLogEntriesProps) {
  const { t } = useTranslation("scanner");
  return (
    <ol className="font-mono text-xs">
      {entries.map((entry, index) => {
        const key = `${entry.timestamp}-${index}`;
        const time = new Date(entry.timestamp).toLocaleTimeString();
        if (entry.direction === "sent" || entry.direction === "received") {
          return (
            <li
              key={key}
              className="flex gap-2 border-b px-2 py-1 last:border-b-0"
            >
              <span className="shrink-0 text-foreground/70 tabular-nums">
                {time}
              </span>
              <span
                className={cn(
                  "shrink-0",
                  entry.direction === "sent"
                    ? "text-primary"
                    : "text-success-foreground",
                )}
              >
                {entry.direction === "sent" ? "→" : "←"}
              </span>
              <span className="break-all text-foreground">{entry.text}</span>
            </li>
          );
        }
        return (
          <li
            key={key}
            className={cn(
              "flex gap-2 border-b px-2 py-1.5 font-sans font-semibold last:border-b-0",
              entry.direction === "connected"
                ? "bg-info-muted text-info-foreground"
                : entry.direction === "restarted"
                  ? "bg-warning-muted text-warning-foreground"
                  : "bg-muted text-foreground",
            )}
          >
            <span className="shrink-0 font-mono font-normal tabular-nums">
              {time}
            </span>
            <span>
              {t(`serial.commLogMarker.${entry.direction}`, {
                transport: t(`mobileSorter.transport.${entry.text}`),
                reason: entry.text,
              })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
