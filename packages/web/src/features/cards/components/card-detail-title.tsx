import { usePriceSource } from "@/hooks/use-price-source";
import type { CardDetailTitleProps } from "@/lib/interfaces/cards";

export function CardDetailTitle({
  name,
  price,
  typeLine,
  titleTag: TitleTag = "h2",
  badges,
  trailing,
}: CardDetailTitleProps) {
  const { format } = usePriceSource();
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 max-md:flex-wrap max-md:gap-y-1">
          <TitleTag className="font-heading font-semibold text-base truncate max-md:whitespace-normal max-md:line-clamp-2">
            {name}
          </TitleTag>
          {price != null && (
            <span className="shrink-0 text-base font-semibold tabular-nums">
              {format(price)}
            </span>
          )}
          {badges}
        </div>
        {typeLine && (
          <p className="text-sm text-foreground/70 truncate">{typeLine}</p>
        )}
      </div>
      {trailing}
    </div>
  );
}
