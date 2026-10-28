import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import type {
  PriceFormatter,
  PriceSourceProviderProps,
} from "@/lib/interfaces/pricing";
import {
  cardPriceFor,
  DEFAULT_ORG_PRICING,
  formatPrice,
  toConditionMultipliers,
  type OrgPricing,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const PriceSourceContext = createContext<OrgPricing>(DEFAULT_ORG_PRICING);

export function PriceSourceProvider({
  value,
  children,
}: PriceSourceProviderProps) {
  return (
    <PriceSourceContext.Provider value={value}>
      {children}
    </PriceSourceContext.Provider>
  );
}

export function OrgPriceSourceProvider({ children }: { children: ReactNode }) {
  const { activeOrg } = useOrg();
  const { data } = useQuery(orgSettingsQueryOptions(activeOrg?.id));
  const pricing = useMemo<OrgPricing>(
    () => ({
      source: data?.priceSource ?? DEFAULT_ORG_PRICING.source,
      conditionMultipliers: toConditionMultipliers(data?.conditionMultipliers),
    }),
    [data?.priceSource, data?.conditionMultipliers],
  );
  return <PriceSourceProvider value={pricing}>{children}</PriceSourceProvider>;
}

export function usePriceSource(): PriceFormatter {
  const { source, conditionMultipliers } = useContext(PriceSourceContext);
  return useMemo(
    () => ({
      source,
      conditionMultipliers,
      priceOf: (card, finish, condition) =>
        cardPriceFor(card, finish, source, condition, conditionMultipliers),
      format: (value) => formatPrice(value, source),
    }),
    [source, conditionMultipliers],
  );
}
