import type { CommLogEntry } from "@/lib/interfaces/scanner";


export function formatCommLog(entries: CommLogEntry[]): string {
  const lines = [
    "Magic Vault Device Communication Log",
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
