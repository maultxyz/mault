import { billingQueryOptions } from "@/features/billing/api/billing";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  DEFAULT_SHARE_LINK_LENGTHS,
  defaultMonitorLinkExpiryDays,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";

export function useShareLinkLengths() {
  const { activeOrg } = useOrg();
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  const lengths = billing?.shareLinkLengths ?? DEFAULT_SHARE_LINK_LENGTHS;
  return {
    lengths,
    allowsLongShareLinks: billing?.longShareLinks !== false,
    defaultExpiryDays: defaultMonitorLinkExpiryDays(lengths.monitorLinkExpiryDays),
  };
}
