import { Button } from "@/components/ui/button";
import type { ControlCardTileProps } from "@/lib/interfaces/control-cards";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ControlCardTile({ entry, onRemove }: ControlCardTileProps) {
  const { t } = useTranslation("scanner");
  return (
    <div className="relative flex h-[88mm] w-[63mm] break-inside-avoid flex-col items-center gap-[2mm] rounded-lg border border-black bg-white print:rounded-none p-[4mm] text-black animate-in fade-in motion-reduce:animate-none">
      <p className="w-full truncate text-center font-heading text-sm font-semibold">
        {entry.title || t("controlCards.tile.defaultTitle")}
      </p>
      <img
        src={entry.qrCodeDataUrl}
        alt={t("controlCards.tile.qrAlt")}
        className="size-[46mm]"
      />
      <ul className="flex w-full flex-col gap-0.5 text-center text-2xs">
        {entry.actionLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-1 right-1 text-black print:hidden"
        aria-label={t("controlCards.tile.remove")}
        onClick={() => onRemove(entry.id)}
      >
        <IconX />
      </Button>
    </div>
  );
}
