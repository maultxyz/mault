import {
  SHARE_LINK_GUEST_KEY_MAX_LENGTH,
  SHARE_LINK_GUEST_KEY_MIN_LENGTH,
} from "@magic-vault/shared";
import { createHash } from "node:crypto";

export function hashGuestKey(guestKey: string): string {
  return createHash("sha256").update(guestKey).digest("hex");
}

export function guestKeyHashFromHeader(headerValue: string | undefined): string | null {
  if (
    !headerValue ||
    headerValue.length < SHARE_LINK_GUEST_KEY_MIN_LENGTH ||
    headerValue.length > SHARE_LINK_GUEST_KEY_MAX_LENGTH
  ) {
    return null;
  }
  return hashGuestKey(headerValue);
}
