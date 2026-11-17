import { useBilling } from "@/features/billing/api/use-billing";

export function useHasBusinessTools(): boolean {
  const { billing } = useBilling();
  return billing?.businessTools === true;
}
