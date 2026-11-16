export function createKeyedRefreshThrottle(throttleMs: number) {
  const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();
  const lastRefreshAt = new Map<string, number>();
  return (key: string, refresh: () => void) => {
    if (pendingRefreshes.has(key)) return;
    const elapsed = Date.now() - (lastRefreshAt.get(key) ?? 0);
    pendingRefreshes.set(
      key,
      setTimeout(
        () => {
          pendingRefreshes.delete(key);
          lastRefreshAt.set(key, Date.now());
          refresh();
        },
        Math.max(0, throttleMs - elapsed),
      ),
    );
  };
}
