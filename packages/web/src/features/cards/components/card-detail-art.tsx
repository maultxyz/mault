import { CardImage } from "@/components/card-image";
import type { CardDetailArtProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";

export function CardDetailArt({
  card,
  widthClass,
  caption,
  children,
  footer,
}: CardDetailArtProps) {
  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      {caption && (
        <figcaption className="text-xs text-foreground/70">{caption}</figcaption>
      )}
      <div
        className={cn(
          "relative aspect-[2.5/3.5] rounded-lg overflow-hidden border",
          widthClass,
        )}
      >
        <CardImage
          src={card?.image?.normal || card?.image?.small}
          placeholderSrc={card?.image?.small}
          alt={card?.name ?? ""}
          loading="eager"
        />
        {children}
      </div>
      {footer}
    </figure>
  );
}
