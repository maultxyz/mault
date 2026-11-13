import type { CardImageProps } from "@/lib/interfaces/card-image";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function CardImage({ src, placeholderSrc, alt, className, loading = "lazy" }: CardImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoaded = !!src && loadedSrc === src;
  const showsBlurredPlaceholder = !isLoaded && !!placeholderSrc && placeholderSrc !== src;

  return (
    <span className={cn("relative block size-full overflow-hidden bg-muted", className)}>
      {showsBlurredPlaceholder ? (
        <img
          aria-hidden
          alt=""
          src={placeholderSrc}
          draggable={false}
          className="absolute inset-0 size-full scale-110 object-cover blur-md"
        />
      ) : (
        !isLoaded && (
          <span aria-hidden className="absolute inset-0 animate-pulse bg-foreground/6 motion-reduce:animate-none" />
        )
      )}
      {src && (
        <img
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setLoadedSrc(src);
          }}
          src={src}
          alt={alt}
          loading={loading}
          draggable={false}
          onLoad={() => setLoadedSrc(src)}
          className={cn(
            "relative size-full object-cover transition-opacity duration-300 motion-reduce:transition-none",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </span>
  );
}
