import { describe, expect, it } from "vitest";
import {
  clampWatchBox,
  createWatchChannelState,
  normalizeLuminancePatch,
  recordSettledPatch,
} from "@/features/admin/lib/servo-motion-watch";
import type {
  KitServoStressTarget,
  KitWatchChannelState,
} from "@/lib/interfaces/kit-test";

const PATCH_PIXELS = 64;

function hornPatch(hornStartPixel: number) {
  const rgba = new Uint8ClampedArray(PATCH_PIXELS * 4);
  for (let pixel = 0; pixel < PATCH_PIXELS; pixel++) {
    const value =
      pixel >= hornStartPixel && pixel < hornStartPixel + 16 ? 230 : 30;
    rgba.set([value, value, value, 255], pixel * 4);
  }
  return normalizeLuminancePatch(rgba);
}

const MIN_PATCH = hornPatch(0);
const MAX_PATCH = hornPatch(40);
const HALFWAY_PATCH = hornPatch(20);

function run(
  steps: [KitServoStressTarget, Float32Array | null][],
): { state: KitWatchChannelState; stops: boolean[] } {
  let state = createWatchChannelState();
  const stops: boolean[] = [];
  for (const [target, patch] of steps) {
    const result = recordSettledPatch(state, target, patch);
    state = result.state;
    stops.push(result.isStopped);
  }
  return { state, stops };
}

describe("servo motion watch", () => {
  it("rejects a flat patch with no contrast", () => {
    expect(
      normalizeLuminancePatch(new Uint8ClampedArray(PATCH_PIXELS * 4).fill(120)),
    ).toBeNull();
  });

  it("learns both positions, then keeps watching a servo that reaches them", () => {
    const { state, stops } = run([
      ["min", MIN_PATCH],
      ["max", MAX_PATCH],
      ["min", MIN_PATCH],
      ["max", MAX_PATCH],
    ]);
    expect(state.status).toBe("watching");
    expect(state.lastMovementPercent).toBe(100);
    expect(stops).toEqual([false, false, false, false]);
  });

  it("stops a servo frozen at one end after 3 moves in a row", () => {
    const { state, stops } = run([
      ["min", MIN_PATCH],
      ["max", MAX_PATCH],
      ["min", MAX_PATCH],
      ["max", MAX_PATCH],
      ["min", MAX_PATCH],
    ]);
    expect(state.lastMovementPercent).toBe(0);
    expect(stops).toEqual([false, false, false, false, true]);
  });

  it("keeps watching a servo that still swings partway", () => {
    const { state, stops } = run([
      ["min", MIN_PATCH],
      ["max", MAX_PATCH],
      ["min", HALFWAY_PATCH],
      ["max", MAX_PATCH],
      ["min", HALFWAY_PATCH],
      ["max", MAX_PATCH],
    ]);
    expect(state.consecutiveMisses).toBe(0);
    expect(stops.every((isStopped) => !isStopped)).toBe(true);
  });

  describe("a small pusher arm inside a large, busy box", () => {
    const boxPixels = 2400;
    const armPixels = 30;
    const left = 300;
    const right = 1900;
    const seededNoise = (seed: number) => {
      let value = seed;
      return () => {
        value = (value * 1103515245 + 12345) % 2147483648;
        return value / 2147483648;
      };
    };
    const background = Array.from({ length: boxPixels }, seededNoise(7)).map(
      (random) => 60 + random * 160,
    );
    const frame = (
      armStart: number,
      noiseSeed: number,
      armValue = 20,
      brightnessShift = 0,
    ) => {
      const noise = seededNoise(noiseSeed);
      const rgba = new Uint8ClampedArray(boxPixels * 4);
      for (let pixel = 0; pixel < boxPixels; pixel++) {
        const isArm = pixel >= armStart && pixel < armStart + armPixels;
        const value =
          (isArm ? armValue : background[pixel]) +
          brightnessShift +
          (noise() - 0.5) * 12;
        rgba.set([value, value, value, 255], pixel * 4);
      }
      return normalizeLuminancePatch(rgba);
    };

    it("stops it 3 moves after it freezes", () => {
      const { state, stops } = run([
        ["min", frame(left, 1)],
        ["max", frame(right, 2)],
        ["min", frame(left, 3)],
        ["max", frame(right, 4)],
        ["min", frame(right, 5)],
        ["max", frame(right, 6)],
        ["min", frame(right, 7)],
      ]);
      expect(state.status).toBe("watching");
      expect(stops).toEqual([false, false, false, false, false, false, true]);
    });

    it("follows slow lighting and contrast drift without a false stop", () => {
      const cycles = 80;
      const steps: [KitServoStressTarget, Float32Array | null][] = [];
      for (let cycle = 0; cycle < cycles; cycle++) {
        const armValue = 20 + cycle * 1.2;
        const brightnessShift = -cycle * 0.4;
        steps.push(["min", frame(left, cycle * 2 + 1, armValue, brightnessShift)]);
        steps.push(["max", frame(right, cycle * 2 + 2, armValue, brightnessShift)]);
      }
      const frozenArmValue = 20 + cycles * 1.2;
      for (let move = 0; move < 3; move++) {
        steps.push([
          move % 2 === 0 ? "min" : "max",
          frame(right, 500 + move, frozenArmValue, -cycles * 0.4),
        ]);
      }
      const { stops } = run(steps);
      expect(stops.indexOf(true)).toBe(steps.length - 1);
    });
  });

  it("gives up on a servo the camera can't see move", () => {
    const { state, stops } = run([
      ["min", MIN_PATCH],
      ["max", MIN_PATCH],
      ["min", MAX_PATCH],
    ]);
    expect(state.status).toBe("noMotion");
    expect(stops).toEqual([false, false, false]);
  });

  it("keeps boxes inside the frame", () => {
    expect(clampWatchBox({ x: 0.95, y: -0.2, width: 0.2, height: 0.001 })).toEqual({
      x: 0.8,
      y: 0,
      width: 0.2,
      height: 0.03,
    });
  });
});
