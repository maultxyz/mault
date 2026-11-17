import { runtimeEnv } from "@/lib/runtime-env";

const betterStackErrorsDsn = runtimeEnv("VITE_BETTER_STACK_ERRORS_DSN");

async function loadBetterStackErrorTracking(dsn: string) {
  const Sentry = await import("@sentry/browser");
  Sentry.init({
    dsn,
    environment: runtimeEnv("VITE_APP_ENV"),
    release: __APP_VERSION__,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
    },
    integrations: (defaultIntegrations) =>
      defaultIntegrations.filter(
        (integration) => integration.name !== "BrowserSession",
      ),
  });
  return Sentry;
}

const betterStackErrorTracking = betterStackErrorsDsn
  ? loadBetterStackErrorTracking(betterStackErrorsDsn).catch((error: unknown) => {
      console.error("[error-reporting] Better Stack failed to load:", error);
      return null;
    })
  : null;

export function reportClientError(error: unknown) {
  void betterStackErrorTracking?.then((Sentry) => Sentry?.captureException(error));
}
