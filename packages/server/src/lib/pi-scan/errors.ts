import type { PiScanSessionStartCode } from "@magic-vault/shared";

export class PiScanStartError extends Error {
  constructor(
    message: string,
    readonly code: PiScanSessionStartCode,
    readonly status: 400 | 409 = 409,
  ) {
    super(message);
  }
}

export class PiScanActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
