import posthog from "posthog-js";
import "posthog-js/dist/exception-autocapture";
import { POSTHOG_DEFAULT_HOST } from "@/lib/constants/error-reporting";
import { runtimeEnv } from "@/lib/runtime-env";

const posthogProjectApiKey = runtimeEnv("VITE_POSTHOG_PROJECT_API_KEY");

if (posthogProjectApiKey) {
  posthog.init(posthogProjectApiKey, {
    api_host: runtimeEnv("VITE_POSTHOG_HOST") || POSTHOG_DEFAULT_HOST,
    persistence: "memory",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    capture_exceptions: true,
  });
  posthog.register({
    environment: runtimeEnv("VITE_APP_ENV"),
    app_version: __APP_VERSION__,
  });
}

export function reportClientError(error: unknown) {
  if (!posthogProjectApiKey) return;
  posthog.captureException(error);
}
