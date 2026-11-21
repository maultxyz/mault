import { ORDER_PICK_LINK_MAX_ORDERS } from "@magic-vault/shared";

const ACTIVE_PICK_BATCH_KEY = "pick-batch:active";

export function readActivePickBatch(): string[] {
  try {
    const raw = sessionStorage.getItem(ACTIVE_PICK_BATCH_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((guid): guid is string => typeof guid === "string")
      .slice(0, ORDER_PICK_LINK_MAX_ORDERS);
  } catch {
    return [];
  }
}

export function writeActivePickBatch(orderGuids: string[]): void {
  try {
    sessionStorage.setItem(
      ACTIVE_PICK_BATCH_KEY,
      JSON.stringify(orderGuids.slice(0, ORDER_PICK_LINK_MAX_ORDERS)),
    );
  } catch {}
}

export function clearActivePickBatch(): void {
  try {
    sessionStorage.removeItem(ACTIVE_PICK_BATCH_KEY);
  } catch {}
}
