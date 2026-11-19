const betterStackErrorsDsn = process.env.BETTER_STACK_ERRORS_DSN;

async function loadBetterStackErrorTracking(dsn: string) {
  const Sentry = await import("@sentry/node");
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
    },
    enableRuntimeChannelInjection: false,
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.contextLinesIntegration(),
      Sentry.nodeContextIntegration(),
    ],
  });
  return Sentry;
}

const betterStackErrorTracking = betterStackErrorsDsn
  ? loadBetterStackErrorTracking(betterStackErrorsDsn).catch((error: unknown) => {
      console.error("[error-reporting] Better Stack failed to load:", error);
      return null;
    })
  : null;

export function reportServerError(
  error: unknown,
  properties: Record<string, unknown> = {},
  userId?: string,
) {
  void betterStackErrorTracking?.then((Sentry) =>
    Sentry?.captureException(error, {
      extra: properties,
      user: userId ? { id: userId } : undefined,
    }),
  );
}
