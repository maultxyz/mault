export class TradeLinkUnavailableError extends Error {}

export function isInvalidLinkError(error: unknown): boolean {
  return error instanceof TradeLinkUnavailableError;
}
