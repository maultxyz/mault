import { usePriceSource } from "@/hooks/use-price-source";
import type { PublicCard } from "@magic-vault/shared";

export function usePublicCardPrice(entry: PublicCard) {
  const { priceOf, format } = usePriceSource();
  const price =
    entry.sellPrice !== undefined
      ? entry.sellPrice
      : priceOf(
          entry.card,
          { isFoil: entry.isFoil, foilType: entry.foilType ?? undefined },
          entry.condition,
        );
  return { price, formattedPrice: price != null ? format(price) : null };
}
