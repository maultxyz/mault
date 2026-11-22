import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

function isUsableStorage(storage: Storage | undefined): boolean {
  try {
    return typeof storage?.getItem === "function";
  } catch {
    return false;
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  if (isUsableStorage(globalThis[name])) continue;
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
}

afterEach(() => {
  cleanup();
});
