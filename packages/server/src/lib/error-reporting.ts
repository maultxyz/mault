import { PostHog } from "posthog-node";
import { POSTHOG_DEFAULT_HOST } from "./constants/error-reporting";

const posthogProjectApiKey = process.env.POSTHOG_PROJECT_API_KEY;

const posthog = posthogProjectApiKey
  ? new PostHog(posthogProjectApiKey, {
      host: process.env.POSTHOG_HOST || POSTHOG_DEFAULT_HOST,
      enableExceptionAutocapture: true,
    })
  : null;

export function reportServerError(
  error: unknown,
  properties: Record<string, unknown> = {},
  distinctId?: string,
) {
  posthog?.captureException(error, distinctId, {
    environment: process.env.NODE_ENV ?? "development",
    ...properties,
  });
}
