import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKeyedRefreshThrottle } from "@/lib/keyed-refresh-throttle";

describe("createKeyedRefreshThrottle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the first refresh right away and folds a burst into one trailing refresh", () => {
    const throttle = createKeyedRefreshThrottle(1_000);
    const refresh = vi.fn();
    throttle("org", refresh);
    vi.advanceTimersByTime(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    throttle("org", refresh);
    throttle("org", refresh);
    throttle("org", refresh);
    vi.advanceTimersByTime(999);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("throttles each key on its own", () => {
    const throttle = createKeyedRefreshThrottle(1_000);
    const refreshFirst = vi.fn();
    const refreshSecond = vi.fn();
    throttle("first", refreshFirst);
    throttle("second", refreshSecond);
    vi.advanceTimersByTime(0);
    expect(refreshFirst).toHaveBeenCalledOnce();
    expect(refreshSecond).toHaveBeenCalledOnce();
  });
});
