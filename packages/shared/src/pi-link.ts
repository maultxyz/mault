import {
  PI_LINK_PAIRING_CODE_LENGTH,
  PI_LINK_PAIRING_CODE_PATTERN,
} from "./constants/pi-link.constant";

export function normalizePiPairingCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isPiPairingCode(input: string): boolean {
  return PI_LINK_PAIRING_CODE_PATTERN.test(normalizePiPairingCode(input));
}

export function formatPiPairingCode(code: string): string {
  const half = PI_LINK_PAIRING_CODE_LENGTH / 2;
  return `${code.slice(0, half)}-${code.slice(half)}`;
}
