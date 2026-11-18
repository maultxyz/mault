import { describe, expect, it } from "vitest";
import {
  applyLedUpdate,
  createDefaultLedStates,
  ledPreviewColor,
  parseFirmwareLedStates,
} from "@/features/admin/lib/kit-led-states";

describe("parseFirmwareLedStates", () => {
  it("splits the getLeds reply into strips", () => {
    const leds = Array.from({ length: 16 }, (_, index) => [
      index % 2,
      index * 10,
      1,
      2,
      3,
      200,
    ]);
    const states = parseFirmwareLedStates(
      JSON.stringify({ ledStrips: 2, ledsPerStrip: 8, leds }),
    );
    expect(states).toHaveLength(2);
    expect(states?.[1][0]).toEqual({
      on: false,
      red: 80,
      green: 1,
      blue: 2,
      white: 3,
      brightness: 200,
    });
    expect(states?.[0][1]).toMatchObject({ on: true, red: 10 });
  });

  it("rejects malformed replies", () => {
    expect(parseFirmwareLedStates("not json")).toBeNull();
    expect(parseFirmwareLedStates('{"error":"unknown command"}')).toBeNull();
    expect(parseFirmwareLedStates('{"leds":[[1,0,0]]}')).toBeNull();
    expect(
      parseFirmwareLedStates(
        JSON.stringify({ leds: Array.from({ length: 16 }, () => [1, 0, 0]) }),
      ),
    ).toBeNull();
  });
});

describe("applyLedUpdate", () => {
  it("changes one LED when led is given", () => {
    const states = applyLedUpdate(createDefaultLedStates(), {
      strip: 2,
      led: 3,
      on: true,
      green: 120,
    });
    expect(states[1][2]).toMatchObject({ on: true, green: 120 });
    expect(states[1][1].on).toBe(false);
    expect(states[0][2].on).toBe(false);
  });

  it("changes the whole strip when led is omitted", () => {
    const states = applyLedUpdate(createDefaultLedStates(), {
      strip: 1,
      on: true,
    });
    expect(states[0].every((led) => led.on)).toBe(true);
    expect(states[1].some((led) => led.on)).toBe(false);
  });
});

describe("ledPreviewColor", () => {
  it("adds white to every color channel, capped at full", () => {
    expect(
      ledPreviewColor(
        { on: true, red: 200, green: 0, blue: 10, white: 100, brightness: 255 },
        1,
      ),
    ).toBe("rgb(255 100 110 / 1)");
  });
});
