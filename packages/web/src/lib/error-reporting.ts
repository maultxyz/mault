import { ERROR_REPORT_URL_BREADCRUMB_KEYS } from "@/lib/constants/error-reporting";
import { ERROR_REPORTING_IDLE_LOAD_TIMEOUT_MS } from "@/lib/constants/timing";
import { scheduleIdleTask } from "@/lib/idle-tasks";
import { runtimeEnv } from "@/lib/runtime-env";

const betterStackErrorsDsn = runtimeEnv("VITE_BETTER_STACK_ERRORS_DSN");

function withoutUrlQuery(url: string): string {
  const queryStart = url.search(/[?#]/);
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

function waitUntilBrowserIsIdle(): Promise<void> {
  return new Promise((resolve) =>
    scheduleIdleTask(resolve, ERROR_REPORTING_IDLE_LOAD_TIMEOUT_MS),
  );
}

async function loadBetterStackErrorTracking(dsn: string) {
  await waitUntilBrowserIsIdle();
  const { init, captureException } = await import("@sentry/browser");
  init({
    dsn,
    environment: runtimeEnv("VITE_APP_ENV"),
    release: __APP_VERSION__,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
    },
    beforeBreadcrumb(breadcrumb) {
      const data = breadcrumb.data;
      if (data) {
        for (const key of ERROR_REPORT_URL_BREADCRUMB_KEYS) {
          const value: unknown = data[key];
          if (typeof value === "string") data[key] = withoutUrlQuery(value);
        }
      }
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request?.url) event.request.url = withoutUrlQuery(event.request.url);
      if (event.request) delete event.request.query_string;
      return event;
    },
    integrations: (defaultIntegrations) =>
      defaultIntegrations.filter(
        (integration) => integration.name !== "BrowserSession",
      ),
  });
  return { captureException };
}

const betterStackErrorTracking = betterStackErrorsDsn
  ? loadBetterStackErrorTracking(betterStackErrorsDsn).catch((error: unknown) => {
      console.error("[error-reporting] Better Stack failed to load:", error);
      return null;
    })
  : null;

export function reportClientError(error: unknown) {
  void betterStackErrorTracking?.then((errorTracking) =>
    errorTracking?.captureException(error),
  );
}
