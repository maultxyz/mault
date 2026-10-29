import { FoilOverlay } from "@/components/foil-overlay";
import type { CardThumbnailProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";

export function CardThumbnail({ image, isFoil, className }: CardThumbnailProps) {
  return (
    <span
      className={cn(
        "relative block aspect-[2.5/3.5] w-8 shrink-0 overflow-hidden rounded-md bg-muted",
        className,
      )}
    >
      {image?.small && (
        <img
          src={image.small}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {isFoil && <FoilOverlay />}
    </span>
  );
}
