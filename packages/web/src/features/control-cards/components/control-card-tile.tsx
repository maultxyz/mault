import { Button } from "@/components/ui/button";
import type { ControlCardTileProps } from "@/lib/interfaces/control-cards";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ControlCardTile({ entry, onRemove }: ControlCardTileProps) {
  const { t } = useTranslation("scanner");
  return (
    <div className="relative min-h-0 min-w-0 animate-in fade-in motion-reduce:animate-none print:animate-none">
      <img
        src={entry.cardImageDataUrl}
        alt={
          entry.style === "illustrated"
            ? t("controlCards.tile.illustratedAlt")
            : t("controlCards.tile.qrAlt")
        }
        className="block size-full"
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 bg-white text-black hover:bg-white/80 print:hidden"
        aria-label={t("controlCards.tile.remove")}
        onClick={() => onRemove(entry.id)}
      >
        <IconX />
      </Button>
    </div>
  );
}
