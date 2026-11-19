import type { InitialLoadState } from "@/lib/interfaces/initial-load";
import { createContext, useContext } from "react";

export const InitialLoadContext = createContext<InitialLoadState | null>(null);

export function useSecondaryRequestsEnabled(): boolean {
  return useContext(InitialLoadContext)?.areSecondaryRequestsEnabled ?? true;
}
