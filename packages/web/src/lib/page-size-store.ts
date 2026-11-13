import { PAGE_SIZE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { COLLECTION_CARDS_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@magic-vault/shared";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function readStoredPageSize(): number {
  try {
    const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : COLLECTION_CARDS_PAGE_SIZE;
  } catch {
    return COLLECTION_CARDS_PAGE_SIZE;
  }
}

let currentPageSize = readStoredPageSize();

export function setPageSize(pageSize: number): void {
  currentPageSize = pageSize;
  try {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePageSize(): number {
  return useSyncExternalStore(subscribe, () => currentPageSize);
}
