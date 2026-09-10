import type { SerialCommand, SerialEventReport } from "@magic-vault/shared";

const COMMAND_LABELS: Record<SerialCommand, string> = {
  connect: "Connection",
  test: "Device Test",
  feeder: "Feed",
  "auto-feed": "Auto-Feed",
  bin: "Sorter",
  jam: "Sorter",
};

function contextLines(event: SerialEventReport): string[] {
  const lines: string[] = [];
  if (event.cardName) lines.push(`**Card:** ${event.cardName}`);
  if (event.binNumber !== undefined) lines.push(`**Bin:** ${event.binNumber}`);
  return lines;
}

export function classifySerialEvent(
  event: SerialEventReport,
): { title: string; description: string } | null {
  const label = COMMAND_LABELS[event.command];
  const lines = contextLines(event);

  if (!event.sent) {
    return {
      title: `${label} Failed`,
      description: [
        ...lines,
        "**Error:** Could not send command to the device.",
      ].join("\n"),
    };
  }

  if (!event.response) {
    return {
      title: `${label} Timeout`,
      description: [
        ...lines,
        "**Error:** No response from the device in time.",
      ].join("\n"),
    };
  }

  if (typeof event.response !== "object") {
    return {
      title: `${label} Error`,
      description: [
        ...lines,
        `**Error:** Unexpected response: ${String(event.response)}`,
      ].join("\n"),
    };
  }

  const res = event.response as Record<string, unknown>;

  if (res.error === "jam") {
    return {
      title: "Card Jam Detected",
      description: `Card stuck at module ${res.module}${res.bin ? ` (heading to bin ${res.bin})` : ""}. Check the sorter and resume.`,
    };
  }

  if (res.empty) {
    return {
      title: "Feeder Empty",
      description: [
        ...lines,
        "No cards remaining in the hopper. Add more cards to continue.",
      ].join("\n"),
    };
  }

  if (res.error) {
    return {
      title: `${label} Error`,
      description: [...lines, `**Error:** ${String(res.error)}`].join("\n"),
    };
  }

  return null;
}
