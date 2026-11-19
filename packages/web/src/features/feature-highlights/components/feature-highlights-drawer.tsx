import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { FeatureHighlightCarousel } from "@/features/feature-highlights/components/feature-highlight-carousel";
import { WHATS_NEW_PATH } from "@/lib/constants/feature-highlights";
import type { FeatureHighlightsDrawerProps } from "@/lib/interfaces/feature-highlights";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function FeatureHighlightsDrawer({
  open,
  slides,
  onDismiss,
  onOpenTimeline,
}: FeatureHighlightsDrawerProps) {
  const { t } = useTranslation("common");
  const [shownSlides, setShownSlides] = useState(slides);
  if (open && shownSlides !== slides && slides.length > 0) {
    setShownSlides(slides);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss();
      }}
    >
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="py-0">
          <DrawerTitle className="text-start text-base font-semibold">
            {t("featureHighlights.title")}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-3">
          <FeatureHighlightCarousel slides={shownSlides} onFinish={onDismiss} />
          <Button
            variant="secondary"
            className="mt-3 w-full"
            render={<Link to={WHATS_NEW_PATH} />}
            onClick={onOpenTimeline}
          >
            {t("featureHighlights.seeAll")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
