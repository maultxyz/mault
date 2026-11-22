import type { ShareLinkLengths } from "../interfaces/share-link-lengths.interface";
import { MONITOR_LINK_EXPIRY_DAYS } from "./monitor-links.constant";

export const DEFAULT_TRADE_LINK_HOURS = 1;
export const DEFAULT_RESTRICTED_SHARE_LINK_HOURS = 1;
export const SHARE_LINK_HOURS_MAX = 720;
export const MONITOR_LINK_EXPIRY_DAYS_MAX = 365;
export const MONITOR_LINK_EXPIRY_OPTIONS_MAX = 6;
export const HOURS_PER_DAY = 24;
export const MONITOR_LINK_EXPIRY_DAYS_TEXT_SEPARATOR = /[\s,]+/;
export const MONITOR_LINK_EXPIRY_DAYS_TEXT_JOINER = ", ";
export const DEFAULT_SHARE_LINK_LENGTHS: ShareLinkLengths = {
  tradeLinkHours: DEFAULT_TRADE_LINK_HOURS,
  restrictedShareLinkHours: DEFAULT_RESTRICTED_SHARE_LINK_HOURS,
  monitorLinkExpiryDays: [...MONITOR_LINK_EXPIRY_DAYS],
};
