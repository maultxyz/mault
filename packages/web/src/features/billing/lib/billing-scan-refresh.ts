import { billingQueryOptions } from "@/features/billing/api/billing";
import { BILLING_SCAN_REFRESH_THROTTLE_MS } from "@/lib/constants/timing";
import { createKeyedRefreshThrottle } from "@magic-vault/shared";
import type { QueryClient } from "@tanstack/react-query";

const throttleBillingRefresh = createKeyedRefreshThrottle(
  BILLING_SCAN_REFRESH_THROTTLE_MS,
);

export function refreshBillingAfterScan(
  queryClient: QueryClient,
  orgId: string,
) {
  throttleBillingRefresh(orgId, () => {
    void queryClient.invalidateQueries({
      queryKey: billingQueryOptions(orgId).queryKey,
    });
  });
}
