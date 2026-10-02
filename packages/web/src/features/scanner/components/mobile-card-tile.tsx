import { useLongPress } from "@/hooks/use-long-press";
import { FoilOverlay } from "@/components/foil-overlay";
import { usePriceSource } from "@/hooks/use-price-source";
import type { MobileCardTileProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconCheck, IconHelpCircle } from "@tabler/icons-react";
import { memo } from "react";

export const MobileCardTile = memo(function MobileCardTile({
  entry,
  onOpen,
  onLongPress,
}: MobileCardTileProps) {
  const { handlers, consumeLongPress } = useLongPress(onLongPress);
  const { priceOf, format } = usePriceSource();
  const price = priceOf(entry.card, entry.isFoil);
  const flagged = entry.needsReview || !!entry.alternativeMatches?.length;
  const awaitingReview = flagged && !entry.corrected;

  return (
    <button
      type="button"
      {...handlers}
      onClick={() => {
        if (consumeLongPress()) return;
        onOpen?.();
      }}
      disabled={!onOpen}
      className="flex min-w-0 select-none flex-col gap-1 text-left transition-transform [-webkit-touch-callout:none] active:scale-[0.97] disabled:active:scale-100"
    >
      <div
        className={cn(
          "relative aspect-[2.5/3.5] w-full overflow-hidden rounded-md border bg-muted",
          awaitingReview &&
            "ring-2 ring-warning ring-offset-1 ring-offset-background",
        )}
      >
        <img
          src={entry.card.image?.normal || entry.card.image?.small || ""}
          alt={entry.card.name}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
        {entry.isFoil && <FoilOverlay />}
        {flagged && (
          <span
            className={cn(
              "absolute top-1 left-1 rounded-full p-0.5 shadow-md",
              entry.corrected ? "bg-success-strong" : "bg-warning-strong",
            )}
          >
            {entry.corrected ? (
              <IconCheck className="size-3 text-white" />
            ) : (
              <IconHelpCircle className="size-3 text-white" />
            )}
          </span>
        )}
        {entry.quantity > 1 && (
          <span className="absolute top-1 right-1 rounded bg-background/90 px-1 text-2xs font-semibold leading-4 text-foreground shadow">
            ×{entry.quantity}
          </span>
        )}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="truncate text-xs font-medium text-foreground">
          {entry.card.name}
        </p>
        <p className="truncate text-xs text-foreground/70">
          {price != null
            ? format(price)
            : `${entry.card.set.toUpperCase()} #${entry.card.collectorNumber}`}
        </p>
      </div>
    </button>
  );
});
