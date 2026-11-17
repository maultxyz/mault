import { createHash, timingSafeEqual } from "node:crypto";

function digestOf(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function secretsMatch(expectedSecret: string, providedSecret: string): boolean {
  return timingSafeEqual(digestOf(expectedSecret), digestOf(providedSecret));
}
