import type {
  DeviceAlertType,
  SerialCommand,
  SerialEventReport,
} from "@magic-vault/shared";

const COMMAND_LABELS: Record<SerialCommand, string> = {
  connect: "Connection",
  test: "Device Test",
  feeder: "Feed",
  "auto-feed": "Auto-Feed",
  bin: "Sorter",
  jam: "Sorter",
  reset: "Sorter",
};

const RESET_REASON_LABELS: Record<string, string> = {
  power_on: "Power was cut or the board was plugged in.",
  external: "The reset button or reset pin was used.",
  software: "The firmware restarted itself, or it was flashed.",
  watchdog: "The board froze and the watchdog restarted it.",
  brownout:
    "The supply voltage dipped. Check the servo power supply and wiring.",
  panic: "The firmware crashed.",
  usb: "The USB connection reset the board.",
};

function contextLines(event: SerialEventReport): string[] {
  const lines: string[] = [];
  if (event.cardName) lines.push(`**Card:** ${event.cardName}`);
  if (event.binNumber !== undefined) lines.push(`**Bin:** ${event.binNumber}`);
  return lines;
}

export function classifySerialEvent(
  event: SerialEventReport,
): { type: DeviceAlertType; title: string; description: string } | null {
  const label = COMMAND_LABELS[event.command];
  const lines = contextLines(event);

  if (event.command === "reset") {
    const reason =
      typeof event.response === "object" && event.response !== null
        ? (event.response as Record<string, unknown>).resetReason
        : undefined;
    return {
      type: "restart",
      title: "Sorter Restarted",
      description: [
        ...lines,
        `**Cause:** ${
          (typeof reason === "string" && RESET_REASON_LABELS[reason]) ||
          "Unknown."
        }`,
      ].join("\n"),
    };
  }

  if (!event.sent) {
    return {
      type: "error",
      title: `${label} Failed`,
      description: [
        ...lines,
        "**Error:** Could not send command to the device.",
      ].join("\n"),
    };
  }

  if (!event.response) {
    return {
      type: "timeout",
      title: `${label} Timeout`,
      description: [
        ...lines,
        "**Error:** No response from the device in time.",
      ].join("\n"),
    };
  }

  if (typeof event.response !== "object") {
    return {
      type: "error",
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
      type: "jam",
      title: "Card Jam Detected",
      description: `Card stuck at module ${res.module}${res.bin ? ` (heading to bin ${res.bin})` : ""}. Check the sorter and resume.`,
    };
  }

  if (res.empty) {
    return {
      type: "feeder_empty",
      title: "Feeder Empty",
      description: [
        ...lines,
        "No cards remaining in the hopper. Add more cards to continue.",
      ].join("\n"),
    };
  }

  if (res.error) {
    return {
      type: "error",
      title: `${label} Error`,
      description: [...lines, `**Error:** ${String(res.error)}`].join("\n"),
    };
  }

  return null;
}
