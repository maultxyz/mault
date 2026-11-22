import { BusinessViewSwitch } from "@/features/business/components/business-view-switch";
import { ReservationsWorkspace } from "@/features/card-reservations/components/reservations-workspace";
import { BUSINESS_RESERVATIONS_VIEW } from "@/lib/constants/business";

export default function ReservationsPage() {
  return (
    <ReservationsWorkspace
      switcher={<BusinessViewSwitch value={BUSINESS_RESERVATIONS_VIEW} />}
    />
  );
}
