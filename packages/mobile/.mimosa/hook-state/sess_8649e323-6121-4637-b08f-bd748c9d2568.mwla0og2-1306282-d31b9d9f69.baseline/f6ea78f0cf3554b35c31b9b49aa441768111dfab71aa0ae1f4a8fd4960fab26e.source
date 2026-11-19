import Storage from "expo-sqlite/kv-store";

export function readKv(key: string): string | null {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
}

export function writeKv(key: string, value: string | null): void {
  try {
    if (value == null) Storage.removeItemSync(key);
    else Storage.setItemSync(key, value);
  } catch {}
}

export function readKvJson<T>(key: string, fallback: T): T {
  const raw = readKv(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeKvJson(key: string, value: unknown): void {
  writeKv(key, JSON.stringify(value));
}
