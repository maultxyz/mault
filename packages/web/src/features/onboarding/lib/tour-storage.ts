import { ONBOARDING_COMPLETED_KEY } from "@/lib/constants/storage-keys";

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  } catch {
    // Storage unavailable (private browsing, disabled cookies) - skip persisting.
  }
}
