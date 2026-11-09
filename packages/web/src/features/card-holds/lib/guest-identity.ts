import {
  CARD_HOLD_GUEST_KEY_BYTES,
  CARD_HOLD_GUEST_KEY_STORAGE_KEY,
  CARD_HOLD_GUEST_NAME_STORAGE_KEY,
} from "@/lib/constants/share-links";

let sessionGuestKey: string | null = null;

function newGuestKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CARD_HOLD_GUEST_KEY_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function cardHoldGuestKey(): string {
  try {
    const stored = localStorage.getItem(CARD_HOLD_GUEST_KEY_STORAGE_KEY);
    if (stored) return stored;
    const created = newGuestKey();
    localStorage.setItem(CARD_HOLD_GUEST_KEY_STORAGE_KEY, created);
    return created;
  } catch {
    sessionGuestKey ??= newGuestKey();
    return sessionGuestKey;
  }
}

export function rememberedGuestName(): string {
  try {
    return localStorage.getItem(CARD_HOLD_GUEST_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberGuestName(guestName: string): void {
  try {
    localStorage.setItem(CARD_HOLD_GUEST_NAME_STORAGE_KEY, guestName);
  } catch {}
}
