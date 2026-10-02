import type { CommLogEntriesProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";

export function CommLogEntries({ entries }: CommLogEntriesProps) {
  return (
    <ol className="font-mono text-xs">
      {entries.map((entry, index) => (
        <li
          key={`${entry.timestamp}-${index}`}
          className="flex gap-2 border-b px-2 py-1 last:border-b-0"
        >
          <span className="shrink-0 text-foreground/70 tabular-nums">
            {new Date(entry.timestamp).toLocaleTimeString()}
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
      ))}
    </ol>
  );
}
