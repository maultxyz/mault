import {
  COLLECTION_PREVIEW_CARD_CLASS,
  COLLECTION_PREVIEW_FAN_CLASSES,
} from "@/lib/constants/collections";
import type { CollectionPreviewStackProps } from "@/lib/interfaces/collections";
import { cn } from "@/lib/utils";
import { IconAlbum } from "@tabler/icons-react";

export function CollectionPreviewStack({
  images,
}: CollectionPreviewStackProps) {
  return (
    <div className="relative h-40 overflow-hidden bg-muted/60">
      {images.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-background/70 p-3 text-foreground/70 shadow-sm">
            <IconAlbum className="size-5" />
          </span>
        </div>
      ) : (
        images
          .slice(0, COLLECTION_PREVIEW_FAN_CLASSES.length)
          .map((src, i) => (
            <img
              key={`${i}-${src}`}
              src={src}
              alt=""
              loading="lazy"
              className={cn(
                COLLECTION_PREVIEW_CARD_CLASS,
                COLLECTION_PREVIEW_FAN_CLASSES[i],
              )}
            />
          ))
      )}
    </div>
  );
}
