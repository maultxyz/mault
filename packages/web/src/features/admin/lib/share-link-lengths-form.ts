import {
  MONITOR_LINK_EXPIRY_DAYS_TEXT_JOINER,
  parseMonitorLinkExpiryDaysText,
  type ShareLinkLengths,
} from "@magic-vault/shared";
import type { ShareLinkLengthsFormValues } from "@/schemas/share-link-lengths.schema";

export function shareLinkLengthsToFormValues(
  lengths: ShareLinkLengths,
): ShareLinkLengthsFormValues {
  return {
    tradeLinkHours: lengths.tradeLinkHours,
    restrictedShareLinkHours: lengths.restrictedShareLinkHours,
    monitorLinkExpiryDaysText: lengths.monitorLinkExpiryDays.join(
      MONITOR_LINK_EXPIRY_DAYS_TEXT_JOINER,
    ),
  };
}

export function shareLinkLengthsFromFormValues(
  values: ShareLinkLengthsFormValues,
): ShareLinkLengths {
  return {
    tradeLinkHours: values.tradeLinkHours,
    restrictedShareLinkHours: values.restrictedShareLinkHours,
    monitorLinkExpiryDays:
      parseMonitorLinkExpiryDaysText(values.monitorLinkExpiryDaysText) ?? [],
  };
}
