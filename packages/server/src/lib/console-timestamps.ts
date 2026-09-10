const methods = ["log", "info", "warn", "error", "debug"] as const;

for (const method of methods) {
  const original = console[method].bind(console);
  console[method] = (...args: unknown[]) => {
    original(`[${new Date().toISOString()}]`, ...args);
  };
}
