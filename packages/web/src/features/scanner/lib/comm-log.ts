import { COMM_LOG_MARKER_LABELS } from "@/lib/constants/scanner";
import { type CommLogEntry } from "@magic-vault/shared";


export function formatCommLog(entries: CommLogEntry[]): string {
  const lines = [
    "Mault Device Communication Log",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];
  for (const entry of entries) {
    if (COMM_LOG_MARKER_LABELS[entry.direction]) {
      lines.push(
        "",
        `===== [${new Date(entry.timestamp).toISOString()}] ${COMM_LOG_MARKER_LABELS[entry.direction]} (${entry.text}) =====`,
      );
      continue;
    }
    const arrow = entry.direction === "sent" ? "→" : "←";
    lines.push(
      `[${new Date(entry.timestamp).toISOString()}] ${arrow} ${entry.text}`,
    );
  }
  return lines.join("\n");
}
