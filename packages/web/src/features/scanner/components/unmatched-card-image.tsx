import type { UnmatchedCardImageProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconPhotoOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardImage({ entry, className }: UnmatchedCardImageProps) {
  const { t } = useTranslation("scanner");
  return (
    <div
      className={cn(
        "aspect-[2.5/3.5] w-full overflow-hidden rounded-md border bg-muted",
        className,
      )}
    >
      {entry.capturedImageUrl ? (
        <img
          loading="lazy"
          src={entry.capturedImageUrl}
          alt={t("unmatchedCardsPanel.imageAlt")}
          className="h-full w-full object-fill"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <IconPhotoOff className="size-5 text-foreground/70" />
        </div>
      )}
    </div>
  );
}
