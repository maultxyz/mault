import type { OnboardingContextValue } from "@/lib/interfaces/tours";
import { createContext, useContext } from "react";

export const OnboardingContext = createContext<OnboardingContextValue | null>(
  null,
);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
