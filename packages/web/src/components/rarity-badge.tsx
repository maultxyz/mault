import { useRarityGameKey } from "@/hooks/use-rarity-game-key";
import { raritySwatch } from "@/lib/card-swatches";
import { cn } from "@/lib/utils";
import { rarityAbbreviation, rarityLabel } from "@magic-vault/shared";

export function RarityBadge({
  rarity,
  decorative = false,
  className,
}: {
  rarity: string;
  decorative?: boolean;
  className?: string;
}) {
  const gameKey = useRarityGameKey();
  const abbreviation = rarityAbbreviation(rarity);
  if (!abbreviation) return null;
  const swatch = raritySwatch(rarity, gameKey);
  const label = rarityLabel(rarity);
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      title={label}
      className={cn(
        "shrink-0 rounded-sm px-1 text-2xs leading-4 font-bold tabular-nums",
        swatch.textClass,
        className,
      )}
      style={{ backgroundColor: swatch.bg }}
    >
      {abbreviation}
    </span>
  );
}
