import { BUY_START_MEMORY_STORAGE_KEY } from "@/lib/constants/business";
import type { BuyStartMemory } from "@/lib/interfaces/business";

function memoryKey(orgId: string): string {
  return `${BUY_START_MEMORY_STORAGE_KEY}:${orgId}`;
}

export function readBuyStartMemory(orgId: string | undefined): BuyStartMemory | null {
  if (!orgId) return null;
  try {
    const raw = localStorage.getItem(memoryKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BuyStartMemory>;
    return {
      collectionGuid: typeof parsed.collectionGuid === "string" ? parsed.collectionGuid : "",
      storageLocationGuid:
        typeof parsed.storageLocationGuid === "string" ? parsed.storageLocationGuid : "",
    };
  } catch {
    return null;
  }
}

export function writeBuyStartMemory(orgId: string | undefined, memory: BuyStartMemory): void {
  if (!orgId) return;
  try {
    localStorage.setItem(memoryKey(orgId), JSON.stringify(memory));
  } catch {
    return;
  }
}
