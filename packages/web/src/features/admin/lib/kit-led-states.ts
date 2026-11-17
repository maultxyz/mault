import {
  LED_DEFAULT_BRIGHTNESS,
  LED_DEFAULT_HUE,
  LED_STRIP_COUNT,
  LEDS_PER_STRIP,
  type FirmwareLedState,
  type FirmwareLedUpdate,
} from "@magic-vault/shared";

export function createDefaultLedStates(): FirmwareLedState[][] {
  return Array.from({ length: LED_STRIP_COUNT }, () =>
    Array.from({ length: LEDS_PER_STRIP }, () => ({
      on: false,
      hue: LED_DEFAULT_HUE,
      brightness: LED_DEFAULT_BRIGHTNESS,
    })),
  );
}

export function parseFirmwareLedStates(
  line: string,
): FirmwareLedState[][] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  const entries = (parsed as { leds?: unknown } | null)?.leds;
  if (
    !Array.isArray(entries) ||
    entries.length !== LED_STRIP_COUNT * LEDS_PER_STRIP
  ) {
    return null;
  }
  const leds: FirmwareLedState[] = [];
  for (const entry of entries) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 3 ||
      !entry.every((value) => typeof value === "number")
    ) {
      return null;
    }
    const [on, hue, brightness] = entry as number[];
    leds.push({ on: on === 1, hue, brightness });
  }
  return Array.from({ length: LED_STRIP_COUNT }, (_, strip) =>
    leds.slice(strip * LEDS_PER_STRIP, (strip + 1) * LEDS_PER_STRIP),
  );
}

export function applyLedUpdate(
  states: FirmwareLedState[][],
  update: FirmwareLedUpdate,
): FirmwareLedState[][] {
  const { strip, led, ...changes } = update;
  return states.map((leds, stripIndex) =>
    stripIndex !== strip - 1
      ? leds
      : leds.map((state, ledIndex) =>
          led !== undefined && ledIndex !== led - 1
            ? state
            : { ...state, ...changes },
        ),
  );
}
