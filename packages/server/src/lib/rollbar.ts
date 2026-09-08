import Rollbar from "rollbar";

export const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_SERVER_TOKEN,
  enabled: !!process.env.ROLLBAR_SERVER_TOKEN,
  environment: process.env.NODE_ENV ?? "development",
  captureUncaught: true,
  captureUnhandledRejections: true,
});
