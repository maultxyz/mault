import Rollbar from "rollbar";

export const rollbar = new Rollbar({
  accessToken: import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN,
  enabled: !!import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN,
  environment: import.meta.env.VITE_APP_ENV,
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
