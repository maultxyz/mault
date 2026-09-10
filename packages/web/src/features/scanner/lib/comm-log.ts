export { MAX_COMM_LOG_ENTRIES } from "@/lib/constants/limits";
import type { CommLogEntry } from "@/lib/interfaces/scanner";

export type { CommLogEntry };

export function formatCommLog(entries: CommLogEntry[]): string {
  const lines = [
    "Magic Vault Serial Communication Log",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];
  for (const entry of entries) {
    const arrow = entry.direction === "sent" ? "→" : "←";
    lines.push(
      `[${new Date(entry.timestamp).toISOString()}] ${arrow} ${entry.text}`,
    );
  }
  return lines.join("\n");
}
