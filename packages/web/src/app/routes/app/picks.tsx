import { BusinessViewSwitch } from "@/features/business/components/business-view-switch";
import { OrdersWorkspace } from "@/features/business/components/orders-workspace";
import { BUSINESS_PICKS_VIEW } from "@/lib/constants/business";

export default function PicksPage() {
  return (
    <OrdersWorkspace
      switcher={<BusinessViewSwitch value={BUSINESS_PICKS_VIEW} />}
    />
  );
}
