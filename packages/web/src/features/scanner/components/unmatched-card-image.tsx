import type { UnmatchedCardImageProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconPhotoOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardImage({
  entry,
  className,
  showsBackSide = false,
}: UnmatchedCardImageProps) {
  const { t } = useTranslation("scanner");
  const imageUrl = showsBackSide ? entry.capturedBackImageUrl : entry.capturedImageUrl;
  return (
    <div
      className={cn(
        "aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {imageUrl ? (
        <img
          loading="lazy"
          src={imageUrl}
          alt={
            showsBackSide
              ? t("unmatchedCardsPanel.backSideAlt")
              : t("unmatchedCardsPanel.imageAlt")
          }
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <IconPhotoOff className="size-5 text-foreground/70" />
        </div>
      )}
    </div>
  );
}
