import { useClientValue } from "@/hooks/use-client-value";

export function useCurrentYear(): number {
  return useClientValue(() => new Date().getFullYear(), __BUILD_YEAR__);
}
