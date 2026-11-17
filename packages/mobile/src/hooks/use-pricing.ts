import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  cardPriceFor,
  DEFAULT_ORG_PRICING,
  formatPrice,
  toConditionMultipliers,
  type CardCondition,
  type CardFinish,
  type PlayingCard,
} from "@magic-vault/shared";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { useActiveOrgId } from "@/hooks/use-org";
import type { PriceFormatter } from "@/lib/interfaces/pricing";

export function usePricing(): PriceFormatter {
  const { data } = useQuery(orgSettingsQueryOptions(useActiveOrgId()));
  return useMemo(() => {
    const source = data?.priceSource ?? DEFAULT_ORG_PRICING.source;
    const multipliers = toConditionMultipliers(data?.conditionMultipliers);
    return {
      source,
      priceOf: (
        card: PlayingCard,
        finish?: boolean | CardFinish,
        condition?: CardCondition | null,
      ) => cardPriceFor(card, finish, source, condition, multipliers),
      format: (value: number) => formatPrice(value, source),
    };
  }, [data?.priceSource, data?.conditionMultipliers]);
}
