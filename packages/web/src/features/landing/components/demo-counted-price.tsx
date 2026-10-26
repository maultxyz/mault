import { useCountUp } from "@/hooks/use-count-up";
import type { DemoCountedPriceProps } from "@/lib/interfaces/landing";
import { formatPrice } from "@magic-vault/shared";

export function DemoCountedPrice({
  value,
  isRevealed,
  className,
}: DemoCountedPriceProps) {
  const countedValue = useCountUp(value, isRevealed);
  return (
    <span className={className}>{formatPrice(countedValue, "tcgplayer")}</span>
  );
}
