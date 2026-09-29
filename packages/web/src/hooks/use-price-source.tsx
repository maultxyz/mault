import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import type {
  PriceFormatter,
  PriceSourceProviderProps,
} from "@/lib/interfaces/pricing";
import {
  cardPriceFor,
  DEFAULT_PRICE_SOURCE,
  formatPrice,
  type PriceSource,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const PriceSourceContext = createContext<PriceSource>(DEFAULT_PRICE_SOURCE);

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
  return (
    <PriceSourceProvider value={data?.priceSource ?? DEFAULT_PRICE_SOURCE}>
      {children}
    </PriceSourceProvider>
  );
}

export function usePriceSource(): PriceFormatter {
  const source = useContext(PriceSourceContext);
  return useMemo(
    () => ({
      source,
      priceOf: (card, isFoil) => cardPriceFor(card, isFoil, source),
      format: (value) => formatPrice(value, source),
    }),
    [source],
  );
}
