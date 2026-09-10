export { MAX_COMM_LOG_ENTRIES } from "@/lib/constants/limits";

export interface CommLogEntry {
  direction: "sent" | "received";
  text: string;
  timestamp: number;
}

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
