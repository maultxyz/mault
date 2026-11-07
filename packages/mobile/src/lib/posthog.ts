import PostHog from "posthog-react-native";
import { POSTHOG_HOST, POSTHOG_PROJECT_TOKEN } from "@/lib/constants/config";

const missingVariable = !POSTHOG_PROJECT_TOKEN
  ? "POSTHOG_PROJECT_TOKEN"
  : !POSTHOG_HOST
    ? "POSTHOG_HOST"
    : undefined;

if (missingVariable && __DEV__) {
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export const posthog =
  POSTHOG_PROJECT_TOKEN && POSTHOG_HOST
    ? new PostHog(POSTHOG_PROJECT_TOKEN, {
        host: POSTHOG_HOST,
        captureAppLifecycleEvents: true,
        debug: __DEV__,
        logs: {
          serviceName: "mault-mobile",
          environment: __DEV__ ? "development" : "production",
        },
        errorTracking: {
          autocapture: {
            uncaughtExceptions: true,
            unhandledRejections: true,
            console: [],
          },
        },
        preloadFeatureFlags: true,
      })
    : undefined;
