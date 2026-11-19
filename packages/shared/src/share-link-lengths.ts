import { DEFAULT_MONITOR_LINK_EXPIRY_DAYS } from "./constants/monitor-links.constant";
import {
  HOURS_PER_DAY,
  MONITOR_LINK_EXPIRY_DAYS_MAX,
  MONITOR_LINK_EXPIRY_DAYS_TEXT_SEPARATOR,
} from "./constants/share-link-lengths.constant";
import type { ShareLinkDuration } from "./interfaces/share-link-lengths.interface";

export function defaultMonitorLinkExpiryDays(options: readonly number[]): number {
  return options.includes(DEFAULT_MONITOR_LINK_EXPIRY_DAYS)
    ? DEFAULT_MONITOR_LINK_EXPIRY_DAYS
    : options[0];
}

export function longestMonitorLinkExpiryDays(options: readonly number[]): number {
  return Math.max(...options);
}

export function shareLinkDurationOfHours(hours: number): ShareLinkDuration {
  return hours % HOURS_PER_DAY === 0
    ? { unit: "days", count: hours / HOURS_PER_DAY }
    : { unit: "hours", count: hours };
}

export function parseMonitorLinkExpiryDaysText(text: string): number[] | null {
  const parts = text.split(MONITOR_LINK_EXPIRY_DAYS_TEXT_SEPARATOR).filter(Boolean);
  const days = parts.map(Number);
  if (
    days.length === 0 ||
    days.some((day) => !Number.isInteger(day) || day < 1 || day > MONITOR_LINK_EXPIRY_DAYS_MAX)
  ) {
    return null;
  }
  return [...new Set(days)].sort((a, b) => a - b);
}
