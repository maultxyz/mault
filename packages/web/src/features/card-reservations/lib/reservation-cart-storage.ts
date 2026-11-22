import { RESERVATION_CART_STORAGE_KEY_PREFIX } from "@/lib/constants/card-reservations";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import type { PublicCard } from "@magic-vault/shared";

function cartStorageKey(source: PublicCardsSource): string {
  return `${RESERVATION_CART_STORAGE_KEY_PREFIX}${source.basePath}:${JSON.stringify(source.linkParams)}`;
}

export function readReservationCart(source: PublicCardsSource): PublicCard[] {
  try {
    const stored = sessionStorage.getItem(cartStorageKey(source));
    return stored ? (JSON.parse(stored) as PublicCard[]) : [];
  } catch {
    return [];
  }
}

export function saveReservationCart(source: PublicCardsSource, cart: PublicCard[]): void {
  try {
    if (cart.length === 0) sessionStorage.removeItem(cartStorageKey(source));
    else sessionStorage.setItem(cartStorageKey(source), JSON.stringify(cart));
  } catch {}
}
