import { Skeleton } from "@/components/ui/skeleton";
import { printPartImagesStore } from "@/features/build/lib/print-part-images-store";
import type { PrintPartImagesProps } from "@/lib/interfaces/build";
import { useSyncExternalStore } from "react";

export function PrintPartImages({ parts }: PrintPartImagesProps) {
  const { status, images } = useSyncExternalStore(
    printPartImagesStore.subscribe,
    printPartImagesStore.getSnapshot,
    printPartImagesStore.getSnapshot,
  );

  if (status === "error") return null;

  if (status === "loading") {
    return (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {parts.map((part) => (
          <Skeleton
            key={part}
            className="aspect-square w-full max-w-32 rounded-md sm:max-w-40"
          />
        ))}
      </div>
    );
  }

  const shown = parts.flatMap((part) => {
    const src = images[part];
    return src ? [{ part, src }] : [];
  });
  if (shown.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {shown.map(({ part, src }) => (
        <img
          key={part}
          src={src}
          alt=""
          className="aspect-square w-full max-w-32 rounded-md border bg-muted/40 object-contain sm:max-w-40"
        />
      ))}
    </div>
  );
}
