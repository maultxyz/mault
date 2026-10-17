import Rollbar from "rollbar";
import { runtimeEnv } from "@/lib/runtime-env";

export const rollbar = new Rollbar({
  accessToken: runtimeEnv("VITE_ROLLBAR_ACCESS_TOKEN"),
  enabled: !!runtimeEnv("VITE_ROLLBAR_ACCESS_TOKEN"),
  environment: runtimeEnv("VITE_APP_ENV"),
  version: __APP_VERSION__,
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    client: {
      javascript: {
        code_version: __APP_VERSION__,
        source_map_enabled: true,
      },
    },
  },
});
