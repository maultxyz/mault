const COMPLETED_KEY = "magic-vault:onboarding-completed";

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(COMPLETED_KEY) === "true";
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(COMPLETED_KEY, "true");
  } catch {
    // Storage unavailable (private browsing, disabled cookies) - skip persisting.
  }
}
