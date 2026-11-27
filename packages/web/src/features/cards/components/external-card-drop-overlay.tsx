import type { ExternalCardDropOverlayProps } from "@/lib/interfaces/cards";
import { IconCards } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ExternalCardDropOverlay({
  collectionName,
}: ExternalCardDropOverlayProps) {
  const { t } = useTranslation("cards");
  return (
    <div className="pointer-events-none fixed inset-0 z-60 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm animate-in fade-in-0 motion-reduce:animate-none">
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-primary text-center">
        <IconCards className="size-8 text-primary" aria-hidden />
        <p className="text-sm font-medium">{t("externalCardDrop.overlayTitle")}</p>
        <p className="text-xs text-foreground/70">
          {t("externalCardDrop.overlayDescription", {
            collection: collectionName,
          })}
        </p>
      </div>
    </div>
  );
}
