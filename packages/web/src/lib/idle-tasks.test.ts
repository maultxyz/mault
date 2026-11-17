import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTasksOneByOneWhenIdle, scheduleIdleTask } from "@/lib/idle-tasks";

describe("scheduleIdleTask", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the task after the timeout when idle callbacks are missing", () => {
    const task = vi.fn();
    scheduleIdleTask(task, 100);
    vi.advanceTimersByTime(99);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledOnce();
  });

  it("never runs a cancelled task", () => {
    const task = vi.fn();
    const cancel = scheduleIdleTask(task, 100);
    cancel();
    vi.advanceTimersByTime(200);
    expect(task).not.toHaveBeenCalled();
  });
});

describe("runTasksOneByOneWhenIdle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts each task only after the previous one settles", async () => {
    const startedTasks: string[] = [];
    let finishFirstTask: () => void = () => {};
    const firstTask = () => {
      startedTasks.push("first");
      return new Promise<void>((resolve) => {
        finishFirstTask = resolve;
      });
    };
    const secondTask = () => {
      startedTasks.push("second");
      return Promise.reject(new Error("chunk failed"));
    };
    const thirdTask = () => {
      startedTasks.push("third");
      return Promise.resolve();
    };
    runTasksOneByOneWhenIdle([firstTask, secondTask, thirdTask], 10);
    await vi.advanceTimersByTimeAsync(50);
    expect(startedTasks).toEqual(["first"]);
    finishFirstTask();
    await vi.advanceTimersByTimeAsync(50);
    expect(startedTasks).toEqual(["first", "second", "third"]);
  });

  it("stops starting tasks once cancelled", async () => {
    const task = vi.fn(() => Promise.resolve());
    const cancel = runTasksOneByOneWhenIdle([task, task], 10);
    await vi.advanceTimersByTimeAsync(10);
    cancel();
    await vi.advanceTimersByTimeAsync(50);
    expect(task).toHaveBeenCalledOnce();
  });
});
