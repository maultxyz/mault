import {
  formValidationMessage,
  MONITOR_LINK_EXPIRY_DAYS_MAX,
  MONITOR_LINK_EXPIRY_OPTIONS_MAX,
  parseMonitorLinkExpiryDaysText,
  shareLinkHoursSchema,
} from "@magic-vault/shared";
import { z } from "zod";

export const shareLinkLengthsFormSchema = z.object({
  tradeLinkHours: shareLinkHoursSchema,
  restrictedShareLinkHours: shareLinkHoursSchema,
  monitorLinkExpiryDaysText: z.string().superRefine((text, context) => {
    const days = parseMonitorLinkExpiryDaysText(text);
    if (!days) {
      context.addIssue({
        code: "custom",
        message: formValidationMessage("expiryDaysInvalid", {
          max: MONITOR_LINK_EXPIRY_DAYS_MAX,
        }),
      });
    } else if (days.length > MONITOR_LINK_EXPIRY_OPTIONS_MAX) {
      context.addIssue({
        code: "custom",
        message: formValidationMessage("expiryDaysTooMany", {
          max: MONITOR_LINK_EXPIRY_OPTIONS_MAX,
        }),
      });
    }
  }),
});

export type ShareLinkLengthsFormValues = z.infer<typeof shareLinkLengthsFormSchema>;
