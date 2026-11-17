export function scheduleIdleTask(
  task: () => void,
  idleTimeoutMs: number,
): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const idleHandle = window.requestIdleCallback(task, {
      timeout: idleTimeoutMs,
    });
    return () => window.cancelIdleCallback(idleHandle);
  }
  const timeoutHandle = window.setTimeout(task, idleTimeoutMs);
  return () => window.clearTimeout(timeoutHandle);
}

export function runTasksOneByOneWhenIdle(
  tasks: ReadonlyArray<() => Promise<unknown>>,
  idleTimeoutMs: number,
): () => void {
  let isCancelled = false;
  let cancelScheduledTask = () => {};
  const runTaskAt = (taskIndex: number) => {
    if (isCancelled || taskIndex >= tasks.length) return;
    cancelScheduledTask = scheduleIdleTask(() => {
      if (isCancelled) return;
      tasks[taskIndex]()
        .catch(() => undefined)
        .finally(() => runTaskAt(taskIndex + 1));
    }, idleTimeoutMs);
  };
  runTaskAt(0);
  return () => {
    isCancelled = true;
    cancelScheduledTask();
  };
}
