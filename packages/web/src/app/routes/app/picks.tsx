import { BusinessOverviewBackButton } from "@/features/business/components/business-overview-back-button";
import { OrdersWorkspace } from "@/features/business/components/orders-workspace";

export default function PicksPage() {
  return <OrdersWorkspace backToOverview={<BusinessOverviewBackButton />} />;
}
