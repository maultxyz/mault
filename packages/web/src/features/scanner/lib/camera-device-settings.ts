function loadAll(storageKey: string): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {};
}

export function loadDeviceSetting(
  storageKey: string,
  deviceId: string | null,
): number | null {
  if (!deviceId) return null;
  const value = loadAll(storageKey)[deviceId];
  return typeof value === "number" ? value : null;
}

export function saveDeviceSetting(
  storageKey: string,
  deviceId: string | null,
  value: number | null,
) {
  if (!deviceId) return;
  const all = loadAll(storageKey);
  if (value === null) delete all[deviceId];
  else all[deviceId] = value;
  try {
    localStorage.setItem(storageKey, JSON.stringify(all));
  } catch {}
}
