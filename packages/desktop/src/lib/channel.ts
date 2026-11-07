import { DESKTOP_CHANNEL_SETTINGS } from "./constants/desktop";
import type { DesktopChannel } from "./interfaces/desktop";

function readBuildChannel(): DesktopChannel {
  const channel = process.env.MAULT_DESKTOP_CHANNEL;
  if (channel === "production" || channel === "development") return channel;
  throw new Error(`Unknown desktop channel: ${channel}`);
}

export const DESKTOP_CHANNEL = readBuildChannel();
export const CHANNEL_SETTINGS = DESKTOP_CHANNEL_SETTINGS[DESKTOP_CHANNEL];
