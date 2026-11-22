import { BusinessTour } from "@/features/business/components/business-tour";
import { SCANNER_BUY_TOUR } from "@/features/business/lib/business-tours";
import { isTourCompleted } from "@/features/onboarding/lib/tour-storage";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/constants/storage-keys";

export function ScannerBuyTour() {
  return (
    <BusinessTour
      tour={SCANNER_BUY_TOUR}
      autoStart={isTourCompleted(ONBOARDING_COMPLETED_KEY)}
    />
  );
}
