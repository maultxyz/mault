import { useTour } from "@/features/onboarding/api/use-tour";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import { ONBOARDING_TOUR_TARGET_WAIT_TIMEOUT_MS } from "@/lib/constants/tours";
import type { OnboardingTourProps } from "@/lib/interfaces/tours";

export function OnboardingTour({
  steps,
  restartCompleted,
}: OnboardingTourProps) {
  const { Tour } = useTour({
    steps,
    completedKey: ONBOARDING_COMPLETED_KEY,
    targetWaitTimeout: ONBOARDING_TOUR_TARGET_WAIT_TIMEOUT_MS,
    restartCompleted,
  });
  return Tour;
}
