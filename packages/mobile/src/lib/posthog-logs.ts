import { posthog } from "@/lib/posthog";

type PostHogLogAttributes = Record<string, boolean | number | string>;

export const posthogLog = {
  info(message: string, attributes?: PostHogLogAttributes): void {
    posthog?.logger.info(message, attributes);
  },
};
