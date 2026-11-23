import { redactedError, withoutQueryParamsText, withoutUrlQuery } from "./error-redaction";

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
    beforeSend(event) {
      for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = withoutQueryParamsText(exception.value);
      }
      if (event.message) event.message = withoutQueryParamsText(event.message);
      if (event.request?.url) event.request.url = withoutUrlQuery(event.request.url);
      if (event.request) delete event.request.query_string;
      return event;
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

function withoutUrlQueries(properties: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      key === "url" && typeof value === "string" ? withoutUrlQuery(value) : value,
    ]),
  );
}

export function reportServerError(
  error: unknown,
  properties: Record<string, unknown> = {},
  userId?: string,
) {
  void betterStackErrorTracking?.then((Sentry) =>
    Sentry?.captureException(redactedError(error), {
      extra: withoutUrlQueries(properties),
      user: userId ? { id: userId } : undefined,
    }),
  );
}
