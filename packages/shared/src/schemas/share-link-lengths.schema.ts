import { z } from "zod";
import {
  MONITOR_LINK_EXPIRY_DAYS_MAX,
  MONITOR_LINK_EXPIRY_OPTIONS_MAX,
  SHARE_LINK_HOURS_MAX,
} from "../constants/share-link-lengths.constant";
import { formValidationMessage } from "../form-validation";

export const shareLinkHoursSchema = z
  .number(formValidationMessage("valueRequired"))
  .int(formValidationMessage("wholeNumber"))
  .min(1, formValidationMessage("atLeast", { min: 1 }))
  .max(SHARE_LINK_HOURS_MAX, formValidationMessage("atMost", { max: SHARE_LINK_HOURS_MAX }));

export const monitorLinkExpiryDaysSchema = z
  .array(z.number().int().min(1).max(MONITOR_LINK_EXPIRY_DAYS_MAX))
  .min(1)
  .max(MONITOR_LINK_EXPIRY_OPTIONS_MAX)
  .refine((days) => new Set(days).size === days.length);

export const shareLinkLengthsSchema = z.object({
  tradeLinkHours: shareLinkHoursSchema,
  restrictedShareLinkHours: shareLinkHoursSchema,
  monitorLinkExpiryDays: monitorLinkExpiryDaysSchema,
});
