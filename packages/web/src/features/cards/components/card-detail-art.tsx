import { CardImage } from "@/components/card-image";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CardDetailArtProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { IconSwitchHorizontal } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardDetailArt({
  card,
  widthClass,
  caption,
  children,
  footer,
  onEnlarge,
}: CardDetailArtProps) {
  const { t } = useTranslation("cards");
  const [backSideCardId, setBackSideCardId] = useState<string | null>(null);
  const backImage = card?.backImage ?? null;
  const showsBackSide = !!backImage && !!card && backSideCardId === card.id;
  const shownImage = showsBackSide ? backImage : (card?.image ?? null);
  const flipLabel = showsBackSide
    ? t("cardDetailPanel.showFrontSide")
    : t("cardDetailPanel.showBackSide");

  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      {(caption || backImage) && (
        <div
          className={cn(
            "flex min-h-7 items-center justify-between gap-1.5",
            widthClass,
          )}
        >
          {caption ? (
            <figcaption className="text-xs text-foreground/70">
              {caption}
            </figcaption>
          ) : (
            <span />
          )}
          {backImage && card && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={flipLabel}
                    aria-pressed={showsBackSide}
                    onClick={() =>
                      setBackSideCardId(showsBackSide ? null : card.id)
                    }
                  >
                    <IconSwitchHorizontal />
                  </Button>
                }
              />
              <TooltipContent>{flipLabel}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      {onEnlarge && !showsBackSide && shownImage ? (
        <button
          type="button"
          onClick={onEnlarge}
          aria-label={t("cardDetailPanel.enlargeImage")}
          title={t("cardDetailPanel.enlargeImage")}
          className={cn(
            "relative aspect-[2.5/3.5] rounded-lg overflow-hidden border cursor-zoom-in hover:border-primary/60 transition-colors",
            widthClass,
          )}
        >
          <CardImage
            src={shownImage.normal || shownImage.small}
            placeholderSrc={shownImage.small}
            alt={card?.name ?? ""}
            loading="eager"
          />
          {children}
        </button>
      ) : (
        <div
          className={cn(
            "relative aspect-[2.5/3.5] rounded-lg overflow-hidden border",
            widthClass,
          )}
        >
          <CardImage
            key={showsBackSide ? "back" : "front"}
            src={shownImage?.normal || shownImage?.small}
            placeholderSrc={shownImage?.small}
            alt={
              showsBackSide
                ? t("cardDetailPanel.backSideAlt", { name: card?.name ?? "" })
                : (card?.name ?? "")
            }
            loading="eager"
          />
          {!showsBackSide && children}
        </div>
      )}
      {!showsBackSide && footer}
    </figure>
  );
}
