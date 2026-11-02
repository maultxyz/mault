export class UpgradeRequiredError extends Error {}

export function upgradeRequiredMessage(error: unknown): string | undefined {
  return error instanceof UpgradeRequiredError ? error.message : undefined;
}
