import { BusinessOverviewBackButton } from "@/features/business/components/business-overview-back-button";
import { ReservationsWorkspace } from "@/features/card-reservations/components/reservations-workspace";

export default function ReservationsPage() {
  return <ReservationsWorkspace mobileBackToOverview={<BusinessOverviewBackButton />} />;
}
